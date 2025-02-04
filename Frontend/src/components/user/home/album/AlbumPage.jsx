import React, { useState, useEffect } from "react";
import { Play, Pause, Clock, Share2, Shuffle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../../api";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../utils/formatters";

const AlbumPage = () => {

      const [playlist, setPlaylist] = useState(null);
      const [album, setAlbum] = useState(null);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState(null);
      const [isPlaying, setIsPlaying] = useState(false);
      const [isShuffling, setIsShuffling] = useState(false);
      const [currentTrackId, setCurrentTrackId] = useState(null);
      // const { playlistId } = useParams();
      const { albumId } = useParams();

      const navigate = useNavigate();
    
      const [totalDuration, setTotalDuration] = useState("");
    
      useEffect(() => {
        const calculateTotalDuration = () => {
          if (playlist?.tracks?.length) {
            const totalSeconds = playlist.tracks.reduce((acc, track) => {
              const trackDuration = track.music_details?.duration || "00:00:00";
              return acc + convertToSeconds(trackDuration);
            }, 0);
            const combinedDuration = convertToHrMinFormat(totalSeconds);
            setTotalDuration(combinedDuration);
          }
        };
    
        calculateTotalDuration();
      }, [playlist]);
    
      const handlePlayTrack = (trackId) => {
        setCurrentTrackId(trackId);
        setIsPlaying(true);
      };
    
      useEffect(() => {
        const fetchPlaylist = async () => {
          try {
            const response = await api.get(`/api/album/album_data/${albumId}/`);
            setPlaylist(response.data);

          } catch (err) {
            setError("Failed to load playlist");
          } finally {
            setIsLoading(false);
          }
        };
    
        fetchPlaylist();
      }, [albumId]);
    
      if (isLoading) {
        return (
          <div className="p-6 space-y-4">
            <div className="h-48 w-48 bg-gray-700 animate-pulse rounded-lg"></div>
            <div className="h-12 w-64 bg-gray-700 animate-pulse rounded"></div>
            <div className="h-8 w-32 bg-gray-700 animate-pulse rounded"></div>
          </div>
        );
      }
    
      return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-end gap-6 p-6">
            <div className="w-48 h-48 flex-shrink-0">
              <img
                src={playlist.cover_photo || "/api/placeholder/192/192"}
                alt={playlist.name}
                className="w-full h-full object-cover rounded-lg shadow-2xl"
              />
            </div>
    
            <div className="flex flex-col gap-4">
              <span className="text-sm font-medium uppercase tracking-wider text-gray-400">
                Album
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                {playlist.name}
              </h1>
              <div className="flex items-center gap-4 text-gray-300">
                <span className="text-sm">
                  Created by{" "}
                  <span className="text-white">
                    {playlist.artist_username}
                  </span>{" "}
                  • {playlist.tracks?.length || 0} songs • {totalDuration}
                </span>
              </div>
            </div>
          </div>
    
          {/* Action Buttons */}
          <div className="flex items-center gap-4 p-6">
            <button
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-black" />
              ) : (
                <Play className="h-6 w-6 text-black ml-1" />
              )}
            </button>
    
            <button
              className={`p-2 text-gray-400 hover:text-white transition-colors ${
                isShuffling ? "text-green-500" : ""
              }`}
              onClick={() => setIsShuffling(!isShuffling)}
            >
              <Shuffle className="h-6 w-6" />
            </button>
    
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Share2 className="h-6 w-6" />
            </button>
          </div>
    
          {/* Track List */}
          <div className="flex-1 p-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="font-normal text-left py-3 w-12 pl-4">#</th>
                  <th className="font-normal text-left py-3 pl-3">Title</th>
                  <th className="font-normal text-left py-3 hidden md:table-cell pl-3">
                    Artist
                  </th>
                  <th className="font-normal text-left py-3 hidden md:table-cell pl-3">
                    Added
                  </th>
                  <th className="font-normal text-center py-3 w-20">
                    <Clock className="h-4 w-4 inline" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {playlist.tracks?.map((track) => (
                  <tr
                    key={track.id}
                    className={`group hover:bg-white/10 transition-colors ${
                      currentTrackId === track.id ? "bg-white/20" : ""
                    }`}
                  >
                    <td className="py-3 pl-4">
                      <div className="flex items-center justify-start w-6">
                        <span className="group-hover:hidden">
                          {currentTrackId === track.id ? "▶️" : track.track_number}
                        </span>
                        <button
                          className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
                          onClick={() => handlePlayTrack(track.id)}
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            track.music_details?.cover_photo ||
                            "/api/placeholder/40/40"
                          }
                          alt={track.music_details?.artist_username}
                          className="w-10 h-10 rounded-md"
                        />
                        <span className="font-medium">
                          {track.music_details?.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
                      {track.music_details?.artist_username}
                    </td>
                    <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
                      {track.music_details?.release_date}
                    </td>
                    <td className="py-3 text-center text-gray-400 w-20">
                      {formatDuration(track.music_details?.duration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };
    

export default AlbumPage;