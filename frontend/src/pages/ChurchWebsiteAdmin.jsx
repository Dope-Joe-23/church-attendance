import { createElement, useEffect, useMemo, useState } from 'react';
import {
  MdCampaign,
  MdCheck,
  MdEvent,
  MdInfo,
  MdPalette,
  MdPublic,
  MdStore,
} from 'react-icons/md';
import { ChurchSiteView } from './ChurchWebsite';
import { churchSiteApi } from '../services/churchSiteApi';
import '../styles/church-website-admin.css';

const editorSections = [
  { id: 'identity', label: 'Church identity', icon: MdPublic },
  { id: 'welcome', label: 'Welcome section', icon: MdInfo },
  { id: 'programs', label: 'Programs', icon: MdEvent },
  { id: 'announcements', label: 'Announcements', icon: MdCampaign },
  { id: 'story', label: 'History & beliefs', icon: MdInfo },
  { id: 'shop', label: 'Church shop', icon: MdStore },
  { id: 'style', label: 'Contact & style', icon: MdPalette },
];

const sectionDescriptions = {
  identity: 'Set the name and details visitors see throughout your website.',
  welcome: 'Write a warm introduction and choose an optional hero image.',
  programs: 'Share upcoming gatherings, services, and special programs.',
  announcements: 'Post timely updates for your church community.',
  story: 'Tell visitors about your history and statement of faith.',
  shop: 'Show featured items or connect visitors to your external shop.',
  style: 'Choose your colors and make it easy to contact your church.',
};

const fieldGroups = {
  identity: [
    { name: 'church_name', label: 'Church name', required: true },
    { name: 'tagline', label: 'Tagline' },
    { name: 'location', label: 'City or location' },
    { name: 'logo_url', label: 'Logo image URL', type: 'url', hint: 'Use a public HTTPS image URL. Leave blank to use the current church logo.' },
  ],
  welcome: [
    { name: 'hero_title', label: 'Welcome headline', required: true },
    { name: 'hero_body', label: 'Welcome message', type: 'textarea', rows: 4 },
    { name: 'hero_image_url', label: 'Hero image URL', type: 'url', hint: 'Optional. Use a public HTTPS image URL.' },
  ],
  story: [
    { name: 'history', label: 'Church history', type: 'textarea', rows: 6 },
    { name: 'statement_of_faith', label: 'Statement of faith', type: 'textarea', rows: 6 },
  ],
  shop: [
    { name: 'shop_url', label: 'External shop URL', type: 'url', hint: 'Visitors will be sent to this address to browse or buy.' },
    { name: 'shop_intro', label: 'Shop introduction', type: 'textarea', rows: 3 },
  ],
  style: [
    { name: 'address', label: 'Church address', type: 'textarea', rows: 2 },
    { name: 'contact_phone', label: 'Phone number', type: 'tel' },
    { name: 'contact_email', label: 'Contact email', type: 'email' },
    { name: 'facebook_url', label: 'Facebook page', type: 'url' },
    { name: 'youtube_url', label: 'YouTube channel', type: 'url' },
    { name: 'primary_color', label: 'Primary brand color', type: 'color' },
    { name: 'accent_color', label: 'Accent color', type: 'color' },
  ],
};

