/*
    pagination.ts - Test find with pagination
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {PagedSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const MaxUsers = 250
const PerPage = 50

const table = new Table({
    name: 'PaginationTestTable',
    client: Client,
    schema: PagedSchema,
})
let user: any
let users: any[]

test('Create Table', async() => {
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

test('Create Users', async() => {
    for (let i = 0; i < MaxUsers; i++) {
        await User.create({name: `user-${zpad(i, 6)}`})
    }
    users = await table.scan('User')
    expect(users.length).toBe(MaxUsers)
})

//  DEPRECATED - use start instead
test('Find with next iterator', async() => {
    let pages = 0
    let items = await User.find({}, {limit: PerPage})
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
})

test('Find with start offset', async() => {
    let pages = 0, total = 0, start
    let items: any
    do {
        items = await User.find({}, {limit: PerPage, start})
        if (items.length) {
            expect(items[0].name).toBe(`user-${zpad(total, 6)}`)
            total += items.length
            pages++
        }
        start = items.start
    } while (start)

    expect(total).toBe(MaxUsers)
    expect(pages).toBe(MaxUsers / PerPage)
})

test('Reverse scan', async() => {
    let pages = 0, total = 0, start
    let items: any
    do {
        items = await User.find({}, {limit: PerPage, start, reverse: true})
        if (items.length) {
            expect(items[0].name).toBe(`user-${zpad(MaxUsers - total - 1, 6)}`)
            total += items.length
            pages++
        }
        start = items.start
    } while (start)

    expect(total).toBe(MaxUsers)
    expect(pages).toBe(MaxUsers / PerPage)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
