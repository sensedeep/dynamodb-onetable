/*
    model-schema-typescript.ts - Create an inline model using typescript
 */
import {AWS, Client, Entity, Model, Table, dump, print} from './utils/init'

const table = new Table({
    name: 'InlineModelTypeScriptTestTable',
    client: Client,
    schema: {
        indexes: {primary: {hash: 'pk'}},
        models: {},
    }
})

test('Create table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

let CardSchema = null
let Card = null

test('Create model', async () => {
    CardSchema = {
        pk:     { type: String, value: 'card:${id}' },
        id:     { type: Number },
        issuer: { type: String },
    }
    type CardType = Entity<typeof CardSchema>
    Card = new Model<CardType>(table, 'Card', {
        fields: CardSchema,
        indexes: {primary: {hash: 'pk'}},
    })
})

test('Create item', async () => {
    let card = await Card.create({id: 42, issuer: 'visa'}, {hidden: true})
    expect(card.issuer).toBe('visa')
    expect(card.pk).toBe('card:42')
})

test('Destroy table', async() => {
    await table.deleteTable('DeleteTableForever')
})
