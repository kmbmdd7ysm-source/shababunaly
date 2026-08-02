import Icon from '../icons/Icon';
import { Link } from 'react-router-dom';

export default function SectionHeading({ label = '', title = '', sub = '', link = '', linkLabel = '', align = 'start' }) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      <div>
        {label && <span className="section-label">{label}</span>}
        <h2 className="section-title">{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {link && linkLabel && (
        <Link to={link} className="section-link">
          {linkLabel} <Icon name="arrow" size={18} />
        </Link>
      )}
    </div>
  );
}
