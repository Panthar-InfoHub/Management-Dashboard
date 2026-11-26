// Shared type helpers. Client-safe: types only.

/** What a value looks like after JSON round-tripping (server → client props): Dates become strings. */
export type Jsonify<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;
