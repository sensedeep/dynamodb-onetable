/*
    debug.ts - Just for debug
 */
import {AWS, Client, Entity, Model, Table, dump, print} from './utils/init'

jest.setTimeout(7200 * 1000)

test('Debug', async () => {

    const table = new Table({
        name: 'TypeScriptDebugTestTable',
        client: Client,
        schema: {
            indexes: {primary: {hash: 'pk'}},
            models: {},
        }
    })
    await table.createTable()

    const CardSchema = {
        pk:     { type: String, value: 'card:${id}' },
        id:     { type: Number },
        issuer: { type: String },
    }
    type CardType = Entity<typeof CardSchema>

    let Card = new Model<CardType>(table, 'Card', { fields: CardSchema })

    let card = await Card.create({id: 4567, issuer: 'visa'}, {hidden: true})

    await table.deleteTable('DeleteTableForever')
})
