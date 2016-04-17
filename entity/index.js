'use strict';
var generators = require('yeoman-generator');
var util = require('util');
var scriptBase = require('../generator-base');
var chalk = require('chalk');
var _ = require('lodash');
var shelljs = require('shelljs');
var pluralize = require('pluralize');
var commonUtils = require('../util');

/* constants used througout */
const constants = require('../generator-constants'),
  RESERVED_WORDS = constants.RESERVED_WORDS,
  GRAPHQL_TYPES = constants.GRAPHQL_TYPES,
  DYNAMODB_TYPES = constants.DYNAMODB_TYPES
  ;

// enum-specific vars
var enums = [];
var existingEnum = false;

var fieldNamesUnderscored = [];
var fieldNameChoices = [], relNameChoices = []; // this variable will hold field and relationship names for question options during update

var VagabondEntityGenerator = generators.Base.extend({});
util.inherits(VagabondEntityGenerator, scriptBase);

module.exports = VagabondEntityGenerator.extend({
  constructor: function () {
    generators.Base.apply(this, arguments);

    // This makes `name` a required argument.
    this.argument('name', {
      type: String,
      required: true,
      description: 'Entity name'
    });
    // remove extention if feeding json files
    if (this.name !== undefined) {
      this.name = this.name.replace('.json', '');
    }


    this.regenerate = this.options['regenerate'];
    this.entityNameCapitalized = _.upperFirst(this.name);
    this.rootDir = this.destinationRoot();
    this.GraphQLTypes = GRAPHQL_TYPES;
  },

  initializing: {
    getConfig: function (args) {
      this.baseName = this.config.get('baseName');
      this.camelizedBaseName = _.camelCase(this.baseName);
      this.capitalizedBaseName = _.upperFirst(this.baseName);

      this.configDirectory = '.vag';

      this.filename = this.configDirectory + '/' + this.entityNameCapitalized + '.json';
      if (shelljs.test('-f', this.filename)) {
        this.log(chalk.green('\nFound the ' + this.filename + ' configuration file, entity can be automatically generated!\n'));
        this.useConfigurationFile = true;
        this.fromPath = this.filename;
      }
    },

    validateEntityName: function () {
      if (!(/^([a-zA-Z0-9_]*)$/.test(this.name))) {
        this.env.error(chalk.red('The entity name cannot contain special characters'));
      } else if (this.name === '') {
        this.env.error(chalk.red('The entity name cannot be empty'));
      } else if (this.name.indexOf('Detail', this.name.length - 'Detail'.length) !== -1) {
        this.env.error(chalk.red('The entity name cannot end with \'Detail\''));
      }
    },

    setupVars: function () {
      // Specific Entity sub-generator variables
      if (!this.useConfigurationFile) {
        //no file present, new entity creation
        this.log(chalk.red('\nThe entity ' + this.name + ' is being created.\n'));
        this.fields = [];
        this.relationships = [];
      } else {
        //existing entity reading values from file
        this.log(chalk.red('\nThe entity ' + this.name + ' is being updated.\n'));
        this._loadJson();
      }
    }
  },

  /* private Helper methods */
  _loadJson: function () {
    try {
      this.fileData = this.fs.readJSON(this.fromPath);
    } catch (err) {
      this.log(chalk.red('\nThe configuration file could not be read!\n'));
      return;
    }
    this.relationships = this.fileData.relationships;
    this.fields = this.fileData.fields;
    this.changelogDate = this.fileData.changelogDate;
    this.dto = this.fileData.dto;
    this.service = this.fileData.service;
    this.pagination = this.fileData.pagination;
    this.javadoc = this.fileData.javadoc;
    this.entityTableName = this.fileData.entityTableName || _.snakeCase(this.name).toLowerCase();
    this.fields && this.fields.forEach(function (field) {
      fieldNamesUnderscored.push(_.snakeCase(field.fieldName));
      fieldNameChoices.push({ name: field.fieldName, value: field.fieldName });
    }, this);
    this.relationships && this.relationships.forEach(function (rel) {
      relNameChoices.push({ name: rel.relationshipName + ':' + rel.relationshipType, value: rel.relationshipName + ':' + rel.relationshipType });
    }, this);
    this.keyField = this._keyField();
  },

  /* find and return key field */
  _keyField: function () {
    var keyField;
    for (var idx in this.fields) {
      var field = this.fields[idx];
      if (field.fieldIsKey === true || field.fieldName === 'id' || field.fieldName === 'key') {
        keyField = field;
        break;
      }
    }
    if (!keyField && this.fields.length > 0) {
      keyField = this.fields[0];
    }
    return keyField;
  },

  prompting: {
    /* ask question to user if s/he wants to update entity */
    askForUpdate: function () {
      // ask only if running an existing entity without arg option --force or --regenerate
      var isForce = this.options['force'] || this.regenerate;
      this.updateEntity = 'regenerate'; // default if skipping questions by --force
      if (isForce || !this.useConfigurationFile) {
        return;
      }
      var cb = this.async();
      var prompts = [
        {
          type: 'list',
          name: 'updateEntity',
          message: 'Do you want to update the entity? This will replace the existing files for this entity, all your custom code will be overwritten',
          choices: [
            {
              value: 'regenerate',
              name: 'Yes, re generate the entity'
            },
            {
              value: 'add',
              name: '[BETA] Yes, add more fields and relationships'
            },
            {
              value: 'remove',
              name: '[BETA] Yes, remove fields and relationships'
            },
            {
              value: 'none',
              name: 'No, exit'
            }
          ],
          default: 0
        }
      ];
      this.prompt(prompts, function (props) {
        this.updateEntity = props.updateEntity;
        if (this.updateEntity === 'none') {
          this.env.error(chalk.green('Aborting entity update, no changes were made.'));
        }
        cb();

      }.bind(this));
    },

    askForFields: function () {
      // don't prompt if data is imported from a file
      if (this.useConfigurationFile && this.updateEntity !== 'add') {
        return;
      }

      if (this.updateEntity === 'add') {
        this._logFieldsAndRelationships();
      }

      var cb = this.async();

      this._askForField(cb);
    },

    askForFieldsToRemove: function () {
      // prompt only if data is imported from a file
      if (!this.useConfigurationFile || this.updateEntity !== 'remove') {
        return;
      }
      var cb = this.async();

      this._askForFieldsToRemove(cb);
    },

    askForRelationships: function () {
      // don't prompt if data is imported from a file
      if (this.useConfigurationFile && this.updateEntity !== 'add') {
        return;
      }

      var cb = this.async();

      this._askForRelationship(cb);
    },

    askForRelationsToRemove: function () {
      // prompt only if data is imported from a file
      if (!this.useConfigurationFile || this.updateEntity !== 'remove') {
        return;
      }

      var cb = this.async();

      this._askForRelationsToRemove(cb);
    }
  },

  configuring: {

    writeEntityJson: function () {
      if (this.useConfigurationFile && this.updateEntity === 'regenerate') {
        return; //do not update if regenerating entity
      }
      this.data = {};
      this.data.relationships = this.relationships;
      this.data.fields = this.fields;
      this.data.changelogDate = this.changelogDate;
      this.data.dto = this.dto;
      this.data.service = this.service;
      this.data.entityTableName = this.entityTableName;
      this.data.pagination = this.pagination;
      this.data.javadoc = this.javadoc;
      this.fs.writeJSON(this.filename, this.data, null, 4);
    },

    loadInMemoryData: function () {
      var entityNameSpinalCased = _.kebabCase(_.lowerFirst(this.name));
      var entityNamePluralizedAndSpinalCased = _.kebabCase(_.lowerFirst(pluralize(this.name)));

      this.entityClass = this.entityNameCapitalized;
      this.entityClassHumanized = _.startCase(this.entityNameCapitalized);
      this.entityClassPlural = pluralize(this.entityClass);
      this.entityClassPluralHumanized = _.startCase(this.entityClassPlural);
      this.entityInstance = _.lowerFirst(this.name);
      this.entityInstancePlural = pluralize(this.entityInstance);
      this.entityApiUrl = entityNamePluralizedAndSpinalCased;
      this.entityFolderName = entityNameSpinalCased;
      this.entityServiceFileName = entityNameSpinalCased;
      this.entityTranslationKey = this.entityInstance;
      this.entityTranslationKeyMenu = _.camelCase(this.entityStateName);

      this.fieldsContainZonedDateTime = false;
      this.fieldsContainLocalDate = false;
      this.fieldsContainDate = false;
      this.fieldsContainBigDecimal = false;
      this.fieldsContainBlob = false;
      this.validation = false;
      this.fieldsContainOwnerManyToMany = false;
      this.fieldsContainNoOwnerOneToOne = false;
      this.fieldsContainOwnerOneToOne = false;
      this.fieldsContainOneToMany = false;
      this.fieldsContainManyToOne = false;
      this.differentTypes = [this.entityClass];
      if (!this.relationships) {
        this.relationships = [];
      }

      // Load in-memory data for fields
      this.fields && this.fields.forEach(function (field) {
        // Migration from JodaTime to Java Time
        if (field.fieldType === 'DateTime') {
          field.fieldType = 'ZonedDateTime';
        }
        var fieldType = field.fieldType;

        var nonEnumType = _.includes(['String', 'Integer', 'Long', 'Float', 'Double', 'BigDecimal',
          'LocalDate', 'ZonedDateTime', 'Boolean', 'byte[]'], fieldType);
        if (!nonEnumType) {
          field.fieldIsEnum = true;
        } else {
          field.fieldIsEnum = false;
        }

        if (_.isUndefined(field.fieldNameCapitalized)) {
          field.fieldNameCapitalized = _.upperFirst(field.fieldName);
        }

        if (_.isUndefined(field.fieldNameUnderscored)) {
          field.fieldNameUnderscored = _.snakeCase(field.fieldName);
        }

        if (_.isUndefined(field.fieldNameHumanized)) {
          field.fieldNameHumanized = _.startCase(field.fieldName);
        }

        if (_.isUndefined(field.fieldInJavaBeanMethod)) {
          // Handle the specific case when the second letter is capitalized
          // See http://stackoverflow.com/questions/2948083/naming-convention-for-getters-setters-in-java
          if (field.fieldName.length > 1) {
            var firstLetter = field.fieldName.charAt(0);
            var secondLetter = field.fieldName.charAt(1);
            if (firstLetter === firstLetter.toLowerCase() && secondLetter === secondLetter.toUpperCase()) {
              field.fieldInJavaBeanMethod = firstLetter.toLowerCase() + field.fieldName.slice(1);
            } else {
              field.fieldInJavaBeanMethod = _.upperFirst(field.fieldName);
            }
          } else {
            field.fieldInJavaBeanMethod = _.upperFirst(field.fieldName);
          }
        }

        if (_.isArray(field.fieldValidateRules) && field.fieldValidateRules.length >= 1) {
          field.fieldValidate = true;
        } else {
          field.fieldValidate = false;
        }

        if (fieldType === 'ZonedDateTime') {
          this.fieldsContainZonedDateTime = true;
        } else if (fieldType === 'LocalDate') {
          this.fieldsContainLocalDate = true;
        } else if (fieldType === 'Date') {
          this.fieldsContainDate = true;
        } else if (fieldType === 'BigDecimal') {
          this.fieldsContainBigDecimal = true;
        } else if (fieldType === 'byte[]') {
          this.fieldsContainBlob = true;
        }

        if (field.fieldValidate) {
          this.validation = true;
        }
      }, this);

      // Load in-memory data for relationships
      this.relationships && this.relationships.forEach(function (relationship) {
        if (_.isUndefined(relationship.relationshipNameCapitalized)) {
          relationship.relationshipNameCapitalized = _.upperFirst(relationship.relationshipName);
        }

        if (_.isUndefined(relationship.relationshipNameCapitalizedPlural)) {
          relationship.relationshipNameCapitalizedPlural = pluralize(_.upperFirst(relationship.relationshipName));
        }

        if (_.isUndefined(relationship.relationshipNameHumanized)) {
          relationship.relationshipNameHumanized = _.startCase(relationship.relationshipName);
        }

        if (_.isUndefined(relationship.relationshipNamePlural)) {
          relationship.relationshipNamePlural = pluralize(relationship.relationshipName);
        }

        if (_.isUndefined(relationship.relationshipFieldName)) {
          relationship.relationshipFieldName = _.lowerFirst(relationship.relationshipName);
        }

        if (_.isUndefined(relationship.relationshipFieldNamePlural)) {
          relationship.relationshipFieldNamePlural = pluralize(_.lowerFirst(relationship.relationshipName));
        }

        if (_.isUndefined(relationship.otherEntityRelationshipNamePlural) && (relationship.relationshipType === 'one-to-many' || (relationship.relationshipType === 'many-to-many' && relationship.ownerSide === false) || (relationship.relationshipType === 'one-to-one'))) {
          relationship.otherEntityRelationshipNamePlural = pluralize(relationship.otherEntityRelationshipName);
        }

        if (_.isUndefined(relationship.otherEntityNamePlural)) {
          relationship.otherEntityNamePlural = pluralize(relationship.otherEntityName);
        }

        if (_.isUndefined(relationship.otherEntityNameCapitalized)) {
          relationship.otherEntityNameCapitalized = _.upperFirst(relationship.otherEntityName);
        }

        if (_.isUndefined(relationship.otherEntityNameCapitalizedPlural)) {
          relationship.otherEntityNameCapitalizedPlural = pluralize(_.upperFirst(relationship.otherEntityName));
        }

        if (_.isUndefined(relationship.otherEntityFieldCapitalized)) {
          relationship.otherEntityFieldCapitalized = _.upperFirst(relationship.otherEntityField);
        }


        // Load in-memory data for root
        if (relationship.relationshipType === 'many-to-many' && relationship.ownerSide) {
          this.fieldsContainOwnerManyToMany = true;
        } else if (relationship.relationshipType === 'one-to-one' && !relationship.ownerSide) {
          this.fieldsContainNoOwnerOneToOne = true;
        } else if (relationship.relationshipType === 'one-to-one' && relationship.ownerSide) {
          this.fieldsContainOwnerOneToOne = true;
        } else if (relationship.relationshipType === 'one-to-many') {
          this.fieldsContainOneToMany = true;
        } else if (relationship.relationshipType === 'many-to-one') {
          this.fieldsContainManyToOne = true;
        }

        var entityType = relationship.otherEntityNameCapitalized;
        if (this.differentTypes.indexOf(entityType) === -1) {
          this.differentTypes.push(entityType);
        }
      }, this);

      if (this.databaseType === 'cassandra' || this.databaseType === 'mongodb') {
        this.pkType = 'String';
      } else {
        this.pkType = 'Long';
      }
    },

    insight: function () {
      // track insights
      var insight = this.insight();

      insight.trackWithEvent('generator', 'entity');
      insight.track('entity/fields', this.fields.length);
      insight.track('entity/relationships', this.relationships.length);
      insight.track('entity/pagination', this.pagination);
      insight.track('entity/dto', this.dto);
      insight.track('entity/service', this.service);
    }

  },

  writing: {

    writeEnumFiles: function () {
      if (this.skipServer) return;

      for (var idx in this.fields) {
        var field = this.fields[idx];
        if (field.fieldIsEnum === true) {
          var fieldType = field.fieldType;
          var enumInfo = new Object();
          enumInfo.packageName = this.packageName;
          enumInfo.enumName = fieldType;
          enumInfo.enumValues = field.fieldValues;
          field.enumInstance = _.lowerFirst(enumInfo.enumName);
          enumInfo.enumInstance = field.enumInstance;
          enumInfo.enums = enumInfo.enumValues.replace(/\s/g, '').split(',');
          this.template('lib/_Enum.js', 'data/lib/' + fieldType + '.js', enumInfo, {});

          // Copy for each
          if (!this.skipClient && this.enableTranslation) {
            var languages = this.languages || this.getAllInstalledLanguages();
            languages.forEach(function (language) {
              this.copyEnumI18n(language, enumInfo);
            }, this);
          }
        }
      }
    },

    writeDynamoEntity: function () {
      this.fieldsAsArgs = this._fieldsAsArgs();
      this.fieldsAsList = this._fieldsAsList();
      this.entityFields = this._entityFields(2);
      this.template('lib/_EntityDynamo.js', 'data/lib/' + this.entityClass + 'Dynamo.js', this, {});
    },

    writeSchemaEntity: function () {
      this.entityFields = this._entityFields(2);
      this.template('lib/_EntitySchema.js', 'data/lib/' + this.entityClass + 'Schema.js', this, {});
    },

    injectEntityintoFiles: function () {
      this._importEntityToSchema(this.entityClass);
      this._importEntityQueryToSchema(this.entityClass);
      this._importEntityMutationToSchema(this.entityClass);
      this._importEntityToSProjectList(this.entityClass);
      this._importEntityToSProjectDynamo(this.entityClass);
    }

  },

  _fieldsAsArgs: function() {
    var fields = '{\n';
    for (var idx = 0; idx < this.fields.length; idx++) {
      var field = this.fields[idx];
      fields += '    ' + field.fieldName + ': args.' + field.fieldName;
      fields += (idx < this.fields.length - 1) ? ',\n' : '\n';
    }
    fields += '  }';
    return fields;
  },
  
  _fieldsAsList: function() {
    var fields = '[';
    for (var idx = 0; idx < this.fields.length; idx++) {
      var field = this.fields[idx];
      fields += '\'' + field.fieldName + '\'';
      if (idx < this.fields.length - 1) fields += ', ';
    }
    fields += ']';
    return fields;
  },

  _entityFields: function (indent) {
    var indents = Array(indent + 3).join(' ');
    var fields = '{\n';
    for (var idx = 0; idx < this.fields.length; idx++) {
      var field = this.fields[idx];
      var type = GRAPHQL_TYPES[field.fieldType];
      fields += indents + field.fieldName + ': { type: ' + type + ' }';
      fields += (idx < this.fields.length - 1) ? ',\n' : '\n';
    }
    fields += Array(indent + 1).join(' ') + '}';
    return fields;
  },

  /**
   * Add a new entity to the schema
   *
   * @param {string} entityClass - The name of the entity.
   */
  _importEntityToSchema: function (entityClass) {
    try {
      var fullPath = 'data/lib/schema.js';
      commonUtils.rewriteFile({
        file: fullPath,
        needle: 'vagabond-needle-import-entity-to-schema',
        splicable: [
          'import ' + entityClass + ' from \'./' + entityClass + 'Schema\';',
          'import { get' + entityClass + ', new' + entityClass + ',  args' + entityClass + '} from \'./' + entityClass + 'Dynamo\';\n'
        ]
      }, this);
    } catch (e) {
      this.log(chalk.yellow('\nUnable to find ') + fullPath + chalk.yellow(' or missing required vagabond-needle. Reference to ') + entityClass + ' ' + chalk.yellow('not added to schema.\n'));
    }
  },
  
  /**
   * Add a new entity query to the schema
   *
   * @param {string} entityClass - The name of the entity.
   */
  _importEntityQueryToSchema: function (entityClass) {
    try {
      var fullPath = 'data/lib/schema.js';
      commonUtils.rewriteFile({
        file: fullPath,
        needle: 'vagabond-needle-insert-entity-query-to-schema',
        splicable: [
          _.lowerFirst(entityClass) + ': {',
          '  type: ' + entityClass + ',',
          '  description: \'Get ' + entityClass + ' by ' + this.keyField.fieldName + '\',',
          '  args: {',
          '    ' + this.keyField.fieldName + ': { type: new GraphQLNonNull(GraphQLString) }',
          '  },',
          '  resolve: function(source, {' + this.keyField.fieldName + '}) {',
          '    return get' + entityClass + '(' + this.keyField.fieldName + ');',
          '  }',
          '}'
        ]
      }, this);
    } catch (e) {
      this.log(chalk.yellow('\nUnable to find ') + fullPath + chalk.yellow(' or missing required vagabond-needle. Reference to ') + entityClass + ' ' + chalk.yellow('not added to schema.\n'));
    }
  },
  
  /**
   * Add a new entity mutation to the schema
   *
   * @param {string} entityClass - The name of the entity.
   */
  _importEntityMutationToSchema: function (entityClass) {
    try {
      
      var fullPath = 'data/lib/schema.js';
      commonUtils.rewriteFile({
        file: fullPath,
        needle: 'vagabond-needle-insert-entity-mutation-to-schema',
        splicable: [
          'new' + entityClass + ': {',
          '  type: ' + entityClass + ',',
          '  description: \'Create a ' + entityClass + '\',',
          '  args: args' + entityClass + ',',
          '  resolve: new' + entityClass + '',
          '}\n'
        ]
      }, this);
    } catch (e) {
      this.log(chalk.yellow('\nUnable to find ') + fullPath + chalk.yellow(' or missing required vagabond-needle. Reference to ') + entityClass + ' ' + chalk.yellow('not added to schema.\n'));
    }
  },
  
  /**
   * Add a new entity to the schema
   *
   * @param {string} entityClass - The name of the entity.
   */
  _importEntityToSProjectList: function (entityClass) {
    try {
      var fullPath = 's-project.json';
      commonUtils.rewriteFile({
        file: fullPath,
        needle: 'vagabond-needle-add-entity-to-list',
        splicable: [
          ',',
          '{',
          '"Effect": "Allow",',
          '"Action": [',
          '  "*"',
          '],',
          '"Resource": "arn:aws:dynamodb:${region}:*:table/${project}-' + this.entityClass + '-${stage}"',
          '}'
        ]
      }, this);
    } catch (e) {
      this.log(chalk.yellow('\nUnable to find ') + fullPath + chalk.yellow(' or missing required vagabond-needle. Reference to ') + entityClass + ' ' + chalk.yellow('not added to s-project.json.\n'));
    }
  },
  /**
   * Add a new entity to the schema
   *
   * @param {string} entityClass - The name of the entity.
   */
  _importEntityToSProjectDynamo: function (entityClass) {
    try {

      var parts = [',',
        '"' + this.entityClass + 'Dynamo": {',
        '  "Type": "AWS::DynamoDB::Table",',
        '  "DeletionPolicy": "Retain",',
        '  "Properties": {',
        '    "AttributeDefinitions": ['];
      if (this.keyField) {
        parts.push('      {',
          '        "AttributeName": "' + this.keyField.fieldName + '",',
          '        "AttributeType": "' + DYNAMODB_TYPES[this.keyField.fieldType] + '"',
          '      }',
          '    ],',
          '    "KeySchema": [',
          '      {',
          '        "AttributeName": "' + this.keyField.fieldName + '",',
          '        "KeyType": "HASH"',
          '      }',
          '    ],');        
      }
      parts.push('    "ProvisionedThroughput": {',
        '      "ReadCapacityUnits": 1,',
        '      "WriteCapacityUnits": 1',
        '    },',
        '    "TableName": "${project}-' + this.entityClass + '-${stage}"',
        '  }',
        '}');
      
      var fullPath = 's-project.json';
      commonUtils.rewriteFile({
        file: fullPath,
        needle: 'vagabond-needle-add-entity-dynamo',
        splicable: parts
      }, this);
    } catch (e) {
      this.log(chalk.yellow('\nUnable to find ') + fullPath + chalk.yellow(' or missing required vagabond-needle. Reference to ') + entityClass + ' ' + chalk.yellow('not added to s-project.json.\n'));
    }
  },
  
  /**
   * Show the entity and it's fields and relationships in console
   */
  _logFieldsAndRelationships: function () {
    if (this.fields.length > 0 || this.relationships.length > 0) {
      this.log(chalk.red(chalk.white('\n================= ') + this.entityNameCapitalized + chalk.white(' =================')));
    }
    if (this.fields.length > 0) {
      this.log(chalk.white('Fields'));
      this.fields.forEach(function (field) {
        var validationDetails = '';
        var fieldValidate = _.isArray(field.fieldValidateRules) && field.fieldValidateRules.length >= 1;
        if (fieldValidate === true) {
          if (field.fieldValidateRules.indexOf('required') !== -1) {
            validationDetails = 'required ';
          }
          if (field.fieldValidateRules.indexOf('minlength') !== -1) {
            validationDetails += 'minlength=\'' + field.fieldValidateRulesMinlength + '\' ';
          }
          if (field.fieldValidateRules.indexOf('maxlength') !== -1) {
            validationDetails += 'maxlength=\'' + field.fieldValidateRulesMaxlength + '\' ';
          }
          if (field.fieldValidateRules.indexOf('pattern') !== -1) {
            validationDetails += 'pattern=\'' + field.fieldValidateRulesPattern + '\' ';
          }
          if (field.fieldValidateRules.indexOf('min') !== -1) {
            validationDetails += 'min=\'' + field.fieldValidateRulesMin + '\' ';
          }
          if (field.fieldValidateRules.indexOf('max') !== -1) {
            validationDetails += 'max=\'' + field.fieldValidateRulesMax + '\' ';
          }
          if (field.fieldValidateRules.indexOf('minbytes') !== -1) {
            validationDetails += 'minbytes=\'' + field.fieldValidateRulesMinbytes + '\' ';
          }
          if (field.fieldValidateRules.indexOf('maxbytes') !== -1) {
            validationDetails += 'maxbytes=\'' + field.fieldValidateRulesMaxbytes + '\' ';
          }
        }
        this.log(chalk.red(field.fieldName) + chalk.white(' (' + field.fieldType + (field.fieldTypeBlobContent ? ' ' + field.fieldTypeBlobContent : '') + ') ') + chalk.cyan(validationDetails));
      }, this);
      this.log();
    }
    if (this.relationships.length > 0) {
      this.log(chalk.white('Relationships'));
      this.relationships.forEach(function (relationship) {
        this.log(chalk.red(relationship.relationshipName) + ' ' + chalk.white('(' + _.upperFirst(relationship.otherEntityName) + ')') + ' ' + chalk.cyan(relationship.relationshipType));
      }, this);
      this.log();
    }
  },
  /**
   * ask question for a field creation
   */
  _askForField: function (cb) {
    this.log(chalk.green('\nGenerating field #' + (this.fields.length + 1) + '\n'));
    var prompts = [
      {
        type: 'confirm',
        name: 'fieldAdd',
        message: 'Do you want to add a field to your entity?',
        default: true
      },
      {
        when: function (response) {
          return response.fieldAdd === true;
        },
        type: 'input',
        name: 'fieldName',
        validate: function (input) {
          if (!(/^([a-zA-Z0-9_]*)$/.test(input))) {
            return 'Your field name cannot contain special characters';
          } else if (input === '') {
            return 'Your field name cannot be empty';
          } else if (input.charAt(0) === input.charAt(0).toUpperCase()) {
            return 'Your field name cannot start with a upper case letter';
          } else if (input === 'id' || fieldNamesUnderscored.indexOf(_.snakeCase(input)) !== -1) {
            return 'Your field name cannot use an already existing field name';
          } else if (RESERVED_WORDS.indexOf(input.toUpperCase()) !== -1) {
            return 'Your field name cannot contain a reserved keyword';
          }
          return true;
        },
        message: 'What is the name of your field?'
      },
      {
        when: function (response) {
          return response.fieldAdd === true;
        },
        type: 'list',
        name: 'fieldType',
        message: 'What is the type of your field?',
        choices: [
          {
            value: 'String',
            name: 'String'
          },
          {
            value: 'Integer',
            name: 'Integer'
          },
          {
            value: 'Long',
            name: 'Long'
          },
          {
            value: 'Float',
            name: 'Float'
          },
          {
            value: 'Double',
            name: 'Double'
          },
          {
            value: 'BigDecimal',
            name: 'BigDecimal'
          },
          {
            value: 'LocalDate',
            name: 'LocalDate'
          },
          {
            value: 'ZonedDateTime',
            name: 'ZonedDateTime'
          },
          {
            value: 'Boolean',
            name: 'Boolean'
          },
          {
            value: 'enum',
            name: 'Enumeration (Java enum type)'
          },
          {
            value: 'byte[]',
            name: '[BETA] Blob'
          }
        ],
        default: 0
      },
      {
        when: function (response) {
          if (response.fieldType === 'enum') {
            response.fieldIsEnum = true;
            return true;
          } else {
            response.fieldIsEnum = false;
            return false;
          }
        },
        type: 'input',
        name: 'fieldType',
        validate: function (input) {
          if (input === '') {
            return 'Your class name cannot be empty.';
          }
          if (enums.indexOf(input) !== -1) {
            existingEnum = true;
          } else {
            enums.push(input);
          }
          return true;
        },
        message: 'What is the class name of your enumeration?'
      },
      {
        when: function (response) {
          return response.fieldIsEnum;
        },
        type: 'input',
        name: 'fieldValues',
        validate: function (input) {
          if (input === '' && existingEnum) {
            existingEnum = false;
            return true;
          }
          if (input === '') {
            return 'You must specify values for your enumeration';
          }
          if (!/^[A-Za-z0-9_,\s]*$/.test(input)) {
            return 'Enum values cannot contain special characters (allowed characters: A-Z, a-z, 0-9 and _)';
          }
          var enums = input.replace(/\s/g, '').split(',');
          if (_.uniq(enums).length !== enums.length) {
            return 'Enum values cannot contain duplicates (typed values: ' + input + ')';
          }
          for (var i = 0; i < enums.length; i++) {
            if (/^[0-9].*/.test(enums[i])) {
              return 'Enum value "' + enums[i] + '" cannot start with a number';
            }
            if (enums[i] === '') {
              return 'Enum value cannot be empty (did you accidently type "," twice in a row?)';
            }
          }

          return true;
        },
        message: function (answers) {
          if (!existingEnum) {
            return 'What are the values of your enumeration (separated by comma)?';
          }
          return 'What are the new values of your enumeration (separated by comma)?\nThe new values will replace the old ones.\nNothing will be done if there are no new values.';
        }
      },
      {
        when: function (response) {
          return response.fieldAdd === true;
        },
        type: 'list',
        name: 'fieldType',
        message: 'What is the type of your field?',
        choices: [
          {
            value: 'UUID',
            name: 'UUID'
          },
          {
            value: 'String',
            name: 'String'
          },
          {
            value: 'Integer',
            name: 'Integer'
          },
          {
            value: 'Long',
            name: 'Long'
          },
          {
            value: 'Float',
            name: 'Float'
          },
          {
            value: 'Double',
            name: 'Double'
          },
          {
            value: 'BigDecimal',
            name: 'BigDecimal'
          },
          {
            value: 'Date',
            name: 'Date'
          },
          {
            value: 'Boolean',
            name: 'Boolean'
          }
        ],
        default: 0
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldType === 'byte[]';
        },
        type: 'list',
        name: 'fieldTypeBlobContent',
        message: 'What is the content of the Blob field?',
        choices: [
          {
            value: 'image',
            name: 'An image'
          },
          {
            value: 'any',
            name: 'A binary file'
          },
          {
            value: 'text',
            name: 'A CLOB (Text field)'
          }
        ],
        default: 0
      },
      {
        when: function (response) {
          return response.fieldAdd === true;
        },
        type: 'confirm',
        name: 'fieldValidate',
        message: 'Do you want to add validation rules to your field?',
        default: false
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            response.fieldType === 'String';
        },
        type: 'checkbox',
        name: 'fieldValidateRules',
        message: 'Which validation rules do you want to add?',
        choices: [
          {
            name: 'Required',
            value: 'required'
          },
          {
            name: 'Minimum length',
            value: 'minlength'
          },
          {
            name: 'Maximum length',
            value: 'maxlength'
          },
          {
            name: 'Regular expression pattern',
            value: 'pattern'
          }
        ],
        default: 0
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            (response.fieldType === 'Integer' ||
              response.fieldType === 'Long' ||
              response.fieldType === 'Float' ||
              response.fieldType === 'Double' ||
              response.fieldType === 'BigDecimal' ||
              response.fieldTypeBlobContent === 'text');
        },
        type: 'checkbox',
        name: 'fieldValidateRules',
        message: 'Which validation rules do you want to add?',
        choices: [
          {
            name: 'Required',
            value: 'required'
          },
          {
            name: 'Minimum',
            value: 'min'
          },
          {
            name: 'Maximum',
            value: 'max'
          }
        ],
        default: 0
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            response.fieldType === 'byte[]' &&
            response.fieldTypeBlobContent !== 'text';
        },
        type: 'checkbox',
        name: 'fieldValidateRules',
        message: 'Which validation rules do you want to add?',
        choices: [
          {
            name: 'Required',
            value: 'required'
          },
          {
            name: 'Minimum byte size',
            value: 'minbytes'
          },
          {
            name: 'Maximum byte size',
            value: 'maxbytes'
          }
        ],
        default: 0
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            (response.fieldType === 'LocalDate' ||
              response.fieldType === 'ZonedDateTime' ||
              response.fieldType === 'UUID' ||
              response.fieldType === 'Date' ||
              response.fieldType === 'Boolean' ||
              response.fieldIsEnum === true);
        },
        type: 'checkbox',
        name: 'fieldValidateRules',
        message: 'Which validation rules do you want to add?',
        choices: [
          {
            name: 'Required',
            value: 'required'
          }
        ],
        default: 0
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            response.fieldValidateRules.indexOf('minlength') !== -1;
        },
        type: 'input',
        name: 'fieldValidateRulesMinlength',
        validate: function (input) {
          if (/^([0-9]*)$/.test(input)) return true;
          return 'Minimum length must be a number';
        },
        message: 'What is the minimum length of your field?',
        default: 0
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            response.fieldValidateRules.indexOf('maxlength') !== -1;
        },
        type: 'input',
        name: 'fieldValidateRulesMaxlength',
        validate: function (input) {
          if (/^([0-9]*)$/.test(input)) return true;
          return 'Maximum length must be a number';
        },
        message: 'What is the maximum length of your field?',
        default: 20
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            response.fieldValidateRules.indexOf('pattern') !== -1;
        },
        type: 'input',
        name: 'fieldValidateRulesPattern',
        message: 'What is the regular expression pattern you want to apply on your field?',
        default: '^[a-zA-Z0-9]*$'
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            response.fieldValidateRules.indexOf('min') !== -1 &&
            (response.fieldType === 'Integer' ||
              response.fieldType === 'Long' ||
              response.fieldType === 'Float' ||
              response.fieldType === 'Double' ||
              response.fieldTypeBlobContent === 'text' ||
              response.fieldType === 'BigDecimal');
        },
        type: 'input',
        name: 'fieldValidateRulesMin',
        message: 'What is the minimum of your field?',
        validate: function (input) {
          if (/^([0-9]*)$/.test(input)) return true;
          return 'Minimum must be a number';
        },
        default: 0
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            response.fieldValidateRules.indexOf('max') !== -1 &&
            (response.fieldType === 'Integer' ||
              response.fieldType === 'Long' ||
              response.fieldType === 'Float' ||
              response.fieldType === 'Double' ||
              response.fieldTypeBlobContent === 'text' ||
              response.fieldType === 'BigDecimal');
        },
        type: 'input',
        name: 'fieldValidateRulesMax',
        message: 'What is the maximum of your field?',
        validate: function (input) {
          if (/^([0-9]*)$/.test(input)) return true;
          return 'Maximum must be a number';
        },
        default: 100
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            response.fieldValidateRules.indexOf('minbytes') !== -1 &&
            response.fieldType === 'byte[]' &&
            response.fieldTypeBlobContent !== 'text';
        },
        type: 'input',
        name: 'fieldValidateRulesMinbytes',
        message: 'What is the minimum byte size of your field?',
        validate: function (input) {
          if (/^([0-9]*)$/.test(input)) return true;
          return 'Minimum byte size must be a number';
        },
        default: 0
      },
      {
        when: function (response) {
          return response.fieldAdd === true &&
            response.fieldValidate === true &&
            response.fieldValidateRules.indexOf('maxbytes') !== -1 &&
            response.fieldType === 'byte[]' &&
            response.fieldTypeBlobContent !== 'text';
        },
        type: 'input',
        name: 'fieldValidateRulesMaxbytes',
        message: 'What is the maximum byte size of your field?',
        validate: function (input) {
          if (/^([0-9]*)$/.test(input)) return true;
          return 'Maximum byte size must be a number';
        },
        default: 5000000
      }
    ];
    this.prompt(prompts, function (props) {
      if (props.fieldAdd) {
        if (props.fieldIsEnum) {
          props.fieldType = _.upperFirst(props.fieldType);
        }

        var field = {
          fieldName: props.fieldName,
          fieldType: props.fieldType,
          fieldTypeBlobContent: props.fieldTypeBlobContent,
          fieldValues: props.fieldValues,
          fieldValidateRules: props.fieldValidateRules,
          fieldValidateRulesMinlength: props.fieldValidateRulesMinlength,
          fieldValidateRulesMaxlength: props.fieldValidateRulesMaxlength,
          fieldValidateRulesPattern: props.fieldValidateRulesPattern,
          fieldValidateRulesPatternJava: props.fieldValidateRulesPattern ? props.fieldValidateRulesPattern.replace(/\\/g, '\\\\') : props.fieldValidateRulesPattern,
          fieldValidateRulesMin: props.fieldValidateRulesMin,
          fieldValidateRulesMax: props.fieldValidateRulesMax,
          fieldValidateRulesMinbytes: props.fieldValidateRulesMinbytes,
          fieldValidateRulesMaxbytes: props.fieldValidateRulesMaxbytes
        };

        fieldNamesUnderscored.push(_.snakeCase(props.fieldName));
        this.fields.push(field);
        this.keyField = this._keyField();
      }
      this._logFieldsAndRelationships();
      if (props.fieldAdd) {
        this._askForField(cb);
      } else {
        cb();
      }
    }.bind(this));
  },
  /**
   * ask question for field deletion
   */
  _askForFieldsToRemove: function (cb) {
    var prompts = [
      {
        type: 'checkbox',
        name: 'fieldsToRemove',
        message: 'Please choose the fields you want to remove',
        choices: fieldNameChoices,
        default: 'none'
      },
      {
        when: function (response) {
          return response.fieldsToRemove !== 'none';
        },
        type: 'confirm',
        name: 'confirmRemove',
        message: 'Are you sure to remove these fields?',
        default: true
      }
    ];
    this.prompt(prompts, function (props) {
      if (props.confirmRemove) {
        this.log(chalk.red('\nRemoving fields: ' + props.fieldsToRemove + '\n'));
        var i;
        for (i = this.fields.length - 1; i >= 0; i -= 1) {
          var field = this.fields[i];
          if (props.fieldsToRemove.filter(function (val) {
            return val === field.fieldName;
          }).length > 0) {
            this.fields.splice(i, 1);
          }
        }
        this.keyField = this._keyField();
      }
      cb();

    }.bind(this));
  },
  /**
   * ask question for a relationship creation
   */
  _askForRelationship: function (cb) {
    var name = this.name;
    this.log(chalk.green('\nGenerating relationships to other entities\n'));
    var prompts = [
      {
        type: 'confirm',
        name: 'relationshipAdd',
        message: 'Do you want to add a relationship to another entity?',
        default: true
      },
      {
        when: function (response) {
          return response.relationshipAdd === true;
        },
        type: 'input',
        name: 'otherEntityName',
        validate: function (input) {
          if (!(/^([a-zA-Z0-9_]*)$/.test(input))) {
            return 'Your other entity name cannot contain special characters';
          } else if (input === '') {
            return 'Your other entity name cannot be empty';
          } else if (RESERVED_WORDS.indexOf(input.toUpperCase()) !== -1) {
            return 'Your other entity name cannot contain a Java reserved keyword';
          }
          return true;
        },
        message: 'What is the name of the other entity?'
      },
      {
        when: function (response) {
          return response.relationshipAdd === true;
        },
        type: 'input',
        name: 'relationshipName',
        validate: function (input) {
          if (!(/^([a-zA-Z0-9_]*)$/.test(input))) {
            return 'Your relationship cannot contain special characters';
          } else if (input === '') {
            return 'Your relationship cannot be empty';
          } else if (input === 'id' || fieldNamesUnderscored.indexOf(_.snakeCase(input)) !== -1) {
            return 'Your relationship cannot use an already existing field name';
          } else if (RESERVED_WORDS.indexOf(input.toUpperCase()) !== -1) {
            return 'Your relationship cannot contain a Java reserved keyword';
          }
          return true;
        },
        message: 'What is the name of the relationship?',
        default: function (response) {
          return _.lowerFirst(response.otherEntityName);
        }
      },
      {
        when: function (response) {
          return response.relationshipAdd === true;
        },
        type: 'list',
        name: 'relationshipType',
        message: 'What is the type of the relationship?',
        choices: [
          {
            value: 'one-to-many',
            name: 'one-to-many'
          },
          {
            value: 'many-to-one',
            name: 'many-to-one'
          },
          {
            value: 'many-to-many',
            name: 'many-to-many'
          },
          {
            value: 'one-to-one',
            name: 'one-to-one'
          }
        ],
        default: 0
      },
      {
        when: function (response) {
          return (response.relationshipAdd === true && (response.relationshipType === 'many-to-many' || response.relationshipType === 'one-to-one'));
        },
        type: 'confirm',
        name: 'ownerSide',
        message: 'Is this entity the owner of the relationship?',
        default: false
      },
      {
        when: function (response) {
          return (response.relationshipAdd === true && (response.relationshipType === 'one-to-many' ||
            (response.relationshipType === 'many-to-many' && response.ownerSide === false) ||
            (response.relationshipType === 'one-to-one' && response.otherEntityName.toLowerCase() !== 'user')));
        },
        type: 'input',
        name: 'otherEntityRelationshipName',
        message: 'What is the name of this relationship in the other entity?',
        default: function (response) {
          return _.lowerFirst(name);
        }
      },
      {
        when: function (response) {
          return (response.relationshipAdd === true && (response.relationshipType === 'many-to-one' || (response.relationshipType === 'many-to-many' && response.ownerSide === true) || (response.relationshipType === 'one-to-one' && response.ownerSide === true)));
        },
        type: 'input',
        name: 'otherEntityField',
        message: function (response) {
          return 'When you display this relationship, which field from \'' + response.otherEntityName + '\' do you want to use?';
        },
        default: 'id'
      }
    ];
    this.prompt(prompts, function (props) {

      if (props.relationshipAdd) {
        var relationship = {
          relationshipName: props.relationshipName,
          otherEntityName: _.lowerFirst(props.otherEntityName),
          relationshipType: props.relationshipType,
          otherEntityField: props.otherEntityField,
          ownerSide: props.ownerSide,
          otherEntityRelationshipName: props.otherEntityRelationshipName
        };
        fieldNamesUnderscored.push(_.snakeCase(props.relationshipName));
        this.relationships.push(relationship);
      }
      this._logFieldsAndRelationships();
      if (props.relationshipAdd) {
        this._askForRelationship(cb);
      } else {
        this.log('\n');
        cb();
      }
    }.bind(this));
  },
  /**
   * ask question for relationship deletion
   */
  _askForRelationsToRemove: function (cb) {
    var prompts = [
      {
        type: 'checkbox',
        name: 'relsToRemove',
        message: 'Please choose the relationships you want to remove',
        choices: relNameChoices,
        default: 'none'
      },
      {
        when: function (response) {
          return response.relsToRemove !== 'none';
        },
        type: 'confirm',
        name: 'confirmRemove',
        message: 'Are you sure to remove these relationships?',
        default: true
      }
    ];
    this.prompt(prompts, function (props) {
      if (props.confirmRemove) {
        this.log(chalk.red('\nRemoving relationships: ' + props.relsToRemove + '\n'));
        var i;
        for (i = this.relationships.length - 1; i >= 0; i -= 1) {
          var rel = this.relationships[i];
          if (props.relsToRemove.filter(function (val) {
            return val === rel.relationshipName + ':' + rel.relationshipType;
          }).length > 0) {
            this.relationships.splice(i, 1);
          }
        }
      }
      cb();

    }.bind(this));
  }
  /* end of Helper methods */

});
