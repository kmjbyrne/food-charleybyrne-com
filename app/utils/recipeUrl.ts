// Content documents keep their /recipes/ source prefix; the site serves them
// from the root namespace alongside categories.
export const recipeUrl = (path?: string) => (path ?? '').replace(/^\/recipes/, '') || '/'
