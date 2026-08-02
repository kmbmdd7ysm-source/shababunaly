export default function PageHero({ label = '', title = '', description = '', children = null }) {
  return (
    <section className="page-hero">
      <div className="court-lines" aria-hidden="true" />
      <div className="container page-hero-inner">
        {label && <div className="section-label">{label}</div>}
        <h1 className="display-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
        {children}
      </div>
    </section>
  );
}
