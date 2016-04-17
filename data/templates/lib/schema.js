import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql';

import {
  GraphQLLimitedString,
  GraphQLDateTime
} from 'graphql-custom-types';

//vagabond-needle-import-entity-to-schema

const Query = new GraphQLObjectType({
  name: '<%= capitalizedBaseName %>Schema',
  description: 'Root of the <%= capitalizedBaseName %> Schema',
  fields: () => ({
    //vagabond-needle-insert-entity-query-to-schema    
  })
});

const Mutuation = new GraphQLObjectType({
  name: '<%= capitalizedBaseName %>Mutations',
  description: '<%= capitalizedBaseName %> Mutations',
  fields: {
    //vagabond-needle-insert-entity-mutation-to-schema
  }
});

const Schema = new GraphQLSchema({
  query: Query,
  mutation: Mutuation
});

export default Schema;
