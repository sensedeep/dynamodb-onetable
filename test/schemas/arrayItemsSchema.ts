/*
    Schema to test items property for array type
 */

export default {
    version: '0.0.1',
    format: 'onetable:1.1.0',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
    },
    models: {
        TestModel: {
            pk: {type: String, value: 'TestModel#${id}'},
            sk: {type: String, value: 'TestModel#'},
            id: {type: String, required: true},
            name: {type: String},

            arrayWithTypedItems: {
                type: Array,
                items: {
                    type: Object,
                    schema: {
                        foo: {type: String},
                        bar: {type: String /* required: true */},
                        when: {type: Date},
                    },
                },
                // required: true,
            },
            arrayWithoutTypedItems: {type: Array, required: true},
        },
    } as const,
    params: {
        isoDates: true,
        timestamps: true,
    },
}
