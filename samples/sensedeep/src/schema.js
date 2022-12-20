/*
    SenseDeep OneTable Schema

    This is the OneTable schema for the SenseDeep DynamoDB entity single-table model.
 */

const Version = '1.1.0'

export default {
    version: '0.0.1',
    indexes: {
        primary: {
            hash: 'pk',
            sort: 'sk',
            description: 'Primary index',
        },
    },
    models: {
        //  Log events
        Event: {
            pk: {type: String}, //  log.name
            sk: {type: String}, //  IsoDate + AWS log event id
            expire: {type: Number}, //  DynamoDB TTL date to evict log event
            message: {type: String}, //  Log message
        },

        Alarm: {
            pk: {type: String, value: 'alarm:'},
            sk: {type: String, value: 'alarm:${id}'},

            enable: {type: Boolean},
            family: {type: String, enum: ['metrics', 'events', 'logs', 'recommendations', 'relay'], required: true},
            forward: {type: Object}, //  Forward logs to another destination
            id: {type: String}, //  Unique ID used in pk/sk
            interval: {type: String}, //  Metric sampling interval
            name: {type: String, required: true}, //  Alarm name
            metric: {type: String}, //  Metric name to compare
            notifications: {type: Array}, //  Notifications to trigger
            operator: {type: String}, //  Metric operator
            pattern: {type: Array}, //  Log matching pattern
            recommendations: {type: Array}, //  Recommendation alerts
            resources: {type: Object}, //  Resources to consider
            severity: {type: String, enum: ['critical', 'error', 'warning', 'info']},
            statistic: {type: String}, //  Metric statistic
            threshold: {type: Number}, //  Metric threshold value
            tags: {type: Object}, //  Match resources by tags
        },

        Alert: {
            pk: {type: String, value: 'alert:'},
            sk: {type: String, value: 'alert:${id}:${seq}'},

            alarmId: {type: String}, //  Alarm.id
            assigned: {type: String}, //  User assigned
            count: {type: Number}, //  Count of triggers
            family: {type: String, enum: ['metrics', 'events', 'logs', 'recommendations']},
            id: {type: String}, //  alarm:resource
            interval: {type: String}, //  Alarm.interval
            name: {type: String, required: true}, //  Alarm.name
            message: {type: String}, //  Text message regarding alert
            operator: {type: String}, //  Alarm.operator (metric operator)
            pattern: {type: String}, //  Alarm.pattern (log pattern)
            region: {type: String}, //  Region of triggering alert (here for notifications)
            requestId: {type: String}, //  Lambda requestId
            resolved: {type: Boolean}, //  Alert resolved by user
            resource: {type: String}, //  Resource triggering the alert
            severity: {type: String, enum: ['critical', 'error', 'warning', 'info']}, //  Alarm.severity
            seq: {type: String}, //  Alert unique sequence
            start: {type: Date}, //  Start of lambda invocation
            statistic: {type: String}, //  Alarm.statistic
            timestamp: {type: Date}, //  Time of log event
            threshold: {type: Number}, //  Alarm.threshold
            value: {type: Number}, //  event.message
        },

        Bus: {
            pk: {type: String, value: 'bus:'}, //  Event bridge pk
            sk: {type: String, value: 'bus:${name}'},
            arn: {type: String}, //  Event bridge ARN
            name: {type: String}, //  Event bridge name
            subscribed: {type: Date}, //  Date subscribed
        },

        Control: {
            pk: {type: String, value: 'control:'},
            sk: {type: String, value: 'control:1'},
            enable: {type: Boolean},
            resources: {type: Object}, //  Resources to monitor
            update: {type: Date}, //  Signal update watchers
            reload: {type: Date}, //  Signal scheduler to reload
            subscribed: {type: Date}, //  When last subscribed (first pass)
        },

        Log: {
            pk: {type: String, value: 'log:'},
            sk: {type: String, value: 'log:${id}'},

            backfill: {type: Object}, //  Enable backfill from CloudWatch
            created: {type: Date}, //  Date log created
            delimiter: {type: String}, //  Log event parsing delimiter
            enable: {type: Boolean}, //  Enable log parsing
            fields: {type: Array}, //  Log event fields
            format: {type: String}, //  Log format (json, plain, ...)
            id: {type: String}, //  Log unique ID
            lambda: {type: Object}, //  Lambda configuration
            lifespan: {type: Number}, //  Duration of log entries to store
            name: {type: String, required: true}, //  AWS log group name
            pattern: {type: String}, //  Reserved
            region: {type: Number}, //  Region hosting the log
            retention: {type: Number}, //  CLW retention in days
            size: {type: Number}, //  CLW stored bytes
            subscribed: {type: Date}, //  Date subscribed to ingest logs
            tags: {type: Object}, //  AWS log group tags
            viewIndex: {type: Number}, //  Default log view to display
            views: {type: Array}, //  Log views
        },
    },
    params: {
        hidden: false,
    },
}
