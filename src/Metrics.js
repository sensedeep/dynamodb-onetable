/*
    Metrics.js - DynamoDB metrics class
 */

import {CustomMetrics} from 'custom-metrics'

const DefaultMetrics = {
    chan: 'dbmetrics', //  Default channel
    custom: true,
    dimensions: [
        // Default dimensions
        'Table',
        'Tenant',
        'Source',
        'Index',
        'Model',
        'Operation',
    ],
    enable: true, //  Enabled
    env: true, //  Observe LOG_FILTER for dbmetrics
    hot: false, //  Hot partition tracking
    max: 100, //  Buffer metrics for 100 requests
    namespace: 'SingleTable/Metrics.1', //  CloudWatch metrics namespace
    period: 60, //  or buffer for 60 seconds
    properties: {}, //  Additional properties to emit
    source: process.env.AWS_LAMBDA_FUNCTION_NAME || 'Default', //  Default source name
    tenant: null,
}

const DynamoOps = {
    delete: 'deleteItem',
    get: 'getItem',
    find: 'query',
    put: 'putItem',
    scan: 'scan',
    update: 'updateItem',
    batchGet: 'batchGet',
    batchWrite: 'batchWrite',
    transactGet: 'transactGet',
    transactWrite: 'transactWrite',
}

const ReadWrite = {
    delete: 'write',
    get: 'read',
    find: 'read',
    put: 'write',
    scan: 'read',
    update: 'write',
    batchGet: 'read',
    batchWrite: 'write',
    transactGet: 'read',
    transactWrite: 'write',
}

var Instances = {}

export class Metrics {
    constructor(table, params = {}, prior = {}) {
        this.table = table
        this.log = this.table.log
        let metrics
        if (params == true) {
            metrics = Object.assign({}, DefaultMetrics)
        } else {
            //  Params takes priority
            metrics = Object.assign({}, DefaultMetrics, params)
        }
        if (metrics.custom && table.V3) {
            let {hash, sort} = table.schema.indexes.primary
            this.custom = new CustomMetrics({
                table: table.name,
                client: table.client,
                primaryKey: hash,
                sortKey: sort,
                log: this.log,
            })
            Instances[`${table.name}`] = this
        }
        if (metrics.env && process.env) {
            let filter = process.env.LOG_FILTER
            metrics.enable = false
            if (filter && filter.indexOf('dbmetrics') >= 0) {
                metrics.enable = true
            } else {
                if (process.env.LOG_OVERRIDE != null) {
                    let [expire, filter] = process.env.LOG_OVERRIDE.split(':')
                    if (filter && filter.indexOf('dbmetrics') >= 0 && expire > Date.now()) {
                        metrics.enable = true
                    }
                }
            }
            metrics.dimensions = process.env.LOG_ONETABLE_DIMENSIONS || metrics.dimensions
            if (!Array.isArray(metrics.dimensions)) {
                metrics.dimensions = metrics.dimensions.split(',').map((i) => i.trim())
            }
        }
        metrics.map = {Profile: true}
        for (let dim of metrics.dimensions) {
            metrics.map[dim] = true
        }
        metrics.period *= 1000
        metrics.count = 0
        metrics.lastFlushed = Date.now()
        metrics.counters = {}

        //  Preserve any prior defined properties functions
        metrics.properties = metrics.properties || prior.properties
        this.metrics = metrics
    }

