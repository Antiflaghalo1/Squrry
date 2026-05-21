export default function SavedView({ onBudget, onLegal, onSignOut }) {
  return (
    <div className="saved-view">
      <div className="saved-header">
        <div className="saved-title">💰 Your Money Hub</div>
        <div className="saved-subtitle">Track your budget &amp; stay in control 🛒</div>
      </div>

      <div className="saved-menu-section">
        <button className="saved-menu-row" onClick={onBudget}>
          <span className="saved-menu-label">My Budget 💵</span>
          <span className="saved-menu-chevron">→</span>
        </button>
      </div>

      <div className="saved-divider" />

      <div className="saved-menu-section">
        <button className="saved-menu-row" onClick={() => onLegal('tos')}>
          <span className="saved-menu-label">📋 Terms of Service</span>
          <span className="saved-menu-chevron">→</span>
        </button>
        <button className="saved-menu-row" onClick={() => onLegal('privacy')}>
          <span className="saved-menu-label">🔒 Privacy Policy</span>
          <span className="saved-menu-chevron">→</span>
        </button>
      </div>

      <div className="saved-divider" />

      <div className="saved-signout-section">
        <button className="saved-signout-btn" onClick={onSignOut}>
          👋 See ya later!
        </button>
      </div>
    </div>
  )
}
