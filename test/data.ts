/*
    data.ts - Test various data types
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DataTypesSchema} from './schemas'

//  V2
import DynamoDB from 'aws-sdk/clients/dynamodb'

// jest.setTimeout(7200 * 1000)

const PORT = parseInt(process?.env?.DYNAMODB_PORT || '4567')

const v2Client = new DynamoDB.DocumentClient({
    endpoint: `http://localhost:${PORT}`,
    region: 'local',
    credentials: new AWS.Credentials({
        accessKeyId: 'test',
        secretAccessKey: 'test',
    }),
})

const table = new Table({
    name: 'DataTestTable',
    client: v2Client,
    // client: Client,
    partial: false,
    schema: DataTypesSchema,
    logger: true,
})

let Item
let item: any

test('Create Table', async () => {
    await table.createTable()
    expect(await table.exists()).toBe(true)
    Item = table.getModel('Item')
})

test('Test Set Create', async () => {
    let properties = {
        stringSet: new Set(['one', 'two', 'three']),
        numberSet: new Set([1, 2, 3]),
        binarySet: new Set([Buffer.from('one'), Buffer.from('two'), Buffer.from('three')]),
    }
    item = await Item.create(properties)

    item = await Item.get({id: item.id})
    let ss = item.stringSet
    expect(ss.toString()).toBe('[object Set]')
    expect(Array.from(ss).sort()).toMatchObject(['one', 'three', 'two'])
    expect(ss.has('one')).toBe(true)
    expect(ss.has(1)).toBe(false)
    expect(ss.has('99')).toBe(false)

    let ns = item.numberSet
    expect(ns.toString()).toBe('[object Set]')
    expect(Array.from(ns)).toMatchObject([1, 2, 3])
    expect(ns.has(1)).toBe(true)
    expect(ns.has('1')).toBe(false)
    expect(ns.has('99')).toBe(false)

    let bs = item.binarySet
    expect(bs.toString()).toBe('[object Set]')
    for (let v of bs.values()) {
        v = String.fromCharCode.apply(null, v)
        expect(['one', 'two', 'three'].indexOf(v) >= 0).toBe(true)
    }
})

test('Test Set Update', async () => {
    item = await Item.update(
        {id: item.id},
        {
            add: {
                stringSet: new Set(['four']),
                numberSet: new Set([4, 4, 4]),
            },
        }
    )
    let ss = item.stringSet
    expect(ss.toString()).toBe('[object Set]')
    expect(Array.from(ss).sort()).toMatchObject(['four', 'one', 'three', 'two'])
    expect(ss.has('one')).toBe(true)
    expect(ss.has('four')).toBe(true)
    expect(ss.has(1)).toBe(false)

    let ns = item.numberSet
    expect(ns.toString()).toBe('[object Set]')
    expect(Array.from(ns).sort()).toMatchObject([1, 2, 3, 4])
    expect(ns.has(1)).toBe(true)
    expect(ns.has(4)).toBe(true)
    expect(ns.has(5)).toBe(false)

    item = await Item.update(
        {id: item.id},
        {
            delete: {
                stringSet: new Set(['one']),
                numberSet: new Set([1, 99]),
            },
        }
    )
    ss = item.stringSet
    ns = item.numberSet
    expect(Array.from(ss)).toMatchObject(['four', 'three', 'two'])
    expect(Array.from(ns)).toMatchObject([2, 3, 4])
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
