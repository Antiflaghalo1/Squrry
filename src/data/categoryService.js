import { supabase } from '../lib/supabase';

export async function fetchAttributeGroups(normalizedCategory, subcategory) {
  const { data: products } = await supabase
    .from('products')
    .select('upc, name, brand, image_url, subcategory, attributes')
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
        imageUrl: product.image_url || null,
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
      g.imageUrl = product.image_url || null;
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
      imageUrl: g.imageUrl,
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

  const bestPerPair = new Map();
  for (const obs of observations) {
    const key = `${obs.barcode}|${obs.store_id}`;
    const existing = bestPerPair.get(key);
    if (!existing || obs.created_at > existing.created_at) {
      bestPerPair.set(key, obs);
    }
  }

  return Array.from(bestPerPair.values())
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
        imageUrl: prod.image_url || null,
        price: Number(obs.price).toFixed(2),
        unitPrice,
        unitLabel,
        store: storeMap[obs.store_id] || null,
        createdAt: obs.created_at,
        promoType: obs.promo_type,
      };
    });
}

export async function fetchUntaggedItems(normalizedCategory) {
  const { data: products } = await supabase
    .from('products')
    .select('upc, name, brand, image_url, subcategory, attributes')
    .eq('normalized_category', normalizedCategory)
    .or('subcategory.is.null,attributes.eq.{}');

  if (!products || products.length === 0) return [];

  const upcList = products.map(p => p.upc);

  const { data: observations } = await supabase
    .from('observations')
    .select('id, barcode, price, store_id, created_at')
    .in('barcode', upcList)
    .eq('voided', false)
    .order('created_at', { ascending: false });

  const newestPerPair = new Map();
  for (const obs of observations ?? []) {
    const key = `${obs.barcode}|${obs.store_id}`;
    if (!newestPerPair.has(key)) {
      newestPerPair.set(key, obs);
    }
  }

  const uniqueStoreIds = [...new Set(
    Array.from(newestPerPair.values()).map(o => o.store_id)
  )];

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, location, city, color')
    .in('id', uniqueStoreIds);

  const storeMap = {};
  for (const store of stores ?? []) {
    storeMap[store.id] = store;
  }

  const results = [];

  for (const product of products) {
    const productObs = Array.from(newestPerPair.values()).filter(
      o => o.barcode === product.upc
    );
    if (productObs.length === 0) continue;

    const best = productObs.reduce((a, b) => a.price < b.price ? a : b);

    results.push({
      upc: product.upc,
      productName: product.name,
      brand: product.brand,
      imageUrl: product.image_url || null,
      lowestPrice: Number(best.price).toFixed(2),
      store: storeMap[best.store_id] || null,
      createdAt: best.created_at,
      observationCount: productObs.length,
    });
  }

  return results.sort((a, b) => a.lowestPrice - b.lowestPrice);
}

export async function fetchDepartmentBrowse(normalizedCategory) {
  const { data: allProducts } = await supabase
    .from('products')
    .select('upc, subcategory, attributes, image_url')
    .eq('normalized_category', normalizedCategory);

  if (!allProducts) return { subcategories: [], untaggedCount: 0 };

  const tagged = allProducts.filter(p =>
    p.subcategory && p.attributes && Object.keys(p.attributes).length > 0
  );
  const untaggedCount = allProducts.length - tagged.length;

  const taggedUpcs = tagged.map(p => p.upc);
  if (taggedUpcs.length === 0) return { subcategories: [], untaggedCount };

  const { data: obs } = await supabase
    .from('observations')
    .select('barcode, price, created_at')
    .in('barcode', taggedUpcs)
    .eq('voided', false)
    .order('created_at', { ascending: false });

  const latestObs = {};
  for (const o of obs ?? []) {
    if (!latestObs[o.barcode]) {
      latestObs[o.barcode] = o;
    }
  }

  const groups = {};
  for (const product of tagged) {
    const o = latestObs[product.upc];
    if (!o) continue;

    if (!groups[product.subcategory]) {
      groups[product.subcategory] = {
        key: product.subcategory,
        productCount: 0,
        lowestPrice: Infinity,
        imageUrl: null,
      };
    }

    const g = groups[product.subcategory];
    g.productCount += 1;

    if (o.price < g.lowestPrice) {
      g.lowestPrice = o.price;
      g.imageUrl = product.image_url;
    }
  }

  const subcategories = Object.values(groups)
    .filter(g => g.lowestPrice !== Infinity)
    .sort((a, b) => a.lowestPrice - b.lowestPrice)
    .map(g => ({
      key: g.key,
      productCount: g.productCount,
      lowestPrice: Number(g.lowestPrice).toFixed(2),
      imageUrl: g.imageUrl,
    }));

  return { subcategories, untaggedCount };
}

