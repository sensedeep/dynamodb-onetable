/*
    Default schema with a test User entity
 */
export default {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        ls1: {type: 'local', sort: 'ls1sk'},
        ls2: {type: 'local', sort: 'ls2sk'},
    },
    models: {
        User: {
            //  Yes, this is a bad PK and puts all users in the same partition
            pk: {type: String, value: '${_type}#'},
            sk: {type: String, value: '${_type}#${id}'},
            id: {type: String, generate: 'ulid'},
            name: {type: String},
            email: {type: String},

            ls1sk: {type: String, value: '${_type}#${name}'},
            ls2sk: {type: String, value: '${_type}#${_type}'},
        },
    },
    params: {},
}
