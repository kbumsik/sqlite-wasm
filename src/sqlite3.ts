import { SQLite3Wasm } from './sqlite3-emscripten';
import {
  NumberedArray,
  SQLParameterType,
  ParameterArray,
  ParameterMap,
  SQLReturnType,
  ReturnMap,
  QueryResult,
  ReturnCode,
} from './sqlite3-types';

// Emscripten's (or WebAssembly in general) pointer type is essentially uint32.
type Pointer = number;

/* Represents a prepared statement.

Prepared statements allow you to have a template sql string,
that you can execute multiple times with different parameters.

You can't instantiate this class directly, you have to use a [Database](Database.html)
object in order to create a statement.

**Warning**: When you close a database (using db.close()), all its statements are
closed too and become unusable.

@see Database.html#prepare-dynamic
@see https://en.wikipedia.org/wiki/Prepared_statement
  */
class Statement {
  private readonly wasm: SQLite3Wasm;
  private stmt: Pointer;
  private readonly db: Database;
  private pos: number;
  private readonly allocatedmem: Pointer[];

  public constructor (stmt: Pointer, db: Database) {
    this.wasm = db.wasm;
    this.stmt = stmt;
    this.db = db;
    this.pos = 1;
    this.allocatedmem = [];
  }

  /* Bind values to the parameters, after having reseted the statement

  SQL statements can have parameters, named *'?', '?NNN', ':VVV', '@VVV', '$VVV'*,
  where NNN is a number and VVV a string.
  This function binds these parameters to the given values.

  *Warning*: ':', '@', and '$' are included in the parameters names

  ## Binding values to named parameters
  @example Bind values to named parameters
      var stmt = db.prepare("UPDATE test SET a=@newval WHERE id BETWEEN $mini AND $maxi");
      stmt.bind({$mini:10, $maxi:20, '@newval':5});
  - Create a statement that contains parameters like '$VVV', ':VVV', '@VVV'
  - Call Statement.bind with an object as parameter

  ## Binding values to parameters
  @example Bind values to anonymous parameters
      var stmt = db.prepare("UPDATE test SET a=? WHERE id BETWEEN ? AND ?");
      stmt.bind([5, 10, 20]);
    - Create a statement that contains parameters like '?', '?NNN'
    - Call Statement.bind with an array as parameter

  ## Value types
  Javascript type   | SQLite type
  ---               | ---
  number            | REAL, INTEGER
  boolean           | INTEGER
  string            | TEXT
  Array, Uint8Array | BLOB
  null              | NULL
  @see http://www.sqlite.org/datatype3.html

  @see http://www.sqlite.org/lang_expr.html#varparam
  @param values [Array,Object] The values to bind
  @throw [String] SQLite Error
    */
  public bind (values: ParameterArray | ParameterMap): void {
    // eslint-disable-next-line no-shadow
    const bindFromArray = (values: ParameterArray): void => {
      values.forEach((value, i) => {
        this.bindValue(value, i + 1);
      });
    };

    const bindFromObject = (valuesObj: ParameterMap): void => {
      for (const [name, value] of Object.entries(valuesObj)) {
        const num = this.wasm.sqlite3_bind_parameter_index(this.stmt, name);
        if (num !== 0) {
          this.bindValue(value, num);
        }
      }
    };

    // Code
    if (!this.stmt) {
      throw new Error('Statement closed');
    }
    this.reset();
    if (Array.isArray(values)) {
      bindFromArray(values);
    } else {
      bindFromObject(values);
    }
    return;
  }

