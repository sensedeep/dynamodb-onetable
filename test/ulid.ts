/*
    ulid.ts - Unit test for ULIDk/
 */
import {Match} from './utils/init'
import ULID from '../src/ulid'

jest.setTimeout(7200 * 1000)

test('Create ULID', async() => {
    let ulid = new ULID()
    expect(ulid.toString()).toMatch(Match.ulid)
    expect(ulid.when).toEqual(expect.any(Date))
})

test('ULID toString()', async() => {
    let ulid = new ULID()
    expect(ulid.toString()).toMatch(Match.ulid)
})

test('ULID decode', async() => {
    let u = new ULID()
    let ulid = new ULID()
    let decoded = ulid.decode(u.toString())
    expect(decoded).toEqual(expect.any(Number))
})
