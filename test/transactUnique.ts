/*
    Transactions with unique properties
 */

import {Client, Table, print, dump, delay} from './utils/init'

// jest.setTimeout(7200 * 1000)

const Schema = {
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', project: 'all'},
    },
    params: {
        createdField: 'createdAt',
        updatedField: 'updatedAt',
        isoDates: true,
        timestamps: true,
    },
    models: {
        User: {
            pk: { type: String, value: '${_type}#${id}' },
            sk: { type: String, value: '${_type}#' },
            id: { type: String, generate: 'ulid' },
            email: { type: String, required: true, unique: true },
            balance: { type: Number, default: 0},
        }
    } as const,
}

const table = new Table({
    name: 'TransactUniqueTest',
    client: Client,
    partial: true,
    schema: Schema,
})
const User = table.getModel('User')
let user: any
let u2: any
let users: any[]

test('Create', async () => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

test('Transaction create', async () => {
    let transaction = {}
    user = await table.create('User', {email: 'Peter Smith'}, {transaction, hidden: true})
    expect(user.pk).toBeDefined()
    expect(user.id).toBeDefined()
    await table.transact('write', transaction)
})

test('Transaction get', async () => {
    let transaction = {}
    user = await table.get('User', {id: user.id}, {transaction})
    let items: any = await table.transact('get', transaction, {parse: true, hidden: false})
    expect(items.length).toBe(1)
})

test('Transaction update', async () => {
    let transaction = {}
    await table.update('User', {id: user.id, email: 'Peter Smith', balance: 2}, {transaction})
    await table.transact('write', transaction, {parse: true, hidden: false})
    user = await table.get('User', {id: user.id})
    expect(user.email).toBe('Peter Smith')
    expect(user.balance).toBe(2)

    //  Change unique fields
    transaction = {}
    await table.update('User', {id: user.id, email: 'John Smith', balance: 3}, {transaction})
    await table.transact('write', transaction, {parse: true, hidden: false})
    user = await table.get('User', {id: user.id})
    expect(user.email).toBe('John Smith')
    expect(user.balance).toBe(3)
})

test('Destroy', async () => {
    await table.deleteTable('DeleteTableForever')
})
