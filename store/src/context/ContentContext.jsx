import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getStoreContent } from '../services/contentService';
import { BRAND_NAME, CONTACT } from '../utils/constants';

const ContentContext = createContext({
  content: null,
  loading: true,
  contact: {
    storeName: BRAND_NAME,
    emails: CONTACT.emails,
    email: CONTACT.emails[0],
    phoneDisplay: CONTACT.phoneDisplay,
    phoneTel: CONTACT.phoneTel,
    whatsappUrl: CONTACT.whatsappUrl,
    address: '',
  },
});

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

export function buildStoreContact(content) {
  const raw = digitsOnly(content?.phone || CONTACT.phone);
  const national = raw.length === 12 && raw.startsWith('91') ? raw.slice(2) : raw.slice(-10);
  const usable = national.length === 10 ? national : digitsOnly(CONTACT.phone).slice(-10);
  const emails = content?.storeEmail ? [content.storeEmail] : CONTACT.emails;

  return {
    storeName: content?.storeName || BRAND_NAME,
    emails,
    email: emails[0],
    phoneDisplay: usable.length === 10 ? `+91 ${usable.slice(0, 5)} ${usable.slice(5)}` : CONTACT.phoneDisplay,
    phoneTel: `+91${usable}`,
    whatsappUrl: `https://wa.me/91${usable}`,
    address: content?.address || '',
  };
}

export function ContentProvider({ children }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getStoreContent()
      .then((data) => {
        if (active) setContent(data);
      })
      .catch(() => {
        if (active) setContent(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      content,
      loading,
      contact: buildStoreContact(content),
    }),
    [content, loading]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useStoreContent() {
  return useContext(ContentContext);
}
