export default function ProductFilters({ search, category, categories, min, max, onChange }) {
  return <div className="filters">
    <input aria-label="Search products" placeholder="Search products..." value={search} onChange={e => onChange('search', e.target.value)} />
    <select aria-label="Filter by category" value={category} onChange={e => onChange('category', e.target.value)}>
      <option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}
    </select>
    <input aria-label="Minimum price" type="number" min="0" placeholder="Min ₹" value={min} onChange={e => onChange('min', e.target.value)} />
    <input aria-label="Maximum price" type="number" min="0" placeholder="Max ₹" value={max} onChange={e => onChange('max', e.target.value)} />
  </div>;
}
