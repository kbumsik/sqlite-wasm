import Hogan from 'hogan.js';
import autocomplete, {
  Suggestion,
  AutocompleteOptions,
  AutocompleteElement,
} from './autocomplete.js';
import SearchEngine, * as Search from './SearchEngine';
import templates from './templates';
import $ from './zepto';

declare global {
  interface Window {
    // 'blogsearch' object will be available when imported by UMD using <script> tag.
    blogsearch: BlogSearch & {
      // blogsearch.worker is also imported by its own UMD.
      // In this case, you can it blob to get URL to use with Woker().
      worker?: Worker;
    };
  }
}

const usage = `Usage:
blogsearch({
  dbPath: string,
  inputSelector: string (CSS selector),
  wasmPath: (optional) string,
  workerFactory: (optional) function that returns a Web Worker,
})`;

export type Config = {
  dbPath: Search.Config['dbPath'];
  wasmPath?: Search.Config['wasmPath'];
  workerFactory?: () => Worker;
  inputSelector: string;
  debug?: boolean;
  searchCallback?: (
    suggestions: Suggestion[],
    showSearchResult: (suggestion: Suggestion[]) => void
  ) => void;
  autocompleteOptions?: AutocompleteOptions;
  handleSelected?: typeof defaultHandleSelected;
  handleShown?: typeof defaultHandleShown;
  searchResultTemplate?: string,
  noResultTemplate?: string,
  highlightPreTag?: string,
  highlightPostTag?: string,
  limit?: number,
};

export default class BlogSearch {

  private constructor (
    private readonly engine: SearchEngine,
    private readonly autoComplete: AutocompleteElement,
  ) {}

  public static async create ({
    dbPath = '',
    wasmPath = getCurrentDir('blogsearch.wasm'),
    workerFactory,
    inputSelector = '',
    debug = false,
    searchCallback,
    autocompleteOptions = {
      debug: false,
      hint: false,
      autoselect: true,
      cssClasses: {},
      ariaLabel: '',
    },
    handleSelected = defaultHandleSelected,
    handleShown = defaultHandleShown,
    searchResultTemplate = templates.suggestion,
    noResultTemplate = templates.empty,
    highlightPreTag = '<span class="blogsearch-suggestion--highlight">',
    highlightPostTag = '</span>',
    limit = 5,
  }: Config) {
    BlogSearch.checkArguments(arguments[0]);

    let searchReady = false;
    const autoComplete = getAutoComplete();
    const engine = await SearchEngine.create({
      wasmPath,
      dbPath,
      worker: getWorkerFactory(workerFactory)(),
    });
    searchReady = true;
    return new BlogSearch(engine, autoComplete);

    function getAutoComplete () {
      const input = getInputElementFromSelector(inputSelector);
      const template = Hogan.compile(searchResultTemplate);
      const emptyTemplate = Hogan.compile(noResultTemplate);
      const autoComplete = autocomplete(
        input,
        options(autocompleteOptions, input, debug),
        [
          {
            source: searchSource(),
            templates: {
              suggestion: (suggestion) => template.render(suggestion),
              empty: (suggestion) => emptyTemplate.render(suggestion),
            },
          },
        ]
      );
      autoComplete.on(
        'autocomplete:selected',
        handleSelected.bind(null, autoComplete.autocomplete)
      );
      autoComplete.on(
        'autocomplete:shown',
        handleShown.bind(null, input)
      );
      return autoComplete;

      function options (
        options: AutocompleteOptions,
        input: JQuery<HTMLElement>,
        debugFlag: boolean
      ): AutocompleteOptions {
        const inputAriaLabel = typeof input?.attr === 'function' ? input.attr('aria-label') : undefined;
        return {
          ...options,
          debug: debugFlag ?? options.debug ?? false,
          cssClasses: {
            root: 'blogsearch-autocomplete',
            prefix: 'bs',
            ...options.cssClasses,
          },
          ariaLabel: options.ariaLabel ?? inputAriaLabel ?? 'search input',
        };
      }

      /**
       * Returns the `source` method to be passed to autocomplete.js. It will query
       * the Algolia index and call the callbacks with the formatted hits.
       * @function getAutocompleteSource
       * @returns {function} Method to be passed as the `source` option of
       * autocomplete
       */
      function searchSource () {
        return async (
          query: string,
          showSearchResult: (suggestion: Suggestion[]) => void
        ) => {
          if (!searchReady) return;
          const suggestions =
            (await engine.search(
              query,
              limit,
              highlightPreTag,
              highlightPostTag
            ))
              .map(suggestion => ({
                ...suggestion,
                tags: (suggestion.tags as string ?? '')
                  .split(',')
                  .map(str => ({ value: str.trim() })),
                categories: (suggestion.categories as string ?? '')
                  .split(',')
                  .map(str => ({ value: str.trim() })),
              }));

          console.log(suggestions);
          if (searchCallback && typeof searchCallback == 'function') {
            searchCallback(suggestions, showSearchResult);
          } else {
            showSearchResult(suggestions);
          }
          return;
        };
      }
    }
  }

