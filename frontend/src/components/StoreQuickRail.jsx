export default function StoreQuickRail({ onNavigate }) {
  return <aside className="storeQuickRail" aria-label="Quick links">
    <button onClick={() => onNavigate('support')} aria-label="Open support" title="Support"><svg viewBox="0 0 24 24"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/><path d="M19 19c0 2-2 3-5 3"/></svg></button>
    <button onClick={() => onNavigate('categories')} aria-label="Browse categories" title="Categories"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg></button>
  </aside>;
}
