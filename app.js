const yargs = require('yargs')

const config = require('./lib/config')()
const models = require('./lib/models')({
  localPath: config.localPath,
  remoteRegistry: config.remoteRegistry
})

console.log(config.localPath)
console.log(config.remoteRegistry)
console.log(config.packagesPath)
config.projectConfig.putPackage('bootstrap', '4.4.1')

// yargs
//   // .middleware(config())
//   .commandDir('commands')
//   .help().argv