  private static checkArguments (args: Config) {
    if (
      typeof args.dbPath !== 'string' || !args.dbPath ||
      typeof args.inputSelector !== 'string' || !args.inputSelector ||
      (typeof args.workerFactory !== 'undefined' && typeof args.workerFactory !== 'function')
    ) {
      throw new Error(usage);
    }
    getInputElementFromSelector(args.inputSelector);
  }

  public close () {
    this.engine.close();
    this.autoComplete.autocomplete.destroy();
    return;
  }
}

function getWorkerFactory (factory?: () => Worker) {
  if (typeof factory !== 'undefined') {
    return factory;
  }
  // Get current directory for worker
  const workerDir = typeof window?.blogsearch?.worker === 'function'
    ? URL.createObjectURL(new Blob([`(${window.blogsearch.worker})()`]))
    : getCurrentDir('worker.umd.js');
  return () => new Worker(workerDir);
}

const getCurrentDir = (() => {
  /**
   * This must be processed in the top-level, before blogsearch() initialization
   * code is called. This is because blogsearch() can be called in a different
   * <script> tag.
   */
  const curDir = (document.currentScript as HTMLScriptElement)?.src ?? self.location?.href ?? '';
  return function (fileName: string) {
    // This assumes that worker.umd.js is available in the CDN (e.g. JSDelivr).
    return `${curDir.substr(0, curDir.lastIndexOf('/'))}/${fileName}`;
  }
})();

/**
 * Returns the matching input from a CSS selector, null if none matches
 * @function getInputFromSelector
 * @param  {string} selector CSS selector that matches the search
 * input of the page
 */
function getInputElementFromSelector (selector: string) {
  const input = $(selector).filter('input');
  if (!input?.length) {
    throw new Error(`Error: No input element in the page matches ${selector}`);
  }
  return $(input[0]);
}

function defaultHandleSelected (
  input: any,
  _event: any,
  suggestion: Suggestion,
  _datasetNumber: any,
  context: any = {},
) {
  // Do nothing if click on the suggestion, as it's already a <a href>, the
  // browser will take care of it. This allow Ctrl-Clicking on results and not
  // having the main window being redirected as well
  if (context.selectionMethod === 'click') {
    return;
  }

  input.setVal('');
  window.location.assign(suggestion.url);
}

function defaultHandleShown (input: JQuery<HTMLElement>) {
  // @ts-ignore
  const middleOfInput = input.offset().left + input.width() / 2;
  // @ts-ignore
  let middleOfWindow = $(document).width() / 2;

  if (isNaN(middleOfWindow)) {
    middleOfWindow = 900;
  }

  const alignClass =
    middleOfInput - middleOfWindow >= 0
      ? 'blogsearch-autocomplete-right'
      : 'blogsearch-autocomplete-left';
  const otherAlignClass =
    middleOfInput - middleOfWindow < 0
      ? 'blogsearch-autocomplete-right'
      : 'blogsearch-autocomplete-left';
  const autocompleteWrapper = $('.blogsearch-autocomplete');
  if (!autocompleteWrapper.hasClass(alignClass)) {
    autocompleteWrapper.addClass(alignClass);
  }

  if (autocompleteWrapper.hasClass(otherAlignClass)) {
    autocompleteWrapper.removeClass(otherAlignClass);
  }
}
