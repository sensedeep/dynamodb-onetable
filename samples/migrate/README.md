OneTable Migrate sample
===

This sample demonstrates the use of the OneTable migrate library and OneTable CLI.

The OneTable CLI is used to manage migrations and can communicate directly with DynamoDB or indirectly via a lambda proxy.

A proxy is used so that local CLI scripting can manage migrations for DynamoDB running in a remove AWS region. Direct communication by the CLI with DynamoDB is used for local debugging.

This sample demonstrates the use of a Lambda proxy running locally via the serverless framework.

The ./Migrate.js is the Lambda source code. This ./migrations directory contains some sample migrations to add stock data, entities and attributes. The migrations/schema.js represents the current schema.

Normal operation is to create migrations under the migrations directory using a SemVer version naming schema. These are indexed in the migrations/index.js which is read by the Migrate lambda to understand which migrations are available.

This onetable-migrate library manages a _Migrations entity in the DynamoDB table. _Migrations items describe each migration that has been applied and defines the "version" of the latest migration.

## Files

* Migrate.js -- Lambda source code.
* migrations/ -- Directory containing the code for each migration.
* migrations/0.0.1.js -- The first migration.
* migrations/latest.js -- The migration to advance to the latest state.
* migrations/helpers.js -- Some useful helper functions for migrations.

## Read the Code

* [Overview Source](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples/migrate/Migrate.js)

## Building

```
make configure
```

## Run

You first need to run a local instance DynamoDB and create the test table. Run this in a separate terminal window and keep it running.

```
make startdb
```

Then run the Migration Lambda in another terminal window. This runs the Migrate lambda using the the serverless framework to run Lambda locally.

```
make run
```

Then use npm to install the OneTable CLI globally. Note: you must be using NPM v7.0 or later.

```
npm install onetable-cli -g
```

Try the following commands. You must execute onetable commands from with the same directory as the migrate.json.

```
cd migrations
onetable migrate status
onetable migrate list
onetable migrate outstanding
onetable migrate up             # To apply the v0.0.1 migration
```


### Example Commands

Here is a list of available commands:

Apply the next migration

```sh
onetable migrate up
```

Reverse the last migration

```sh
onetable migrate down
```

Migrate to a specific version (up or down)

```sh
onetable migrate 0.1.3
```

Apply all outstanding migrations

```sh
onetable migrate all
```

Show the last applied migration

```sh
onetable migrate status
```

Show applied migrations

```sh
onetable migrate list
```

Show outstanding migrations not yet applied

```sh
onetable migrate outstanding
```

Reset the database to the latest migration. This should the database and apply the `latest.js` migration. The purpose of the `latest` migration is to have one migration that can quickly create a new database with the latest schema without having to apply all historical migrations.

```sh
onetable migrate reset
```

Generate a specific version migration

```sh
onetable migrate --bump 2.4.3 generate
```

Do a dry run for a migration and not execute

```sh
onetable migrate --dry up
```

### Command Line Options

```
--aws-access-key                    # AWS access key
--aws-region                        # AWS service region
--aws-secret-key                    # AWS secret key
--bump [major,minor,patch]          # Version digit to bump in generation
--config ./migrate.json             # Migration configuration
--crypto cipher:password            # Crypto to use for encrypted attributes
--dir directory                     # Change to directory to execute
--dry                               # Dry-run, don't execute
--endpoint http://host:port         # Database endpoint
--force                             # Force action without confirmation
--profile prod|qa|dev|...           # Select configuration profile
--quiet                             # Run as quietly as possible
--schema ./path/to/schema.js        # Database schema module
--version                           # Emit version number
```

## Configuration

The `migrations/migrate.json` describes your DynamoDB OneTable configuration. We use JSON5 so you can use Javascript object literal syntax.

```javascript
{
    name: 'your-dynamo-table',
    schema: 'schema.js',
}
```

The `name` property is set to the name of your DynamoDB table. The `schema` property is set to point to your OneTable schema. This can be named with a `.mjs` extension or you will need a package.json file in that directory with `"type": "module"` file.

The schema file should use `export default` to export the schema. In this manner, the same schema file can be used for your DynamoDB access layer and for the OneTable CLI. For example:

