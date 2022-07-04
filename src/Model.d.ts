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
    ArrayBufferConstructor |
    string;

/*
    Schema.indexes signature
 */
export type OneIndexSchema = {
    hash?: string,
    sort?: string,
    description?: string,
    project?: string | readonly string[],
    follow?: boolean,
    type?: string,
};

/*
    Schema.models.Model.Field signature
 */
export type OneField = {
    crypt?: boolean,
    default?: string | number | boolean | object,
    enum?: readonly string[],
    filter?: boolean,
    generate?: string | boolean,
    hidden?: boolean,
    map?: string,
    nulls?: boolean,
    reference?: string,
    required?: boolean,
    type: OneType,
    unique?: boolean,
    validate?: RegExp | string | boolean,
    value?: boolean | string,
    schema?: OneModelSchema,
    ttl?: boolean,
    items?: OneField

    //  DEPRECATE 2.3
    uuid?: boolean | string,
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
    version: string,
    format?: string,
    params?: OneSchemaParams,
    models: {
        [key: string]: OneModelSchema
    },
    indexes: {
        [key: string]: OneIndexSchema
    },
    queries?: {},
};

export type OneSchemaParams = {
    createdField?: string,          //  Name of "created" timestamp attribute. Default to 'created'.
    hidden?: boolean,               //  Hide key attributes in Javascript properties. Default false.
    isoDates?: boolean,             //  Set to true to store dates as Javascript ISO Date strings. Default false.
    nulls?: boolean,                //  Store nulls in database attributes. Default false.
    timestamps?: boolean,           //  Make "created" and "updated" timestamps. Default true.
    typeField?: string,             //  Name of model type attribute. Default "_type".
    updatedField?: string,          //  Name of "updated" timestamp attribute. Default 'updated'.
}

/*
    Schema Models with field properties that contain field signatures (above) including "type" and "required".
 */
type OneTypedModel = Record<string, OneField>;

/*
    Entity field signature generated from the schema
 */
type EntityField<T extends OneField> =
    T['enum'] extends readonly EntityFieldFromType<T>[] ? T['enum'][number] : EntityFieldFromType<T>;

type EntityFieldFromType<T extends OneField> =
      T['type'] extends (ArrayConstructor | 'array') ? ArrayItemType<T>[]
    : T['type'] extends (BooleanConstructor | 'boolean') ? boolean
    : T['type'] extends (NumberConstructor | 'number') ? number
    : T['type'] extends (ObjectConstructor | 'object') ? Entity<T["schema"]>
    : T['type'] extends (DateConstructor | 'date') ? Date
    : T['type'] extends (ArrayBufferConstructor) ? ArrayBuffer
    : T['type'] extends (StringConstructor | 'string') ? string
    : T['type'] extends (SetConstructor | 'set') ? Set<any>
    : T['type'] extends 'typed-array' ? EntityFieldFromType<T["items"]>[]
    : never;

type ArrayItemType<T extends OneField> =
    T extends {items: OneField} ? EntityFieldFromType<T["items"]> : any
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
    Entity Parameters are partial Entities.
 */
export type EntityParameters<Entity> = Partial<Entity>

/*
    Special case for find to allow query operators
*/
export type EntityParametersForFind<T> = Partial<{
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
}>

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
    push?: object,
    remove?: string[],
    reprocess?: boolean,
    return?: string | boolean,
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
    load(properties: OneProperties, params?: OneParams): Promise<AnyEntity | undefined>;
    init(properties?: OneProperties, params?: OneParams): AnyEntity;
    remove(properties: OneProperties, params?: OneParams): Promise<AnyEntity | undefined>;
    scan(properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity>>;
    update(properties: OneProperties, params?: OneParams): Promise<AnyEntity | undefined>;
    upsert(properties: OneProperties, params?: OneParams): Promise<AnyEntity | undefined>;
};

export class Model<T> {
    constructor(table: any, name: string, options?: ModelConstructorOptions);
    create(properties: T, params?: OneParams): Promise<T>;
    find(properties?: EntityParametersForFind<T>, params?: OneParams): Promise<Paged<T>>;
    get(properties: EntityParameters<T>, params?: OneParams): Promise<T | undefined>;
    load(properties: EntityParameters<T>, params?: OneParams): Promise<T | undefined>;
    init(properties?: EntityParameters<T>, params?: OneParams): T;
    remove(properties: EntityParameters<T>, params?: OneParams): Promise<T | undefined>;
    scan(properties?: EntityParameters<T>, params?: OneParams): Promise<Paged<T>>;
    update(properties: EntityParameters<T>, params?: OneParams): Promise<T | undefined>;
    upsert(properties: EntityParameters<T>, params?: OneParams): Promise<T | undefined>;
}
