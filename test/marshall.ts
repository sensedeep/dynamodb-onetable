/*
    marshall.ts - Test marshalling data types
 */

// jest.setTimeout(7200 * 1000)

import {AWS, Client, Table, print, dump, delay, Model, isV2} from './utils/init'

const table = new Table({
    name: 'MarshallTestTable',
    client: Client,
    partial: false,
    schema: {
        format: 'onetable:1.1.0',
        version: '0.0.1',
        indexes: {
            primary: {hash: 'pk', sort: 'sk'},
        },
        models: {
            User: {
                pk: {type: String, value: '${_type}#${id}'},
                sk: {type: String, value: '${_type}#'},
                name: {type: String},
                registered: {type: Date},
                profile: {
                    type: Object,
                    schema: {
                        dob: {type: Date},
                    },
                },
            },
        },
        params: {
            isoDates: true,
            timestamps: true,
        },
    },
})

const User = table.getModel('User')
const jsonV3 = {
    name: {S: 'alice'},
    registered: {S: '2022-01-01Z'},
    profile: {
        M: {
            dob: {S: '2000-01-01Z'},
        },
    },
} as const

const jsonV2 = {
    name: 'alice',
    registered: '2022-01-01Z',
    profile: {
        dob: '2000-01-01Z',
    },
} as const

const unmarshallModel = <T>(model: Model<T>, item: any): T => {
    const json = (table as any).unmarshall(item, {})
    const obj = (model as any).transformReadItem('get', json, {}, {})
    return obj
}

test('Unmarshall model', async () => {
    let json = isV2() ? jsonV2 : jsonV3
    const obj = unmarshallModel(User, json)
    expect(obj).toEqual(
        expect.objectContaining({
            name: 'alice',
            registered: new Date('2022-01-01Z'),
        })
    )
})

test('Unmarshall nested model', async () => {
    let json = isV2() ? jsonV2 : jsonV3
    const obj = unmarshallModel(User, json)
    expect(obj).toEqual(
        expect.objectContaining({
            name: 'alice',
            registered: new Date('2022-01-01Z'),
            profile: {
                dob: new Date('2000-01-01Z'),
            },
        })
    )
})

/*
test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
}) */
