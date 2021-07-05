/*
    Initial migration for 0.0.1
*/

import Helpers from './helpers.js'
import Schema from './schema.js'

export default {
    version: '0.0.1',
    description: 'Initial database migration',

    async up(db, migrate) {
        //  Add an admin account and user

        let account = await db.create('Account', {name: 'Acme'})
        db.setContext({accountId: account.id})
        await db.create('User', {name: 'admin', email: 'admin@acme.com'})
    },

    async down(db, migrate) {
        //  Remove all accounts and users. Be very careful doing this on a production system!
        await db.remove('Account', {}, {index: 'gs1', many: true, log: true})
        await db.remove('User', {}, {index: 'gs1', many: true, log: true})
    }
}
