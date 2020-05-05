/**
 * This file is NOT inteded to be used directly with other parts of
 * the source code. See --pre-js option for emcc Emscripten compiler.
 *
 * This code allow us to use the Filesystem API outside of the Emscripten module
 * Note: The Emscripten module will be ES6-modularized with -s MODULARIZE=1
 * -s EXPORT_ES6=1 options. See Makefile.
 */
/// <reference types="emscripten" />

/* eslint-disable dot-notation, no-undef */
Module['NULL'] = 0;
Module['onRuntimeInitialized'] = function () {
  // Used as a temporary pointer
  Module['tempInt32'] = stackAlloc(4);

  // SQLite3
  Module['sqlite3_open'] = cwrap('sqlite3_open', 'number', ['string', 'number']);
  Module['sqlite3_close_v2'] = cwrap('sqlite3_close_v2', 'number', ['number']);
  Module['sqlite3_exec'] = cwrap('sqlite3_exec', 'number', ['number', 'string', 'number', 'number', 'number']);
  Module['sqlite3_free'] = cwrap('sqlite3_free', null, ['number']);
  Module['sqlite3_changes'] = cwrap('sqlite3_changes', 'number', ['number']);
  Module['sqlite3_prepare_v2'] = cwrap('sqlite3_prepare_v2', 'number', ['number', 'string', 'number', 'number', 'number']);
  Module['sqlite3_prepare_v2_sqlptr'] = cwrap('sqlite3_prepare_v2', 'number', ['number', 'number', 'number', 'number', 'number']);
  Module['sqlite3_bind_text'] = cwrap('sqlite3_bind_text', 'number', ['number', 'number', 'number', 'number', 'number']);
  Module['sqlite3_bind_blob'] = cwrap('sqlite3_bind_blob', 'number', ['number', 'number', 'number', 'number', 'number']);
  Module['sqlite3_bind_double'] = cwrap('sqlite3_bind_double', 'number', ['number', 'number', 'number']);
  Module['sqlite3_bind_int'] = cwrap('sqlite3_bind_int', 'number', ['number', 'number', 'number']);
  Module['sqlite3_bind_parameter_index'] = cwrap('sqlite3_bind_parameter_index', 'number', ['number', 'string']);
  Module['sqlite3_step'] = cwrap('sqlite3_step', 'number', ['number']);
  Module['sqlite3_errmsg'] = cwrap('sqlite3_errmsg', 'string', ['number']);
  Module['sqlite3_data_count'] = cwrap('sqlite3_data_count', 'number', ['number']);
  Module['sqlite3_column_double'] = cwrap('sqlite3_column_double', 'number', ['number', 'number']);
  Module['sqlite3_column_text'] = cwrap('sqlite3_column_text', 'string', ['number', 'number']);
  Module['sqlite3_column_blob'] = cwrap('sqlite3_column_blob', 'number', ['number', 'number']);
  Module['sqlite3_column_bytes'] = cwrap('sqlite3_column_bytes', 'number', ['number', 'number']);
  Module['sqlite3_column_type'] = cwrap('sqlite3_column_type', 'number', ['number', 'number']);
  Module['sqlite3_column_name'] = cwrap('sqlite3_column_name', 'string', ['number', 'number']);
  Module['sqlite3_reset'] = cwrap('sqlite3_reset', 'number', ['number']);
  Module['sqlite3_clear_bindings'] = cwrap('sqlite3_clear_bindings', 'number', ['number']);
  Module['sqlite3_finalize'] = cwrap('sqlite3_finalize', 'number', ['number']);
  Module['sqlite3_create_function_v2'] = cwrap('sqlite3_create_function_v2', 'number', ['number', 'string', 'number', 'number', 'number', 'number', 'number', 'number', 'number']);
  Module['sqlite3_value_type'] = cwrap('sqlite3_value_type', 'number', ['number']);
  Module['sqlite3_value_bytes'] = cwrap('sqlite3_value_bytes', 'number', ['number']);
  Module['sqlite3_value_text'] = cwrap('sqlite3_value_text', 'string', ['number']);
  Module['sqlite3_value_int'] = cwrap('sqlite3_value_int', 'number', ['number']);
  Module['sqlite3_value_blob'] = cwrap('sqlite3_value_blob', 'number', ['number']);
  Module['sqlite3_value_double'] = cwrap('sqlite3_value_double', 'number', ['number']);
  Module['sqlite3_result_double'] = cwrap('sqlite3_result_double', null, ['number', 'number']);
  Module['sqlite3_result_null'] = cwrap('sqlite3_result_null', null, ['number']);
  Module['sqlite3_result_text'] = cwrap('sqlite3_result_text', null, ['number', 'string', 'number', 'number']);
  Module['sqlite3_result_blob'] = cwrap('sqlite3_result_blob', null, ['number', 'number', 'number', 'number']);
  Module['sqlite3_result_int'] = cwrap('sqlite3_result_int', null, ['number', 'number']);
  Module['sqlite3_result_int64'] = cwrap('sqlite3_result_int64', null, ['number', 'number']);
  Module['sqlite3_result_error'] = cwrap('sqlite3_result_error', null, ['number', 'string', 'number']);
};
/* eslint-enable dot-notation, no-undef */
