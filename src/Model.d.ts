/*
    Model.d.ts -- Hand crafted type definitions for Model

    Supports dynamic definition of types based on the Schema.js
*/
import {Expression} from './Expression.js'

/*
    Possible types for a schema field "type" property
 */
export type OneType =
    | ArrayConstructor
    | BooleanConstructor
    | DateConstructor
    | NumberConstructor
    | ObjectConstructor
    | StringConstructor
    | SetConstructor
    | ArrayBufferConstructor
    | string

/*
    Schema.indexes signature
 */
export type OneIndex = {
    hash?: string
    sort?: string
    description?: string
    project?: string | readonly string[]
    follow?: boolean
    type?: string
}

/*
    Schema.models.Model.Field signature
 */
export type OneField = {
    crypt?: boolean
    default?: string | number | boolean | object | Array<any>
    encode?: readonly (string | RegExp | number)[] | string
    enum?: readonly string[]
    filter?: boolean
    generate?: string | boolean | function
    hidden?: boolean
    items?: OneField
    map?: string
    nulls?: boolean
    partial?: boolean
    reference?: string
    required?: boolean
    schema?: OneModel
    scope?: string
    timestamp?: boolean
    ttl?: boolean
    type: OneType
    unique?: boolean
    validate?: RegExp | string | boolean
    value?: boolean | string

    //  DEPRECATE 2.3
    uuid?: boolean | string
}

/*
    Schema.models signature
 */
export type OneModel = {
    [key: string]: OneField
}

/*
    Schema signature
 */
export type OneSchema = {
    name?: string
    version: string
    format?: string
    params?: OneSchemaParams
    models: {
        [key: string]: OneModel
    }
    process?: object
    indexes: {
        [key: string]: OneIndex
    }
    queries?: {}
}

export type OneSchemaParams = {
    createdField?: string //  Name of "created" timestamp attribute. Default to 'created'.
    hidden?: boolean //  Hide key attributes in Javascript properties. Default false.
    isoDates?: boolean //  Set to true to store dates as Javascript ISO Date strings. Default false.
    nulls?: boolean //  Store nulls in database attributes. Default false.
    timestamps?: boolean | string //  Make "created" and "updated" timestamps. Set to true, 'create' or 'update'. Default true.
    separator?: string // Separator string uses in value templates
    typeField?: string //  Name of model type attribute. Default "_type".
    updatedField?: string //  Name of "updated" timestamp attribute. Default 'updated'.
    warn?: boolean // Emit warnings for some conditions. Default false.

    legacyEmpties?: boolean // Remove empty strings
}

/*
    Entity field signature generated from the schema
 */
type EntityField<T extends OneField> = T['enum'] extends readonly EntityFieldFromType<T>[]
    ? T['enum'][number]
    : EntityFieldFromType<T>

type EntityFieldFromType<T extends OneField> = T['type'] extends ArrayConstructor | 'array'
    ? ArrayItemType<T>[]
    : T['type'] extends BooleanConstructor | 'boolean'
    ? boolean
    : T['type'] extends NumberConstructor | 'number'
    ? number
    : T['type'] extends ObjectConstructor | 'object'
    ? (T['schema'] extends object ? Entity<Exclude<T['schema'], undefined>> : Record<any, any>)
    : T['type'] extends DateConstructor | 'date'
    ? Date
    : T['type'] extends ArrayBufferConstructor
    ? ArrayBuffer
    : T['type'] extends StringConstructor | 'string'
    ? string
    : T['type'] extends SetConstructor | 'set'
    ? Set<any>
    : T['type'] extends 'typed-array'
    ? EntityFieldFromType<Exclude<T['items'], undefined>>[]
    : never

type ArrayItemType<T extends OneField> = T extends {items: OneField}
    ? EntityField<T['items']>
    : any
/*
    Select the required properties from a model
*/
export type Required<T extends OneModel> = {
    -readonly [P in keyof T as T[P]['required'] extends true ? P : never]: EntityField<T[P]>
}

/*
    Select the optional properties from a model
*/
export type Optional<T extends OneModel> = {
    -readonly [P in keyof T as T[P]['required'] extends true ? never : P]?: EntityField<T[P]>
}

type OptionalOrNull<T extends OneModel> = {
    -readonly [P in keyof T as T[P]['required'] extends true ? never : P]?: EntityField<T[P]> | null
}
type OptionalOrUndefined<T extends OneModel> = {
    -readonly [P in keyof T as T[P]['required'] extends true ? never : P]?: EntityField<T[P]> | undefined
}

/*
    Select properties with generated values
*/
export type Generated<T extends OneModel> = {
    -readonly [P in keyof T as T[P]['generate'] extends string | boolean ? P : never]?: EntityField<T[P]>
}

/*
    Select properties with default values
*/
type DefinedValue = string | number | bigint | boolean | symbol | object
export type Defaulted<T extends OneModel> = {
    -readonly [P in keyof T as T[P]['default'] extends DefinedValue ? P : never]: EntityField<T[P]>
}

/*
    Select value template properties
*/
export type ValueTemplates<T extends OneModel> = {
    -readonly [P in keyof T as T[P]['value'] extends string ? P : never]: EntityField<T[P]>
}

/*
    Select timestamp properties
*/
export type TimestampValue<T extends OneModel> = {
    -readonly [P in keyof T as T[P]['timestamp'] extends true ? P : never]: EntityField<T[P]>
}

/*
    Merge the properties of two types given preference to A.
*/
type Merge<A extends any, B extends any> = {
    [P in keyof (A & B)]: P extends keyof A ? A[P] : P extends keyof B ? B[P] : never
}

