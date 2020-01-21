const path = require('path')
const yargs = require('yargs')

const config = require('./lib/config')()
const models = require('./lib/models')({
  localPath: config.localPath,
  remoteRegistry: config.remoteRegistry,
  packagesPath: config.packagesPath
})

yargs
  .middleware(argv => {
    argv.context = {
      config,
      models
    }
    return {}
  })
  .commandDir('commands')
  .help().argv
