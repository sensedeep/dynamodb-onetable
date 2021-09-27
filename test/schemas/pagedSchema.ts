/*
    Per-tenant schema
 */
export default {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        User: {
            pk:         { type: String, value: '${_type}#' },
            sk:         { type: String, value: '${_type}#${name}' },
            id:         { type: String, uuid: true },
            name:       { type: String, required: true },
        }
    }
}
