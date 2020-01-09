const yargs = require('yargs')

const config = require('./middleware/config')
const registry = require('./middleware/registry')

yargs
  .middleware(config)
  .middleware(registry)
  .commandDir('commands')
  .help().argv
