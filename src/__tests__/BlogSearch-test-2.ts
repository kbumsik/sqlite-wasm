/**
 * BlogSearch test suite #2
 * Test suite without mocking autocomplete.js.
 **/
import $ from '../zepto';
import Hogan from 'hogan.js';
import BlogSearch from '../BlogSearch';
// @ts-ignore
import SQLite, { mockSQLiteLoad, mockSQLiteSearch, mockSQLiteRun } from '../sqlite';

// Have __mocks__
jest.mock('../sqlite');

// Catch any error inside of promise
process.on('unhandledRejection', err => {
  fail(err);
});

/**
 * Mocks for Hogan and template
 */
jest.mock('../templates', () => ({
  suggestion: '<div></div>',
}));

const mockHoganRender = jest.fn();
jest.mock('hogan.js', () => {
  return {
    compile: jest.fn(() => ({ render: mockHoganRender })),
  };
});

/**
 * Mocks for Web Worker
 */
const mockWorker: Worker = {
  postMessage: jest.fn(),
  onmessage: jest.fn(),
  onerror: jest.fn(),
  terminate: jest.fn(),
  dispatchEvent: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(window, 'Worker', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockWorker),
});

/**
 * Main test
 */
describe('BlogSearch', () => {
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
  });

  afterEach(() => {
    (SQLite as jest.Mock).mockClear();
    mockSQLiteLoad.mockClear();
    mockSQLiteSearch.mockClear();
    mockSQLiteRun.mockClear();

    ((Hogan.compile as unknown) as jest.Mock).mockClear();
    mockHoganRender.mockClear();
  });

  describe('handleSelected', () => {
    let defaultOptions: ConstructorParameters<typeof BlogSearch>[0];
    const mockAssign = (jest.spyOn(
      window.location,
      'assign'
    ) as jest.SpyInstance).mockImplementation();

    afterAll(() => {
      mockAssign.mockRestore();
    });

    beforeEach(() => {
      defaultOptions = {
        dbPath: 'test.db.wasm',
        wasmPath: 'test.wasm',
        inputSelector: '#input',
      };
    });

    afterEach(() => {
      mockAssign.mockClear();
    });

    // it('should change the location if no handleSelected specified', async () => {
    //   // Given
    //   const options = defaultOptions;

    //   // When
    //   const search = new BlogSearch(options);
    //   await search.load();
    //   (search as any).autocomplete.trigger('autocomplete:selected', {
    //     url: 'https://website.com/doc/page',
    //   });

    //   return new Promise(resolve => {
    //     expect(window.location.assign).toHaveBeenCalledWith('https://website.com/doc/page');
    //     resolve();
    //   });
    // });
    describe('default handleSelected', () => {
      it('enterKey: should change the page', () => {
        const options = defaultOptions;
        const mockSetVal = jest.fn();
        const mockInput = { setVal: mockSetVal };
        const mockSuggestion = { url: 'www.example.com' };
        const mockContext = { selectionMethod: 'enterKey' };

        (new BlogSearch(options) as any).handleSelected(
          mockInput,
          undefined, // Event
          mockSuggestion,
          undefined, // Dataset
          mockContext
        );

        return new Promise(resolve => {
          expect(mockSetVal).toHaveBeenCalledWith('');
          expect(window.location.assign).toHaveBeenCalledWith('www.example.com');
          resolve();
        });
      });
      it('click: should not change the page', () => {
        const options = defaultOptions;
        const mockSetVal = jest.fn();
        const mockInput = { setVal: mockSetVal };
        const mockContext = { selectionMethod: 'click' };

        (new BlogSearch(options) as any).handleSelected(
          mockInput,
          undefined, // Event
          undefined, // Suggestion
          undefined, // Dataset
          mockContext
        );

        return new Promise(resolve => {
          expect(mockSetVal).not.toHaveBeenCalled();
          expect(window.location.assign).not.toHaveBeenCalled();
          resolve();
        });
      });
    });
  });

  // describe('handleShown', () => {
  //   it('should add an alignment class', async () => {
  //     // Given
  //     const options = {
  //       dbPath: 'test.db.wasm',
  //       wasmPath: 'test.wasm',
  //       inputSelector: '#input',
  //     };

  //     // When
  //     const bs = new BlogSearch(options);
  //     await bs.load();
  //     // @ts-ignore
  //     bs.autocomplete.trigger('autocomplete:shown');

  //     expect($('.blogsearch-autocomplete').attr('class')).toEqual(
  //       'blogsearch-autocomplete blogsearch-autocomplete-right'
  //     );
  //   });
  // });
});
