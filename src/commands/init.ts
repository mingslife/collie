import * as commander from 'commander';

import { ConfigService, ProjectConfig } from '../services/config';

interface InitOptions extends commander.Command {
  local: string;
  registry: string;
}

export function init(configSvc: ConfigService): (...args: any[]) => void {
  return function(packagesPath: string, options: InitOptions) {
    let projectConfig = configSvc.projectConfig;
    if (!projectConfig.exists()) {
      if (packagesPath) projectConfig.packagesPath = packagesPath;
      if (options.local) projectConfig.local = options.local;
      if (options.registry) projectConfig.registry = options.registry;
      projectConfig.save();
      console.log('Project initialized successfully.');
    } else {
      console.log('Project has already been initialized!');
      process.exit(1);
    }
  }
}
