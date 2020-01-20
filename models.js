const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const compressing = require('compressing')
const axios = require('axios')
const hash = require('crypto').createHash('sha256')

const constants = require('./constants')

const config = {
  localPath: null,
  remoteRegistry: null
}

function getLocalRegistry() {
  return path.join(os.homedir(), config.localPath, 'packages')
}

function getRemoteRegistry() {
  return config.remoteRegistry
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

  async download (targetPath) {
    let localPackagePath = path.join(getLocalRegistry(), this.repo, this.name)
    if (!fs.existsSync(localPackagePath)) {
      mkdirp.sync(localPackagePath)
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
      response.data.pipe(fs.createWriteStream(localReleasePath))

      // verify
      let localReleaseDigest = hash.update(localReleasePath, 'utf8').digest('hex')
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
      mkdirp.sync(targetPath)
    }
    let targetFilePath = path.join(targetPath, this.name)
    compressing.tgz.uncompress(localReleasePath, targetFilePath)
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

module.exports = (localPath, remoteRegistry) => {
  config.localPath = localPath || constants.config.DEFAULT_LOCAL_PATH
  config.remoteRegistry = remoteRegistry || constants.config.DEFAULT_REMOTE_REGISTRY

  return {
    getPackage
  }
}
