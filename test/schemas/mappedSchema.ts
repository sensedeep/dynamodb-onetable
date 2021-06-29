/*
    Default schema with a test User entity
 */
export default {
    indexes: {
        primary: {
            hash: 'pk',     //  Attribute names
            sort: 'sk'
        },
        //MOB are project mapped or unmapped?
        gs1: {
            hash: 'gs1pk',
            sort: 'gs1sk',
            project: 'all'
                /*['data', 'gs1pk', 'gs1sk'] */
        },
    },
    models: {
        User: {
            primaryHash: { type: String, value: 'us#${id}', map: 'pk' },
            primarySort: { type: String, value: 'us#', map: 'sk' },
            id:          { type: String, uuid: 'ulid' },
            name:        { type: String, map: 'nm' },
            email:       { type: String, map: 'em' },
            status:      { type: String, map: 'st' },

            //  Properties packed into the "data" attribute projected to the gs1 secondary index
            address:     { type: String, map: 'data.address' },
            city:        { type: String, map: 'data.city' },
            zip:         { type: String, map: 'data.zip' },

            //  Find by type
            secHash:     { type: String, value: 'ty#us', map: 'gs1pk' },
            secSort:     { type: String, value: 'us#${id}', map: 'gs1sk' },
        }
    }
}
