const prefix = 'blogsearch';
const suggestionPrefix = `${prefix}-suggestion`;

const templates = {
  suggestion: `
  <a
    class="
      ${suggestionPrefix}
      ${suggestionPrefix}__main
      "
    aria-label="Link to the result"
    href="{{{url}}}"
  >
    <div class="${suggestionPrefix}--header">
      <div class="${suggestionPrefix}--title ${suggestionPrefix}--header-item">
        {{{title}}}
      </div>
      <div>
        {{#categories}}
        <span class="${suggestionPrefix}--header-category ${suggestionPrefix}--header-item">
          {{{value}}}
        </span>
        {{/categories}}
        {{#tags}}
        <span class="${suggestionPrefix}--header-tag ${suggestionPrefix}--header-item">
          {{{value}}}
        </span>
        {{/tags}}
      </div>
    </div>
    <div class="${suggestionPrefix}--wrapper">
      {{#body_highlight}}
      <div class="${suggestionPrefix}--content">
        <div class="${suggestionPrefix}--text">{{{body_highlight}}}</div>
      </div>
      {{/body_highlight}}
    </div>
  </a>
  `,
  empty: `
  <div class="${suggestionPrefix}">
    <div class="${suggestionPrefix}--wrapper">
        <div class="${suggestionPrefix}--content ${suggestionPrefix}--no-results">
          <div class="${suggestionPrefix}--text">
              No results found for query <b>"{{query}}"</b>
          </div>
        </div>
    </div>
  </div>
  `
};

export default templates;
