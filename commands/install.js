const chalk = require('chalk')

module.exports = {
  command: 'install [package]',
  aliases: ['catch', 'get', 'add'],
  desc: 'install package',
  builder: {
    update: {
      type: 'boolean',
      alias: 'u'
    },
    packageName: {
      type: 'string',
      alias: 'package'
    }
  },
  handler (argv) {
    console.log(argv)
    console.log(chalk.blue(`install ${argv.package}`))
  }
}
