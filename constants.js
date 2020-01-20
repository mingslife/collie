const constants = {
  config: {
    DEFAULT_USER_CONFIG_NAME: '.collierc',
    DEFAULT_PROJECT_CONFIG_NAMES: ['.collie.json', '.collie', 'collie.json', 'collie'],
    DEFAULT_LOCAL: '.collie',
    DEFAULT_REGISTRY: 'http://localhost:26553/',
    DEFAULT_PATH: 'collie_packages',
    DEFAULT_PACKAGES: {}
  }
}

Object.freeze(constants)

module.exports = constants
