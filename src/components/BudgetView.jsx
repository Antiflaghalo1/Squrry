import { useState } from 'react'

export default function BudgetView({ onBack, user, budget, onBudgetSave }) {
  const [value, setValue] = useState(budget ?? 0)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    await onBudgetSave(value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="budget-view">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <h2 className="budget-view-title">💰 My Budget</h2>
      <p className="budget-view-sub">
        Set your weekly grocery budget and we'll track how close you are.
      </p>

      <div className="budget-view-amount">${value}</div>

      <input
        className="budget-slider"
        type="range"
        min={0}
        max={1000}
        step={10}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
      />

      <div className="budget-view-range-labels">
        <span>$0</span>
        <span>$1000</span>
      </div>

      <button className="cta-btn budget-view-cta" onClick={handleSave}>
        Save Budget →
      </button>

      {saved && <p className="budget-view-saved">Saved! ✓</p>}
    </div>
  )
}
