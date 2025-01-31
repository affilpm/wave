import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconButton, Slider, Box, Typography, Avatar } from '@mui/material';
import { PlayArrow, Pause, SkipNext, SkipPrevious } from '@mui/icons-material';
import { 
  setIsPlaying, 
  setVolume, 
  nextTrack, 
  previousTrack } from '../../../../slices/user/playerSlice';

  

const MusicPlayer = () => {
  const dispatch = useDispatch();
  const { currentTrack, isPlaying, volume } = useSelector((state) => state.player);

  const handlePlayPause = () => {
    dispatch(setIsPlaying(!isPlaying));
  };

  const handleSkip = () => {
    dispatch(nextTrack());
  };

  const handlePrevious = () => {
    dispatch(previousTrack());
  };

  const handleVolumeChange = (event, newValue) => {
    dispatch(setVolume(newValue));
  };

  if (!currentTrack) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #121212, #1c1c1c)',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'white',
        borderTop: '1px solid #333',
        height: '80px',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.5)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Avatar
          src={currentTrack.cover}
          alt="Album Cover"
          sx={{
            width: 60,
            height: 60,
            borderRadius: '8px',
            marginRight: 2,
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'scale(1.1)',
            },
          }}
        />

        <Box>
          <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '14px' }}>
            {currentTrack.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'gray', fontSize: '12px' }}>
            {currentTrack.artist}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton
          onClick={handlePrevious}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          <SkipPrevious sx={{ fontSize: '30px' }} />
        </IconButton>

        <IconButton
          onClick={handlePlayPause}
          sx={{
            color: 'white',
            marginX: 2,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          {isPlaying ? <Pause sx={{ fontSize: '40px' }} /> : <PlayArrow sx={{ fontSize: '40px' }} />}
        </IconButton>

        <IconButton
          onClick={handleSkip}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          <SkipNext sx={{ fontSize: '30px' }} />
        </IconButton>
      </Box>

      <Box sx={{ width: 100, marginLeft: 2 }}>
        <Typography variant="caption" sx={{ color: 'gray' }}>
          Volume
        </Typography>
        <Slider
          value={volume}
          onChange={handleVolumeChange}
          sx={{
            color: 'white',
            '& .MuiSlider-thumb': {
              backgroundColor: '#1DB954',
            },
            '& .MuiSlider-track': {
              backgroundColor: '#1ED760',
            },
          }}
          aria-label="Volume"
          valueLabelDisplay="auto"
        />
      </Box>
    </Box>
  );
};

export default MusicPlayer;