/*
    Default schema with a test User entity
 */
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
        gs1: { hash: 'gs1pk', sort: 'gs1sk', project: 'all' },
        gs2: { hash: 'gs2pk', sort: 'gs2sk', project: 'all' },
    },
    models: {
        User: {
            pk:         { type: String, value: 'user#${id}' },
            sk:         { type: String, value: 'user#' },
            id:         { type: String, uuid: true },
            name:       { type: String },
            email:      { type: String },

            status:     { type: String, default: 'idle' },
            tag:        { type: Number, default: (model, field, properties) => {
                            // Just to demonstrate default value function
                            return `${model.name}:${field}:${properties.name}`
                        }
            },
            age:        { type: Number },
            profile:    { type: Object },

            //  Find by name
            gs1pk:      { type: String, value: 'user#${name}' },
            gs1sk:      { type: String, value: 'user#' },

            //  Find by type
            gs2pk:      { type: String, value: 'type:User' },
            gs2sk:      { type: String, value: 'user#${id}' },
        }
    }
}
