import React, { useEffect, useState } from 'react';

/**
 * Animated character avatars for each dashboard role in Place4U.
 * Multiple character variants are available per role so users within the
 * same dashboard have visual variety while consistently defaulting to
 * high-craft animated character illustrations instead of plain text initials.
 */
export const ROLE_AVATARS = {
  tenant: [
    '/avatars/tenant.svg',
    '/avatars/tenant-1.svg',
    '/avatars/tenant-2.svg',
    '/avatars/tenant-3.svg',
  ],
  landlord: [
    '/avatars/landlord.svg',
    '/avatars/landlord-1.svg',
    '/avatars/landlord-2.svg',
    '/avatars/landlord-3.svg',
  ],
  agent: [
    '/avatars/agent.svg',
    '/avatars/agent-1.svg',
    '/avatars/agent-2.svg',
    '/avatars/agent-3.svg',
  ],
  admin: [
    '/avatars/admin.svg',
    '/avatars/admin-1.svg',
    '/avatars/admin-2.svg',
    '/avatars/admin-3.svg',
  ],
};

/**
 * Role-based avatars grouped by gender presentation.
 */
export const ROLE_GENDER_AVATARS = {
  tenant: {
    male: ['/avatars/tenant-1.svg', '/avatars/tenant-3.svg'],
    female: ['/avatars/tenant.svg', '/avatars/tenant-2.svg'],
  },
  landlord: {
    male: ['/avatars/landlord.svg', '/avatars/landlord-2.svg'],
    female: ['/avatars/landlord-1.svg', '/avatars/landlord-3.svg'],
  },
  agent: {
    male: ['/avatars/agent.svg', '/avatars/agent-2.svg'],
    female: ['/avatars/agent-1.svg', '/avatars/agent-3.svg'],
  },
  admin: {
    male: ['/avatars/admin.svg', '/avatars/admin-1.svg'],
    female: ['/avatars/admin-2.svg', '/avatars/admin-3.svg'],
  },
};

/**
 * Global pool of gendered avatars.
 */
export const GENDER_AVATARS = {
  male: [
    '/avatars/tenant-1.svg',
    '/avatars/tenant-3.svg',
    '/avatars/agent.svg',
    '/avatars/agent-2.svg',
    '/avatars/landlord.svg',
    '/avatars/landlord-2.svg',
    '/avatars/admin.svg',
    '/avatars/admin-1.svg',
  ],
  female: [
    '/avatars/tenant.svg',
    '/avatars/tenant-2.svg',
    '/avatars/agent-1.svg',
    '/avatars/agent-3.svg',
    '/avatars/landlord-1.svg',
    '/avatars/landlord-3.svg',
    '/avatars/admin-2.svg',
    '/avatars/admin-3.svg',
  ]
};

/**
 * Simple stable string hash for deterministic avatar assignment.
 */
function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Derive up to two initials from a display name, used for crisp,
 * executive monogram avatars across all dashboards.
 */
export function initialsFrom(value = '') {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'P4U';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return (first + last).toUpperCase() || 'P4U';
}

/**
 * Create an inline SVG data URI representing an initials avatar
 * with a high-craft modern gradient circle.
 */
