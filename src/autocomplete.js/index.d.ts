import '../zepto';
import Hogan from 'hogan.js';

export interface AutocompleteOptions {
  debug: boolean;
  hint: boolean;
  autoselect: boolean;
  cssClasses: {
    root?: string;
    prefix?: string;
  };
  ariaLabel?: string;
}

export interface Suggestion {
  title: string;
  body: string | null;
  body_highlight: string | null;
  url: string;
  categories: string | { value: string }[];
  tags: string | { value: string }[];
}

// Reference: https://github.com/algolia/autocomplete.js#events
type autocompleteEvent =
  | 'autocomplete:opened'
  | 'autocomplete:shown'
  | 'autocomplete:empty'
  | 'autocomplete:closed'
  | 'autocomplete:updated'
  | 'autocomplete:cursorchanged'
  | 'autocomplete:selected'
  | 'autocomplete:cursorremoved'
  | 'autocomplete:autocompleted'
  | 'autocomplete:redrawn';

interface AutocompleteElement {
  // Reference: https://github.com/algolia/autocomplete.js#events
  on(eventType: autocompleteEvent, callback: () => void): void;
  trigger(eventType: autocompleteEvent): void;
  /**
   * This is an autocomplete statndalone object.
   * Reference: https://github.com/algolia/autocomplete.js#standalone-1
   */
  autocomplete: {
    close(): void;
    getVal(): string;
    setVal(value: string);
    destroy(): void;
    getWrapper(): any;
  };
}

type template = ((args: Hogan.Context) => string) | string;

export default function autocomplete(
  input: JQuery<HTMLElement>,
  options: autocompleteOptions,
  datasets: Array<{
    // Reference: https://github.com/algolia/autocomplete.js#datasets
    source(query: string, callback: (suggestion: Suggestion[]) => void): void;
    name?: string;
    displayKey?: (suggestion: Suggestion) => string;
    templates: {
      empty: template;
      suggestion: template;
      footer?: template;
      header?: template;
    };
    debounce?: number;
    cache?: boolean;
  }>
): AutocompleteElement;
