/*
    Schema to test various data types
 */
export default {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        Item: {
            pk:             { type: String, value: '${_type}#${id}' },
            sk:             { type: String, value: '${_type}#' },
            id:             { type: String, uuid: true },

            stringSet:      { type: Set },
            numberSet:      { type: Set },
            binarySet:      { type: Set },
        }
    }
}