export async function fetchSubcategoryDrill(normalizedCategory, subcategory, filters) {
  const { data: schemaRow } = await supabase
    .from('category_schemas')
    .select('schema')
    .eq('subcategory', subcategory)
    .maybeSingle();

  if (!schemaRow) return null;
  const schema = schemaRow.schema;

  const schemaEntries = Object.entries(schema)
    .sort(([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99));

  const nextEntry = schemaEntries.find(
    ([k, def]) => def.required && !(k in filters)
  );
  const nextAttribute = nextEntry
    ? { key: nextEntry[0], def: nextEntry[1] }
    : null;

  const { data: rawProducts } = await supabase
    .from('products')
    .select('upc, name, brand, image_url, subcategory, attributes')
    .eq('normalized_category', normalizedCategory)
    .eq('subcategory', subcategory)
    .not('attributes', 'eq', '{}');

  const products = (rawProducts || []).filter(p =>
    Object.entries(filters).every(([k, v]) =>
      p.attributes?.[k]?.value === v
    )
  );

  const { data: observations } = await supabase
    .from('observations')
    .select('id, barcode, price, store_id, created_at, promo_type')
    .in('barcode', products.map(p => p.upc))
    .eq('voided', false)
    .order('created_at', { ascending: false });

  const newestPerPair = new Map();
  const latestByBarcode = {};
  for (const o of observations ?? []) {
    const key = `${o.barcode}|${o.store_id}`;
    if (!newestPerPair.has(key)) {
      newestPerPair.set(key, o);
    }
    if (!latestByBarcode[o.barcode]) {
      latestByBarcode[o.barcode] = o;
    }
  }

  let distinctNextValues = [];
  let productResults = [];

  if (nextAttribute) {
    const group = {};
    for (const product of products) {
      const val = product.attributes?.[nextAttribute.key]?.value;
      if (val === undefined || val === null) continue;

      if (!group[val]) {
        group[val] = {
          value: val,
          productCount: 0,
          storeIds: new Set(),
          lowestPrice: Infinity,
          unitPrice: null,
          unitLabel: null,
          imageUrl: null,
        };
      }

      const g = group[val];
      g.productCount += 1;

      const productObsList = Array.from(newestPerPair.values()).filter(
        o => o.barcode === product.upc
      );

      for (const o of productObsList) {
        g.storeIds.add(o.store_id);

        if (o.price < g.lowestPrice) {
          g.lowestPrice = o.price;
          g.imageUrl = product.image_url;

          const count = product.attributes?.count?.value
            ?? product.attributes?.slice_count?.value;
          const sizeOz = product.attributes?.size_oz?.value;
          g.unitPrice = null;
          g.unitLabel = null;
          if (count && Number(count) > 0) {
            g.unitPrice = parseFloat((o.price / Number(count)).toFixed(4));
            g.unitLabel = 'per unit';
          } else if (sizeOz && Number(sizeOz) > 0) {
            g.unitPrice = parseFloat((o.price / Number(sizeOz)).toFixed(4));
            g.unitLabel = 'per oz';
          }
        }
      }
    }

    distinctNextValues = Object.values(group)
      .filter(g => g.lowestPrice !== Infinity)
      .sort((a, b) => a.lowestPrice - b.lowestPrice)
      .map(g => ({
        value: g.value,
        productCount: g.productCount,
        storeCount: g.storeIds.size,
        lowestPrice: Number(g.lowestPrice).toFixed(2),
        unitPrice: g.unitPrice,
        unitLabel: g.unitLabel,
        imageUrl: g.imageUrl,
      }));
  } else {
    const uniqueStoreIds = [...new Set(
      Array.from(newestPerPair.values()).map(o => o.store_id)
    )];

    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, location, city, color')
      .in('id', uniqueStoreIds);

    const storeMap = {};
    for (const store of stores ?? []) {
      storeMap[store.id] = store;
    }

    productResults = Array.from(newestPerPair.values())
      .sort((a, b) => a.price - b.price)
      .map(obs => {
        const product = products.find(p => p.upc === obs.barcode);
        const count = product?.attributes?.count?.value
          ?? product?.attributes?.slice_count?.value;
        const sizeOz = product?.attributes?.size_oz?.value;
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
          productName: product?.name,
          brand: product?.brand,
          imageUrl: product?.image_url || null,
          price: Number(obs.price).toFixed(2),
          unitPrice,
          unitLabel,
          store: storeMap[obs.store_id] || null,
          createdAt: obs.created_at,
          promoType: obs.promo_type,
        };
      });
  }

  return { schema, nextAttribute, distinctNextValues, productResults };
}
