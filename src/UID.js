/*
    UID - Unique Crypto-grade ID of a given length.

    If >= 10 in length, suitably unique for most use-cases.
    Converted to use safe letters -- base 32 excluding I, L, O and U.
    Note: Not a ULID and not sortable.
*/

import Crypto from 'crypto'

//  Repeat Z to make encoding faster for rand == 0xFF
const Letters = '0123456789ABCDEFGHJKMNPQRSTVWXYZZ'
const LettersLen = Letters.length - 1

export default function UID(size) {
    let bytes = []
    let buffer = Crypto.randomBytes(size)
    for (let i = 0; i < size; i++) {
        //  Letters is one longer than LettersLen
        bytes[i] = Letters[Math.floor((buffer.readUInt8(i) / 0xff) * LettersLen)]
    }
    return bytes.join('')
}
