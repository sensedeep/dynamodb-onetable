/*
    Debug schema for debug.ts
 */
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        User: {
            pk:          { type: String, value: 'user#${id}' },
            sk:          { type: String, value: 'user#' },

            id:          { type: String, uuid: true },
            name:        { type: String },

            location:    { type: Object, schema: {
                address: { type: String },
                city:    { type: String },
                zip:     { type: String },
                status:  { type: String },
            }}
        }
    }
}
