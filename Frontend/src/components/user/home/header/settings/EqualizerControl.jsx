import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setPreset,
  updateBand,
  setEqualizerEnabled,
  resetEqualizer,
  setLoading,
  setError,
  selectEqualizerState,
} from '../../../../../slices/user/equalizerSlice';
import api from '../../../../../api';

/* ───────── frequency band definitions ───────── */
const FREQUENCY_BANDS = [
  { key: 'band_31', label: '31', fullLabel: '31 Hz', freq: 31 },
  { key: 'band_62', label: '62', fullLabel: '62 Hz', freq: 62 },
  { key: 'band_125', label: '125', fullLabel: '125 Hz', freq: 125 },
  { key: 'band_250', label: '250', fullLabel: '250 Hz', freq: 250 },
  { key: 'band_500', label: '500', fullLabel: '500 Hz', freq: 500 },
  { key: 'band_1k', label: '1K', fullLabel: '1 kHz', freq: 1000 },
  { key: 'band_2k', label: '2K', fullLabel: '2 kHz', freq: 2000 },
  { key: 'band_4k', label: '4K', fullLabel: '4 kHz', freq: 4000 },
  { key: 'band_8k', label: '8K', fullLabel: '8 kHz', freq: 8000 },
  { key: 'band_16k', label: '16K', fullLabel: '16 kHz', freq: 16000 },
];

const MIN_DB = -12;
const MAX_DB = 12;

/* ───────── built-in presets (same as backend) ───────── */
const BUILT_IN_PRESETS = [
  {
    name: 'Flat',
    description: 'No equalization',
    values: { band_31: 0, band_62: 0, band_125: 0, band_250: 0, band_500: 0, band_1k: 0, band_2k: 0, band_4k: 0, band_8k: 0, band_16k: 0 },
  },
  {
    name: 'Pop',
    description: 'Enhanced vocals and mid-highs',
    values: { band_31: -1.5, band_62: -1, band_125: 0, band_250: 2, band_500: 3, band_1k: 3, band_2k: 2, band_4k: 1, band_8k: 1.5, band_16k: 1 },
  },
  {
    name: 'Rock',
    description: 'Boosted lows and highs',
    values: { band_31: 3, band_62: 2, band_125: 1, band_250: 0, band_500: -0.5, band_1k: 0, band_2k: 1, band_4k: 2, band_8k: 3, band_16k: 3 },
  },
  {
    name: 'Jazz',
    description: 'Warm mids and clear highs',
    values: { band_31: 2, band_62: 1, band_125: 0, band_250: -0.5, band_500: 0, band_1k: 1, band_2k: 2, band_4k: 1, band_8k: 1, band_16k: 2 },
  },
  {
    name: 'Classical',
    description: 'Natural sound',
    values: { band_31: 2, band_62: 2, band_125: 1, band_250: 0, band_500: 0, band_1k: 0, band_2k: 0, band_4k: 1, band_8k: 1.5, band_16k: 2 },
  },
  {
    name: 'Bass Boost',
    description: 'Extra low-end punch',
    values: { band_31: 5, band_62: 4, band_125: 3, band_250: 2, band_500: 1, band_1k: 0, band_2k: 0, band_4k: 0, band_8k: 0, band_16k: 0 },
  },
  {
    name: 'Treble Boost',
    description: 'Bright and airy',
    values: { band_31: 0, band_62: 0, band_125: 0, band_250: 0, band_500: 0, band_1k: 1, band_2k: 2, band_4k: 3, band_8k: 4, band_16k: 5 },
  },
  {
    name: 'Electronic',
    description: 'Deep bass and crisp highs',
    values: { band_31: 4, band_62: 3.5, band_125: 1, band_250: 0, band_500: -1, band_1k: 1, band_2k: 0, band_4k: 1.5, band_8k: 3.5, band_16k: 4 },
  },
  {
    name: 'Vocal',
    description: 'Clear and present vocals',
    values: { band_31: -2, band_62: -1, band_125: 0, band_250: 2, band_500: 4, band_1k: 4, band_2k: 3, band_4k: 1, band_8k: 0, band_16k: -1 },
  },
  {
    name: 'R&B',
    description: 'Warm bass with smooth mids',
    values: { band_31: 3, band_62: 4, band_125: 3, band_250: 1, band_500: -1, band_1k: 0, band_2k: 1, band_4k: 1.5, band_8k: 2, band_16k: 2.5 },
  },
];

