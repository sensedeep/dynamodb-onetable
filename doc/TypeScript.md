# DynamoDB OneTable with TypeScript

OneTable provides TypeScript type declaration files so that OneTable APIs can be fully type checked.

OneTable also creates full type declarations for your table entities and attributes. Thereafter, TypeScript will catch any invalid entity or entity attribute references.

Using TypeScript dynamic, generic types, OneTable automatically converts your OneTable schema into fully typed generic Model APIs.

For example:

```
const schema = {
    models: {
        Account: {
            pk:             { type: String, value: 'account:${name}' },
            name:           { type: String },
        }
    }
}

//  Fully typed Account object based on the schema
type Account = Entity<typeof schema.models.Account>

let account: Account = {
    name: 'Coyote',        //  OK
    unknown: 42,           //  Error
}

//  Create a model to get/find/update...

let AccountModel = new Model<Account>(table, 'Account', {
    fields: {
        pk:    { type: String, value: 'account:${name}' },
        name:  { type: String },
    }
})

let account = await AccountModel.update({
    name: 'Acme',               //  OK
    unknown: 42,                //  Error
})

account.name = 'Coyote'         //  OK
account.unknown = 42            //  Error
```


Another example:

```
let BlogSchema = {
    pk:        { type: String, value: 'blog:${email}' },
    sk:        { type: String, value: 'blog:' },

    email:     { type: String, required: true },
    message:   { type: String, required: true },
    date:      { type: Date, required: true },
}

//  Create a type based on the schema
type Blog = Entity<typeof BlogSchema>

//  Add the schema to the table
table.addModel('Blog', BlogSchema)

//  Get a typed model for access to the database.
let BlogModel: Model<Blog> = table.getModel('Blog')

//  Interact with type checking
let blog = await BlogModel.get({
    email: 'roadrunner@acme.com',   //  Ok
    unknown: 42,                    //  Fails
})
blog.email = 'coyote@acme.com'      //  Ok
blog.unknown: 42,                   //  Fails
```
