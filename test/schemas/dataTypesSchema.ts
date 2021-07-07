/*
    Schema to test various data types
 */
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        Item: {
            pk:             { type: String, value: 'item#${id}' },
            sk:             { type: String, value: 'item#' },
            id:             { type: String, uuid: true },

            stringSet:      { type: Set },
            numberSet:      { type: Set },
            binarySet:      { type: Set },
        }
    }
}
