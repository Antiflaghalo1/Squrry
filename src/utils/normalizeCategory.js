const RULES = [
  ['Meat & Seafood', [
    'meat', 'poultry', 'chicken', 'beef', 'pork', 'fish', 'seafood',
    'salmon', 'tuna', 'shrimp', 'lamb', 'turkey', 'sausage', 'bacon',
    'ham', 'ground', 'steak', 'crab', 'lobster', 'tilapia',
  ]],
  ['Dairy & Eggs', [
    'dairy', 'milk', 'egg', 'cheese', 'butter', 'cream', 'yogurt',
    'oat milk', 'plant milk', 'almond milk', 'soy milk', 'milk-substitute',
    'creamer', 'half and half', 'kefir',
  ]],
  ['Produce', [
    'produce', 'fruit', 'vegetable', 'fresh', 'banana', 'apple', 'orange',
    'grape', 'berry', 'strawberry', 'avocado', 'tomato', 'lettuce',
    'spinach', 'kale', 'broccoli', 'carrot', 'pepper', 'cucumber',
    'onion', 'garlic', 'potato', 'watermelon', 'melon', 'mango',
    'lemon', 'lime',
  ]],
  ['Bakery & Bread', [
    'bakery', 'bread', 'bun', 'roll', 'tortilla', 'bagel', 'muffin',
    'croissant', 'cake', 'pastry', 'wrap', 'pita', 'biscuit', 'loaf',
  ]],
  ['Breakfast & Cereal', [
    'cereal', 'oatmeal', 'granola', 'breakfast bar', 'pancake',
    'waffle mix', 'syrup', 'pop tart', 'instant oat', 'cream of wheat',
    'grits', 'muesli',
  ]],
  ['Pantry & Canned', [
    'pantry', 'canned', 'can', 'soup', 'sauce', 'pasta', 'noodle',
    'rice', 'bean', 'grain', 'cereal', 'oat', 'flour', 'oil', 'vinegar',
    'condiment', 'ketchup', 'mustard', 'mayo', 'salsa', 'peanut butter',
    'jelly', 'jam', 'syrup', 'sugar', 'salt', 'spice', 'seasoning',
  ]],
  ['Frozen', [
    'frozen', 'ice cream', 'pizza', 'waffle', 'burrito', 'frozen meal', 'freezer',
  ]],
  ['Beverages', [
    'beverage', 'drink', 'juice', 'water', 'soda', 'coffee', 'tea',
    'energy drink', 'sports drink', 'beer', 'wine', 'sparkling',
    'lemonade', 'cola', 'gatorade', 'powerade', 'arizona',
  ]],
  ['Snacks', [
    'snack', 'chip', 'cracker', 'pretzel', 'popcorn', 'nut', 'almond',
    'cashew', 'granola', 'trail mix', 'candy', 'chocolate', 'cookie',
    'brownie', 'jerky', 'doritos', 'cheetos', 'lays', 'pringles',
  ]],
  ['Pet Care', [
    'pet', 'dog', 'cat', 'bird', 'fish food', 'kibble', 'litter', 'treat',
    'paw', 'animal', 'milk-bone', 'purina', 'iams', 'fancy feast',
    'whiskas', 'pedigree',
  ]],
  ['Health & Beauty', [
    'health', 'beauty', 'vitamin', 'supplement', 'medicine', 'shampoo',
    'conditioner', 'soap', 'lotion', 'skincare', 'deodorant', 'toothpaste',
    'cosmetic', 'makeup', 'first aid', 'pharmacy',
  ]],
  ['Household & Cleaning', [
    'household', 'cleaning', 'cleaner', 'detergent', 'laundry', 'bleach',
    'paper towel', 'toilet paper', 'tissue', 'trash bag', 'dish soap',
    'sponge', 'mop', 'broom', 'wipe', 'disinfect', 'clorox', 'lysol',
    'tide', 'dawn',
  ]],
  ['Baby & Kids', [
    'baby', 'infant', 'toddler', 'diaper', 'formula', 'wipe', 'pacifier',
    'stroller', 'onesie', 'kids', 'children',
  ]],
  ['Deli & Prepared', [
    'deli', 'prepared', 'ready to eat', 'rotisserie', 'sandwich', 'sushi',
    'hot bar', 'salad bar', 'meal kit',
  ]],
]

export default function normalizeCategory(rawCategory) {
  const lower = rawCategory.toLowerCase()
  for (const [category, keywords] of RULES) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category
    }
  }
  return 'Miscellaneous'
}
