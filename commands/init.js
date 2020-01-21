module.exports = {
  command: 'init [packages-path]',
  aliases: ['create', 'innit'],
  desc: 'init project',
  builder: {
    packagesPath: {
      type: 'string',
      alias: 'packages-path'
    }
  },
  async handler (argv) {
    if (argv.packagesPath) {
      argv.context.config.projectConfig.packagesPath = argv.packagesPath
    }
    argv.context.config.projectConfig.updateConfig()
  }
}
