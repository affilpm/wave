import React from 'react';
import { IconButton, Slider, Box, Typography, Avatar } from '@mui/material';
import { PlayArrow, Pause, SkipNext, SkipPrevious } from '@mui/icons-material';

const MusicPlayer = ({ isPlaying, handlePlayPause, handleSkip, handlePrevious, albumCover, songTitle, artistName }) => {
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
      {/* Left Section: Album Cover and Song Info */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Avatar
          src={albumCover}
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
            {songTitle}
          </Typography>
          <Typography variant="body2" sx={{ color: 'gray', fontSize: '12px' }}>
            {artistName}
          </Typography>
        </Box>
      </Box>

      {/* Center Section: Control Buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {/* Previous Button */}
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

        {/* Play/Pause Button */}
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

        {/* Skip Button */}
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

      {/* Right Section: Volume Slider */}
      <Box sx={{ width: 100, marginLeft: 2 }}>
        <Typography variant="caption" sx={{ color: 'gray' }}>
          Volume
        </Typography>
        <Slider
          sx={{
            color: 'white',
            '& .MuiSlider-thumb': {
              backgroundColor: '#1DB954',
            },
            '& .MuiSlider-track': {
              backgroundColor: '#1ED760',
            },
          }}
          defaultValue={50}
          aria-label="Volume"
          valueLabelDisplay="auto"
        />
      </Box>
    </Box>
  );
};

export default MusicPlayer;