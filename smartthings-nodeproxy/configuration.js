var nconf = require('nconf');
var argv = require('yargs')
  .usage('Usage: $0 -c [/path/to/config.json]')
  .alias('c', 'config')
  .default('c', './config.json')
  .describe('c', 'Path to configuration file')
  .help('h')
  .alias('h', 'help')
  .argv;
module.exports = nconf.file({ file: argv.c });
