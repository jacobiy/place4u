import React, { useState } from 'react';

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
 * @param {Object} [userOrProfile]
 * @param {('tenant'|'landlord'|'agent'|'admin')} [role]
 * @returns {string}
 */
export function getUserAvatar(userOrProfile, role = 'tenant') {
  if (!userOrProfile) return getDefaultAvatar(role);
  const custom =
    userOrProfile.profile_image_url ||
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
 * Reusable Character Avatar component with graceful image fallback.
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
  const [hasError, setHasError] = useState(false);
  const avatarSrc = src || getDefaultAvatar(role, seed);

  if (hasError && fallbackInitials) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          ...style,
        }}
      >
        {fallbackInitials}
      </span>
    );
  }

  const computedStyle = {
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
    ...style,
  };

  if (size) {
    computedStyle.width = typeof size === 'number' ? `${size}px` : size;
    computedStyle.height = typeof size === 'number' ? `${size}px` : size;
  }

  return (
    <img
      src={avatarSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      style={computedStyle}
    />
  );
};
