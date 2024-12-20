/*
    crypto.ts - CRUD with crypto
 */
import {AWS, Client, Match, Table, print, dump, delay, isV3, isV2} from './utils/init'
import {CustomGenerateSchema} from './schemas'

const table = new Table({
    name: 'CustomGenerateTestTable',
    client: Client,
    partial: false,
    schema: CustomGenerateSchema,
    logger: true,
})

let User: any = null
let user: any
let users: any[]

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Create', async () => {
    user = await User.create({name: 'Peter Smith'})
    expect(user).toMatchObject({
        name: 'Peter Smith',
    })
})

test('Get', async () => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject({
        name: 'Peter Smith',
    })
    console.log(user)
    expect(user.id).toMatch(Match.customUuid)
})

test('Get raw ', async () => {
    user = await User.get({id: user.id}, {hidden: true, parse: false})
    if (isV3()) {
        expect(user.pk.S).toMatch(/^User#/)
    }
    if (isV2()) {
        expect(user.pk).toMatch(/^User#/)
    }
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
