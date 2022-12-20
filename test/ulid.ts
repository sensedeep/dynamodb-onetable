/*
    ulid.ts - Unit test for ULID
 */
import {Match, delay} from './utils/init'
import ULID from '../src/ULID'

// jest.setTimeout(7200 * 1000)

test('Create ULID', async () => {
    let ulid = new ULID()
    expect(ulid.toString()).toMatch(Match.ulid)
    expect(ulid.when).toEqual(expect.any(Date))
})

test('ULID toString()', async () => {
    expect(new ULID().toString()).toMatch(Match.ulid)
})

test('ULID decode', async () => {
    let id = new ULID().toString()
    let decoded = new ULID().decode(id)
    expect(decoded).toEqual(expect.any(Number))
})

test('ULID bad decodes', async () => {
    await expect(async () => {
        let decoded = new ULID().decode('')
    }).rejects.toThrow()

    await expect(async () => {
        let id = new ULID().toString()
        let decoded = new ULID().decode('!' + id.slice(1))
    }).rejects.toThrow()
})

test('ULID with date', async () => {
    let ulid = new ULID(new Date(0))
    expect(ulid.toString()).toMatch(Match.ulid)
    expect(ulid.when).toEqual(expect.any(Date))
})

test('ULID repeat', async () => {
    for (let i = 0; i < 100; i++) {
        let id: any = new ULID().toString()
        expect(id.length).toBe(26)
    }
})

test('Sequence of timestamps', async () => {
    const limit = 100
    let output = [] as any
    for (let i = 0; i < limit; i++) {
        let ulid = new ULID()
        const id = ulid.toString()
        await delay(1)
        output.push(id)
    }
    let sorted = output.sort()
    for (let i = 0; i < limit; i++) {
        expect(output[i]).toBe(sorted[i])
    }
})
