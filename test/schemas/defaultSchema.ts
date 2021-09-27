/*
    Default schema with a test User entity
 */
export default {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
        gs1: { hash: 'gs1pk', sort: 'gs1sk', project: 'all' },
        gs2: { hash: 'gs2pk', sort: 'gs2sk', project: 'all' },
    },
    models: {
        User: {
            pk:         { type: String, value: '${_type}#${id}' },
            sk:         { type: String, value: '${_type}#' },
            id:         { type: String, uuid: true },
            name:       { type: String },
            email:      { type: String },

            status:     { type: String, default: 'idle' },
            tag:        { type: String, default: (model, field, properties) => {
                            // Just to demonstrate default value function
                            return `${model.name}:${field}:${properties.name}`
                        }
            },
            age:        { type: Number },
            profile:    { type: Object },
            registered: { type: Date },

            //  Find by name
            gs1pk:      { type: String, value: '${_type}#${name}' },
            gs1sk:      { type: String, value: '${_type}#' },

            //  Find by type
            gs2pk:      { type: String, value: 'type:${_type}' },
            gs2sk:      { type: String, value: '${_type}#${id}' },
        }
    }
}
