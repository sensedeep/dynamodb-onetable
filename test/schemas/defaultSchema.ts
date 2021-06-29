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
            status:     { type: String },

            /*
            //  Properties packed into the "data" attribute projected to the gs3 secondary index
            address:    { type: String, map: 'data.address' },
            city:       { type: String, map: 'data.city' },
            zip:        { type: String, map: 'data.zip' },
            */

            //  Find by name
            gs1pk:      { type: String, value: 'user#${name}' },
            gs1sk:      { type: String, value: 'user#' },

            //  Find by type
            gs2pk:      { type: String, value: 'type:User' },
            gs2sk:      { type: String, value: 'user#${id}' },
        }
    }
}
