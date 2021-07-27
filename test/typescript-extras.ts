/*
    typescript-extras.ts -
 */
import {AWS, Client, Entity, Match, Table, print, dump, delay} from './utils/init'
import {TenantSchema} from './schemas'

//  Test these are exported from index

import { AnyEntity, AnyModel, Model, OneParams, OneProperties, OneModelSchema, OneSchema, Paged} from '../src/index.js'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'TypescriptExtrasTestTable',
    client: Client,
    schema: TenantSchema,
    uuid: 'ulid',
})

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
