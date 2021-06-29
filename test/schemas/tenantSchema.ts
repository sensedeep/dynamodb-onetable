/*
    Per-tenant schema
 */
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        User: {
            pk:         { type: String, value: 'account#${accountId}' },
            sk:         { type: String, value: 'user#${id}' },
            accountId:  { type: String, required: true },
            id:         { type: String, uuid: true },
            name:       { type: String, required: true },
            email:      { type: String, required: true },
        }
    }
}
