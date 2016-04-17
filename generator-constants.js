'use strict';

// all constants used throughout all generators
const RESERVED_WORDS = ['ABSTRACT', 'CONTINUE', 'FOR', 'NEW', 'SWITCH', 'ASSERT', 'DEFAULT', 'GOTO', 'PACKAGE', 'SYNCHRONIZED',
  'BOOLEAN', 'DO', 'IF', 'PRIVATE', 'THIS', 'BREAK', 'DOUBLE', 'IMPLEMENTS', 'PROTECTED', 'THROW', 'BYTE', 'ELSE', 'IMPORT',
  'PUBLIC', 'THROWS', 'CASE', 'ENUM', 'INSTANCEOF', 'RETURN', 'TRANSIENT', 'CATCH', 'EXTENDS', 'INT', 'SHORT', 'TRY', 'CHAR',
  'FINAL', 'INTERFACE', 'STATIC', 'VOID', 'CLASS', 'FINALLY', 'LONG', 'STRICTFP', 'VOLATILE', 'CONST', 'FLOAT', 'NATIVE',
  'SUPER', 'WHILE'];

const GRAPHQL_TYPES = {
  String : 'GraphQLString',
  Integer : 'GraphQLInt',
  Long : 'GraphQLInt',
  Float : 'GraphQLFloat',
  Double : 'GraphQLFloat',
  BigDecimal : 'GraphQLFloat',
  LocalDate : 'GraphQLDateTime',
  ZonedDateTime : 'GraphQLDateTime',
  Boolean : 'GraphQLBoolean',
  enum : 'GraphQLEnumType',
  'byte[]' : 'GraphQLNonNull'
};

const DYNAMODB_TYPES = {
  String : 'S',
  Integer : 'N',
  Long : 'N',
  Float : 'N',
  Double : 'N',
  BigDecimal : 'N',
  LocalDate : 'S',
  ZonedDateTime : 'S',
  Boolean : 'N',
  enum : 'S',
  'byte[]' : 'B'
};

const constants = {
  // maximum possible number of questions
  QUESTIONS: 3,
  COMMON_QUESTIONS: 1,
  RESERVED_WORDS,
  GRAPHQL_TYPES,
  DYNAMODB_TYPES
};

module.exports = constants;