```
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        user: {
            pk: { type: String, value: 'user:${email}' },
            sk: { type: String, value: 'user:' },
            email: { type: String },
        }
    }
}
```

If you need to have your migrations in a different directory, you can set the migrate.json `dir` property to point to the directory containing the migrations themselves.

Your configuration should match your OneTable configuration with respect to the OneTable `crypto`, `delimiter`, `nulls` and `typeField` settings. If you have these set to non-default settings, add them to your migrate.json to match.

Generate Stub Migrations

Migrations are Javascript files that export the methods `up` and `down` to apply the migration and a `description` property.

```sh
onetable generate migration
```

This will create a `0.0.1.js` migration that contains the following. Edit the `up` and `down` methods and description to suit. The `db` property is the OneTable `Table` instance. This `migrate` property is an instance of the CLI Migrate class.

```javascript
export default {
    version: '0.0.1',
    description: 'Purpose of this migration',
    async up(db, migrate) {
        // await db.create('Model', {})
    },
    async down(db, migrate) {
        // await db.remove('Model', {})
    }
}
```

### Accessing AWS

You can configure access to your DynamoDB table in your AWS account several ways:

* via command line options
* via the migrate.json
* via environment variables
* via proxy

Via command line option:

```
onetable migrate --aws-access-key key --aws-secret-key secret --aws-region us-east-1
```

Via migrate.json
```
{
    aws: {
        accessKeyId: 'your-key',
        secretAccessKey: 'your-access',
        region: 'us-east-1'
    }
}
```

Or via environment variables:

```
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

You can also use:
```
export AWS_PROFILE=aws-profile-name
export AWS_REGION=us-east-1
```

To directly access a local DynamoDB database, set the migrate.json `aws.endpoint` property to point to the listening endpoint.

```
{
    aws: {
        endpoint: 'http://localhost:8000'
    }
}
```

To communicate with a Lambda hosting the [OneTable Migrate Library](), set the `arn` field to the ARN of your Lambda function.
Then define your AWS credentials as described above to grant access for the CLI to your Lambda.

```
{
    arn: 'arn:aws:lambda:us-east-1:123456789012:function:migrate-prod-invoke'
}
```


### Remote Connections

This sample uses the [OneTable Migrate](https://www.npmjs.com/package/onetable-migrate) controller library in a Migrate lambda to manage migrations. As such, DynamoDB I/O is not performed from within the OneTable CLI process. This means I/O travels to and from the system hosting the OneTable CLI process.

If you have large databases or complex migrations, you should host the [OneTable Migrate](https://www.npmjs.com/package/onetable-migrate) library in the same AWS region and availablity zone as your DynamoDB instance. This will accelerate migrations by minimizing the I/O transfer time. With this split deployment of CLI and Migration library, higher volume migrations execute more quickly.

To configure remote control of migrations, set the migrate.json `arn` property to the ARN of your migration Lambda that hosts the Migration Library. See [OneTable Migrate](https://www.npmjs.com/package/onetable-migrate) for more details about Lambda hosting of the OneTable Migrate library.

### Latest Migration

You can create a special `latest` migration that is used for the `migrate reset` command which is is a quick way to get a development database up to the current version.

The latest migration should remove all data from the database and then initialize the database equivalent to applying all migrations.

When creating your `latest.js` migration, be very careful when removing all items from the database. We typically protect this with a test against the deployment profile to ensure you never do this on a production database.

### References

- [OneTable NPM](https://www.npmjs.com/package/dynamodb-onetable)
- [OneTable GitHub](https://github.com/sensedeep/dynamodb-onetable)
- [OneTable Post](https://www.sensedeep.com/blog/posts/2020/dynamodb-onetable.html)
- [OneTable Migrate Library](https://www.npmjs.com/package/onetable-migrate)
- [DocumentClient SDK Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)

### Participate

All feedback, contributions and bug reports are very welcome.

* [OneTable CLI Issues](https://github.com/sensedeep/onetable-cli/issues)

### Contact

You can contact me (Michael O'Brien) on Twitter at: [@SenseDeepCloud](https://twitter.com/SenseDeepCloud), or [email](mob-pub-18@sensedeep.com) and ready my [Blog](https://www.sensedeep.com/blog).

### SenseDeep

Please try our Serverless trouble shooter [SenseDeep](https://www.sensedeep.com/).
