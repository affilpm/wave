import React, { useMemo } from "react";
import { Play, Pause, Heart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectIsLiked, toggleLike, selectFollowedArtists, toggleFollowArtist } from "../../../../slices/user/librarySlice";

const TrackCard = ({ item, index, isPlaying, onPlayPlayable, type = 'music' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const username = useSelector((state) => state.user.username);
  
  // Selectors for artist follow status
  const followedArtists = useSelector(selectFollowedArtists);
  const isFollowed = useMemo(() => {
    if (type !== 'artist') return false;
    return followedArtists.some(a => (a.artist?.id || a.id) === item.id);
  }, [followedArtists, item.id, type]);

  // Use Redux selector to check if this track is liked
  const isLiked = useSelector((state) => selectIsLiked(state, item.id));

  const handleLike = (e) => {
    e.stopPropagation();
    dispatch(toggleLike(item.id));
  };

  const handleFollow = (e) => {
    e.stopPropagation();
    dispatch(toggleFollowArtist(item));
  };

  const handleCardClick = () => {
    if (type === 'album') {
      navigate(`/album/${item.id}`);
    } else if (type === 'playlist') {
      const route = item.created_by === username ? `/playlist/${item.id}` : `/saved-playlist/${item.id}`;
      navigate(route);
    } else if (type === 'artist') {
      navigate(`/artist/${item.id}`);
    } else if (type === 'music') {
      // For music, clicking the card could also play it
      onPlayPlayable(item, index, { stopPropagation: () => {} });
    }
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    onPlayPlayable(item, index, e);
  };

  const coverSrc = item.cover_photo || item.image || item.cover || item.profile_photo;
  const artistName = item.artist?.name || item.artist || item.author || (type === 'artist' ? 'Artist' : "Unknown Artist");
  const isArtist = type === 'artist';

  return (
    <div 
      className="flex-none w-44 p-3 m-2 bg-neutral-900/40 hover:bg-neutral-800/60 rounded-lg group transition-all duration-300 ease-in-out cursor-pointer hover:shadow-2xl"
      onClick={handleCardClick}
    >
      <div className={`relative w-full aspect-square mb-4 ${isArtist ? 'px-2' : ''}`}>
        <img
          src={typeof coverSrc === 'string' ? coverSrc : '/default-cover.png'}
          alt={item.name || item.username}
          className={`w-full h-full object-cover shadow-lg group-hover:shadow-xl transition-all duration-300 ${isArtist ? 'rounded-full' : 'rounded-md'}`}
        />
        {/* Play Button Overlay (Hidden for artists usually, or used to play top tracks) */}
        {!isArtist && (
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
        )}
      </div>
      <div className="flex flex-col min-h-[4rem]">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 truncate pr-2">
            <h3 className="font-bold text-base text-white truncate">{item.name || item.username || item.first_name}</h3>
            {!isArtist && <p className="text-sm text-neutral-400 truncate">{artistName}</p>}
            {isArtist && <p className="text-sm text-neutral-400 uppercase tracking-wider text-xs font-semibold">Artist</p>}
          </div>
          
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

        {isArtist && (
          <button
            onClick={handleFollow}
            className={`mt-2 w-full py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              isFollowed 
                ? 'bg-transparent border border-neutral-500 text-white hover:border-white' 
                : 'bg-white text-black hover:scale-105 active:scale-95'
            }`}
          >
            {isFollowed ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TrackCard;