/* ─────────────── Frequency Curve Canvas ─────────────── */
const FrequencyCurve = ({ bands, isEnabled }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Size canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw subtle horizontal grid lines
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = (h / steps) * i;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Centre line (0 dB)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Build curve points
    const values = FREQUENCY_BANDS.map((b) => bands[b.key] || 0);
    const points = values.map((val, i) => ({
      x: (i / (values.length - 1)) * w,
      y: h / 2 - (val / MAX_DB) * (h / 2) * 0.85,
    }));

    // Smooth Catmull-Rom → Bezier curve
    const drawSmoothCurve = (pts) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    };

    // Fill gradient under curve
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    if (isEnabled) {
      gradient.addColorStop(0, 'rgba(29, 185, 84, 0.25)');
      gradient.addColorStop(0.5, 'rgba(30, 215, 96, 0.15)');
      gradient.addColorStop(1, 'rgba(29, 185, 84, 0.25)');
    } else {
      gradient.addColorStop(0, 'rgba(150, 150, 150, 0.1)');
      gradient.addColorStop(1, 'rgba(150, 150, 150, 0.1)');
    }

    drawSmoothCurve(points);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke curve line
    drawSmoothCurve(points);
    const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
    if (isEnabled) {
      lineGrad.addColorStop(0, '#1db954');
      lineGrad.addColorStop(0.5, '#1ed760');
      lineGrad.addColorStop(1, '#1db954');
    } else {
      lineGrad.addColorStop(0, '#666');
      lineGrad.addColorStop(1, '#666');
    }
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw dots at each frequency point
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = isEnabled ? '#1ed760' : '#888';
      ctx.fill();
    });
  }, [bands, isEnabled]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '120px', display: 'block' }}
    />
  );
};

/* ─────────────── Vertical Slider ─────────────── */
const VerticalSlider = ({ value, onChange, label, isEnabled }) => {
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const dbToPercent = (db) => ((db - MIN_DB) / (MAX_DB - MIN_DB)) * 100;
  const percentToDb = (pct) => MIN_DB + (pct / 100) * (MAX_DB - MIN_DB);

  const handleInteraction = useCallback((clientY) => {
    if (!sliderRef.current || !isEnabled) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((rect.bottom - clientY) / rect.height) * 100));
    const db = Math.round(percentToDb(pct) * 2) / 2; // round to 0.5
    onChange(db);
  }, [isEnabled, onChange]);

  const onMouseDown = (e) => {
    setIsDragging(true);
    handleInteraction(e.clientY);
  };

  const onTouchStart = (e) => {
    setIsDragging(true);
    handleInteraction(e.touches[0].clientY);
  };

  useEffect(() => {
    const onMouseMove = (e) => isDragging && handleInteraction(e.clientY);
    const onTouchMove = (e) => isDragging && handleInteraction(e.touches[0].clientY);
    const onEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, handleInteraction]);

  const fillPercent = dbToPercent(value);
  const thumbY = 100 - fillPercent;

  return (
    <div className="eq-slider-column">
      <span className={`eq-db-label ${!isEnabled ? 'disabled' : ''}`}>
        {value > 0 ? `+${value}` : value}
      </span>
      <div
        className={`eq-slider-track ${!isEnabled ? 'disabled' : ''}`}
        ref={sliderRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Fill bar from center */}
        <div
          className="eq-slider-fill"
          style={{
            bottom: value >= 0 ? '50%' : `${fillPercent}%`,
            height: `${Math.abs(value / MAX_DB) * 50}%`,
          }}
        />
        {/* Center line */}
        <div className="eq-slider-center" />
        {/* Thumb */}
        <div
          className={`eq-slider-thumb ${isDragging ? 'active' : ''}`}
          style={{ bottom: `calc(${fillPercent}% - 8px)` }}
        />
      </div>
      <span className={`eq-freq-label ${!isEnabled ? 'disabled' : ''}`}>{label}</span>
    </div>
  );
};

