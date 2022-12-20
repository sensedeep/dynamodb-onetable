/*
    Wrapper for dynamo-db-local for TypeScript
    Should really add this to @types
 */

export class DbLocal {
    spawn({port: number}): number
}
export default new DbLocal()
