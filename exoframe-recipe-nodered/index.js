const node_red_image = 'henrikcoll/nodered:latest';
const bcrypt = require('bcrypt-nodejs')

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
  {
    type: 'input',
    name: 'admin_username',
    message: 'Admin username:',
    default: 'admin',
  },
  {
    type: 'password',
    name: 'admin_password',
    message: 'Admin password:',
    default: 'admin'
  },
  {
    type: 'confirm',
    name: 'enable_projects',
    message: 'Do you want to enable the projects feature?',
    default: true
  },
  {
    type: 'confirm',
    name: 'enable_projects',
    message: 'Do you want to enable context file storage?',
    default: false
  },
];

const start_node_red = async ({util, answers, username, docker}) => {
  const deploymentName = util.nameFromImage(node_red_image);

  return await docker.startFromParams({
    image: node_red_image,
    projectName: answers.name,
    username,
    deploymentName,
    frontend: `Host:${answers.url}`,
    restartPolicy: 'always',
    Mounts: [
      {
        Type: 'volume',
        Source: `${answers.name}-data`,
        Target: '/data',
      },
    ],
    Env: [`ADMIN_USERNAME=${answers.admin_username}`, `ADMIN_PASSWORD=${bcrypt.hashSync(answers.admin_password)}`, `PORT=80`, `ENABLE_PROJECTS=${answers.enable_projects}`, `ENABLE_FILE_CONTEXT_STORAGE=${answers.enable_context_file_storage}`],
  });
};

exports.runSetup = async ({answers, serverConfig, username, docker, util}) => {
  // init log
  const log = [];

  try {
    util.logger.debug('starting work..');
    if (!serverConfig.swarm) {
      util.logger.debug('pulling node-red..');
      await docker.pullImage(node_red_image);
    }

    util.logger.debug('starting node-red..');
    const node_red = await start_node_red({util, answers, username, docker});
    log.push({message: 'node-red container started', data: node_red, level: 'info'});
    util.logger.debug('created node-red container..');

  } catch (e) {
    util.logger.error('error:', e);
    log.push({message: e.toString(), data: e, level: 'error'});
  }

  return log;
};
