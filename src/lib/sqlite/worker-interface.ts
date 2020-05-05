import type {
  QueryResult,
  ReturnMap,
  ParameterArray,
  ParameterMap,
} from './sqlite3-types';

export interface Query {
  sql: string;
  params?: ParameterArray | ParameterMap;
}

export namespace WorkerMessage {
  export type Command =
    | InitCommand
    | OpenCommand
    | ExecCommand
    | EachCommand
    | ExportCommand
    | CloseCommand;
  export type Response =
    | InitResponse
    | OpenResponse
    | ExecResponse
    | EachResponse
    | ExportResponse
    | CloseResponse;

  interface InitCommand {
    command: 'init';
    wasmBinary: ArrayBuffer;
  }
  interface InitResponse {
    respondTo: InitCommand['command'];
    success: boolean;
  }

  interface OpenCommand {
    command: 'open';
    dbBinary: ArrayBuffer;
  }
  interface OpenResponse {
    respondTo: OpenCommand['command'];
    success: boolean;
  }

  interface ExecCommand extends Query {
    command: 'exec';
  }
  interface ExecResponse {
    respondTo: ExecCommand['command'];
    results: QueryResult[];
  }

  interface EachCommand extends Required<Query> {
    command: 'each';
  }
  interface EachResponse {
    respondTo: EachCommand['command'];
    row: ReturnMap;
    end: boolean;
  }

  interface ExportCommand {
    command: 'export';
  }
  interface ExportResponse {
    respondTo: ExportCommand['command'];
    buffer: ArrayBuffer;
  }

  interface CloseCommand {
    command: 'close';
  }
  interface CloseResponse {
    respondTo: CloseCommand['command'];
    success: boolean;
  }
}
