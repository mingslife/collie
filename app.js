const yargs = require('yargs')

const registry = require('./middleware/registry')

const config = require('./config')()
const models = require('./models')({
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
