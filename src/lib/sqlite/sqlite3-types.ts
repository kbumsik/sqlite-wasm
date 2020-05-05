type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array;

export type NumberedArray = TypedArray | number[];

export type SQLParameterType = string | number | boolean | NumberedArray | null;
export type ParameterMap = Record<string, SQLParameterType>;
export type ParameterArray = SQLParameterType[];

export type SQLReturnType = string | number | Uint8Array | null;
export type ReturnMap = Record<string, SQLReturnType>;
export interface QueryResult {
  columns: string[];
  values: SQLReturnType[][];
}

export enum ReturnCode {
  OK = 0,
  ERROR = 1,
  INTERNAL = 2,
  PERM = 3,
  ABORT = 4,
  BUSY = 5,
  LOCKED = 6,
  NOMEM = 7,
  READONLY = 8,
  INTERRUPT = 9,
  IOERR = 10,
  CORRUPT = 11,
  NOTFOUND = 12,
  FULL = 13,
  CANTOPEN = 14,
  PROTOCOL = 15,
  EMPTY = 16,
  SCHEMA = 17,
  TOOBIG = 18,
  CONSTRAINT = 19,
  MISMATCH = 20,
  MISUSE = 21,
  NOLFS = 22,
  AUTH = 23,
  FORMAT = 24,
  RANGE = 25,
  NOTADB = 26,
  NOTICE = 27,
  WARNING = 28,

  ROW = 100,
  DONE = 101,

  INTEGER = 1,
  FLOAT = 2,
  TEXT = 3,
  BLOB = 4,
  NULL = 5,

  UTF8 = 1,
}
