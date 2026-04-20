import { useSearchParams } from 'react-router-dom';
import DiscoverCatalog from '../components/discover/DiscoverCatalog';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  return (
    <DiscoverCatalog
      initialSearchQuery={searchQuery}
      heading={searchQuery ? `Search results for "${searchQuery}"` : 'Browse every plugin'}
      subheading="Filter the marketplace the same way Modrinth does it: a left rail for narrowing results, a compact toolbar for sorting, and metadata-rich cards for quick comparison."
      seoTitle={searchQuery ? `Search results for "${searchQuery}"` : 'All Plugins'}
      seoDescription={`Browse our collection of Minecraft plugins. ${searchQuery ? `Showing results for ${searchQuery}.` : ''}`}
    />
  );
};

export default SearchResultsPage;
