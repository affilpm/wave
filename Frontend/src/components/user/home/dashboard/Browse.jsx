import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Search } from 'lucide-react';

const BrowsePage = () => {
  const categories = [
    { id: 1, title: "Podcasts", color: "bg-green-600", imageUrl: "/api/placeholder/150/150" },
    { id: 2, title: "Live Events", color: "bg-purple-600", imageUrl: "/api/placeholder/150/150" },
    { id: 3, title: "Made For You", color: "bg-blue-600", imageUrl: "/api/placeholder/150/150" },
    { id: 4, title: "New Releases", color: "bg-pink-600", imageUrl: "/api/placeholder/150/150" },
    { id: 5, title: "Hindi", color: "bg-orange-600", imageUrl: "/api/placeholder/150/150" },
    { id: 6, title: "Punjabi", color: "bg-yellow-600", imageUrl: "/api/placeholder/150/150" },
    { id: 7, title: "Tamil", color: "bg-red-600", imageUrl: "/api/placeholder/150/150" },
    { id: 8, title: "Telugu", color: "bg-indigo-600", imageUrl: "/api/placeholder/150/150" }
  ];

  const moods = [
    { id: 1, title: "Party", imageUrl: "/api/placeholder/200/200" },
    { id: 2, title: "Chill", imageUrl: "/api/placeholder/200/200" },
    { id: 3, title: "Focus", imageUrl: "/api/placeholder/200/200" },
    { id: 4, title: "Workout", imageUrl: "/api/placeholder/200/200" }
  ];

  const genres = [
    { id: 1, title: "Pop", imageUrl: "/api/placeholder/200/200" },
    { id: 2, title: "Rock", imageUrl: "/api/placeholder/200/200" },
    { id: 3, title: "Hip-Hop", imageUrl: "/api/placeholder/200/200" },
    { id: 4, title: "Electronic", imageUrl: "/api/placeholder/200/200" },
    { id: 5, title: "Jazz", imageUrl: "/api/placeholder/200/200" },
    { id: 6, title: "Classical", imageUrl: "/api/placeholder/200/200" }
  ];

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Search */}
        <div className="flex items-center mb-8">
          <h1 className="text-3xl font-bold flex-1">Browse</h1>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="What do you want to listen to?"
              className="w-full px-4 py-2 pl-10 bg-zinc-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={18} />
          </div>
        </div>

        {/* Browse All Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse All</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map(category => (
              <Card 
                key={category.id} 
                className={`${category.color} hover:brightness-110 transition-all duration-200 cursor-pointer overflow-hidden`}
              >
                <CardContent className="p-4 h-48 relative">
                  <h3 className="font-bold text-lg z-10 relative">{category.title}</h3>
                  <img 
                    src={category.imageUrl} 
                    alt={category.title}
                    className="absolute bottom-0 right-0 w-24 h-24 transform rotate-25 translate-x-4 translate-y-4"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Mood Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse by Mood</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {moods.map(mood => (
              <Card key={mood.id} className="bg-zinc-800 hover:bg-zinc-700 transition-colors duration-200">
                <CardContent className="p-4">
                  <div className="relative group">
                    <img 
                      src={mood.imageUrl} 
                      alt={mood.title}
                      className="w-full rounded-md mb-4"
                    />
                    <button className="absolute bottom-4 right-4 bg-green-500 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Play size={20} fill="white" />
                    </button>
                  </div>
                  <h3 className="font-bold">{mood.title}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Genres Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Popular Genres</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {genres.map(genre => (
              <Card key={genre.id} className="bg-zinc-800 hover:bg-zinc-700 transition-colors duration-200">
                <CardContent className="p-4">
                  <div className="relative group">
                    <img 
                      src={genre.imageUrl} 
                      alt={genre.title}
                      className="w-full aspect-square rounded-md mb-4"
                    />
                  </div>
                  <h3 className="font-bold text-sm text-center">{genre.title}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default BrowsePage;