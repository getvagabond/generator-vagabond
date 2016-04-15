module.exports.respond = function(event, cb) {

  var response = {
    message: 'pong!'
  };

  return cb(null, response);
};
