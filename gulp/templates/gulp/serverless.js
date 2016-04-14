// gulp
var gulp = require('gulp');
// modules
var Serverless = require('serverless');
var fs = require('fs');

var serverless = new Serverless({
  interactive: true,
  projectPath: process.cwd()
});

gulp.task('dash-summary', function() {
  return serverless.init().then(function() {
    serverless.actions.dashSummary({});
  });
});

gulp.task('deploy', function() {
  return serverless.init().then(function() {
    serverless.actions.dashDeploy({});
  });
});

gulp.task('stage-remove', function() {
  return serverless.init().then(function() {
    serverless.actions.stageRemove({});
  });
});

gulp.task('project-init', function() {
  var options = {};
  if (fs.existsSync('./serverless.json')) {
    options = require('../serverless.json');
  }
  return serverless.init().then(function() {
    serverless.actions.projectInit({
      options: options
    });
  });
});

gulp.task('reinit', ['stage-remove', 'project-init']);
