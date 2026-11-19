import { useRef, useState } from 'react';

const steps = [
  ['Personal information', 'Your contact and account details'],
  ['Business information', 'Tell us about the store you are setting up'],
  ['Bank details', 'Where should your seller payouts go?'],
  ['Verification', 'Upload proof and review your consent'],
];

function suggestUsername(fullName) {
  return fullName.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, '.').replace(/^[._-]+|[._-]+$/g, '').slice(0, 150);
}

function Field({ label, name, children, required = false, hint }) {
  return <label className="sellerField" htmlFor={name}>
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>;
}

export default function SellerRegistration({ onSubmit, busy, error }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ business_type: 'individual', country: 'India' });
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const formRef = useRef(null);
  const update = event => {
    const { name, value, files, type, checked } = event.target;
    if (name === 'username') setUsernameEdited(true);
    if (name === 'full_name' && !usernameEdited) {
      setValues(current => ({ ...current, full_name: value, username: suggestUsername(value) }));
      return;
    }
    setValues(current => ({ ...current, [name]: type === 'file' ? files?.[0] : type === 'checkbox' ? checked : value }));
  };
  const validateStep = () => {
    const current = formRef.current?.querySelector(`[data-step="${step}"]`);
    if (!current) return true;
    const fields = [...current.querySelectorAll('input, select, textarea')].filter(field => field.required || field.type === 'email' || field.type === 'tel');
    for (const field of fields) {
      if (!field.checkValidity()) { field.reportValidity(); field.focus(); return false; }
    }
    if (step === 0 && values.password !== values.confirm_password) {
      formRef.current.elements.confirm_password.setCustomValidity('Passwords do not match.');
      formRef.current.elements.confirm_password.reportValidity();
      formRef.current.elements.confirm_password.focus();
      formRef.current.elements.confirm_password.setCustomValidity('');
      return false;
    }
    if (step === 2 && values.account_number !== values.confirm_account_number) {
      formRef.current.elements.confirm_account_number.setCustomValidity('Account numbers do not match.');
      formRef.current.elements.confirm_account_number.reportValidity();
      formRef.current.elements.confirm_account_number.focus();
      formRef.current.elements.confirm_account_number.setCustomValidity('');
      return false;
    }
    return true;
  };
  const submit = event => {
    event.preventDefault();
    if (!validateStep()) return;
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value instanceof File) data.append(key, value, `${key}__${value.name}`);
      else if (value !== undefined && value !== null) data.append(key, String(value));
    });
    onSubmit(data);
  };
  const fileInput = (name, label, required, hint) => <Field label={label} name={name} required={required} hint={hint}>
    <input id={name} name={name} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required={required} onChange={update} />
    {values[name] && <small className="sellerSelectedFile">Selected: {values[name].name}</small>}
  </Field>;

  return <div className="sellerOnboarding">
    <header className="sellerOnboardingHeader"><a className="sellerBrand" href="/" aria-label="ShopSphere home"><span>S</span> ShopSphere</a><span>Seller onboarding</span></header>
    <main className="sellerRegistrationMain">
      <section className="sellerRegistrationCard" aria-labelledby="seller-registration-title">
        <div className="sellerRegistrationHeading"><div className="sellerEyebrow">SHOPSPHERE PARTNER PROGRAM</div><h1 id="seller-registration-title">Seller Registration</h1><p>Complete these four steps to submit your seller application.</p></div>
        <ol className="sellerStepper" aria-label="Registration progress">
          {steps.map(([title], index) => <li key={title} className={`${index === step ? 'current' : ''} ${index < step ? 'complete' : ''}`} aria-current={index === step ? 'step' : undefined}>
            <span className="sellerStepNumber">{index < step ? '✓' : index + 1}</span><span className="sellerStepTitle">{title}</span>
          </li>)}
        </ol>
        <form ref={formRef} onChange={update} onSubmit={submit} encType="multipart/form-data" noValidate>
          <section className="sellerStepPanel" data-step="0" hidden={step !== 0}>
            <div className="sellerPanelHeading"><div><h2>Personal Information</h2><p>Seller ki basic details</p></div><span>STEP 01 / 04</span></div>
            <div className="sellerFieldsGrid">
              <Field label="Full Name" name="full_name" required><input id="full_name" name="full_name" autoComplete="name" maxLength="150" required value={values.full_name || ''} /></Field>
              <Field label="Username" name="username" required hint="Suggested from your name; it must be unique."><input id="username" name="username" autoComplete="username" maxLength="150" required value={values.username || ''} /></Field>
              <Field label="Email Address" name="email" required hint="Use a Gmail address ending in @gmail.com."><input id="email" name="email" type="email" autoComplete="email" pattern=".+@[Gg][Mm][Aa][Ii][Ll][.][Cc][Oo][Mm]" required value={values.email || ''} /></Field>
              <Field label="Mobile Number" name="mobile_number" required hint="Enter exactly 10 digits."><input id="mobile_number" name="mobile_number" type="tel" autoComplete="tel-national" inputMode="numeric" pattern="[0-9]{10}" placeholder="10-digit mobile number" maxLength="10" required value={values.mobile_number || ''} /></Field>
              <Field label="Password" name="password" required hint="Use at least 8 characters.">
                <span className="authPasswordControl sellerPasswordControl"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="8" maxLength="128" required value={values.password || ''} /><button className="authPasswordToggle" type="button" aria-label={`${showPassword ? 'Hide' : 'Show'} password`} onClick={() => setShowPassword(!showPassword)}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />{!showPassword && <path d="m4 4 16 16" />}</svg></button></span>
              </Field>
              <Field label="Confirm Password" name="confirm_password" required hint="Must match your password.">
                <span className="authPasswordControl sellerPasswordControl"><input id="confirm_password" name="confirm_password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" minLength="8" maxLength="128" required value={values.confirm_password || ''} /><button className="authPasswordToggle" type="button" aria-label={`${showConfirmPassword ? 'Hide' : 'Show'} confirm password`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />{!showConfirmPassword && <path d="m4 4 16 16" />}</svg></button></span>
              </Field>
              <Field label="Profile Photo" name="profile_photo" hint="Optional · JPG, PNG or WebP · up to 10 MB"><input id="profile_photo" name="profile_photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" /></Field>
            </div>
          </section>
          <section className="sellerStepPanel" data-step="1" hidden={step !== 1}>
            <div className="sellerPanelHeading"><div><h2>Business Information</h2><p>Seller ke business ki details</p></div><span>STEP 02 / 04</span></div>
            <div className="sellerFieldsGrid">
              <Field label="Store Name" name="store_name" required><input id="store_name" name="store_name" autoComplete="organization" maxLength="120" required value={values.store_name || ''} /></Field>
              <Field label="Business Type" name="business_type" required><select id="business_type" name="business_type" required value={values.business_type}><option value="individual">Individual seller</option><option value="registered">Registered business</option></select></Field>
              <Field label="Business Address" name="business_address" required><textarea id="business_address" name="business_address" autoComplete="street-address" rows="3" required value={values.business_address || ''} /></Field>
              <Field label="Business Description" name="business_description" hint="Optional"><textarea id="business_description" name="business_description" rows="3" maxLength="1500" value={values.business_description || ''} /></Field>
              <Field label="City" name="city" required><input id="city" name="city" autoComplete="address-level2" required value={values.city || ''} /></Field>
              <Field label="State" name="state" required><input id="state" name="state" autoComplete="address-level1" required value={values.state || ''} /></Field>
              <Field label="PIN Code" name="pin_code" required><input id="pin_code" name="pin_code" autoComplete="postal-code" inputMode="numeric" maxLength="12" required value={values.pin_code || ''} /></Field>
              <Field label="Country" name="country"><input id="country" name="country" autoComplete="country-name" value={values.country} /></Field>
              <Field label="GST Number" name="tax_identifier" hint="Optional · GST certificate is required when you add a GST number"><input id="tax_identifier" name="tax_identifier" maxLength="32" value={values.tax_identifier || ''} /></Field>
              <Field label="PAN Number" name="pan_number" hint="Optional · PAN document is required when you add a PAN number"><input id="pan_number" name="pan_number" maxLength="10" autoCapitalize="characters" value={values.pan_number || ''} /></Field>
            </div>
          </section>
          <section className="sellerStepPanel" data-step="2" hidden={step !== 2}>
            <div className="sellerPanelHeading"><div><h2>Bank Details</h2><p>Seller ko payment transfer karne ke liye</p></div><span>STEP 03 / 04</span></div>
            <div className="sellerSecurityNote"><span>▣</span><p>Bank information is used only to set up seller payouts. Account number is never shown on your public store.</p></div>
            <div className="sellerFieldsGrid">
              <Field label="Account Holder Name" name="account_holder_name" required><input id="account_holder_name" name="account_holder_name" autoComplete="name" required value={values.account_holder_name || ''} /></Field>
              <Field label="Bank Name" name="bank_name" required><input id="bank_name" name="bank_name" autoComplete="off" required value={values.bank_name || ''} /></Field>
              <Field label="Account Number" name="account_number" required><input id="account_number" name="account_number" inputMode="numeric" autoComplete="off" required value={values.account_number || ''} /></Field>
              <Field label="Confirm Account Number" name="confirm_account_number" required><input id="confirm_account_number" name="confirm_account_number" inputMode="numeric" autoComplete="off" required value={values.confirm_account_number || ''} /></Field>
              <Field label="IFSC Code" name="ifsc_code" required><input id="ifsc_code" name="ifsc_code" maxLength="11" autoCapitalize="characters" autoComplete="off" required value={values.ifsc_code || ''} /></Field>
              <Field label="UPI ID" name="upi_id" hint="Optional"><input id="upi_id" name="upi_id" autoComplete="off" value={values.upi_id || ''} /></Field>
            </div>
          </section>
          <section className="sellerStepPanel" data-step="3" hidden={step !== 3}>
            <div className="sellerPanelHeading"><div><h2>Verification</h2><p>Seller identity aur business verification</p></div><span>STEP 04 / 04</span></div>
            <p className="sellerUploadHint">Upload clear scans or photos. PDF, JPG, PNG and WebP files up to 10 MB each.</p>
            <div className="sellerFieldsGrid sellerDocumentGrid">
              {fileInput('pan_document', 'PAN Document', false, 'Optional · Required when a PAN number is provided')}
              {fileInput('gst_certificate', 'GST Certificate', false, 'Optional · Required when a GST number is provided')}
              {fileInput('address_proof', 'Business Address Proof', true)}
              {fileInput('bank_proof', 'Bank Proof / Cancelled Cheque', true)}
            </div>
            <div className="sellerConsentBlock">
              <label><input type="checkbox" name="terms_accepted" required checked={Boolean(values.terms_accepted)} /><span>I accept the <b>Terms &amp; Conditions</b> <i>*</i></span></label>
              <label><input type="checkbox" name="privacy_accepted" required checked={Boolean(values.privacy_accepted)} /><span>I accept the <b>Privacy Policy</b> <i>*</i></span></label>
            </div>
          </section>
          {error && <div className="sellerFormError" role="alert">{error}</div>}
          <div className="sellerFormActions">
            {step > 0 ? <button className="sellerBackButton" type="button" onClick={() => setStep(value => value - 1)}>← Back</button> : <a className="sellerBackButton" href="/">← Back to ShopSphere</a>}
            {step < steps.length - 1
              ? <button className="sellerContinueButton" type="button" onClick={() => { if (validateStep()) setStep(value => value + 1); }}>Continue <span>→</span></button>
              : <button className="sellerContinueButton" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit seller application'} <span>→</span></button>}
          </div>
          <p className="sellerFormFootnote">Your information and documents are stored securely for seller verification.<br /><a href="/seller/login">Already registered? Sign in to your seller account</a></p>
        </form>
      </section>
    </main>
    <footer className="sellerOnboardingFooter">© {new Date().getFullYear()} ShopSphere · Seller onboarding</footer>
  </div>;
}
