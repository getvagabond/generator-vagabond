/*global describe, beforeEach, it*/
'use strict';

var path = require('path');
var assert = require('yeoman-assert');
var helpers = require('yeoman-test');

//const constants = require('../generator-constants');

const expectedFiles = {

  common: [
    '.eslintignore',
    '.eslintrc',
    '.gitignore',
    'package.json',
    'README.md',
    's-project.json',
    'serverless.json'
  ],

  gulp: [
    'gulpfile.js',
    'gulp/linting.js',
    'gulp/serverless.js'
  ]

};

describe('Vagabond generator', function() {

  describe('default configuration', function() {
    beforeEach(function(done) {
      helpers.run(path.join(__dirname, '../app'))
        .withOptions({ skipInstall: true })
        .withPrompts({
          'baseName': 'vagabond',
          'awsNotificationEmail': '',
          'awsRegion': 'eu-west-1'
        })
        .on('end', done);
    });

    it('creates expected default files', function() {
      assert.file(expectedFiles.common);
      assert.file(expectedFiles.gulp);
    });
  });

  describe('application names', function() {
    beforeEach(function(done) {
      helpers.run(path.join(__dirname, '../app'))
        .withOptions({ skipInstall: true, checkInstall: false })
        .withPrompts({
          'baseName': 'myapplication',
          'awsNotificationEmail': 'test@getvagabond.github.io',
          'awsRegion': 'eu-west-1'
        })
        .on('end', done);
    });

    it('creates expected files with correct application name', function() {
      assert.file([
        'package.json'
      ]);
      assert.fileContent('package.json', /myapplication/);
    });
    
  });

});
