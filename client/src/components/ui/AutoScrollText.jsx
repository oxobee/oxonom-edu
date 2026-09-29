import React, { useRef, useState, useEffect } from 'react';

/**
 * AutoScrollText (Kayar Yazı Bileşeni)
 * - Eğer metin kapsayıcı kutuya sığıyorsa sabit ve temiz bir şekilde durur.
 * - Eğer metin kapsayıcıya sığmıyorsa (taşma varsa), otomatik olarak sağdan sola
 *   yumuşak ve kesintisiz biçimde kayar (marquee).
 * - Kullanıcı fare ile üzerine geldiğinde (hover) veya dokunduğunda okumayı kolaylaştırmak için duraklar.
 */
export default function AutoScrollText({ 
  children, 
  className = '', 
  speed = 30, // saniyede piksel hızı
  delay = 1.5 // başlangıçta bekleme süresi
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [duration, setDuration] = useState(10);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const scrollWidth = textRef.current.scrollWidth;
        const overflows = scrollWidth > containerWidth + 2;
        setIsOverflowing(overflows);

        if (overflows) {
          // Metin uzunluğuna göre ideal kayma süresi hesaplama
          const calculatedDuration = Math.max(6, Math.round(scrollWidth / speed));
          setDuration(calculatedDuration);
        }
      }
    };

    // İlk yüklemede ve pencere boyutu değiştiğinde kontrol et
    checkOverflow();
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [children, speed]);

  // Sığıyorsa normal render
  if (!isOverflowing) {
    return (
      <div 
        ref={containerRef} 
        className={`overflow-hidden whitespace-nowrap min-w-0 max-w-full ${className}`}
      >
        <span ref={textRef} className="inline-block truncate max-w-full">
          {children}
        </span>
      </div>
    );
  }

  // Sığmıyorsa kayar yazı (marquee) modu
  return (
    <div 
      ref={containerRef} 
      className={`overflow-hidden whitespace-nowrap min-w-0 max-w-full relative [mask-image:linear-gradient(to_right,transparent_0%,black_4%,black_96%,transparent_100%)] select-none ${className}`}
      title={typeof children === 'string' ? children : undefined}
    >
      <div
        ref={textRef}
        className="inline-flex items-center gap-6 animate-marquee-loop hover:[animation-play-state:paused] active:[animation-play-state:paused]"
        style={{
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`
        }}
      >
        <span className="shrink-0">{children}</span>
        <span className="opacity-40 text-xs shrink-0">✦</span>
        <span className="shrink-0">{children}</span>
        <span className="opacity-40 text-xs shrink-0">✦</span>
      </div>
    </div>
  );
}
