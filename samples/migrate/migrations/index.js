/*
    Migrations index

    Add your migrations here
 */
import v001 from './0.0.1.js'
import v002 from './0.0.2.js'
import latest from './latest.js'

const Migrations = [
    v001,
    v002,
    //  Always keep latest last
    latest,
]

export {Migrations}