  private bindValue (val: SQLParameterType, pos: number = this.pos++): void {
    // Nested functions
    /* eslint-disable no-shadow */
    const bindString = (str: string, pos: number = this.pos++): void => {
      const bytes = this.wasm.intArrayFromString(str);
      const strPtr = this.wasm.allocate(bytes, 'i8', this.wasm.ALLOC_NORMAL);
      this.allocatedmem.push(strPtr);
      this.db.handleError(this.wasm.sqlite3_bind_text(this.stmt, pos, strPtr, bytes.length - 1, 0));
    };

    const bindBlob = (array: NumberedArray, pos: number = this.pos++): void => {
      const blobPtr = this.wasm.allocate(array, 'i8', this.wasm.ALLOC_NORMAL);
      this.allocatedmem.push(blobPtr);
      this.db.handleError(this.wasm.sqlite3_bind_blob(this.stmt, pos, blobPtr, array.length, 0));
    };

    const bindNumber = (num: number, pos: number = this.pos++): void => {
      // eslint-disable-next-line no-bitwise
      const bindfunc = num === (num | 0) ? this.wasm.sqlite3_bind_int : this.wasm.sqlite3_bind_double;
      this.db.handleError(bindfunc(this.stmt, pos, num));
    };

    const bindNull = (pos: number = this.pos++): void => {
      this.db.handleError(this.wasm.sqlite3_bind_blob(this.stmt, pos, 0, 0, 0));
    };
    /* eslint-enable no-shadow */

    // Code
    switch (typeof val) {
      case 'string':
        bindString(val, pos);
        break;
      case 'number':
      case 'boolean':
        bindNumber((val as number) + 0, pos);
        break;
      case 'object':
        if (val === null) {
          bindNull(pos);
        } else if (Array.isArray(val)) {
          bindBlob(val, pos);
        } else {
          throw new Error(`Wrong API use : tried to bind a value of an unknown type (${val}).`);
        }
        break;
      default:
        throw new Error(`Wrong API use : tried to bind a value of an unknown type (${val}).`);
    }
    return;
  }

  /* Execute the statement, fetching the the next line of result,
  that can be retrieved with [Statement.get()](#get-dynamic) .

  @return [Boolean] true if a row of result available
  @throw [String] SQLite Error
    */
  public step (): boolean {
    if (!this.stmt) {
      throw new Error('Statement closed');
    }
    this.pos = 1;
    const ret = this.wasm.sqlite3_step(this.stmt);
    switch (ret) {
      case ReturnCode.ROW:
        return true;
      case ReturnCode.DONE:
        return false;
      default:
        this.db.handleError(ret);
        return false;
    }
  }

  /* Get one row of results of a statement.
  If the first parameter is not provided, step must have been called before get.
  @param [Array,Object] Optional: If set, the values will be bound to the statement, and it will be executed
  @return [Array<String,Number,Uint8Array,null>] One row of result

  @example Print all the rows of the table test to the console

      var stmt = db.prepare("SELECT * FROM test");
      while (stmt.step()) console.log(stmt.get());
    */
  public get (params?: ParameterArray | ParameterMap): SQLReturnType[] {
    const getNumber = (pos: number = this.pos++): number => {
      return this.wasm.sqlite3_column_double(this.stmt, pos);
    };

    const getString = (pos: number = this.pos++): string => {
      // [TODO] What does it return, pointer or string?
      return this.wasm.sqlite3_column_text(this.stmt, pos);
    };

    const getBlob = (pos: number = this.pos++): Uint8Array => {
      const ptr: Pointer = this.wasm.sqlite3_column_blob(this.stmt, pos);
      const size: number = this.wasm.sqlite3_column_bytes(this.stmt, pos);
      return this.wasm.HEAPU8.subarray(ptr, ptr + size);
    };

    if (typeof params !== 'undefined') {
      this.bind(params);
      this.step();
    }
    const results: SQLReturnType[] = [];
    const colSize = this.wasm.sqlite3_data_count(this.stmt);
    for (let col = 0; col < colSize; col++) {
      switch (this.wasm.sqlite3_column_type(this.stmt, col)) {
        case ReturnCode.INTEGER:
        case ReturnCode.FLOAT:
          results.push(getNumber(col));
          break;
        case ReturnCode.TEXT:
          results.push(getString(col));
          break;
        case ReturnCode.BLOB:
          results.push(getBlob(col));
          break;
        default:
          results.push(null);
          break;
      }
    }
    return results;
  }

