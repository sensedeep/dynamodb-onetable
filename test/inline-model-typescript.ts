/*
    model-schema-typescript.ts - Create an inline model using typescript

    NOTE: this pattern is DEPRECATED and may be removed in the future.

    WARNING: this is NOT a recommended pattern. A better approach is to define a literal schema and provide it to the
    Table constructor. A centralized, declarative schema stored in-table is the preferred pattern so that that table
    can be self-describing for tooling.
 */
import {AWS, Client, Entity, Model, Table, dump, print} from './utils/init'

// send any schema because it gets modified
const table = new Table<any>({
    name: 'InlineModelTypeScriptTestTable',
    client: Client,
    partial: false,
    schema: {
        version: '0.0.1',
        indexes: {primary: {hash: 'pk'}},
        models: {},
    },
})

const CardSchema = {
    pk: {type: 'string', value: 'card:${id}'},
    id: {type: 'number'},
    issuer: {type: 'string'},
} as const

type CardType = Entity<typeof CardSchema>
let Card: Model<Entity<typeof CardSchema>>

test('Create table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

test('Create model', async () => {
    let base = table.listModels()
    /*
        This model is free-standing not added to the list of table models.
        NOTE: this pattern is DEPRECATED and may be removed in the future.

        WARNING: this is NOT a recommended pattern. A better approach is to define a literal schema and provide it to the
        Table constructor. A centralized, declarative schema stored in-table is the preferred pattern so that that table
        can be self-describing for tooling.
    */
    Card = new Model<CardType>(table, 'Card', {
        fields: CardSchema,
    })
    let models = table.listModels()
    expect(models.length - base.length).toBe(0)
})

test('Create item', async () => {
    let card = await Card.create({id: 42, issuer: 'visa'}, {hidden: true})
    expect(card.issuer).toBe('visa')
    expect(card.pk).toBe('card:42')
})

test('Add model', async () => {
    let base = table.listModels()
    table.addModel('Card', CardSchema)

    let models = table.listModels()
    expect(models.length - base.length).toBe(1)
    expect(models[models.length - 1]).toBe('Card')

    let Card = table.getModel('Card')
    expect(Card).toBeDefined()
    let card = await Card.create({id: 99, issuer: 'amex'})
    expect(card.issuer).toBe('amex')
})

test('Remove model', async () => {
    let base = table.listModels()

    table.removeModel('Card')
    let models = table.listModels()
    expect(base.length - models.length).toBe(1)

    await expect(async () => {
        table.removeModel('Unknown')
    }).rejects.toThrow()
})

test('Destroy table', async () => {
    await table.deleteTable('DeleteTableForever')
})
