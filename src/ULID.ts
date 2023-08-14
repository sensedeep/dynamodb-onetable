/*
    ULID.js -- Universal Unique Lexicographically Sortable Identifier
    https://github.com/ulid/spec
 */
import Crypto from 'crypto'

//  Crockford's base 32 excluding I, L, O and U
//  Repeat Z to make encoding faster for rand == 0xFF
const Letters = '0123456789ABCDEFGHJKMNPQRSTVWXYZZ'

const LettersLen = Letters.length - 1
const RandomLength = 16
const TimeLen = 10

export default class ULID {
    when:Date
    constructor(when?: string | number | Date) {
        if (when instanceof Date) {
            this.when = new Date(when)
        } else if (typeof when == 'string' || typeof when == 'number') {
            this.when = new Date(when)
        } else {
            this.when = new Date()
        }
    }

    toString(): string {
        return this.getTime(this.when) + this.getRandom(RandomLength)
    }

    //  Decode the time portion of the ULID and return a number
    decode(ulid: string | ULID): number {
        ulid = ulid.toString()
        if (ulid.length !== TimeLen + RandomLength) {
            throw new Error('Invalid ULID')
        }
        const letters = ulid.substr(0, TimeLen).split('').reverse()
        return letters.reduce((accum, c, index) => {
            const i = Letters.indexOf(c)
            if (i < 0) {
                throw new Error(`Invalid ULID char ${c}`)
            }
            accum += index * Math.pow(LettersLen, i)
            return accum
        }, 0)
    }

    getRandom(size: number): string {
        const bytes = []
        const buffer = Crypto.randomBytes(size)
        for (let i = 0; i < size; i++) {
            //  Letters is one longer than LettersLen
            bytes[i] = Letters[Math.floor((buffer.readUInt8(i) / 0xff) * LettersLen)]
        }
        return bytes.join('')
    }

    getTime(now: Date): string {
        let time = now.getTime()
        const bytes = []
        for (let i = 0; i < TimeLen; i++) {
            const mod = time % LettersLen
            bytes[i] = Letters.charAt(mod)
            time = (time - mod) / LettersLen
        }
        return bytes.reverse().join('')
    }
}
