/*
    Fully speced schema
 */
export default {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', project: ['gs1pk', 'gs1sk', 'data']},
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#${id}'},
            sk: {type: String, value: '${_type}#'},
            id: {type: String, generate: 'ulid'},
            name: {type: String},

            //  Properties packed into the "data" attribute projected to the gs3 secondary index
            address: {type: String, map: 'data.address'},
            city: {type: String, map: 'data.city'},
            zip: {type: String, map: 'data.zip'},

            gs1pk: {type: String, value: '${_type}#${name}'},
            gs1sk: {type: String, value: '${_type}#'},
        },
    },
    params: {},
}
