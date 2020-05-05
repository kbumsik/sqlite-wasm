import { WorkerMessage } from './workerInterface';
import { QueryResult } from './sqlite3-types';

export default class WorkerWrapper {
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

  public static async init ({
    wasmBinary,
    worker,
  }: {
    wasmBinary: ArrayBuffer;
    worker: Worker;
  }): Promise<WorkerWrapper> {
    const obj = new WorkerWrapper(worker);

    return new Promise((resolve, reject) => {
      obj.handleMessageFromWorker(response => {
        if (response.respondTo !== 'init') {
          reject(new Error('Internal Error: response is not init'));
          return;
        } else if (!response.success) {
          reject(new Error('Internal Error: init failed'));
          return;
        }
        resolve(obj);
      });

      obj.postMessageToWorker({
        command: 'init',
        wasmBinary,
      }, [wasmBinary]);
    });
  }

  public async open ({
    dbBinary
  }: {
    dbBinary: ArrayBuffer;
  }): Promise<WorkerWrapper> {
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

  public async run ({
    query
  }: {
    query: string;
  }): Promise<QueryResult[]> {
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

  public terminate () {
    this.sqlWorker.terminate();
  }

  private handleMessageFromWorker (
    handler: (response: WorkerMessage.Response) => any
  ) {
    this.sqlWorker.addEventListener(
      'message',
      event => handler(event.data),
      { once: true }
    );
  }

  private postMessageToWorker (
    message: WorkerMessage.Command,
    transfer: Transferable[] = []
  ) {
    this.sqlWorker.postMessage(message, transfer);
  }
}
