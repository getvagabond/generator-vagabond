'use strict';
var generators = require('yeoman-generator');
var util = require('util');
var scriptBase = require('../generator-base');

var VagabondDataGenerator = generators.Base.extend({});
util.inherits(VagabondDataGenerator, scriptBase);

var configOptions = {};

module.exports = VagabondDataGenerator.extend({
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
      this.template('lib/index.js',         'data/lib/index.js', this, {});
      this.template('lib/schema.js',        'data/lib/schema.js', this, {});
      this.template('gql/event.json',       'data/gql/event.json', this, {});
      this.template('gql/handler.js',       'data/gql/handler.js', this, {});
      this.template('gql/s-function.json',  'data/gql/s-function.json', this, {});
      this.template('package.json',         'data/package.json', this, {});
      this.template('s-component.json',     'data/s-component.json', this, {});
    }
  }

});
