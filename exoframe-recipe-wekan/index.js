const mongodb_image = 'mongo:3.2.20';
const wekan_image = 'quay.io/wekan/wekan';

exports.getQuestions = () => [
  {
    type: 'input',
    name: 'name',
    message: 'Instance name:',
  },
  {
    type: 'input',
    name: 'url',
    message: 'Instance url:',
  },
];

const start_mongodb = async ({util, answers, username, docker}) => {
  const deploymentName = util.nameFromImage(mongodb_image);

  return docker.startFromParams({
    image: mongodb_image,
    projectName: answers.name,
    username,
    deploymentName,
    hostname: deploymentName,
    restartPolicy: 'always',
    Mounts: [
      {
        Type: 'volume',
        Source: `${answers.name}-mongodb-data`,
        Target: '/data',
      },
    ]
  });
};

const start_wekan = async ({mongodb, serverConfig, util, answers, username, docker}) => {
  const deploymentName = util.nameFromImage(wekan_image);

  const mongodbHost = serverConfig.swarm
                    ? mongodb.Spec.Networks[0].Aliases
                    : mongodb.NetworkSettings.Networks.exoframe.Aliases[0];

  return docker.startFromParams({
    image: wekan_image,
    projectName: answers.name,
    username,
    deploymentName,
    frontend: `Host:${answers.url}`,
    restartPolicy: 'always',
    additionalLabels: {
      'traefik.port': '8080'
    },
    Env: [
      `ROOT_URL=https://${answers.url}`,
      `MONGO_URL=mongodb://${mongodbHost}:27017/wekan`,
      'WITH_API=true',
      'BROWSER_POLICY_ENABLED=true'],
  });
};

exports.runSetup = async ({answers, serverConfig, username, docker, util}) => {
  // init log
  const log = [];

  try {
    util.logger.debug('starting work..');
    if (!serverConfig.swarm) {
      util.logger.debug('pulling node-red..');
      await docker.pullImage(mongodb_image);
      await docker.pullImage(wekan_image);
    }

    util.logger.debug('starting mongodb..');
    const mongodb = await start_mongodb({util, answers, username, docker});
    log.push({message: 'mongodb container started', data: mongodb, level: 'info'});
    util.logger.debug('created mongodb container..');

    util.logger.debug('starting wekan..');
    const wekan = await start_wekan({mongodb, serverConfig, util, answers, username, docker});
    log.push({message: 'wekan container started', data: wekan, level: 'info'});
    util.logger.debug('created wekan container..');

  } catch (e) {
    util.logger.error('error:', e);
    log.push({message: e.toString(), data: e, level: 'error'});
  }

  return log;
};
