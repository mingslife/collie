const fs = require('fs')
const os = require('os')
const path = require('path')
const ini = require('ini')
const findUp = require('find-up')

const constants = require('../constants')

const configInterface = {}

const userConfigPath = path.join(os.homedir(), constants.USER_CONFIG_NAME)
const userConfig = fs.existsSync(userConfigPath) ? ini.parse(fs.readFileSync(userConfigPath, 'utf-8')) : {}
Object.freeze(userConfig)

const projectConfigPath = findUp.sync(constants.PROJECT_CONFIG_NAMES)
const projectConfig = projectConfigPath ? JSON.parse(fs.readFileSync(projectConfigPath, 'utf-8')) : {}

configInterface.getUserConfig = (key) => {
  return userConfig[key]
}
configInterface.getProjectConfig = (key) => {
  return projectConfig[key]
}
configInterface.isProjectConfigEmpty = () => {
  return Object.keys(projectConfig).length === 0
}
configInterface.initProjectConfig = (packagesPath = constants.DEFAULT_PACKAGES_PATH) => {
  fs.writeFileSync(constants.PROJECT_CONFIG_NAMES[0], JSON.stringify({
    path: packagesPath,
    packages: {}
  }, null, 2))
}

module.exports = argv => {
  Object.freeze(configInterface)
  argv.$config = configInterface

  return {}
}
