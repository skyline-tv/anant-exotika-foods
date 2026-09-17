import Breadcrumb from './Breadcrumb';

const PageHeader = ({ eyebrow, title, subtitle, crumbs }) => (
  <header className="page-header">
    {crumbs ? <Breadcrumb items={crumbs} /> : null}
    {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
    <h1>{title}</h1>
    {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
  </header>
);

export default PageHeader;