export function createInitialsAvatar(name = '', seed = '') {
  const initials = initialsFrom(name);
  const colorPairs = [
    ['#2563eb', '#1d4ed8'], // blue
    ['#059669', '#047857'], // emerald
    ['#7c3aed', '#6d28d9'], // violet
    ['#d97706', '#b45309'], // amber
    ['#0891b2', '#0e7490'], // cyan
    ['#4f46e5', '#4338ca'], // indigo
    ['#0284c7', '#0369a1'], // sky
    ['#334155', '#1e293b'], // slate
  ];
  const colorIndex = hashString(seed || name || 'seed') % colorPairs.length;
  const [c1, c2] = colorPairs[colorIndex];
  const gradId = `p4u-grad-${colorIndex}-${hashString(seed || name || 'seed') % 9999}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="100%" stop-color="${c2}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#${gradId})" />
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="700" letter-spacing="1">
      ${initials}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Deterministically select an avatar for a given role or user.
 * Defaults to clean, executive monogram initials.
 */
export function getGenderAvatar(role = 'tenant', gender = 'prefer_not_to_say', seed = '') {
  return createInitialsAvatar(role.toUpperCase(), seed || role);
}

/**
 * Get the default avatar URL for a given role and optional seed.
 * Defaults to clean, executive monogram initials.
 */
export function getDefaultAvatar(role = 'tenant', seed = '', gender = '') {
  return createInitialsAvatar(role.toUpperCase(), seed || role);
}

/**
 * Resolves a displayable avatar URL for a user or profile object.
 * Returns the uploaded profile image URL if set; otherwise defaults
 * to a clean, executive monogram initials avatar.
 *
 * @param {Object} [userOrProfile]
 * @param {('tenant'|'landlord'|'agent'|'admin')} [role]
 * @returns {string}
 */
export function getUserAvatar(userOrProfile, role = 'tenant') {
  if (!userOrProfile) return createInitialsAvatar(role.toUpperCase(), role);
  const custom =
    userOrProfile.profile_image_url ||
    userOrProfile.profile_picture ||
    userOrProfile.avatar_url ||
    userOrProfile.user_metadata?.avatar_url ||
    userOrProfile.user_metadata?.picture;

  if (custom && typeof custom === 'string' && custom.trim() !== '') {
    return custom;
  }

  const seed =
    userOrProfile.id ||
    userOrProfile.user_id ||
    userOrProfile.email ||
    userOrProfile.full_name ||
    '';

  const displayName =
    userOrProfile.full_name ||
    (userOrProfile.first_name
      ? `${userOrProfile.first_name} ${userOrProfile.second_name || userOrProfile.last_name || ''}`.trim()
      : '') ||
    userOrProfile.email ||
    role ||
    '';

  return createInitialsAvatar(displayName, seed);
}

/**
 * Image wrapper for avatar <img> elements.
 *
 * If the image fails to load (missing asset, stale dev server, blocked URL)
 * the browser would otherwise paint the alt text into the layout. This swaps
 * the broken image for an empty, correctly sized block that keeps the
 * container's background, and resets once `src` changes.
 *
 * Drop-in for <img>: accepts the same props and forwards them.
 */
export const AvatarImage = ({ src, alt = '', className = '', style, onError, ...rest }) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const currentSrc = typeof src === 'string' ? src : '';
  const hasFailed = Boolean(currentSrc) && failedSrc === currentSrc;

  useEffect(() => {
    setFailedSrc(null);
  }, [currentSrc]);

  if (hasFailed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={className}
        style={{ display: 'block', width: '100%', height: '100%', ...style }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(event) => {
        setFailedSrc(currentSrc);
        if (onError) onError(event);
      }}
      {...rest}
    />
  );
};

/**
 * Reusable Character Avatar component with graceful image fallback.
 * Falls back to initials (derived from `alt` when not supplied) so a missing
 * asset never spills alt text or a broken-image icon into the layout.
 */
export const CharacterAvatar = ({
  src,
  user = null,
  role = 'tenant',
  gender = '',
  seed = '',
  alt = 'Character Avatar',
  className = '',
  style = {},
  size,
  fallbackInitials = '',
}) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const resolvedSeed = seed || user?.id || user?.user_id || user?.email || user?.full_name || '';
  const resolvedGender = gender || user?.gender || user?.user_metadata?.gender || user?.raw_user_meta_data?.gender || '';
  const avatarSrc = src || (user ? getUserAvatar(user, role) : getDefaultAvatar(role, resolvedSeed, resolvedGender));
  const hasFailed = failedSrc === avatarSrc;

  useEffect(() => {
    setFailedSrc(null);
  }, [avatarSrc]);

  const boxStyle = {
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
    ...style,
  };

  if (size) {
    boxStyle.width = typeof size === 'number' ? `${size}px` : size;
    boxStyle.height = typeof size === 'number' ? `${size}px` : size;
  }

  if (hasFailed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={className}
        style={{
          ...boxStyle,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          overflow: 'hidden',
        }}
      >
        {fallbackInitials || initialsFrom(alt)}
      </span>
    );
  }

  return (
    <img
      src={avatarSrc}
      alt={alt}
      className={className}
      onError={() => setFailedSrc(avatarSrc)}
      style={boxStyle}
    />
  );
};
