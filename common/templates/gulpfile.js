
var gulp = require('gulp');
var minimist = require('minimist');
var requireDir = require('require-dir');
var chalk = require('chalk');
var fs = require('fs');
var log = require('gulp-util').log;

// config
gulp.paths = {
  jsFiles: ['**/*.js', '!node_modules/**/*.js'],
  jsonFiles: ['**/*.json', '!node_modules/**/*.json'],
  karma: ['test/karma/**/*.js'],
  protractor: ['test/protractor/**/*.js']
};

// OPTIONS
var options = gulp.options = minimist(process.argv.slice(2));

// set defaults
var task = options._[0]; // only for first task
var gulpSettings;
if (fs.existsSync('./gulp/.gulp_settings.json')) {
  gulpSettings = require('./gulp/.gulp_settings.json');
  var defaults = gulpSettings.defaults;
  if (defaults) {
    // defaults present for said task?
    if (task && task.length && defaults[task]) {
      var taskDefaults = defaults[task];
      // copy defaults to options object
      for (var key in taskDefaults) {
        // only if they haven't been explicitly set
        if (options[key] === undefined) {
          options[key] = taskDefaults[key];
        }
      }
    }
  }
}

// environment
options.env = options.env || 'dev';
// print options
if (defaults && defaults[task]) {
  log(chalk.green('defaults for task \'' + task + '\': '), defaults[task]);
}

// load tasks
requireDir('./gulp');

// default task
gulp.task('default', function() {
  // just display serverless dash summary
  return gulp.start('dash-summary');
});
