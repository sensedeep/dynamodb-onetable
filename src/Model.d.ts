/*
    Model.d.ts -- Hand crafted type definitions for Model

    Supports dynamic definition of types based on the Schema.js
*/
import { Expression } from './Expression'
import { UndefinedToOptional } from './utils';

/*
    Possible types for a schema field "type" property
 */
type OneType =
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
interface OneFieldSchema extends OneTypedField {
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
    value?: string,
}

/*
    Schema.models signature
 */
export type OneModelSchema = {
    [key: string]: OneFieldSchema
};

/*
    Schema signature
 */
type OneSchema = {
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
    Schema field with "type" property
 */
type OneTypedField = {
    type: OneType,
    required?: boolean
};

/*
    Schema Model of fields with a type property
 */
type OneTypedModel = Record<string, OneTypedField>;

/*
    Entity field signature generated from the schema
 */
type EntityField<T extends OneTypedField> =
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
    Entities are typed objects whoes signature is based on the schema model of the same name.
    In the example below UndefinedToOptional takes properties from an object that can be undefined and makes the property optional.
    T[P]['required'] represents the value of a given property and T[P]['required'] extends true is kind of checking if the value
    is true.
    If the value is true then the value must be required and therefore it is not optional and can only be of the expected type.
    If the value is false then it can be of the expected type or underfined which will then be taken by UndefinedToOptional and
    made optional.
 */
export type Entity<T extends OneTypedModel> = UndefinedToOptional<{
    [P in keyof T]: T[P]['required'] extends true ? EntityField<T[P]> : EntityField<T[P]> | undefined
}>

/*
    Entity Parameters are partial Entities.  Useful for search, update parameters.
 */
export type EntityParameters<Entity> = Partial<Entity>

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
    preFormat?: (model: AnyModel, expression: Expression<AnyModel>) => void,
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
    // value?: (name: string, properties: OneProperties) => any,
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
    find(properties?: EntityParameters<T>, params?: OneParams): Promise<Paged<T>>;
    get(properties: EntityParameters<T>, params?: OneParams): Promise<T | undefined>;
    init(properties?: EntityParameters<T>, params?: OneParams): T;
    remove(properties: EntityParameters<T>, params?: OneParams): Promise<void>;
    scan(properties?: EntityParameters<T>, params?: OneParams): Promise<Paged<T>>;
    update(properties: EntityParameters<T>, params?: OneParams): Promise<T>;
}
