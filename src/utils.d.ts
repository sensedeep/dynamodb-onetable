type UndefinedProperties<T> = {
    [P in keyof T]-?: undefined extends T[P] ? P : never
}[keyof T]

export type UndefinedToOptional<T> = Partial<Pick<T, UndefinedProperties<T>>> & Pick<T, Exclude<keyof T, UndefinedProperties<T>>>