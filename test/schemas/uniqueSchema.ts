/*
    Unique schema with unique properties
 */
export default {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#${name}'},
            sk: {type: String, value: '${_type}#'},
            name: {type: String},
            email: {type: String, unique: true, required: true},
            phone: {type: String, unique: true},
            age: {type: Number},
            interpolated: {type: String, value: '${name}#${email}', unique: true},
        },
    } as const,
    params: {},
} as const
