import React from "react";
import { Play, Pause, Heart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectIsLiked, toggleLike } from "../../../../slices/user/librarySlice";

const TrackCard = ({ item, index, isPlaying, onPlayPlayable, type = 'music' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const username = useSelector((state) => state.user.username);
  
  // Use Redux selector to check if this track is liked
  const isLiked = useSelector((state) => selectIsLiked(state, item.id));

  const handleLike = (e) => {
    e.stopPropagation();
    dispatch(toggleLike(item.id));
  };

  const handleCardClick = () => {
    if (type === 'album') {
      navigate(`/album/${item.id}`);
    } else if (type === 'playlist') {
      const route = item.created_by === username ? `/playlist/${item.id}` : `/saved-playlist/${item.id}`;
      navigate(route);
    } else if (type === 'music') {
      // For music, clicking the card could also play it
      onPlayPlayable(item, index, { stopPropagation: () => {} });
    }
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (type === 'album') {
      navigate(`/album/${item.id}`, { state: { autoPlay: true } });
    } else if (type === 'playlist') {
      const route = item.created_by === username ? `/playlist/${item.id}` : `/saved-playlist/${item.id}`;
      navigate(route, { state: { autoPlay: true } });
    } else {
      onPlayPlayable(item, index, e);
    }
  };

  const coverSrc = item.cover_photo || item.image || item.cover;
  const artistName = item.artist?.name || item.artist || item.author || "Unknown Artist";

  return (
    <div 
      className="flex-none w-44 p-3 m-2 bg-neutral-900/40 hover:bg-neutral-800/60 rounded-lg group transition-all duration-300 ease-in-out cursor-pointer hover:shadow-2xl"
      onClick={handleCardClick}
    >
      <div className="relative w-full aspect-square mb-4">
        <img
          src={typeof coverSrc === 'string' ? coverSrc : '/default-cover.png'}
          alt={item.name}
          className="w-full h-full object-cover rounded-md shadow-lg group-hover:shadow-xl transition-shadow duration-300"
        />
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-md flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 duration-300">
          <button
            className={`w-12 h-12 bg-green-500 rounded-full flex items-center justify-center transform translate-y-4 group-hover:translate-y-0 shadow-lg hover:scale-105 hover:bg-green-400 transition-all duration-300 ${isPlaying ? 'opacity-100 translate-y-0' : ''}`}
            onClick={handlePlayClick}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-black fill-current" />
            ) : (
              <Play className="w-6 h-6 text-black fill-current ml-1" />
            )}
          </button>
        </div>
      </div>
      <div className="flex items-start justify-between min-h-[3rem]">
        <div className="flex-1 truncate pr-2">
          <h3 className="font-bold text-base text-white truncate mb-1">{item.name}</h3>
          <p className="text-sm text-neutral-400 truncate">{artistName}</p>
        </div>
        {/* Like Button - only meaningful for tracks directly right now */}
        {type === 'music' && (
          <button 
            onClick={handleLike}
            className="text-neutral-400 hover:text-white mt-1 transition-colors"
          >
            <Heart 
              className={`w-5 h-5 transition-transform hover:scale-110 active:scale-90 ${isLiked ? 'fill-green-500 text-green-500' : ''}`} 
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default TrackCard;
