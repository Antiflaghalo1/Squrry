import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function categoryEmoji(name) {
  const n = (name || '').toLowerCase()
  if (/watermelon|apple|banana|grape|berry|strawberr|blueberr|raspberr|peach|pear|mango|pineapple|orange|lemon|lime|cherry|melon|avocado|tomato|lettuce|spinach|kale|broccoli|carrot|celery|pepper|cucumber|zucchini|mushroom|onion|garlic|potato|corn|peas|bean|asparagus|cauliflower/.test(n)) return '🥬'
  if (/chicken|beef|pork|turkey|salmon|tuna|shrimp|steak|ground|sausage|bacon|ham|lamb|fish|seafood|tilapia|cod|crab|lobster/.test(n)) return '🥩'
  if (/milk|yogurt|cheese|butter|cream|dairy|egg/.test(n)) return '🥛'
  if (/bread|bagel|muffin|croissant|bun|roll|tortilla|wrap|pita|cake|cookie|brownie|pastry/.test(n)) return '🥖'
  if (/juice|water|soda|pop|drink|tea|coffee|lemonade|cola|beer|wine|sparkling/.test(n)) return '🥤'
  if (/chip|cracker|pretzel|popcorn|snack|nut|almond|cashew|granola|trail mix/.test(n)) return '🍿'
  if (/frozen|ice cream|pizza|waffle|burrito/.test(n)) return '🧊'
  if (/pasta|noodle|rice|quinoa|oat|cereal|flour|sugar|oil|sauce|soup|canned|salsa|peanut butter|jelly|jam|mayo|mustard|ketchup|vinegar|syrup/.test(n)) return '🥫'
  return '🛒'
}

export default function AllDealsView({ onBack }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [filterMerchant, setFilterMerchant] = useState('All')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    async function loadDeals() {
      setLoading(true)
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('flipp_observations')
          .select('product_name, store_id, price, regular_price, promo_description, clean_image_url, post_price_text, valid_to, merchant_name')
          .gt('price', 0)
          .or(`valid_to.is.null,valid_to.gte.${today}`)
          .order('price', { ascending: true })
          .range(0, 49)
        const dedupeMap = new Map()
        for (const item of (data || [])) {
          const key = `${item.product_name}|${item.merchant_name}`
          if (!dedupeMap.has(key) || item.price < dedupeMap.get(key).price) {
            dedupeMap.set(key, item)
          }
        }
        setDeals(Array.from(dedupeMap.values()))
        setHasMore((data || []).length >= 50)
      } catch {
        setDeals([])
      }
      setLoading(false)
    }
    loadDeals()
  }, [])

  async function loadMore() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const from = (page + 1) * 50
      const to = (page + 2) * 50 - 1
      const { data } = await supabase
        .from('flipp_observations')
        .select('product_name, store_id, price, regular_price, promo_description, clean_image_url, post_price_text, valid_to, merchant_name')
        .gt('price', 0)
        .or(`valid_to.is.null,valid_to.gte.${today}`)
        .order('price', { ascending: true })
        .range(from, to)
      const newItems = data || []
      setDeals(prev => [...prev, ...newItems])
      setPage(p => p + 1)
      if (newItems.length < 50) setHasMore(false)
    } catch {
      setHasMore(false)
    }
  }

  const merchants = ['All', ...Array.from(new Set(deals.map(d => d.merchant_name).filter(Boolean)))]
  const filtered = filterMerchant === 'All' ? deals : deals.filter(d => d.merchant_name === filterMerchant)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text)', padding: '0 10px 0 0' }}
        >←</button>
        <span style={{ fontWeight: 700, fontSize: 18 }}>All Deals 🏷️</span>
      </div>

      {merchants.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 12 }}>
          {merchants.map(m => (
            <button
              key={m}
              onClick={() => setFilterMerchant(m)}
              style={{
                flexShrink: 0,
                padding: '5px 13px',
                borderRadius: 20,
                border: '1.5px solid var(--green)',
                background: filterMerchant === m ? 'var(--green)' : 'transparent',
                color: filterMerchant === m ? '#fff' : 'var(--green)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >{m}</button>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>Loading deals…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>No deals found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((deal, i) => (
            <div
              key={i}
              onClick={() => setSelectedDeal(deal)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card-bg)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              {deal.clean_image_url
                ? <img src={deal.clean_image_url} alt={deal.product_name} style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} />
                : <div style={{ width: 60, height: 60, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{categoryEmoji(deal.product_name)}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deal.product_name}</div>
                {deal.merchant_name && <div style={{ fontSize: 12, color: 'var(--green)', opacity: 0.8, marginBottom: 3 }}>{deal.merchant_name}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {deal.regular_price && <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through', marginRight: 4 }}>${Number(deal.regular_price).toFixed(2)}</span>}
                  <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 15 }}>${Number(deal.price).toFixed(2)}</span>
                </div>
                {deal.promo_description && <span className="store-deal-promo-badge" style={{ marginTop: 4, display: 'inline-block' }}>{deal.promo_description}</span>}
              </div>
            </div>
          ))}
          {hasMore && <button onClick={loadMore} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--green)', fontWeight: 700, cursor: 'pointer', margin: '16px 0' }}>Load more deals</button>}
        </div>
      )}

      {selectedDeal && (
        <div className="store-deal-modal-overlay" onClick={() => setSelectedDeal(null)}>
          <div className="store-deal-modal" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedDeal(null)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}
            >✕</button>
            {selectedDeal.clean_image_url && (
              <img src={selectedDeal.clean_image_url} alt={selectedDeal.product_name} style={{ maxWidth: '180px', maxHeight: '180px', objectFit: 'contain', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
            )}
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{selectedDeal.product_name}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              {selectedDeal.regular_price && (
                <span style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'line-through' }}>${Number(selectedDeal.regular_price).toFixed(2)}</span>
              )}
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>${Number(selectedDeal.price).toFixed(2)}</span>
            </div>
            {selectedDeal.promo_description && (
              <span className="store-deal-promo-badge" style={{ display: 'inline-block', marginBottom: 8 }}>{selectedDeal.promo_description}</span>
            )}
            {selectedDeal.post_price_text && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{selectedDeal.post_price_text}</div>
            )}
            {selectedDeal.valid_to && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Valid to: {new Date(selectedDeal.valid_to).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
