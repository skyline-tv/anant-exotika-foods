const svg = (children) => (
  <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
    {children}
  </svg>
);

export const CorporateIcon = () =>
  svg(
    <>
      <rect x="10" y="22" width="28" height="24" rx="3" fill="#0b6b45" />
      <path d="M10 30h28" stroke="#f2c14e" strokeWidth="3" />
      <path d="M24 22v24" stroke="#f2c14e" strokeWidth="3" />
      <rect x="30" y="28" width="24" height="18" rx="3" fill="#16324f" />
      <path d="M36 28v-4a6 6 0 0 1 12 0v4" fill="none" stroke="#d4a017" strokeWidth="2.4" />
      <rect x="38" y="35" width="8" height="5" rx="1" fill="#f2c14e" />
    </>
  );

export const WeddingIcon = () =>
  svg(
    <>
      <circle cx="24" cy="34" r="12" fill="none" stroke="#e0b03a" strokeWidth="4" />
      <circle cx="40" cy="34" r="12" fill="none" stroke="#f4d27a" strokeWidth="4" />
      <circle cx="18" cy="18" r="4" fill="#fff7ea" stroke="#7d9a62" strokeWidth="1.5" />
      <circle cx="48" cy="16" r="3.5" fill="#f7c1d4" />
      <path d="M30 16c2 3 4 3 6 0" fill="none" stroke="#2f6b45" strokeWidth="2" />
    </>
  );

export const BirthdayIcon = () =>
  svg(
    <>
      <path d="M14 40h36l-3 12H17z" fill="#f6d7e4" />
      <rect x="16" y="30" width="32" height="12" rx="2" fill="#fff8f2" stroke="#e7b7c8" />
      <path d="M16 34c4 3 8-3 12 0s8-3 12 0 8-3 8 0" fill="none" stroke="#e07aa0" strokeWidth="2" />
      <rect x="30" y="16" width="4" height="14" rx="1" fill="#f2c14e" />
      <path d="M32 10c2 3 2 5 0 7-2-2-2-4 0-7z" fill="#ff8a3d" />
      <circle cx="22" cy="24" r="2" fill="#7d9a62" />
      <circle cx="44" cy="24" r="2" fill="#e07aa0" />
    </>
  );

export const FestivalIcon = () =>
  svg(
    <>
      <ellipse cx="32" cy="46" rx="16" ry="6" fill="#c9842a" />
      <path d="M18 46c2-10 8-16 14-16s12 6 14 16" fill="#e8a317" />
      <path d="M32 14c4 6 6 10 4 16-4-2-8-2-12 0 2-6 4-10 8-16z" fill="#ff7a1a" />
      <path d="M32 18c2 4 3 7 2 11-2-1-4-1-6 0 1-4 2-7 4-11z" fill="#ffe08a" />
      <circle cx="16" cy="40" r="4" fill="#f4a300" />
      <circle cx="50" cy="38" r="3.5" fill="#ef6b2f" />
    </>
  );

export const ReturnGiftIcon = () =>
  svg(
    <>
      <rect x="16" y="26" width="32" height="24" rx="3" fill="#f3e6cf" stroke="#d7b56a" />
      <path d="M16 34h32" stroke="#c45b4a" strokeWidth="3" />
      <path d="M32 26v24" stroke="#c45b4a" strokeWidth="3" />
      <path d="M32 26c-6-8-14-6-14 0 6 0 10 0 14 0z" fill="#e07a6a" />
      <path d="M32 26c6-8 14-6 14 0-6 0-10 0-14 0z" fill="#f2a3a0" />
      <rect x="36" y="36" width="14" height="10" rx="1.5" fill="#fffaf2" stroke="#c9842a" transform="rotate(12 43 41)" />
    </>
  );

export const HouseIcon = () =>
  svg(
    <>
      <path d="M10 32 L32 14 L54 32" fill="#7d9a62" />
      <rect x="18" y="32" width="28" height="20" rx="2" fill="#f4e2c4" />
      <rect x="28" y="38" width="8" height="14" rx="1" fill="#c9842a" />
      <circle cx="46" cy="28" r="7" fill="#2f6b45" />
      <rect x="44.5" y="28" width="3" height="10" fill="#6b4a2b" />
    </>
  );

export const BabyIcon = () =>
  svg(
    <>
      <circle cx="30" cy="28" r="12" fill="#e7c39a" />
      <circle cx="25" cy="26" r="1.6" fill="#3d2b1f" />
      <circle cx="34" cy="26" r="1.6" fill="#3d2b1f" />
      <path d="M26 32c2 2 6 2 8 0" fill="none" stroke="#c45b4a" strokeWidth="1.6" />
      <ellipse cx="20" cy="30" rx="4" ry="5" fill="#d7ad86" />
      <ellipse cx="40" cy="30" rx="4" ry="5" fill="#d7ad86" />
      <path d="M22 38c6 8 16 8 22 0" fill="#8ec5e8" />
      <rect x="40" y="40" width="8" height="12" rx="3" fill="#d7eef8" stroke="#7eb6d6" />
    </>
  );

export const MomentIcon = () =>
  svg(
    <>
      <path d="M32 50 C12 36 14 20 26 20 c4 0 6 3 6 3s2-3 6-3c12 0 14 16-6 30z" fill="#c23b4a" />
      <path d="M22 24c6 2 8 8 8 8" fill="none" stroke="#f2c14e" strokeWidth="2" />
      <circle cx="46" cy="20" r="6" fill="#f4a7c2" />
      <circle cx="46" cy="20" r="2" fill="#fff4d6" />
      <path d="M14 18c4-6 10-4 10 2" fill="none" stroke="#7d9a62" strokeWidth="2" />
    </>
  );
