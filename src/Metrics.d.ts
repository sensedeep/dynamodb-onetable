export class Metrics {
    constructor(table: any, params?: {}, prior?: {});
    table: any;
    log: any;
    metrics: {
        chan: string;
        custom: boolean;
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
    add(model: any, op: any, result: any, params: any, mark: any): Promise<void>;
    addMetricGroup(values: any, dimensionValues: any, properties: any): void;
    addMetric(key: any, values: any, dimensions: any, dimensionValues: any, properties: any): void;
    flush(timestamp?: number): Promise<void>;
    emit(timestamp: any, rec: any): Promise<void>;
    terminate(): Promise<void>;
    setLog(log: any): void
}
