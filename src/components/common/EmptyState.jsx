export default function EmptyState({ icon: Icon, emoji, title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      {emoji ? (
        <div className="empty-icon">{emoji}</div>
      ) : Icon ? (
        <div className="empty-icon" style={{ fontSize: 'initial' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--ink-3)' }}>
            <Icon size={24}/>
          </div>
        </div>
      ) : null}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionLabel && onAction && (
        <button className="btn primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
