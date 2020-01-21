function getInfo(packageName) {
  let info = {
    repo: '_',
    name: '',
    version: null
  }
  let parts = packageName.split(/\/@/)
  if (parts.length === 1) {
    info.name = packageName
  } else if (parts.length === 2 && packageName.indexOf('/') !== -1) {
    [ info.repo, info.name ] = parts
  } else if (parts.length === 2 && packageName.indexOf('@') !== -1) {
    [ info.name, info.version ] = parts
  } else if (parts.length === 3) {
    [ info.repo, info.name, info.version ] = parts
  } else {
    throw new Error('Invalid package name')
  }
  return info
}

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
    let info = getInfo(argv.packageName)
    let infos = argv.context.models.getAllInfos()
    console.info(infos)
    let package = argv.context.config.projectConfig.getPackage(argv.packageName)
    if (package) {
      // ProjectConfig有的，且没装过的，安装
      let isInstalled = infos.filter(x => x.name == info.name)

      // ProjectConfig有的，且装过的，指定了版本的，安装指定版本，并更新ProjectConfig

      // ProjectConfig有的，且装过的，没指定版本的，升级，并更新ProjectConfig
    } else {
      // ProjectConfig没有的，添加
      package = await argv.context.models.getPackage(`${info.repo}/${info.name}`)
      let release = null
      if (info.version) {
        release = package.getRelease(info.version)
      } else {
        release = package.getLatestRelease()
      }
      await release.download()
      argv.context.config.projectConfig.putPackage(argv.packageName, release.version)
    }
  }
}
