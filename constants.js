const constants = {
  USER_CONFIG_NAME: '.collierc',
  PROJECT_CONFIG_NAMES: ['.collie.json', '.collie', 'collie.json', 'collie'],
  DEFAULT_PACKAGES_PATH: 'collie_packages',
  DEFAULT_LOCAL_PATH: '.collie',
  DEFAULT_REMOTE_REGISTRY: 'http://localhost:26553/',
  REGISTRY_DATA: '/packages/info.json',
  PACKAGE_INFO: '/packages/{packageName}/info.json'
}

Object.freeze(constants)

module.exports = constants
