import AWS from 'aws-sdk'
import Dynamo from '../../src/Dynamo.js'
import { Entity, Model, Table } from '../../src/index.js'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const PORT = parseInt(process.env.DYNAMODB_PORT)

const Client = new Dynamo({
    client: new DynamoDBClient({
        endpoint: `http://localhost:${PORT}`,
        region: 'local',
        credentials: new AWS.Credentials({
            accessKeyId: 'test',
            secretAccessKey: 'test',
        }),
    })
})

const dump = (...args) => {
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

const print = (...args) => {
    console.log(...args)
}
globalThis.dump = dump
globalThis.print = print

const delay = async (time) => {
    return new Promise(function(resolve, reject) {
        setTimeout(() => resolve(true), time)
    })
}

const Match = {
    ulid:   /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/,
    uuid:   /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    email:  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    name:   /^[a-z ,.'-]+$/i,
    address: /[a-z0-9 ,.-]+$/,
    zip:    /^\d{5}(?:[-\s]\d{4})?$/,
    phone:  /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/,
}

export {AWS, Client, Dynamo, Entity, Match, Model, Table, delay, dump, print}
