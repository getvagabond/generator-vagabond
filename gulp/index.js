'use strict';
var generators = require('yeoman-generator');
var util = require('util');
var scriptBase = require('../generator-base');

var VagabondGulpGenerator = generators.Base.extend({});
util.inherits(VagabondGulpGenerator, scriptBase);

module.exports = VagabondGulpGenerator.extend({
  constructor: function() {
    generators.Base.apply(this, arguments);
  },

  writing: {

    writeCommonFiles: function() {
      this.template('gulpfile.js', 'gulpfile.js', this, {});
      this.template('gulp/linting.js', 'gulp/linting.js', this, {});
      this.template('gulp/serverless.js', 'gulp/serverless.js', this, {});
    }
  }

});
