export function UID(size: number): string
export class ULID {
    constructor(when?: string | number | Date)
    when: Date
    toString(): string
    decode(ulid: string | ULID): number
    getRandom(): string
    getTime(now: Date): string
}
export function UUID(): string