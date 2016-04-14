'use strict';
var generators = require('yeoman-generator');
var _ = require('lodash');
var util = require('util');
var chalk = require('chalk');
var scriptBase = require('../generator-base');

var VagabondCommonGenerator = generators.Base.extend({});

util.inherits(VagabondCommonGenerator, scriptBase);

/* Constants use throughout */
const QUESTIONS = 3;

var currentQuestion;
var totalQuestions;
var configOptions = {};

module.exports = VagabondCommonGenerator.extend({
  constructor: function() {
    generators.Base.apply(this, arguments);

    configOptions = this.options.configOptions || {};

    currentQuestion = configOptions.lastQuestion ? configOptions.lastQuestion : 0;
    totalQuestions = configOptions.totalQuestions ? configOptions.totalQuestions : QUESTIONS;
  },

  prompting: {
    askAppName: function() {
      if (this.baseName) return;
      this.askAppName(this, currentQuestion++, totalQuestions);
    },

    askForAwsProperties: function() {
      if (this.existingProject) return;

      var done = this.async();
      var getNumberedQuestion = this.getNumberedQuestion;
      var prompts = [
        {
          type: 'input',
          name: 'awsNotificationEmail',
          message: function(response) {
            return getNumberedQuestion('Enter an email address for AWS notifications', currentQuestion, totalQuestions, function(current) {
              currentQuestion = current;
            }, true);
          },
          store: true
        },
        {
          type: 'input',
          name: 'awsRegion',
          message: function(response) {
            return getNumberedQuestion('Enter AWS region to use', currentQuestion, totalQuestions, function(current) {
              currentQuestion = current;
            }, true);
          },
          default: 'eu-west-1',
          store: true
        }
      ];
      this.prompt(prompts, function(props) {
        this.awsRegion = props.awsRegion;
        this.awsNotificationEmail = props.awsNotificationEmail;
        done();
      }.bind(this));
    }
  },

  configuring: {
    configureGlobal: function() {
      // Application name modified, using each technology's conventions
      this.camelizedBaseName = _.camelCase(this.baseName);
      this.capitalizedBaseName = _.upperFirst(this.baseName);
      this.dasherizedBaseName = _.kebabCase(this.baseName);
      this.lowercaseBaseName = this.baseName.toLowerCase();
      this.nativeLanguageShortName = this.enableTranslation && this.nativeLanguage ? this.nativeLanguage.split('-')[0] : 'en';
    }
  },

  writing: {

    writeCommonFiles: function() {
      this.template('_eslintignore', '.eslintignore', this, {});
      this.template('_eslintrc', '.eslintrc', this, {});
      this.template('_gitignore', '.gitignore', this, {});
      this.template('package.json', 'package.json', this, {});
      this.template('README.md', 'README.md', this, {});
      this.template('s-project.json', 's-project.json', this, {});
      this.template('serverless.json', 'serverless.json', this, {});
    }
  },

  install: function() {
    var injectDependenciesAndConstants = function() {
      if (this.options['skip-install']) {
        this.log(
          'After running ' + chalk.yellow.bold('npm install') + ' ...' +
          '\n' +
          '\nOr do all of the above:' +
          '\n ' + chalk.yellow.bold('gulp install') +
          '\n'
        );
      } else {
        this.spawnCommand('gulp', ['install']);
      }
    };
    if (!this.options['skip-install']) {
      this.installDependencies({
        callback: injectDependenciesAndConstants.bind(this)
      });
    } else {
      injectDependenciesAndConstants.call(this);
    }
  },

  end: function() {
    this.log(chalk.green.bold('\nApp generated successfully.\n'));
  }
});
