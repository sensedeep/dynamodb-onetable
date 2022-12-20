/*
    Default schema with a test User entity
 */
export default {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', project: 'all'},
        gs2: {hash: 'gs2pk', sort: 'gs2sk', project: 'all'},
        gs3: {hash: 'gs3pk', sort: 'gs3sk', project: 'all'},
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#${id}'},
            sk: {type: String, value: '${_type}#'},
            id: {type: String, generate: 'ulid'},
            name: {type: String},
            email: {type: String},

            status: {type: String, default: 'idle'},
            age: {type: Number},
            profile: {type: Object},
            registered: {type: Date},

            //  Find by name
            gs1pk: {type: String, value: '${_type}#${name}'},
            gs1sk: {type: String, value: '${_type}#'},

            //  Find by type
            gs2pk: {type: String, value: 'type:${_type}'},
            gs2sk: {type: String, value: '${_type}#${id}'},

            //  List by status
            gs3pk: {type: String, value: '${_type}#${status}'},
            gs3sk: {type: String, value: '${_type}#${name}'},
        },
    },
    params: {
        isoDates: true,
        timestamps: true,
    },
}
