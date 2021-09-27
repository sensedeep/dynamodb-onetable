/*
    Schema with a nested schema
 */
export default {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        User: {
            pk:          { type: String, value: '${_type}#${id}' },
            sk:          { type: String, value: '${_type}#' },
            id:          { type: String, uuid: true },
            accountId:   { type: String },
            name:        { type: String },
            email:       { type: String },
            status:      { type: String },
            balance:     { type: Number },
            tokens:      { type: Array },

            location:    { type: Object, schema: {
                address: { type: String },
                city:    { type: String },
                zip:     { type: String },
            }}
        }
    }
}
