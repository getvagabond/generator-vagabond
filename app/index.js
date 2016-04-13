'use strict';
var generators = require('yeoman-generator');

module.exports = generators.Base.extend({
  constructor: function() {
    // Calling the super constructor is important so our generator is correctly set up
    generators.Base.apply(this, arguments);

  },
  
  prompting: function () {
    var done = this.async();
    this.prompt({
      type    : 'input',
      name    : 'name',
      message : 'Your project name',
      store   : true,
      default : this.appname // Default to current folder name
    }, function (answers) {
      done();
    }.bind(this));
  },

  method1: function() {
  },
  method2: function() {
  }
});