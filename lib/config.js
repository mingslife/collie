const fs = require('fs')
const os = require('os')
const path = require('path')
const ini = require('ini')
const findUp = require('find-up')

const constants = require('./constants')

class EnvConfig {
  localPath
  remoteRegistry

  constructor () {
    this.localPath = process.env.COLLIE_LOCAL || null
    this.remoteRegistry = process.env.COLLIE_REGISTRY || null
  }
}

class UserConfig {
  configPath
  localPath
  remoteRegistry

  constructor (configPath) {
    let obj = fs.existsSync(configPath) ? ini.parse(fs.readFileSync(configPath, 'utf8')) : {}
    this.configPath = configPath
    this.localPath = obj.local || null
    this.remoteRegistry = obj.registry || null
  }
}

class ProjectConfig {
  configPath
  localPath
  remoteRegistry
  packagesPath
  packages

  constructor (configPath) {
    let obj = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {}
    this.configPath = configPath
    this.localPath = obj.local || null
    this.remoteRegistry = obj.registry || null
    this.packagesPath = obj.path || null
    this.packages = obj.packages || {}
  }

  updateConfig () {
    let obj = {
      packages: this.packages
    }
    if (this.localPath) obj.local = this.localPath
    if (this.remoteRegistry) obj.registry = this.remoteRegistry
    if (this.packagesPath) obj.path = this.packagesPath
    fs.writeFileSync(this.configPath, JSON.stringify(obj, null, 2))
  }

  getPackage (packageName) {
    let version = this.packages[packageName]
    return version ? {
      packageName: packageName,
      version: version
    } : null
  }

  putPackage (packageName, version) {
    this.packages[packageName] = version
    this.updateConfig()
  }

  removePackage (packageName) {
    delete this.packages[packageName]
    this.updateConfig()
  }
}

module.exports = options => {
  let envConfig = new EnvConfig()

  let projectConfigPath = path.join(process.cwd(), constants.DEFAULT_PROJECT_CONFIG_NAME)
  let projectConfig = new ProjectConfig(projectConfigPath)

  let userConfigPath = path.join(os.homedir(), constants.DEFAULT_USER_CONFIG_NAME)
  let userConfig = new UserConfig(userConfigPath)

  return {
    envConfig,
    projectConfig,
    userConfig,
    localPath: [
      envConfig.localPath,
      projectConfig.localPath,
      userConfig.localPath,
      constants.DEFAULT_LOCAL_PATH
    ].filter(x => x !== null)[0],
    remoteRegistry: [
      envConfig.remoteRegistry,
      projectConfig.remoteRegistry,
      userConfig.remoteRegistry,
      constants.DEFAULT_REMOTE_REGISTRY
    ].filter(x => x !== null)[0],
    packagesPath: [
      projectConfig.packagesPath,
      constants.DEFAULT_PACKAGES_PATH
    ].filter(x => x !== null)[0]
  }
}
