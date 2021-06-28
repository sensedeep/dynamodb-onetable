/*
    Default schema with a test User entity
 */
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
        gs1: { hash: 'gs1pk', sort: 'gs1sk', project: ['gs1pk', 'gs1sk', 'data'] },
    },
    models: {
        User: {
            pk:          { type: String, value: 'user#${id}' },
            sk:          { type: String, value: 'user#' },
            id:          { type: String, uuid: true },
            name:        { type: String },

            //  Properties packed into the "data" attribute projected to the gs3 secondary index
            address:     { type: String, map: 'data.address' },
            city:        { type: String, map: 'data.city' },
            zip:         { type: String, map: 'data.zip' },

            gs1pk:       { type: String, value: 'user#${name}' },
            gs1sk:       { type: String, value: 'user#' },
        }
    }
}
