#!/usr/bin/env node
'use strict';

const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

// ─── CONFIG ────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { realtime: { transport: ws } }
);

const TARGET_KEY = '9f36aeafbe60771e321a7cc95a78140772ab3e96';

const IE_STORES = [
  { storeId: '912',  dbId: 'target_chino_grand_ave',           name: 'Chino Grand Ave',          zip: '91710', lat: 34.003217, lng: -117.718361, state: 'CA' },
  { storeId: '258',  dbId: 'target_chino_philadelphia_st',      name: 'Chino Philadelphia St',     zip: '91710', lat: 34.034017, lng: -117.681100, state: 'CA' },
  { storeId: '2499', dbId: 'target_murrieta_clinton_keith_rd',  name: 'Murrieta Clinton Keith',    zip: '92562', lat: 33.604062, lng: -117.172938, state: 'CA' },
  { storeId: '1283', dbId: 'target_murrieta_south',             name: 'Murrieta South',            zip: '92562', lat: 33.565938, lng: -117.203063, state: 'CA' },
  { storeId: '2245', dbId: 'target_ontario_main',               name: 'Ontario Main',              zip: '91764', lat: 34.075563, lng: -117.561688, state: 'CA' },
  { storeId: '3446', dbId: 'target_ontario_north',              name: 'Ontario North',             zip: '91764', lat: 34.076313, lng: -117.618313, state: 'CA' },
];

const SEARCH_TERMS = [
  'eggs', 'milk', 'butter', 'cheese', 'yogurt',
  'chicken', 'ground beef', 'beef', 'pork', 'salmon', 'shrimp',
  'bacon', 'sausage', 'turkey',
  'bread', 'tortillas', 'rice', 'pasta', 'cereal', 'oatmeal',
  'olive oil', 'cooking oil', 'sugar', 'flour',
  'canned beans', 'canned tomatoes', 'soup',
  'orange juice', 'water', 'coffee',
  'potatoes', 'onions', 'apples', 'bananas', 'avocado',
  'snacks', 'chips',
  'laundry detergent', 'paper towels', 'toilet paper', 'trash bags',
  'diapers', 'dish soap',
];

const DELAY_MS  = 1500;
const PAGE_SIZE = 24;
const MAX_PAGES = 3;   // up to 72 products per term
const CHUNK     = 500;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── CATEGORY NORMALIZATION ────────────────────────────────
function normalizeCat(raw) {
  if (!raw) return 'Miscellaneous';
  const c = raw.toLowerCase();
  if (/egg/.test(c))                                        return 'Dairy & Eggs';
  if (/milk|dairy|cheese|butter|yogurt|cream/.test(c))     return 'Dairy & Eggs';
  if (/meat|poultry|seafood|beef|chicken|pork|fish|shrimp|bacon|sausage|turkey/.test(c)) return 'Meat & Seafood';
  if (/produce|vegetable|fruit|fresh/.test(c))             return 'Produce';
  if (/bread|bakery|baked/.test(c))                        return 'Bakery & Bread';
  if (/beverage|juice|water|coffee|tea|drink|soda/.test(c)) return 'Beverages';
  if (/cereal|breakfast|oatmeal/.test(c))                  return 'Breakfast & Cereal';
  if (/snack|chip|cracker|candy|cookie/.test(c))           return 'Snacks & Candy';
  if (/frozen/.test(c))                                    return 'Frozen Foods';
  if (/pasta|rice|grain|flour|sugar|oil|sauce|soup|canned|condiment/.test(c)) return 'Pantry & Canned';
  if (/cleaning|laundry|paper|trash|household/.test(c))    return 'Household & Cleaning';
  if (/baby|diaper|infant/.test(c))                        return 'Baby & Kids';
  if (/pet/.test(c))                                       return 'Pet Care';
  if (/health|beauty|personal/.test(c))                    return 'Health & Beauty';
  return 'Miscellaneous';
}

// ─── PRICE EXTRACTION ──────────────────────────────────────
// Log first product's price structure so we can verify on first run
let priceDiagnosticDone = false;

