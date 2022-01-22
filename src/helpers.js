export const unique = (array) => {
    return array.filter((e1, i, self) => {
        return self.findIndex(e2 => Object.keys(e2).every(prop => e2[prop] === e1[prop])) === i
    })
}

export const groupByMapping = (array, getKey, getValue = e => e) => {
    return array.reduce((groupedBy, item) => {
        const key = getKey(item)
        if (!groupedBy[key]) groupedBy[key] = []
        groupedBy[key].push(getValue(item, key))
        return groupedBy
    }, {})
}
