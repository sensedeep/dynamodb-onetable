const g = (global as any)

g.dump = (...args) => {
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

g.print = (...args) => {
    console.log(...args)
}

g.delay = async (time) => {
    return new Promise(function(resolve, reject) {
        setTimeout(() => resolve(true), time)
    })
}
