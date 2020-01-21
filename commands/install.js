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
    let package = argv.context.config.projectConfig.getPackage(argv.packageName)
    // 这里可能会有下面4种情况
    // 1 ProjectConfig有的，且没装过的，安装
    // 2 ProjectConfig有的，且装过的，指定了版本的，安装指定版本，并更新ProjectConfig
    // 3 ProjectConfig有的，且装过的，没指定版本的，升级，并更新ProjectConfig
    // 4 ProjectConfig没有的，添加
    // 为了减少开发者和使用者的心智负担，这里一律采用覆盖安装
    package = await argv.context.models.getPackage(`${info.repo}/${info.name}`)
    let release = null
    if (info.version) {
      release = package.getRelease(info.version)
    } else {
      release = package.getLatestRelease()
    }
    await release.download(true)
    argv.context.config.projectConfig.putPackage(argv.packageName, release.version)
  }
}
