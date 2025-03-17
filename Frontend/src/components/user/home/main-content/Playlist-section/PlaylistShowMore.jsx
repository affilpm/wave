import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Play, Pause } from "lucide-react";
import api from "../../../../../api";
import { 
  setMusicId,
  setIsPlaying,
  setQueue,
  clearQueue,
  setCurrentPlaylistId
} from "../../../../../slices/user/musicPlayerSlice";

const PlaylistShowMorePage = () => {
  const location = useLocation();
  const { title } = location.state || {};
  const dispatch = useDispatch();
  const { musicId, isPlaying, currentPlaylistId } = useSelector((state) => state.musicPlayer);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const musiclistResponse = await api.get(`/api/home/playlist/?all_songs&page=${page}`);
        setItems(musiclistResponse.data.results);
        setHasNextPage(!!musiclistResponse.data.next);
        setTotalPages(Math.ceil(musiclistResponse.data.count / musiclistResponse.data.page_size)); // Assuming count and page_size are provided in the response
      } catch (error) {
        console.error("Error fetching music data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  const prepareTrackForPlayer = (track) => ({
    id: track.id,
    name: track.name,
    artist: track.artist,
    artist_full: track.artist_full,
    cover_photo: track.cover_photo,
    audio_file: track.audio_file,
    duration: track.duration
  });

  const handlePlay = async (item, e) => {
    e.stopPropagation();
    
    const formattedTrack = prepareTrackForPlayer(item);
    const pageId = `show-more-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    if (musicId === formattedTrack.id) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    dispatch(clearQueue());
    dispatch(setQueue({
      tracks: [formattedTrack],
      playlistId: pageId
    }));
    
    dispatch(setCurrentPlaylistId(pageId));
    dispatch(setMusicId(formattedTrack.id));
    dispatch(setIsPlaying(true));
  };

  const isItemPlaying = (item) => musicId === item.id && isPlaying;

  const handleNextPage = () => setPage((prev) => prev + 1);
  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 p-2">
      <section className="mb-8 relative">
        <h2 className="text-2xl p-2 font-bold mb-4">{title}</h2>
        <div className="overflow-x-auto scrollbar-hidden">
          <div className="flex flex-wrap gap-6">
            {items.map((item, index) => (
              <div
                key={index}
                className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/60 transition-all cursor-pointer group flex-none w-40"
              >
                <div className="relative">
                  <img
                    src={item.cover_photo}
                    alt={item.name}
                    className="w-full aspect-square object-cover rounded-md shadow-lg mb-4"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                    <button
                      className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                        isItemPlaying(item) ? 'flex' : 'hidden group-hover:flex'
                      } shadow-xl hover:scale-105 transition-all`}
                      onClick={(e) => handlePlay(item, e)}
                      aria-label={isItemPlaying(item) ? "Pause" : "Play"}
                    >
                      {isItemPlaying(item) ? (
                        <Pause className="w-6 h-6 text-black" />
                      ) : (
                        <Play className="w-6 h-6 text-black" />
                      )}
                    </button>
                  </div>
                </div>
                <h3 className="font-bold mb-1 truncate">{item.name}</h3>
                {item.artist && (
                  <p className="text-sm text-gray-400 truncate">{item.artist}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between mt-4 items-center">
          <button 
            className="bg-gray-700 text-white py-1 px-3 rounded disabled:opacity-50" 
            onClick={handlePrevPage} 
            disabled={page === 1}
          >
            Previous
          </button>
          {/* <span className="text-white">
            Page {page} of {totalPages}
          </span> */}
          <button 
            className="bg-gray-700 text-white py-1 px-3 rounded disabled:opacity-50" 
            onClick={handleNextPage} 
            disabled={!hasNextPage}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
};

export default PlaylistShowMorePage;