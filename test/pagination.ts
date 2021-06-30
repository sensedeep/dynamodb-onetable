/*
    pagination.ts - Test find with pagination
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {TenantSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const MaxUsers = 500
const PerPage = 50

const table = new Table({
    name: 'PaginationTestTable',
    client: Client,
    schema: TenantSchema,
})
let user: any
let users: any[]
const accountId = table.uuid()

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User = table.getModel('User')

test('Create Users', async() => {
    for (let i = 0; i < MaxUsers; i++) {
        await User.create({accountId, name: `User-${i}`, email: `u-${i}@example.com`})
    }
    users = await table.scan('User')
    expect(users.length).toBe(MaxUsers)
})

test('Find with next iterator', async() => {
    let metrics: any = {}

    let pages = 0
    let items = await User.find({accountId}, {limit: PerPage})
    expect(items.length).toBe(PerPage)
    pages++

    while (items.length) {
        if (items.next) {
            items = await items.next()
            if (items.length) {
                expect(items.length).toBe(PerPage)
                pages++
            }
        } else {
            break
        }
    }
    expect(pages).toBe(MaxUsers / PerPage)
    //params.maxPages`
})

test('Find with start offset', async() => {
    let pages = 0, total = 0, start
    let items: any
    do {
        items = await User.find({accountId}, {limit: PerPage, start})
        if (items.length) {
            total += items.length
            pages++
        }
        start = items.start
    } while (start)

    expect(total).toBe(MaxUsers)
    expect(pages).toBe(MaxUsers / PerPage)
})
//params.maxPages`

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
