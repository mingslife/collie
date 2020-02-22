import * as commander from 'commander';

import { ConfigService } from './services/config';
import { PackageService } from './services/package';

import * as initCmd from './commands/init';
import * as installCmd from './commands/install';
import * as uninstallCmd from './commands/uninstall';

let configSvc = new ConfigService();
let packageSvc = new PackageService(configSvc);

const program = new commander.Command();
program.version('1.0.0');

program.hello = 'world';

program
  .command('init [packages]')
  .description('initialize project')
  .option('--local <local>', 'local path')
  .option('--registry <registry>', 'registry url')
  .action(initCmd.init(configSvc));

program
  .command('install [package]')
  .description('install package')
  .option('--offline', 'offline mode')
  .option('--no-cache', 'disable cache')
  .action(installCmd.init(configSvc, packageSvc));

program
  .command('uninstall <package>')
  .description('uninstall package')
  .action(uninstallCmd.init(configSvc, packageSvc));

program.parse(process.argv);
