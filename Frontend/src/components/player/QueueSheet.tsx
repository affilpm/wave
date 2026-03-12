import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { PlayerState, Track } from '../../types/player';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface QueueSheetProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentTrackId: string | number | undefined;
  isPlaying: boolean;
  onReorder: (newQueue: Track[]) => void;
  onRemove: (id: string | number) => void;
  onPlayTrack: (index: number) => void;
}

const SortableTrackItem: React.FC<{
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onRemove: (id: string | number) => void;
  onPlay: () => void;
}> = ({ track, index, isCurrent, isPlaying, onRemove, onPlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const controls = useAnimation();
  const [isSwiping, setIsSwiping] = useState(false);

  const handleDragEnd = (event: any, info: any) => {
    setIsSwiping(false);
    const x = info.offset.x;
    if (x < -80) {
      onRemove(track.id);
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-full h-[60px] ${isDragging ? 'opacity-95' : 'opacity-100'}`}
    >
      {/* Background for Delete */}
      <div className="absolute inset-0 bg-red-500 rounded flex items-center justify-end px-6 z-0">
        <span className="text-white font-medium text-sm">Remove</span>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragStart={() => setIsSwiping(true)}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative z-10 w-full h-full flex items-center px-4 ${
          isCurrent ? 'bg-white/5 border-l-2 border-[var(--player-accent)]' : 'bg-[#121212]'
        } ${isDragging ? 'shadow-lg scale-[1.02]' : ''}`}
      >
        <div 
          className="flex-1 flex items-center space-x-3 cursor-pointer overflow-hidden h-full"
          onClick={() => { if (!isSwiping) onPlay(); }}
        >
          <div className="relative w-11 h-11 shrink-0">
            <img 
              src={track.artworkUrl || track.cover_photo || ''} 
              alt="" 
              className="w-full h-full object-cover rounded-md"
            />
            {isCurrent && (
              <div className="absolute inset-0 bg-black/40 rounded-md flex items-center justify-center space-x-[2px]">
                <div className={`w-[2px] bg-[var(--player-accent)] rounded-full ${isPlaying ? 'animate-[eq_0.8s_ease-in-out_infinite_alternate]' : 'h-[6px]'}`} style={{ height: isPlaying ? '3px' : '6px' }} />
                <div className={`w-[2px] bg-[var(--player-accent)] rounded-full ${isPlaying ? 'animate-[eq_0.8s_ease-in-out_infinite_alternate-reverse]' : 'h-[10px]'}`} style={{ height: isPlaying ? '6px' : '10px' }} />
                <div className={`w-[2px] bg-[var(--player-accent)] rounded-full ${isPlaying ? 'animate-[eq_0.8s_ease-in-out_infinite_alternate]' : 'h-[4px]'}`} style={{ height: isPlaying ? '12px' : '4px' }} style-delay="0.2s" />
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden pr-2">
            <span className={`text-[14px] truncate ${isCurrent ? 'text-[var(--player-accent)]' : 'text-white'}`}>
              {track.name || track.title || 'Unknown Track'}
            </span>
            <span className="text-[12px] text-white/50 truncate">
              {track.artist || 'Unknown Artist'}
            </span>
          </div>
        </div>

        <div className="shrink-0 pl-2 touch-none text-white/30 hover:text-white/60 transition" {...attributes} {...listeners}>
          <GripVertical size={20} />
        </div>
        
        {/* Divider */}
        <div className="absolute bottom-0 left-16 right-0 h-[0.5px] bg-white/5" />
      </motion.div>

      <style>{`
        @keyframes eq {
          0% { height: 3px; }
          100% { height: 14px; }
        }
      `}</style>
    </div>
  );
};

export const QueueSheet: React.FC<QueueSheetProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrackId,
  isPlaying,
  onReorder,
  onRemove,
  onPlayTrack
}) => {
  const userQueue = useSelector((state: { player: PlayerState }) => state.player.userQueue);
  const queueIndex = useSelector((state: { player: PlayerState }) => state.player.queueIndex);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeId, setActiveId] = useState<string | number | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex(t => t.id === active.id);
      const newIndex = queue.findIndex(t => t.id === over.id);
      onReorder(arrayMove(queue, oldIndex, newIndex));
    }
  };

  // Derive sections
  const currentTrack = queue[queueIndex];
  const nextInQueue = [];
  const nextFromContext = [];
  
  const remainingTracks = queue.slice(queueIndex + 1);
  let foundContext = false;
  
  for (const track of remainingTracks) {
    if (!foundContext && userQueue.some((ut: Track) => ut.id === track.id)) {
      nextInQueue.push(track);
    } else {
      foundContext = true;
      nextFromContext.push(track);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 40 }}
          className="fixed inset-0 z-[70] flex flex-col"
          style={{
            background: 'rgba(18,18,18,0.98)',
            backdropFilter: 'blur(25px)'
          }}
        >
          <div className="w-full flex justify-center py-4 cursor-pointer shrink-0" onClick={onClose}>
            <div className="w-10 h-1.5 rounded-full bg-white/10" />
          </div>

          <div className="px-6 pb-6 pt-2 shrink-0">
            <h2 className="text-[22px] font-bold text-white tracking-tight">Queue</h2>
          </div>

          <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Now Playing Section */}
              {currentTrack && (
                <div className="mb-8">
                  <div className="px-6 mb-3">
                    <h3 className="text-[13px] font-bold text-white/40 uppercase tracking-widest">Now Playing</h3>
                  </div>
                  <SortableTrackItem
                    track={currentTrack}
                    index={queueIndex}
                    isCurrent={true}
                    isPlaying={isPlaying}
                    onRemove={onRemove}
                    onPlay={() => {}}
                  />
                </div>
              )}

              {/* Next In Queue Section (User Added) */}
              {nextInQueue.length > 0 && (
                <div className="mb-8">
                  <div className="px-6 mb-3 flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-white/40 uppercase tracking-widest">Next Up</h3>
                    <button 
                      onClick={() => {/* could add a clear user queue action here */}}
                      className="text-[12px] font-medium text-[var(--player-accent)] hover:opacity-80"
                    >
                      Clear all
                    </button>
                  </div>
                  <SortableContext items={nextInQueue.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {nextInQueue.map((track, idx) => (
                      <SortableTrackItem
                        key={track.id}
                        track={track}
                        index={queueIndex + 1 + idx}
                        isCurrent={false}
                        isPlaying={false}
                        onRemove={onRemove}
                        onPlay={() => onPlayTrack(queueIndex + 1 + idx)}
                      />
                    ))}
                  </SortableContext>
                </div>
              )}

              {/* Next From Context Section */}
              {nextFromContext.length > 0 && (
                <div>
                  <div className="px-6 mb-3">
                    <h3 className="text-[13px] font-bold text-white/40 uppercase tracking-widest">
                      Next From: {currentTrack?.album || 'Context'}
                    </h3>
                  </div>
                  <SortableContext items={nextFromContext.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {nextFromContext.map((track, idx) => (
                      <SortableTrackItem
                        key={track.id}
                        track={track}
                        index={queueIndex + 1 + nextInQueue.length + idx}
                        isCurrent={false}
                        isPlaying={false}
                        onRemove={onRemove}
                        onPlay={() => onPlayTrack(queueIndex + 1 + nextInQueue.length + idx)}
                      />
                    ))}
                  </SortableContext>
                </div>
              )}
            </DndContext>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
