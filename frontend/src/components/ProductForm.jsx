import { resolveImageUrl } from '../imageUrl';

export default function ProductForm({ values, editing, uploading, onChange, onUpload, onSubmit, onCancel }) {
  return <section className="auth wide"><div className="formHeading"><div><small>SELLER WORKSPACE</small><h2>{editing ? 'Edit product' : 'Add a product'}</h2></div>
    {editing && <button className="outline" type="button" onClick={onCancel}>Cancel</button>}</div>
    <form onSubmit={onSubmit}>
      <label>Product name<input required maxLength="180" placeholder="e.g. Wireless noise-cancelling headphones" value={values.name} onChange={e => onChange('name', e.target.value)} /></label>
      <label>Brand<input required={!editing} maxLength="100" placeholder="e.g. Sony" value={values.brand || ''} onChange={e => onChange('brand', e.target.value)} /></label>
      <label>Category<select required value={values.category} onChange={e => onChange('category', e.target.value)}>
        {!['Mobiles', 'Laptops', 'Audio', 'Accessories', 'Smart watches', 'TV & more'].includes(values.category) && <option>{values.category}</option>}
        {['Mobiles', 'Laptops', 'Audio', 'Accessories', 'Smart watches', 'TV & more'].map(category => <option key={category}>{category}</option>)}
      </select></label>
      <label>Description<textarea required maxLength="3000" placeholder="Describe the features, condition and what is included." value={values.description} onChange={e => onChange('description', e.target.value)} /></label>
      <label>Price (INR)<input type="number" min="0.01" step="0.01" required placeholder="0.00" value={values.price} onChange={e => onChange('price', e.target.value)} /></label>
      <label>Available quantity<input type="number" min="0" step="1" required value={values.stock} onChange={e => onChange('stock', e.target.value)} /></label>
      <label>Product image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={onUpload} />
        <small>{uploading ? 'Uploading image…' : 'Upload a JPG, PNG or WebP image.'}</small></label>
      {values.image_url && <img className="preview" src={resolveImageUrl(values.image_url)} alt="Product preview" />}
      <button className="primary" disabled={uploading}>{editing ? 'Save changes' : 'Publish product'}</button>
    </form>
  </section>;
}
