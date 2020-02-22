import * as fs from 'fs';
import * as path from 'path';

import * as fse from 'fs-extra';
import * as compressing from 'compressing';
import Axios from 'axios';

import * as config from './config';
import * as utils from '../utils';

function getReleaseRealPath(pkgPath: string, rlsPath: string): string {
  if (!rlsPath) {
    return '';
  } else if (rlsPath.startsWith('http://') || rlsPath.startsWith('https://')) {
    return rlsPath;
  } else if (rlsPath.startsWith('/')) {
    if (pkgPath && (pkgPath.startsWith('http://') || pkgPath.startsWith('https://'))) {
      let rootPath = pkgPath.substring(0, (pkgPath + '/').indexOf('/', 8));
      return rootPath + rlsPath;
    } else {
      return rlsPath;
    }
  } else {
    if (pkgPath.endsWith('/')) pkgPath = pkgPath.substring(0, pkgPath.length - 1);
    return `${pkgPath}/${rlsPath}`;
  }
}

class ReleaseMetadata {
  version: string;
  path: string;
  digest: string;
  released: Date;
}

class PackageMetadata {
  repo: string;
  name: string;
  description: string;
  source: string;
  homepage: string;
  created: Date;
  updated: Date;
  releases: ReleaseMetadata[];
}

enum PackageKind {
  UNKNOWN = -1, REGISTRY, LOCAL, PROJECT
}

export class Package {
  repo: string;
  name: string;
  kind: PackageKind;
  metadata: PackageMetadata;
  path: string;

  constructor(repo: string, name: string, kind = PackageKind.UNKNOWN) {
    this.repo = repo;
    this.name = name;
    this.kind = kind;
  }

  getRelease(version: Version | string): Release {
    let versionString = version.toString();

    for (let i in this.metadata.releases) {
      let rlsMetadata = this.metadata.releases[i];
      if (rlsMetadata.version === versionString) {
        let rls = new Release(this.repo, this.name, version, this.kind);
        rls.path = rlsMetadata.path;
        rls.realPath = getReleaseRealPath(this.path, rlsMetadata.path);
        rls.digest = rlsMetadata.digest;
        rls.releasedAt = rlsMetadata.released;
        rls.pkg = this;
        return rls;
      }
    }

    return null;
  }

  getLatestRelease() {
    let latestVersion: Version = new Version(0, 0, 0);
    let latestRelease: Release = null;

    for (let i in this.metadata.releases) {
      let rlsMetadata = this.metadata.releases[i];
      let rlsVersion = Version.valueOf(rlsMetadata.version);
      if (rlsVersion.compareTo(latestVersion) === 1) {
        latestVersion = rlsVersion;

        latestRelease = new Release(this.repo, this.name, rlsMetadata.version, this.kind);
        latestRelease.path = rlsMetadata.path;
        latestRelease.realPath = getReleaseRealPath(this.path, rlsMetadata.path);
        latestRelease.digest = rlsMetadata.digest;
        latestRelease.releasedAt = rlsMetadata.released;
        latestRelease.pkg = this;
      }
    }

    return latestRelease;
  }

  // getReleases() {}
}

class Version {
  private major: number;
  private minor: number;
  private patch: number;

  static valueOf(version: string): Version {
    let parts = version.split('.').map(x => Number(x));
    return new Version(parts[0], parts[1], parts[2]);
  }

  constructor(major: number | string, minor: number | string, patch: number | string) {
    this.major = typeof major === 'number' ? major : parseInt(major);
    this.minor = typeof minor === 'number' ? minor : parseInt(minor);
    this.patch = typeof patch === 'number' ? patch : parseInt(patch);
  }

  compareTo(v: Version): number {
    let self = [this.major, this.minor, this.patch];
    let another = [v.major, v.minor, v.patch];
    for (let i in self) {
      if (self[i] === another[i]) continue;

      return self[i] > another[i] ? 1 : -1;
    }
    return 0;
  }

  equals(v: Version): boolean {
    return this.patch === v.patch && this.minor === v.minor && this.major === v.major;
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
}

export class ReleaseName {
  repo: string;
  name: string;
  version: string;

  constructor(raw: string) {
    if (raw.indexOf('/') === -1) raw = '_/' + raw;
    let parts = raw.trim().split(/[\/@]/);
    this.repo = parts[0];
    this.name = parts[1];
    this.version = parts[2] || null;
  }

