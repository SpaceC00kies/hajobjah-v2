
export const getRecentSearches = (key: string): string[] => {
  try {
    const searches = localStorage.getItem(key);
    return searches ? JSON.parse(searches) : [];
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return [];
  }
};

export const addRecentSearch = (key: string, term: string): void => {
  if (!term) return;
  try {
    let searches = getRecentSearches(key);
    searches = [term, ...searches.filter(s => s !== term)];
    if (searches.length > 5) {
      searches = searches.slice(0, 5);
    }
    localStorage.setItem(key, JSON.stringify(searches));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
};
