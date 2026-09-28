import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Sparkles, HelpCircle, BookOpen, Award, Smile, ArrowRight } from 'lucide-react';

// Curated high quality educational & daily emoji dataset
export const EMOJI_CATEGORIES = [
  {
    id: 'signs',
    name: 'İşaret & Tabela',
    icon: HelpCircle,
    color: 'text-amber-400',
    emojis: [
      // Noktalama & Vurgu
      { char: '❓', tags: ['soru', 'soru işareti', 'merak', 'bilgi'] },
      { char: '❗', tags: ['ünlem', 'dikkat', 'önemli', 'uyarı'] },
      { char: '⁉️', tags: ['soru', 'ünlem', 'şaşkınlık', 'vurgu'] },
      { char: '💬', tags: ['konuşma', 'balon', 'diyalog', 'cevap'] },
      { char: '💭', tags: ['düşünce', 'fikir', 'akıl', 'balon'] },
      { char: '💡', tags: ['fikir', 'lamba', 'ampul', 'buluş', 'çözüm'] },
      { char: '🔍', tags: ['ara', 'büyüteç', 'incele', 'araştır'] },
      { char: '🔎', tags: ['ara', 'büyüteç', 'incele'] },
      { char: '📌', tags: ['raptiye', 'iğne', 'sabitle', 'not'] },
      { char: '📍', tags: ['konum', 'harita', 'yer', 'işaret'] },
      { char: '🏷️', tags: ['etiket', 'başlık', 'kategori'] },
      { char: '🔑', tags: ['anahtar', 'çözüm', 'ipucu'] },
      { char: '🔒', tags: ['kilit', 'şifre', 'güvenlik'] },
      { char: '🔓', tags: ['açık', 'kilit', 'özgür'] },

      // Değerlendirme & Tabela
      { char: '✅', tags: ['doğru', 'tamam', 'onay', 'tik', 'başarılı'] },
      { char: '✔️', tags: ['doğru', 'onay', 'kontrol'] },
      { char: '❌', tags: ['yanlış', 'hata', 'çarpı', 'olmaz'] },
      { char: '✖️', tags: ['çarpı', 'hata', 'çarpma'] },
      { char: '⭕', tags: ['daire', 'halka', 'doğru', 'işaret'] },
      { char: '🚫', tags: ['yasak', 'dur', 'olmaz', 'engelli'] },
      { char: '🛑', tags: ['dur', 'stop', 'kırmızı', 'tabela'] },
      { char: '⚠️', tags: ['uyarı', 'dikkat', 'tehlike'] },
      { char: '⛔', tags: ['girilmez', 'yasak', 'dur'] },
      { char: '🔔', tags: ['zil', 'bildirim', 'ders', 'teneffüs'] },
      { char: '📢', tags: ['duyuru', 'hoparlör', 'haber', 'anons'] },
      { char: '📣', tags: ['megafon', 'duyuru', 'ses'] },
      { char: '🟢', tags: ['yeşil', 'nokta', 'aktif', 'doğru'] },
      { char: '🔴', tags: ['kırmızı', 'nokta', 'pasif', 'yanlış'] },
      { char: '🟡', tags: ['sarı', 'nokta', 'bekle', 'orta'] },
      { char: '🔵', tags: ['mavi', 'nokta', 'bilgi'] },
      { char: '🏁', tags: ['bayrak', 'bitiş', 'başlangıç'] },
      { char: '🚩', tags: ['bayrak', 'işaret', 'dikkat'] },

      // Yönler ve Oklar
      { char: '➡️', tags: ['sağ', 'ileri', 'ok', 'yön'] },
      { char: '⬅️', tags: ['sol', 'geri', 'ok', 'yön'] },
      { char: '⬆️', tags: ['yukarı', 'üst', 'ok', 'yön'] },
      { char: '⬇️', tags: ['aşağı', 'alt', 'ok', 'yön'] },
      { char: '↗️', tags: ['çapraz', 'sağ yukarı', 'ok'] },
      { char: '↘️', tags: ['çapraz', 'sağ aşağı', 'ok'] },
      { char: '🔄', tags: ['döngü', 'yenile', 'tekrar', 'ok'] },
      { char: '🔁', tags: ['tekrarla', 'döngü'] },
      { char: '👉', tags: ['işaret', 'sağ', 'bak', 'el'] },
      { char: '👈', tags: ['işaret', 'sol', 'el'] },
      { char: '👆', tags: ['işaret', 'yukarı', 'el', 'burada'] },
      { char: '👇', tags: ['işaret', 'aşağı', 'el', 'altta'] }
    ]
  },
  {
    id: 'education',
    name: 'Eğitim & Okul',
    icon: BookOpen,
    color: 'text-indigo-400',
    emojis: [
      // Okul & Kırtasiye
      { char: '📚', tags: ['kitap', 'kütüphane', 'ders', 'okuma'] },
      { char: '📖', tags: ['açık kitap', 'kitap', 'okuma', 'öğrenme'] },
      { char: '📕', tags: ['kırmızı kitap', 'kitap'] },
      { char: '📗', tags: ['yeşil kitap', 'kitap'] },
      { char: '📘', tags: ['mavi kitap', 'kitap'] },
      { char: '📙', tags: ['turuncu kitap', 'kitap'] },
      { char: '📓', tags: ['defter', 'not', 'çalışma'] },
      { char: '📒', tags: ['sarı defter', 'not'] },
      { char: '📝', tags: ['not', 'yazı', 'kalem', 'kağıt', 'sınav'] },
      { char: '✏️', tags: ['kurşun kalem', 'yazı', 'çizim'] },
      { char: '🖊️', tags: ['tükenmez kalem', 'yazı'] },
      { char: '🖍️', tags: ['pastel boya', 'boyama', 'resim'] },
      { char: '📏', tags: ['cetvel', 'ölçüm', 'uzunluk', 'çizgi'] },
      { char: '📐', tags: ['gönye', 'üçgen', 'geometri', 'ölçü'] },
      { char: '📎', tags: ['ataş', 'raptiye', 'tuttur'] },
      { char: '✂️', tags: ['makas', 'kes', 'el işi'] },
      { char: '🎒', tags: ['çanta', 'okul çantası', 'öğrenci'] },
      { char: '🏫', tags: ['okul', 'bina', 'sınıf'] },
      { char: '🎓', tags: ['mezuniyet', 'kep', 'başarı', 'üniversite'] },
      { char: '⏰', tags: ['saat', 'alarm', 'süre', 'zaman'] },
      { char: '⏳', tags: ['kum saati', 'süre', 'bekle', 'zaman'] },
      { char: '🗓️', tags: ['takvim', 'tarih', 'gün', 'program'] },

      // Matematik & Fen
      { char: '🧮', tags: ['abaküs', 'hesap', 'matematik', 'sayı'] },
      { char: '➕', tags: ['artı', 'toplama', 'matematik'] },
      { char: '➖', tags: ['eksi', 'çıkarma', 'matematik'] },
      { char: '✖️', tags: ['çarpı', 'çarpma', 'matematik'] },
      { char: '➗', tags: ['bölü', 'bölme', 'matematik'] },
      { char: '🟰', tags: ['eşittir', 'sonuç', 'matematik'] },
      { char: '🔢', tags: ['sayılar', 'rakamlar', '123'] },
      { char: '🔬', tags: ['mikroskop', 'fen', 'bilim', 'deney', 'hücre'] },
      { char: '🧪', tags: ['tüp', 'deney', 'kimya', 'fen'] },
      { char: '🧫', tags: ['petri kabı', 'biyoloji', 'deney'] },
      { char: '🧬', tags: ['dna', 'genetik', 'fen', 'biyoloji'] },
      { char: '🔭', tags: ['teleskop', 'uzay', 'gökbilim', 'yıldız'] },
      { char: '🪐', tags: ['gezegen', 'satürn', 'uzay', 'fen'] },
      { char: '🌍', tags: ['dünya', 'küre', 'coğrafya', 'harita'] },
      { char: '💻', tags: ['bilgisayar', 'laptop', 'kod', 'bilişim'] },
      { char: '🖥️', tags: ['masaüstü', 'ekran', 'bilişim'] },
      { char: '⚙️', tags: ['ayar', 'çark', 'mekanik', 'üretim'] },

      // Sanat & Spor
      { char: '🎨', tags: ['palet', 'boya', 'resim', 'sanat'] },
      { char: '🖌️', tags: ['fırça', 'resim', 'boyama'] },
      { char: '🎭', tags: ['tiyatro', 'drama', 'maske', 'oyun'] },
      { char: '🎵', tags: ['nota', 'müzik', 'şarkı'] },
      { char: '🎶', tags: ['notalar', 'müzik', 'melodi'] },
      { char: '⚽', tags: ['futbol', 'top', 'spor', 'beden'] },
      { char: '🏀', tags: ['basketbol', 'spor', 'beden'] }
    ]
  },
  {
    id: 'rewards',
    name: 'Öğretmen & Ödül',
    icon: Award,
    color: 'text-amber-500',
    emojis: [
      // Ödül & Başarı
      { char: '⭐', tags: ['yıldız', 'aferin', 'başarı', 'ödül', 'pekiyi'] },
      { char: '🌟', tags: ['parlayan yıldız', 'harika', 'başarı'] },
      { char: '✨', tags: ['ışıltı', 'harika', 'parıltı', 'parlak'] },
      { char: '🏆', tags: ['kupa', 'şampiyon', 'birinci', 'başarı'] },
      { char: '🥇', tags: ['altın madalya', 'birinci', 'şampiyon'] },
      { char: '🥈', tags: ['gümüş madalya', 'ikinci'] },
      { char: '🥉', tags: ['bronz madalya', 'üçüncü'] },
      { char: '🎖️', tags: ['madalya', 'onur', 'başarı'] },
      { char: '🏅', tags: ['spor madalya', 'ödül'] },
      { char: '👑', tags: ['tac', 'kral', 'kraliçe', 'en iyi'] },
      { char: '💯', tags: ['yüz', 'tam puan', 'mükemmel', 'yüzde yüz'] },
      { char: '🎉', tags: ['parti', 'kutlama', 'tebrikler', 'aferin'] },
      { char: '🎊', tags: ['konfeti', 'kutlama', 'tebrik'] },
      { char: '🎈', tags: ['balon', 'kutlama', 'neşe'] },

      // Teşvik & İletişim
      { char: '👏', tags: ['alkış', 'tebrik', 'aferin', 'bravo'] },
      { char: '👍', tags: ['beğeni', 'tamam', 'güzel', 'onay'] },
      { char: '🙌', tags: ['eller havaya', 'kutlama', 'harika'] },
      { char: '🤝', tags: ['tokalaşma', 'anlaşma', 'birlik', 'dostluk'] },
      { char: '💪', tags: ['güç', 'başarabilirsin', 'azim', 'kas'] },
      { char: '👌', tags: ['mükemmel', 'tamam', 'süper'] },
      { char: '🤩', tags: ['yıldız göz', 'hayran', 'mükemmel'] },
      { char: '🥳', tags: ['parti yüzü', 'kutlama', 'tebrik'] },
      { char: '💖', tags: ['kalp', 'sevgi', 'aferin', 'beğeni'] },
      { char: '❤️', tags: ['kırmızı kalp', 'sevgi'] },
      { char: '🔥', tags: ['ateş', 'harika', 'süper', 'hızlı'] },
      { char: '🚀', tags: ['roket', 'hızlı', 'gelişim', 'ilerleme'] },
      { char: '🌈', tags: ['gökkuşağı', 'renkli', 'umut', 'neşeli'] },

      // Düşünce & Sınıf İçi
      { char: '🤔', tags: ['düşünme', 'soru', 'akıl', 'fikir'] },
      { char: '🧐', tags: ['monokl', 'inceleme', 'araştırma'] },
      { char: '🤫', tags: ['sessiz', 'sus', 'dinle', 'sessizlik'] },
      { char: '👂', tags: ['kulak', 'dinleme', 'duyma'] },
      { char: '🗣️', tags: ['konuşma', 'anlatım', 'söz'] },
      { char: '🙋‍♂️', tags: ['parmak kaldır', 'erkek öğrenci', 'söz iste'] },
      { char: '🙋‍♀️', tags: ['parmak kaldır', 'kız öğrenci', 'söz iste'] },
      { char: '👨‍🏫', tags: ['öğretmen', 'erkek öğretmen'] },
      { char: '👩‍🏫', tags: ['öğretmen', 'kadın öğretmen'] }
    ]
  },
  {
    id: 'daily',
    name: 'Günlük & İfadeler',
    icon: Smile,
    color: 'text-emerald-400',
    emojis: [
      // Yüz İfadeleri
      { char: '😀', tags: ['gülen yüz', 'mutlu'] },
      { char: '😃', tags: ['gülen', 'sevinç'] },
      { char: '😄', tags: ['gülümse', 'mutluluk'] },
      { char: '😊', tags: ['tatlı', 'sevimli', 'gülümse'] },
      { char: '😇', tags: ['melek', 'iyi', 'masum'] },
      { char: '😉', tags: ['göz kırpma', 'şaka'] },
      { char: '😍', tags: ['aşık', 'kalp göz', 'çok sevdim'] },
      { char: '🥰', tags: ['sevgi dolu', 'tatlı'] },
      { char: '😎', tags: ['havalı', 'gözlüklü', 'başardım'] },
      { char: '🤓', tags: ['gözlüklü', 'çalışkan', 'bilgili', 'kitap kurdu'] },
      { char: '😂', tags: ['gülmekten kırıl', 'komik'] },
      { char: '🤣', tags: ['kahkaha', 'çok komik'] },
      { char: '😜', tags: ['dil çıkar', 'şaka', 'eğlence'] },
      { char: '😴', tags: ['uyuyan', 'dinlenme', 'uyku'] },
      { char: '🤖', tags: ['robot', 'teknoloji', 'yapay zeka'] },

      // Doğa & Meyve & Hayvan
      { char: '🐶', tags: ['köpek', 'sevimli', 'hayvan'] },
      { char: '🐱', tags: ['kedi', 'hayvan'] },
      { char: '🦁', tags: ['aslan', 'cesur', 'güçlü'] },
      { char: '🐼', tags: ['panda', 'tatlı', 'ayı'] },
      { char: '🌸', tags: ['çiçek', 'bahar', 'güzel'] },
      { char: '🍀', tags: ['dört yapraklı yonca', 'şans'] },
      { char: '☀️', tags: ['güneş', 'aydınlık', 'gündüz'] },
      { char: '🌙', tags: ['ay', 'hilal', 'gece'] },
      { char: '⛅', tags: ['bulut', 'hava durumu'] },
      { char: '🍎', tags: ['elma', 'öğretmen', 'sağlık', 'meyve'] },
      { char: '🍌', tags: ['muz', 'meyve'] },
      { char: '🍕', tags: ['pizza', 'yemek'] },
      { char: '☕', tags: ['kahve', 'çay', 'mola', 'öğretmen'] }
    ]
  }
];

