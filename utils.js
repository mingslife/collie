const os = require('os')
const path = require('path')
const internetAvailable = require('internet-available')

const constants = require('./constants')

function online() {
  return internetAvailable()
}

function getLocalRegistry() {
  return path.join(os.homedir(), constants.config.DEFAULT_LOCAL, 'packages')
}

function getRemoteRegistry() {
  return constants.config.DEFAULT_REGISTRY
}

function getFullReleasePath(path, fromRemoteRegistry = false) {
  if (fromRemoteRegistry) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    } else {
      return getRemoteRegistry() + (path.startsWith('/') ? '' : '/') + path
    }
  } else {
    if (path.startsWith('/')) {
      return path
    } else {
      return getLocalRegistry() + path
    }
  }
}

function getLatestVersion(version1, version2) {
  if (version1 === version2) {
    return version1
  }

  let parts1 = version1.split('.').map(x => Number(x))
  let parts2 = version2.split('.').map(x => Number(x))
  if (parts1.length !== 3 || parts2.length !== 3) {
    console.error('Invalid version')
    return null
  }

  for (let i = 0; i < 3; i++) {
    if (parts1[i] === parts2[i]) {
      continue
    }

    return parts1[i] > parts2[i] ? version1 : version2
  }
}

module.exports = {
  online,
  getLocalRegistry,
  getRemoteRegistry,
  getFullReleasePath,
  getLatestVersion
}
