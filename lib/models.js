const os = require('os')
const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const compressing = require('compressing')
const axios = require('axios')
const hash = require('crypto').createHash('sha256')

const constants = require('./constants')

const config = {
  localPath: null,
  remoteRegistry: null,
  packagesPath: null
}

function getLocalRegistry() {
  return path.join(os.homedir(), config.localPath, 'packages')
}

function getRemoteRegistry() {
  return config.remoteRegistry
}

function getFullPackagesPath() {
  return path.join(process.cwd(), config.packagesPath)
}

function getFullReleasePath(path, fromRemoteRegistry = false) {
  if (fromRemoteRegistry) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    } else {
      return getRemoteRegistry() + (path.startsWith('/') ? '' : '/') + path
    }
  } else {
    if (path.startsWith('/')) {
      return path
    } else {
      return getLocalRegistry() + path
    }
  }
}

function getLatestVersion(version1, version2) {
  if (version1 === version2) {
    return version1
  }

  let parts1 = version1.split('.').map(x => Number(x))
  let parts2 = version2.split('.').map(x => Number(x))
  if (parts1.length !== 3 || parts2.length !== 3) {
    console.error('Invalid version')
    return null
  }

  for (let i = 0; i < 3; i++) {
    if (parts1[i] === parts2[i]) {
      continue
    }

    return parts1[i] > parts2[i] ? version1 : version2
  }
}

class Info {
  repo
  name
  version
  digest

  constructor (options) {
    switch (typeof options) {
    case 'string':
      let parts = options.split(/[\/@:]/)
      if (parts.length === 4) {
        [ this.repo, this.name, this.version, this.digest ] = parts
      } else if (parts.length === 3) {
        [ this.repo, this.name, this.version, this.digest ] = ['_', ...parts]
      } else {
        throw new Error('Unsupported format')
      }
      break
    case 'object':
      this.repo = options.repo
      this.name = options.name
      this.version = options.version
      this.digest = options.digest
      break
    default: throw new Error('Unsupported type')
    }
  }

  toString () {
    return `${this.repo === '_' ? '' : `${this.repo}/`}${this.name}@${this.version}:${this.digest}`
  }

  toFile (path) {
    fs.writeFileSync(path, this.toString())
  }
}

class Release {
  packageObj
  repo
  name
  version
  path
  digest
  releasedAt
  fromCache
 
  constructor (packageObj, repo, name, version, path, digest, releasedAt, fromCache = false) {
    this.packageObj = packageObj
    this.repo = repo
    this.name = name
    this.version = version
    this.path = path
    this.digest = digest
    this.releasedAt = releasedAt
    this.fromCache = fromCache
  }

  async download (overwrite) {
    let targetPath = getFullPackagesPath()
    let targetReleasePath = path.join(targetPath, this.repo, this.name)
    if (overwrite) {
      // According to https://github.com/jprichardson/node-fs-extra/blob/master/docs/remove-sync.md
      // If the path does not exist, silently does nothing.
      // So we can skip judging wheather the folder exists or not.
      fse.removeSync(targetReleasePath)
    }
    if (fs.existsSync(targetReleasePath)) {
      throw new Error('Release already exists')
    }

    let localPackagePath = path.join(getLocalRegistry(), this.repo, this.name)
    if (!fs.existsSync(localPackagePath)) {
      fse.mkdirpSync(localPackagePath)
    }
    let localReleasePath = path.join(localPackagePath, `${this.version}.tgz`)

    if (!this.fromCache) {
      let remoteReleaseUrl = getFullReleasePath(this.path, true)
      
      // download
      let response = await axios({
        method: 'get',
        url: remoteReleaseUrl,
        responseType: 'stream'
      })
      // TODO a little ugly here
      await new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(localReleasePath).on('finish', resolve))
      })

      // verify
      let localReleaseDigest = hash.update(fs.readFileSync(localReleasePath)).digest('hex')
      if (localReleaseDigest !== this.digest) {
        throw new Error('Verify failed, please retry.')
      }

      // cache
      let localMetadataPath = path.join(localPackagePath, 'metadata.json')
      let metadata = this.packageObj.toMetadata('local')
      metadata.releases.push({
        version: this.version,
        path: `packages/${this.repo}/${this.name}/${this.version}.tgz`,
        digest: this.digest,
        released: this.releasedAt
      })
      metadata.updated = new Date()
      fs.writeFileSync(localMetadataPath, JSON.stringify(metadata, null, 2))
    }

    if (!fs.existsSync(targetPath)) {
      fse.mkdirpSync(targetPath)
    }
    await compressing.tgz.uncompress(localReleasePath, targetReleasePath)

    let targetInfoPath = path.join(targetReleasePath, '.sheep')
    new Info({
      repo: this.repo,
      name: this.name,
      version: this.version,
      digest: this.digest
    }).toFile(targetInfoPath)
  }
}

