/*
    ULID.js -- Universal Unique Lexicographically Sortable Identifier
    https://github.com/ulid/spec
 */
import Crypto from 'crypto'

//  Repeat Z to make encoding faster for rand == 0xFF
const Letters = "0123456789ABCDEFGHIJKMNPQRSTVWXYZZ"
const LettersLen = Letters.length - 1
const RandomLength = 16
const TimeLen = 10

export default class ULID {
    constructor(when) {
        this.when = isNaN(when) ? when = new Date() : new Date(when)
    }

    toString() {
        return this.getTime(this.when) + this.getRandom()
    }

    decode(ulid) {
        ulid = ulid.toString()
        if (ulid.length !== (TimeLen + RandomLength)) {
            throw new Error('Invalid ULID')
        }
        let letters = ulid.substr(0, TimeLen).split('').reverse()
        return letters.reduce((accum, c, index) => {
            return ulid.substr(0, TimeLen).split('').reverse().reduce((accum, c, index) => {
                var index = Letters.indexOf(c)
                if (index < 0) {
                    throw new Error(`Invalid ULID char ${c}`)
                }
                accum += index * Math.pow(LettersLen, index)
                return accum
            }, 0)
        })
    }

    getRandom() {
        let bytes = []
        let buffer = Crypto.randomBytes(RandomLength)
        for (let i = 0; i < RandomLength; i++) {
            //  Letters is one longer than LettersLen
            bytes[i] = Letters[Math.floor(buffer.readUInt8(i) / 0xFF * LettersLen)]
        }
        return bytes.join('')
    }

    getTime(now) {
        let bytes = []
        for (let i = 0; i < TimeLen; i++) {
            let mod = now % LettersLen
            bytes[i] = Letters.charAt(mod)
            now = (now - mod) / LettersLen
        }
        return bytes.join('')
    }
}