/* ─────────────── Main Equalizer Component ─────────────── */
const EqualizerControl = () => {
  const dispatch = useDispatch();
  const { preset, presetId, presetName, isEnabled, isLoading, error } = useSelector(selectEqualizerState);
  const [backendPresets, setBackendPresets] = useState([]);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Merge built-in + backend presets
  const allPresets = [...BUILT_IN_PRESETS, ...backendPresets.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    values: {
      band_31: p.band_31, band_62: p.band_62, band_125: p.band_125,
      band_250: p.band_250, band_500: p.band_500, band_1k: p.band_1k,
      band_2k: p.band_2k, band_4k: p.band_4k, band_8k: p.band_8k,
      band_16k: p.band_16k,
    },
  }))];

  // Fetch backend presets & user's saved preset
  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch(setLoading(true));
        const [presetsResponse, userPresetResponse] = await Promise.all([
          api.get('/api/v1/music/presets/'),
          api.get('/api/v1/music/user-preset/'),
        ]);

        setBackendPresets(presetsResponse.data);

        // Restore user's saved preset from backend
        const userPresetId = userPresetResponse.data.preset_id;
        const userPreset = presetsResponse.data.find((p) => p.id === userPresetId);
        if (userPreset) {
          dispatch(
            setPreset({
              preset: {
                band_31: userPreset.band_31, band_62: userPreset.band_62,
                band_125: userPreset.band_125, band_250: userPreset.band_250,
                band_500: userPreset.band_500, band_1k: userPreset.band_1k,
                band_2k: userPreset.band_2k, band_4k: userPreset.band_4k,
                band_8k: userPreset.band_8k, band_16k: userPreset.band_16k,
              },
              presetId: userPreset.id,
              presetName: userPreset.name,
            })
          );
        }
      } catch (err) {
        console.error('Failed to fetch equalizer data:', err);
      } finally {
        dispatch(setLoading(false));
      }
    };
    fetchData();
  }, [dispatch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowPresetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handlePresetSelect = (p) => {
    dispatch(
      setPreset({
        preset: { ...p.values },
        presetId: p.id || null,
        presetName: p.name,
      })
    );
    setShowPresetDropdown(false);

    // Save to backend if it has an id
    if (p.id) {
      api.post('/api/v1/music/user-preset/', { preset_id: p.id }).catch(console.error);
    }
  };

  const handleBandChange = (key, value) => {
    dispatch(updateBand({ band: key, value }));
  };

  const handleToggle = () => {
    dispatch(setEqualizerEnabled(!isEnabled));
  };

  const handleReset = () => {
    dispatch(resetEqualizer());
  };

  if (isLoading) {
    return (
      <div className="eq-loading">
        <div className="eq-spinner" />
        <span>Loading equalizer…</span>
      </div>
    );
  }

  return (
    <div className="eq-container">
      {/* Header row */}
      <div className="eq-header">
        <div className="eq-title-row">
          <h3 className="eq-title">Equalizer</h3>
          <label className="eq-toggle">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggle}
            />
            <span className="eq-toggle-slider" />
          </label>
        </div>
        <p className="eq-subtitle">
          {isEnabled
            ? 'Adjust frequency bands to customize your sound'
            : 'Equalizer is disabled'}
        </p>
      </div>

      {/* Preset selector */}
      <div className="eq-preset-row" ref={dropdownRef}>
        <button
          className={`eq-preset-btn ${!isEnabled ? 'disabled' : ''}`}
          onClick={() => isEnabled && setShowPresetDropdown(!showPresetDropdown)}
          disabled={!isEnabled}
        >
          <span className="eq-preset-label">Preset</span>
          <span className="eq-preset-name">{presetName || 'Flat'}</span>
          <svg
            className={`eq-chevron ${showPresetDropdown ? 'open' : ''}`}
            viewBox="0 0 24 24" width="16" height="16" fill="none"
            stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showPresetDropdown && (
          <div className="eq-preset-dropdown">
            {allPresets.map((p, idx) => (
              <button
                key={p.id || `builtin-${idx}`}
                className={`eq-preset-option ${presetName === p.name ? 'active' : ''}`}
                onClick={() => handlePresetSelect(p)}
              >
                <span className="eq-preset-option-name">{p.name}</span>
                <span className="eq-preset-option-desc">{p.description}</span>
                {presetName === p.name && (
                  <svg className="eq-check" viewBox="0 0 24 24" width="16" height="16"
                    fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
            <div className="eq-preset-divider" />
            <button className="eq-preset-option reset" onClick={handleReset}>
              <span className="eq-preset-option-name">Reset to Flat</span>
              <svg viewBox="0 0 24 24" width="16" height="16"
                fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Frequency curve visualization */}
      <div className="eq-curve-container">
        <FrequencyCurve bands={preset} isEnabled={isEnabled} />
      </div>

      {/* Vertical sliders */}
      <div className="eq-sliders-row">
        {FREQUENCY_BANDS.map((band) => (
          <VerticalSlider
            key={band.key}
            value={preset[band.key] || 0}
            onChange={(val) => handleBandChange(band.key, val)}
            label={band.label}
            isEnabled={isEnabled}
          />
        ))}
      </div>

      {/* dB scale labels */}
      <div className="eq-db-scale">
        <span>+12 dB</span>
        <span>0 dB</span>
        <span>−12 dB</span>
      </div>

      {/* Error display */}
      {error && (
        <div className="eq-error">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
            stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};

export default EqualizerControl;