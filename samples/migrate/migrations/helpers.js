import Fs from 'fs'

/*
    Dump an object to the console. Great for debugging.
*/
global.dump = (...args) => {
    let s = []
    for (let item of args) {
        s.push(JSON.stringify(item, function (key, value) {
            if (this[key] instanceof Date) {
                return this[key].toLocaleString()
            }
            return value
        }, 4))
    }
    console.log(s.join(' '))
}

export default class Helpers {

    static async readJson(path) {
        return new Promise(function(resolve, reject) {
            Fs.readFile(path, function(err, data) {
                if (err) {
                    reject(err)
                } else {
                    try {
                        resolve(JSON.parse(data))
                    } catch (err) {
                        throw new Error(`Cannot parse json file: ${path}. ${err.message}`)
                    }
                }
            })
        })
    }

    /*
        Remove all items in a table.  Only use in dev stages.
    */
    static async removeAllItems(db, migrate) {
        let items
        do {
            items = await db.scanItems({}, {limit: 100})
            for (let item of items) {
                await db.deleteItem(item)
            }
        } while (items.length)
    }


}