function extractPrice(product) {
  if (!priceDiagnosticDone) {
    console.log('[target-sweep] DIAGNOSTIC — first product price shape:');
    console.log(JSON.stringify(product?.price, null, 2));
    console.log(JSON.stringify(product?.item?.price, null, 2));
    priceDiagnosticDone = true;
  }
  return (
    product?.price?.current_retail ??
    product?.price?.reg_retail ??
    product?.item?.price?.current_retail ??
    product?.price?.formatted_current_price?.replace(/[^0-9.]/g, '') ?? // e.g. "$3.49"
    null
  );
}

function extractItem(product) {
  const name  = product?.item?.product_description?.title;
  const tcin  = product?.tcin;
  const price = extractPrice(product);

  if (!name || !tcin || !price) return null;

  return {
    upc:      `target_${tcin}`,
    name,
    brand:    product?.item?.primary_brand?.name || null,
    price:    parseFloat(price),
    imageUrl: product?.item?.enrichment?.images?.primary_image_url || null,
    category: product?.item?.product_classification?.item_type?.name || null,
  };
}

// ─── SEARCH (via in-page fetch — inherits _px2) ────────────
async function searchTcins(page, store, term, offset) {
  try {
    const result = await page.evaluate(async ({ key, term, store, offset, pageSize }) => {
      const url = new URL('https://cdui-orchestrations.target.com/cdui_orchestrations/v1/pages/slp');
      Object.entries({
        key, platform: 'WEB', keyword: term,
        store_id: store.storeId, zip: store.zip, state: store.state,
        latitude: store.lat, longitude: store.lng,
        count: pageSize, offset, default_purchasability_filter: true,
        include_sponsored: false, new_search: offset === 0,
        spellcheck: true, channel: 'WEB',
      }).forEach(([k, v]) => url.searchParams.set(k, v));

      const resp = await fetch(url.toString(), { headers: { accept: 'application/json' } });
      return await resp.json();
    }, { key: TARGET_KEY, term, store, offset, pageSize: PAGE_SIZE });

    // Walk the module tree to find TCINs
    const tcins = [];
    const walkModules = (modules) => {
      if (!Array.isArray(modules)) return;
      for (const mod of modules) {
        const tcin = mod?.data?.product?.tcin || mod?.tcin;
        if (tcin) tcins.push(String(tcin));
        if (mod?.data?.modules) walkModules(mod.data.modules);
        if (mod?.modules) walkModules(mod.modules);
      }
    };
    walkModules(result?.data?.modules || result?.modules || []);

    const total = result?.data?.metadata?.total_count ||
                  result?.metadata?.total_count || 0;
    return { tcins, total };
  } catch (err) {
    console.warn(`[target-sweep] Search error "${term}" offset ${offset}: ${err.message}`);
    return { tcins: [], total: 0 };
  }
}

// ─── PRICE FETCH (via in-page fetch — inherits _px2) ───────
async function fetchPrices(page, store, tcins) {
  if (!tcins.length) return [];
  try {
    const products = await page.evaluate(async ({ key, tcins, store }) => {
      const url = new URL('https://redsky.target.com/redsky_aggregations/v1/web/product_summary_with_fulfillment_v1');
      Object.entries({
        key,
        tcins: tcins.join(','),
        store_id: store.storeId,
        zip: store.zip, state: store.state,
        latitude: store.lat, longitude: store.lng,
        required_store_id: store.storeId,
        paid_membership: false, base_membership: false, card_membership: false,
        skip_price_promo: true,
        channel: 'WEB',
      }).forEach(([k, v]) => url.searchParams.set(k, v));

      const resp = await fetch(url.toString(), { headers: { accept: 'application/json' } });
      return await resp.json();
    }, { key: TARGET_KEY, tcins, store });

    return products?.data?.product_summaries || [];
  } catch (err) {
    console.warn(`[target-sweep] Price fetch error: ${err.message}`);
    return [];
  }
}

