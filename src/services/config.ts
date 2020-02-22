import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

import * as ini from 'ini';

export const defaults = {
  home: os.homedir(),
  local: path.join(os.homedir(), '.collie'),
  registry: 'http://localhost:26553',
  project: process.cwd(),
  projectPackages: 'collie_packages'
}

function formatRegistryUrl(url: string): string {
  if (!url) return '';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  // http://a
  while (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }
  if (url.length < 8) {
    url = defaults.registry
  }

  return url;
}

function getPath(template: string): string {
  return template
    .replace(/{HOME}/g, defaults.home)
    // .replace(/{LOCAL}/g, defaults.local)
    // .replace(/{REGISTRY}/g, defaults.registry)
    .replace(/{PROJECT}/g, defaults.project);
}

class BaseConfig {
  local: string;
  registry: string;
}

export class EnvConfig extends BaseConfig {
  private init() {
    this.local = process.env['COLLIE_LOCAL'];
    this.registry = formatRegistryUrl(process.env['COLLIE_REGISTRY']);
  }

  constructor() {
    super();

    this.init()
  }
}

export class UserConfig extends BaseConfig {
  private static PATH_TEMPLATE: string = '{HOME}/.collierc';

  readonly path: string;

  private init() {
    let config = fs.existsSync(this.path) ? ini.parse(fs.readFileSync(this.path, 'utf8')) : {};
    this.local = config.local || null;
    this.registry = formatRegistryUrl(config.registry) || null;
  }

  constructor(path: string = getPath(UserConfig.PATH_TEMPLATE)) {
    super();

    this.path = path;
    this.init();
  }

  save() {
    let config: { [key: string]: any } = {};
    if (this.local) config.local = this.local;
    if (this.registry) config.registry = this.registry;
    console.log(ini.stringify(config));
  }
}

interface PackageSet {
  [packageName: string]: string;
}

export class ProjectConfig extends BaseConfig {
  private static PATH_TEMPLATE: string = '{PROJECT}/collie.json';

  readonly path: string;
  packagesPath: string;
  packages: PackageSet;

  private init() {
    let config = fs.existsSync(this.path) ? JSON.parse(fs.readFileSync(this.path, 'utf8')) : {};
    this.local = config.local || null;
    this.registry = formatRegistryUrl(config.registry) || null;
    this.packagesPath = config.path || null;
    this.packages = config.packages || {};
  }

  private getPackageName(repo: string, name: string) {
    return (repo === '_' ? '' : repo + '/') + name;
  }

  private getFullPackageName(repo: string, name: string) {
    return repo + '/' + name;
  }

  constructor(path: string = getPath(ProjectConfig.PATH_TEMPLATE)) {
    super();

    this.path = path;
    this.init();
  }

  exists(): boolean {
    return fs.existsSync(this.path);
  }

  putPackage(repo: string, name: string, version: string) {
    let packageName = this.getPackageName(repo, name);
    this.packages[packageName] = version;
  }

  removePackage(repo: string, name: string) {
    let packageName = this.getPackageName(repo, name);
    let fullPackageName = this.getFullPackageName(repo, name);
    delete this.packages[packageName];
    delete this.packages[fullPackageName];
  }

  save() {
    let config: { [key: string]: any } = {};
    if (this.local) config.local = this.local;
    if (this.registry) config.registry = this.registry;
    if (this.packagesPath) config.packagesPath = this.packagesPath;
    config.packages = this.packages ? this.packages : {};
    let data = JSON.stringify(config, null, 2);
    fs.writeFileSync(this.path, data, 'utf8');
  }
}

export class ConfigService {
  envConfig: EnvConfig;
  userConfig: UserConfig;
  projectConfig: ProjectConfig;

  readonly home: string;
  readonly local: string;
  readonly registry: string;
  readonly project: string;
  readonly projectPackages: string;

  constructor() {
    this.envConfig = new EnvConfig();
    this.userConfig = new UserConfig();
    this.projectConfig = new ProjectConfig();

    // env > project > user > defaults
    this.home = defaults.home;
    this.local = this.envConfig.local || this.projectConfig.local || this.userConfig.local || defaults.local;
    this.registry = this.envConfig.registry || this.projectConfig.registry || this.userConfig.registry || defaults.registry;
    this.project = defaults.project;
    this.projectPackages = this.projectConfig.packagesPath || defaults.projectPackages;
  }

  getPath(template: string): string {
    return template
      .replace(/{HOME}/g, this.home)
      .replace(/{LOCAL}/g, this.local)
      .replace(/{REGISTRY}/g, this.registry)
      .replace(/{PROJECT}/g, this.project)
      .replace(/{PROJECT_PACKAGES}/g, this.projectPackages);
  }
}

// let rls = new Release('_', 'bootstrap', new Version(4, 4, 1));
// console.log(rls);

// console.log(new UserConfig().save());
// console.log(new ProjectConfig().save());

// let configManager = new ConfigManager();
// console.log(configManager);
