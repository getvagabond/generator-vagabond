/*global describe, beforeEach, it*/
'use strict';

var path = require('path');
var assert = require('yeoman-assert');
var helpers = require('yeoman-test');
var fse = require('fs-extra');

//const constants = require('../generator-constants');

const expectedFiles = {

  data: [
    'data/lib/fooDynamo.js',
    'data/lib/fooSchema.js'
  ]

};

describe('Vagabond entity generator', function () {

  describe('default configuration', function () {
    beforeEach(function (done) {
      helpers.run(require.resolve('../entity'))
        .inTmpDir(function (dir) {
          fse.copySync(path.join(__dirname, '../test/templates/default'), dir);
        })
        .withArguments(['foo'])
        .withPrompts({
          fieldAdd: false,
          relationshipAdd: false,
          dto: 'mapstruct',
          service: 'no',
          pagination: 'no'
        })
        .on('end', done);
    });

    it('creates expected default files', function () {
      assert.file(expectedFiles.data);
    });
  });

});
