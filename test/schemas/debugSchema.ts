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
                pk:          { type: String, value: '${_type}#' },
                sk:          { type: String, value: '${_type}#${id}' },
                id:          { type: String, uuid: true },
                name:        { type: String },
                email:       { type: String },
                active:      { type: Boolean },
                counter:     { type: Number, default: 0 },

                gs1pk:       { type: String, value: '${_type}#${name}' },
                gs1sk:       { type: String, value: '${_type}#' },
            }
        }
    }
