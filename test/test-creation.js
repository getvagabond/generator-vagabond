/*global describe, beforeEach, it*/
'use strict';

var path = require('path');
var assert = require('yeoman-assert');
var helpers = require('yeoman-test');

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
  ],

  ping: [
    'ping/lib/index.js',
    'ping/ping/event.json',
    'ping/ping/handler.js',
    'ping/ping/s-function.json',
    'ping/package.json',
    'ping/s-component.json'
  ],  

  data: [
    'data/lib/schema.js',
    'data/lib/index.js',
    'data/gql/event.json',
    'data/gql/handler.js',
    'data/gql/s-function.json',
    'data/package.json',
    'data/s-component.json'
  ]  

};

describe('Vagabond generator', function() {

  describe('generate common files', function() {
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

    it('creates expected common files', function() {
      assert.file(expectedFiles.common);
    });
  });

  describe('generate gulp files', function() {
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

    it('creates expected gulp files', function() {
      assert.file(expectedFiles.gulp);
    });
  });

  describe('generate ping module files', function() {
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

    it('creates expected ping module files', function() {
      assert.file(expectedFiles.ping);
    });
  });

  describe('generate data module files', function() {
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

    it('creates expected data module files', function() {
      assert.file(expectedFiles.data);
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
      assert.file(expectedFiles.common);
      assert.file(expectedFiles.gulp);
      assert.file(expectedFiles.ping);
      assert.file(expectedFiles.data);

      assert.file(['package.json']);
      assert.fileContent('package.json', /myapplication/);

      assert.file(['ping/package.json']);
      assert.fileContent('ping/package.json', /myapplication\-ping/);

      assert.file(['data/package.json']);
      assert.fileContent('data/package.json', /myapplication\-data/);
    });
    
  });

});
