import { supabase } from '../lib/supabase';

export async function fetchAttributeGroups(normalizedCategory, subcategory) {
  const { data: products } = await supabase
    .from('products')
    .select('upc, name, brand, subcategory, attributes')
    .eq('normalized_category', normalizedCategory)
    .eq('subcategory', subcategory)
    .not('attributes', 'eq', '{}');

  if (!products || products.length === 0) return [];

  const upcList = products.map(p => p.upc);

  const { data: observations } = await supabase
    .from('observations')
    .select('barcode, price, store_id, created_at')
    .in('barcode', upcList)
    .eq('voided', false)
    .order('created_at', { ascending: false });

  const latestObs = {};
  for (const obs of observations ?? []) {
    if (!latestObs[obs.barcode]) {
      latestObs[obs.barcode] = obs;
    }
  }

  const groups = {};

  for (const product of products) {
    const parts = Object.keys(product.attributes).sort().map(k => {
      const val = product.attributes[k]?.value;
      return val !== undefined && val !== null ? val : null;
    }).filter(Boolean);
    const key = subcategory + '|' + parts.join('|');

    const label = parts.map(v =>
      String(v).charAt(0).toUpperCase() + String(v).slice(1)
    ).join(' · ');

    const obs = latestObs[product.upc];
    if (!obs) continue;

    const count = product.attributes?.count?.value
      ?? product.attributes?.slice_count?.value;
    const sizeOz = product.attributes?.size_oz?.value;
    let unitPrice = null;
    let unitLabel = null;
    if (count && Number(count) > 0) {
      unitPrice = parseFloat((obs.price / Number(count)).toFixed(4));
      unitLabel = 'per unit';
    } else if (sizeOz && Number(sizeOz) > 0) {
      unitPrice = parseFloat((obs.price / Number(sizeOz)).toFixed(4));
      unitLabel = 'per oz';
    }

    if (!groups[key]) {
      groups[key] = {
        key,
        label,
        productCount: 0,
        storeIds: new Set(),
        lowestPrice: obs.price,
        unitPrice,
        unitLabel,
        freshestScan: obs.created_at,
      };
    }

    const g = groups[key];
    g.productCount += 1;
    g.storeIds.add(obs.store_id);

    if (obs.price < g.lowestPrice) {
      g.lowestPrice = obs.price;
      g.unitPrice = unitPrice;
      g.unitLabel = unitLabel;
    }

    if (obs.created_at > g.freshestScan) {
      g.freshestScan = obs.created_at;
    }
  }

  return Object.values(groups)
    .sort((a, b) => a.lowestPrice - b.lowestPrice)
    .map(g => ({
      key: g.key,
      label: g.label,
      productCount: g.productCount,
      storeCount: g.storeIds.size,
      lowestPrice: Number(g.lowestPrice).toFixed(2),
      unitPrice: g.unitPrice,
      unitLabel: g.unitLabel,
      freshestScan: g.freshestScan,
    }));
}

export async function fetchGroupResults(normalizedCategory, comparableKey) {
  const { data: products } = await supabase
    .from('products')
    .select('upc, name, brand, subcategory, attributes')
    .eq('normalized_category', normalizedCategory)
    .not('attributes', 'eq', '{}');

  if (!products || products.length === 0) return [];

  const matchedProducts = products.filter(product => {
    const parts = Object.keys(product.attributes).sort().map(k => {
      const val = product.attributes[k]?.value;
      return val !== undefined && val !== null ? val : null;
    }).filter(Boolean);
    const key = product.subcategory + '|' + parts.join('|');
    return key === comparableKey;
  });

  if (matchedProducts.length === 0) return [];

  const matchedUpcs = matchedProducts.map(p => p.upc);

  const { data: observations } = await supabase
    .from('observations')
    .select('id, barcode, price, store_id, created_at, promo_type')
    .in('barcode', matchedUpcs)
    .eq('voided', false)
    .order('price', { ascending: true });

  if (!observations || observations.length === 0) return [];

  const uniqueStoreIds = [...new Set(observations.map(o => o.store_id))];

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, location, city, color')
    .in('id', uniqueStoreIds);

  const storeMap = {};
  for (const store of stores ?? []) {
    storeMap[store.id] = store;
  }

  const bestPerStore = {};
  for (const obs of observations) {
    if (!bestPerStore[obs.store_id]) {
      bestPerStore[obs.store_id] = obs;
    }
  }

  return Object.values(bestPerStore)
    .sort((a, b) => a.price - b.price)
    .map(obs => {
      const prod = matchedProducts.find(p => p.upc === obs.barcode);
      const count = prod?.attributes?.count?.value
        ?? prod?.attributes?.slice_count?.value;
      const sizeOz = prod?.attributes?.size_oz?.value;
      let unitPrice = null, unitLabel = null;
      if (count && Number(count) > 0) {
        unitPrice = parseFloat((obs.price / Number(count)).toFixed(4));
        unitLabel = 'per unit';
      } else if (sizeOz && Number(sizeOz) > 0) {
        unitPrice = parseFloat((obs.price / Number(sizeOz)).toFixed(4));
        unitLabel = 'per oz';
      }
      return {
        id: obs.id,
        barcode: obs.barcode,
        productName: prod.name,
        brand: prod.brand,
        price: Number(obs.price).toFixed(2),
        unitPrice,
        unitLabel,
        store: storeMap[obs.store_id] || null,
        createdAt: obs.created_at,
        promoType: obs.promo_type,
      };
    });
}
