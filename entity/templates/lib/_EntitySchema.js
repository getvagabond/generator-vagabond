import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql';

import {
  GraphQLLimitedString,
  GraphQLDateTime
} from 'graphql-custom-types';

const <%= entityClass %> = new GraphQLObjectType({
  name: '<%= entityClass %>',
  description: '<%= entityClass %> entity',
  fields: () => (<%- entityFields %>)
});

export default <%= entityClass %>;
