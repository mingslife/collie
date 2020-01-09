const constants = {
  USER_CONFIG_NAME: '.collierc',
  PROJECT_CONFIG_NAMES: ['.collie.json', '.collie', 'collie.json', 'collie'],
  DEFAULT_PACKAGES_PATH: 'collie_packages',
  DEFAULT_REGISTRY: 'http://localhost:26553/',
  REGISTRY_DATA: '/packages/data.json',
  PACKAGE_DATA: '/packages/{packageName}/data.json'
}

Object.freeze(constants)

module.exports = constants
