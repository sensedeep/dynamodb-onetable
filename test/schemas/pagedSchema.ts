/*
    Per-tenant schema
 */
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        User: {
            pk:         { type: String, value: 'user#' },
            sk:         { type: String, value: 'user#${name}' },
            id:         { type: String, uuid: true },
            name:       { type: String, required: true },
        }
    }
}
