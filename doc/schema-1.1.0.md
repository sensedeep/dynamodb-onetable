# OneTable Schema Specification

## Version 1.1.0

## Summary

This document specifies the [DynamoDB OneTable](https://github.com/sensedeep/dynamodb-onetable) Schema that is used to define application entities and their fields.

This document uses the terms and definitions described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Background

The DynamoDB database provides an easy to configure, high-performance, NoSQL database with low operational overhead and extreme scalability. It appeals to developers with OLTP applications requiring a simple serverless database or those requiring the utmost in scalability.

DynamoDB best practices have evolved around single-table design patterns where one database table serves the entire application and holds multiple different application entities. This design pattern offers greater performance by reducing the number of requests required to retrieve information and lowers operational overhead. It also simplifies the changing and evolving of DynamoDB designs by uncoupling entity key fields and attributes from the physical table structure.

Schemas may be stored in the data table and thus the table becomes self-describing and the data items can be read and understood based upon the schema definitions.

[DynamoDB OneTable](https://github.com/sensedeep/dynamodb-onetable) is an access library for DynamoDB applications that use one-table design patterns with NodeJS. The OneTable Schema is used extensively by OneTable but has utility beyond the library and is being adopted by other tools. This specification defines its format and contents.

## Example

```json
{
    "version": "0.1.0",
    "format": "onetable:1.1.0",
    "indexes": {
        "primary": { "hash": "PK", "sort": "SK" },
        "GSI1": { "hash": "GS1PK", "sort": "GS1SK" }
    },
    "params": {
        "typeField": "_type"
    },
    "models": {
        "Account": {
            "PK":          { "type": "string", "value": "account#${name}" },
            "SK":          { "type": "string", "value": "account#" },
            "name":        { "type": "string", "required": true }
        },
        "User": {
            "PK":          { "type": "string", "value": "account#${accountName}" },
            "SK":          { "type": "string", "value": "user#${email}" },
            "accountName": { "type": "string" },
            "email":       { "type": "string", "required": true }
        },
        "Post": {
            "PK":          { "value": "post#${id}" },
            "SK":          { "value": "user#${email}" },
            "id":          { "type": "string" },
            "message":     { "type": "string" },
            "email":       { "type": "string" }
        }
    },
    "queries": {
        "Get photos liked by a user": {
            "limit": 100,
            "index": "gs1",
            "model": "Like",
            "filters": [ {
                "field": "username",
                "type": "string",
                "operation": "Equal",
                "value": "ashley",
                "combine": "And"
            } ],
            "operation": "Begins with",
            "schema": "Current",
            "type": "Entity"
        }
    },
    "items": [
    ]
}
```

## Conventions

The following keywords MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL are interpreted as described in the [Key Words RFC2119](http://tools.ietf.org/html/rfc2119).

## Formats

OneTable schemas are expressed in [JSON](https://www.json.org/json-en.html) so they may be imported by code and tools or persisted in database tables.

A OneTable schema is an Object Map with a set of mandatory and optional top-level properties.

## Top Level Properties

A OneTable schema MUST have the following top-level properties:

* format
* indexes
* items
* models
* params
* queries
* version

The `format` property MUST be set to 'onetable:1.1.0' for compatibility with this specification. The version portion of the format property is a [SemVer](https://semver.org/) compatible version number and MUST be used according to SemVer when loading schemas to assess the compatibility of the schema contents.

The `version` property MUST be [SemVer](https://semver.org/) compatible version number that describes the schema contents version.

The `models` property MUST be an object map containing the application entity definitions. See [Models](#models) below.

The `params` property MUST be an object map containing schema parameters that control how the schema is interpreted. See [Params](#params) below.

The `indexes` property MUST be an object map containing index definitions. Each index is an object map.

A OneTable schema MAY have the following optional top-level properties:

* description
* extensions
* items
* queries

The `description` property MAY be set to a short description outlining the purpose and/or scope of the schema.

The `items` property if present, MUST be an array containing data items. The `items` SHOULD contain a small amount of sample or actual data to assist in visualizing and developing the schema by tools. It SHOULD NOT be used to backup tables or contain large amounts of data.

The `queries` property is RESERVED.

To accommodate custom extensions, applications and tools MAY store custom properties and configuration in a map under the `extensions` property. A reliably unique property name SHOULD be chosen for custom properties under the `extensions`.

All other properties are RESERVED.


## Indexes

The `indexes` map contains definitions for the DynamoDB indexes used by the schema. These definitions specify the attribute names of the primary and sort keys and the attribute projections utilized by the index. The `indexes` property MAY be used by tools to create DynamoDB tables to host the schema and data items.

The `indexes` map MUST contain a `primary` property that describes the attributes of the primary index. Additional indexes MUST be specified if they are utilized by the entities.

Each `index` MUST contain the following properties:

* hash
* sort

The `hash` property specifies the DynamoDB attribute name of the partition (hash) key. The `sort` property specifies the attribute name of the sort key.

Each `index` that corresponds to a DynamoDB Global Secondary Index (GSI) MAY contain the following property:

* project

The `project` property describes which attributes are projected to the GSI. It MUST be set to the one of the following values:

* all
* keys
* [list of attributes]

The `all` value indicates that all attributes are projected to the GSI. The `keys` value indicates that only key values are projected to the GSI. If set to a `list` the property value MUST be a valid JavaScript list of attribute names that are projected to the GSI.


## Params

The `params` map contains schema configuration that is vital to interpret table data. The `params` map MAY include the following properties:

* typeField
* isoDates

The `typeField` property MAY be set to a string that contains the name of the DynamoDB attribute that specifies the application entity model name. This name is used an index into the `models` map when interpreting table data. If unset, this defaults to `_type`.

The `isoDates` property MAY be set to true to specify that dates will be stored in the datbase as ISO date strings. If set to false, dates are stored as a number of seconds since Jan 1 1970 (Unix epoch date format). If unset, isoDates defaults to be false.

The `params` map MAY contain the following optional properties that are used by the OneTable library and MUST be considered RESERVED. All other values in the params collection MUST be considered RESERVED.

* createdField
* hidden
* nulls
* timestamps
* updatedField


## Models

The `models` map is comprised of properties for each of the application's entities. The application entities are object maps that define the entity's fields. The entity name MUST be set to a single word property name that begins with an alphabeta letter or '_'. By convention, these typically begin with an upper case letter.

The model property names MUST conform to the regular expression:

```regex
/^[a-zA-Z_]+[\w]*$/
```


## Model Entities

Each application entity is represented by an `entity` property in the `models` top-level collection.

Each `entity` describes an application entity with its DynamoDB table attributes. The name of the `entity` is
specified by its name in the `models` map.

Each `entity` MUST contain the following property.

* type

The `type` property MUST take a string value set to one of the following data types:

* array
* binary
* boolean
* date
* number
* object
* set
* string

Date values will be encoded in table data according to the `params.isoDates` configuration property.

Each `entity` MAY contain the following OPTIONAL properties.

* default
* required
* uuid
* validate
* value

The `default` property provides a default value to be used for an attribute when creating a new entity item should that attribute's value not be specified. The value MAY be any JSON type that is compatible with the specified model's `type`.

The `required` property indicates that the property MUST be provided when creating a new entity data item. It MUST be set to the boolean true or false values.

The `uuid` property indicates that a new UUID or ULID will be generated for the attribute when the entity item is created.
It MUST be set to `uuid` for a UUID-v4 string and to 'ulid' for a [ULID](https://github.com/ulid/spec). Other values are RESERVED.

The `validate` property provides a JavaScript compatible regular expression string that SHOULD be used by libraries and tools to validate created or updated data attributes. The validate string MUST begin and end with the '/' character.

The `value` property provides a value template string that is used to construct the attribute's value at runtime.

The `value` string templates are similar to JavaScript string templates but are computed at runtime to calculate the entity attribute's value. The `value` temlate MAY contain substitution references to other fields defined in the entity model. These references are of the form:

    '${attribute}'

The `value` template name MAY also be of the form:

    ${attribute:size}
or

    ${attribute:size:pad}

where the name will be padded to the specified size using the given pad character (which default to '0'). This is useful for zero padding numbers so that they sort numerically.

The following `entity` attributes are used by the OneTable library and MUST be considered RESERVED.
All other values in the params collection MUST be considered RESERVED.

* crypt
* enum
* filter
* hidden
* map
* nulls
* reference
* unique

## Queries

The `queries` map contains saved DynamoDB queries.  Each property in the `queries` map is the name of a saved query.

Each query MUST have the following properties

* hash
* index
* limit
* operation
* schema
* type

The `hash` property defines the partition key value for the query.

The `index` property defines the name of the index utilized by the query. It MUST be the name of a property in the `indexes` map.

The `limit` property specifies the maximum number of items for the query to return. It MUST be set to a positive integer value.

The `operation` property specifies a sort key comparison operation for the query. It MUST be set to one of the following string values:

* "Equal"
* "Less than"
* "Less than or equal"
* "Greater than or equal"
* "Greater than"
* "Begins with"
* "Between"

The `schema` property MAY be set to a string containing the name of a schema for the query to utilize. Schema names are outside the scope of this specification.

The `type` property MAY be set to 'Scan' or 'Query' to select the type of DyanmoDB operation. It MAY also be set to 'Entity' for a
query that is constrained by the `query.model` value.

Each query MAY contain the follow properties:

* filters
* model

All other properties are RESERVED.

The `model` property MUST be present if the query `type` is 'Entity'. The `model` MUST be set to a string with the name of a defined application entity model in `models`.

The `filters` property specifies OPTIONAL additional query or scan filter expressions. If present, it MUST be set to an array of filter objects. Each filter MUST contain the following properties

* field
* operation
* combine
* type
* value

The `field` property MUST be the name of a table attribute. The `operation` MUST be one of the set of operations: `Equal`, `Not equal`, `Less than`, `Less than or equal`,
              `Greater than or equal`, `Greater than`, `Between`, `Begins with`,
              `Existing`, `Not Existing`, `Contains`, `Does not contain`.
The `combine` property must be set to `And` or `Or` and stipulates the boolean operation to combine with the prior filter. The `type` MUST be set to a Dynamo type from the set: `array`, `binary`, `boolean`, `buffer`, `date`, `number`, `object`, `set`, `string`. The `value` MUST be set to the filter comparision value.

## Example Queries

```json
"queries": {
    "sampleQuery": {
        "filters": [
            {
                "operation": "Equal",
                "combine": "And",
                "type": "string",
                "value": "6e223f93636422b9a86b57714499918c",
                "field": "apiToken"
            }
        ],
        "hash": "org:47f1b13910d2aacd818dafa6b38c46bb",
        "index": "primary",
        "limit": 100,
        "name": "test",
        "operation": "Equal",
        "schema": "Current",
        "type": "Query"
    }
}
```

## Data Items

The `items` MAY contain a small amount of data to assist with visualizing the schema in tools.

The `items` property MUST be an array data items. Each data item MUST be a valid instance of an application entity described in the `models` property.


### Participate

All feedback, discussion, contributions and bug reports are very welcome.

* [discussions](https://github.com/sensedeep/dynamodb-onetable/discussions)
* [issues](https://github.com/sensedeep/dynamodb-onetable/issues)

### Contact

You can contact me (Michael O'Brien) on Twitter at: [@mobstream](https://twitter.com/mobstream), or [email](mob-pub-18@sensedeep.com) and ready my [Blog](https://www.sensedeep.com/blog).


## References

[RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119)

https://www.sensedeep.com/blog/posts/2021/dynamodb-schemas.html
https://www.sensedeep.com/blog/posts/2021/dynamodb-singletable-design.html
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Cheatsheet