  /* Get the list of column names of a row of result of a statement.
  @return [Array<String>] The names of the columns
  @example

      var stmt = db.prepare("SELECT 5 AS nbr, x'616200' AS data, NULL AS null_value;");
      stmt.step(); // Execute the statement
      console.log(stmt.getColumnNames()); // Will print ['nbr','data','null_value']
    */
  public getColumnNames (): string[] {
    const results: string[] = [];
    const colSize = this.wasm.sqlite3_data_count(this.stmt);
    for (let col = 0; col < colSize; col++) {
      results.push(this.wasm.sqlite3_column_name(this.stmt, col));
    }
    return results;
  }

  /* Get one row of result as a javascript object, associating column names with
  their value in the current row.
  @param [Array,Object] Optional: If set, the values will be bound to the statement, and it will be executed
  @return [Object] The row of result
  @see [Statement.get](#get-dynamic)

  @example

      var stmt = db.prepare("SELECT 5 AS nbr, x'616200' AS data, NULL AS null_value;");
      stmt.step(); // Execute the statement
      console.log(stmt.getAsObject()); // Will print {nbr:5, data: Uint8Array([1,2,3]), null_value:null}
    */
  public getAsObject (params?: ParameterArray | ParameterMap): ReturnMap {
    const values = this.get(params);
    const names = this.getColumnNames();
    const rowObject: ReturnMap = {};
    names.forEach((name, i) => {
      rowObject[name] = values[i];
    });
    return rowObject;
  }

  /* Shorthand for bind + step + reset
  Bind the values, execute the statement, ignoring the rows it returns, and resets it
  @param [Array,Object] Value to bind to the statement
    */
  public run (values?: ParameterArray | ParameterMap) {
    if (typeof values !== 'undefined') {
      this.bind(values);
    }
    this.step();
    return this.reset();
  }

  /* Reset a statement, so that it's parameters can be bound to new values
  It also clears all previous bindings, freeing the memory used by bound parameters.
    */
  public reset (): boolean {
    this.freemem();
    return (
      this.wasm.sqlite3_clear_bindings(this.stmt) === ReturnCode.OK &&
      this.wasm.sqlite3_reset(this.stmt) === ReturnCode.OK
    );
  }

  /* Free the memory allocated during parameter binding
   */
  private freemem () {
    let mem;
    while ((mem = this.allocatedmem.pop())) {
      this.wasm._free(mem);
    }
    return null;
  }

  /* Free the memory used by the statement
  @return [Boolean] true in case of success
    */
  public free (): boolean {
    this.freemem();
    const res = this.wasm.sqlite3_finalize(this.stmt) === ReturnCode.OK;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.db.statements[this.stmt];
    this.stmt = this.wasm.NULL;
    return res;
  }
}

export class Database {
  public readonly wasm: SQLite3Wasm;
  private filename: string;
  private dbPtr: Pointer;
  private functions: {
    [functionPtrName: string]: Pointer;
  };

  public statements: {
    [stmtPtr: number]: Statement;
  };

  /**
   * @param data  Raw data buffer of the SQLite Database. If not provided,
   *              a new Database is created.
   */
  public constructor (wasm: SQLite3Wasm, data?: ArrayBufferView) {
    this.wasm = wasm;
    // eslint-disable-next-line no-bitwise
    this.filename = `dbfile_${(0xffffffff * Math.random()) >>> 0}`;
    if (typeof data !== 'undefined') {
      this.wasm.FS.createDataFile('/', this.filename, data, true, true);
    }
    this.handleError(this.wasm.sqlite3_open(`${this.filename}`, this.wasm.tempInt32));
    this.dbPtr = this.wasm.getValue(this.wasm.tempInt32, '*');
    // [TODO] Look into RegisterExtensionFunctions(this.db);
    this.statements = {};
    this.functions = {};
  }

