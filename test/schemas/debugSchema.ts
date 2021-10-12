/*
    Fully speced schema
 */
export default {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
        // gs1: { hash: 'gs1pk', sort: 'gs1sk', project: ['gs1pk', 'gs1sk', 'name']}
        gs1: { hash: 'gs1pk', sort: 'gs1sk', project: 'keys' }
    },
    models: {
        User: {
            pk:          { type: String, value: '${_type}#${data.id}' },
            sk:          { type: String, value: '${_type}#${email}' },
            id:          { type: String, uuid: true },
            name:        { type: String },
            email:       { type: String },
            active:      { type: Boolean },
            counter:     { type: Number, default: 0 },
            data:        { type: Object, default: {}, schema: {
                           id:  { type: String }
                         }
            },
            slides:      { type: Object },
            _slides:      { type: Object, schema: {
                            id:         { type: String },
                            mediaType:  { type: String },
                            mediaUrl:   { type: String },
                            processed:  { type: Boolean },
                        }
            },
            gs1pk:       { type: String, value: '${_type}#${name}' },
            gs1sk:       { type: String, value: '${_type}#' },
        }
    }
}
