/*
    Schema to use with crypto
 */
export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        User: {
            pk:         { type: String, value: 'user#${id}' },
            sk:         { type: String, value: 'user#' },
            id:         { type: String, uuid: true },
            name:       { type: String },
            email:      { type: String, crypt: true },
        }
    }
}
