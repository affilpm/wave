import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Track } from '../../types/player';

interface TrackInfoProps {
  track: Track;
  isLiked: boolean;
  onToggleLike: () => void;
}

export const TrackInfo: React.FC<TrackInfoProps> = ({ track, isLiked, onToggleLike }) => {
  return (
    <div className="flex items-center justify-between w-full mt-6 mb-2">
      <div className="flex flex-col overflow-hidden mr-4">
        {/* Extracted sliding/marquee behavior would go here if needed, simple truncate for now */}
        <h2 className="text-[22px] font-semibold text-white tracking-[-0.3px] truncate">
          {track.name || track.title || 'Unknown'}
        </h2>
        <p className="text-[17px] text-white/55 truncate">
          {track.artist_id ? (
            <Link 
              to={`/artist/${track.artist_id}`}
              className="hover:underline hover:text-white transition-colors"
            >
              {track.artist}
            </Link>
          ) : (
            track.artist || 'Unknown Artist'
          )}
          {track.album && (
            <>
              { " • " }
              {track.album_id ? (
                <Link 
                  to={`/album/${track.album_id}`} 
                  className="hover:underline hover:text-white transition-colors"
                >
                  {track.album}
                </Link>
              ) : (
                track.album
              )}
            </>
          )}
        </p>
      </div>

      <div className="flex items-center space-x-3 shrink-0">
        <motion.button
          onClick={onToggleLike}
          whileTap={{ scale: 0.8 }}
          className="focus:outline-none"
        >
          <motion.div
            initial={false}
            animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Heart size={24} className={isLiked ? "text-[var(--player-accent)]" : "text-white/80"} fill={isLiked ? "currentColor" : "none"} />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
};
