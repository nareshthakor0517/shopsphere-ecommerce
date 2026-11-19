import CategoryArtwork from './CategoryArtwork';

export default function StoreSidebar({ type, categories, brands = [], activeCategory, onCategory, activeBrand, onBrand }) {
  return <aside className="storeSidebar" aria-label="Collection filters">
    <div className="sidebarHeading"><span>REFINE YOUR VIEW</span><b>Browse</b></div>
    {type === 'brands' ? <div className="sidebarGroup">
      <span className="sidebarLabel">Featured brands</span>
      <button className={!activeBrand ? 'sidebarOption selected' : 'sidebarOption'} onClick={() => onBrand('')}>All brands</button>
      {brands.map(brand => <button key={brand} className={activeBrand === brand ? 'sidebarOption selected' : 'sidebarOption'} onClick={() => onBrand(brand)}>{brand}<span>→</span></button>)}
    </div> : <div className="sidebarGroup">
      <span className="sidebarLabel">Shop by category</span>
      <button className={!activeCategory ? 'sidebarOption selected' : 'sidebarOption'} onClick={() => onCategory('')}>All products<span>→</span></button>
      {categories.map(item => <button key={item.name} className={activeCategory === item.value ? 'sidebarCategory selected' : 'sidebarCategory'} onClick={() => onCategory(item.value)}>
        <CategoryArtwork kind={item.kind} /><span>{item.name}</span><small>→</small>
      </button>)}
    </div>}
    <div className="sidebarPromise"><span>✓</span><div><b>Shop with confidence</b><small>Secure checkout on every order</small></div></div>
  </aside>;
}
