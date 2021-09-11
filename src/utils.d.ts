/*
    utils.d.ts -- Selects properties that can be undefined
*/
type UndefinedProperties<T> = {
    [P in keyof T]-?: undefined extends T[P] ? P : never
}[keyof T]

/*
    Uses UndefinedProperties to get which properties can be undefined, picks and passing them to Partial making them optional
    then excludes those undefined properties from the orginal object to only have the required properties.
    The result of merging these two objects end up being the original object with those properties that can be undefined marked as optional.
*/
export type UndefinedToOptional<T> = Partial<Pick<T, UndefinedProperties<T>>> & Pick<T, Exclude<keyof T, UndefinedProperties<T>>>
