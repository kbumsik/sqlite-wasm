/**
 * Trible slash reference is used to explicitly prevent generating
 * import statement on JS side.
 */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="emscripten" />

export interface SQLite3Wasm extends EmscriptenModule {
  // [TODO] Tye every functions properly
  sqlite3_open: Function;
  sqlite3_exec: Function;
  sqlite3_free: Function;
  sqlite3_errmsg: Function;
  sqlite3_changes: Function;
  sqlite3_prepare_v2: Function;
  sqlite3_prepare_v2_sqlptr: Function;
  sqlite3_bind_text: Function;
  sqlite3_bind_blob: Function;
  sqlite3_bind_double: Function;
  sqlite3_bind_int: Function;
  sqlite3_bind_parameter_index: Function;
  sqlite3_step: Function;
  sqlite3_data_count: Function;
  sqlite3_column_double: Function;
  sqlite3_column_text: Function;
  sqlite3_column_blob: Function;
  sqlite3_column_bytes: Function;
  sqlite3_column_type: Function;
  sqlite3_column_name: Function;
  sqlite3_reset: Function;
  sqlite3_clear_bindings: Function;
  sqlite3_finalize: Function;
  sqlite3_close_v2: Function;
  sqlite3_create_function_v2: Function;
  sqlite3_value_bytes: Function;
  sqlite3_value_type: Function;
  sqlite3_value_text: Function;
  sqlite3_value_int: Function;
  sqlite3_value_blob: Function;
  sqlite3_value_double: Function;
  sqlite3_result_double: Function;
  sqlite3_result_null: Function;
  sqlite3_result_text: Function;
  sqlite3_result_blob: Function;
  sqlite3_result_int: Function;
  sqlite3_result_int64: Function;
  sqlite3_result_error: Function;

  // Emscripten runtime functions from exported_runtime_methods.json
  cwrap: typeof cwrap;
  FS: FS;
  allocate: typeof allocate;
  stackAlloc: typeof stackAlloc;
  stackSave: typeof stackSave;
  stackRestore: typeof stackRestore;
  getValue: typeof getValue;
  setValue: typeof setValue;
  intArrayFromString: typeof intArrayFromString;
  allocateUTF8OnStack: typeof allocateUTF8OnStack;
  UTF8ToString: typeof UTF8ToString;
  addFunction: typeof addFunction;
  removeFunction: typeof removeFunction;
  ALLOC_NORMAL: typeof ALLOC_NORMAL;

  // Extra fields by -post-js.js
  NULL: number; // 0
  tempInt32: number; // A temporary pointer located in stack.
}

declare const sqlite3Wasm: SQLite3Wasm;
export default sqlite3Wasm;
