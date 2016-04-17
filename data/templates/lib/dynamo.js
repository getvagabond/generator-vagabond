import Promise from 'bluebird';
import AWS from 'aws-sdk';
const dynamoConfig = {
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.AWS_REGION
};
const docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
const stage = process.env.SERVERLESS_STAGE;
const projectName = process.env.SERVERLESS_PROJECT_NAME;
const usersTable = projectName + '-users-' + stage;
const activationsTable = projectName + '-activations-' + stage;

function paramsUser(phone) {
  return {
    TableName: usersTable,
    Key: {
      phone: phone
    },
    AttributesToGet: [
      'phone',
      'name',
      'activated',
      'created',
      'updated',
      'activation'
    ]
  };
}

function paramsActivation(id) {
  return {
    TableName: activationsTable,
    Key: {
      id: id
    },
    AttributesToGet: [
      'phone',
      'name',
      'activated',
      'created',
      'updated',
      'activation'
    ]
  };
}

export function createActivation(activation) {
  return new Promise(function(resolve, reject) {
    var params = {
      TableName: activationsTable,
      Item: activation
    };

    docClient.put(params, function(err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(activation);
    });

  });
}

export function signupUser(user, activationId, code) {
  return new Promise(function(resolve, reject) {

    docClient.get(paramsActivation(activationId), function(err, data) {
      if (err) {
        return reject(err);
      }

      //check if activation code matches, then continue
      var activation = data['Item'];
      if (code === activation.code) {
        //can be activated
        user.created = Date.now().toString();
        var params = {
          TableName: usersTable,
          Item: user
        };
        docClient.put(params, function(err, data) {
          if (err) {
            return reject(err);
          }
          return resolve(user);
        });
      }

      //activation code mismatch
      return reject({
        message: 'activation code wrong'
      });
    });


  });
}

export function getUser(phone) {
  return new Promise(function(resolve, reject) {

    docClient.get(paramsUser(phone), function(err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(data['Item']);
    });

  });
}

export function getActivation(id) {
  return new Promise(function(resolve, reject) {

    docClient.get(paramsActivation(id), function(err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(data['Item']);
    });

  });
}