  /* Execute an SQL query, ignoring the rows it returns.

  @param sql [String] a string containing some SQL text to execute
  @param params [Array] (*optional*) When the SQL statement contains placeholders, you can pass them in here. They will be bound to the statement before it is executed.

  If you use the params argument, you **cannot** provide an sql string that contains several
  queries (separated by ';')

  @example Insert values in a table
      db.run("INSERT INTO test VALUES (:age, :name)", {':age':18, ':name':'John'});

  @return [Database] The database object (useful for method chaining)
    */
  public run (sql: string, params?: ParameterArray | ParameterMap) {
    if (!this.dbPtr) {
      throw new Error('Database closed');
    }
    if (params) {
      const stmt = this.prepare(sql, params);
      try {
        stmt.step();
      } finally {
        stmt.free();
      }
    } else {
      this.handleError(this.wasm.sqlite3_exec(this.dbPtr, sql, 0, 0, this.wasm.tempInt32));
    }
    return this;
  }

  /* Execute an SQL query, and returns the result.

  This is a wrapper against Database.prepare, Statement.step, Statement.get,
  and Statement.free.

  The result is an array of result elements. There are as many result elements
  as the number of statements in your sql string (statements are separated by a semicolon)

  Each result element is an object with two properties:
      'columns' : the name of the columns of the result (as returned by Statement.getColumnNames())
      'values' : an array of rows. Each row is itself an array of values

  ## Example use
  We have the following table, named *test* :

  | id | age |  name  |
  |:--:|:---:|:------:|
  | 1  |  1  | Ling   |
  | 2  |  18 | Paul   |
  | 3  |  3  | Markus |

  We query it like that:
  ```javascript
  var db = new SQL.Database();
  var res = db.exec("SELECT id FROM test; SELECT age,name FROM test;");
  ```

  `res` is now :
  ```javascript
      [
          {columns: ['id'], values:[[1],[2],[3]]},
          {columns: ['age','name'], values:[[1,'Ling'],[18,'Paul'],[3,'Markus']]}
      ]
  ```

  @param sql [String] a string containing some SQL text to execute
  @return [Array<QueryResults>] An array of results.
    */
  public exec (sql: string): QueryResult[] {
    // [TODO] Verify how it works
    if (!this.dbPtr) {
      throw new Error('Database closed');
    }
    const stack = this.wasm.stackSave();
    try {
      let nextSqlPtr = this.wasm.allocateUTF8OnStack(sql);
      const pzTail = this.wasm.stackAlloc(4);
      const results: QueryResult[] = [];
      while (this.wasm.getValue(nextSqlPtr, 'i8') !== this.wasm.NULL) {
        this.wasm.setValue(this.wasm.tempInt32, 0, '*');
        this.wasm.setValue(pzTail, 0, '*');
        this.handleError(this.wasm.sqlite3_prepare_v2_sqlptr(this.dbPtr, nextSqlPtr, -1, this.wasm.tempInt32, pzTail));
        const stmtPtr = this.wasm.getValue(this.wasm.tempInt32, '*');
        nextSqlPtr = this.wasm.getValue(pzTail, '*');
        if (stmtPtr === this.wasm.NULL) {
          break;
        }
        const stmt = new Statement(stmtPtr, this);
        try {
          let inserted = false;
          while (stmt.step()) {
            // eslint-disable-next-line max-depth
            if (!inserted) {
              inserted = true;
              results.push({
                columns: stmt.getColumnNames(),
                values: [],
              });
            }
            results[results.length - 1].values.push(stmt.get());
          }
        } finally {
          stmt.free();
        }
      }
      return results;
    } finally {
      this.wasm.stackRestore(stack);
    }
  }

