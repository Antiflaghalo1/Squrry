import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { removeSavedItem } from '../data/savedItems'

function SwipableRow({ item, isSelected, minPrice, pricesLoading, onToggle, onRemove }) {
  const outerRef = useRef(null)
  const contentRef = useRef(null)
  const startXRef = useRef(0)
  const currentDeltaRef = useRef(0)
  const isSnappedRef = useRef(false)
  const suppressNextClickRef = useRef(false)

  function snapBack() {
    isSnappedRef.current = false
    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 0.2s ease'
      contentRef.current.style.transform = 'translateX(0px)'
    }
  }

  function doRemove() {
    if (!contentRef.current) return
    contentRef.current.style.transition = 'transform 0.22s ease'
    contentRef.current.style.transform = 'translateX(-110%)'
    onRemove()
    setTimeout(() => {
      if (!outerRef.current) return
      const h = outerRef.current.offsetHeight
      outerRef.current.style.maxHeight = h + 'px'
      outerRef.current.getBoundingClientRect()
      outerRef.current.style.transition = 'max-height 0.28s ease, opacity 0.28s ease'
      outerRef.current.style.maxHeight = '0px'
      outerRef.current.style.opacity = '0'
    }, 200)
    setTimeout(() => {
      outerRef.current?.remove()
    }, 500)
  }

  function handleTouchStart(e) {
    startXRef.current = e.touches[0].clientX
    currentDeltaRef.current = 0
    if (contentRef.current) contentRef.current.style.transition = 'none'
  }

  function handleTouchMove(e) {
    const dx = e.touches[0].clientX - startXRef.current
    if (dx > 0) return
    const clamped = Math.max(dx, -230)
    currentDeltaRef.current = clamped
    if (contentRef.current) contentRef.current.style.transform = `translateX(${clamped}px)`
  }

  function handleTouchEnd() {
    const delta = currentDeltaRef.current
    if (delta < -210) {
      doRemove()
    } else if (delta < -80) {
      isSnappedRef.current = true
      if (contentRef.current) {
        contentRef.current.style.transition = 'transform 0.2s ease'
        contentRef.current.style.transform = 'translateX(-80px)'
      }
    } else {
      if (isSnappedRef.current || Math.abs(delta) > 10) {
        suppressNextClickRef.current = true
      }
      snapBack()
    }
  }

  function handleContentClick() {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }
    if (isSnappedRef.current) {
      snapBack()
      return
    }
    onToggle()
  }

  return (
    <div ref={outerRef} className="saved-row-wrap">
      <div
        className="saved-delete-reveal"
        onClick={(e) => { e.stopPropagation(); doRemove() }}
      >
        Remove
      </div>
      <div
        ref={contentRef}
        className={`item-row${isSelected ? ' selected' : ''}`}
        style={{ position: 'relative', zIndex: 1, background: 'white', width: '100%', willChange: 'transform' }}
        onClick={handleContentClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="saved-item-thumb" />
        ) : (
          <div className="saved-item-thumb saved-item-thumb-placeholder">🛒</div>
        )}
        <div className="item-name">
          {item.name}
          {item.normalized_category && (
            <div className="saved-item-cat">{item.normalized_category}</div>
          )}
        </div>
        <div className="item-low">
          {pricesLoading
            ? '…'
            : minPrice != null
              ? `from $${minPrice.toFixed(2)}`
              : 'No prices yet — scan it! 📷'}
        </div>
        <div className="item-check">{isSelected ? '✓' : '+'}</div>
      </div>
    </div>
  )
}

export default function SavedItemsView({
  savedItems,
  savedUpcs,
  selectedSavedItems,
  setSelectedSavedItems,
  onOptimize,
  onBrowse,
  userId,
  onItemRemoved,
}) {
  const [bestPrices, setBestPrices] = useState({})
  const [pricesLoading, setPricesLoading] = useState(false)

  useEffect(() => {
    if (savedUpcs.size === 0) return
    setPricesLoading(true)
    supabase
      .from('observations')
      .select('barcode, price')
      .in('barcode', [...savedUpcs])
      .gt('price', 0)
      .lte('price', 500)
      .then(({ data: obs }) => {
        const mins = {}
        for (const o of obs || []) {
          if (!(o.barcode in mins) || o.price < mins[o.barcode]) {
            mins[o.barcode] = o.price
          }
        }
        setBestPrices(mins)
        setPricesLoading(false)
      })
  }, [])

  function toggleItem(upc) {
    setSelectedSavedItems(prev => {
      const next = new Set(prev)
      next.has(upc) ? next.delete(upc) : next.add(upc)
      return next
    })
  }

  async function handleRemove(item) {
    await removeSavedItem(userId, item.upc)
    onItemRemoved(String(item.upc))
  }

  if (savedItems.length === 0) {
    return (
      <div className="saved-items-view">
        <div className="recent-empty">
          <p className="recent-empty-emoji">🐿️</p>
          <p className="recent-empty-title">Nothing saved yet</p>
          <p className="recent-empty-sub">Browse Categories to add items</p>
          <button className="cta-btn" style={{ marginTop: 20 }} onClick={onBrowse}>
            Browse Categories →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="saved-items-view">
      <div className="section-hint">
        {selectedSavedItems.size > 0
          ? `${selectedSavedItems.size} item${selectedSavedItems.size !== 1 ? 's' : ''} on your list`
          : 'Tap items to build your list'}
      </div>

      {savedItems.map(item => {
        const upc = String(item.upc)
        return (
          <SwipableRow
            key={upc}
            item={item}
            isSelected={selectedSavedItems.has(upc)}
            minPrice={bestPrices[upc]}
            pricesLoading={pricesLoading}
            onToggle={() => toggleItem(upc)}
            onRemove={() => handleRemove(item)}
          />
        )
      })}

      <button
        className={`cta-floating${selectedSavedItems.size > 0 ? ' cta-floating-visible' : ''}`}
        onClick={onOptimize}
      >
        Find Best Prices →
      </button>
    </div>
  )
}
