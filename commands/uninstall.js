const os = require('os')
const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')

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
  command: 'uninstall [package]',
  aliases: ['release', 'remove'],
  desc: 'install package',
  builder: {
    packageName: {
      type: 'string',
      alias: 'package'
    }
  },
  async handler (argv) {
    let info = getInfo(argv.packageName)
    let repoPath = path.join(argv.context.config.packagesPath, info.repo)
    let releasePath = path.join(repoPath, info.name)
    fse.removeSync(releasePath)
    // remove the repo folder if empty
    try {
      fs.rmdirSync(repoPath)
    } catch (err) {}

    argv.context.config.projectConfig.removePackage(`${info.repo === '_' ? '' : info.repo + '/'}${info.name}`)
  }
}
