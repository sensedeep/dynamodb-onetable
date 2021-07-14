/*
    Model.d.ts -- Hand crafted type definitions for Model

    Supports dynamic definition of types based on the Schema.js
*/

/*
    Possible types for a schema field "type" property
 */
type OneType =
    ArrayConstructor |
    BooleanConstructor |
    DateConstructor |
    NumberConstructor |
    ObjectConstructor |
    SetConstructor |
    StringConstructor |
    Buffer |
    string;

/*
    Schema.indexes signature
 */
type OneIndexSchema = {
    hash?: string,
    sort?: string,
    description?: string,
    project?: string | string[],
    follow?: boolean,
};

/*
    Schema.models.Model.Field signature
 */
type OneFieldSchema = {
    crypt?: boolean,
    default?: (() => any) | string | number | boolean | object,
    enum?: string[],
    filter?: boolean,
    hidden?: boolean,
    map?: string,
    nulls?: boolean,
    required?: boolean,
    transform?: (model: AnyModel, op: string, name: string, value: any) => any,
    type: OneType,
    unique?: boolean,
    uuid?: boolean | string,
    validate?: RegExp | string | ((model: AnyModel, field: {}, value: any) => any),
    value?: ((name: string, context: {}, properties: {}) => any) | string,

    //  Deprecated
    ulid?: boolean,
    ksuid?: boolean,
};

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
    models?: {
        [key: string]: OneModelSchema
    },
    indexes?: {
        [key: string]: OneIndexSchema
    },
};

/*
    Schema field with required "type" property
 */
type OneTypedField = {
    type: OneType
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
    : T['type'] extends SetConstructor ? Date
    : T['type'] extends StringConstructor ? string
    : never;

/*
    Entities are objects whoes signature is based on the schema model of the same name.
 */
export type Entity<T extends OneTypedModel> = {
    [P in keyof T]?: EntityField<T[P]>
};

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
    delete?: object,
    execute?: boolean,
    exists?: boolean,
    fields?: string[],
    follow?: boolean,
    hidden?: boolean,
    index?: string,
    limit?: number,
    log?: boolean,
    many?: boolean,
    maxPages?: number,
    metrics?: object,
    parse?: boolean,
    postFormat?: () => {},
    preFormat?: () => {},
    remove?: string[],
    return?: string,
    reverse?: boolean,
    segment?: number,
    segments?: number,
    set?: object,
    start?: object,
    throw?: boolean,
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

export class Paged<T> extends Array {
    start: string;
    //  DEPRECATED
    next: () => Promise<Paged<T>>;
}

export type AnyModel = {
    constructor(table: any, name: string, options?: ModelConstructorOptions): AnyModel;
    create(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    find(properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity[]>>;
    get(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    remove(properties: OneProperties, params?: OneParams): Promise<void>;
    scan(properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity[]>>;
    update(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    deleteItem(properties: OneProperties, params?: OneParams): Promise<void>;
    getItem(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    putItem(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    queryItems(properties: OneProperties, params?: OneParams): Promise<Paged<AnyEntity[]>>;
    scanItems(properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity[]>>;
    updateItem(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
};

export class Model<T> {
    constructor(table: any, name: string, options?: ModelConstructorOptions);
    create(properties: T, params?: OneParams): Promise<T>;
    find(properties?: T, params?: OneParams): Promise<Paged<T[]>>;
    get(properties: T, params?: OneParams): Promise<T>;
    remove(properties: T, params?: OneParams): Promise<void>;
    scan(properties?: T, params?: OneParams): Promise<Paged<T[]>>;
    update(properties: T, params?: OneParams): Promise<T>;
}
