const node_red_image = 'henrikcoll/nodered:latest';
const bcrypt = require('bcrypt-nodejs')
const generateName = require('./generateName')

exports.getQuestions = () => [
  {
    type: 'input',
    name: 'name',
    message: 'Instance name:',
  },
  {
    type: 'input',
    name: 'url',
    message: 'Instance url :',
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
    default: false
  },
  {
    type: 'confirm',
    name: 'enable_context_file_storage',
    message: 'Do you want to enable context file storage?',
    default: false
  },
  {
    type: 'input',
    name: 'deployments',
    message: 'How many deployments do you want?',
    default: 1
  },
];

const start_node_red = async ({username, docker, conf}) => {
  return await docker.startFromParams({
    image: node_red_image,
    projectName: conf.name,
    username,
    deploymentName: conf.name,
    frontend: `Host:${conf.url}`,
    restartPolicy: 'always',
    Mounts: [
      {
        Type: 'volume',
        Source: `${conf.name}-data`,
        Target: '/data',
      },
    ],
    Env: [`ADMIN_USERNAME=${conf.admin_username}`, `ADMIN_PASSWORD=${bcrypt.hashSync(conf.admin_password)}`, `PORT=1880`, `ENABLE_PROJECTS=${conf.enable_projects}`, `ENABLE_FILE_CONTEXT_STORAGE=${conf.enable_context_file_storage}`],
  });
};

function replaceStrings(str, index) {
  return str.replace(/\{([^\}]+)\}/g, (match, p1, offset, string) => {
    if (p1.match(/random\.number/)) {
      let m = p1.match(/:(\d)+/)
      let count = m?parseInt(m[1]):5

      let random = Math.floor(Math.random() * (parseInt("9".repeat(count)) - 0) + 0)
      random = "0".repeat(count - ("" + random).length) + random
      return random

    } else if (p1.match(/random\.string/)) {
      let m = p1.match(/:(\d)+/)
      return Math.random().toString(36).substring(m?parseInt(m[1]):5)

    } else if (p1 === "index") {
      return index

    } else if (p1.match(/random\.name/)) {
      let m = p1.match(/:(\d)+/)
      return generateName({
        wordCount: m?parseInt(m[1]):2,
      })

    }
    return ""
  })
}

exports.runSetup = async ({answers, serverConfig, username, docker, util}) => {
  // init log
  const log = [];

  let numDeployments = parseInt(answers.deployments)
  if (!(numDeployments && numDeployments > 0))
    throw new Error('Deployments must be a number greater than 0')

  try {
    util.logger.debug('starting work..');
    if (!serverConfig.swarm) {
      util.logger.debug('pulling node-red..');
      await docker.pullImage(node_red_image);
    }
    
    let confs = [];

      for (var i = 0; i < numDeployments; i++) {
        let conf = {
          name: replaceStrings(answers.name, i),
          url: replaceStrings(answers.url, i),
          admin_username: answers.admin_username,
          admin_password: answers.admin_password,
          enable_projects: answers.enable_projects,
          enable_context_file_storage: answers.enable_context_file_storage
        }
        util.logger.debug(`starting node-red (${conf.name})..`);
        const node_red = await start_node_red({username, docker, conf});
        log.push({message: `node-red container started (${conf.name})`, data: node_red, level: 'info'});
        util.logger.debug(`created node-red container (${conf.name})..`);
        confs.push(conf)
      }
  } catch (e) {
    util.logger.error('error:', e);
    log.push({message: e.toString(), data: e, level: 'error'});
  }

  return log;
};
