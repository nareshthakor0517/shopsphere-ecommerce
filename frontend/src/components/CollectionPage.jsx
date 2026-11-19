import { useMemo, useState } from 'react';
import ProductGrid from './ProductGrid';
import StoreSidebar from './StoreSidebar';

const PAGE_COPY = {
  shop: { eyebrow: 'THE SHOPSPHERE COLLECTION', title: 'Find your next favorite.', description: 'Explore thoughtful tech for work, home and everything in between.' },
  categories: { eyebrow: 'FIND YOUR CATEGORY', title: 'The right tech, made easy.', description: 'Browse by the way you live, work and unwind.' },
  brands: { eyebrow: 'BRANDS WE LOVE', title: 'Good tech has a name.', description: 'Explore products from the names customers know and trust.' },
};

const featuredBrands = ['Apple', 'Samsung', 'Sony', 'Lenovo', 'Logitech', 'JBL'];
const brandTerms = {
  Apple: ['apple', 'iphone', 'ipad', 'macbook', 'airpods'], Samsung: ['samsung', 'galaxy'],
  Sony: ['sony', 'playstation', 'wh-1000'], Lenovo: ['lenovo', 'thinkpad', 'ideapad'],
  Logitech: ['logitech', 'mx master', 'g pro'], JBL: ['jbl'],
};
const productMatchesBrand = (product, brand) => product.brand
  ? product.brand.toLowerCase() === brand.toLowerCase()
  : (brandTerms[brand] || [brand.toLowerCase()]).some(term => product.name?.toLowerCase().includes(term));

export default function CollectionPage({ type, products, categories, user, activeCategory, onCategory, activeBrand = '', onBrand = () => {}, minPrice = '', maxPrice = '', onPriceChange = () => {},
  onAddToCart, onWishlist, wishlist, onEdit, onDelete, onOpenProduct, loading }) {
  const [sortBy, setSortBy] = useState('featured');
  const copy = PAGE_COPY[type] || PAGE_COPY.shop;
  const brandOptions = useMemo(() => [...new Set([...featuredBrands, ...products.map(product => product.brand).filter(Boolean)])].sort(), [products]);

  const visibleProducts = useMemo(() => {
    let result = [...products];
    if (type === 'brands' && activeBrand) result = result.filter(product => productMatchesBrand(product, activeBrand));
    if (activeCategory && type !== 'brands') result = result.filter(product => product.category?.toLowerCase() === activeCategory.toLowerCase());
    if (type === 'shop') {
      if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      if (sortBy === 'price-low') result.sort((a, b) => Number(a.price) - Number(b.price));
      if (sortBy === 'price-high') result.sort((a, b) => Number(b.price) - Number(a.price));
      if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [products, type, activeBrand, activeCategory, sortBy]);

  const title = type === 'brands' && activeBrand ? `${activeBrand} collection` : activeCategory || copy.title;

  return <section className={`collectionPage collection-${type}`}>
    <div className="collectionHero">
      <div><small>{copy.eyebrow}</small><h1>{title}</h1><p>{copy.description}</p></div>
      <div className="collectionHeroArt" aria-hidden="true"><i /><span>✦</span><b>{type === 'brands' ? 'BRANDS' : type === 'categories' ? 'EXPLORE' : 'SHOP'}</b></div>
    </div>

    {type === 'brands' && <div className="brandDirectory" aria-label="Featured brands">
      {brandOptions.map((brand, index) => <button key={brand} className={`brandTile brandTile-${index} ${activeBrand === brand ? 'selected' : ''}`} onClick={() => onBrand(activeBrand === brand ? '' : brand)}>
        <span>{brand.slice(0, 1)}</span><b>{brand}</b><small>{products.filter(product => productMatchesBrand(product, brand)).length} products</small>
      </button>)}
    </div>}

    <div className={`collectionLayout ${type === 'shop' ? 'collectionCatalogLayout' : ''}`}>
      {type !== 'shop' && <StoreSidebar type={type} categories={categories} brands={brandOptions} activeCategory={activeCategory}
        onCategory={onCategory} activeBrand={activeBrand} onBrand={onBrand} />}
      <div className="collectionResults">
        <div className="collectionResultsHeading"><div><small>{type === 'brands' ? 'AVAILABLE IN THE CATALOG' : type === 'shop' ? 'THE COMPLETE CATALOG' : 'BROWSE BY CATEGORY'}</small>
          <h2>{type === 'shop' ? 'All products' : type === 'brands' ? (activeBrand || 'Featured brands') : 'Explore products'}</h2></div>
          <span>{visibleProducts.length} {visibleProducts.length === 1 ? 'product' : 'products'}</span>
        </div>
        {type === 'shop' && <div className="shopCatalogTools">
          <div className="shopCatalogIntro"><b>Browse the complete catalog</b><small>Every available product, across all categories and brands.</small></div>
          <div className="shopCatalogControls">
            <label>Min price<input aria-label="Minimum price" type="number" min="0" step="1" placeholder="₹ Min" value={minPrice} onChange={event => onPriceChange('min', event.target.value)} /></label>
            <label>Max price<input aria-label="Maximum price" type="number" min={minPrice || '0'} step="1" placeholder="₹ Max" value={maxPrice} onChange={event => onPriceChange('max', event.target.value)} /></label>
            {(minPrice || maxPrice) && <button className="shopClearFilters" onClick={() => { onPriceChange('min', ''); onPriceChange('max', ''); }}>Clear price</button>}
            <label>Sort by<select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label>
          </div>
        </div>}
        {loading ? <p className="collectionEmpty" role="status">Loading products…</p> : <ProductGrid products={visibleProducts}
          user={user} wishlist={wishlist} onAddToCart={onAddToCart} onWishlist={onWishlist} onEdit={onEdit} onDelete={onDelete} onOpenProduct={onOpenProduct}
          emptyMessage={type === 'brands' && activeBrand ? `No ${activeBrand} products are in the catalog yet.` : activeCategory ? `No products found in ${activeCategory} yet.` : 'Products will appear here as they are added to the catalog.'} />}
      </div>
    </div>
  </section>;
}