  toString() {
    return `${this.repo}/${this.name}${this.version ? '@' + this.version : ''}`;
  }
}

class ReleaseInfo {
  raw: string;
  rawVersion: string;

  repo: string;
  name: string;
  version: Version;
  digest: string;

  constructor(raw: string) {
    let parts = raw.trim().split(/[\/@:]/);
    this.raw = raw;
    this.rawVersion = parts[2];

    this.repo = parts[0];
    this.name = parts[1];
    this.version = Version.valueOf(this.rawVersion);
    this.digest = parts[3];
  }

  toString(): string {
    return this.raw;
  }
}

export class Release {
  repo: string;
  name: string;
  version: Version;
  kind: PackageKind;
  path: string;
  realPath: string;
  digest: string;
  releasedAt: Date;
  pkg: Package;
  info: ReleaseInfo;

  constructor(repo: string, name: string, version: Version | string, kind = PackageKind.UNKNOWN) {
    this.repo = repo;
    this.name = name;
    if (typeof version === 'string') version = Version.valueOf(version);
    this.version = version;
    this.kind = kind;
  }

  generateInfo(): ReleaseInfo {
    if (this.info) return this.info;

    this.info = new ReleaseInfo(`${this.repo}/${this.name}@${this.version.toString()}:${this.digest}`);
    return this.info;
  }

  toString() {
    return `${this.repo}/${this.name}@${this.version}`;
  }
}

export class PackageService {
  private static readonly REGISTRY_PACKAGES_PATH_TEMPLATE: string = '{REGISTRY}/packages';
  private static readonly LOCAL_PACKAGES_PATH_TEMPLATE: string = '{LOCAL}/packages';
  private static readonly PROJECT_PACKAGES_PATH_TEMPLATE: string = '{PROJECT}/{PROJECT_PACKAGES}';

  readonly registryPkgsPath: string;
  readonly localPkgsPath: string;
  readonly projectPkgsPath: string;

  constructor(configSvc: config.ConfigService) {
    this.registryPkgsPath = configSvc.getPath(PackageService.REGISTRY_PACKAGES_PATH_TEMPLATE);
    this.localPkgsPath = configSvc.getPath(PackageService.LOCAL_PACKAGES_PATH_TEMPLATE);
    this.projectPkgsPath = configSvc.getPath(PackageService.PROJECT_PACKAGES_PATH_TEMPLATE);
  }

  getPackageFromLocal(repo: string, name: string): Package {
    let pkgPath = path.join(this.localPkgsPath, repo, name);
    let pkgMetadataPath = path.join(pkgPath, 'metadata.json');
    if (fs.existsSync(pkgMetadataPath)) {
      let pkgMetadata = JSON.parse(fs.readFileSync(pkgMetadataPath, 'utf8')) as PackageMetadata;
      let pkg = new Package(repo, name, PackageKind.LOCAL);
      pkg.metadata = pkgMetadata;
      pkg.path = this.localPkgsPath;
      // console.log(pkg)
      return pkg;
    } else {
      return null;
    }
  }

  async getPackageFromRegistry(repo: string, name: string): Promise<Package> {
    let pkgPath = `${this.registryPkgsPath}/${repo}/${name}`;
    let pkgMetadataPath = `${pkgPath}/metadata.json`;
    try {
      let response = await Axios.get(pkgMetadataPath);
      let pkgMetadata = response.data as PackageMetadata;
      let pkg = new Package(repo, name, PackageKind.REGISTRY);
      pkg.metadata = pkgMetadata;
      pkg.path = this.registryPkgsPath;
      // console.log(pkg);
      return pkg;
    } catch (err) {
      return null;
    }
  }

  getPackageFromProject(repo: string, name: string): Package {
    let rlsPath = path.join(this.projectPkgsPath, repo, name);
    let rlsInfoPath = path.join(rlsPath, '.collie');
    if (fs.existsSync(rlsInfoPath)) {
      let rlsInfo = new ReleaseInfo(fs.readFileSync(rlsInfoPath, 'utf8'));
      let pkgMetadata = new PackageMetadata();
      pkgMetadata.repo = rlsInfo.repo;
      pkgMetadata.name = rlsInfo.name;
      let rlsMetadata = new ReleaseMetadata();
      rlsMetadata.version = rlsInfo.rawVersion;
      rlsMetadata.path = rlsPath;
      rlsMetadata.digest = rlsInfo.digest;
      pkgMetadata.releases = new Array<ReleaseMetadata>(rlsMetadata);
      let pkg = new Package(repo, name, PackageKind.PROJECT);
      pkg.metadata = pkgMetadata;
      pkg.path = rlsPath;
      // console.log(pkg);
      return pkg;
    } else {
      return null;
    }
  }

