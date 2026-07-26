import React, { useState } from 'react';
import { getCodeList } from 'country-list';
import { Building2, User, Globe, Mail, CheckCircle2, ChevronRight, AlertCircle, CreditCard, Sparkles, Code2, ShieldCheck, MapPin, FileText } from 'lucide-react';
import api from '../api';
import { useAuth } from '../App';
import './DeveloperOnboardingModal.css';

interface DeveloperOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeveloperOnboardingModal: React.FC<DeveloperOnboardingModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, login } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [entityType, setEntityType] = useState<'individual' | 'organization'>('individual');
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [legalName, setLegalName] = useState('');
  const [publishingIntent, setPublishingIntent] = useState('');
  
  // Legal / Address
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [vatId, setVatId] = useState('');
  const [country, setCountry] = useState(user?.country || '');

  // Contact / Social
  const [supportEmail, setSupportEmail] = useState(user?.email || '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCompleteOnboarding = async (connectStripe: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/user/developer/onboard', {
        entityType,
        displayName,
        legalName: legalName || null,
        streetAddress: streetAddress || null,
        city: city || null,
        postalCode: postalCode || null,
        vatId: vatId || null,
        publishingIntent: publishingIntent || null,
        supportEmail: supportEmail || null,
        websiteUrl: websiteUrl || null,
        githubUrl: githubUrl || null,
        country: country || null,
      });

      if (res.data.token) {
        login(res.data.token);
      }

      if (connectStripe) {
        const stripeRes = await api.post('/stripe/onboard');
        if (stripeRes.data.url) {
          window.location.href = stripeRes.data.url;
          return;
        }
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete developer onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dev-modal-overlay">
      <div className="dev-modal-container">
        <button className="dev-modal-close" onClick={onClose}>✕</button>

        <div className="dev-modal-header">
          <div className="dev-modal-badge">
            <Sparkles size={14} /> Developer Portal
          </div>
          <h2>Become a Verified Developer</h2>
          <p>Set up your creator profile and legal seller identity to publish plugins on PumpkinMarket.</p>
        </div>

        {/* Step Indicator */}
        <div className="dev-steps-nav">
          <div className={`dev-step-pill ${step >= 1 ? 'active' : ''}`}>1. Entity</div>
          <div className="dev-step-line" />
          <div className={`dev-step-pill ${step >= 2 ? 'active' : ''}`}>2. Legal</div>
          <div className="dev-step-line" />
          <div className={`dev-step-pill ${step >= 3 ? 'active' : ''}`}>3. Support</div>
          <div className="dev-step-line" />
          <div className={`dev-step-pill ${step >= 4 ? 'active' : ''}`}>4. Finish</div>
        </div>

        {error && (
          <div className="dev-modal-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Entity Type & Public Name */}
        {step === 1 && (
          <div className="dev-step-content">
            <label className="dev-field-label">How will you be publishing plugins?</label>
            <div className="dev-entity-grid">
              <button
                type="button"
                className={`dev-entity-card ${entityType === 'individual' ? 'selected' : ''}`}
                onClick={() => setEntityType('individual')}
              >
                <div className="dev-entity-icon"><User size={24} /></div>
                <div>
                  <h4>Individual / Solo Developer</h4>
                  <p>Publishing as an independent creator or hobbyist.</p>
                </div>
              </button>

              <button
                type="button"
                className={`dev-entity-card ${entityType === 'organization' ? 'selected' : ''}`}
                onClick={() => setEntityType('organization')}
              >
                <div className="dev-entity-icon"><Building2 size={24} /></div>
                <div>
                  <h4>Organization / Studio</h4>
                  <p>Publishing on behalf of a company, team, or studio.</p>
                </div>
              </button>
            </div>

            <div className="dev-form-group" style={{ marginTop: '1.25rem' }}>
              <label className="dev-field-label">
                {entityType === 'individual' ? 'Public Creator Name' : 'Studio / Organization Name'} *
              </label>
              <input
                type="text"
                className="dev-input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={entityType === 'individual' ? 'e.g. John Doe or AlexDev' : 'e.g. Acme Studio'}
                required
              />
              <span className="dev-hint">This name will be publicly shown on all your plugin pages.</span>
            </div>

            <div className="dev-form-group">
              <label className="dev-field-label"><FileText size={14} /> What type of plugins do you plan to publish?</label>
              <input
                type="text"
                className="dev-input"
                value={publishingIntent}
                onChange={e => setPublishingIntent(e.target.value)}
                placeholder="e.g. Economy utilities, Chat moderation tools, Mini-games"
              />
            </div>

            <button
              className="dev-btn dev-btn-primary"
              style={{ marginTop: '1.25rem' }}
              disabled={!displayName.trim()}
              onClick={() => setStep(2)}
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: Legal Identity & Physical Address */}
        {step === 2 && (
          <div className="dev-step-content">
            <div className="dev-form-group">
              <label className="dev-field-label">
                <ShieldCheck size={14} /> {entityType === 'individual' ? 'Full Legal Name' : 'Registered Business Name'} *
              </label>
              <input
                type="text"
                className="dev-input"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder={entityType === 'individual' ? 'First and Last Name' : 'Legal Company Name Inc.'}
                required
              />
              <span className="dev-hint">Used for verification, legal compliance, and tax records.</span>
            </div>

            <div className="dev-form-group">
              <label className="dev-field-label"><MapPin size={14} /> Street Address *</label>
              <input
                type="text"
                className="dev-input"
                value={streetAddress}
                onChange={e => setStreetAddress(e.target.value)}
                placeholder="123 Main St, Suite 400"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="dev-form-group">
                <label className="dev-field-label">City *</label>
                <input
                  type="text"
                  className="dev-input"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="City"
                  required
                />
              </div>
              <div className="dev-form-group">
                <label className="dev-field-label">Postal / ZIP Code *</label>
                <input
                  type="text"
                  className="dev-input"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                  placeholder="10001"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="dev-form-group">
                <label className="dev-field-label"><Globe size={14} /> Country / Region *</label>
                <select
                  className="dev-input dev-select"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  required
                >
                  <option value="">Select country...</option>
                  {Object.entries(getCodeList()).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="dev-form-group">
                <label className="dev-field-label">VAT / Tax ID <span className="dev-hint">(optional)</span></label>
                <input
                  type="text"
                  className="dev-input"
                  value={vatId}
                  onChange={e => setVatId(e.target.value)}
                  placeholder="EU123456789 or Tax ID"
                />
              </div>
            </div>

            <div className="dev-btn-row" style={{ marginTop: '1.25rem' }}>
              <button className="dev-btn dev-btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button
                className="dev-btn dev-btn-primary"
                disabled={!legalName.trim() || !streetAddress.trim() || !city.trim() || !postalCode.trim() || !country}
                onClick={() => setStep(3)}
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Support Contact & Portfolio Links */}
        {step === 3 && (
          <div className="dev-step-content">
            <div className="dev-form-group">
              <label className="dev-field-label"><Mail size={14} /> Support / Public Contact Email *</label>
              <input
                type="email"
                className="dev-input"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                placeholder="support@yourdomain.com"
                required
              />
              <span className="dev-hint">Where users can reach you for plugin help and questions.</span>
            </div>

            <div className="dev-form-group">
              <label className="dev-field-label"><Globe size={14} /> Website / Portfolio URL</label>
              <input
                type="url"
                className="dev-input"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="dev-form-group">
              <label className="dev-field-label"><Code2 size={14} /> GitHub Profile / Organization</label>
              <input
                type="text"
                className="dev-input"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/yourname"
              />
            </div>

            <div className="dev-btn-row" style={{ marginTop: '1.5rem' }}>
              <button className="dev-btn dev-btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button
                className="dev-btn dev-btn-primary"
                disabled={!supportEmail.trim()}
                onClick={() => setStep(4)}
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Monetization & Confirmation */}
        {step === 4 && (
          <div className="dev-step-content">
            <div className="dev-monetization-box">
              <div className="dev-monetization-header">
                <CreditCard size={20} />
                <div>
                  <h4>Publishing & Payouts</h4>
                  <p>You can publish <strong>Free plugins immediately</strong> without linking a bank account.</p>
                </div>
              </div>
              <ul className="dev-check-list">
                <li><CheckCircle2 size={16} /> Publish unlimited free plugins ($0 upload fee)</li>
                <li><CheckCircle2 size={16} /> Option to sell paid plugins via Stripe Connect</li>
                <li><CheckCircle2 size={16} /> Access full analytics and reviews dashboard</li>
              </ul>
            </div>

            <div className="dev-btn-row-stacked" style={{ marginTop: '1.5rem' }}>
              <button
                className="dev-btn dev-btn-primary"
                disabled={loading}
                onClick={() => handleCompleteOnboarding(false)}
              >
                {loading ? 'Completing setup...' : 'Complete Registration & Start Free Uploads'}
              </button>
              <button
                className="dev-btn dev-btn-stripe"
                disabled={loading}
                onClick={() => handleCompleteOnboarding(true)}
              >
                <CreditCard size={16} /> Connect Stripe for Paid Plugins & Complete Setup
              </button>
            </div>

            <div className="dev-btn-row" style={{ marginTop: '1rem' }}>
              <button className="dev-btn dev-btn-secondary" onClick={() => setStep(3)}>Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperOnboardingModal;
