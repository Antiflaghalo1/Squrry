const RULES = [
  ['Meat & Seafood', ['meat', 'beef', 'chicken', 'pork', 'fish', 'seafood', 'poultry', 'turkey', 'lamb', 'bacon', 'sausage', 'deli']],
  ['Dairy & Eggs', ['dairy', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'whey']],
  ['Produce', ['produce', 'fruit', 'vegetable', 'fresh', 'organic vegetable', 'salad', 'herb']],
  ['Bakery & Bread', ['bread', 'bakery', 'baked', 'tortilla', 'bagel', 'muffin', 'roll', 'bun', 'cake', 'pastry', 'cookie', 'cracker', 'biscuit', 'wafer']],
  ['Pantry & Canned', ['canned', 'pantry', 'sauce', 'soup', 'bean', 'rice', 'pasta', 'grain', 'oil', 'vinegar', 'condiment', 'spice', 'seasoning', 'tomato', 'broth']],
  ['Beverages', ['beverage', 'drink', 'juice', 'soda', 'water', 'coffee', 'tea', 'energy drink', 'sports drink', 'alcohol', 'beer', 'wine']],
  ['Snacks & Candy', ['snack', 'candy', 'chocolate', 'chip', 'popcorn', 'pretzel', 'granola', 'bar', 'nut', 'trail mix', 'gummy', 'sweet']],
  ['Breakfast & Cereal', ['breakfast', 'cereal', 'oat', 'granola', 'pancake', 'waffle', 'syrup', 'jam']],
  ['Household & Cleaning', ['household', 'cleaning', 'detergent', 'soap', 'bleach', 'paper', 'trash', 'laundry', 'dish', 'sponge', 'mop', 'hardware', 'lubricant', 'tool', 'building']],
  ['Health & Beauty', ['health', 'beauty', 'vitamin', 'supplement', 'medicine', 'personal care', 'cosmetic', 'skin', 'hair', 'dental', 'deodorant', 'first aid', 'bandage', 'pharmacy']],
  ['Frozen Foods', ['frozen', 'ice cream', 'freezer']],
  ['Baby & Kids', ['baby', 'infant', 'toddler', 'diaper', 'formula', 'kids']],
]

export default function normalizeCategory(rawCategory) {
  const lower = rawCategory.toLowerCase()
  for (const [normalized, keywords] of RULES) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return normalized
    }
  }
  return 'Miscellaneous'
}
