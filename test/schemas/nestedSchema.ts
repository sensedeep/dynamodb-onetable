/*
    Default schema with a test User entity
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

            //  test value templates with references at top level and other levels
            //  packing of these attributes (scatter gather)
            // location:    { type: Object },
            location:    { type: Object, schema: {
                address: { type: String },
                city:    { type: String },
                zip:     { type: String },
                status:  { type: String },
            }}
        }
    }
}
