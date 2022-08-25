# DynamoDB OneTable with TypeScript

OneTable provides TypeScript type declaration files so that OneTable APIs can be fully type checked.

OneTable also creates full type declarations for your table entities and attributes. Thereafter, TypeScript will catch any invalid entity or entity attribute references.

Using TypeScript dynamic, generic types, OneTable automatically converts your OneTable schema into fully typed generic Model APIs.

For example:

```typescript
const schema = {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        Account: {
            pk:     { type: String, value: 'account:${name}' },
            name:   { type: String },
        }
    },
    params: {
    }
}

//  Fully typed Account object based on the schema
type Account = Entity<typeof schema.models.Account>

let account: Account = {
    name: 'Coyote',        //  OK
    unknown: 42,           //  Error
}

//  Create a model to get/find/update...

let AccountModel = table.getModel('Account')

let account = await AccountModel.update({
    name: 'Acme',               //  OK
    unknown: 42,                //  Error
})

account.name = 'Coyote'         //  OK
account.unknown = 42            //  Error
```
