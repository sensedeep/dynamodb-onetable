/*
    Model.d.ts -- Hand crafted type definitions for Model

    Supports dynamic definition of types based on the Schema.js
*/
import { Expression } from './Expression'

/*
    Possible types for a schema field "type" property
 */
export type OneType =
    ArrayConstructor |
    BooleanConstructor |
    DateConstructor |
    NumberConstructor |
    ObjectConstructor |
    StringConstructor |
    SetConstructor |
    Buffer |
    string;

/*
    Schema.indexes signature
 */
export type OneIndexSchema = {
    hash?: string,
    sort?: string,
    description?: string,
    project?: string | string[],
    follow?: boolean,
};

/*
    Schema.models.Model.Field signature
 */
export type OneField = {
    crypt?: boolean,
    default?: string | number | boolean | object,
    enum?: string[],
    filter?: boolean,
    hidden?: boolean,
    map?: string,
    nulls?: boolean,
    required?: boolean,
    type: OneType,
    unique?: boolean,
    uuid?: boolean | string,
    validate?: RegExp | string | boolean,
    value?: boolean | string,
    schema?: OneModelSchema,
}

/*
    Schema.models signature
 */
export type OneModelSchema = {
    [key: string]: OneField
};

/*
    Schema signature
 */
export type OneSchema = {
    name?: string,
    version?: string,
    format?: string,
    params?: {
        [key: string]: any
    },
    models: {
        [key: string]: OneModelSchema
    },
    indexes: {
        [key: string]: OneIndexSchema
    },
};

/*
    Schema Models with field properties that contain field signatures (above) including "type" and "required".
 */
type OneTypedModel = Record<string, OneField>;

/*
    Entity field signature generated from the schema
 */
type EntityField<T extends OneField> =
      T['type'] extends ArrayConstructor ? any[]
    : T['type'] extends BooleanConstructor ? boolean
    : T['type'] extends NumberConstructor ? number
    : T['type'] extends ObjectConstructor ? object
    : T['type'] extends DateConstructor ? Date
    : T['type'] extends StringConstructor ? string
    : T['type'] extends SetConstructor ? Set<T>

    : T['type'] extends 'array' ? any[]
    : T['type'] extends 'boolean' ? boolean
    : T['type'] extends 'number' ? number
    : T['type'] extends 'object' ? object
    : T['type'] extends 'date' ? Date
    : T['type'] extends 'string' ? string
    : T['type'] extends 'set' ? Set<T>
    : never;

/*
    Select the required properties from a model
*/
export type Required<T extends OneTypedModel> = {
    -readonly [P in keyof T as T[P]['required'] extends true ? P : never]: EntityField<T[P]>
};

/*
    Select the optional properties from a model
*/
export type Optional<T extends OneTypedModel> = {
    -readonly [P in keyof T as T[P]['required'] extends true ? never : P]?: EntityField<T[P]>
};

/*
    Merge two types
*/
type Merge<A extends any, B extends any> = {
    [P in keyof (A & B)]: P extends keyof A ? A[P] : (P extends keyof B ? B[P] : never)
};

/*
    Create entity type which includes required and optional types

    The following works, but the intellisense types are terrible. Merge does a better job.
    type Entity<T extends OneTypedModel> = Required<T> & Optional<T>
*/
type Entity<T extends OneTypedModel> = Merge<Required<T>, Optional<T>>

/*
    Entity Parameters are partial Entities.  Useful for search, update parameters.
 */
export type EntityParameters<Entity> = Partial<Entity>

export type EntityParametersForFind<T> = {
    [K in keyof T]: T[K]
        | Begins<T, K>
        | BeginsWith<T, K>
        | Between<T, K>
        | LessThan<T, K>
        | LessThanOrEqual<T, K>
        | Equal<T, K>
        | NotEqual<T, K>
        | GreaterThanOrEqual<T, K>
        | GreaterThan<T, K>
}

export type Begins<T, K extends keyof T> = { begins: T[K] }
export type BeginsWith<T, K extends keyof T> = { begins_with: T[K] }
export type Between<T, K extends keyof T> = { between: [T[K], T[K]] }
export type LessThan<T, K extends keyof T> = { '<': T[K] }
export type LessThanOrEqual<T, K extends keyof T> = { '<=': T[K] }
export type Equal<T, K extends keyof T> = { '=': T[K] }
export type NotEqual<T, K extends keyof T> = { '<>': T[K] }
export type GreaterThanOrEqual<T, K extends keyof T> = { '>=': T[K] }
export type GreaterThan<T, K extends keyof T> = { '>': T[K] }

/*
    Any entity. Essentially untyped.
 */
export type AnyEntity = {
    [key: string]: any
};

type ModelConstructorOptions = {
    fields?: OneModelSchema
    indexes?: {
        [key: string]: OneIndexSchema
    },
    timestamps?: boolean,
};

/*
    Possible params options for all APIs
 */
export type OneParams = {
    add?: object,
    batch?: object,
    capacity?: string,
    consistent?: boolean,
    context?: object,
    count?: boolean,
    delete?: object,
    execute?: boolean,
    exists?: boolean | null,
    fields?: string[],
    follow?: boolean,
    hidden?: boolean,
    index?: string,
    limit?: number,
    log?: boolean,
    many?: boolean,
    maxPages?: number,
    next?: object,
    parse?: boolean,
    postFormat?: (model: AnyModel, cmd: {}) => {},
    prev?: object,
    remove?: string[],
    return?: string,
    reverse?: boolean,
    segment?: number,
    segments?: number,
    select?: string,
    set?: object,
    stats?: object,
    substitutions?: object,
    throw?: boolean,
    transform?: (model: AnyModel, op: string, name: string, value: any, properties: OneProperties) => any,
    transaction?: object,
    type?: string,
    tunnel?: object,
    updateIndexes?: boolean,
    where?: string,
};

/*
    Properties for most APIs. Essentially untyped.
 */
export type OneProperties = {
    [key: string]: any
};

export class Paged<T> extends Array<T> {
    count?: number;
    next?: object;
    prev?: object;
}

export type AnyModel = {
    constructor(table: any, name: string, options?: ModelConstructorOptions): AnyModel;
    create(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    find(properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity>>;
    get(properties: OneProperties, params?: OneParams): Promise<AnyEntity | undefined>;
    init(properties?: OneProperties, params?: OneParams): AnyEntity;
    remove(properties: OneProperties, params?: OneParams): Promise<void>;
    scan(properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity>>;
    update(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
};

export class Model<T> {
    constructor(table: any, name: string, options?: ModelConstructorOptions);
    create(properties: EntityParameters<T>, params?: OneParams): Promise<T>;
    find(properties?: EntityParametersForFind<T>, params?: OneParams): Promise<Paged<T>>;
    get(properties: EntityParameters<T>, params?: OneParams): Promise<T | undefined>;
    init(properties?: EntityParameters<T>, params?: OneParams): T;
    remove(properties: EntityParameters<T>, params?: OneParams): Promise<void>;
    scan(properties?: EntityParameters<T>, params?: OneParams): Promise<Paged<T>>;
    update(properties: EntityParameters<T>, params?: OneParams): Promise<T>;
}
