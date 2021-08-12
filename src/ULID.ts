/*
    ULID.ts -- Universal Unique Lexicographically Sortable Identifier
    https://github.com/ulid/spec
 */
import Crypto from "crypto";

//  Repeat Z to make encoding faster for rand == 0xFF
const Letters = "0123456789ABCDEFGHIJKMNPQRSTVWXYZZ";
const LettersLen = Letters.length - 1;
const RandomLength = 16;
const TimeLen = 10;

export default class ULID {
  when: Date;
  constructor(when: string | number) {
    this.when = typeof when === "string" ? new Date() : new Date(when);
  }

  toString(): string {
    return this.getTime(this.when) + this.getRandom();
  }

  decode(ulid: any) {
    const ulidStr: string = ulid.toString();
    if (ulidStr.length !== TimeLen + RandomLength) {
      throw new Error("Invalid ULID");
    }
    let letters = ulidStr.substr(0, TimeLen).split("").reverse();
    return letters.reduce((accum, c, index) => {
      let i = Letters.indexOf(c);
      if (i < 0) {
        throw new Error(`Invalid ULID char ${c}`);
      }
      accum += index * Math.pow(LettersLen, i);
      return accum;
    }, 0);
  }

  getRandom(): string {
    let bytes = [];
    let buffer = Crypto.randomBytes(RandomLength);
    for (let i = 0; i < RandomLength; i++) {
      //  Letters is one longer than LettersLen
      bytes[i] = Letters[Math.floor((buffer.readUInt8(i) / 0xff) * LettersLen)];
    }
    return bytes.join("");
  }

  getTime(now: any): string {
    let bytes = [];
    for (let i = 0; i < TimeLen; i++) {
      let mod = now % LettersLen;
      bytes[i] = Letters.charAt(mod);
      now = (now - mod) / LettersLen;
    }
    return bytes.join("");
  }
}
