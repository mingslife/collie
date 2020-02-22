import * as commander from 'commander';

import { ConfigService, ProjectConfig } from '../services/config';
import { PackageService, ReleaseName, Release } from '../services/package';

interface InitOptions extends commander.Command {
  local: string;
  registry: string;
}

export function init(configSvc: ConfigService, packageSvc: PackageService): (...args: any[]) => void {
  return function(packageName: string, options: InitOptions) {
    let releaseName = new ReleaseName(packageName);
    let [repo, name, version] = [releaseName.repo, releaseName.name, releaseName.version];
    let pkgProject = packageSvc.getPackageFromProject(repo, name);
    if (pkgProject) {
      let rls = version ? pkgProject.getRelease(version) : pkgProject.getLatestRelease();
      if (rls) {
        packageSvc.remove(rls);
        let projectConfig = configSvc.projectConfig;
        if (projectConfig.exists()) {
          projectConfig.removePackage(repo, name);
          projectConfig.save();
        }
        console.log(`${rls.toString()} uninstalled successfully.`);
      } else {
        console.log('Release not found!');
        process.exit(-1);
      }
    } else {
      console.log('Release not found!');
      process.exit(-1);
    }
  }
}