// ─── SUPABASE WRITES ───────────────────────────────────────
async function batchWrite(storeItems, dbStoreId) {
  const now = new Date().toISOString();
  const productsArr     = [];
  const observationsArr = [];
  const historyArr      = [];

  for (const item of storeItems.values()) {
    productsArr.push({
      upc:                item.upc,
      name:               item.name,
      brand:              item.brand || null,
      image_url:          item.imageUrl || null,
      raw_category:       item.category || null,
      normalized_category: normalizeCat(item.category),
      name_source:        'target_sweep',
      last_scanned_at:    now,
    });
    observationsArr.push({
      barcode:      item.upc,
      product_name: item.name,
      store_id:     dbStoreId,
      price:        item.price,
      voided:       false,
    });
    historyArr.push({
      barcode:     item.upc,
      store_id:    dbStoreId,
      price:       item.price,
      source:      'target_sweep',
      recorded_at: now,
    });
  }

  for (let i = 0; i < productsArr.length; i += CHUNK) {
    const { error } = await supabase.from('products')
      .upsert(productsArr.slice(i, i + CHUNK), { onConflict: 'upc' });
    if (error) console.error(`[target-sweep] Products error: ${error.message}`);
  }
  for (let i = 0; i < observationsArr.length; i += CHUNK) {
    const { error } = await supabase.from('observations')
      .upsert(observationsArr.slice(i, i + CHUNK), { onConflict: 'barcode,store_id' });
    if (error) console.error(`[target-sweep] Observations error: ${error.message}`);
  }
  for (let i = 0; i < historyArr.length; i += CHUNK) {
    const { error } = await supabase.from('price_history')
      .insert(historyArr.slice(i, i + CHUNK));
    if (error) console.error(`[target-sweep] History error: ${error.message}`);
  }

  return productsArr.length;
}

// ─── MAIN ──────────────────────────────────────────────────
async function main() {
  console.log('\n[target-sweep] ════════════════════════════════');
  console.log(`[target-sweep] Starting — ${new Date().toISOString()}`);
  console.log(`[target-sweep] Stores: ${IE_STORES.length}`);
  console.log(`[target-sweep] Terms:  ${SEARCH_TERMS.length}`);
  console.log('[target-sweep] ════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });

  let totalProducts = 0;
  let totalObs      = 0;

  for (const store of IE_STORES) {
    console.log(`\n[target-sweep] → ${store.name} (store ${store.storeId})`);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Warm up session — PerimeterX sets _px2 on page load
    console.log('[target-sweep]   Warming session...');
    await page.goto('https://www.target.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    // Set store cookie
    await context.addCookies([{
      name: 'fiatsCookie',
      value: `DSI_${store.storeId}|DSN_${encodeURIComponent(store.name)}|DSZ_${store.zip}`,
      domain: '.target.com',
      path: '/',
    }]);

    // Navigate to search to fully warm session with store context
    await page.goto(`https://www.target.com/s?searchTerm=eggs`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await sleep(2000);

    const storeItems = new Map();

    for (const term of SEARCH_TERMS) {
      await sleep(DELAY_MS);
      let termCount = 0;

      for (let p = 0; p < MAX_PAGES; p++) {
        const offset = p * PAGE_SIZE;
        const { tcins, total } = await searchTcins(page, store, term, offset);

        if (!tcins.length) break;

        // Fetch prices in batches of 30 (Target's max)
        for (let i = 0; i < tcins.length; i += 30) {
          const batch = tcins.slice(i, i + 30);
          const products = await fetchPrices(page, store, batch);

          for (const raw of products) {
            const item = extractItem(raw);
            if (!item) continue;
            if (!storeItems.has(item.upc)) {
              storeItems.set(item.upc, item);
              termCount++;
            }
          }
          await sleep(500);
        }

        if (offset + PAGE_SIZE >= total || !total) break;
        await sleep(DELAY_MS);
      }

      console.log(`[target-sweep]   "${term}" → ${termCount} new`);
    }

    console.log(`[target-sweep]   Catalog: ${storeItems.size} unique products`);

    const written  = await batchWrite(storeItems, store.dbId);
    totalProducts += written;
    totalObs      += storeItems.size;

    console.log(`[target-sweep]   ✅ ${store.name} done`);
    await context.close();
  }

  await browser.close();

  console.log('\n[target-sweep] ════════════════════════════════');
  console.log(`[target-sweep] Complete — ${new Date().toISOString()}`);
  console.log(`[target-sweep]   Products upserted:     ${totalProducts}`);
  console.log(`[target-sweep]   Observations upserted: ${totalObs}`);
  console.log('[target-sweep] ════════════════════════════════\n');
}

main().catch(err => {
  console.error('[target-sweep] FATAL:', err);
  process.exit(1);
});
