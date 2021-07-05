/*
    Initial migration for 0.0.2
*/

import Helpers from './helpers.js'

export default {
    version: '0.0.2',
    description: 'Initial database migration',

    async up(db, migrate) {
        //  Get a list of accounts. Use GS1 to use a query by type
        let accounts = await db.find('Account', {}, {index: 'gs1'})
        for (let account of accounts) {
            /*  
                Add the accountId to the context. All User requests will now use that value
                without having to explicitly specify in each property.
            */
            db.setContext({accountId: account.id})
            let users = await db.find('User', {}, {index: 'gs1'})
            for (let user of users) {
                //  Add a new status attribute to existing users
                await db.update('User', {email: user.email, status: 'active'})
            }
        }
    },

    async down(db, migrate) {
        let accounts = await db.find('Account', {}, {index: 'gs1'})
        for (let account of accounts) {
            db.setContext({accountId: account.id})
            let users = await db.find('User', {}, {index: 'gs1'})
            for (let user of users) {
                //  Remove the status attribute
                await db.update('User', {email: user.email, status: null})
            }
        }
    }
}
