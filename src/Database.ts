import { SQLite3Wasm } from './sqlite3-emscripten';
import {
  ParameterArray,
  ParameterMap,
  ReturnMap,
  QueryResult,
  ReturnCode,
  Pointer
} from './sqlite3-types';
import Statement from './Statement';

export default class Database {
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
