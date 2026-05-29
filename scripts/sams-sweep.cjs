#!/usr/bin/env node
'use strict';

const ws = require('ws')
const { createClient } = require('@supabase/supabase-js')

// ─── CONFIG ────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { realtime: { transport: ws } }
)

const GRAPHQL_HASH = '1adac53cc1160bea6a18547ad8baf9458b588ba92041439d221162e898a1f51e'
const GRAPHQL_BASE = `https://www.samsclub.com/orchestra/snb/graphql/Search/${GRAPHQL_HASH}/search`

const IE_STORES = [
  { storeId: '6610', dbId: 'sams_chino',   city: 'Chino'   },
  { storeId: '6619', dbId: 'sams_ontario', city: 'Ontario' },
]

const SEARCH_TERMS = [
  'eggs', 'milk', 'butter', 'cheese', 'yogurt', 'cream',
  'chicken', 'ground beef', 'beef', 'pork', 'salmon', 'shrimp',
  'bacon', 'sausage', 'hot dogs', 'turkey',
  'bread', 'tortillas', 'rice', 'pasta', 'cereal', 'oatmeal',
  'olive oil', 'cooking oil', 'sugar', 'flour',
  'canned beans', 'canned tomatoes', 'soup',
  'orange juice', 'water', 'coffee',
  'potatoes', 'onions', 'apples', 'bananas', 'avocado',
  'snacks', 'chips',
  'laundry detergent', 'paper towels', 'toilet paper', 'trash bags',
  'diapers', 'dish soap',
]

const PAGE_SIZE = 45
const MAX_PAGES = 5   // cap at 225 per term
const DELAY_MS  = 1200
const CHUNK     = 500
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── SEARCH ────────────────────────────────────────────────
async function searchProducts(storeId, term, page = 1) {
  const variables = {
    query:                term,
    page,
    ps:                   PAGE_SIZE,
    prg:                  'mWeb',
    tenant:               'SAMS_GLASS',
    sort:                 'best_match',
    catId:                '',
    facet:                '',
    fungibilityEnabled:   false,
    fetchMarquee:         false,
    fetchSkyline:         false,
    fetchGallery:         false,
    fetchSbaTop:          false,
    fetchDac:             false,
    fetchDataV1:          false,
    fetchDataV2:          false,
    additionalQueryParams: {
      isMoreOptionsTileEnabled: true,
      isGenAiEnabled:           false,
    },
  }

  const url = `${GRAPHQL_BASE}?variables=${encodeURIComponent(JSON.stringify(variables))}`

  try {
    const res = await fetch(url, {
      headers: {
        'accept':                  'application/json',
        'content-type':            'application/json',
        'tenant-id':               'gj9b60',
        'x-o-bu':                  'SAMS-US',
        'x-o-mart':                'B2C',
        'x-o-platform':            'rweb',
        'x-apollo-operation-name': 'Search',
        'user-agent':              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
        // Pass store ID via cookie for store-specific pricing
        'cookie':                  `assortmentStoreId=${storeId}`,
      },
    })

    if (!res.ok) {
      console.warn(`[sams-sweep] HTTP ${res.status} for "${term}"`)
      return { items: [], total: 0 }
    }

    const data       = await res.json()
    const stacks     = data?.data?.search?.searchResult?.itemStacks || []
    const stack      = stacks[0] || {}
    const items      = stack.itemsV2 || []
    const total      = stack.meta?.totalItemCount || 0

    return { items, total }
  } catch (err) {
    console.warn(`[sams-sweep] Fetch error "${term}": ${err.message}`)
    return { items: [], total: 0 }
  }
}

// ─── ITEM EXTRACTION ───────────────────────────────────────
function extractItem(item) {
  const name  = item.name
  const price = item.priceInfo?.currentPrice?.price

  if (!name || !price) return null
  if (item.availabilityStatusV2?.value === 'OUT_OF_STOCK') return null

  return {
    upc:          `sams_${item.usItemId}`,
    name,
    brand:        item.brand || item.manufacturerName || null,
    imageUrl:     item.imageInfo?.thumbnailUrl || null,
    price:        parseFloat(price),
    wasPrice:     item.priceInfo?.wasPrice?.price ? parseFloat(item.priceInfo.wasPrice.price) : null,
    unitPrice:    item.priceInfo?.unitPrice?.priceString || null,
    category:     item.departmentName || item.type || null,
  }
}

