'use strict';
var path = require('path'),
  packagejs = require('./package.json'),
  util = require('util'),
  chalk = require('chalk');
var yeoman = require('yeoman-generator');
var _ = require('lodash');
var commonUtils = require('./util');
var shelljs = require('shelljs');
var Insight = require('insight');

const CONFIG_DIR = '.vag';

module.exports = Generator;

function Generator() {
  yeoman.Base.apply(this, arguments);
}

util.inherits(Generator, yeoman.Base);

Generator.prototype.printVagabondLogo = function () {
  this.log(' \n' +
    chalk.green('                          _                     _ \n') +
    chalk.green('  /\\   /\\__ _  __ _  __ _| |__   ___  _ __   __| |\n') +
    chalk.green('  \\ \\ / / _` |/ _` |/ _` | "_ \\ / _ \\| "_ \\ / _` |\n') +
    chalk.green('   \\ V / (_| | (_| | (_| | |_) | (_) | | | | (_| |\n') +
    chalk.green('    \\_/ \\__,_|\\__, |\\__,_|_.__/ \\___/|_| |_|\\__,_|\n') +
    chalk.green('              |___/                               \n'));
  this.log(chalk.white.bold('                            http://getvagabond.github.io\n'));
  this.log(chalk.white('Welcome to the Vagabond Generator ') + chalk.yellow('v' + packagejs.version));
  this.log(chalk.white('Application files will be generated in folder: ' + chalk.yellow(process.cwd())));
};

Generator.prototype.getDefaultAppName = function () {
  return (/^[a-zA-Z0-9_]+$/.test(path.basename(process.cwd()))) ? path.basename(process.cwd()) : 'vagabond';
};

Generator.prototype.getNumberedQuestion = function (msg, currentQuestion, totalQuestions, cb, cond) {
  var order;
  if (cond) {
    ++currentQuestion;
  }
  order = '(' + currentQuestion + '/' + totalQuestions + ') ';
  cb(currentQuestion);
  return order + msg;
};

Generator.prototype.askAppName = function (generator, currentQuestion, totalQuestions) {

  var done = generator.async();
  var getNumberedQuestion = this.getNumberedQuestion;

  generator.prompt({
    type: 'input',
    name: 'baseName',
    validate: function (input) {
      if (/^([a-zA-Z0-9_]*)$/.test(input) && input !== 'application') return true;
      if (input === 'application') {
        return 'Your application name cannot be named \'application\' as this is a reserved name for Spring Boot';
      }
      return 'Your application name cannot contain special characters or a blank space, using the default name instead';
    },
    message: function (response) {
      return getNumberedQuestion('What is the name of your application?', currentQuestion, totalQuestions, function (current) {
        currentQuestion = current;
      }, true);
    },
    default: this.appname,
    store: true
  }, function (prompt) {
    generator.baseName = prompt.baseName;
    done();
  }.bind(generator));

};

Generator.prototype.configureGlobal = function () {
  this.camelizedBaseName = _.camelCase(this.baseName);
  this.capitalizedBaseName = _.upperFirst(this.baseName);
  this.dasherizedBaseName = _.kebabCase(this.baseName);
  this.lowercaseBaseName = this.baseName.toLowerCase();
  this.nativeLanguageShortName = this.enableTranslation && this.nativeLanguage ? this.nativeLanguage.split('-')[0] : 'en';
};


/**
 * Copy templates with all the custom logic applied according to the type.
 *
 * @param {string} source - path of the source file to copy from
 * @param {string} dest - path of the destination file to copy to
 * @param {string} action - type of the action to be performed on the template file, i.e: stripHtml | stripJs | template | copy
 * @param {object} generator - context that can be used as the generator instance or data to process template
 * @param {object} opt - options that can be passed to template method
 * @param {boolean} template - flag to use template method instead of copy method
 */
Generator.prototype.copyTemplate = function (source, dest, action, generator, opt, template) {

  var _this = generator || this;
  var _opt = opt || {};
  var regex;
  switch (action) {
  case 'stripHtml':
    regex = /( translate\="([a-zA-Z0-9](\.)?)+")|( translate-values\="\{([a-zA-Z]|\d|\:|\{|\}|\[|\]|\-|\'|\s|\.)*?\}")|( translate-compile)|( translate-value-max\="[0-9\{\}\(\)\|]*")/g;
    //looks for something like translate="foo.bar.message" and translate-values="{foo: '{{ foo.bar }}'}"
    commonUtils.copyWebResource(source, dest, regex, 'html', _this, _opt, template);
    break;
  case 'stripJs':
    regex = /\,[\s\n ]*(resolve)\:[\s ]*[\{][\s\n ]*[a-zA-Z]+\:(\s)*\[[ \'a-zA-Z0-9\$\,\(\)\{\}\n\.\<\%\=\-\>\;\s]*\}\][\s\n ]*\}/g;
    //looks for something like mainTranslatePartialLoader: [*]
    commonUtils.copyWebResource(source, dest, regex, 'js', _this, _opt, template);
    break;
  case 'copy':
    _this.copy(source, dest);
    break;
  default:
    _this.template(source, dest, _this, _opt);
  }
};

/**
 * Copy html templates after stripping translation keys when translation is disabled.
 *
 * @param {string} source - path of the source file to copy from
 * @param {string} dest - path of the destination file to copy to
 * @param {object} generator - context that can be used as the generator instance or data to process template
 * @param {object} opt - options that can be passed to template method
 * @param {boolean} template - flag to use template method instead of copy
 */
Generator.prototype.copyHtml = function (source, dest, generator, opt, template) {
  this.copyTemplate(source, dest, 'stripHtml', generator, opt, template);
};

/**
 * Copy Js templates after stripping translation keys when translation is disabled.
 *
 * @param {string} source - path of the source file to copy from
 * @param {string} dest - path of the destination file to copy to
 * @param {object} generator - context that can be used as the generator instance or data to process template
 * @param {object} opt - options that can be passed to template method
 * @param {boolean} template - flag to use template method instead of copy
 */
Generator.prototype.copyJs = function (source, dest, generator, opt, template) {
  this.copyTemplate(source, dest, 'stripJs', generator, opt, template);
};

/**
 * get sorted list of entities according to changelog date (i.e. the order in which they were added)
 */
Generator.prototype.getExistingEntities = function () {
  var entities = [];

  function isBefore(e1, e2) {
    return e1.definition.changelogDate - e2.definition.changelogDate;
  }

  if (shelljs.test('-d', CONFIG_DIR)) {
    shelljs.ls(path.join(CONFIG_DIR, '*.json')).forEach(function (file) {
      var definition = this.fs.readJSON(file);
      entities.push({ name: path.basename(file, '.json'), definition: definition });
    }, this);
  }

  return entities.sort(isBefore);
};

Generator.prototype.insight = function () {
  var insight = new Insight({
    trackingCode: 'UA-76518726-1',
    packageName: packagejs.name,
    packageVersion: packagejs.version
  });

  insight.trackWithEvent = function (category, action) {
    insight.track(category, action);
    insight.trackEvent({
      category: category,
      action: action,
      label: category + ' ' + action,
      value: 1
    });
  };

  return insight;
};