  async download(rls: Release, cache = true, overwrite = false) {
    if (rls.kind === PackageKind.REGISTRY || rls.kind === PackageKind.LOCAL) {
      let sourceRlsPath = path.join(this.localPkgsPath, rls.repo, rls.name, `${rls.version.toString()}.tgz`);
      let targetRlsPath = path.join(this.projectPkgsPath, rls.repo, rls.name);
      let targetRlsInfoPath = path.join(targetRlsPath, '.collie');

      if (!overwrite && fs.existsSync(targetRlsInfoPath)) {
        throw new Error('Release exists.');
      }

      if (rls.kind === PackageKind.REGISTRY) {
        if (cache) {
          // update package's metadata
          let sourcePkgPath = path.join(this.localPkgsPath, rls.repo, rls.name);
          fse.mkdirpSync(sourcePkgPath);

          let localPkgMetadataPath = path.join(sourcePkgPath, 'metadata.json');
          let localPkgMetadata: PackageMetadata = null;
          if (fs.existsSync(localPkgMetadataPath)) {
            localPkgMetadata = JSON.parse(fs.readFileSync(localPkgMetadataPath, 'utf8')) as PackageMetadata;
          } else {
            localPkgMetadata = JSON.parse(JSON.stringify(rls.pkg.metadata)) as PackageMetadata;
            localPkgMetadata.releases.length = 0; // empty releases
          }
          let releaseIndex = 0;
          for (let i in localPkgMetadata.releases) {
            if (localPkgMetadata.releases[i].version === rls.version.toString()) {
              releaseIndex = parseInt(i);
              break;
            }
          }
          localPkgMetadata.releases[releaseIndex] = {
            version: rls.version.toString(),
            path: `${rls.version.toString()}.tgz`,
            digest: rls.digest,
            released: rls.releasedAt
          };

          fs.writeFileSync(localPkgMetadataPath, JSON.stringify(localPkgMetadata, null, 2), 'utf8');
        } else {
          sourceRlsPath = `collie-${new Date().getTime()}`;
        }

        // download to sourceRlsPath
        if (!fs.existsSync(sourceRlsPath) || !utils.verifyFile(sourceRlsPath, rls.digest)) {
          try {
            await utils.downloadFile(rls.realPath, sourceRlsPath);
          } catch (err) {
            // download error
            console.log('Release downloaded error.');
            process.exit(-1);
          }
        }

        // retry
        // let retryTimes = 3;
        // while (retryTimes > 0 && !utils.verifyFile(sourceRlsPath, rls.digest)) {
        //   utils.downloadFile(rls.realPath, sourceRlsPath);
        //   retryTimes--;
        // }

        // verify
        if (!utils.verifyFile(sourceRlsPath, rls.digest)) {
          console.log('Release verified failed.');
          process.exit(-1);
        }
      }

      fse.removeSync(targetRlsPath);
      fse.mkdirpSync(targetRlsPath);
      await compressing.tgz.uncompress(sourceRlsPath, targetRlsPath);
      let targetRlsInfo = rls.generateInfo();
      fs.writeFileSync(targetRlsInfoPath, targetRlsInfo.toString(), 'utf8');
      if (!cache) fse.removeSync(sourceRlsPath);
    } else {
      throw new Error("Unsupport release's package kind.");
    }
  }

  remove(rls: Release) {
    if (rls.kind === PackageKind.LOCAL || rls.kind === PackageKind.PROJECT) {
      if (fs.existsSync(rls.realPath)) {
        fse.removeSync(rls.realPath);
        let pkgMetadataPath = path.join(rls.pkg.path, 'metadata.json');
        if (fs.existsSync(pkgMetadataPath)) {
          let pkgMetadata = JSON.parse(fs.readFileSync(pkgMetadataPath, 'utf8')) as PackageMetadata;
          pkgMetadata.releases = pkgMetadata.releases.filter(function(rlsMetadata) {
            return rlsMetadata.version !== rls.version.toString();
          });

          fs.writeFileSync(pkgMetadataPath, JSON.stringify(pkgMetadata, null, 2), 'utf8');
        }
      } else {
        throw new Error('Release not found!');
      }
    } else {
      throw new Error("Unsupport release's package kind.");
    }
  }
}
