/*
    Table.d.ts -- Hand crafted type defintions for Table
*/

import { AnyEntity, AnyModel, Model, OneParams, OneProperties, OneModelSchema, OneSchema, Paged} from "./Model";

export type EntityGroup = {
    [key: string]: AnyEntity[]
};

type TableConstructorParams = {
    client?: {},                    //  Instance of DocumentClient or Dynamo.
    createdField?: string,          //  Name of "created" timestamp attribute.
    crypto?: {},                    //  Crypto configuration.
    delimiter?: string,             //  Composite sort key delimiter (default ':').
    generic?: boolean,              //  Create a generic (low-level) raw model. Default false.
    hidden?: boolean,               //  Hide key attributes in Javascript properties. Default false.
    isoDates?: boolean,             //  Set to true to store dates as Javascript ISO Date strings.

    logger?: boolean | ((tag: string, message: string, context: {}) => void),      // Logging callback

    //  Intercept table reads and writes
    intercept?: (model: AnyModel, op: string, rec: {}, params: OneParams, raw?: {}) => void,
    name?: string,                  //  Table name.
    nulls?: boolean,                //  Store nulls in database attributes. Default false.
    schema?: OneSchema,             //  Table models schema.
    senselogs?: {},                 //  SenseLogs instance for logging
    timestamps?: boolean,           //  Make "created" and "updated" timestamps. Default true.
    typeField?: string,             //  Name of model type attribute. Default "_type".
    updatedField?: string,          //  Name of "updated" timestamp attribute.
    uuid?: (() => string) | string, //  Function to create a UUID if field schema requires it.

    //  Deprecated - use uuid == 'ulid'
    ulid?: () => string,    //  Function to create a ULID if field schema requires it.
    ksuid?: () => string,   //  Function to create a KSUID if field schema requires it.
};

export class Table {
    name: string;
    constructor(params: TableConstructorParams);

    addContext(context?: {}): Table;
    addModel(name: string, fields: OneModelSchema): void;

    batch(op: string, batch: any, params?: OneParams): Promise<{}[]>;
    clearContext(): Table;
    createTable(params?: {}): Promise<{}>;
    deleteTable(confirmation: string): Promise<{}>;
    exists(): Promise<Boolean>;
    describeTable(): Promise<{}>;
    getContext(): {};
    getLog(): any;
    getModel<T>(name: string): Model<T>;
    getSchema(): {};
    groupByType(items: AnyEntity[]): EntityGroup;
    listModels(): AnyModel[];
    listTables(): string[];
    makeID(): {};
    removeModel(name: string): void;
    setClient(client: {}): void;
    setContext(context?: {}, merge?: boolean): Table;
    setLog(log: any): void;
    transact(op: string, transaction: any, params?: OneParams): Promise<void>;
    uuid(): {};

    deleteItem(properties: OneProperties, params?: OneParams): Promise<void>;
    getItem(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    putItem(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    queryItems(properties: OneProperties, params?: OneParams): Promise<Paged<AnyEntity[]>>;
    scanItems(properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity[]>>;
    updateItem(properties: OneProperties, params?: OneParams): Promise<AnyEntity>;

    create(modelName: string, properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    find(modelName: string, properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity[]>>;
    get(modelName: string, properties: OneProperties, params?: OneParams): Promise<AnyEntity>;
    remove(modelName: string, properties: OneProperties, params?: OneParams): Promise<void>;
    scan(modelName: string, properties?: OneProperties, params?: OneParams): Promise<Paged<AnyEntity[]>>;
    update(modelName: string, properties: OneProperties, params?: OneParams): Promise<AnyEntity>;

    fetch(models: string[], properties?: OneProperties, params?: OneParams): Promise<EntityGroup>;

    //  DEPRECATED
    batchGet(batch: any, params?: OneParams): Promise<{}[]>;
    batchWrite(batch: any, params?: OneParams): Promise<{}>;
}
