// Ingredient lines are free text with quantities, brands and asides mixed in,
// so matching works on the food name pulled out of each line.
const UNITS = /\b(g|kg|ml|l|litres?|tsp|tbsp|cups?|oz|lb|cloves?|sprigs?|sticks?|pinch(es)?|handful|packs?|packets?|cans?|tins?|slices?|bunch(es)?|knobs?|dash(es)?|drops?|jiggers?)\b/g

const NOISE = /\b(of|a|an|the|to|taste|or|and|for|with|about|roughly|approximately|optional|preferred|choice|finely|coarsely|freshly|thinly|roughly|chopped|sliced|diced|minced|crushed|grated|melted|softened|warm|cold|room|temperature|large|medium|small|plus|more|extra|good|quality|fresh|dried|ground|whole|halved|beaten|separated|peeled|seeded|trimmed|cubed|cut|into|chunks|pieces|if|using|needed|serve|serving|garnish|see|note|below|above|ideally|alternatively)\b/g

export const foodName = (line: string): string => {
  let text = line.toLowerCase()

  // Drop anything parenthetical, and anything after the first sentence stop.
  text = text.replace(/\([^)]*\)/g, ' ')
  text = text.split(/\.\s|\.$/)[0] ?? text

  // Quantities, fractions, ranges and units.
  text = text.replace(/\d+\s*\/\s*\d+/g, ' ')
  text = text.replace(/\d+(\.\d+)?\s*(-|–|to)\s*\d+(\.\d+)?/g, ' ')
  text = text.replace(/\d+(\.\d+)?/g, ' ')
  text = text.replace(UNITS, ' ')
  text = text.replace(NOISE, ' ')

  // Anything after a comma is usually preparation, not the food.
  text = text.split(',')[0] ?? text

  return text.replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim()
}

export const matchesPantry = (line: string, pantry: string[]): string | null => {
  const food = foodName(line)
  if (!food) return null
  return pantry.find(item => food.includes(item) || item.includes(food)) ?? null
}