// ─── SUPABASE WRITES ───────────────────────────────────────
async function batchWrite(storeItems, dbStoreId) {
  const productsToUpsert     = []
  const observationsToUpsert = []
  const priceHistoryToInsert = []

  const now = new Date().toISOString()

  for (const item of storeItems.values()) {
    productsToUpsert.push({
      upc:             item.upc,
      name:            item.name,
      brand:           item.brand || null,
      image_url:       item.imageUrl || null,
      raw_category:    item.category || null,
      name_source:     'sams_sweep',
      last_scanned_at: now,
    })

    observationsToUpsert.push({
      barcode:      item.upc,
      product_name: item.name,
      store_id:     dbStoreId,
      price:        item.wasPrice ?? item.price,
      voided:       false,
    })

    priceHistoryToInsert.push({
      barcode:     item.upc,
      store_id:    dbStoreId,
      price:       item.wasPrice ?? item.price,
      source:      'sams_sweep',
      recorded_at: now,
    })
  }

  // Write products
  for (let i = 0; i < productsToUpsert.length; i += CHUNK) {
    const batch         = productsToUpsert.slice(i, i + CHUNK)
    const { error }     = await supabase.from('products').upsert(batch, { onConflict: 'upc' })
    if (error) console.error(`[sams-sweep] Products batch error: ${error.message}`)
  }

  // Write observations
  for (let i = 0; i < observationsToUpsert.length; i += CHUNK) {
    const batch         = observationsToUpsert.slice(i, i + CHUNK)
    const { error }     = await supabase.from('observations').upsert(batch, { onConflict: 'barcode,store_id' })
    if (error) console.error(`[sams-sweep] Observations batch error: ${error.message}`)
  }

  // Write price history
  for (let i = 0; i < priceHistoryToInsert.length; i += CHUNK) {
    const batch         = priceHistoryToInsert.slice(i, i + CHUNK)
    const { error }     = await supabase.from('price_history').insert(batch)
    if (error) console.error(`[sams-sweep] Price history batch error: ${error.message}`)
  }

  return productsToUpsert.length
}

// ─── MAIN ──────────────────────────────────────────────────
async function main() {
  console.log('\n[sams-sweep] ════════════════════════════════')
  console.log(`[sams-sweep] Starting — ${new Date().toISOString()}`)
  console.log(`[sams-sweep] Stores: ${IE_STORES.length}`)
  console.log(`[sams-sweep] Terms:  ${SEARCH_TERMS.length}`)
  console.log('[sams-sweep] ════════════════════════════════\n')

  let totalProducts = 0
  let totalObs      = 0

  for (const store of IE_STORES) {
    console.log(`\n[sams-sweep] → ${store.city} (store ${store.storeId})`)

    const storeItems = new Map() // upc → item

    for (const term of SEARCH_TERMS) {
      await sleep(DELAY_MS)
      let page      = 1
      let termCount = 0

      while (true) {
        const { items, total } = await searchProducts(store.storeId, term, page)
        if (!items.length) break

        for (const raw of items) {
          const item = extractItem(raw)
          if (!item) continue
          if (!storeItems.has(item.upc)) {
            storeItems.set(item.upc, item)
            termCount++
          }
        }

        if (items.length < PAGE_SIZE || page >= MAX_PAGES) break
        page++
        await sleep(DELAY_MS)
      }

      console.log(`[sams-sweep]   "${term}" → ${termCount} new`)
    }

    console.log(`[sams-sweep]   Catalog: ${storeItems.size} unique products`)

    const written  = await batchWrite(storeItems, store.dbId)
    totalProducts += written
    totalObs      += storeItems.size

    console.log(`[sams-sweep]   ✅ ${store.city} done`)
  }

  console.log('\n[sams-sweep] ════════════════════════════════')
  console.log(`[sams-sweep] Complete — ${new Date().toISOString()}`)
  console.log(`[sams-sweep]   Products upserted:     ${totalProducts}`)
  console.log(`[sams-sweep]   Observations upserted: ${totalObs}`)
  console.log('[sams-sweep] ════════════════════════════════\n')
}

main().catch(err => {
  console.error('[sams-sweep] FATAL:', err)
  process.exit(1)
})
