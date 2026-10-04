import './AnnouncementBar.css';
import { useStoreContent } from '../../context/ContentContext';

const AnnouncementBar = () => {
  const { content } = useStoreContent();
  const closed = content?.storeStatus === 'closed';
  if (!closed) return null;

  return (
    <div className="announcement-bar" role="region" aria-label="Store announcements">
      <p className="announcement-bar__text">The store is temporarily closed. You can still browse the collection.</p>
    </div>
  );
};

export default AnnouncementBar;
