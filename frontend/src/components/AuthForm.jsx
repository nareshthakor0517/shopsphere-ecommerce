import { useState } from 'react';

function suggestUsername(fullName) {
  return fullName.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, '.').replace(/^[._-]+|[._-]+$/g, '').slice(0, 150);
}

function PasswordInput({ name, label, value, onChange, visible, onToggle, autoComplete }) {
  return <label>{label}<span className="authPasswordControl">
    <input name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} minLength="8" maxLength="128" required value={value} onChange={onChange} />
    <button className="authPasswordToggle" type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} title={`${visible ? 'Hide' : 'Show'} password`} onClick={onToggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
        {!visible && <path d="m4 4 16 16" />}
      </svg>
    </button>
  </span></label>;
}

export default function AuthForm({ mode, values, onChange, onSubmit, onSwitch, busy, error, sellerSignup = false }) {
  const isLogin = mode === 'login';
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const update = (field, value) => {
    if (field === 'username') setUsernameEdited(true);
    if (field === 'full_name' && !usernameEdited) onChange('username', suggestUsername(value));
    onChange(field, value);
  };
  const submit = event => {
    if (!isLogin && values.password !== values.confirm_password) {
      event.preventDefault();
      const confirmField = event.currentTarget.elements.confirm_password;
      confirmField.setCustomValidity('Passwords do not match.');
      confirmField.reportValidity();
      confirmField.focus();
      confirmField.setCustomValidity('');
      return;
    }
    onSubmit(event);
  };

  return <section className={`auth ${sellerSignup ? 'sellerAuth' : ''}`}>
    <h2>{isLogin ? 'Welcome back' : sellerSignup ? 'Create your seller account' : 'Create your account'}</h2>
    <p>{isLogin ? 'Sign in to continue to ShopSphere.' : sellerSignup ? 'Set up your store and start selling on ShopSphere.' : 'Join ShopSphere to save products and place orders.'}</p>
    {error && <div className="authError" role="alert">{error}</div>}
    <form onSubmit={submit}>
      {isLogin ? <>
        <label>Username, email, mobile number or full name<input autoComplete="username" required value={values.login_identifier} onChange={e => update('login_identifier', e.target.value)} /></label>
        <label>Password<span className="authPasswordControl">
          <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={values.password} onChange={e => update('password', e.target.value)} />
          <button className="authPasswordToggle" type="button" aria-label={`${showPassword ? 'Hide' : 'Show'} password`} title={`${showPassword ? 'Hide' : 'Show'} password`} onClick={() => setShowPassword(!showPassword)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />{!showPassword && <path d="m4 4 16 16" />}</svg>
          </button>
        </span></label>
      </> : <>
        <label>Full name<input autoComplete="name" required maxLength="150" value={values.full_name} onChange={e => update('full_name', e.target.value)} /></label>
        <label>Username<input autoComplete="username" required maxLength="150" value={values.username} onChange={e => update('username', e.target.value)} /><small className="authFieldHint">Suggested from your name; it must be unique.</small></label>
        <label>Email<input type="email" autoComplete="email" pattern=".+@[Gg][Mm][Aa][Ii][Ll][.][Cc][Oo][Mm]" title="Use a Gmail address ending in @gmail.com." required value={values.email} onChange={e => update('email', e.target.value)} /></label>
        <label>Mobile number<input type="tel" autoComplete="tel-national" inputMode="numeric" pattern="[0-9]{10}" maxLength="10" placeholder="10-digit mobile number" title="Enter exactly 10 digits." required value={values.mobile_number} onChange={e => update('mobile_number', e.target.value)} /></label>
        <PasswordInput name="password" label="Password" autoComplete="new-password" value={values.password} onChange={e => update('password', e.target.value)} visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
        <PasswordInput name="confirm_password" label="Confirm password" autoComplete="new-password" value={values.confirm_password} onChange={e => update('confirm_password', e.target.value)} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
        <small className="passwordGuidance">Use at least 8 characters. Password and confirmation must match.</small>
        {sellerSignup && <div className="sellerSignupFields">
          <div className="sellerSignupIntro"><span>✦</span><div><b>Tell us about your store</b><small>These details help customers recognize your business.</small></div></div>
          <label>Store / business name<input required maxLength="120" autoComplete="organization" placeholder="e.g. Nova Tech Store" value={values.store_name || ''} onChange={e => update('store_name', e.target.value)} /></label>
          <label>Business type<select value={values.business_type || 'individual'} onChange={e => update('business_type', e.target.value)}><option value="individual">Individual seller</option><option value="registered">Registered business</option></select></label>
          <label>Pickup / business address<textarea required rows="3" autoComplete="street-address" placeholder="Building, street, city, state and PIN code" value={values.business_address || ''} onChange={e => update('business_address', e.target.value)} /></label>
          <label>GSTIN / tax ID <span className="optionalLabel">Optional</span><input maxLength="32" autoComplete="off" placeholder="Add it if you have one" value={values.tax_identifier || ''} onChange={e => update('tax_identifier', e.target.value)} /></label>
        </div>}
      </>}
      <button className="primary" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Login' : 'Register'}</button>
    </form>
    <div className="authLinks">
      <button className="link" onClick={onSwitch}>{isLogin ? 'Create an account' : 'Already have an account? Login'}</button>
    </div>
  </section>;
}
