
import { AnyModel, Model, OneParams, OneProperties, OneModelSchema, OneSchema } from "./Model";

type TableConstructorParams = {
    client?: {},            //  Instance of DocumentClient or Dynamo.
    createdField?: string,  //  Name of "created" timestamp attribute.
    crypto?: any,           //  Crypto configuration.
    delimiter?: string,     //  Composite sort key delimiter (default ':').
    hidden?: boolean,       //  Hide key attributes in Javascript properties. Default false.
    isoDates?: boolean,     //  Set to true to store dates as Javascript ISO Date strings.
    ksuid?: () => string,   //  Function to create a KSUID if field schema requires it.

    //TODO - should take log info|error as param
    logger?: any,           //  Logging function

    intercept?: (model: Model, op: string, rec: {}, params: OneParams, raw?: {}) => void,
    name?: string,          //  Table name.
    nulls?: boolean,        //  Store nulls in database attributes. Default false.
    schema?: OneSchema,     //  Table models schema.
    timestamps?: boolean,   //  Make "created" and "updated" timestamps. Default true.
    typeField?: string,     //  Name of model type attribute. Default "_type".
    updatedField?: string,  //  Name of "updated" timestamp attribute.
    ulid?: () => string,    //  Function to create a ULID if field schema requires it.
    uuid?: () => string,    //  Function to create a UUID if field schema requires it.
}

export class Table {
    constructor(params: TableConstructorParams)

    addModel(name: string, fields: OneModelSchema): void;
    batchGet(batch: any, params?: {}): Promise<{}[]>;
    batchWrite(batch: any, params?: {}): Promise<{}>;
    clear(): Table;
    create(modelName: string, properties: OneProperties, params: OneParams): Promise<{}>;
    deleteItem(properties: OneProperties, params: OneParams): Promise<void>;
    find(modelName: string, properties: OneProperties, params: OneParams): Promise<{}[]>;
    get(modelName: string, properties: OneProperties, params: OneParams): Promise<{}>;
    getItem(properties: OneProperties, params: OneParams): Promise<{}>;
    getModel(name: string): AnyModel;
    groupByType(items: {}[]): {};
    listModels(): AnyModel[];
    putItem(properties: OneProperties, params: OneParams): Promise<{}>;
    queryItems(properties: OneProperties, params: OneParams): Promise<{}[]>;
    remove(modelName: string, properties: OneProperties, params: OneParams): Promise<void>;
    removeModel(name: string): void;
    scan(modelName: string, properties: OneProperties, params: OneParams): Promise<{}[]>;
    scanItems(properties: OneProperties, params: OneParams): Promise<{}[]>;
    setContext(context?: {}, merge?: boolean): Table;
    transact(op: string, transaction: any, params?: {}): Promise<void>;
    update(modelName: string, properties: OneProperties, params: OneParams): Promise<{}>;
    updateItem(properties: OneProperties, params: OneParams): Promise<{}>;
}
