
import Crypto from 'crypto'

/*
    Generates a simple uuidv7-like String. 
    Note: This method is simplified for testing only!
*/
function customId() {
    const randomBytes = Crypto.randomBytes(10);

    randomBytes[2] = randomBytes[2] & 0x3f | 0x80;

    const result =  Date.now().toString(16).padStart(12, "0") 
        + "7"
        + randomBytes.toString("hex").substring(1)
    
    return [
        result.substring(0, 8),
        result.substring(8, 12),
        result.substring(12, 16),
        result.substring(16, 20),
        result.substring(20)
    ].join("-")
}

/*
    Schema to use with custom generate function
 */
export default {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#${id}'},
            sk: {type: String, value: '${_type}#'},
            id: {type: String, generate: customId},
            name: {type: String},
        },
    },
    params: {},
}