  /* Execute an sql statement, and call a callback for each row of result.

  **Currently** this method is synchronous, it will not return until the callback has
  been called on every row of the result. But this might change.

  @param sql [String] A string of SQL text. Can contain placeholders that will be
  bound to the parameters given as the second argument
  @param params [Array<String,Number,null,Uint8Array>] (*optional*) Parameters to bind
  to the query
  @param callback [Function(Object)] A function that will be called on each row of result
  @param done [Function] A function that will be called when all rows have been retrieved

  @return [Database] The database object. Useful for method chaining

  @example Read values from a table
      db.each("SELECT name,age FROM users WHERE age >= $majority",
                      {$majority:18},
                      function(row){console.log(row.name + " is a grown-up.")}
                  );
    */
  public each(sql: string, callback: (row: ReturnMap) => void): this;
  public each(sql: string, callback: (row: ReturnMap) => void, done: () => any): ReturnType<typeof done>;
  public each(sql: string, params: ParameterArray | ParameterMap, callback: (row: ReturnMap) => void): this;
  public each(sql: string, params: ParameterArray | ParameterMap, callback: (row: ReturnMap) => void, done: () => any): ReturnType<typeof done>;
  public each (sql: string, ...args: any[]) {
    let stmt: Statement;
    let doneCallback: () => any;
    let rowCallback: (row: ReturnMap) => void;
    if (typeof args[0] === 'function') {
      stmt = this.prepare(sql);
      rowCallback = args[0];
      doneCallback = args[1];
    } else {
      stmt = this.prepare(sql, args[0]);
      rowCallback = args[1];
      doneCallback = args[2];
    }
    if (typeof rowCallback !== 'function') {
      throw new Error('No callback passed');
    }
    try {
      while (stmt.step()) {
        rowCallback(stmt.getAsObject());
      }
    } finally {
      stmt.free();
    }
    if (typeof doneCallback === 'function') {
      return doneCallback();
    } else {
      return this;
    }
  }

  /* Prepare an SQL statement
  @param sql [String] a string of SQL, that can contain placeholders ('?', ':VVV', ':AAA', '@AAA')
  @param params [Array] (*optional*) values to bind to placeholders
  @return [Statement] the resulting statement
  @throw [String] SQLite error
    */
  public prepare (sql: string, params?: ParameterArray | ParameterMap): Statement {
    this.wasm.setValue(this.wasm.tempInt32, 0, '*');
    this.handleError(
      this.wasm.sqlite3_prepare_v2(this.dbPtr, sql, -1, this.wasm.tempInt32, this.wasm.NULL)
    );
    const stmtPtr = this.wasm.getValue(this.wasm.tempInt32, '*');
    if (stmtPtr === this.wasm.NULL) {
      throw new Error('Nothing to prepare. Check your SQL statement.');
    }
    const stmt = new Statement(stmtPtr, this);
    if (typeof params !== 'undefined') {
      stmt.bind(params);
    }
    this.statements[stmtPtr] = stmt;
    return stmt;
  }

  /**
   * Close DB, but not delete the DB file
   */
  private _close (): void {
    for (const [, stmt] of Object.entries(this.statements)) {
      stmt.free();
    }
    this.statements = {};
    for (const [, func] of Object.entries(this.functions)) {
      this.wasm.removeFunction(func);
    }
    this.functions = {};
    this.handleError(this.wasm.sqlite3_close_v2(this.dbPtr));
  }

  /* Exports the contents of the database to a binary array
    * Also frees all statements and memory, meaning it essentially reopens the DB.
  @return [Uint8Array] An array of bytes of the SQLite3 database file
    */
  public export (): Uint8Array {
    this._close();
    const binaryDb: Uint8Array = this.wasm.FS.readFile(this.filename, { encoding: 'binary' });
    this.handleError(this.wasm.sqlite3_open(this.filename, this.wasm.tempInt32));
    this.dbPtr = this.wasm.getValue(this.wasm.tempInt32, '*');
    return binaryDb;
  }

  /* Close the database, and all associated prepared statements.

  The memory associated to the database and all associated statements
  will be freed.

  **Warning**: A statement belonging to a database that has been closed cannot
  be used anymore.
  Databases **must** be closed, when you're finished with them, or the
  memory consumption will grow forever
    */
  public close () {
    this._close();
    this.wasm.FS.unlink(`/${this.filename}`);
    this.filename = '';
    this.dbPtr = this.wasm.NULL;
  }

