import { supabase } from '../lib/supabase'

function getComparableKey(subcategory, attributes) {
  if (!subcategory || !attributes || Object.keys(attributes).length === 0) {
    return null;
  }
  const parts = Object.keys(attributes)
    .sort()
    .map(k => {
      const val = attributes[k]?.value;
      return val !== undefined && val !== null ? `${k}:${val}` : null;
    })
    .filter(Boolean);
  return parts.length > 0 ? `${subcategory}|${parts.join('|')}` : null;
}

function getUnitPrice(price, attributes) {
  if (!price || !attributes) return { unitPrice: price, unitLabel: null };
  const count = attributes?.count?.value ?? attributes?.slice_count?.value;
  const sizeOz = attributes?.size_oz?.value;
  if (count && Number(count) > 0) {
    return {
      unitPrice: parseFloat((price / Number(count)).toFixed(4)),
      unitLabel: 'per unit'
    };
  }
  if (sizeOz && Number(sizeOz) > 0) {
    return {
      unitPrice: parseFloat((price / Number(sizeOz)).toFixed(4)),
      unitLabel: 'per oz'
    };
  }
  return { unitPrice: price, unitLabel: null };
}

export async function optimizeFromSupabase(selectedUpcs, stores) {
  if (!selectedUpcs || selectedUpcs.length === 0) {
    return { grandTotal: 0, storeBreakdown: [], unmatched: [] }
  }

  const today = new Date().toISOString().split('T')[0]
  const [{ data: obsRows }, { data: productRows }, { data: flippRows }] = await Promise.all([
    supabase
      .from('observations')
      .select('barcode, store_id, price')
      .in('barcode', selectedUpcs)
      .eq('voided', false)
      .gt('price', 0)
      .lt('price', 500),
    supabase
      .from('products')
      .select('upc, name')
      .in('upc', selectedUpcs),
    supabase
      .from('flipp_observations')
      .select('barcode, store_id, price')
      .in('barcode', selectedUpcs)
      .gt('price', 0)
      .lt('price', 500)
      .or(`valid_to.is.null,valid_to.gte.${today}`),
  ])

  const nameByUpc = {}
  for (const p of productRows || []) nameByUpc[String(p.upc)] = p.name

  // Enrich observations with subcategory/attributes for attribute-aware comparison
  const observations = obsRows || []
  const uniqueBarcodes = [...new Set(observations.map(o => o.barcode))]
  if (uniqueBarcodes.length > 0) {
    const { data: attrRows } = await supabase
      .from('products')
      .select('upc, subcategory, attributes')
      .in('upc', uniqueBarcodes)
    const productMap = {}
    for (const row of attrRows || []) productMap[String(row.upc)] = row
    for (const obs of observations) {
      const prod = productMap[String(obs.barcode)] || {}
      const key = getComparableKey(prod.subcategory, prod.attributes)
      const { unitPrice, unitLabel } = getUnitPrice(obs.price, prod.attributes)
      obs._comparableKey = key
      obs._unitPrice = unitPrice
      obs._unitLabel = unitLabel
      obs._attributes = prod.attributes || null
    }
  }

  // Build price map: { upc: { storeId: { price, _comparableKey, _unitPrice, _unitLabel, _attributes } } }
  const priceMap = {}
  for (const obs of observations) {
    if (!priceMap[obs.barcode]) priceMap[obs.barcode] = {}
    const cur = priceMap[obs.barcode][obs.store_id]
    if (cur == null || obs.price < cur.price) {
      priceMap[obs.barcode][obs.store_id] = {
        price: obs.price,
        _comparableKey: obs._comparableKey,
        _unitPrice: obs._unitPrice,
        _unitLabel: obs._unitLabel,
        _attributes: obs._attributes,
      }
    }
  }

  // Build flipp min-price map: { upc: { storeId: minPrice } }
  const flippMap = {}
  for (const row of flippRows || []) {
    if (!flippMap[row.barcode]) flippMap[row.barcode] = {}
    const cur = flippMap[row.barcode][row.store_id]
    if (cur == null || row.price < cur) flippMap[row.barcode][row.store_id] = row.price
  }

  // Merge flipp prices; track where flipp beat community pricing
  const flippSaleItems = new Set()
  for (const [barcode, storePrices] of Object.entries(flippMap)) {
    if (!priceMap[barcode]) priceMap[barcode] = {}
    for (const [storeId, flippPrice] of Object.entries(storePrices)) {
      const communityEntry = priceMap[barcode][storeId]
      if (communityEntry == null || flippPrice < communityEntry.price) {
        priceMap[barcode][storeId] = {
          price: flippPrice,
          _comparableKey: null,
          _unitPrice: flippPrice,
          _unitLabel: null,
          _attributes: null,
        }
        flippSaleItems.add(`${barcode}:${storeId}`)
      }
    }
  }

  const storeMap = {}
  const unmatched = []

  for (const upc of selectedUpcs) {
    const storePrices = priceMap[upc]
    if (!storePrices || Object.keys(storePrices).length === 0) {
      unmatched.push(upc)
      continue
    }
    const candidates = Object.entries(storePrices)
    const keys = candidates.map(([, entry]) => entry._comparableKey)
    const allSameKey = keys[0] !== null && keys.every(k => k === keys[0])
    candidates.sort((a, b) => allSameKey
      ? a[1]._unitPrice - b[1]._unitPrice
      : a[1].price - b[1].price
    )
    const [bestStoreId, bestEntry] = candidates[0]
    const bestPrice = bestEntry.price
    if (!storeMap[bestStoreId]) {
      const store = stores.find(s => s.id === bestStoreId) ||
        { id: bestStoreId, name: bestStoreId, location: '', color: '#888888' }
      storeMap[bestStoreId] = { store, items: [], subtotal: 0 }
    }
    storeMap[bestStoreId].items.push({
      id: upc,
      name: nameByUpc[upc] ?? upc,
      bestPrice,
      comparableKey: bestEntry._comparableKey,
      unitPrice: bestEntry._unitPrice,
      unitLabel: bestEntry._unitLabel,
      attributes: bestEntry._attributes,
    })
    storeMap[bestStoreId].subtotal += bestPrice
  }

  const storeBreakdown = Object.values(storeMap).sort((a, b) => b.subtotal - a.subtotal)
  const grandTotal = storeBreakdown.reduce((sum, r) => sum + r.subtotal, 0)

  if (import.meta.env.DEV) {
    console.log('[OPTIMIZER]', JSON.stringify({ storeMap }, null, 2));
  }
  return { grandTotal, storeBreakdown, unmatched, flippSaleItems, priceMap }
}
