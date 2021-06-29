/*
    Per-tenant schema
 */
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
        //  MOB - try project keys
        gs1:     { hash: 'gs1pk', sort: 'gs1sk', project: 'all' },
    },
    models: {
        User: {
            pk:         { type: String, value: 'account#${accountId}' },
            sk:         { type: String, value: 'user#${id}' },
            accountId:  { type: String, required: true },
            id:         { type: String, uuid: true },
            name:       { type: String, required: true },
            email:      { type: String, required: true },

            gs1pk:      { type: String, value: 'user#${email}' },
            gs1sk:      { type: String, value: 'user#${accountId}' },
        }
    }
}
