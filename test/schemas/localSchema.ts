/*
    Default schema with a test User entity
 */
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
        ls1: { hash: 'pk', sort: 'ls1sk', project: 'all' },
        ls2: { hash: 'pk', sort: 'ls2sk', project: 'all' },
    },
    models: {
        User: {
            //  Yes, this is a bad PK and puts all users in the same partition
            pk:         { type: String, value: 'user#' },
            sk:         { type: String, value: 'user#${id}' },
            id:         { type: String, uuid: true },
            name:       { type: String },
            email:      { type: String },

            ls1sk:      { type: String, value: 'user#${name}' },
            ls2sk:      { type: String, value: 'user#${_type}' },
        }
    }
}
