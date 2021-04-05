export default class ULID {
    constructor(when: any);
    when: Date;
    toString(): string;
    decode(ulid: any): any;
    getRandom(): string;
    getTime(now: any): string;
}
