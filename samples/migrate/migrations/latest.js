/*
    Latest migration. This should be a one-stop migration to set the database to the latest schema.
    Useful in dev stages.
 */

import Helpers from './helpers.js'

export default {
    version: 'latest',
    description: 'Database reset to latest version',

    async up(db, migrate) {
        //  Put code here
    },

    async down(db, migrate) {
        /*
        if (migrate.params.profile == 'dev' || migrate.params.profile == 'qa') {
            await Helpers.removeAllItems(db, migrate)
        } */
    },
}
