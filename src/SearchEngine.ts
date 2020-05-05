import { WorkerMessage } from './sqlite/worker-interface';
import { QueryResult } from './sqlite/sqlite3-types';
import { Suggestion } from './autocomplete.js';

export interface Config {
  dbPath: string;
  wasmPath: string;
  worker: Worker;
}

enum Db {
  TitleIdx = 0,

  BobyIdx,
  UrlIdx,
  CategoriesIdx,
  TagsIdx,
  DbName = 'blogsearch',
  MaxDisplayedTokens = 10,
};

export default class SearchEngine {

  private constructor (
    private readonly sqlWorker: Worker,
  ) {
    this.sqlWorker.onerror = error => {
      const message = (() => {
        if (error instanceof ErrorEvent) {
          return [
            `FileName: ${error.filename}`,
            `LineNumber: ${error.lineno}`,
            `Message: ${error.message}`,
          ].join(' - ');
        } else {
          return error;
        }
      })();
      // eslint-disable-next-line no-console
      console.error(message);
    };
  }

  public static async create ({
    dbPath,
    wasmPath,
    worker
  }: Config)
  : Promise<SearchEngine> {
    /**
     * The size of the worker is big (~200kb or ~50kb compressed) so it takes
     * some time to instantiate. Therefore fetch binaraies before the worker
     * is available. It is especially important for wasmBuffer because this
     * means that we give up using streaming compilation in the worker side 
     * (aka. WebAssembly.instantiateStreaming()) because fetching it parallelly
     * is faster than worker initialization and wasm streaming serially.
     */
    const wasmBuffer = fetch(wasmPath).then(r => r.arrayBuffer());
    const dbBuffer = fetch(dbPath).then(r => r.arrayBuffer());

    
    // if (wasmPath) {
    //   // This allows loading .wasm (wasmPath from index.ts) from cross-site.
    //   moduleOverrides['locateFile'] = function (path: string, scriptDirectory: string) {
    //     const dir = correctScriptDir(scriptDirectory);
    //     return path.match(/.wasm/)
    //       ? wasmPath.startsWith('http://') || wasmPath.startsWith('https://')
    //         ? wasmPath
    //         : dir + wasmPath
    //       : (dir + path);
    //   };
    // }

    const obj = new SearchEngine(worker);
    await obj.init(await wasmBuffer);
    await obj.open(await dbBuffer);
    return obj;
  }

  private async init (wasmBinary: ArrayBuffer): Promise<SearchEngine> {
    return new Promise((resolve, reject) => {
      this.handleMessageFromWorker(response => {
        if (response.respondTo !== 'init') {
          reject(new Error('Internal Error: response is not init'));
          return;
        } else if (!response.success) {
          reject(new Error('Internal Error: init failed'));
          return;
        }
        resolve(this);
      });

      this.postMessageToWorker({
        command: 'init',
        wasmBinary,
      }, [wasmBinary]);
    });
  }

  private async open (dbBinary: ArrayBuffer): Promise<SearchEngine> {
    return new Promise((resolve, reject) => {
      this.handleMessageFromWorker(response => {
        if (response.respondTo !== 'open') {
          reject(new Error('Internal Error: response is not open'));
          return;
        } else if (!response.success) {
          reject(new Error('Internal Error: open failed'));
          return;
        }
        resolve(this);
      });

      this.postMessageToWorker({
        command: 'open',
        dbBinary
      }, [dbBinary]);
    });
  }

  public async search (
    match: string,
    top: number,
    highlightPreTag: string,
    highlightPostTag: string,
  ): Promise<Suggestion[]> {
    // Source: https://www.sqlite.org/fts5.html#the_snippet_function
    const query = `
      SELECT
        *,
        snippet(${Db.DbName}, ${Db.BobyIdx}, '{{%%%', '%%%}}', '', ${Db.MaxDisplayedTokens}) as body_highlight
      FROM ${Db.DbName}
      WHERE ${Db.DbName} 
        MATCH '${match}'
      ORDER BY bm25(${Db.DbName})
      LIMIT ${top};
    `;
    console.log(query)
    const raw = await this.run(query);
    if (raw.length === 0) {
      return [];
    }
    // Only one row because only one SQL query is executed.
    const { columns, values } = raw[0];

    return values
      .filter(row => row[Db.TitleIdx]) // Filter empty titles
      .map(row => {
        const hightlightIdx = row.length - 1;
        // hightlight body string
        // eslint-disable-next-line no-param-reassign
        row[hightlightIdx] = escapeXMLCharacters(row[hightlightIdx] as string)
          .replace(/{{%%%/g, highlightPreTag)
          .replace(/%%%}}/g, highlightPostTag);
        return Object.fromEntries(zip(columns, row)) as Suggestion;
      });
  }

  public async run (query: string): Promise<QueryResult[]> {

    return new Promise((resolve, reject) => {
      this.handleMessageFromWorker(response => {
        if (response.respondTo !== 'exec') {
          reject(new Error('Internal Error: response is not exec'));
          return;
        }
        resolve(response.results);
      });

      this.postMessageToWorker({
        command: 'exec',
        sql: query,
      });
    });
  }
  
  public close () {
    this.sqlWorker.terminate();
  }

  /**
   * Wrapper for to narrow usage of worker handler.
   *
   * @param handler Handler for worker response
   */
  private handleMessageFromWorker (
    handler: (response: WorkerMessage.Response) => any
  ) {
    this.sqlWorker.addEventListener(
      'message',
      event => handler(event.data),
      { once: true }
    );
  }

  /**
   * Wrapper for to narrow usage of worker postMessage().
   *
   * @param message Command to worker
   */
  private postMessageToWorker (
    message: WorkerMessage.Command,
    transfer: Transferable[] = []
  ) {
    this.sqlWorker.postMessage(message, transfer);
  }
}

/**
 * The same as python's built-in zip function.
 *
 * @param arrays arrays of arrays of the same size.
 */
function * zip (...arrays: any[]) {
  const numOfArrays = arrays.length;
  const arrayLength = arrays[0].length;
  for (let i = 0; i < arrayLength; i++) {
    const row = [];
    for (let j = 0; j < numOfArrays; j++) {
      row.push(arrays[j][i]);
    }
    yield row;
  }
}

/**
 * Escape XML tag characters, from the W3C recommendation.
 * https://www.w3.org/International/questions/qa-escapes#use
 *
 * @param input unsafe string
 */
function escapeXMLCharacters (input: string) {
  return input.replace(/[<>&]/g, c => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      default:  throw new Error('Error: XML escape Error.');
    }
  });
}

// function correctScriptDir (dir?: string) {
//   /**
//    * When the script (WorkerGlobalScope) is blob-generated, scriptDirectory
//    * of locateFile method (moduleOverrides['locateFile']) is an empty string.
//    * scriptDirectory should be corrected if so.
//    * [TODO] Contribute emscripten
//    */
//   return ((dir || self.location?.href) ?? '')
//     .replace(/^(blob:)/, '')
//     .replace(/\/[^\/]+$/, '/');
// };