const repeatableGroups = {
  programs: {
    title: 'Upcoming programs',
    addLabel: 'Add program',
    fieldName: 'programs',
    template: { title: '', date: '', time: '', location: '', description: '' },
    fields: [
      { name: 'title', label: 'Program name', required: true },
      { name: 'date', label: 'Date' },
      { name: 'time', label: 'Time' },
      { name: 'location', label: 'Location' },
      { name: 'description', label: 'Details', type: 'textarea', rows: 3 },
    ],
  },
  announcements: {
    title: 'Announcements',
    addLabel: 'Add announcement',
    fieldName: 'announcements',
    template: { title: '', body: '', date: '' },
    fields: [
      { name: 'title', label: 'Announcement title', required: true },
      { name: 'date', label: 'Date or label' },
      { name: 'body', label: 'Message', type: 'textarea', rows: 4 },
    ],
  },
  shop: {
    title: 'Featured items',
    addLabel: 'Add featured item',
    fieldName: 'shop_items',
    template: { name: '', description: '', image_url: '', url: '' },
    fields: [
      { name: 'name', label: 'Item name', required: true },
      { name: 'description', label: 'Short description' },
      { name: 'image_url', label: 'Image URL', type: 'url' },
      { name: 'url', label: 'Item link', type: 'url', hint: 'Optional. The shop URL is used when this is blank.' },
    ],
  },
};

const getErrorMessage = (error) => {
  const data = error.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (data && typeof data === 'object') {
    const firstError = Object.values(data).flat(Infinity).find((value) => typeof value === 'string');
    if (firstError) return firstError;
  }
  return 'The website could not be updated. Please try again.';
};

const WebsiteField = ({ field, value, onChange }) => (
  <label className={`website-editor-field ${field.type === 'color' ? 'color-field' : ''}`}>
    <span>{field.label}{field.required && <b aria-hidden="true"> *</b>}</span>
    {field.type === 'textarea' ? (
      <textarea
        rows={field.rows || 3}
        value={value}
        required={field.required}
        onChange={(event) => onChange(event.target.value)}
      />
    ) : (
      <input
        type={field.type || 'text'}
        value={value}
        required={field.required}
        onChange={(event) => onChange(event.target.value)}
      />
    )}
    {field.hint && <small>{field.hint}</small>}
  </label>
);

