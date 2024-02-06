import {OneParams, OneProperties, OneIndex} from './Model.js'
export class Expression<ModelT> {
    constructor(model: ModelT, op: string, properties: OneProperties, params?: OneParams)
    add(field: string, value: any): void
    expand(where: any): any
    addFilter(att: string, value: any): void
    addKey(op: string, field: string, value: any): void
    addUpdate(field: string, value: any): void
    makeTarget(fields: string, name: string): string
    command(): any
    and(terms: string[]): string
    addName(name: string): number
    addValue(value: any): number
    // Internal only methods
    init(model: ModelT, op: string, properties: OneProperties, params: OneParams): void
    prepare(): void
    addConditions(op: string): void
    addFilters(): void
    addUpdates(): void
    selectIndex(indexes: Record<string, OneIndex>): OneIndex
}
