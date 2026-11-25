const PageHeading = ({ eyebrow, title, description, icon: Icon, actions }) => (
  <header className="admin-page-heading">
    <div className="admin-page-heading-main">
      {Icon && (
        <span className="admin-page-heading-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
      )}
      <div className="admin-page-heading-copy">
        {eyebrow && <p className="admin-page-heading-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="admin-page-heading-description">{description}</p>}
      </div>
    </div>
    {actions && <div className="admin-page-heading-actions">{actions}</div>}
  </header>
);

export default PageHeading;
