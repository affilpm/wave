import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // Import useLocation for accessing passed data
import api from "../../../../api"; // Assuming the api.js file is correctly set up

const ShowMorePage = () => {
  const location = useLocation();
  const { title } = location.state || {}; // Retrieve passed data (just title in this case)

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch music data inside useEffect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const musiclistResponse = await api.get("/api/home/musiclist/?all_songs"); // Adjust the endpoint if needed
        setItems(musiclistResponse.data); // Set the fetched music data
      } catch (error) {
        console.error("Error fetching music data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures it runs only once when the component mounts

  if (loading) {
    return <div>Loading...</div>; // Show loading state while data is being fetched
  }

  return (
    <div className="flex-1 p-2 ">
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
              </div>
              <h3 className="font-bold mb-1">{item.name}</h3>
              {item.owner && <p className="text-sm text-gray-400">{item.owner}</p>}
              {item.description && <p className="text-sm text-gray-400">{item.description}</p>}
              {item.artist && <p className="text-sm text-gray-400">{item.artist}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
    </div>

  );
};

export default ShowMorePage;