import React from 'react';
import { Music, Headphones, Radio, Mic, Guitar, Stars } from 'lucide-react';

export const genreColors = [
  'bg-purple-600', 'bg-blue-600', 'bg-red-600', 'bg-pink-600', 
  'bg-green-600', 'bg-yellow-600', 'bg-indigo-600', 'bg-orange-600',
  'bg-teal-600', 'bg-cyan-600', 'bg-emerald-600', 'bg-violet-600'
];

export const getGenreStyles = (name) => {
  if (!name) return { color: 'bg-gray-700', icon: <Music size={48} /> };

  // Deterministic color based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = genreColors[Math.abs(hash) % genreColors.length];

  // Specific icons for common genres
  const icons = {
    Pop: <Music />,
    Electronic: <Headphones />,
    Rock: <Guitar />,
    'Hip Hop': <Mic />,
    Jazz: <Radio />,
    Indie: <Stars />,
  };

  return {
    color,
    icon: icons[name] || <Music />,
  };
};
