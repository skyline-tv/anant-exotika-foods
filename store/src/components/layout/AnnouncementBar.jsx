import './AnnouncementBar.css';
import { useStoreContent } from '../../context/ContentContext';

const AnnouncementBar = () => {
  const { content } = useStoreContent();
  const closed = content?.storeStatus === 'closed';

  return (
    <div className="announcement-bar" role="region" aria-label="Store announcements">
      <p className="announcement-bar__text">
        {closed
          ? 'The store is temporarily closed. You can still browse the collection.'
          : 'Complimentary premium packaging · Pan-India delivery · Cash on delivery'}
      </p>
    </div>
  );
};

export default AnnouncementBar;
