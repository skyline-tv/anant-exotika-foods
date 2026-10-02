import { toTitleCase } from '../../utils/titleCase';
import Breadcrumb from './Breadcrumb';

const PageHeader = ({ eyebrow, title, subtitle, crumbs }) => (
  <header className="page-header">
    {crumbs ? <Breadcrumb items={crumbs} /> : null}
    {eyebrow ? <span className="eyebrow">{toTitleCase(eyebrow)}</span> : null}
    <h1>{toTitleCase(title)}</h1>
    {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
  </header>
);

export default PageHeader;
