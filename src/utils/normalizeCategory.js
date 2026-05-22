const RULES = [
  ['Meat & Seafood', ['meat', 'beef', 'chicken', 'pork', 'fish', 'seafood', 'poultry', 'turkey', 'lamb', 'bacon', 'sausage', 'deli']],
  ['Dairy & Eggs', ['dairy', 'dairies', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'whey', '2%', 'whole milk', 'skim', 'half and half', 'half & half', 'lactose']],
  ['Produce', ['produce', 'fruit', 'vegetable', 'fresh', 'organic vegetable', 'salad', 'herb']],
  ['Bakery & Bread', ['bread', 'bakery', 'baked', 'tortilla', 'bagel', 'muffin', 'roll', 'bun', 'cake', 'pastry', 'cookie', 'cracker', 'biscuit', 'wafer']],
  ['Pantry & Canned', ['canned', 'pantry', 'sauce', 'soup', 'bean', 'rice', 'pasta', 'grain', 'oil', 'vinegar', 'condiment', 'spice', 'seasoning', 'tomato', 'broth']],
  ['Beverages', ['beverage', 'drink', 'juice', 'soda', 'water', 'coffee', 'tea', 'energy drink', 'sports drink', 'alcohol', 'beer', 'wine']],
  ['Snacks & Candy', ['snack', 'candy', 'chocolate', 'chip', 'chips', 'popcorn', 'pretzel', 'granola', 'bar', 'nut', 'trail mix', 'gummy', 'sweet']],
  ['Breakfast & Cereal', ['breakfast', 'cereal', 'oat', 'granola', 'pancake', 'waffle', 'syrup', 'jam']],
  ['Household & Cleaning', ['household', 'cleaning', 'detergent', 'soap', 'bleach', 'paper', 'trash', 'laundry', 'dish', 'sponge', 'mop', 'hardware', 'lubricant', 'tool', 'building']],
  ['Health & Beauty', ['health', 'beauty', 'vitamin', 'supplement', 'medicine', 'personal care', 'cosmetic', 'skin', 'hair', 'dental', 'deodorant', 'first aid', 'bandage', 'pharmacy']],
  ['Frozen Foods', ['frozen', 'ice cream', 'freezer']],
  ['Baby & Kids', ['baby', 'infant', 'toddler', 'diaper', 'formula', 'kids', 'gentlease', 'enfamil', 'similac', 'gerber', 'pampers', 'huggies', 'luvs', 'baby food']],
]

const BEVERAGES_FP_WORDS = ['bread', 'tomato', 'sauce', 'vegetable', 'fruit', 'grain']

export default function normalizeCategory(rawCategory, productName = '') {
  const stripped = rawCategory.startsWith('en:') ? rawCategory.slice(3).replace(/-/g, ' ') : rawCategory
  const combined = (stripped + ' ' + productName).toLowerCase()
  for (const [normalized, keywords] of RULES) {
    if (
      normalized === 'Beverages' &&
      combined.includes('plant-based foods and beverages') &&
      BEVERAGES_FP_WORDS.some(w => combined.includes(w))
    ) continue
    for (const kw of keywords) {
      if (combined.includes(kw)) return normalized
    }
  }
  return 'Miscellaneous'
}
