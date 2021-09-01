
/*
    Simple non-crypto UUID. See node-uuid if you require crypto UUIDs.
    Consider ULIDs which are crypto sortable.
*/
export default function UUID() {
    return 'xxxxxxxxxxxxxxxxyxxxxxxxxxyxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}