/**
 * Generates a super-crisp, high-definition (512x512) transparent PNG dataURL for any emoji
 * Ensures retina-level sharpness on whiteboard canvas at any zoom level
 */
export const createEmojiImage = (emoji, resolution = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, resolution, resolution);

  // Use crisp multi-platform system emoji fonts
  const fontSize = Math.round(resolution * 0.74);
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Slight vertical optical center adjustment
  ctx.fillText(emoji, resolution / 2, resolution / 2 + Math.round(resolution * 0.035));
  return canvas.toDataURL('image/png');
};

const EmojiPickerModal = ({ isOpen, onClose, onSelectEmoji }) => {
  const [activeCategory, setActiveCategory] = useState('signs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSize, setSelectedSize] = useState(96); // 64, 96, 144 px

  const currentCategory = useMemo(() => {
    return EMOJI_CATEGORIES.find(c => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  }, [activeCategory]);

  // Filter emojis based on query across all categories or in active category
  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return currentCategory.emojis;
    }
    // Search across ALL categories when there's an active search query
    const results = [];
    const seenChars = new Set();

    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (!seenChars.has(item.char)) {
          const matchChar = item.char.includes(q);
          const matchTag = item.tags.some(t => t.toLowerCase().includes(q));
          if (matchChar || matchTag) {
            seenChars.add(item.char);
            results.push(item);
          }
        }
      }
    }
    return results;
  }, [searchQuery, currentCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        className="bg-card border border-border rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden text-card-foreground"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-4.5 border-b border-border flex items-center justify-between gap-3 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                Emoji & İşaret Kütüphanesi
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Eğitim tabelaları, yönerge okları ve yüksek kaliteli çıkartmalar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Size Controls */}
        <div className="p-3 sm:px-4 sm:pt-3 sm:pb-2 border-b border-border/60 bg-muted/10 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Emoji veya işaret ara... (örn: soru, tik, kitap, ok, yıldız)"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-card border border-border/80 text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs (if not searching) */}
          {!searchQuery && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {EMOJI_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground' : cat.color}`} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Size Pill Selector */}
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-muted-foreground font-medium">Yerleştirme Boyutu:</span>
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
              {[
                { label: 'Küçük (64px)', size: 64 },
                { label: 'Standart (96px)', size: 96 },
                { label: 'Büyük (144px)', size: 144 }
              ].map(opt => (
                <button
                  key={opt.size}
                  onClick={() => setSelectedSize(opt.size)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    selectedSize === opt.size
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto max-h-[380px] min-h-[220px]">
          {filteredEmojis.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Smile className="w-8 h-8 opacity-40" />
              <p className="text-xs">"{searchQuery}" ile eşleşen bir emoji bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 sm:gap-2.5">
              {filteredEmojis.map((item, idx) => (
                <button
                  key={`${item.char}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectEmoji(item.char, selectedSize);
                    onClose();
                  }}
                  className="group relative aspect-square rounded-2xl bg-muted/20 hover:bg-primary/10 border border-border/50 hover:border-primary/40 flex items-center justify-center text-2xl sm:text-3xl transition-all duration-150 hover:scale-115 active:scale-95 cursor-pointer shadow-2xs hover:shadow-md"
                  title={item.tags.join(', ')}
                >
                  <span className="transition-transform group-hover:scale-110 drop-shadow-xs">
                    {item.char}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-border/80 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <span>💡 <strong>İpucu:</strong> Eklenen emojiye tıklayarak büyütebilir, döndürebilir ve taşıyabilirsiniz.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EmojiPickerModal;
