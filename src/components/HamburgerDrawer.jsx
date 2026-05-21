export default function HamburgerDrawer({ isOpen, onClose, budget, onBudgetChange, onLegal, onSignOut }) {
  return (
    <div className={`drawer-backdrop${isOpen ? ' drawer-backdrop--open' : ''}`} onClick={onClose}>
      <div
        className={`drawer${isOpen ? ' drawer--open' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <button className="drawer-close-btn" onClick={onClose}>✕</button>

        <div className="drawer-header">BasketSplit 🛒</div>

        <div className="drawer-divider" />

        <div className="drawer-section">
          <span className="drawer-section-label">💰 My Budget</span>
          <div className="budget-wrap">
            <span>$</span>
            <input
              type="number"
              placeholder="0.00"
              value={budget}
              onChange={e => onBudgetChange(e.target.value)}
            />
          </div>
        </div>

        <div className="drawer-divider" />

        <button className="drawer-menu-row" onClick={() => onLegal('tos')}>📋 Terms of Service</button>
        <button className="drawer-menu-row" onClick={() => onLegal('privacy')}>🔒 Privacy Policy</button>

        <div className="drawer-divider" />

        <button className="drawer-menu-row drawer-signout-row" onClick={onSignOut}>👋 Sign Out</button>
      </div>
    </div>
  )
}
