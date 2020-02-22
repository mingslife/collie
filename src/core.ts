import { ConfigService } from './services/config'
import { PackageService } from './services/package'

// config
let configSvc = new ConfigService();
console.log(configSvc.getPath('{REGISTRY}/packages/'));
console.log(configSvc)

// package service
let packageSvc = new PackageService(configSvc);
console.log(packageSvc);

// let pkgLocal = packageSvc.getPackageFromLocal('_', 'bootstrap');
// let rlsLocal = pkgLocal.getRelease('4.4.1');
// packageSvc.downloadToProject(rlsLocal);

(async function() {
  let pkgRegistry = await packageSvc.getPackageFromRegistry('_', 'bootstrap');
  let rlsRegistry = pkgRegistry.getRelease('4.4.1');
  packageSvc.download(rlsRegistry);
  console.log(pkgRegistry.getLatestRelease());
})()

// let pkgProject = packageSvc.getPackageFromProject('_', 'bootstrap');
// console.log(pkgProject.getRelease('4.4.1'));
