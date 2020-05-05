/**
 * Mocks for SQLite
 */
import type { SearchResult, QueryResult } from '../';

export const mockSQLiteLoad = jest.fn(async function () {
  return Promise.resolve(this);
});

export const mockSQLiteSearch = jest.fn(async function (): Promise<SearchResult[]> {
  return Promise.resolve([
    { body_highlight: 'Hightlight1', title: 'Title1', body: 'Body1', url: 'URL1', categories: 'category1-1,catebory1-2,catebory1-3', tags: 'tag1-1,tag1-2,tag1-3' },
    { body_highlight: 'Hightlight2', title: 'Title2', body: 'Body2', url: 'URL2', categories: 'category2-1,catebory2-2,catebory2-3', tags: 'tag2-1,tag2-2,tag2-3' },
    { body_highlight: 'Hightlight3', title: 'Title3', body: 'Body3', url: 'URL3', categories: 'category3-1,catebory3-2,catebory3-3', tags: 'tag3-1,tag3-2,tag3-3' },
  ]);
});

export const mockSQLiteRun = jest.fn(async function (): Promise<QueryResult[]> {
  return Promise.resolve([
    {
      columns: ['body_highlight', 'title', 'body', 'url', 'categories', 'tags'],
      values: [
        ['Hightlight1', 'Title1', 'Body1', 'URL1', 'category1-1,catebory1-2,catebory1-3', 'tag1-1,tag1-2,tag1-3'],
        ['Hightlight2', 'Title2', 'Body2', 'URL2', 'category2-1,catebory2-2,catebory2-3', 'tag2-1,tag2-2,tag2-3'],
        ['Hightlight3', 'Title3', 'Body3', 'URL3', 'category3-1,catebory3-2,catebory3-3', 'tag3-1,tag3-2,tag3-3'],
      ],
    },
  ]);
});

const mock = jest.fn().mockImplementation(() => {
  return {
    load: mockSQLiteLoad,
    search: mockSQLiteSearch,
    run: mockSQLiteRun,
  };
});

export default mock;
