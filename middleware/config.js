const fs = require('fs')
const os = require('os')
const path = require('path')
const yaml = require('js-yaml')
const findUp = require('find-up')

const configPath = findUp.sync(['.collie', '.collie.yaml'])
const config = configPath ? yaml.safeLoad(fs.readFileSync(configPath)) : {}

function initConfig() {}

function getConfig() {}

function setConfig() {}

module.exports = (() => {
  const userConfigPath = path.join(os.homedir(), '.collierc')
  if (fs.existsSync(userConfigPath)) {}

  const projectConfigPath = findUp.sync(['.collie', '.collie.yaml'])
  const projectConfig = projectConfigPath ? yaml.safeLoad(fs.readFileSync(projectConfigPath)) : {}

  console.log(path.join(os.homedir(), '.collierc'))

  return argv => argv.config = config
})()