const ChurchWebsiteAdmin = () => {
  const [draft, setDraft] = useState(null);
  const [activeSection, setActiveSection] = useState('identity');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [publishedAt, setPublishedAt] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const hasChanges = useMemo(
    () => draft && JSON.stringify(draft) !== savedSnapshot,
    [draft, savedSnapshot],
  );

  useEffect(() => {
    let active = true;
    churchSiteApi.getEditorContent()
      .then((response) => {
        if (!active) return;
        setDraft(response.draft);
        setPublishedAt(response.published_at);
        setSavedSnapshot(JSON.stringify(response.draft));
      })
      .catch((error) => {
        console.error('Unable to load church website settings:', error);
        if (active) setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setStatusMessage('');
  };

  const updateItem = (field, index, key, value) => {
    setDraft((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }));
    setStatusMessage('');
  };

  const addItem = (field, template) => {
    setDraft((current) => ({ ...current, [field]: [...current[field], { ...template }] }));
    setStatusMessage('');
  };

  const removeItem = (field, index) => {
    setDraft((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
    setStatusMessage('');
  };

  const saveDraft = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const response = await churchSiteApi.saveDraft(draft);
      setDraft(response.draft);
      setSavedSnapshot(JSON.stringify(response.draft));
      setStatusMessage('Draft saved. Your live website has not changed.');
    } catch (error) {
      console.error('Unable to save church website draft:', error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const publishWebsite = async () => {
    setIsPublishing(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const saved = await churchSiteApi.saveDraft(draft);
      setDraft(saved.draft);
      setSavedSnapshot(JSON.stringify(saved.draft));
      const published = await churchSiteApi.publish();
      setPublishedAt(published.published_at);
      setStatusMessage('Your church website is now live.');
    } catch (error) {
      console.error('Unable to publish church website:', error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsPublishing(false);
    }
  };

  if (isPreviewing && draft) {
    return <ChurchSiteView content={draft} preview onExitPreview={() => setIsPreviewing(false)} />;
  }

  if (isLoading) {
    return <div className="website-editor-state">Loading website editor…</div>;
  }

  if (!draft) {
    return (
      <div className="website-editor-state">
        <h1>Website editor unavailable</h1>
        <p>{errorMessage || 'Website settings could not be loaded.'}</p>
        <p>Sign in with a church account to edit or publish website content.</p>
      </div>
    );
  }

  const selectedSection = editorSections.find((section) => section.id === activeSection);
  const repeatable = repeatableGroups[activeSection];
  const sectionFields = fieldGroups[activeSection] || [];

  return (
    <div className="website-editor">
      <header className="website-editor-header">
        <div>
          <p className="website-editor-eyebrow">Church website</p>
          <h1>Make it yours</h1>
          <p>Update your public page and share what is happening in your church.</p>
        </div>
        <div className="website-editor-actions">
          <button type="button" className="website-editor-button secondary" onClick={() => setIsPreviewing(true)}>
            Preview
          </button>
          <button
            type="button"
            className="website-editor-button secondary"
            onClick={saveDraft}
            disabled={!hasChanges || isSaving || isPublishing}
          >
            {isSaving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            className="website-editor-button primary"
            onClick={publishWebsite}
            disabled={isSaving || isPublishing}
          >
            {isPublishing ? 'Publishing…' : 'Publish website'}
          </button>
        </div>
      </header>

      <div className="website-editor-status" aria-live="polite">
        <span className={hasChanges ? 'unsaved' : 'saved'}>
          {hasChanges ? 'Unsaved changes' : <><MdCheck aria-hidden="true" /> Draft saved</>}
        </span>
        {publishedAt && <span>Last published {new Date(publishedAt).toLocaleString()}</span>}
        {statusMessage && <span className="website-editor-message">{statusMessage}</span>}
        {errorMessage && <span className="website-editor-error" role="alert">{errorMessage}</span>}
      </div>

      <div className="website-editor-layout">
        <nav className="website-editor-sections" aria-label="Website editor sections">
          {editorSections.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={activeSection === id ? 'active' : ''}
              aria-current={activeSection === id ? 'step' : undefined}
              onClick={() => setActiveSection(id)}
            >
              {createElement(Icon, { size: 19, 'aria-hidden': true })}
              <span>{label}</span>
            </button>
          ))}
          <div className="website-editor-tip">
            <strong>Not live yet</strong>
            <p>Save your changes as a draft, preview them, then publish when you're ready.</p>
          </div>
        </nav>

        <section className="website-editor-panel">
          <div className="website-editor-panel-heading">
            <div>
              <h2>{selectedSection.label}</h2>
              <p>{sectionDescriptions[activeSection]}</p>
            </div>
          </div>

          {repeatable ? (
            <div className="website-editor-repeatable">
              <div className="website-editor-list-heading">
                <h3>{repeatable.title}</h3>
                <button type="button" className="website-editor-button secondary" onClick={() => addItem(repeatable.fieldName, repeatable.template)}>
                  + {repeatable.addLabel}
                </button>
              </div>
              {draft[repeatable.fieldName].length === 0 && (
                <div className="website-editor-empty">Nothing added yet. Add an item to include it on your public page.</div>
              )}
              {draft[repeatable.fieldName].map((item, index) => (
                <fieldset className="website-editor-item" key={`${activeSection}-${index}`}>
                  <legend>{repeatable.title.slice(0, -1)} {index + 1}</legend>
                  {repeatable.fields.map((field) => (
                    <WebsiteField
                      key={field.name}
                      field={field}
                      value={item[field.name]}
                      onChange={(value) => updateItem(repeatable.fieldName, index, field.name, value)}
                    />
                  ))}
                  <button type="button" className="website-editor-remove" onClick={() => removeItem(repeatable.fieldName, index)}>
                    Remove item
                  </button>
                </fieldset>
              ))}
            </div>
          ) : (
            <div className="website-editor-fields">
              {sectionFields.map((field) => (
                <WebsiteField
                  key={field.name}
                  field={field}
                  value={draft[field.name]}
                  onChange={(value) => updateField(field.name, value)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ChurchWebsiteAdmin;
