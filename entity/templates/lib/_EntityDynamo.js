import Promise from 'bluebird';
import AWS from 'aws-sdk';
const dynamoConfig = {
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.AWS_REGION
};
const docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
const stage = process.env.SERVERLESS_STAGE;
const projectName = process.env.SERVERLESS_PROJECT_NAME;
const tableName = projectName + '-<%= entityClass %>-' + stage;

function params<%= entityClass %>(key) {
  return {
    TableName: tableName,
    Key: {
      <%= keyField.fieldName %>: key
    },
    AttributesToGet: <%- fieldsAsList %>
  };
}

export function get<%= entityClass %>(key) {
  return new Promise(function(resolve, reject) {

    docClient.get(params<%= entityClass %>(key), function(err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(data['Item']);
    });

  });
}

export function new<%= entityClass %>(source, args) {
  var <%= entityInstance %> = <%- fieldsAsArgs %>;

  return new Promise(function(resolve, reject) {

    var params = {
      TableName: tableName,
      Item: <%= entityInstance %>
    };

    docClient.put(params, function(err, data) {
      if (err) {
        return reject(err);
      }
      console.debug('data : %o', data);
      return resolve(<%= entityInstance %>);
    });

  });
}