  /* Analyze a result code, return true if no error occured, and throw
  an error with a descriptive message otherwise
  @nodoc
    */
  public handleError (returnCode: ReturnCode) {
    if (returnCode === ReturnCode.OK) {
      return true;
    } else {
      throw new Error(this.wasm.sqlite3_errmsg(this.dbPtr));
    }
  }

  /* Returns the number of rows modified, inserted or deleted by the
  most recently completed INSERT, UPDATE or DELETE statement on the
  database Executing any other type of SQL statement does not modify
  the value returned by this function.

  @return [Number] the number of rows modified
    */
  public getRowsModified () {
    return this.wasm.sqlite3_changes(this.dbPtr);
  }

  /* Register a custom function with SQLite
  @example Register a simple function
      db.create_function("addOne", function(x) {return x+1;})
      db.exec("SELECT addOne(1)") // = 2

  @param name [String] the name of the function as referenced in SQL statements.
  @param func [Function] the actual function to be executed.
    */
  public createFunction (name: string, func: Function) {
    const wrappedFunc = (sqlite3ContextPtr: Pointer, argc: number, argvPtr: Pointer) => {
      const args = [];
      for (let i = 0; i < argc; i++) {
        const valuePtr = this.wasm.getValue(argvPtr + 4 * i, '*');
        const valueType = this.wasm.sqlite3_value_type(valuePtr);
        const dataFunc = (() => {
          switch (false) {
            case valueType !== 1:
              return this.wasm.sqlite3_value_double;
            case valueType !== 2:
              return this.wasm.sqlite3_value_double;
            case valueType !== 3:
              return this.wasm.sqlite3_value_text;
            case valueType !== 4:
              return function (ptr: Pointer) {
                const size = this.wasm.sqlite3_value_bytes(ptr);
                const blobPtr = this.wasm.sqlite3_value_blob(ptr);
                const blobArg = new Uint8Array(size);
                for (let j = 0; j < size; j++) {
                  // [TODO] Remove this ESLint disable
                  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                  blobArg[j] = this.wasm.HEAP8[blobPtr + j];
                }
                return blobArg;
              };
            default:
              return function (_: Pointer) {
                return null;
              };
          }
        })();
        args.push(dataFunc(valuePtr));
      }
      let result;
      try {
        result = func(...args);
      } catch (error) {
        this.wasm.sqlite3_result_error(sqlite3ContextPtr, error, -1);
        return;
      }
      switch (typeof result) {
        case 'boolean':
          this.wasm.sqlite3_result_int(sqlite3ContextPtr, result ? 1 : 0);
          break;
        case 'number':
          this.wasm.sqlite3_result_double(sqlite3ContextPtr, result);
          break;
        case 'string':
          this.wasm.sqlite3_result_text(sqlite3ContextPtr, result, -1, -1);
          break;
        case 'object':
          if (result === null) {
            this.wasm.sqlite3_result_null(sqlite3ContextPtr);
          } else if (Array.isArray(result)) {
            const blobPtr = this.wasm.allocate(result, 'i8', this.wasm.ALLOC_NORMAL);
            this.wasm.sqlite3_result_blob(sqlite3ContextPtr, blobPtr, result.length, -1);
            this.wasm._free(blobPtr);
          } else {
            this.wasm.sqlite3_result_error(
              sqlite3ContextPtr,
              `Wrong API use : tried to return a value of an unknown type (${result}).`,
              -1
            );
          }
          break;
        default:
          this.wasm.sqlite3_result_null(sqlite3ContextPtr);
      }
    };
    if (name in this.functions) {
      this.wasm.removeFunction(this.functions[name]);
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.functions[name];
    }
    // The signature of the wrapped function is :
    // void wrapped(sqlite3_context *db, int argc, sqlite3_value **argv)
    const funcPtr = this.wasm.addFunction(wrappedFunc, 'viii');
    this.functions[name] = funcPtr;
    this.handleError(this.wasm.sqlite3_create_function_v2(this.dbPtr, name, func.length, ReturnCode.UTF8, 0, funcPtr, 0, 0, 0));
    return this;
  }
}
