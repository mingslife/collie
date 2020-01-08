const yargs = require('yargs')

const config = require('./middleware/config')

yargs
  .middleware(config)
  .commandDir('commands')
  .help().argv
