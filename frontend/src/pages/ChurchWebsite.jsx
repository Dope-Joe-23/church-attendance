import { useEffect, useState } from 'react';
import {
  MdAccessTime,
  MdArrowOutward,
  MdCalendarMonth,
  MdClose,
  MdLocationOn,
  MdMenu,
  MdPhone,
} from 'react-icons/md';
import { Link } from 'react-router-dom';
import wisLogo from '../assets/wis_logo.jpg';
import { churchSiteApi } from '../services/churchSiteApi';
import '../styles/church-website.css';

const ChurchSiteView = ({ content, preview = false, onExitPreview }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const logo = content.logo_url || wisLogo;
  const hasShop = content.shop_url || content.shop_items.length > 0;
  const navItems = [
    { href: '#programs', label: 'Gather with us', show: true },
    { href: '#story', label: 'Our church', show: true },
    { href: '#announcements', label: 'News', show: content.announcements.length > 0 },
    { href: '#shop', label: 'Shop', show: Boolean(hasShop) },
  ].filter((item) => item.show);

  return (
    <div
      className="church-site"
      style={{
        '--site-primary': content.primary_color,
        '--site-accent': content.accent_color,
      }}
    >
      {preview && (
        <div className="church-site-preview-banner">
          <span>Previewing unpublished changes</span>
          <button type="button" onClick={onExitPreview}>Back to editor</button>
        </div>
      )}

      <header className="church-site-header">
        <Link className="church-site-brand" to="/" aria-label={`${content.church_name} home`}>
          <img src={logo} alt="" onError={(event) => { event.currentTarget.src = wisLogo; }} />
          <span>
            <strong>{content.church_name}</strong>
            <small>{content.location}</small>
          </span>
        </Link>
        <button
          type="button"
          className="church-site-menu-toggle"
          aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <MdClose size={23} /> : <MdMenu size={23} />}
        </button>
        <nav className={`church-site-nav ${isMenuOpen ? 'open' : ''}`} aria-label="Church website">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <Link className="church-site-nav-cta" to="/login">Member sign in</Link>
        </nav>
      </header>

      <main>
        <section className={`church-site-hero ${content.hero_image_url ? 'has-image' : ''}`}>
          {content.hero_image_url && (
            <img className="church-site-hero-image" src={content.hero_image_url} alt="" />
          )}
          <div className="church-site-hero-glow" aria-hidden="true" />
          <div className="church-site-hero-content">
            <p className="church-site-kicker"><span />{content.tagline || content.church_name}</p>
            <h1>{content.hero_title}</h1>
            <p className="church-site-hero-copy">{content.hero_body}</p>
            <div className="church-site-hero-actions">
              <a className="church-site-button church-site-button-light" href="#programs">
                Plan a visit <MdArrowOutward aria-hidden="true" />
              </a>
              <a className="church-site-text-link" href="#story">Discover our story</a>
            </div>
            <p className="church-site-location"><MdLocationOn aria-hidden="true" />{content.location}</p>
          </div>
          <div className="church-site-hero-note">
            <span className="church-site-note-mark">✳</span>
            <span><strong>There is a place for you.</strong><small>Come as you are. Grow with us.</small></span>
          </div>
        </section>

        <section className="church-site-programs church-site-section" id="programs">
          <div className="church-site-section-heading">
            <div>
              <p className="church-site-overline">Make time to gather</p>
              <h2>Coming up at church</h2>
            </div>
            <p>Worship, learn, and share life with our community.</p>
          </div>
          {content.programs.length ? (
            <div className="church-site-program-grid">
              {content.programs.map((program, index) => (
                <article className="church-site-program-card" key={`${program.title}-${index}`}>
                  <div className="church-site-program-date">
                    <MdCalendarMonth aria-hidden="true" />
                    <span>{program.date || 'Upcoming'}</span>
                  </div>
                  <h3>{program.title}</h3>
                  {program.description && <p>{program.description}</p>}
                  <div className="church-site-program-meta">
                    {program.time && <span><MdAccessTime aria-hidden="true" />{program.time}</span>}
                    {program.location && <span><MdLocationOn aria-hidden="true" />{program.location}</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="church-site-empty-note">New programs will be shared here soon. We look forward to seeing you.</div>
          )}
        </section>

        {content.announcements.length > 0 && (
          <section className="church-site-announcements church-site-section" id="announcements">
            <div className="church-site-section-heading">
              <div>
                <p className="church-site-overline">Stay connected</p>
                <h2>Church updates</h2>
              </div>
              <p>News and notes from our church family.</p>
            </div>
            <div className="church-site-announcement-list">
              {content.announcements.map((announcement, index) => (
                <article className="church-site-announcement" key={`${announcement.title}-${index}`}>
                  <span className="church-site-announcement-mark" aria-hidden="true">✦</span>
                  <div>
                    {announcement.date && <p className="church-site-overline">{announcement.date}</p>}
                    <h3>{announcement.title}</h3>
                    <p>{announcement.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="church-site-story church-site-section" id="story">
          <div className="church-site-story-copy">
            <p className="church-site-overline">A people growing together</p>
            <h2>Rooted in faith.<br /><span>Open to all.</span></h2>
            <p>{content.history}</p>
            <a className="church-site-inline-link" href="#contact">Come and meet us <MdArrowOutward aria-hidden="true" /></a>
          </div>
          <div className="church-site-story-art">
            <div className="church-site-story-orbit" aria-hidden="true" />
            <div className="church-site-story-card">
              <span className="church-site-story-symbol" aria-hidden="true">✳</span>
              <p>{content.tagline || 'Faith, hope, and a place to belong.'}</p>
              <small>{content.church_name}</small>
            </div>
          </div>
        </section>

        {content.statement_of_faith && (
          <section className="church-site-beliefs church-site-section" id="beliefs">
            <p className="church-site-overline">What guides us</p>
            <h2>Our statement of faith</h2>
            <p>{content.statement_of_faith}</p>
          </section>
        )}

        {hasShop && (
          <section className="church-site-shop church-site-section" id="shop">
            <div className="church-site-section-heading">
              <div>
                <p className="church-site-overline">Made and shared by our community</p>
                <h2>{content.shop_intro ? 'From our church' : 'Church shop'}</h2>
              </div>
              {content.shop_intro && <p>{content.shop_intro}</p>}
            </div>
            {content.shop_items.length > 0 && (
              <div className="church-site-shop-grid">
                {content.shop_items.map((item, index) => (
                  <a
                    className="church-site-shop-card"
                    href={item.url || content.shop_url || '#shop'}
                    key={`${item.name}-${index}`}
                    target={item.url || content.shop_url ? '_blank' : undefined}
                    rel={item.url || content.shop_url ? 'noreferrer' : undefined}
                  >
                    {item.image_url ? <img src={item.image_url} alt="" /> : <span className="church-site-shop-placeholder">✳</span>}
                    <span className="church-site-shop-card-copy">
                      <strong>{item.name}</strong>
                      {item.description && <small>{item.description}</small>}
                    </span>
                    <MdArrowOutward aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
            {content.shop_url && (
              <a className="church-site-button church-site-button-dark" href={content.shop_url} target="_blank" rel="noreferrer">
                Visit our shop <MdArrowOutward aria-hidden="true" />
              </a>
            )}
          </section>
        )}

        <section className="church-site-contact" id="contact">
          <div className="church-site-contact-inner">
            <div>
              <p className="church-site-overline">We'd love to welcome you</p>
              <h2>Let's meet in person.</h2>
              <p>Join us for a service or get in touch with our church team.</p>
              <div className="church-site-contact-details">
                {content.address && <span><MdLocationOn aria-hidden="true" />{content.address}</span>}
                {content.contact_phone && <a href={`tel:${content.contact_phone}`}><MdPhone aria-hidden="true" />{content.contact_phone}</a>}
                {content.contact_email && <a href={`mailto:${content.contact_email}`}>✉ {content.contact_email}</a>}
              </div>
              <div className="church-site-socials">
                {content.facebook_url && <a href={content.facebook_url} target="_blank" rel="noreferrer">Facebook <MdArrowOutward aria-hidden="true" /></a>}
                {content.youtube_url && <a href={content.youtube_url} target="_blank" rel="noreferrer">YouTube <MdArrowOutward aria-hidden="true" /></a>}
              </div>
            </div>
            <Link className="church-site-button church-site-button-light" to="/register">
              Become part of our community <MdArrowOutward aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="church-site-footer">
        <span>{content.church_name}</span>
        <span>{content.tagline}</span>
        <Link to="/login">Member sign in</Link>
      </footer>
    </div>
  );
};

const ChurchWebsite = () => {
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    churchSiteApi.getPublicSite()
      .then((response) => {
        if (active) setContent(response.content);
      })
      .catch((requestError) => {
        console.error('Unable to load the church website:', requestError);
        if (active) setError('We could not load the church website right now. Please try again.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const retry = () => {
    setIsLoading(true);
    setError('');
    churchSiteApi.getPublicSite()
      .then((response) => setContent(response.content))
      .catch((requestError) => {
        console.error('Unable to load the church website:', requestError);
        setError('We could not load the church website right now. Please try again.');
      })
      .finally(() => setIsLoading(false));
  };

  if (isLoading) {
    return <div className="church-site-state">Loading church website…</div>;
  }
  if (error || !content) {
    return (
      <div className="church-site-state">
        <p>{error || 'Church website content is unavailable.'}</p>
        <button type="button" onClick={retry}>Try again</button>
      </div>
    );
  }
  return <ChurchSiteView content={content} />;
};

export { ChurchSiteView };
export default ChurchWebsite;
