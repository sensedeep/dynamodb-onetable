/*
    debug.ts -
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'DebugTestTable',
    client: Client,
    /*
    logger: (type, message, context) => {
        console.log(`${new Date().toLocaleString()}: ${type}: ${message}`);
        console.log(JSON.stringify(context, null, 4) + '\n');
    }, */
    schema: {
        indexes: {
            primary: { hash: 'pk', sort: 'sk' },
            gsi1: { hash: 'gsi1pk', sort: 'gsi1sk', project: 'all', follow: true },
            gsi2: { hash: 'gsi2pk', sort: 'gsi2sk', follow: true },
            gsi3: { hash: 'gsi3pk', sort: 'gsi3sk', follow: true },
        },
        models: {
            Mailbox: {
                pk: { type: String, value: 'mail#${id}' },
                sk: { type: String, value: 'mail#${id}' },
                read: { type: Boolean },
                subject: { type: String },
                desc: { type: String },
                body: { type: String },
                userId: { type: String, required: true },
                id: { type: String, required: true, uuid: 'ulid' },
                gsi1pk: {
                    type: String,
                    value: 'user#${userId}',
                },
                gsi1sk: {
                    type: String,
                    value: 'mail#${id}',
                },
                gsi2pk: {
                    type: String,
                    value: 'user#${userId}#unread',
                },
                gsi2sk: {
                    type: String,
                    value: 'mail#${id}',
                },
                _type: { type: String, filter: false, value: 'Mailbox' },
            },
        },
    }
})

let Mailbox = null
let mailbox: any
let mailboxes: any[]

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    Mailbox = table.getModel('Mailbox')
})

test('Test', async() => {
    mailbox = await Mailbox.create({userId: '44'})
    mailbox = await Mailbox.get({id: mailbox.id})
    await Mailbox.remove({
        userId: '44',
        id: mailbox.id
    }, { index: 'gsi1' })
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
