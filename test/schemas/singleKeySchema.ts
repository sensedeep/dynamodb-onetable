/*
    Schema with a single primary key
 */
export default {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pkey' },
    },
    models: {
        User: {
            pk:         { type: String, value: '${_type}#${id}', map: 'pkey' },
            id:         { type: String, uuid: true },
            name:       { type: String },
            email:      { type: String },
            status:     { type: String, default: 'idle' },
        }
    }
}
