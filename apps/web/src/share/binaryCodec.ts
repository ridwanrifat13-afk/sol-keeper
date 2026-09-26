/**
 * M10.5: a hand-rolled varint + base64url codec — user decision: no compression dependency
 * for the shareable run link's input-log fragment (measured 660-1800 base64url chars
 * worst-case realistic play; compression buys nothing at that size). Just the two small,
 * generic primitives a compact byte-oriented wire format needs; `RunInput`-specific framing
 * lives in `runLink.ts`.
 */

/** Appends a non-negative integer to `bytes` as an unsigned LEB128 varint (7 payload bits per
 *  byte, high bit set on every byte but the last) — the standard, simplest variable-length
 *  encoding, chosen so small numbers (most hours, most enum indices) cost one byte. */
export function writeVarint(bytes: number[], value: number): void {
  let v = value >>> 0;
  while (v >= 0x80) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v);
}

/** A forward-only cursor over a decoded byte array. Every read is bounds-checked and throws
 *  on underrun, so a truncated or hand-edited link fails loudly (as "invalid") rather than
 *  reading past the buffer or silently returning zeroes. */
export class ByteReader {
  private pos = 0;
  constructor(private readonly bytes: Uint8Array) {}

  get remaining(): number {
    return this.bytes.length - this.pos;
  }

  readByte(): number {
    if (this.pos >= this.bytes.length) throw new Error("unexpected end of input");
    return this.bytes[this.pos++]!;
  }

  /** The signed-shift dance below caps at 5 bytes (35 payload bits) — more than a uint32
   *  ever needs — so a corrupted stream with its continuation bit stuck on can't spin forever. */
  readVarint(): number {
    let result = 0;
    let shift = 0;
    for (;;) {
      const byte = this.readByte();
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result >>> 0;
      shift += 7;
      if (shift > 28) throw new Error("varint too long");
    }
  }
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const DECODE_MAP: ReadonlyMap<string, number> = new Map(
  [...ALPHABET].map((char, index) => [char, index]),
);

/** Standard base64url (RFC 4648 §5), unpadded — a URL fragment never needs the `=` padding
 *  base64 uses to round out multiples of 4 characters, since the decoder below already knows
 *  the byte length from how many 6-bit groups it accumulates. */
export function toBase64Url(bytes: readonly number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += ALPHABET[b0 >> 2];
    out += ALPHABET[((b0 & 0x03) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    if (b1 !== undefined) out += ALPHABET[((b1 & 0x0f) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    if (b2 !== undefined) out += ALPHABET[b2 & 0x3f];
  }
  return out;
}

/** Throws on any character outside the base64url alphabet — a hand-edited or truncated
 *  fragment fails here rather than silently decoding to the wrong bytes. */
export function fromBase64Url(text: string): Uint8Array {
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = DECODE_MAP.get(char);
    if (value === undefined) throw new Error(`invalid base64url character "${char}"`);
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}
