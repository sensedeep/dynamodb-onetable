/*
    Fully speced schema
 */
    export default {
        indexes: {
            primary: { hash: 'pk', sort: 'sk' },
            // gs1: { hash: 'gs1pk', sort: 'gs1sk', project: ['gs1pk', 'gs1sk', 'name']}
            gs1: { hash: 'gs1pk', sort: 'gs1sk', project: 'keys' }
        },
        models: {
            User: {
                pk:          { type: String, value: 'user#${id}' },
                sk:          { type: String, value: 'user#' },
                id:          { type: String, uuid: true },
                name:        { type: String },
                email:       { type: String },
                active:      { type: Boolean },

                gs1pk:       { type: String, value: 'user#${name}' },
                gs1sk:       { type: String, value: 'user#' },
            }
        }
    }
