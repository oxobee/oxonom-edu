import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { resolveMediaUrl } from '../lib/api';

export const getModuleMediaItems = (mod) => {
  if (!mod) return [];
  const items = [];

  // Kural: YouTube videosu varsa otomatik olarak KAPAK (1. slayt) yapılır
  if (mod.videoUrl) {
    items.push({
      id: 'video-cover',
      type: 'video',
      url: mod.videoUrl,
      title: `${mod.title || 'Modül'} Tanıtım Videosu (Kapak)`
    });
  }

  // Ardından tüm görseller listelenir
  const rawImages = (Array.isArray(mod.images) && mod.images.length > 0)
    ? mod.images
    : (mod.coverImage ? [mod.coverImage] : []);

  const uniqueImages = Array.from(new Set(rawImages.filter(Boolean)));
  uniqueImages.forEach((img, idx) => {
    items.push({
      id: `image-${idx}`,
      type: 'image',
      url: resolveMediaUrl(img),
      title: `${mod.title || 'Modül'} Görseli ${idx + 1}`
    });
  });

  return items;
};

const ModuleMediaSlider = ({
  module,
  inModal = false,
  onMediaClick = null,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const mediaItems = getModuleMediaItems(module);

  if (!mediaItems || mediaItems.length === 0) {
    return (
      <div className={`relative aspect-video w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center text-muted-foreground ${className}`}>
        <ImageIcon className="w-10 h-10 text-muted-foreground/40 mb-2" />
        <span className="text-xs">16:9 Medya Bulunmuyor</span>
      </div>
    );
  }

  const currentItem = mediaItems[currentIndex] || mediaItems[0];
  const hasMultiple = mediaItems.length > 1;

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (e, index) => {
    if (e) e.stopPropagation();
    setCurrentIndex(index);
  };

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-slate-950 select-none group/slider ${className}`}>
      {/* Active Slide Content */}
      <div
        className="w-full h-full relative"
        onClick={(e) => {
          // If in card mode and user clicked an image, trigger card click
          if (onMediaClick && currentItem.type !== 'video') {
            onMediaClick(e);
          }
        }}
      >
        {currentItem.type === 'video' ? (
          <div className="w-full h-full relative bg-black">
            <iframe
              src={currentItem.url}
              title={currentItem.title}
              className="w-full h-full border-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <img
            src={currentItem.url}
            alt={currentItem.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Dark Vignette Overlay for image slides */}
        {currentItem.type === 'image' && (
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-black/25 to-black/50 pointer-events-none" />
        )}
      </div>

      {/* Slider Controls (Multiple Media Items) */}
      {hasMultiple && (
        <>
          {/* Previous Arrow Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-md transition-all active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/slider:opacity-100"
            title="Önceki Medya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Next Arrow Button */}
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-md transition-all active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/slider:opacity-100"
            title="Sonraki Medya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Navigation Dots (Bottom Center) */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15">
            {mediaItems.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={(e) => handleDotClick(e, idx)}
                className={`transition-all rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-4 h-1.5 bg-primary shadow-xs'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white'
                }`}
                title={item.title}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ModuleMediaSlider;
