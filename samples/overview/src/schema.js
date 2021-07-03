/*
    Overview schema
*/

const Match = {
    ulid:   /^[0-9A-Z]{26}$/i,
    email:  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    name:   /^[a-z0-9 ,.'-]+$/i,
    address: /[a-z0-9 ,.-]+$/,
    zip:    /^\d{5}(?:[-\s]\d{4})?$/,
    phone:  /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/,
}

export default {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
        gs1:     { hash: 'gs1pk', sort: 'gs1sk', project: ['gs1pk', 'gs2pk', 'data'] },
    },
    models: {
        Account: {
            pk:         { type: String, value: 'account#${id}' },
            sk:         { type: String, value: 'account#' },
            id:         { type: String, uuid: true, validate: Match.ulid },
            name:       { type: String, required: true, unique: true, validate: Match.name },
            balance:    { type: Number, default: 0 },

            //  Search by account name
            gs1pk:      { type: String, value: 'account#${name}' },
            gs1sk:      { type: String, value: 'account#' },
        },
        User: {
            pk:         { type: String, value: 'account#${accountId}' },
            sk:         { type: String, value: 'user#${email}' },
            accountId:  { type: String, required: true },
            id:         { type: String, uuid: true, validate: Match.ulid },
            name:       { type: String, required: true, validate: Match.name },
            email:      { type: String, required: true, validate: Match.email, crypt: true },

            //  MOB - get map working with nested schema
            address:    { type: Object, default: {}, schema: {
                street: { type: String, /* map: 'data.street' */ },
                city:   { type: String, /* map: 'data.city' */ },
                zip:    { type: String, /* map: 'data.zip' */ },
            } },

            status:     { type: String, required: true, default: 'active', enum: ['active', 'inactive'] },
            balance:    { type: Number, default: 0 },

            //  Search by user name
            gs1pk:      { type: String, value: 'user#${name}' },
            gs1sk:      { type: String, value: 'user#${id}' },
        },
        Product: {
            pk:         { type: String, value: 'product#${id}' },
            sk:         { type: String, value: 'product#' },
            id:         { type: String, uuid: true, validate: Match.ulid },
            name:       { type: String, required: true },
            price:      { type: Number, required: true },
        },
        Invoice: {
            pk:         { type: String, value: 'account#${accountId}' },
            sk:         { type: String, value: 'invoice#${id}' },
            accountId:  { type: String, required: true },
            date:       { type: Date, default: () => new Date() },
            id:         { type: String, uuid: true },
            product:    { type: String },
            count:      { type: Number },
            total:      { type: Number },
        }
    }
}
