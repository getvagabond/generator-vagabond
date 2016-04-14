'use strict';
var generators = require('yeoman-generator');
var util = require('util');
var scriptBase = require('../generator-base');

var VagabondGenerator = generators.Base.extend({});

util.inherits(VagabondGenerator, scriptBase);

var configOptions = {};

module.exports = VagabondGenerator.extend({
  constructor: function() {
    // Calling the super constructor is important so our generator is correctly set up
    generators.Base.apply(this, arguments);
  },

  configuring: {
    composeCommon: function() {
      this.composeWith('vagabond:common', {
        options: {
          'skip-install': this.options['skip-install'],
          configOptions: configOptions
        }
      }, {
        local: require.resolve('../common')
      });
    }
  }

});
