/*
    ulid.ts - Unit test for ULIDk/
 */
import {Match} from './utils/init'
import ULID from '../src/ulid'

// jest.setTimeout(7200 * 1000)

test('Create ULID', async() => {
    let ulid = new ULID()
    expect(ulid.toString()).toMatch(Match.ulid)
    expect(ulid.when).toEqual(expect.any(Date))
})

test('ULID toString()', async() => {
    expect(new ULID().toString()).toMatch(Match.ulid)
})

test('ULID decode', async() => {
    let id = new ULID().toString()
    let decoded = new ULID().decode(id)
    expect(decoded).toEqual(expect.any(Number))
})

test('ULID repeat', async() => {
    for (let i = 0; i < 100; i++) {
        let id: any = new ULID().toString()
        expect(id.length).toBe(26)
    }
})