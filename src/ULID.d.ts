export default class ULID {
    constructor(when?: string | number | Date);
    when: Date;
    toString(): string;
    decode(ulid: ULID): number;
    getRandom(): string;
    getTime(now: Date): string;
}
