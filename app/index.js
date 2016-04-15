'use strict';
var generators = require('yeoman-generator');
var util = require('util');
var chalk = require('chalk');
var scriptBase = require('../generator-base');

var VagabondGenerator = generators.Base.extend({});

util.inherits(VagabondGenerator, scriptBase);

/* Constants use throughout */
const constants = require('../generator-constants');

var currentQuestion = 0;
var totalQuestions = constants.QUESTIONS;
var configOptions = {};

module.exports = VagabondGenerator.extend({
  constructor: function() {
    // Calling the super constructor is important so our generator is correctly set up
    generators.Base.apply(this, arguments);
  },

  configuring: {

    setup: function() {
      configOptions.baseName = this.baseName;
    },

    composeCommon: function() {
      this.composeWith('vagabond:common', {
        options: {
          'skip-install': this.options['skip-install'],
          configOptions: configOptions
        }
      }, {
        local: require.resolve('../common')
      });
    },

    composeGulp: function() {
      this.composeWith('vagabond:gulp', {
        options: {
          configOptions: configOptions
        }
      }, {
        local: require.resolve('../gulp')
      });
    },

    composePing: function() {
      this.composeWith('vagabond:ping', {
        options: {
          configOptions: configOptions
        }
      }, {
        local: require.resolve('../ping')
      });
    }

  },

  initializing: {

    displayLogo: function() {
      this.printVagabondLogo();
    }

  },
  
  prompting: {

    askForAppName: function() {
      if (this.existingProject || this.baseName) return;

      this.askAppName(this, currentQuestion++, totalQuestions);
      configOptions.lastQuestion = currentQuestion;
      configOptions.totalQuestions = totalQuestions;
    }

  },
  
  end: function() {
    this.log(chalk.green.bold('\nApp generated successfully.\n'));
  }  
  

});
