import React from "react";
import { Play, Pause } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentTrack, setIsPlaying, setQueue } from "../../../../slices/user/playerSlice";

const MusicSection = ({ title, items }) => {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state) => state.player.currentTrack);
  const isPlaying = useSelector((state) => state.player.isPlaying);

  const handlePlay = (item, index) => {
    if (currentTrack?.id === item.id) {
      // If clicking the currently playing track, toggle play/pause
      dispatch(setIsPlaying(!isPlaying));
    } else {
      // If clicking a new track, start playing it
      dispatch(setCurrentTrack(item));
      dispatch(setQueue(items));
      dispatch(setIsPlaying(true));
    }
  };

  const isItemPlaying = (item) => {
    return currentTrack?.id === item.id && isPlaying;
  };

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/60 transition-all cursor-pointer group"
          >
            <div className="relative">
              <img
                src={item.cover_photo}
                alt={item.name}
                className="w-full aspect-square object-cover rounded-md shadow-lg mb-4"
              />
              <button
                className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                  isItemPlaying(item) ? 'flex' : 'hidden group-hover:flex'
                } shadow-xl hover:scale-105 transition-all`}
                onClick={() => handlePlay(item, index)}
              >
                {isItemPlaying(item) ? (
                  <Pause className="w-6 h-6 text-black" />
                ) : (
                  <Play className="w-6 h-6 text-black" />
                )}
              </button>
            </div>
            <h3 className="font-bold mb-1">{item.name}</h3>
            {item.owner && <p className="text-sm text-gray-400">{item.owner}</p>}
            {item.description && <p className="text-sm text-gray-400">{item.description}</p>}
            {item.artist && (
              <p className="text-sm text-gray-400">{item.artist}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default MusicSection;