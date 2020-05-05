// [WARNING] The top-level imports must be type imports only.
//   Importing actual motule will hoist outside of initWorker() function,
//   making it difficult to wrap around it for UMD Web Worker function.
import type { SQLite3Wasm } from './sqlite3-emscripten';
import type { Database } from './sqlite3';
import type { ReturnMap } from './sqlite3-types';
import type { WorkerMessage } from './worker-interface';

declare global {
  /**
   * Override postMessage to narrow its usage
   * from (message: any) to (message: WorkerMessage.Response).
   */
  // eslint-disable-next-line no-implicit-globals, no-redeclare
  function postMessage(message: WorkerMessage.Response, transfer?: Transferable[]): void;
}

export default async function initWorker () {
  const sqlite3Wasm = (await import('./sqlite3-emscripten')).default;
  const sqlit3API = await import('./sqlite3');
  const loadWasm = wasmLoader(sqlite3Wasm);
  /** @type {Database} I import Database dynamically as value so I cannot use typeof Database. */
  let db: Database;
  let wasm: SQLite3Wasm;

  onmessage = async function (e: { data: WorkerMessage.Command }) {
    const { data } = e;
    switch (data.command) {
      case 'init': {
        wasm = (await loadWasm(data.wasmBinary)) as SQLite3Wasm;
        postMessage({ respondTo: 'init', success: true });
      }
      break;

      case 'open': {
        if (db) {
          db.close();
        }
        db = new sqlit3API.Database(wasm, new Uint8Array(data.dbBinary));
        postMessage({ respondTo: 'open', success: true });
      }
      break;

      case 'exec': {
        if (!db) {
          throw new Error('exec: DB is not initialized.');
        }
        if (!data.sql) {
          throw new Error('exec: Missing query string');
        }
        postMessage({
          respondTo: 'exec',
          results: db.exec(data.sql),
        });
      }
      break;

      case 'each': {
        if (!db) {
          throw new Error('exec: DB is not initialized.');
        }
        if (!data.sql) {
          throw new Error('exec: Missing query string');
        }
        db.each(
          data.sql,
          data.params,
          (row: ReturnMap) => postMessage({ respondTo: 'each', row, end: false }),
          () => postMessage({ respondTo: 'each', row: {}, end: true })
        );
      }
      break;

      case 'export': {
        if (!db) {
          throw new Error('exec: DB is not initialized.');
        }
        const buffer = db.export();
        postMessage({ respondTo: 'export', buffer }, [buffer]);
      }
      break;

      case 'close': {
        if (!db) {
          throw new Error('close: DB is not opened yet.');
        }
        db.close();
        postMessage({ respondTo: 'close', success: true });
      }
      break;

      default: {
        throw new Error(`Invalid command: ${data}`);
      }
    }
  };
}

/* eslint-disable dot-notation */
function wasmLoader (wasmModule: SQLite3Wasm) {
  let loadedModule: SQLite3Wasm | null = null;
  return async function (wasmBinary: ArrayBuffer): Promise<Omit<SQLite3Wasm, 'then'>> {
    return new Promise((resolve, reject) => {
      if (loadedModule) {
        resolve(loadedModule);
      }
      // Override Emscripten configuration
      const moduleOverrides: Partial<SQLite3Wasm> = {};
      moduleOverrides['onAbort'] = function (what: any) {
        reject(what);
      };
      /**
       * So the worker doesn't download .wasm directly.
       * The worker uses WebAssembly.instantiate() rather than
       * WebAssembly.instantiateStreaming() because the worker itself is large
       * that it is more time efficient to get the binaray from the host
       * (before the worker is downloaded and instantiated) and pass it to the
       * worker.
       */
      moduleOverrides['wasmBinary'] = wasmBinary;

      try {
        /**
         * Emscripten's then() is NOT really promise-based 'thenable'.
         * then() must be deleted otherwise it casues an infinite loop.
         * See: https://github.com/emscripten-core/emscripten/issues/5820
         */
        wasmModule(moduleOverrides).then(wasmModule => {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete wasmModule['then'];
          loadedModule = wasmModule;
          resolve(wasmModule);
        });
      } catch (e) {
        reject(new Error(`Loading SQLite .wasm module failed: ${e}`));
      }
    });
  };
}
/* eslint-enable dot-notation */

/* global WorkerGlobalScope */
// Run only if it is in web worker environment
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  initWorker()
    .catch(e => {
      throw new Error(`Worker Error: Failed to load the worker: ${e}`);
    });
}
