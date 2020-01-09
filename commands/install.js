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
  async handler (argv) {
    console.log(`install ${argv.package}`)
    packageData = await argv.$registry.getPackageData(argv.packageName)
    console.log(packageData)
  }
}
