/*
    pagination-without-sort-key.ts - Test pagination without a primary sort key
 */
import {AWS, Client, Entity, Match, Table, print, dump, delay} from '../utils/init'

// jest.setTimeout(7200 * 1000)

const MaxUsers = 250
const PerPage = 50

const Schema = {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk'},
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#'},
            sk: {type: String, value: '${_type}#${name}'},
            id: {type: String, generate: 'ulid'},

            name: {type: String, required: true},
            email: {type: String, required: true},

            gs1pk: {type: String, value: '${_type}#'},
            gs1sk: {type: String, value: '${_type}#${email}'},
        },
    },
}

const table = new Table({
    name: 'PaginationWithoutSortKeyTestTable',
    client: Client,
    partial: false,
    schema: Schema,
})

type UserEntity = Entity<typeof Schema.models.User>

let user: UserEntity
let users: UserEntity[]

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User = table.getModel('User')

function zpad(n: number, size: number): string {
    let s = n + ''
    while (s.length < size) s = '0' + s
    return s
}

test('Create Users', async () => {
    for (let i = 0; i < MaxUsers; i++) {
        await User.create({name: `user-${zpad(i, 6)}`, email: `email-${zpad(i, 6)}@example.com`})
    }
    users = await table.scan('User')
    expect(users.length).toBe(MaxUsers)
})

test('Find with next offset', async () => {
    let pages = 0,
        total = 0,
        next
    let items: any
    do {
        items = await User.find({}, {limit: PerPage, next, index: 'gs1'})
        // items = await User.find({}, {limit: PerPage, next})
        if (items.length) {
            expect(items[0].name).toBe(`user-${zpad(total, 6)}`)
            expect(items[0].email).toBe(`email-${zpad(total, 6)}@example.com`)
            total += items.length
            pages++
        }
        next = items.next
    } while (next)

    expect(total).toBe(MaxUsers)
    expect(pages).toBe(MaxUsers / PerPage)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
