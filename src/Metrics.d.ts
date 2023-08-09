export class Metrics {
    constructor(table: any, params?: {}, prior?: {});
    table: any;
    log: any;
    metrics: {
        chan: string;
        dimensions: string[];
        enable: boolean;
        env: boolean;
        hot: boolean;
        max: number;
        namespace: string;
        period: number;
        properties: {};
        queries: boolean;
        source: string;
        tenant: any;
    };
    add(model: any, op: any, result: any, params: any, mark: any): void;
    addMetricGroup(values: any, dimensionValues: any, properties: any): void;
    addMetric(key: any, values: any, dimensions: any, dimensionValues: any, properties: any): void;
    flushMetrics(timestamp?: number): void;
    emitMetrics(timestamp: any, rec: any): void;
}
