const dateLabel = value => value
  ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  : '—';

export default function ProfilePage({ user, onNavigate }) {
  const details = [
    ['Full name', user.full_name],
    ['Username', user.username],
    ['Email address', user.email],
    ['Mobile number', user.mobile_number],
    ['Account type', user.role === 'user' ? 'Customer' : user.role === 'sales' ? 'Seller' : user.role],
    ['Member since', dateLabel(user.date_joined)],
    ...(user.role === 'sales' && user.seller_profile ? [
      ['Store name', user.seller_profile.store_name],
      ['Business type', user.seller_profile.business_type === 'registered' ? 'Registered business' : 'Individual seller'],
      ['Business address', user.seller_profile.business_address],
      ...(user.seller_profile.tax_identifier ? [['GSTIN / tax ID', user.seller_profile.tax_identifier]] : []),
    ] : []),
  ];
  const initials = (user.full_name || user.username || 'S').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  return <section className="profilePage" aria-labelledby="profile-title">
    <header className="profileHero">
      <div className="profileAvatar" aria-hidden="true">{initials}</div>
      <div><small>YOUR SHOPSPHERE ACCOUNT</small><h1 id="profile-title">Your profile</h1>
        <p>Account details and contact information.</p></div>
      <button className="profileActivityLink" onClick={() => onNavigate('dashboard')}>Your activity <span>→</span></button>
    </header>

    <section className="profileDetails" aria-labelledby="profile-details-title">
      <div className="profileDetailsHeading"><div><small>PERSONAL INFORMATION</small><h2 id="profile-details-title">Profile details</h2></div>
        <span className="profileStatus"><i /> Active account</span></div>
      <dl>{details.map(([label, value]) => <div className="profileDetail" key={label}>
        <dt>{label}</dt><dd>{value || 'Not provided'}</dd>
      </div>)}</dl>
    </section>
  </section>;
}
