import blogsearch from '../index';
import BlogSearch from '../BlogSearch';

jest.mock('../sqlite');
// eslint-disable-next-line import/first
import SQLite from '../sqlite';

// Catch any error inside of promise
process.on('unhandledRejection', err => {
  fail(err);
});

/**
 * Main test
 */
describe('index.ts', () => {
  let defaultOptions: ConstructorParameters<typeof BlogSearch>[0];

  beforeEach(() => {
    // Note: If you edit this HTML while doing TDD with `npm run test:watch`,
    // you will have to restart `npm run test:watch` for the new HTML to be
    // updated
    document.body.innerHTML = `
    <div>
      <input id="input" name="search" />
      <span class="i-am-a-span">span span</span>
    </div>
    `;

    defaultOptions = {
      workerFactory: (() => jest.fn()) as any,
      dbPath: '/test.db.wasm',
      wasmPath: 'test.wasm',
      inputSelector: '#input',
    };

    (SQLite as jest.Mock).mockClear();
  });

  it('should instantiate BlogSearch object for public use', async () => {
    // Given
    const options = defaultOptions;

    // When
    const obj = await blogsearch(options);

    // Then
    expect(obj).toBeInstanceOf(BlogSearch);
  });

  it('should call BlogSearch.load() and SQLite constructor', async () => {
    // Given
    const load = spyOn(BlogSearch.prototype, 'load');
    const options = defaultOptions;

    // When
    await blogsearch(options);

    // Then
    expect(load).toHaveBeenCalledTimes(1);
    expect(SQLite).toHaveBeenCalledTimes(1);
  });
});
