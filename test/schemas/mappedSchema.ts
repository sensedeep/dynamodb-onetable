/*
    Schema with mapped properties

    Mapped properties use an abbreviated name for the actual attributes.
    This makes the raw table harder to read, but uses less RCU/WCU in writing the attribute names.
 */
export default {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {
            hash: 'pk', //  Attribute names
            sort: 'sk',
        },
        gs1: {
            hash: 'pk1', //  Attribute names
            sort: 'sk1',
            project: ['pk1', 'sk1', 'data'],
        },
    },
    models: {
        User: {
            primaryHash: {type: String, value: 'us#${id}', map: 'pk'},
            primarySort: {type: String, value: 'us#', map: 'sk'},
            id: {type: String, generate: 'ulid'},
            name: {type: String, map: 'nm'},
            email: {type: String, map: 'em'},
            status: {type: String, map: 'st'},

            //  Properties packed into the "data" attribute projected to the gs1 secondary index
            address: {type: String, map: 'data.address'},
            city: {type: String, map: 'data.city'},
            zip: {type: String, map: 'data.zip'},

            //  Find by type or email
            gs1pk: {type: String, value: 'ty#us', map: 'pk1'},
            gs1sk: {type: String, value: 'us#${email}', map: 'sk1'},
        },
    },
    params: {},
}
