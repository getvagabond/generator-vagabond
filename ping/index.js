'use strict';
var generators = require('yeoman-generator');
var util = require('util');
var scriptBase = require('../generator-base');

var VagabondPingGenerator = generators.Base.extend({});
util.inherits(VagabondPingGenerator, scriptBase);

var configOptions = {};

module.exports = VagabondPingGenerator.extend({
  constructor: function() {
    generators.Base.apply(this, arguments);

    configOptions = this.options.configOptions || {};    
    this.baseName = configOptions.baseName;
  },

  configuring: {
    configure: function() {
      this.configureGlobal();
    }
  },

  writing: {
    writeCommonFiles: function() {
      this.template('lib/index.js',         'ping/lib/index.js', this, {});
      this.template('ping/event.json',      'ping/ping/event.json', this, {});
      this.template('ping/handler.js',      'ping/ping/handler.js', this, {});
      this.template('ping/s-function.json', 'ping/ping/s-function.json', this, {});
      this.template('package.json',         'ping/package.json', this, {});
      this.template('s-component.json',     'ping/s-component.json', this, {});
    }
  }

});
