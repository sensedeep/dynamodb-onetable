/*
    Per-tenant schema
 */
export default {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk'},
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#'},
            sk: {type: String, value: '${_type}#${name}'},
            id: {type: String, generate: 'ulid'},

            name: {type: String, required: true},
            email: {type: String, required: true},

            gs1pk: {type: String, value: '${_type}#'},
            gs1sk: {type: String, value: '${_type}#${email}'},
        },
    },
}
