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
 * Derive up to two initials from a display name, used when an avatar image
 * cannot be loaded. Keeps a label in the layout instead of alt text.
 */
function initialsFrom(value = '') {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return (first + last).toUpperCase();
}

/**
 * Get the default animated character avatar URL for a given role.
 * If a seed (e.g. userId, email, or name) is provided, deterministically
 * selects one of the animated character variations for that role.
 *
 * @param {('tenant'|'landlord'|'agent'|'admin')} role
 * @param {string} [seed]
 * @returns {string} Relative public path to the character SVG
 */
export function getDefaultAvatar(role = 'tenant', seed = '') {
  const normalizedRole = (role || 'tenant').toLowerCase().trim();
  const list = ROLE_AVATARS[normalizedRole] || ROLE_AVATARS.tenant;
  if (!seed) return list[0];
  const index = hashString(String(seed)) % list.length;
  return list[index];
}

/**
 * Resolves a displayable avatar URL for a user or profile object.
 * Returns the uploaded profile image URL if set; otherwise defaults
 * to the role's animated character picture.
 *
 * The column name differs between portals (`profile_image_url` in the
 * profiles tables, `profile_picture` in the agent dashboard's user row),
 * so both are checked here rather than at every call site.
 *
 * @param {Object} [userOrProfile]
 * @param {('tenant'|'landlord'|'agent'|'admin')} [role]
 * @returns {string}
 */
export function getUserAvatar(userOrProfile, role = 'tenant') {
  if (!userOrProfile) return getDefaultAvatar(role);
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

  return getDefaultAvatar(role, seed);
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
  role = 'tenant',
  seed = '',
  alt = 'Character Avatar',
  className = '',
  style = {},
  size,
  fallbackInitials = '',
}) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const avatarSrc = src || getDefaultAvatar(role, seed);
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
