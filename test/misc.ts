/*
    misc.ts - Miscellaneous tests
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'
import Dynamo from '../src/Dynamo.js'

const table = new Table({
    name: 'MiscTestTable',
    client: Client,
    partial: false,
    schema: DefaultSchema,
    logger: true,
})

test('Dynamo empty constructor', async () => {
    let dynamo = new Dynamo()
    expect(dynamo).toBeDefined()
})