class Package {
  repo
  name
  description
  source
  homepage
  createdAt
  updatedAt
  releaseMap = {
    local: {},
    remote: {}
  }

  fillReleaseMap (kind, releases) {
    releases.forEach(release => {
      this.releaseMap[kind][release.version] = new Release(
        this,
        this.repo,
        this.name,
        release.version,
        release.path,
        release.digest,
        new Date(release.released),
        kind === 'local'
      )
    })
  }

  constructor (repo, name, localMetadata, remoteMetadata) {
    this.repo = repo
    this.name = name

    this.description = localMetadata.description || remoteMetadata.description
    this.source = localMetadata.source || remoteMetadata.source
    this.homepage = localMetadata.homepage || remoteMetadata.homepage
    this.createdAt = new Date(localMetadata.created || remoteMetadata.created)
    this.updatedAt = new Date(localMetadata.updated || remoteMetadata.updated)

    this.fillReleaseMap('local', localMetadata.releases || [])
    this.fillReleaseMap('remote', remoteMetadata.releases || [])
  }

  getLatestRelease () {
    let localVersions = Object.keys(this.releaseMap['local'])
    let localLatestVersion = localVersions.length === 0 ? '0.0.0' : localVersions.reduce(
      (x, y) => getLatestVersion(x, y)
    )
    let remoteVersions = Object.keys(this.releaseMap['remote'])
    let remoteLatestVersion = remoteVersions.length === 0 ? '0.0.0' : remoteVersions.reduce(
      (x, y) => getLatestVersion(x, y)
    )
    return localLatestVersion === remoteLatestVersion ? this.releaseMap['local'][localLatestVersion] : this.releaseMap['remote'][remoteLatestVersion]
  }

  getRelease (version) {
    let localRelease = this.releaseMap['local'][version]
    if (localRelease) {
      return localRelease
    }

    let remoteRelease = this.releaseMap['remote'][version]
    return remoteRelease
  }

  getPackageName () {
    return (this.repo === '_' ? '' : `${this.repo}/`) + this.name
  }

  toMetadata (kind) {
    return {
      name: this.getPackageName(),
      description: this.description,
      source: this.source,
      homepage: this.homepage,
      created: this.createdAt,
      updated: this.updatedAt,
      releases: Object.values(this.releaseMap[kind])
    }
  }
}

function getRepoAndName(packageName) {
  let partsOfPackageName = packageName.split('/')
  if (partsOfPackageName.length > 2) {
    throw new Error('Invalid package name')
  }
  let repo = partsOfPackageName[0]
  if (partsOfPackageName.length === 1) repo = '_'
  let name = partsOfPackageName[partsOfPackageName.length - 1]

  return { repo, name }
}

async function getPackage(packageName, offline = false) {
  let { repo, name } = getRepoAndName(packageName)

  let localMetadataPath = path.join(getLocalRegistry(), repo, name, 'metadata.json')
  let localMetadata = {}
  if (fs.existsSync(localMetadataPath)) {
    localMetadata = JSON.parse(fs.readFileSync(localMetadataPath, 'utf8'))
  }

  let remoteMetadataUrl = `${getRemoteRegistry()}/packages/${repo}/${name}/metadata.json`
  let remoteMetadata = {}
  if (!offline) {
    let response = await axios.get(remoteMetadataUrl)
    remoteMetadata = response.data
  }

  return new Package(repo, name, localMetadata, remoteMetadata)
}

function getAllInfos() {
  let targetPath = getFullPackagesPath()
  if (!fs.existsSync(targetPath)) {
    return []
  }
  // TODO so so ugly here?
  return fs.readdirSync(targetPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent =>
      fs.readdirSync(path.join(targetPath, dirent.name), { withFileTypes: true })
        .filter(childDirent => childDirent.isDirectory() && fs.existsSync(path.join(targetPath, dirent.name, childDirent.name, '.sheep')))
        .map(childDirent => new Info(fs.readFileSync(path.join(targetPath, dirent.name, childDirent.name, '.sheep'), 'utf8'))))
    .reduce((x, y) => x.concat(y))
}

module.exports = options => {
  config.localPath = options.localPath || constants.DEFAULT_LOCAL_PATH
  config.remoteRegistry = options.remoteRegistry || constants.DEFAULT_REMOTE_REGISTRY
  config.packagesPath = options.packagesPath || constants.DEFAULT_PACKAGES_PATH

  return {
    getPackage,
    getAllInfos
  }
}
