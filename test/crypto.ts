/*
    crypto.ts - CRUD with crypto
 */
import {AWS, Client, Match, Table, print, dump, delay, isV3, isV2} from './utils/init'
import {CryptoSchema} from './schemas'

const Crypto = {
    primary: {
        cipher: 'aes-256-gcm',
        password: '1f2e2-d27f9-aa3a2-3f7bc-3a716-fc73e',
    },
}

const table = new Table({
    name: 'CryptoTestTable',
    client: Client,
    crypto: Crypto,
    partial: false,
    schema: CryptoSchema,
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
    user = await User.create({name: 'Peter Smith', email: 'peter@example.com'})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        email: 'peter@example.com',
    })
})

test('Get', async () => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        email: 'peter@example.com',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Get raw ', async () => {
    user = await User.get({id: user.id}, {hidden: true, parse: false})
    if (isV3()) {
        expect(user.pk.S).toMatch(/^User#/)
        expect(user.email.S).toBeDefined()
        expect(user.email.S).not.toMatch('peter@example.com')
        expect(user.email.S).toMatch(/^primary/)
    }
    if (isV2()) {
        expect(user.pk).toMatch(/^User#/)
        expect(user.email).toBeDefined()
        expect(user.email).not.toMatch('peter@example.com')
        expect(user.email).toMatch(/^primary/)
    }
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
