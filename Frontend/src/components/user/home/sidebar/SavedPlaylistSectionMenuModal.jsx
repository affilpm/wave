import React from "react";
import { Delete } from "lucide-react";

const SavedPlaylistSectionMenuModal = ({
  playlist,
  onClose,
  onAction,
}) => {
  return (
    <div className="absolute right-0 top-12 w-48 bg-gray-800 rounded-md shadow-lg z-50">
      <div className="py-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction("delete", playlist);
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
        >
          <Delete className="h-4 w-4 mr-3" />
          Remove from library
        </button>
      </div>
    </div>
  );
};

export default SavedPlaylistSectionMenuModal;