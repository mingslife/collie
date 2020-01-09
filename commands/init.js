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
    if (!argv.$config.isProjectConfigEmpty()) {
      console.error('You had already initialized your project.')
      process.exit(1)
    } else {
      argv.$config.initProjectConfig(argv.packagesPath)
      console.log('Project is initialized successfully.')
    }
  }
}
