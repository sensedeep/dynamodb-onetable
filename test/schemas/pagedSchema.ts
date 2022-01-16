/*
    Per-tenant schema
 */
export default {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        User: {
            pk:         { type: String, value: '${_type}#' },
            sk:         { type: String, value: '${_type}#${name}' },
            id:         { type: String, generate: 'ulid' },
            name:       { type: String, required: true },
        }
    }
}
