/*
    Unique schema with unique properties
 */
export default {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
    },
    models: {
        User: {
            pk:           { type: String, value: '${_type}#${name}' },
            sk:           { type: String, value: '${_type}#' },
            name:         { type: String },
            email:        { type: String, unique: true },
            age:          { type: Number },
            interpolated: { type: String, value: '${name}#${email}', unique: true },
        }
    }
}
