// Avatar — a reusable circular member avatar used across PULSE (Family cards,
// the Login member tiles, and the nav-rail current-member chip).
//
// It renders the member's `avatar` image (an SVG/PNG/JPG served from
// /public/avatars) inside a circle tinted with the member's `avatarColor` glow
// ring. If the image is missing or fails to load, it gracefully falls back to
// the member's colored initials — so the UI never breaks, and each avatar
// "lights up" the moment its file exists.

import { useState } from 'react';

/** deriveInitials — first letters of the first/last name words, uppercased. */
function deriveInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar
 * @param member  { name, avatar?, avatarColor }
 * @param size    pixel diameter (default 56)
 * @param ring    show the subtle white ring (default true)
 * @param className extra classes
 */
export default function Avatar({ member, size = 56, ring = true, className = '' }) {
  const [errored, setErrored] = useState(false);
  const { name = '', avatar, avatarColor = '#22d3ee' } = member || {};
  const showImage = Boolean(avatar) && !errored;

  return (
    <span
      aria-hidden="true"
      className={
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ' +
        (ring ? 'ring-2 ring-white/10 ' : '') +
        className
      }
      style={{
        width: size,
        height: size,
        backgroundColor: `${avatarColor}26`,
        color: avatarColor,
        boxShadow: `0 0 16px ${avatarColor}55, inset 0 0 12px ${avatarColor}22`,
      }}
    >
      {showImage ? (
        <img
          src={avatar}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="font-sans font-bold leading-none" style={{ fontSize: size * 0.36 }}>
          {deriveInitials(name)}
        </span>
      )}
    </span>
  );
}
