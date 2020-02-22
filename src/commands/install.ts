import * as commander from 'commander';

import { ConfigService } from '../services/config';
import { PackageService, ReleaseName, Release } from '../services/package';

interface InstallOptions extends commander.Command {
  offline: boolean;
  noCache: boolean;
}

export function init(configSvc: ConfigService, packageSvc: PackageService): (...args: any[]) => void {
  return async function(packageName: string = '.', options: InstallOptions) {
    let releaseNames: ReleaseName[] = [];
    if (packageName === '.') {
      // install all packages in project's config
      for (let packageName in configSvc.projectConfig.packages) {
        let version = configSvc.projectConfig.packages[packageName];
        releaseNames.push(new ReleaseName(packageName + '@' + version));
      }
    } else {
      releaseNames.push(new ReleaseName(packageName));
    }

    for (let i in releaseNames) {
      let releaseName = releaseNames[i];
      let [ repo, name, version ] = [ releaseName.repo, releaseName.name, releaseName.version ];
      let rls: Release;
      let pkgLocal = packageSvc.getPackageFromLocal(repo, name);
      let pkgRegistry = options.offline ? null : await packageSvc.getPackageFromRegistry(repo, name);
      let rlsLocal = pkgLocal ? (version ? pkgLocal.getRelease(version) : pkgLocal.getLatestRelease()): null;
      let rlsRegistry = pkgRegistry ? (version ? pkgRegistry.getRelease(version) : pkgRegistry.getLatestRelease()) : null;
      if (!rlsLocal) {
        rls = rlsRegistry;
      } else if (rlsRegistry) {
        rls = rlsRegistry.version.equals(rlsLocal.version) ? rlsLocal : rlsRegistry;
      } else {
        rls = rlsLocal;
      }

      if (rls) {
        await packageSvc.download(rls, !options.noCache, true);
        configSvc.projectConfig.putPackage(rls.repo, rls.name, rls.version.toString());
        configSvc.projectConfig.save();
        console.log(`${rls.toString()} installed successfully.`);
      } else {
        console.log('Release not found!');
        process.exit(-1);
      }
    }
  };
}
