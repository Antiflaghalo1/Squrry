import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getAllStores } from '../data/storeService'

export default function SearchView({ onBack, onStoreSelect }) {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState([])
  const [deals, setDeals] = useState([])
  const [storeResults, setStoreResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [stores, setStores] = useState([])
  const [selectedDeal, setSelectedDeal] = useState(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    getAllStores().then(setStores)
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!query.trim()) {
      setProducts([])
      setDeals([])
      setStoreResults([])
      setSearched(false)
      setLoading(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(() => runSearch(query.trim()), 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  async function runSearch(q) {
    const [{ data: prodData }, { data: flippData }, { data: storeData }] = await Promise.all([
      supabase
        .from('products')
        .select('upc, name, image_url, normalized_category, category')
        .ilike('name', `%${q}%`)
        .limit(10),
      supabase
        .from('flipp_observations')
        .select('product_name, store_id, price, sale_type, regular_price, promo_description, merchant_name, clean_image_url')
        .ilike('product_name', `%${q}%`)
        .gt('price', 0)
        .limit(10),
      supabase
        .from('stores')
        .select('id, name, location, city, color')
        .or(`name.ilike.%${q}%,city.ilike.%${q}%,location.ilike.%${q}%`)
        .eq('verified', true)
        .limit(5),
    ])

    let enriched = prodData || []
    if (enriched.length > 0) {
      const upcs = enriched.map(p => String(p.upc))
      const { data: obs } = await supabase
        .from('observations')
        .select('barcode, price, created_at')
        .in('barcode', upcs)
        .gt('price', 0)
        .lte('price', 500)
        .order('created_at', { ascending: false })

      const latestByUpc = {}
      for (const o of obs || []) {
        if (!(o.barcode in latestByUpc)) latestByUpc[o.barcode] = o.price
      }
      enriched = enriched.map(p => ({
        ...p,
        latestPrice: latestByUpc[String(p.upc)] ?? null,
      }))
    }

    setProducts(enriched)
    const seen = new Map()
    for (const item of (flippData || [])) {
      const key = `${item.product_name}|${item.merchant_name}`
      const existing = seen.get(key)
      if (!existing || item.price < existing.price) {
        seen.set(key, item)
      }
    }
    const deduped = [...seen.values()]
    setDeals(deduped)
    setStoreResults(storeData || [])
    setLoading(false)
    setSearched(true)
  }

  const q = query.trim()
  const hasResults = products.length > 0 || deals.length > 0 || storeResults.length > 0

  return (
    <div className="search-view">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="search-input-wrap">
        <Search size={20} className="search-icon" />
        <input
          ref={inputRef}
          className="scan-input search-main-input"
          placeholder="Search products, deals, stores…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {!q && (
        <p className="search-hint">Search for any grocery item 🔍</p>
      )}

      {q && loading && (
        <p className="search-status">Searching…</p>
      )}

      {q && !loading && searched && !hasResults && (
        <p className="search-no-results">No results for '{q}' — scan it to add it! 📷</p>
      )}

      {q && !loading && hasResults && (
        <div className="search-results">
          {storeResults.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">Stores</div>
              {storeResults.map(store => (
                <div
                  key={store.id}
                  className="search-product-row"
                  style={{ cursor: 'pointer', borderLeft: `3px solid ${store.color || 'var(--green)'}`, paddingLeft: 10 }}
                  onClick={() => onStoreSelect?.(store)}
                >
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{store.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{store.city || store.location}</div>
                </div>
              ))}
            </div>
          )}

          {products.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">Community Scanned</div>
              <div className="recent-list">
                {products.map(item => (
                  <div key={item.upc} className="recent-card">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="recent-thumb" />
                      : <div className="recent-thumb recent-thumb-placeholder">🛒</div>
                    }
                    <div className="recent-info">
                      <div className="recent-name">{item.name}</div>
                      {(item.normalized_category || item.category) && (
                        <div className="recent-cat">{item.normalized_category || item.category}</div>
                      )}
                      {item.latestPrice != null && (
                        <div className="recent-price">${item.latestPrice.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deals.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">This Week's Deals</div>
              <div className="recent-list">
                {deals.map((deal, i) => {
                  const storeName = stores.find(s => String(s.id) === String(deal.store_id))?.name || deal.store_id
                  return (
                    <div key={i} className="recent-card" onClick={() => setSelectedDeal(deal)} style={{cursor:'pointer'}}>
                      <div className="recent-thumb recent-thumb-placeholder">🏷️</div>
                      <div className="recent-info">
                        <div className="recent-name">{deal.product_name}</div>
                        <div className="search-deal-price">${Number(deal.price).toFixed(2)}</div>
                        {deal.regular_price && <span style={{fontSize:11, color:'var(--text-muted)', textDecoration:'line-through'}}>${Number(deal.regular_price).toFixed(2)}</span>}
                        {deal.promo_description && <span className="store-deal-promo-badge">{deal.promo_description}</span>}
                        {storeName && <div className="recent-cat">{storeName}</div>}
                        <span className="sale-badge search-sale-badge">On Sale</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {selectedDeal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setSelectedDeal(null)}>
          <div style={{background:'var(--card-bg)',borderRadius:16,padding:24,maxWidth:320,width:'90%',position:'relative',textAlign:'center'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedDeal(null)} style={{position:'absolute',top:12,right:12,background:'none',border:'none',fontSize:18,cursor:'pointer',color:'var(--text-muted)'}}>✕</button>
            {selectedDeal.clean_image_url && <img src={selectedDeal.clean_image_url} alt={selectedDeal.product_name} style={{maxWidth:180,maxHeight:180,objectFit:'contain',display:'block',margin:'0 auto 12px'}} />}
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>{selectedDeal.product_name}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>
              {selectedDeal.regular_price && <span style={{fontSize:14,color:'var(--text-muted)',textDecoration:'line-through'}}>${Number(selectedDeal.regular_price).toFixed(2)}</span>}
              <span style={{fontSize:20,fontWeight:800,color:'var(--green)'}}>${Number(selectedDeal.price).toFixed(2)}</span>
            </div>
            {selectedDeal.promo_description && <span className="store-deal-promo-badge" style={{display:'inline-block',marginBottom:8}}>{selectedDeal.promo_description}</span>}
            {selectedDeal.post_price_text && <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:8}}>{selectedDeal.post_price_text}</div>}
            {selectedDeal.valid_to && <div style={{fontSize:12,color:'var(--text-muted)'}}>Valid to: {new Date(selectedDeal.valid_to).toLocaleDateString()}</div>}
            <div style={{fontSize:12,color:'var(--green)',marginTop:8,fontWeight:600}}>{selectedDeal.merchant_name}</div>
          </div>
        </div>
      )}
    </div>
  )
}