    async add(model, op, result, params, mark) {
        let metrics = this.metrics
        if (!metrics.enable || !this.log.enabled(metrics.chan)) {
            return
        }
        let timestamp = Date.now()
        let capacity = 0
        let consumed = result.ConsumedCapacity
        if (consumed) {
            //  Batch and transaction return array
            if (Array.isArray(consumed)) {
                for (let item of consumed) {
                    //  Only count this table name
                    if (item.TableName == this.table.name) {
                        capacity += item.CapacityUnits
                    }
                }
            } else {
                capacity = consumed.CapacityUnits
            }
        }
        let values = {
            count: result.Count || 1,
            latency: timestamp - mark,
            scanned: result.ScannedCount || 1,
            op,
            capacity,
        }
        let dimensions = {
            Table: this.table.name,
            Source: params.source || metrics.source,
            Index: params.index || 'primary',
            Model: model,
            Operation: DynamoOps[op],
        }
        if (metrics.tenant) {
            dimensions.Tenant = metrics.tenant
        }
        /*
            Add properties to be added to EMF records
         */
        let properties
        if (typeof metrics.properties == 'function') {
            properties = metrics.properties(op, params, result)
        } else {
            properties = metrics.properties || {}
        }
        this.addResultsToGroup(values, dimensions, properties)

        if (params.profile) {
            // dimensionValues.Profile = params.profile
            this.addResults(`Profile-${params.profile}`, values, {Profile: params.profile}, properties)
        }
        if (++metrics.count >= metrics.max || metrics.lastFlushed + metrics.period < timestamp) {
            await this.flush(timestamp)
            metrics.count = 0
            metrics.lastFlushed = timestamp
        }
    }

    /*
        Add results to a group of dimensions
     */
    addResultsToGroup(values, allDimensions, properties) {
        let dimensions = {},
            keys = []
        for (let name of this.metrics.dimensions) {
            let dimension = allDimensions[name]
            if (dimension) {
                keys.push(dimension)
                dimensions[name] = dimension
                this.addResults(keys.join('.'), values, dimensions, properties)
            }
        }
    }

    /*
        Add results to a specific dimension set
     */
    addResults(key, values, dimensions, properties) {
        let rec = (this.metrics.counters[key] = this.metrics.counters[key] || {
            totals: {count: 0, latency: 0, read: 0, requests: 0, scanned: 0, write: 0},
            dimensions: Object.assign({}, dimensions),
            properties,
        })
        let totals = rec.totals
        totals[ReadWrite[values.op]] += values.capacity //  RCU, WCU
        totals.latency += values.latency //  Latency in ms
        totals.count += values.count //  Item count
        totals.scanned += values.scanned //  Items scanned
        totals.requests++ //  Number of requests
    }

    static async terminate() {
        await Metrics.flushAll()
    }

    static async flushAll() {
        for (let instance of Object.values(Instances)) {
            await instance.flush()
        }
    }

    async flush(timestamp = Date.now()) {
        if (!this.metrics.enable) return
        for (let rec of Object.values(this.metrics.counters)) {
            Object.keys(rec.totals).forEach((field) => rec.totals[field] === 0 && delete rec.totals[field])
            await this.emitMetrics(timestamp, rec)
        }
        if (this.custom) {
            await this.custom.flush()
        }
        this.metrics.counters = {}
    }

    async emitMetrics(timestamp, rec) {
        let {dimensions, properties, totals} = rec
        let requests = totals.requests
        totals.latency = totals.latency / requests
        totals.count = totals.count / requests
        totals.scanned = totals.scanned / requests
        let namespace = this.metrics.namespace
        let dkeys = Object.keys(dimensions)

        if (this.custom) {
            for (let [metric, value] of Object.entries(totals)) {
                await this.custom.emit(namespace, metric, value, [dimensions], {buffer: {elapsed: 10 * 1000}})
            }
        } else if (this.log.metrics) {
            this.log.metrics(
                this.metrics.chan || 'dbmetrics',
                `OneTable Custom Metrics`,
                namespace,
                totals,
                dkeys,
                {latency: 'Milliseconds', default: 'Count'},
                Object.assign({}, dimensions, properties)
            )
        } else {
            let metrics = dkeys.map((v) => {
                return {Name: v, Unit: v == 'latency' ? 'Milliseconds' : 'Count'}
            })
            let data = Object.assign(
                {
                    _aws: {
                        Timestamp: timestamp,
                        CloudWatchMetrics: [
                            {
                                dkeys,
                                Namespace: namespace,
                                Metrics: metrics,
                            },
                        ],
                    },
                },
                totals,
                dimensions,
                properties
            )
            console.log(`OneTable Custom Metrics ` + JSON.stringify(data))
        }
    }

    setLog(log) {
        this.log = log
    }
}
