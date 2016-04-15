'use strict';
var path = require('path'),
  packagejs = require('./package.json'),
  util = require('util'),
  chalk = require('chalk');
var yeoman = require('yeoman-generator');
var _ = require('lodash');

module.exports = Generator;

function Generator() {
  yeoman.Base.apply(this, arguments);
}

util.inherits(Generator, yeoman.Base);

Generator.prototype.printVagabondLogo = function() {
  this.log(' \n' +
    chalk.green(' __      __               _                     _ \n') +
    chalk.green(' \ \    / /              | |                   | |\n') +
    chalk.green('  \ \  / /_ _  __ _  __ _| |__   ___  _ __   __| |\n') +
    chalk.green('   \ \/ / _` |/ _` |/ _` | \'_ \ / _ \| \'_ \ / _` |\n') +
    chalk.green('    \  / (_| | (_| | (_| | |_) | (_) | | | | (_| |\n') +
    chalk.green('     \/ \__,_|\__, |\__,_|_.__/ \___/|_| |_|\__,_|\n') +
    chalk.green('               __/ |                              \n') +
    chalk.green('              |___/                               \n') +
    this.log(chalk.white.bold('                            http://getvagabond.github.io\n')));
  this.log(chalk.white('Welcome to the Vagabond Generator ') + chalk.yellow('v' + packagejs.version));
  this.log(chalk.white('Application files will be generated in folder: ' + chalk.yellow(process.cwd())));
};

Generator.prototype.getDefaultAppName = function() {
  return (/^[a-zA-Z0-9_]+$/.test(path.basename(process.cwd()))) ? path.basename(process.cwd()) : 'vagabond';
};

Generator.prototype.getNumberedQuestion = function(msg, currentQuestion, totalQuestions, cb, cond) {
  var order;
  if (cond) {
    ++currentQuestion;
  }
  order = '(' + currentQuestion + '/' + totalQuestions + ') ';
  cb(currentQuestion);
  return order + msg;
};

Generator.prototype.askAppName = function(generator, currentQuestion, totalQuestions) {

  var done = generator.async();
  var getNumberedQuestion = this.getNumberedQuestion;

  generator.prompt({
    type: 'input',
    name: 'baseName',
    validate: function(input) {
      if (/^([a-zA-Z0-9_]*)$/.test(input) && input !== 'application') return true;
      if (input === 'application') {
        return 'Your application name cannot be named \'application\' as this is a reserved name for Spring Boot';
      }
      return 'Your application name cannot contain special characters or a blank space, using the default name instead';
    },
    message: function(response) {
      return getNumberedQuestion('What is the name of your application?', currentQuestion, totalQuestions, function(current) {
        currentQuestion = current;
      }, true);
    },
    default: this.appname,
    store: true
  }, function(prompt) {
    generator.baseName = prompt.baseName;
    done();
  }.bind(generator));

};

Generator.prototype.configureGlobal = function() {
  this.camelizedBaseName = _.camelCase(this.baseName);
  this.capitalizedBaseName = _.upperFirst(this.baseName);
  this.dasherizedBaseName = _.kebabCase(this.baseName);
  this.lowercaseBaseName = this.baseName.toLowerCase();
  this.nativeLanguageShortName = this.enableTranslation && this.nativeLanguage ? this.nativeLanguage.split('-')[0] : 'en';
};
