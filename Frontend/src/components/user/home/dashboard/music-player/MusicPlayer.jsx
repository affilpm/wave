import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, Volume1, VolumeX,
  Shuffle, Repeat, List, X, Music2, Cast, Smartphone, Laptop, Headphones
} from 'lucide-react';
import { 
  setIsPlaying,
  setVolume,
  nextTrack,
  previousTrack,
  setCurrentTrack,
  setQueue,
  setRepeatMode,
  setUserHasInteracted
} from '../../../../../slices/user/playerSlice';

import MediaSessionControl from './MediaSessionControl';




const MusicPlayer = () => {
  const dispatch = useDispatch();
  const { currentTrack, isPlaying, volume, queue, repeatMode, userHasInteracted} = useSelector((state) => state.player);
  
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // const [repeatMode, setRepeatMode] = useState('off');
  const [selectedDevice, setSelectedDevice] = useState(null);

  const audioRef = useRef(null);
  // const [userHasInteracted, setUserHasInteracted] = useState(false);

  const devices = [
    { 
      id: 'laptop', 
      name: 'Laptop', 
      icon: <Laptop size={20} />,
      connected: true 
    },
    { 
      id: 'smartphone', 
      name: 'iPhone', 
      icon: <Smartphone size={20} />,
      connected: false 
    },
    { 
      id: 'living-room', 
      name: 'Living Room Speaker', 
      icon: <Cast size={20} />,
      connected: false 
    }
  ];

  const handleDeviceSelect = (device) => {
    if (device.connected) {
      setSelectedDevice(device);
      setIsDeviceMenuOpen(false);
    }
  };



  useEffect(() => {
    if (currentTrack?.audio_file) {
      const shouldPlayImmediately = isPlaying && userHasInteracted;
      
      // Only set the source if it's different from the current source
      if (audioRef.current.src !== currentTrack.audio_file) {
        audioRef.current.src = currentTrack.audio_file;
        
        if (shouldPlayImmediately) {
          audioRef.current.play().catch(error => {
            console.warn('Playback failed:', error);
            dispatch(setIsPlaying(false));
          });
        }
      }
    }
  }, [currentTrack, dispatch, isPlaying, userHasInteracted]);




  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);


  

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (isPlaying && userHasInteracted) {
        audioRef.current.play().catch(error => {
          console.warn('Playback failed:', error);
          dispatch(setIsPlaying(false));
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, userHasInteracted, currentTrack, dispatch]);


  const handlePlayPause = () => {
    dispatch(setIsPlaying(!isPlaying));
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    audioRef.current.currentTime = time;
  };

  const handleVolumeChange = (e) => {
    dispatch(setVolume(Number(e.target.value)));
  };

  const handleTrackSelect = (track) => {
    dispatch(setCurrentTrack(track));
    dispatch(setIsPlaying(true));
    setIsPlaylistOpen(false);
  };

  const handleTrackEnd = () => {
    if (!audioRef.current) return;

    if (repeatMode === 'single') {
      audioRef.current.currentTime = 0;
      if (userHasInteracted) {
        audioRef.current.play().catch(error => {
          console.warn('Playback failed:', error);
          dispatch(setIsPlaying(false));
        });
      }
        return;
    } 
    
    const isLastTrack = queue.length - 1 === queue.indexOf(currentTrack);

    if (isLastTrack) {
      if (repeatMode === 'all') {
        dispatch(setCurrentTrack(queue[0]));
        dispatch(setIsPlaying(true));
      }else {
        
        dispatch(setIsPlaying(false));
        audioRef.current.currentTime = 0;
      }
    } else {
      dispatch(nextTrack());
      // dispatch(setIsPlaying(true))
    }
  };

  const toggleRepeatMode = () => {
    const modes = ['off', 'all', 'single'];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    dispatch(setRepeatMode(modes[nextIndex]));
  };


  const formatTime = (time) => {
    if (!time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX size={20} />;
    if (volume < 50) return <Volume1 size={20} />;
    return <Volume2 size={20} />;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 backdrop-blur-lg bg-black/30 border-t border-white/10 relative">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleTrackEnd}
      />

<MediaSessionControl currentTrack={currentTrack} audioRef={audioRef}/>

      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between p-3 relative">
          {/* Track Info */}
          <div className="flex items-center space-x-4 w-1/4">
            {currentTrack ? (
              <>
                <div className="relative group">
                  {currentTrack.cover_photo ? (
                    <img
                      src={currentTrack.cover_photo}
                      alt={currentTrack.name}
                      className="w-14 h-14 rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
                      <Music2 size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-medium text-sm text-white hover:underline cursor-pointer">
                    {currentTrack.name}
                  </h3>
                  <p className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
                    {currentTrack.artist}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2 text-gray-400">
                <Music2 size={24} />
                <span className="text-sm">No track selected</span>
              </div>
            )}
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center flex-1 max-w-2xl px-4">
            <div className="flex items-center space-x-6 mb-3">
              <button className="text-gray-400 hover:text-white transition-colors">
                <Shuffle size={20} />
              </button>
              
              <button
                onClick={() => dispatch(previousTrack())}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipBack size={20} />
              </button>
              
              <button
                onClick={handlePlayPause}
                className="bg-white rounded-full p-2 hover:scale-105 transition-all hover:bg-green-400"
              >
                {isPlaying ? (
                  <Pause size={24} className="text-black" />
                ) : (
                  <Play size={24} className="text-black" />
                )}
              </button>

              <button
                onClick={() => dispatch(nextTrack())}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward size={20} />
              </button>

              <button
                onClick={toggleRepeatMode}
                className={`text-gray-400 hover:text-white transition-colors 
                  ${repeatMode !== 'off' ? 'text-green-500' : ''}`}
              >
                <Repeat size={20} />
                {repeatMode === 'single' && (
                  <span className="absolute text-[10px] bottom-0 right-0 text-green-500">1</span>
                )}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full flex items-center space-x-3 text-xs">
              <span className="text-gray-400">{formatTime(currentTime)}</span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-400"
                />
              </div>
              <span className="text-gray-400">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume and Additional Controls */}
          <div className="flex items-center justify-end space-x-4 w-1/4">
            <div className="group relative flex items-center">
              <button className="text-gray-400 group-hover:text-white transition-colors">
                {getVolumeIcon()}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover:w-20 origin-right transition-all duration-200 h-1 mx-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-400"
              />
            </div>
            <button 
              onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
              className={`text-gray-400 hover:text-white transition-colors 
                ${selectedDevice ? 'text-green-500' : ''}`}
            >
              <Cast size={20} />
            </button>
            <button
              onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Device Menu */}
        {isDeviceMenuOpen && (
          <div className="absolute bottom-full right-4 w-64 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Connect to a device</h3>
            {devices.map((device) => (
              <div
                key={device.id}
                onClick={() => handleDeviceSelect(device)}
                className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all
                  ${selectedDevice?.id === device.id 
                    ? 'bg-green-500/20' 
                    : 'hover:bg-white/5'
                  } 
                  ${device.connected ? '' : 'opacity-50 cursor-not-allowed'}`}
              >
                {device.icon}
                <span className="text-sm">{device.name}</span>
                {selectedDevice?.id === device.id && (
                  <span className="ml-auto text-green-500 text-xs">Connected</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Queue Panel */}
        {isPlaylistOpen && (
          <div className="absolute bottom-full right-0 w-96 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-t-xl p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Queue</h2>
              <button 
                onClick={() => setIsPlaylistOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-2">
              {queue.map((track, index) => (
                <div
                  key={index}
                  onClick={() => handleTrackSelect(track)}
                  className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all
                    ${currentTrack?.id === track.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  {track.cover_photo ? (
                    <img
                      src={track.cover_photo}
                      alt={track.name}
                      className="w-10 h-10 rounded-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <Music2 size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{track.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                  </div>
                  {currentTrack?.id === track.id && isPlaying && (
                    <div className="flex-shrink-0">
                      <span className="bg-green-500 rounded-full p-1">
                        <Play size={16} className="text-white" />
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPlayer;