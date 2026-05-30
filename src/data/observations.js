import { supabase } from '../lib/supabase'
import normalizeCategory from '../utils/normalizeCategory'

const OBS_KEY = 'squrry_observations'

const oldObs = localStorage.getItem('basketsplit_observations')
if (oldObs) {
  localStorage.setItem('squrry_observations', oldObs)
  localStorage.removeItem('basketsplit_observations')
}

export async function addObservation(obs, userId) {
  const dbRow = {
    ...(userId && { user_id: userId }),
    barcode: String(obs.barcode),
    product_name: obs.productName,
    store_id: obs.storeId,
    price: obs.price,
    price_unit: obs.price_unit || 'ea',
    promo_type: obs.promo_type || 'regular',
    promo_price: obs.promo_price || null,
    promo_quantity: obs.promo_quantity || null,
    has_photo: obs.hasPhoto || false,
  }

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 5000))

  try {
    const result = await Promise.race([
      supabase.from('observations').insert(dbRow),
      timeout,
    ])
    if (result?.error) throw result.error
    return { queued: false }
  } catch {
    try {
      const queue = JSON.parse(localStorage.getItem('squrry_submission_queue') || '[]')
      queue.push({ ...dbRow, queued_at: new Date().toISOString() })
      localStorage.setItem('squrry_submission_queue', JSON.stringify(queue))
    } catch {}
    return { queued: true }
  }
}

export async function submitProductForReview(submission, userId) {
  const dbRow = {
    ...(userId && { submitted_by: userId }),
    barcode: submission.barcode ? String(submission.barcode) : null,
    product_name: submission.name,
    brand: submission.brand || null,
    category: submission.category || null,
    normalized_category: normalizeCategory(submission.category || '', submission.name || ''),
    quantity: submission.quantity || null,
    image_url: submission.image_url || null,
    store_id: submission.storeId,
    price: submission.price,
    price_unit: submission.price_unit || 'ea',
    promo_type: submission.promo_type || 'regular',
    promo_price: submission.promo_price || null,
    promo_quantity: submission.promo_quantity || null,
    has_photo: submission.hasPhoto || false,
    status: 'pending',
    source: submission.barcode ? 'scan' : 'manual',
  }

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 5000))

  try {
    const result = await Promise.race([
      supabase.from('product_submissions').insert(dbRow),
      timeout,
    ])
    if (result?.error) throw result.error
    return { queued: false }
  } catch {
    try {
      const queue = JSON.parse(localStorage.getItem('squrry_product_submission_queue') || '[]')
      queue.push({ ...dbRow, queued_at: new Date().toISOString() })
      localStorage.setItem('squrry_product_submission_queue', JSON.stringify(queue))
    } catch {}
    return { queued: true }
  }
}

export async function upsertProduct(product) {
  const mkTimeout = () => new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 5000))

  const row = {
    upc: String(product.upc),
    name: product.name,
    brand: product.brand || null,
    category: product.category || null,
    raw_category: product.category || null,
    normalized_category: normalizeCategory(product.category || '', product.name || ''),
    quantity: product.quantity || null,
    image_url: product.image_url || null,
    last_scanned_at: new Date().toISOString(),
  }

  try {
    const selectResult = await Promise.race([
      supabase.from('products').select('name_confidence').eq('upc', row.upc).maybeSingle(),
      mkTimeout(),
    ])
    if (selectResult?.error) throw selectResult.error

    const existing = selectResult?.data
    const isApiSource = product.source === 'OFF' || product.source === 'UPCitemdb'
    const existingHighConfidence = existing && (existing.name_confidence ?? 1) > 1

    if (existing && product.preserveExistingProduct) {
      const updateResult = await Promise.race([
        supabase.from('products').update({ last_scanned_at: row.last_scanned_at }).eq('upc', row.upc),
        mkTimeout(),
      ])
      if (updateResult?.error) throw updateResult.error
      return
    }

    if (existingHighConfidence && !isApiSource) {
      // High-confidence name wins — only refresh the timestamp
      const updateResult = await Promise.race([
        supabase.from('products').update({ last_scanned_at: row.last_scanned_at }).eq('upc', row.upc),
        mkTimeout(),
      ])
      if (updateResult?.error) throw updateResult.error
      return
    }

    const upsertResult = await Promise.race([
      supabase.from('products').upsert(row, { onConflict: 'upc' }),
      mkTimeout(),
    ])
    if (upsertResult?.error) throw upsertResult.error
  } catch {
    try {
      const pq = JSON.parse(localStorage.getItem('squrry_product_queue') || '[]')
      pq.push(row)
      localStorage.setItem('squrry_product_queue', JSON.stringify(pq))
    } catch {}
  }
}

export function getObservations() {
  try {
    return JSON.parse(localStorage.getItem(OBS_KEY) || '[]')
  } catch {
    return []
  }
}

export async function fetchCategorySchema(subcategory) {
  if (subcategory == null || subcategory === '') return null

  const { data, error } = await supabase
    .from('category_schemas')
    .select('schema, tagger_enabled, department')
    .eq('subcategory', subcategory)
    .maybeSingle()

  if (error) {
    console.warn('[fetchCategorySchema] error:', error)
    return null
  }

  if (data == null) return null

  return data
}

const VALID_SOURCES = ['upc_db', 'community', 'admin', 'user']
const VALID_CONFIDENCES = ['low', 'medium', 'high']

export async function upsertProductAttribute({ upc, key, value, source, confidence }) {
  for (const [name, val] of [['upc', upc], ['key', key], ['source', source], ['confidence', confidence]]) {
    if (val == null || val === '') {
      console.warn('[upsertProductAttribute] missing field:', name)
      return null
    }
  }

  if (value === undefined || value === null) {
    console.warn('[upsertProductAttribute] missing field:', 'value')
    return null
  }

  if (!VALID_SOURCES.includes(source)) {
    console.warn('[upsertProductAttribute] missing field:', 'source')
    return null
  }

  if (!VALID_CONFIDENCES.includes(confidence)) {
    console.warn('[upsertProductAttribute] missing field:', 'confidence')
    return null
  }

  const { data, error } = await supabase.rpc('upsert_product_attribute', {
    p_upc: upc,
    p_key: key,
    p_value: value,
    p_source: source,
    p_confidence: confidence,
  })

  if (error) {
    console.warn('[upsertProductAttribute] error:', error)
    return null
  }

  return data
}
