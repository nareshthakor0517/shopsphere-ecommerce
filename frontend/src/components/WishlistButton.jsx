export default function WishlistButton({ productName, active = false, onClick, className = '', text }) {
  const action = active ? 'Remove' : 'Add';
  return <button
    type="button"
    className={`outline wishlistButton ${active ? 'isWishlisted' : ''} ${className}`}
    aria-label={`${action} ${productName} ${active ? 'from' : 'to'} wishlist`}
    aria-pressed={active}
    title={`${action} ${productName} ${active ? 'from' : 'to'} wishlist`}
    onClick={onClick}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
    {text && <span>{text}</span>}
  </button>;
}
