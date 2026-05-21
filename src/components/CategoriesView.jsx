import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CategoriesView({ onBack }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .not('category', 'is', null)
      .order('last_scanned_at', { ascending: false })

    if (!data || data.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    const groupMap = {}
    for (const p of data) {
      const key = p.category.split(' > ')[0].trim()
      if (!groupMap[key]) groupMap[key] = { name: key, products: [], thumbnail: null }
      groupMap[key].products.push(p)
      if (!groupMap[key].thumbnail && p.image_url) groupMap[key].thumbnail = p.image_url
    }

    setGroups(Object.values(groupMap))
    setLoading(false)
  }

  if (expanded) {
    const group = groups.find(g => g.name === expanded)
    return (
      <div className="categories-view">
        <button className="back-btn" onClick={() => setExpanded(null)}>← Categories</button>
        <div className="categories-header">
          <h2 className="categories-title">{group.name}</h2>
          <p className="categories-sub">
            {group.products.length} product{group.products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="recent-list">
          {group.products.map(item => (
            <div key={item.upc} className="recent-card">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="recent-thumb" />
              ) : (
                <div className="recent-thumb recent-thumb-placeholder">🛒</div>
              )}
              <div className="recent-info">
                <div className="recent-name">{item.name}</div>
                {item.brand && <div className="recent-brand">{item.brand}</div>}
                {item.category && <div className="recent-cat">{item.category}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="categories-view">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="categories-header">
        <h2 className="categories-title">🗂️ Categories</h2>
        <p className="categories-sub">Built from real community scans</p>
      </div>

      {loading && <p className="recent-loading">Loading categories…</p>}

      {!loading && groups.length === 0 && (
        <div className="recent-empty">
          <p className="recent-empty-title">Nothing here yet — start scanning! 🐿️</p>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="categories-grid">
          {groups.map(g => (
            <button
              key={g.name}
              className="cat-card"
              onClick={() => setExpanded(g.name)}
            >
              {g.thumbnail && (
                <div
                  className="cat-card-bg"
                  style={{ backgroundImage: `url(${g.thumbnail})` }}
                />
              )}
              <div className="cat-card-name">{g.name}</div>
              <div className="cat-card-count">
                {g.products.length} item{g.products.length !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
