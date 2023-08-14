/*
    Metrics.js - DynamoDB metrics class
 */

import {Log, Table} from './Table'
import type SenseLogs from 'senselogs'

export interface OneMetricsParams {
    chan: string;
    dimensions: string[];
    enable: boolean;
    env: boolean;
    hot: boolean;
    max: number;
    namespace: string;
    period: number;
    properties: Record<string, string> | ((operation: string, params: object, result: object) => Record<string, string>);
    queries: boolean;
    source: string;
    tenant?: string;
}

const DefaultMetrics: OneMetricsParams = {
    chan: 'dbmetrics', //  Default channel
    dimensions: [
        'Table',
        'Tenant',
        'Source',
        'Index',
        'Model',
        'Operation', //  Default dimensions
    ],
    enable: true, //  Enabled
    env: true, //  Observe LOG_FILTER for dbmetrics
    hot: false, //  Hot partition tracking
    max: 100, //  Buffer metrics for 100 requests
    namespace: 'SingleTable/Metrics.1', //  CloudWatch metrics namespace
    period: 60, //  or buffer for 30 seconds
    properties: {}, //  Additional properties to emit
    queries: true, //  Query profiling
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

/*
    Represent a single DynamoDB table
 */
export class Metrics {
    log: Log | SenseLogs
    metrics: OneMetricsParams
    table: Table

    count: number
    counters: {
        totals?: { count: number, latency: number, read: number, requests: number, scanned: number, write: number},
        dimensions?: string[],
        dimensionValues?: {
            Table: string,
            Tenant: string,
            Source: string,
            Index: string,
            Model: string,
            Operation: string,
            Profile: string
        },
        properties?: Record<string, string>,
    }
    lastFlushed: number

    constructor(table: Table, params: OneMetricsParams | boolean, prior: Metrics) {
        this.table = table
        this.log = this.table.log
        let metrics
        if (params == true) {
            metrics = Object.assign({}, DefaultMetrics)
        } else {
            //  Params takes priority
            metrics = Object.assign({}, DefaultMetrics, params)
        }
        if (metrics.env && process.env) {
            if ('metrics' in this.log) {
                const filter = process.env.LOG_FILTER
                if (!filter || filter.indexOf('dbmetrics') < 0) {
                    metrics.enable = false
                }
            }
            metrics.dimensions = process.env.LOG_ONETABLE_DIMENSIONS || metrics.dimensions
            if (!Array.isArray(metrics.dimensions)) {
                metrics.dimensions = metrics.dimensions.split(',').map((i) => i.trim())
            }
        }
        metrics.map = {Profile: true}
        for (const dim of metrics.dimensions) {
            metrics.map[dim] = true
        }
        metrics.period *= 1000
        metrics.count = 0
        metrics.lastFlushed = Date.now()
        metrics.counters = {}

        //  Preserve any prior defined properties functions
        metrics.properties = metrics.properties || prior.metrics.properties
        this.metrics = metrics
    }

    add(model, op, result, params, mark) {
        const metrics = this.metrics
        if (!metrics.enable || !this.log.enabled(metrics.chan)) {
            return
        }
        const timestamp = Date.now()

        let capacity = 0
        const consumed = result.ConsumedCapacity
        if (consumed) {
            //  Batch and transaction return array
            if (Array.isArray(consumed)) {
                for (const item of consumed) {
                    //  Only count this table name
                    if (item.TableName == this.table.name) {
                        capacity += item.CapacityUnits
                    }
                }
            } else {
                capacity = consumed.CapacityUnits
            }
        }
        const values = {
            count: result.Count || 1,
            latency: timestamp - mark,
            scanned: result.ScannedCount || 1,
            op,
            capacity,
        }
        const dimensionValues = {
            Table: this.table.name,
            Tenant: metrics.tenant,
            Source: params.source || metrics.source,
            Index: params.index || 'primary',
            Model: model,
            Operation: DynamoOps[op],
        }
        let properties
        if (typeof metrics.properties == 'function') {
            properties = metrics.properties(op, params, result)
        } else {
            properties = metrics.properties || {}
        }
        this.addMetricGroup(values, dimensionValues, properties)

        if (metrics.queries && params.profile) {
            dimensionValues.Profile = params.profile
            this.addMetric('Profile', values, ['Profile'], dimensionValues, properties)
        }
        if (++this.count >= metrics.max || this.lastFlushed + metrics.period < timestamp) {
            this.flushMetrics(timestamp)
            this.count = 0
            this.lastFlushed = timestamp
        }
    }

    addMetricGroup(values, dimensionValues, properties) {
        const dimensions = [],
            keys = []
        for (const name of this.metrics.dimensions) {
            const dimension = dimensionValues[name]
            if (dimension) {
                keys.push(dimension)
                dimensions.push(name)
                this.addMetric(keys.join('.'), values, dimensions, dimensionValues, properties)
            }
        }
    }

    addMetric(key, values, dimensions, dimensionValues, properties) {
        const rec = (this.counters[key] = this.counters[key] || {
            totals: {count: 0, latency: 0, read: 0, requests: 0, scanned: 0, write: 0},
            dimensions: dimensions.slice(0),
            dimensionValues,
            properties,
        })
        const totals = rec.totals
        totals[ReadWrite[values.op]] += values.capacity //  RCU, WCU
        totals.latency += values.latency //  Latency in ms
        totals.count += values.count //  Item count
        totals.scanned += values.scanned //  Items scanned
        totals.requests++ //  Number of requests
    }

    flushMetrics(timestamp = Date.now()) {
        if (!this.metrics.enable) return
        for (const rec of Object.values(this.counters)) {
            Object.keys(rec).forEach((field) => rec[field] === 0 && delete rec[field])
            this.emitMetrics(timestamp, rec)
        }
        this.counters = {}
    }

    emitMetrics(timestamp, rec) {
        const {dimensionValues, dimensions, properties, totals} = rec
        const metricsParams = this.metrics

        const requests = totals.requests
        totals.latency = totals.latency / requests
        totals.count = totals.count / requests
        totals.scanned = totals.scanned / requests

        if ('metrics' in this.log) {
            const chan = metricsParams.chan || 'dbmetrics'
            this.log.metrics(
                chan,
                `OneTable Custom Metrics ${dimensions}`,
                metricsParams.namespace,
                totals,
                dimensions,
                {latency: 'Milliseconds', default: 'Count'},
                Object.assign({}, dimensionValues, properties)
            )
        } else {
            const metrics = dimensions.map((v) => {
                return {Name: v, Unit: v == 'latency' ? 'Milliseconds' : 'Count'}
            })
            const data = Object.assign(
                {
                    _aws: {
                        Timestamp: timestamp,
                        CloudWatchMetrics: [
                            {
                                Dimensions: [dimensions],
                                Namespace: metricsParams.namespace,
                                Metrics: metrics,
                            },
                        ],
                    },
                },
                totals,
                dimensionValues,
                properties
            )
            console.log(`OneTable Custom Metrics ${dimensions}` + JSON.stringify(data))
        }
    }
}
