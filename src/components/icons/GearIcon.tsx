import React from "react";

interface GearIconProps {
  className?: string;
}

export function GearIcon({ className }: GearIconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16">
      <path
        d="M8 10a2 2 0 100-4 2 2 0 000 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 8.5v-1l-1.2-.3a4.5 4.5 0 00-.6-1.4l.7-1a.5.5 0 00-.1-.7l-1.4-1.4a.5.5 0 00-.7-.1l-1 .7a4.5 4.5 0 00-1.4-.6L6.5 2.5h-1l-.3 1.2a4.5 4.5 0 00-1.4.6l-1-.7a.5.5 0 00-.7.1L.7 4.8a.5.5 0 00-.1.7l.7 1a4.5 4.5 0 00-.6 1.4l-1.2.3v1l1.2.3a4.5 4.5 0 00.6 1.4l-.7 1a.5.5 0 00.1.7l1.4 1.4a.5.5 0 00.7.1l1-.7a4.5 4.5 0 001.4.6l.3 1.2h1l.3-1.2a4.5 4.5 0 001.4-.6l1 .7a.5.5 0 00.7-.1l1.4-1.4a.5.5 0 00.1-.7l-.7-1a4.5 4.5 0 00.6-1.4l1.2-.3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
