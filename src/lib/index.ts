import BlogSearch from './BlogSearch';

export default async function (args: Parameters<typeof BlogSearch.create>[0]): Promise<BlogSearch> {
  return BlogSearch.create(args);
}
