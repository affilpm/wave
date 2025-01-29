import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, X, Music } from 'lucide-react';

const GenreDropdown = ({ 
  genres = [], 
  selectedGenres = [], 
  onGenreSelect,
  onGenreRemove,
  isEditMode = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setFocusedIndex(-1);
    } else if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex];
      if (focusedElement) {
        focusedElement.scrollIntoView({ 
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [focusedIndex]);

  const getFilteredGenres = () => {
    return genres
      .filter(genre => 
        !selectedGenres.includes(genre.id) &&
        genre.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleKeyDown = (e) => {
    const filteredGenres = getFilteredGenres();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredGenres.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredGenres.length) {
          handleGenreSelect(filteredGenres[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        if (!e.shiftKey && focusedIndex === filteredGenres.length - 1) {
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  const handleGenreSelect = (genre) => {
    onGenreSelect(genre.id);
    setSearchQuery('');
    setFocusedIndex(-1);
    searchInputRef.current?.focus();
  };

  const getSelectedGenreNames = () => {
    return selectedGenres.map(id => {
      const genre = genres.find(g => g.id === id);
      return genre ? genre.name : '';
    });
  };

  const filteredGenres = getFilteredGenres();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger with Scrollable Tags */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-600 rounded-lg bg-gray-700 text-white text-left hover:bg-gray-600 transition-colors"
      >
        <div className="p-3 flex items-center justify-between border-b border-gray-600">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-gray-400" />
            <span className="text-gray-300">
              {selectedGenres.length === 0 ? 'Select genres...' : `${selectedGenres.length} genre's selected`}
            </span>
          </div>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        
        {selectedGenres.length > 0 && (
          <div className="max-h-24 overflow-y-auto scrollbar-default p-2">
            <div className="flex flex-wrap gap-2">
              {getSelectedGenreNames().map((name, index) => (
                <span
                  key={selectedGenres[index]}
                  className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 group"
                >
                  <Music className="h-3 w-3" />
                  {name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenreRemove(selectedGenres[index]);
                    }}
                    className="hover:text-red-200 transition-colors"
                    aria-label={`Remove ${name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col animate-fade-in">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search genres..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Genres List */}
          <div 
            className="overflow-y-auto "
            ref={listRef}
          >
            {filteredGenres.length > 0 ? (
              filteredGenres.map((genre, index) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => handleGenreSelect(genre)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center justify-between transition-colors ${
                    focusedIndex === index ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-gray-400" />
                    {genre.name}
                  </div>
                  <span className="text-xs text-gray-400">Click to add</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-gray-400 text-center">
                {searchQuery ? 'No matching genres found' : 'No available genres'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreDropdown;