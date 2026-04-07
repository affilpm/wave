import React from 'react';

const colors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
];

const getColor = (name: string) => {
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

interface AvatarFallbackProps {
  name?: string;
  username?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

const AvatarFallback: React.FC<AvatarFallbackProps> = ({ name, username, className = "", style = {}, id }) => {
  const displayName = name || username || "?";
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div 
      id={id}
      className={`flex items-center justify-center ${getColor(displayName)} font-bold text-white shadow-lg transition-all duration-300 ${className}`}
      style={style}
    >
      {firstLetter}
    </div>
  );
};

export default AvatarFallback;
