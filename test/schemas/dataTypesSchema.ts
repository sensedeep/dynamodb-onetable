/*
    Schema to test various data types
 */
export default {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
    },
    models: {
        Item: {
            pk: {type: String, value: '${_type}#${id}'},
            sk: {type: String, value: '${_type}#'},
            id: {type: String, generate: 'ulid'},

            stringSet: {type: Set},
            numberSet: {type: Set},
            binarySet: {type: Set},
        },
    },
    params: {},
}