/*
    Create entity type which includes required and optional types
    An entity type is not used by the user and is only required internally.
    Merge gives better intellisense, but requires Flatten to make <infer X> work.
*/
type Flatten<T> = {[P in keyof T]: T[P]}
type Entity<T extends OneModel> = Flatten<Merge<Required<T>, OptionalOrUndefined<T>>>

/*
    Entity Parameters are partial Entities.
 */
type EntityParameters<Entity> = Partial<Entity>

/*
    Special case for find to allow query operators
*/
type EntityParametersForFind<T> = Partial<{
    [K in keyof T]:
        | T[K]
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

type Begins<T, K extends keyof T> = {begins: T[K]}
type BeginsWith<T, K extends keyof T> = {begins_with: T[K]}
type Between<T, K extends keyof T> = {between: [T[K], T[K]]}
type LessThan<T, K extends keyof T> = {'<': T[K]}
type LessThanOrEqual<T, K extends keyof T> = {'<=': T[K]}
type Equal<T, K extends keyof T> = {'=': T[K]}
type NotEqual<T, K extends keyof T> = {'<>': T[K]}
type GreaterThanOrEqual<T, K extends keyof T> = {'>=': T[K]}
type GreaterThan<T, K extends keyof T> = {'>': T[K]}

/*
    Any entity. Essentially untyped.
 */
export type AnyEntity = {
    [key: string]: any
}

type ModelConstructorOptions = {
    fields?: OneModel
    indexes?: {
        [key: string]: OneIndex
    }
    timestamps?: boolean | string
}

/*
    Possible params options for all APIs
 */
export type OneParams = {
    add?: object
    batch?: object
    capacity?: string
    consistent?: boolean
    context?: object
    count?: boolean
    delete?: object
    execute?: boolean
    exists?: boolean | null
    fields?: string[]
    follow?: boolean
    hidden?: boolean
    index?: string
    limit?: number
    log?: boolean
    many?: boolean
    maxPages?: number
    next?: object
    //  DEPRECATED
    noerror?: boolean
    parse?: boolean
    partial?: boolean
    postFormat?: (model: AnyModel, cmd: {}) => {}
    prev?: object
    push?: object
    remove?: string[]
    reprocess?: boolean
    return?: string | boolean
    reverse?: boolean
    segment?: number
    segments?: number
    select?: string
    set?: object
    stats?: object
    substitutions?: object
    timestamps?: boolean
    throw?: boolean
    transform?: (model: AnyModel, op: string, name: string, value: any, properties: OneProperties) => any
    transaction?: object
    type?: string
    tunnel?: object
    warn?: Boolean
    where?: string
    profile?: string
}

/*
    Properties for most APIs. Essentially untyped.
 */
export type OneProperties = {
    [key: string]: any
}

export class Paged<T> extends Array<T> {
    count?: number
    next?: object
    prev?: object
}

export type AnyModel = {
    constructor(table: any, name: string, options?: ModelConstructorOptions): AnyModel
    create(properties: OneProperties, params?: OneParams): Promise<AnyEntity>
    find(properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity>>
    get(properties: OneProperties, params?: OneParams): Promise<AnyEntity | undefined>
    load(properties: OneProperties, params?: OneParams): Promise<AnyEntity | undefined>
    init(properties?: OneProperties, params?: OneParams): AnyEntity
    remove(properties: OneProperties, params?: OneParams): Promise<AnyEntity | Array<AnyEntity> | undefined>
    scan(properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity>>
    update(properties: OneProperties, params?: OneParams): Promise<AnyEntity>
    upsert(properties: OneProperties, params?: OneParams): Promise<AnyEntity>
}

type ExtractModel<M> = M extends Entity<infer X> ? X : never
type GetKeys<T> = T extends T ? keyof T : never

/*
    Create the type for create properties.
    Allow, but not require: generated, defaulted and value templates
    Require all other required properties and allow all optional properties

    type EntityParametersForCreate<M extends OneModel> = Required<M> & Optional<M>
*/
type EntityParametersForCreate<T extends OneModel> = Omit<
    Omit<Omit<Omit<Required<T>, GetKeys<Defaulted<T>>>, GetKeys<Generated<T>>>, GetKeys<ValueTemplates<T>>>,
    GetKeys<TimestampValue<T>>
> &
    Optional<T> &
    Partial<Generated<T>> &
    Partial<Defaulted<T>> &
    Partial<ValueTemplates<T>> &
    Partial<TimestampValue<T>>

type EntityParametersForUpdate<T extends OneModel> = Partial<Required<T> & OptionalOrNull<T>>

type TransactionalOneParams = OneParams & {transaction: object}

export class Model<T> {
    constructor(table: any, name: string, options?: ModelConstructorOptions)
    create(properties: EntityParametersForCreate<ExtractModel<T>>, params?: OneParams): Promise<T>
    find(properties?: EntityParametersForFind<T>, params?: OneParams): Promise<Paged<T>>
    get(properties: EntityParameters<T>, params?: OneParams): Promise<T | undefined>
    load(properties: EntityParameters<T>, params?: OneParams): Promise<T | undefined>
    init(properties?: EntityParameters<T>, params?: OneParams): T
    remove(properties: EntityParameters<T>, params?: OneParams): Promise<T | Array<T> | undefined>
    scan(properties?: EntityParameters<T>, params?: OneParams): Promise<Paged<T>>
    update(properties: EntityParametersForUpdate<ExtractModel<T>>, params?: OneParams): Promise<T>
    upsert(properties: EntityParameters<T>, params?: OneParams): Promise<T>
    check(properties: EntityParameters<T>, params: TransactionalOneParams): void
}
