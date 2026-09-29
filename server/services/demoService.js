const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const Board = require('../models/Board');
const Assignment = require('../models/Assignment');
const AssignmentRecipient = require('../models/AssignmentRecipient');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const MeetingRequest = require('../models/MeetingRequest');
const MeetingMessage = require('../models/MeetingMessage');
const AttendanceSession = require('../models/AttendanceSession');
const Announcement = require('../models/Announcement');
const AnnouncementRecipient = require('../models/AnnouncementRecipient');
const Module = require('../models/Module');
const SystemSetting = require('../models/SystemSetting');

const DEMO_TEACHER_USERNAME = 'demo_ogretmen';
const DEMO_TEACHER_EMAIL = 'demo@oxonom.com';
const DEMO_STUDENT_USERNAME = 'demo_ogrenci';
const DEMO_STUDENT_EMAIL = 'demo_ogrenci@oxonom.com';
const DEMO_PASSWORD_PLAIN = 'Demo1234!';
const DEMO_STUDENT_PASSWORD = 'Ogrenci123!';

let isAutoResetActive = true;
let resetTimer = null;
let lastResetTimestamp = Date.now();
let nextResetTimestamp = null;

const INITIAL_READING_MODULE = {
  key: '1-dk-okuma',
  title: '1 Dk Okuma & Hızlı Okuma Atölyesi',
  shortDescription: 'İlkokul ve temel kademelerde öğrencilerin akıcı okuma, doğru telaffuz ve dakikada okunan kelime sayısını takip eden interaktif akıllı tahta aracı.',
  longDescription: `1 Dk Okuma Modülü, özellikle 1. ve 2. sınıf düzeyinde okuma-yazma sürecindeki öğrencilerin akıcı okuma becerilerini, doğru heceleme kabiliyetlerini ve dakika başına okunan net kelime sayısını (WPM) eğlenceli ve etkileşimli bir yarışma formatında ölçmek için geliştirilmiş özel bir akıllı tahta aracıdır.

### 🌟 Öne Çıkan Pedagojik Özellikler:
- **60 Saniyelik Akıllı Sayaç:** Süre başladığında öğrenci metni tahtadan okurken öğretmen tek dokunuşla hata yapılan kelimeleri işaretler.
- **MEB Uyumlu Yazı Tipi (TTKB Dik Temel Abece):** İlkokul 1. sınıf müfredatındaki dik temel harf standartlarına %100 uyumlu tipografi.
- **Hece ve Harf Çalışma Atölyesi:** Ses gruplarına (e-l-a-k-i-n, o-m-u-t-ü-y vb.) göre ayrılmış heceleme tabloları ve kelime piramitleri.
- **Anlık Başarı Karnesi:** Süre bittiğinde okunan toplam kelime, hatalı kelime ve net okuma hızı anında hesaplanıp ekrana yansıtılır.
- **Sınıf Seviyesine Özel:** İstenen sınıflara özel olarak açılıp kapatılabilir; böylece üst sınıfların tahtalarında karmaşa yaratmaz.`,
  coverImage: '/uploads/1790551293532-206185101-kapak.jpeg',
  images: [
    '/uploads/1790551293532-206185101-kapak.jpeg',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  videoUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk',
  videoEmbedCode: '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/jfKfPfyJRdk" title="1 Dk Okuma Modülü Tanıtımı" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
  badgeText: 'İlkokul & Temel',
  category: 'Okuma & Hızlı Okuma',
  subject: 'Türkçe',
  targetGrades: ['1', '2', '3', '4'],
  features: [
    '60 Saniye Dinamik Geri Sayım',
    'MEB Dik Temel Harf Desteği',
    'Hece ve Kelime Piramitleri',
    'Otomatik Net Kelime Sayacı',
    'Akıllı Tahta & Mobil Dokunmatik Uyumlu'
  ],
  isActive: true,
  order: 1
};

const INITIAL_LETTER_WRITING_MODULE = {
  key: 'harf-cizgi-atolyesi',
  title: 'Harf Çizgi & Yazılış Yönü Atölyesi',
  shortDescription: '1. Sınıf MEB standartlarında kılavuz çizgili satırda harf, rakam ve çizgi yazma atölyesi.',
  longDescription: `Harf Çizgi & Yazılış Yönü Atölyesi, ilkokul 1. sınıf öğrencilerinin yazıya ilk adım attıkları dönemde harfleri doğru yön ve sırayla, MEB TTKB standartlarındaki 4 çizgili kılavuz satırda eğlenceli ve interaktif şekilde öğrenmelerini sağlayan akıllı tahta aracıdır.

### 🌟 Öne Çıkan Pedagojik Özellikler:
- **MEB Kılavuz Çizgili Satır:** Türk Millî Eğitim Bakanlığı standartlarındaki tepe, gövde, kırmızı taban ve kuyruk çizgileri.
- **Tüm MEB Harf Grupları:** 1. gruptan (E-L-A-K-İ-N) 5. gruba kadar tüm büyük ve küçük harfler ile 0-9 rakamlar.
- **Nasıl Yazılır? (Animasyonlu Kalem):** Numaralandırılmış ok yönleri ve hareketli kalemle harfin çiziliş hamlelerini adım adım gösterir.
- **Dokunmatik & Kalemle Çizim:** Akıllı tahtada parmakla veya kalemle harfin üzerinden geçilerek motor beceri geliştirilir.
- **Fonetik Ses & Görsel Kartlar:** Harfin fonetik sesini seslendirir; harfle başlayan nesne kartlarıyla ses-harf bağını pekiştirir.
- **Tahtaya Aktarma:** Öğrencinin yazdığı harfi tek dokunuşla arkadaki ortak akıllı tahtaya aktarır.`,
  coverImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&h=675&q=80',
  images: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  videoUrl: '',
  videoEmbedCode: '',
  badgeText: '1. Sınıf Temel',
  category: 'Yazı & Çizgi Çalışması',
  subject: 'Türkçe',
  targetGrades: ['1'],
  features: [
    'MEB Kılavuz Çizgili Satır',
    'Yazılış Yönü Okları (1, 2, 3)',
    'Animasyonlu Kalem Rehberi',
    'Dokunmatik Çizim Tuvali',
    'Mobil & Tablet %100 Uyumlu'
  ],
  isActive: true,
  order: 2
};

const INITIAL_MATH_MODULE = {
  key: 'ritmik-sayma-atolyesi',
  title: 'Ritmik Sayma & Sayı Doğrusu Atölyesi',
  shortDescription: '1, 2 ve 3. sınıflar için eğlenceli ritmik sayma, yüzlük tablo ve dinamik sayı doğrusu aracı.',
  longDescription: `Ritmik Sayma & Sayı Doğrusu Atölyesi, ilkokul öğrencilerinin temel matematik becerilerini, ileri-geri ritmik saymayı (1'er, 2'şer, 3'er, 5'er, 10'ar), yüzlük tabloda sayı örüntülerini ve sayı doğrusu üzerindeki hareketleri görsel ve interaktif olarak keşfetmelerini sağlar.

### 🌟 Öne Çıkan Pedagojik Özellikler:
- **Yüzlük Tabloda İnteraktif Boyama:** Sayı örüntülerini renkli hücrelerle keşfetme.
- **İleri ve Geri Ritmik Sayma:** Adım aralığı seçerek dinamik sesli sayma.
- **Dinamik Sayı Doğrusu:** Sayıların aralıklarını zihinde somutlaştırma.`,
  coverImage: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=1200&h=675&q=80',
  images: [
    'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  videoUrl: '',
  videoEmbedCode: '',
  badgeText: 'Temel Matematik',
  category: 'Ritmik Sayma & Sayılar',
  subject: 'Matematik',
  targetGrades: ['1', '2', '3'],
  features: [
    'Yüzlük Tabloda İnteraktif Boyama',
    'İleri ve Geri Ritmik Sayma',
    'Dinamik Sayı Doğrusu',
    'Sesli Sayı Rehberi'
  ],
  isActive: true,
  order: 3
};

const INITIAL_SCIENCE_MODULE = {
  key: 'gunes-sistemi-atolyesi',
  title: 'Güneş Sistemi & Gezegenler Keşif Atölyesi',
  shortDescription: '3, 4 ve 5. sınıflar için gezegenler, yörüngeler ve uzay keşfi 3D görselleştirme aracı.',
  longDescription: `Güneş Sistemi & Gezegenler Keşif Atölyesi, öğrencilerin Dünya'mızın hareketlerini, mevsimleri, Güneş ve Ay tutulmalarını ve gezegenlerin Güneş'e olan mesafelerini etkileşimli modellerle öğrenmelerini sağlayan akıllı tahta aracıdır.

### 🌟 Öne Çıkan Pedagojik Özellikler:
- **3 Boyutlu Gezegen Modelleri:** Gezegenlerin dönüş hızları ve eksen eğiklikleri.
- **Gündüz-Gece ve Mevsim Simülasyonu:** Dünya'nın Güneş etrafındaki dolanımı.
- **Gezegen Kıyaslama Kartları:** Kütle, çap ve yerçekimi karşılaştırmaları.`,
  coverImage: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=1200&h=675&q=80',
  images: [
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  videoUrl: '',
  videoEmbedCode: '',
  badgeText: 'Uzay & Doğa',
  category: 'Güneş Sistemi & Uzay',
  subject: 'Fen Bilimleri',
  targetGrades: ['3', '4', '5'],
  features: [
    '3 Boyutlu Gezegen Modelleri',
    'Gündüz-Gece Simülasyonu',
    'Gezegen Kıyaslama Kartları',
    'İnteraktif Bilgi Kartları'
  ],
  isActive: true,
  order: 4
};

const INITIAL_BOARD_TOOLS_MODULE = {
  key: 'sinif-carki-zamanlayici',
  title: 'Sınıf Çarkı & Geri Sayım Araçları',
  shortDescription: 'Tüm kademelerde sınıf yönetimi, rastgele öğrenci seçimi ve etkinlik geri sayım sayacı.',
  longDescription: `Sınıf Çarkı ve Geri Sayım Araçları, öğretmenlerin ders esnasında adil kura çekmesini, grup çalışmalarında süre yönetimini ve yarışmalarda heyecan verici geri sayımlar yapmasını sağlayan akıllı tahta sınıf yönetimi aracıdır.

### 🌟 Öne Çıkan Özellikler:
- **Dinamik Öğrenci İsim Çarkı:** Sınıf listesini yükleyerek tek tıkla kura çekme.
- **Grup ve Takım Oluşturucu:** Adil ve dengeli öğrenci takımları kurma.
- **Sesli Alarm & Kronometre:** Sınav ve etkinlik zamanlayıcı.`,
  coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&h=675&q=80',
  images: [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  videoUrl: '',
  videoEmbedCode: '',
  badgeText: 'Sınıf Yönetimi',
  category: 'Sınıf Yönetimi',
  subject: 'Tahta Araçları',
  targetGrades: ['1', '2', '3', '4', '5', '8'],
  features: [
    'Dinamik Öğrenci İsim Çarkı',
    'Grup & Takım Oluşturucu',
    'Sesli Alarm & Geri Sayım',
    'Puanlama Tablosu'
  ],
  isActive: true,
  order: 5
};

// 60 Turkish realistic students (10 per class)
const DEMO_STUDENTS_DATA = [
  // 1-A Sınıfı (İlkokul 1 - Doğum: 2017)
  { num: 101, first: 'Ali', last: 'Yılmaz', gender: 'Erkek', birth: '2017-04-12', address: 'Bağdat Cad. No: 14 Kadıköy / İstanbul', p1Name: 'Ayşe Yılmaz', p1Rel: 'Anne', p1Phone: '0532 555 0101', p2Name: 'Murat Yılmaz', p2Rel: 'Baba', p2Phone: '0542 555 0101', note: 'Çok meraklı ve görsel hafızası güçlü.', isDemoAccount: true },
  { num: 102, first: 'Zeynep', last: 'Kaya', gender: 'Kız', birth: '2017-06-25', address: 'Moda Cad. No: 28 Kadıköy / İstanbul', p1Name: 'Fatma Kaya', p1Rel: 'Anne', p1Phone: '0532 555 0102', p2Name: 'Ahmet Kaya', p2Rel: 'Baba', p2Phone: '0542 555 0102', note: 'Resim yapmayı ve yazı çalışmalarını çok seviyor.' },
  { num: 103, first: 'Mehmet', last: 'Demir', gender: 'Erkek', birth: '2017-02-18', address: 'Fenerbahçe Mah. Lale Sok. No: 5 / İstanbul', p1Name: 'Selin Demir', p1Rel: 'Anne', p1Phone: '0532 555 0103', p2Name: 'Emre Demir', p2Rel: 'Baba', p2Phone: '0542 555 0103', note: 'Arkadaşlarıyla uyumlu ve aktif.' },
  { num: 104, first: 'Elif', last: 'Şahin', gender: 'Kız', birth: '2017-08-30', address: 'Acıbadem Mah. Çınar Sok. No: 12 Üsküdar', p1Name: 'Merve Şahin', p1Rel: 'Anne', p1Phone: '0532 555 0104', p2Name: 'Serkan Şahin', p2Rel: 'Baba', p2Phone: '0542 555 0104', note: 'Okuma yazma çalışmalarında çok hızlı ilerliyor.' },
  { num: 105, first: 'Can', last: 'Yıldırım', gender: 'Erkek', birth: '2017-01-15', address: 'Koşuyolu Mah. Gül Cad. No: 8 Kadıköy', p1Name: 'Gül Yıldırım', p1Rel: 'Anne', p1Phone: '0532 555 0105', p2Name: 'Hakan Yıldırım', p2Rel: 'Baba', p2Phone: '0542 555 0105', note: 'Rakamları ve sayma oyunlarını seviyor.' },
  { num: 106, first: 'Defne', last: 'Çelik', gender: 'Kız', birth: '2017-09-09', address: 'Bostancı Mah. Sahil Yolu No: 44 Kadıköy', p1Name: 'Derya Çelik', p1Rel: 'Anne', p1Phone: '0532 555 0106', p2Name: 'Tolga Çelik', p2Rel: 'Baba', p2Phone: '0542 555 0106', note: 'Müzik ve ritim kabiliyeti yüksek.' },
  { num: 107, first: 'Burak', last: 'Öztürk', gender: 'Erkek', birth: '2017-03-22', address: 'Suadiye Mah. Plaj Yolu No: 19 Kadıköy', p1Name: 'Hale Öztürk', p1Rel: 'Anne', p1Phone: '0532 555 0107', p2Name: 'Kenan Öztürk', p2Rel: 'Baba', p2Phone: '0542 555 0107', note: 'Dikkatli dinleyici, grup etkinliklerinde neşeli.' },
  { num: 108, first: 'Nehir', last: 'Aydın', gender: 'Kız', birth: '2017-11-14', address: 'Erenköy Mah. Ethem Efendi Cad. No: 52 Kadıköy', p1Name: 'Sevgi Aydın', p1Rel: 'Anne', p1Phone: '0532 555 0108', p2Name: 'Bülent Aydın', p2Rel: 'Baba', p2Phone: '0542 555 0108', note: 'İnce motor becerileri gelişmiş.' },
  { num: 109, first: 'Emre', last: 'Koç', gender: 'Erkek', birth: '2017-05-04', address: 'Göztepe Mah. Tütüncü Mehmet Efendi Cad. No: 11', p1Name: 'Nurten Koç', p1Rel: 'Anne', p1Phone: '0532 555 0109', p2Name: 'Metin Koç', p2Rel: 'Baba', p2Phone: '0542 555 0109', note: 'Soru sormaktan çekinmeyen canlı bir öğrenci.' },
  { num: 110, first: 'Ece', last: 'Arslan', gender: 'Kız', birth: '2017-07-19', address: 'Feneryolu Mah. Gazi Muhtar Paşa Sok. No: 6', p1Name: 'Berna Arslan', p1Rel: 'Anne', p1Phone: '0532 555 0110', p2Name: 'Onur Arslan', p2Rel: 'Baba', p2Phone: '0542 555 0110', note: 'Hikaye anlatma ve ifade yeteneği kuvvetli.' },

  // 2-B Sınıfı (İlkokul 2 - Doğum: 2016)
  { num: 201, first: 'Kerem', last: 'Doğan', gender: 'Erkek', birth: '2016-03-10', address: 'Altunizade Mah. Mahir İz Cad. No: 18 Üsküdar', p1Name: 'Ebru Doğan', p1Rel: 'Anne', p1Phone: '0532 555 0201', p2Name: 'Cem Doğan', p2Rel: 'Baba', p2Phone: '0542 555 0201', note: 'Toplama ve çıkarmada pratik.' },
  { num: 202, first: 'Asya', last: 'Polat', gender: 'Kız', birth: '2016-05-18', address: 'Kuzguncuk Mah. İcadiye Cad. No: 42 Üsküdar', p1Name: 'Dilek Polat', p1Rel: 'Anne', p1Phone: '0532 555 0202', p2Name: 'Kadir Polat', p2Rel: 'Baba', p2Phone: '0542 555 0202', note: 'Kitap okuma saatlerini kaçırmaz.' },
  { num: 203, first: 'Umut', last: 'Güneş', gender: 'Erkek', birth: '2016-08-01', address: 'Beylerbeyi Mah. Yalıboyu Cad. No: 15 Üsküdar', p1Name: 'Yasemin Güneş', p1Rel: 'Anne', p1Phone: '0532 555 0203', p2Name: 'Volkan Güneş', p2Rel: 'Baba', p2Phone: '0542 555 0203', note: 'Doğa ve hayvanlara ilgili.' },
  { num: 204, first: 'Derin', last: 'Yavuz', gender: 'Kız', birth: '2016-10-12', address: 'Çengelköy Mah. Havuzbaşı Sok. No: 23 Üsküdar', p1Name: 'Burcu Yavuz', p1Rel: 'Anne', p1Phone: '0532 555 0204', p2Name: 'Murat Yavuz', p2Rel: 'Baba', p2Phone: '0542 555 0204', note: 'Ders içi katılımı yüksek.' },
  { num: 205, first: 'Efe', last: 'Bozkurt', gender: 'Erkek', birth: '2016-01-29', address: 'Kandilli Mah. Göksu Cad. No: 7 Üsküdar', p1Name: 'Gamze Bozkurt', p1Rel: 'Anne', p1Phone: '0532 555 0205', p2Name: 'Barış Bozkurt', p2Rel: 'Baba', p2Phone: '0542 555 0205', note: 'Spor aktivitelerine ve beden dersine ilgili.' },
  { num: 206, first: 'Lina', last: 'Kurt', gender: 'Kız', birth: '2016-07-07', address: 'Kuleli Mah. Çeşme Sok. No: 9 Üsküdar', p1Name: 'Sinem Kurt', p1Rel: 'Anne', p1Phone: '0532 555 0206', p2Name: 'Alper Kurt', p2Rel: 'Baba', p2Phone: '0542 555 0206', note: 'Yaratıcı düşünme ve tasarım becerisi var.' },
  { num: 207, first: 'Kaan', last: 'Yıldız', gender: 'Erkek', birth: '2016-04-14', address: 'Ünalan Mah. Ayazma Cad. No: 33 Üsküdar', p1Name: 'Nurgül Yıldız', p1Rel: 'Anne', p1Phone: '0532 555 0207', p2Name: 'Şahin Yıldız', p2Rel: 'Baba', p2Phone: '0542 555 0207', note: 'Çarpım tablosunu ezberlemede istekli.' },
  { num: 208, first: 'Ada', last: 'Bulut', gender: 'Kız', birth: '2016-12-03', address: 'Bulgurlu Mah. Bağlar Cad. No: 16 Üsküdar', p1Name: 'Tuğba Bulut', p1Rel: 'Anne', p1Phone: '0532 555 0208', p2Name: 'Cihan Bulut', p2Rel: 'Baba', p2Phone: '0542 555 0208', note: 'Hayat bilgisi derslerinde çok başarılı.' },
  { num: 209, first: 'Mert', last: 'Çetin', gender: 'Erkek', birth: '2016-02-20', address: 'Küçüksu Mah. Rasathane Cad. No: 11 Üsküdar', p1Name: 'Aylin Çetin', p1Rel: 'Anne', p1Phone: '0532 555 0209', p2Name: 'Sedat Çetin', p2Rel: 'Baba', p2Phone: '0542 555 0209', note: 'Zaman kavramı ve saat okumada başarılı.' },
  { num: 210, first: 'Ela', last: 'Özkan', gender: 'Kız', birth: '2016-09-17', address: 'Fıstıkağacı Mah. Selami Ali Cad. No: 20 Üsküdar', p1Name: 'Esra Özkan', p1Rel: 'Anne', p1Phone: '0532 555 0210', p2Name: 'Levent Özkan', p2Rel: 'Baba', p2Phone: '0542 555 0210', note: 'Yardımsever ve sorumluluk sahibi.' },

  // 3-A Sınıfı (İlkokul 3 - Doğum: 2015)
  { num: 301, first: 'Yiğit', last: 'Aksoy', gender: 'Erkek', birth: '2015-01-22', address: 'Levent Mah. Çamlık Cad. No: 3 Beşiktaş / İstanbul', p1Name: 'Filiz Aksoy', p1Rel: 'Anne', p1Phone: '0532 555 0301', p2Name: 'Oğuz Aksoy', p2Rel: 'Baba', p2Phone: '0542 555 0301', note: 'Fen deneylerine ve astronomiye büyük ilgisi var.' },
  { num: 302, first: 'Duru', last: 'Erdoğan', gender: 'Kız', birth: '2015-06-11', address: 'Etiler Mah. Nispetiye Cad. No: 45 Beşiktaş', p1Name: 'Banu Erdoğan', p1Rel: 'Anne', p1Phone: '0532 555 0302', p2Name: 'Selçuk Erdoğan', p2Rel: 'Baba', p2Phone: '0542 555 0302', note: 'Türkçe dersinde kompozisyonları çok başarılı.' },
  { num: 303, first: 'Doruk', last: 'Taş', gender: 'Erkek', birth: '2015-03-08', address: 'Bebek Mah. Cevdet Paşa Cad. No: 12 Beşiktaş', p1Name: 'Pınar Taş', p1Rel: 'Anne', p1Phone: '0532 555 0303', p2Name: 'Ercan Taş', p2Rel: 'Baba', p2Phone: '0542 555 0303', note: 'Geometrik cisimler konusunda yetenekli.' },
  { num: 304, first: 'Yağmur', last: 'Keskin', gender: 'Kız', birth: '2015-09-19', address: 'Ortaköy Mah. Dereboyu Cad. No: 27 Beşiktaş', p1Name: 'Belgin Keskin', p1Rel: 'Anne', p1Phone: '0532 555 0304', p2Name: 'Taner Keskin', p2Rel: 'Baba', p2Phone: '0542 555 0304', note: 'Çevre kulübü temsilcisi.' },
  { num: 305, first: 'Alp', last: 'Yalçın', gender: 'Erkek', birth: '2015-04-03', address: 'Ulus Mah. Ahmet Adnan Saygun Cad. No: 8 Beşiktaş', p1Name: 'Süreyya Yalçın', p1Rel: 'Anne', p1Phone: '0532 555 0305', p2Name: 'Mehmet Yalçın', p2Rel: 'Baba', p2Phone: '0542 555 0305', note: 'Mantık ve zeka oyunlarında şampiyon.' },
  { num: 306, first: 'Beren', last: 'Kaplan', gender: 'Kız', birth: '2015-08-14', address: 'Akatlar Mah. Zeytinoğlu Cad. No: 34 Beşiktaş', p1Name: 'Zehra Kaplan', p1Rel: 'Anne', p1Phone: '0532 555 0306', p2Name: 'Cengiz Kaplan', p2Rel: 'Baba', p2Phone: '0542 555 0306', note: 'İngilizce kelime hazinesi çok zengin.' },
  { num: 307, first: 'Arda', last: 'Karaca', gender: 'Erkek', birth: '2015-11-28', address: 'Balmumcu Mah. Barbaros Bulvarı No: 88 Beşiktaş', p1Name: 'Işıl Karaca', p1Rel: 'Anne', p1Phone: '0532 555 0307', p2Name: 'Bora Karaca', p2Rel: 'Baba', p2Phone: '0542 555 0307', note: 'Problem çözümlerinde yaratıcı alternatifler sunar.' },
  { num: 308, first: 'Melis', last: 'Sarı', gender: 'Kız', birth: '2015-05-30', address: 'Dikilitaş Mah. Emirhan Cad. No: 17 Beşiktaş', p1Name: 'Hülya Sarı', p1Rel: 'Anne', p1Phone: '0532 555 0308', p2Name: 'İsmail Sarı', p2Rel: 'Baba', p2Phone: '0542 555 0308', note: 'Grup çalışmalarında organize edici.' },
  { num: 309, first: 'Poyraz', last: 'Tekin', gender: 'Erkek', birth: '2015-07-21', address: 'Abbasağa Mah. Yıldız Cad. No: 5 Beşiktaş', p1Name: 'Nazan Tekin', p1Rel: 'Anne', p1Phone: '0532 555 0309', p2Name: 'Erhan Tekin', p2Rel: 'Baba', p2Phone: '0542 555 0309', note: 'Bilim ve teknoloji projelerine ilgili.' },
  { num: 310, first: 'Masal', last: 'Tunç', gender: 'Kız', birth: '2015-10-05', address: 'Sinanpaşa Mah. Şair Nedim Cad. No: 31 Beşiktaş', p1Name: 'Gonca Tunç', p1Rel: 'Anne', p1Phone: '0532 555 0310', p2Name: 'Zafer Tunç', p2Rel: 'Baba', p2Phone: '0542 555 0310', note: 'Şiir ve tiyatro kulübünde çok hevesli.' },

  // 4-C Sınıfı (İlkokul 4 - Doğum: 2014)
  { num: 401, first: 'Çağan', last: 'Şen', gender: 'Erkek', birth: '2014-02-14', address: 'Bahçelievler Mah. Talatpaşa Cad. No: 10 İstanbul', p1Name: 'Şule Şen', p1Rel: 'Anne', p1Phone: '0532 555 0401', p2Name: 'Ufuk Şen', p2Rel: 'Baba', p2Phone: '0542 555 0401', note: 'Sosyal bilgiler ve harita bilgisi harika.' },
  { num: 402, first: 'Nil', last: 'Eren', gender: 'Kız', birth: '2014-07-26', address: 'Zuhuratbaba Mah. İncirli Cad. No: 22 Bakırköy', p1Name: 'Dilek Eren', p1Rel: 'Anne', p1Phone: '0532 555 0402', p2Name: 'Tolga Eren', p2Rel: 'Baba', p2Phone: '0542 555 0402', note: 'İngilizce münazarada sınıf sözcüsü.' },
  { num: 403, first: 'Baran', last: 'Avcı', gender: 'Erkek', birth: '2014-04-18', address: 'Yeşilköy Mah. İstasyon Cad. No: 4 Bakırköy', p1Name: 'Melike Avcı', p1Rel: 'Anne', p1Phone: '0532 555 0403', p2Name: 'Selim Avcı', p2Rel: 'Baba', p2Phone: '0542 555 0403', note: 'Tarih ve eski uygarlıklar konusuna meraklı.' },
  { num: 404, first: 'Selin', last: 'Coşkun', gender: 'Kız', birth: '2014-09-02', address: 'Ataköy 5. Kısım No: 14 Bakırköy', p1Name: 'Demet Coşkun', p1Rel: 'Anne', p1Phone: '0532 555 0404', p2Name: 'Levent Coşkun', p2Rel: 'Baba', p2Phone: '0542 555 0404', note: 'Matematik dört işlem ve kesirlerde hatasız.' },
  { num: 405, first: 'Rüzgar', last: 'Güler', gender: 'Erkek', birth: '2014-01-30', address: 'Florya Mah. Akvaryum Cad. No: 8 Bakırköy', p1Name: 'Sevim Güler', p1Rel: 'Anne', p1Phone: '0532 555 0405', p2Name: 'Necati Güler', p2Rel: 'Baba', p2Phone: '0542 555 0405', note: 'Bilimsel araştırma basamaklarını iyi kavradı.' },
  { num: 406, first: 'Mira', last: 'Kılıç', gender: 'Kız', birth: '2014-06-15', address: 'Zeytinlik Mah. Yakut Sok. No: 9 Bakırköy', p1Name: 'Ayşen Kılıç', p1Rel: 'Anne', p1Phone: '0532 555 0406', p2Name: 'Sinan Kılıç', p2Rel: 'Baba', p2Phone: '0542 555 0406', note: 'Kitap tahlili sunumlarında öne çıkıyor.' },
  { num: 407, first: 'Tuna', last: 'Çakır', gender: 'Erkek', birth: '2014-11-09', address: 'Kartaltepe Mah. Alpay İzer Sok. No: 3 Bakırköy', p1Name: 'Reyhan Çakır', p1Rel: 'Anne', p1Phone: '0532 555 0407', p2Name: 'Faruk Çakır', p2Rel: 'Baba', p2Phone: '0542 555 0407', note: 'Satranç kulübü üyesi, analitik düşünür.' },
  { num: 408, first: 'Bade', last: 'Güngör', gender: 'Kız', birth: '2014-03-24', address: 'Osmaniye Mah. Fabrikalar Cad. No: 18 Bakırköy', p1Name: 'Nevin Güngör', p1Rel: 'Anne', p1Phone: '0532 555 0408', p2Name: 'Salih Güngör', p2Rel: 'Baba', p2Phone: '0542 555 0408', note: 'Dengeli ve sorumluluk bilinci yüksek.' },
  { num: 409, first: 'Ozan', last: 'Korkmaz', gender: 'Erkek', birth: '2014-08-20', address: 'Sakızağacı Mah. Kennedy Cad. No: 71 Bakırköy', p1Name: 'Feyza Korkmaz', p1Rel: 'Anne', p1Phone: '0532 555 0409', p2Name: 'Harun Korkmaz', p2Rel: 'Baba', p2Phone: '0542 555 0409', note: 'Doğa bilimleri ve geri dönüşüm projesi lideri.' },
  { num: 410, first: 'Damla', last: 'Alkan', gender: 'Kız', birth: '2014-12-17', address: 'Cevizlik Mah. Mor Sümbül Sok. No: 15 Bakırköy', p1Name: 'Lale Alkan', p1Rel: 'Anne', p1Phone: '0532 555 0410', p2Name: 'Cavit Alkan', p2Rel: 'Baba', p2Phone: '0542 555 0410', note: 'Yazılı sınavlarda sınıf derecesi var.' },

  // 5-A Sınıfı (Ortaokul 5 - Doğum: 2013)
  { num: 501, first: 'Batu', last: 'Yaman', gender: 'Erkek', birth: '2013-02-11', address: 'Ataşehir Atatürk Mah. Sedef Cad. No: 10 Ataşehir', p1Name: 'İnci Yaman', p1Rel: 'Anne', p1Phone: '0532 555 0501', p2Name: 'Tarık Yaman', p2Rel: 'Baba', p2Phone: '0542 555 0501', note: 'Robotik kodlama ve Scratch projelerinde usta.' },
  { num: 502, first: 'Ayşe Naz', last: 'Aktaş', gender: 'Kız', birth: '2013-05-23', address: 'Barbaros Mah. Mor Zambak Sok. No: 4 Ataşehir', p1Name: 'Semra Aktaş', p1Rel: 'Anne', p1Phone: '0532 555 0502', p2Name: 'Recep Aktaş', p2Rel: 'Baba', p2Phone: '0542 555 0502', note: 'Matematik olimpiyat hazırlık grubu öğrencisi.' },
  { num: 503, first: 'Eymen', last: 'Şimşek', gender: 'Erkek', birth: '2013-09-08', address: 'İçerenköy Mah. Karslı Ahmet Cad. No: 28 Ataşehir', p1Name: 'Handan Şimşek', p1Rel: 'Anne', p1Phone: '0532 555 0503', p2Name: 'Kamil Şimşek', p2Rel: 'Baba', p2Phone: '0542 555 0503', note: 'Bilişim teknolojileri dersinde çok aktif.' },
  { num: 504, first: 'Ceylin', last: 'Baş', gender: 'Kız', birth: '2013-04-16', address: 'Küçükbakkalköy Mah. Işıklar Cad. No: 19 Ataşehir', p1Name: 'Gözde Baş', p1Rel: 'Anne', p1Phone: '0532 555 0504', p2Name: 'Erdem Baş', p2Rel: 'Baba', p2Phone: '0542 555 0504', note: 'İngilizce hikaye yazma yarışmasında ödülü var.' },
  { num: 505, first: 'Yağız', last: 'Gündüz', gender: 'Erkek', birth: '2013-10-31', address: 'Örnek Mah. Şehit Cahar Dudayev Cad. No: 61 Ataşehir', p1Name: 'Gülşen Gündüz', p1Rel: 'Anne', p1Phone: '0532 555 0505', p2Name: 'Tahir Gündüz', p2Rel: 'Baba', p2Phone: '0542 555 0505', note: 'Akıl oyunları ve algoritma kurma yeteneği güçlü.' },
  { num: 506, first: 'Tuana', last: 'Bayrak', gender: 'Kız', birth: '2013-07-04', address: 'Yeni Çamlıca Mah. Mithatpaşa Cad. No: 13 Ataşehir', p1Name: 'Zeliha Bayrak', p1Rel: 'Anne', p1Phone: '0532 555 0506', p2Name: 'Yavuz Bayrak', p2Rel: 'Baba', p2Phone: '0542 555 0506', note: 'Fen bilimleri laboratuvar çalışmalarında dikkatli.' },
  { num: 507, first: 'Hamza', last: 'Erdem', gender: 'Erkek', birth: '2013-01-20', address: 'Kayışdağı Mah. Uslu Cad. No: 40 Ataşehir', p1Name: 'Şerife Erdem', p1Rel: 'Anne', p1Phone: '0532 555 0507', p2Name: 'Fevzi Erdem', p2Rel: 'Baba', p2Phone: '0542 555 0507', note: 'Sosyal sorumluluk projelerinde öncü.' },
  { num: 508, first: 'İdil', last: 'Sönmez', gender: 'Kız', birth: '2013-08-15', address: 'İnönü Mah. Kartal Cad. No: 17 Ataşehir', p1Name: 'Mine Sönmez', p1Rel: 'Anne', p1Phone: '0532 555 0508', p2Name: 'Bülent Sönmez', p2Rel: 'Baba', p2Phone: '0542 555 0508', note: 'Düzenli ders çalışma alışkanlığına sahip.' },
  { num: 509, first: 'Selim', last: 'Tan', gender: 'Erkek', birth: '2013-11-25', address: 'Mevlana Mah. Anafartalar Cad. No: 22 Ataşehir', p1Name: 'Berrin Tan', p1Rel: 'Anne', p1Phone: '0532 555 0509', p2Name: 'Orhan Tan', p2Rel: 'Baba', p2Phone: '0542 555 0509', note: 'Veri analizi ve grafik okuma becerisi yüksek.' },
  { num: 510, first: 'Ceren', last: 'Dinç', gender: 'Kız', birth: '2013-03-09', address: 'Esatpaşa Mah. Ziya Paşa Cad. No: 9 Ataşehir', p1Name: 'Füsun Dinç', p1Rel: 'Anne', p1Phone: '0532 555 0510', p2Name: 'Korkut Dinç', p2Rel: 'Baba', p2Phone: '0542 555 0510', note: 'Türkçe dil bilgisi ve paragraf sorularında çok iyi.' },

  // 8-B Sınıfı (Ortaokul 8 - LGS Grubu - Doğum: 2010)
  { num: 801, first: 'Eren', last: 'Yıldız', gender: 'Erkek', birth: '2010-04-15', address: 'Bağlarbaşı Mah. İnönü Cad. No: 42 Maltepe / İstanbul', p1Name: 'Zeynep Yıldız', p1Rel: 'Anne', p1Phone: '0532 555 0801', p2Name: 'Kemal Yıldız', p2Rel: 'Baba', p2Phone: '0542 555 0801', note: 'LGS hazırlık grubu öğrencisi. Fen Bilimleri ve Matematik alanında proje üretmeye meraklı.' },
  { num: 802, first: 'Ezgi', last: 'Parlak', gender: 'Kız', birth: '2010-04-28', address: 'İdealtepe Mah. Sahilyolu Cad. No: 48 Maltepe', p1Name: 'Şebnem Parlak', p1Rel: 'Anne', p1Phone: '0532 555 0802', p2Name: 'Engin Parlak', p2Rel: 'Baba', p2Phone: '0542 555 0802', note: 'Fen Bilimleri yeni nesil sorularında tam isabet.' },
  { num: 803, first: 'Furkan', last: 'Aslan', gender: 'Erkek', birth: '2010-06-14', address: 'Küçükyalı Mah. Mektep Cad. No: 31 Maltepe', p1Name: 'Necla Aslan', p1Rel: 'Anne', p1Phone: '0532 555 0803', p2Name: 'Hüseyin Aslan', p2Rel: 'Baba', p2Phone: '0542 555 0803', note: 'Matematik EBOB-EKOK ve çarpanlar konusunda sınıf lideri.' },
  { num: 804, first: 'Zehra', last: 'Akın', gender: 'Kız', birth: '2010-08-03', address: 'Altayçeşme Mah. Çam Sok. No: 16 Maltepe', p1Name: 'Aysel Akın', p1Rel: 'Anne', p1Phone: '0532 555 0804', p2Name: 'Kemal Akın', p2Rel: 'Baba', p2Phone: '0542 555 0804', note: 'Düzenli soru çözümü ve hedef takibinde disiplinli.' },
  { num: 805, first: 'Tarık', last: 'Bilgin', gender: 'Erkek', birth: '2010-02-27', address: 'Zümrütevler Mah. Nil Cad. No: 85 Maltepe', p1Name: 'Reyhan Bilgin', p1Rel: 'Anne', p1Phone: '0532 555 0805', p2Name: 'Turgut Bilgin', p2Rel: 'Baba', p2Phone: '0542 555 0805', note: 'T.C. İnkılap Tarihi ve Atatürkçülük dersinde çok başarılı.' },
  { num: 806, first: 'Şevval', last: 'Altun', gender: 'Kız', birth: '2010-10-18', address: 'Feyzullah Mah. Serap Cad. No: 12 Maltepe', p1Name: 'Bahar Altun', p1Rel: 'Anne', p1Phone: '0532 555 0806', p2Name: 'Muzaffer Altun', p2Rel: 'Baba', p2Phone: '0542 555 0806', note: 'İngilizce denemelerinde 10/10 net yapıyor.' },
  { num: 807, first: 'Onur', last: 'Güven', gender: 'Erkek', birth: '2010-05-12', address: 'Girne Mah. Doğuş Cad. No: 37 Maltepe', p1Name: 'Sevda Güven', p1Rel: 'Anne', p1Phone: '0532 555 0807', p2Name: 'Ali Güven', p2Rel: 'Baba', p2Phone: '0542 555 0807', note: 'Mantık ve muhakeme sorularında stratejik yaklaşımları var.' },
  { num: 808, first: 'Sena', last: 'Duman', gender: 'Kız', birth: '2010-09-22', address: 'Cevizli Mah. Tugay Yolu Cad. No: 64 Maltepe', p1Name: 'Nilüfer Duman', p1Rel: 'Anne', p1Phone: '0532 555 0808', p2Name: 'Cemal Duman', p2Rel: 'Baba', p2Phone: '0542 555 0808', note: 'Zaman yönetimini denemelerde en iyi uygulayan öğrenci.' },
  { num: 809, first: 'Görkem', last: 'Çınar', gender: 'Erkek', birth: '2010-11-05', address: 'Yalı Mah. Rıhtım Cad. No: 19 Maltepe', p1Name: 'Canan Çınar', p1Rel: 'Anne', p1Phone: '0532 555 0809', p2Name: 'Vedat Çınar', p2Rel: 'Baba', p2Phone: '0542 555 0809', note: 'Deneme netlerini istikrarlı biçimde artırıyor.' },
  { num: 810, first: 'Buse', last: 'Karataş', gender: 'Kız', birth: '2010-07-16', address: 'Gülensu Mah. Emek Cad. No: 8 Maltepe', p1Name: 'Muazzez Karataş', p1Rel: 'Anne', p1Phone: '0532 555 0810', p2Name: 'Rıfat Karataş', p2Rel: 'Baba', p2Phone: '0542 555 0810', note: 'LGS Fen Bilimleri DNA ve Genetik Kod konusunda eksiksiz.' }
];

// Helper: Generates 5 rich boards per class with diverse subjects and doodle tools
const generateClassBoards = (grade, className) => {
  const ts = Date.now();
  const boards = [];

  if (grade === '1') {
    boards.push({
      name: `${className} - Türkçe: Harflerin Dünyası ve Hece Treni`,
      groupTitle: 'Türkçe Ders İçerikleri',
      color: '#3B82F6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🚂 1-A Türkçe: Sesler, Heceler ve Sözcükler', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 110, width: 420, height: 210, color: '#3b82f6', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 130, text: 'Ses Grubumuz: E - L - A - K - İ - N', fontSize: 20, color: '#60a5fa', width: 380, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 175, text: '• E + L = EL      • E + LA = ELA\n• A + K = AK      • A + Lİ = ALİ\n• K + EK = KEK    • N + A = NA', fontSize: 17, color: '#e2e8f0', width: 380, height: 80, timestamp: ts },
        { id: 'd1', type: 'line', lineStyle: 'arrow', x: 180, y: 270, endX: 300, endY: 270, color: '#fbbf24', size: 3, timestamp: ts },
        { id: 's1', type: 'sticky', x: 530, y: 110, text: '🎈 Günün İpucu:\nHarfleri birleştirirken sesleri uzatarak oku: "Eeee-llll -> EL"', color: '#fef08a', width: 220, height: 180, timestamp: ts },
        { id: 'st1', type: 'star', x: 440, y: 50, width: 45, height: 45, color: '#facc15', size: 3, timestamp: ts },
        { id: 'p1', type: 'pencil', color: '#ec4899', size: 3, points: [{ x: 100, y: 350 }, { x: 130, y: 340 }, { x: 170, y: 360 }, { x: 210, y: 340 }, { x: 250, y: 360 }], timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Matematik: Rakamlar ve Sayma Çemberi`,
      groupTitle: 'Matematik Ders İçerikleri',
      color: '#10B981',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🔢 1-A Matematik: 1\'den 20\'ye Rakamlar ve Sayma', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'c1', type: 'circle', x: 180, y: 200, width: 65, height: 65, color: '#10b981', size: 3, timestamp: ts },
        { id: 'c2', type: 'circle', x: 330, y: 200, width: 65, height: 65, color: '#06b6d4', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 160, y: 180, text: '3 Elma', fontSize: 18, color: '#34d399', width: 100, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 310, y: 180, text: '2 Elma', fontSize: 18, color: '#67e8f9', width: 100, height: 30, timestamp: ts },
        { id: 't4', type: 'text', x: 255, y: 185, text: '+', fontSize: 28, color: '#fbbf24', width: 40, height: 40, timestamp: ts },
        { id: 't5', type: 'text', x: 420, y: 185, text: '=  5 Elma!', fontSize: 24, color: '#f59e0b', width: 180, height: 40, timestamp: ts },
        { id: 's1', type: 'sticky', x: 530, y: 110, text: '🍎 Sayma Oyunu:\nEvdeki 10 farklı nesneyi tek tek sayıp deftere yazalım.', color: '#fed7aa', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Hayat Bilgisi: Okul Kuralları & Güvenli Yaşam`,
      groupTitle: 'Hayat Bilgisi',
      color: '#F59E0B',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🏫 Hayat Bilgisi: Okulumuzda Nezaket ve Güvenlik', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 420, height: 210, color: '#f59e0b', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Altın Kurallarımız:', fontSize: 20, color: '#fbbf24', width: 300, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 185, text: '1. Söz alarak konuşuruz.\n2. Koridorda koşmadan yürürüz.\n3. Arkadaşlarımızın sırasına saygı duyarız.', fontSize: 16, color: '#fef3c7', width: 380, height: 90, timestamp: ts },
        { id: 's1', type: 'sticky', x: 530, y: 120, text: '🤝 Nezaket Sözleri:\n• Lütfen\n• Teşekkür ederim\n• Özür dilerim\n• Günaydın', color: '#dcfce7', width: 220, height: 190, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Görsel Sanatlar: Şekiller ve Renk Çemberi`,
      groupTitle: 'Görsel Sanatlar',
      color: '#EC4899',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🎨 Görsel Sanatlar: Ana ve Ara Renkler', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'c1', type: 'circle', x: 140, y: 160, width: 45, height: 45, color: '#ef4444', size: 4, timestamp: ts },
        { id: 'c2', type: 'circle', x: 260, y: 160, width: 45, height: 45, color: '#3b82f6', size: 4, timestamp: ts },
        { id: 'c3', type: 'circle', x: 380, y: 160, width: 45, height: 45, color: '#eab308', size: 4, timestamp: ts },
        { id: 't2', type: 'text', x: 120, y: 225, text: 'Kırmızı', fontSize: 15, color: '#f87171', width: 80, height: 25, timestamp: ts },
        { id: 't3', type: 'text', x: 245, y: 225, text: 'Mavi', fontSize: 15, color: '#60a5fa', width: 80, height: 25, timestamp: ts },
        { id: 't4', type: 'text', x: 365, y: 225, text: 'Sarı', fontSize: 15, color: '#fde047', width: 80, height: 25, timestamp: ts },
        { id: 's1', type: 'sticky', x: 500, y: 120, text: '🖌️ Renk Karışımları:\nMavi + Sarı = Yeşil\nKırmızı + Mavi = Mor\nKırmızı + Sarı = Turuncu', color: '#fce7f3', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Müzik: Temel Notalar ve Ritim Kalıpları`,
      groupTitle: 'Müzik & Hareket',
      color: '#8B5CF6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🎵 Müzik: "Do-Re-Mi" Ses Merdiveni', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 440, height: 200, color: '#8b5cf6', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Ses Merdivenimiz: Do -> Re -> Mi -> Fa -> Sol', fontSize: 19, color: '#c084fc', width: 400, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 190, text: '• 2/4\'lük Temel Vuruş: "Van - Gel - Git"\n• El çırparak tempo tutma çalışması', fontSize: 16, color: '#f3e8ff', width: 380, height: 60, timestamp: ts },
        { id: 's1', type: 'sticky', x: 550, y: 120, text: '🎤 Şarkı Ezberi:\n"Daha Dün Annemizin Kollarında Yaşarken" şarkısı 2 kez söylenecek.', color: '#ede9fe', width: 220, height: 180, timestamp: ts }
      ]
    });
  } else if (grade === '2') {
    boards.push({
      name: `${className} - Türkçe: Eş & Zıt Anlamlı Kelimeler`,
      groupTitle: 'Türkçe Ders İçerikleri',
      color: '#10B981',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '📖 2-B Türkçe: Eş & Zıt Anlam Zihin Haritası', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 420, height: 220, color: '#10b981', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Eş Anlamlılar:      Zıt Anlamlılar:', fontSize: 18, color: '#34d399', width: 380, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• Cevap = Yanıt    |  • Sıcak <-> Soğuk\n• Mektep = Okul   |  • Büyük <-> Küçük\n• Al = Kırmızı     |  • Hızlı <-> Yavaş', fontSize: 16, color: '#ecfdf5', width: 380, height: 90, timestamp: ts },
        { id: 's1', type: 'sticky', x: 530, y: 120, text: '📝 Cümle Kurma:\nHer zıt anlamlı çiftle birer anlamlı cümle yazalım.', color: '#dcfce7', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Matematik: Çarpım Tablosu ve Saatler`,
      groupTitle: 'Matematik Ders İçerikleri',
      color: '#3B82F6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '⏰ 2-B Matematik: Çarpma İşlemi ve Analog Saat', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'c1', type: 'circle', x: 170, y: 200, width: 65, height: 65, color: '#3b82f6', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 310, text: 'Akrep saati, yelkovan dakikayı gösterir!', fontSize: 16, color: '#93c5fd', width: 350, height: 30, timestamp: ts },
        { id: 's1', type: 'sticky', x: 500, y: 120, text: '✖️ 3\'er Çarpım Tablosu:\n3x1=3, 3x2=6, 3x3=9\n3x4=12, 3x5=15, 3x6=18', color: '#dbeafe', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Hayat Bilgisi: Dört Mevsim ve Doğa Olayları`,
      groupTitle: 'Hayat Bilgisi',
      color: '#F59E0B',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🌦️ Hayat Bilgisi: Mevsimlerin Getirdikleri', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 440, height: 210, color: '#f59e0b', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Sonbahar -> Kış -> İlkbahar -> Yaz', fontSize: 20, color: '#fbbf24', width: 400, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 185, text: '• Yağmur, dolu, kar nasıl oluşur?\n• Ağaçların yaprak dökümü ve tomurcuklanması', fontSize: 16, color: '#fef3c7', width: 400, height: 60, timestamp: ts },
        { id: 's1', type: 'sticky', x: 550, y: 120, text: '🍂 Sonbahar Gözlemi:\nBahçeden 3 farklı yaprak toplayıp deftere yapıştırıyoruz.', color: '#fed7aa', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - İngilizce: My Family & Classroom Objects`,
      groupTitle: 'İngilizce',
      color: '#8B5CF6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🇬🇧 2-B English: Family Members & Objects', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 420, height: 210, color: '#8b5cf6', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Family Words:      Classroom Words:', fontSize: 18, color: '#c084fc', width: 380, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• Mother (Mom)     |  • Pencil / Eraser\n• Father (Dad)     |  • Book / Notebook\n• Sister / Brother |  • Desk / Chair', fontSize: 16, color: '#f3e8ff', width: 380, height: 90, timestamp: ts },
        { id: 's1', type: 'sticky', x: 530, y: 120, text: '💬 Dialogue:\n"Who is this?"\n"This is my sister!"', color: '#ede9fe', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Beden Eğitimi: Sağlıklı Yaşam ve Duruş`,
      groupTitle: 'Sağlık ve Spor',
      color: '#06B6D4',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🏃 2-B Beden Eğitimi: Doğru Postür ve Hareket', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 420, height: 200, color: '#06b6d4', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Günlük Egzersiz Rutini:', fontSize: 19, color: '#67e8f9', width: 380, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 185, text: '• Sabah esneme hareketleri (10 dk)\n• Derste dik oturma kuralı\n• Günde en az 6-8 bardak temiz su', fontSize: 16, color: '#ecfeff', width: 380, height: 80, timestamp: ts },
        { id: 's1', type: 'sticky', x: 530, y: 120, text: '💧 Su Takip Kartı:\nİçilen her bardak su için kutucuğa bir yıldız çiz!', color: '#cffafe', width: 220, height: 180, timestamp: ts }
      ]
    });
  } else if (grade === '3') {
    boards.push({
      name: `${className} - Fen Bilimleri: Dünyanın Katmanları & Kayaçlar`,
      groupTitle: 'Fen Bilimleri',
      color: '#8B5CF6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🌍 3-A Fen Bilimleri: Gezegenimizin Katmanları', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'c1', type: 'circle', x: 180, y: 190, width: 75, height: 75, color: '#8b5cf6', size: 3, timestamp: ts },
        { id: 'c2', type: 'circle', x: 180, y: 190, width: 45, height: 45, color: '#ef4444', size: 2, timestamp: ts },
        { id: 't2', type: 'text', x: 280, y: 140, text: '1. Gaz Katmanı (Atmosfer)\n2. Su Katmanı (Hidrosfer)\n3. Taş Katmanı (Litosfer)\n4. Ateş Küre (Manto/Magma)\n5. Ağır Küre (Çekirdek)', fontSize: 16, color: '#e2e8f0', width: 260, height: 130, timestamp: ts },
        { id: 's1', type: 'sticky', x: 560, y: 110, text: '🔬 Laboratuvar Notu:\nFosil oluşumu için tortul kayaçlar incelenecek.', color: '#ddd6fe', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Matematik: Geometrik Cisimler ve Açılar`,
      groupTitle: 'Matematik Ders İçerikleri',
      color: '#3B82F6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '📐 3-A Matematik: Küp, Prizma ve Silindir', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 100, y: 130, width: 120, height: 120, color: '#3b82f6', size: 3, timestamp: ts },
        { id: 'tr1', type: 'triangle', x: 260, y: 130, width: 120, height: 120, color: '#10b981', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 270, text: 'Kare Prizma (6 Yüz)', fontSize: 16, color: '#93c5fd', width: 150, height: 25, timestamp: ts },
        { id: 't3', type: 'text', x: 260, y: 270, text: 'Üçgen Prizma', fontSize: 16, color: '#6ee7b7', width: 150, height: 25, timestamp: ts },
        { id: 's1', type: 'sticky', x: 440, y: 120, text: '💡 Köşe & Ayrıt Kuralı:\nKüpün 8 köşesi, 12 ayrıtı ve 6 birbirine eşit karesel yüzü vardır.', color: '#dbeafe', width: 240, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Türkçe: Noktalama İşaretleri ve Yazım Kuralları`,
      groupTitle: 'Türkçe Ders İçerikleri',
      color: '#EC4899',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '✍️ 3-A Türkçe: Noktalama Kahramanları', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 440, height: 220, color: '#ec4899', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'İşaretler ve Görevleri:', fontSize: 19, color: '#f472b6', width: 300, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• Nokta (.): Tamamlanmış cümle sonuna konur.\n• Virgül (,): Eş görevli kelimeler arasına konur.\n• Soru İşareti (?): Soru bildiren cümle sonuna konur.\n• Ünlem (!): Sevinç, korku ve şaşkınlık bildirir.', fontSize: 15, color: '#fdf2f8', width: 400, height: 110, timestamp: ts },
        { id: 's1', type: 'sticky', x: 550, y: 120, text: '🎯 Alıştırma:\n"Eyvah çantamı serviste unuttum" cümlesine uygun işaretleri yerleştir.', color: '#fce7f3', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Hayat Bilgisi: Trafik İşaretleri ve Güvenlik`,
      groupTitle: 'Hayat Bilgisi',
      color: '#F59E0B',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🚦 3-A Hayat Bilgisi: Trafik Bilinci', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 420, height: 200, color: '#f59e0b', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Işıklı İşaret Cihazı Kuralları:', fontSize: 18, color: '#fbbf24', width: 380, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 185, text: '• Kırmızı: Dur ve bekle\n• Sarı: Hazırlan\n• Yeşil: Dikkatle geç', fontSize: 16, color: '#fef3c7', width: 380, height: 80, timestamp: ts },
        { id: 's1', type: 'sticky', x: 530, y: 120, text: '📞 Acil Numaralar:\n112: Acil Çağrı Merkezi\n(Polis, İtfaiye, Ambulans tek numara)', color: '#fed7aa', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Bilişim: Algoritma ve Karınca Labirenti`,
      groupTitle: 'Bilişim & Kodlama',
      color: '#06B6D4',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🐜 3-A Bilişim: Algoritma ve Yön Komutları', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 440, height: 210, color: '#06b6d4', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Karıncayı Şekerine Ulaştır!', fontSize: 19, color: '#67e8f9', width: 380, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '1. 3 Adım İleri Git -> [->]\n2. Sağa Dön -> [↷]\n3. 2 Adım İleri Git -> [->]\n4. Şekeri Al -> [★]', fontSize: 16, color: '#ecfeff', width: 380, height: 90, timestamp: ts },
        { id: 's1', type: 'sticky', x: 550, y: 120, text: '🤖 Algoritma Nedir?\nBir problemi çözmek için adım adım takip edilen yoldur.', color: '#cffafe', width: 220, height: 180, timestamp: ts }
      ]
    });
  } else if (grade === '4') {
    boards.push({
      name: `${className} - Sosyal Bilgiler: Milli Mücadele ve Kahramanlarımız`,
      groupTitle: 'Sosyal Bilgiler',
      color: '#F59E0B',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🇹🇷 4-C Sosyal Bilgiler: Milli Mücadele Zaman Çizelgesi', fontSize: 26, color: '#f8fafc', width: 660, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 450, height: 220, color: '#f59e0b', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Tarihi Dönüm Noktaları:', fontSize: 19, color: '#fbbf24', width: 400, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• 19 Mayıs 1919: Samsun\'a Çıkış\n• 23 Nisan 1920: TBMM\'nin Açılışı\n• 29 Ekim 1923: Cumhuriyetin İlanı', fontSize: 16, color: '#fef3c7', width: 400, height: 90, timestamp: ts },
        { id: 's1', type: 'sticky', x: 560, y: 120, text: '🎖️ Kahramanlarımız:\nŞerife Bacı, Hasan Tahsin, Sütçü İmam ve Kazım Karabekir Paşa.', color: '#fed7aa', width: 230, height: 190, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Fen Bilimleri: Besin İçerikleri ve Dengeli Beslenme`,
      groupTitle: 'Fen Bilimleri',
      color: '#10B981',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🥗 4-C Fen Bilimleri: Besin Grupları Tablosu', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 440, height: 210, color: '#10b981', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Besinler ve Vücuttaki Görevleri:', fontSize: 18, color: '#34d399', width: 400, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• Karbonhidratlar: Enerji verici (Ekmek, makarna)\n• Proteinler: Yapıcı ve onarıcı (Et, yumurta, süt)\n• Yağlar: Yedek enerji deposu (Zeytin, ceviz)\n• Vitamin & Mineraller: Düzenleyici (Meyveler)', fontSize: 15, color: '#ecfdf5', width: 400, height: 100, timestamp: ts },
        { id: 's1', type: 'sticky', x: 550, y: 120, text: '🍎 Sağlıklı Tabak:\nHer öğünde 4 temel gruptan dengeli porsiyonlar tüketmeliyiz.', color: '#dcfce7', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Matematik: Kesirlerle İşlemler & Pasta Grafiği`,
      groupTitle: 'Matematik Ders İçerikleri',
      color: '#3B82F6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🍰 4-C Matematik: Kesir Çeşitleri ve Modelleme', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'c1', type: 'circle', x: 170, y: 180, width: 60, height: 60, color: '#3b82f6', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 270, text: 'Basit Kesir: 3/4  (Pay < Payda)\nBileşik Kesir: 5/3 (Pay >= Payda)\nTam Sayılı Kesir: 2 tam 1/2', fontSize: 16, color: '#bfdbfe', width: 350, height: 90, timestamp: ts },
        { id: 's1', type: 'sticky', x: 480, y: 120, text: '📐 İpucu:\nPay kaç parçanın alındığını, payda bütünün kaça bölündüğünü gösterir.', color: '#dbeafe', width: 240, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - İngilizce: Occupations & Daily Routines`,
      groupTitle: 'İngilizce',
      color: '#8B5CF6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '💼 4-C English: Jobs & Daily Routines', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 420, height: 210, color: '#8b5cf6', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Jobs:            Where they work:', fontSize: 18, color: '#c084fc', width: 380, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• Doctor         |  Hospital\n• Teacher        |  School\n• Pilot          |  Airport\n• Chef           |  Restaurant', fontSize: 16, color: '#f3e8ff', width: 380, height: 90, timestamp: ts },
        { id: 's1', type: 'sticky', x: 530, y: 120, text: '❓ Questions:\n"What is your job?"\n"I am an architect."', color: '#ede9fe', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - İnsan Hakları: Haklarımız ve Sorumluluklarımız`,
      groupTitle: 'İnsan Hakları & Demokrasi',
      color: '#EC4899',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '⚖️ 4-C İnsan Hakları: Hak ve Özgürlük Dengesi', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 440, height: 210, color: '#ec4899', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Temel Çocuk Haklarımız:', fontSize: 19, color: '#f472b6', width: 400, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '1. Yaşama ve sağlık hakkı\n2. Nitelikli eğitim alma hakkı\n3. Düşüncelerini özgürce ifade etme hakkı\n4. Oyun oynama ve dinlenme hakkı', fontSize: 15, color: '#fdf2f8', width: 400, height: 100, timestamp: ts },
        { id: 's1', type: 'sticky', x: 550, y: 120, text: '🤝 Unutma:\nBenim özgürlüğüm, başkasının hakkının başladığı yerde biter.', color: '#fce7f3', width: 220, height: 180, timestamp: ts }
      ]
    });
  } else if (grade === '5') {
    boards.push({
      name: `${className} - Matematik: Kesirler, Ondalık Gösterim & Yüzdeler`,
      groupTitle: 'Matematik Ders İçerikleri',
      color: '#EC4899',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '📊 5-A Matematik: Ondalık ve Yüzde Dönüşümleri', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 440, height: 220, color: '#ec4899', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Dönüşüm Zinciri:', fontSize: 19, color: '#f472b6', width: 400, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• 1/2  =  0,50  =  %50\n• 1/4  =  0,25  =  %25\n• 3/4  =  0,75  =  %75\n• 1/5  =  0,20  =  %20', fontSize: 17, color: '#fdf2f8', width: 400, height: 100, timestamp: ts },
        { id: 's1', type: 'sticky', x: 550, y: 120, text: '🏷️ Alışveriş Problemi:\n300 TL\'lik mont %20 indirimle kaça satılır?\n300 x 0,20 = 60 TL indirim -> 240 TL', color: '#fbcfe8', width: 230, height: 190, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Fen Bilimleri: Ay\'ın Evreleri ve Güneş Sistemi`,
      groupTitle: 'Fen Bilimleri',
      color: '#8B5CF6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🌙 5-A Fen Bilimleri: Ay\'ın 4 Ana Evresi', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'c1', type: 'circle', x: 130, y: 160, width: 40, height: 40, color: '#64748b', size: 3, timestamp: ts },
        { id: 'c2', type: 'circle', x: 230, y: 160, width: 40, height: 40, color: '#c084fc', size: 3, timestamp: ts },
        { id: 'c3', type: 'circle', x: 330, y: 160, width: 40, height: 40, color: '#facc15', size: 3, timestamp: ts },
        { id: 'c4', type: 'circle', x: 430, y: 160, width: 40, height: 40, color: '#93c5fd', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 225, text: 'Yeni Ay      İlk Dördün     Dolunay     Son Dördün', fontSize: 15, color: '#e2e8f0', width: 420, height: 25, timestamp: ts },
        { id: 's1', type: 'sticky', x: 530, y: 110, text: '🔭 Bilgi Notu:\nAy\'ın iki ana evresi arasındaki süre yaklaşık 1 haftadır (7 gün).', color: '#ddd6fe', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Bilişim: Scratch ile Blok Kodlama ve Döngüler`,
      groupTitle: 'Bilişim Teknolojileri',
      color: '#06B6D4',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '💻 5-A Bilişim: Scratch Blokları ve Akış', fontSize: 26, color: '#f8fafc', width: 600, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 430, height: 220, color: '#06b6d4', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Temel Blok Grupları:', fontSize: 19, color: '#67e8f9', width: 380, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• [Olaylar]: Yeşil bayrağa tıklandığında\n• [Hareket]: 10 adım git, 15 derece dön\n• [Kontrol]: 10 defa tekrarla, eğer... ise\n• [Algılama]: Fareye değiyor mu?', fontSize: 15, color: '#ecfeff', width: 380, height: 100, timestamp: ts },
        { id: 's1', type: 'sticky', x: 540, y: 120, text: '🎮 Proje Görevi:\nKedi karakterinin klavye tuşlarıyla hareket edip elma toplamasını sağla.', color: '#cffafe', width: 230, height: 190, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Türkçe: Söz Sanatları (Benzetme & Kişileştirme)`,
      groupTitle: 'Türkçe Ders İçerikleri',
      color: '#3B82F6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '📜 5-A Türkçe: Şiir ve Düz Yazıda Edebi Sanatlar', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 430, height: 210, color: '#3b82f6', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Benzetme (Teşbih) & Kişileştirme (Teşhis):', fontSize: 18, color: '#60a5fa', width: 400, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• "Kömür gibi kara gözleri vardı." (Benzetme)\n• "Rüzgar dağların ardında ağlıyordu." (Kişileştirme)\n• "Buz gibi soğuk su içti." (Benzetme)', fontSize: 15, color: '#eff6ff', width: 400, height: 90, timestamp: ts },
        { id: 's1', type: 'sticky', x: 540, y: 120, text: '✍️ Görev:\nİçinde hem kişileştirme hem benzetme geçen 4 dizelik bir kıta yaz.', color: '#dbeafe', width: 220, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - Sosyal Bilgiler: Anadolu & Mezopotamya Medeniyetleri`,
      groupTitle: 'Sosyal Bilgiler',
      color: '#F59E0B',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🏛️ 5-A Sosyal: İlk Çağ Medeniyetleri Keşfi', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 430, height: 220, color: '#f59e0b', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Uygarlıklar ve Mirasları:', fontSize: 19, color: '#fbbf24', width: 380, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• Sümerler: Çivi yazısı, Zigguratlar, tekerlek\n• Hititler: Kadeş Antlaşması, Pankuş Meclisi\n• Lidyalılar: Paranın icadı, Kral Yolu\n• Frigler: Tarım yasaları, Fibula çengelli iğne', fontSize: 15, color: '#fef3c7', width: 380, height: 100, timestamp: ts },
        { id: 's1', type: 'sticky', x: 540, y: 120, text: '📜 Tarih Notu:\nM.Ö. 3200\'de Sümerlerin yazıyı bulmasıyla Tarih Çağları başlamıştır.', color: '#fed7aa', width: 220, height: 180, timestamp: ts }
      ]
    });
  } else {
    // 8-B (LGS)
    boards.push({
      name: `${className} - LGS Matematik: Çarpanlar, Katlar & EBOB-EKOK`,
      groupTitle: 'LGS Matematik',
      color: '#06B6D4',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🎯 8-B LGS Matematik: EBOB-EKOK Stratejileri', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 460, height: 250, color: '#06b6d4', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Altın Formüller & Problem Tipleri:', fontSize: 19, color: '#67e8f9', width: 420, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '1. Parçadan Bütüne -> EKOK (Nöbet, otobüs, fayans)\n2. Bütünden Parçaya -> EBOB (Şişeleme, çuval, ağaç dikme)\n3. Formül: a x b = EBOB(a,b) x EKOK(a,b)\n4. Aralarında Asal Sayılar: EBOB=1, EKOK=a x b', fontSize: 15, color: '#ecfeff', width: 420, height: 110, timestamp: ts },
        { id: 's1', type: 'sticky', x: 570, y: 120, text: '🚨 LGS Kritik Uyarı:\nSoruda "en az", "en çok" ifadeleri ezberlenmemeli, problemin akışına bakılmalıdır.', color: '#cffafe', width: 230, height: 200, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - LGS Fen Bilimleri: DNA, Genetik Kod & Kalıtım`,
      groupTitle: 'LGS Fen Bilimleri',
      color: '#10B981',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🧬 8-B LGS Fen: DNA Eşlenmesi & Çaprazlama', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 460, height: 240, color: '#10b981', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Organik Baz Eşleşmesi & Sıralama:', fontSize: 19, color: '#34d399', width: 420, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• Adenin (A) <-> Timin (T) [2\'li hidrojen bağı]\n• Guanin (G) <-> Sitozin (C) [3\'lü hidrojen bağı]\n• Karmaşıktan Basite: KROMOZOM > DNA > GEN > NÜKLEOTİT (KediGeNi)', fontSize: 15, color: '#ecfdf5', width: 420, height: 100, timestamp: ts },
        { id: 's1', type: 'sticky', x: 570, y: 120, text: '🌱 Mendel Çaprazlaması:\nAa x Aa çaprazlamasında:\nGenotip: 1/4 AA, 2/4 Aa, 1/4 aa\nFenotip: %75 Baskın, %25 Çekinik', color: '#dcfce7', width: 230, height: 190, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - LGS Türkçe: Fiilimsiler (Eylemsiler) Zihin Haritası`,
      groupTitle: 'LGS Türkçe',
      color: '#EC4899',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '📝 8-B LGS Türkçe: Fiilimsi Ekleri Kodlaması', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 460, height: 230, color: '#ec4899', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: '3 Temel Fiilimsi Grubu:', fontSize: 19, color: '#f472b6', width: 420, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '1. İsim-Fiil: -ma, -ış, -mak (MAYIŞMAK)\n2. Sıfat-Fiil: -an, -ası, -mez, -ar, -dik, -ecek, -miş\n3. Zarf-Fiil: -ken, -alı, -esiye, -meden, -erek, -ince (Kenyalı asiye...)', fontSize: 15, color: '#fdf2f8', width: 420, height: 100, timestamp: ts },
        { id: 's1', type: 'sticky', x: 570, y: 120, text: '💡 Tuzak:\nKalıcı isimlere dikkat! "Dondurma", "dolma", "çakmak" artık fiilimsi değildir.', color: '#fbcfe8', width: 230, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - LGS İnkılap Tarihi: Bir Kahraman Doğuyor & Kongreler`,
      groupTitle: 'LGS İnkılap Tarihi',
      color: '#F59E0B',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🇹🇷 8-B İnkılap Tarihi: Genelgeler ve Kongreler', fontSize: 26, color: '#f8fafc', width: 640, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 460, height: 230, color: '#f59e0b', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Kurtuluş Savaşı\'nın Yol Haritası:', fontSize: 19, color: '#fbbf24', width: 420, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• Havza Genelgesi: İlk milli bilinç uyanışı\n• Amasya Genelgesi: Kurtuluşun amaç, gerekçe ve yöntemi\n• Erzurum Kongresi: Toplanış bölgesel, kararlar milli\n• Sivas Kongresi: Tüm cemiyetler birleşti (Milli Birlik)', fontSize: 15, color: '#fef3c7', width: 420, height: 100, timestamp: ts },
        { id: 's1', type: 'sticky', x: 570, y: 120, text: '⚖️ Amasya İlkesi:\n"Milletin bağımsızlığını yine milletin azim ve kararı kurtaracaktır."', color: '#fed7aa', width: 230, height: 180, timestamp: ts }
      ]
    });
    boards.push({
      name: `${className} - LGS İngilizce: Friendship & Teen Life Master Notes`,
      groupTitle: 'LGS İngilizce',
      color: '#8B5CF6',
      elements: [
        { id: 't1', type: 'text', x: 80, y: 50, text: '🇬🇧 8-B LGS English: Unit 1 Friendship Patterns', fontSize: 26, color: '#f8fafc', width: 620, height: 40, timestamp: ts },
        { id: 'r1', type: 'rect', x: 80, y: 120, width: 460, height: 230, color: '#8b5cf6', size: 3, timestamp: ts },
        { id: 't2', type: 'text', x: 100, y: 140, text: 'Making / Accepting / Refusing Offers:', fontSize: 19, color: '#c084fc', width: 420, height: 30, timestamp: ts },
        { id: 't3', type: 'text', x: 100, y: 180, text: '• Would you like to join us? -> Sure, that sounds fun! (Accept)\n• I\'d love to, but I can\'t. I have to study. (Refuse with reason)\n• Good friend qualities: Honest, generous, supportive, reliable\n• Bad friend qualities: Stubborn, sneaky, selfish, jealous', fontSize: 15, color: '#f3e8ff', width: 420, height: 100, timestamp: ts },
        { id: 's1', type: 'sticky', x: 570, y: 120, text: '⭐ Key Phrasal Verbs:\n• Count on / Rely on: Güvenmek\n• Back up: Desteklemek\n• Get on well with: İyi anlaşmak', color: '#ede9fe', width: 230, height: 180, timestamp: ts }
      ]
    });
  }

  return boards;
};

// Generates at least 10 grade-tailored assignments per class
const generateClassAssignments = (grade, className) => {
  const assignments = [];
  const now = new Date();

  const createDueDate = (dayOffset) => {
    const d = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    return d;
  };

  const poolByGrade = {
    '1': [
      { title: 'A ve E Sesi Heceleme ve Yazma Çalışması', subject: 'Türkçe', topic: 'İlk Okuma Yazma', desc: 'Ders kitabındaki sayfa 24 ve 25\'teki "A" ve "E" sesleriyle kurulan heceleri güzel yazı defterinize 3\'er satır yazınız.', offset: 2 },
      { title: '1\'den 10\'a Kadar Rakamları Çizme ve Sayma', subject: 'Matematik', topic: 'Doğal Sayılar', desc: 'Evdeki fasulyelerden 10 tanesini sırayla sayarak her sayının yanına bir meyve çizimi yapınız.', offset: 3 },
      { title: 'Okul Eşyalarını Koruma ve Çanta Hazırlığı', subject: 'Hayat Bilgisi', topic: 'Okulumuzda Hayat', desc: 'Ders programına göre yarınki derslerin kitap ve defterlerini ebeveyniniz gözetiminde çantanıza yerleştiriniz.', offset: 1 },
      { title: 'Temel Renklerle Geometrik Şekil Boyama', subject: 'Görsel Sanatlar', topic: 'Renk Bilgisi', desc: 'Kareyi kırmızıya, daireyi maviye, üçgeni sarıya boyayarak oluşturduğunuz resmi derse getiriniz.', offset: 5 },
      { title: 'Ritim Tutma ve Şarkı Söyleme Alıştırması', subject: 'Müzik', topic: 'Ritim Kalıpları', desc: '"Kırmızı Balık" şarkısını el çırparak ritim eşliğinde söyleme provası yapınız.', offset: 4 },
      { title: 'K ve İ Sesi Sözcük Oluşturma', subject: 'Türkçe', topic: 'Hece ve Kelime', desc: '"EK", "KİK", "AK" sözcüklerini sesli okuyup aile büyüğünüze dinletiniz.', offset: -2 },
      { title: 'Nesneleri Karşılaştırma (Büyük - Küçük)', subject: 'Matematik', topic: 'Uzamsal İlişkiler', desc: 'Evdeki nesnelerden 3 çift büyük-küçük eşya bulup defterinize resmediniz.', offset: 6 },
      { title: 'Kişisel Bakım ve Temizlik Kuralları', subject: 'Hayat Bilgisi', topic: 'Sağlıklı Hayat', desc: 'Yemekten önce ve sonra el yıkama adımlarını anlatan 3 maddelik kural listesi hazırlayınız.', offset: 7 },
      { title: 'Tekerleme Ezberleme ve Sesli Okuma', subject: 'Türkçe', topic: 'Akıcı Okuma', desc: '"Komşu komşu hu" tekerlemesini ritmik olarak ezberleyiniz.', offset: 8 },
      { title: 'Sayı Doğrusunda 1 Adım İleri 1 Adım Geri', subject: 'Matematik', topic: 'Toplama ve Çıkarma', desc: '1\'den 10\'a kadar sayı doğrusu çizip parmağınızla tavşan gibi zıplayarak toplama yapınız.', offset: 10 }
    ],
    '2': [
      { title: 'Zıt Anlamlı Kelimeler Eşleştirme Kartları', subject: 'Türkçe', topic: 'Sözcükte Anlam', desc: '10 çift zıt anlamlı sözcüğü kartonlara yazıp keserek evde eşleştirme oyunu oynayınız.', offset: 2 },
      { title: '2\'şer ve 5\'er Ritmik Sayma Çizelgesi', subject: 'Matematik', topic: 'Doğal Sayılar', desc: '100\'e kadar 5\'er ve 50\'ye kadar 2\'şer ritmik saymaları defterinize renkli kalemlerle yazınız.', offset: 3 },
      { title: 'Akrabalık İlişkileri ve Soy Ağacı Posteri', subject: 'Hayat Bilgisi', topic: 'Ailemiz', desc: 'Anneanne, babaanne, dede, teyze, amca ve dayılarınızı gösteren basit bir aile ağacı hazırlayınız.', offset: 4 },
      { title: 'Animals & Colours Vocabulary Quiz', subject: 'İngilizce', topic: 'Unit 2: Animals', desc: '10 hayvan ismini ve rengini İngilizce yazarak ses kaydı alınız veya deftere not ediniz.', offset: 5 },
      { title: 'Toplama ve Çıkarma Problemleri (10 Soru)', subject: 'Matematik', topic: 'Problem Çözme', desc: 'Ders kitabı sayfa 45\'teki iki adımlı eldeli toplama ve onluk bozarak çıkarma problemlerini çözünüz.', offset: 1 },
      { title: 'Okuduğunu Anlama: Küçük Karınca Metni', subject: 'Türkçe', topic: 'Okuduğunu Anlama', desc: 'Fotokopideki hikayeyi 2 kez okuyup altındaki 5 soruyu tam cümlelerle yanıtlayınız.', offset: -1 },
      { title: 'Mevsim Şeridi ve Hava Durumu Günlüğü', subject: 'Hayat Bilgisi', topic: 'Doğa ve Çevre', desc: 'Bir hafta boyunca her gün hava durumunu simgelerle (güneşli, bulutlu, yağmurlu) işaretleyiniz.', offset: 6 },
      { title: 'Çarpma İşlemi Modellemesi (Tabaklar ve Elmalar)', subject: 'Matematik', topic: 'Çarpma İşlemi', desc: '3 tabak ve her tabakta 4 elma çizerek 3 x 4 = 12 işlemini modelleyiniz.', offset: 7 },
      { title: 'Nezaket Kuralları Konulu Kısa Diyalog', subject: 'Türkçe', topic: 'İletişim Becerileri', desc: 'Bir mağazada alışveriş yaparken kullanılacak nezaket sözcüklerini içeren 4 satırlık diyalog yazınız.', offset: 8 },
      { title: 'Doğru Oturuş ve Kitap Okuma Mesafesi', subject: 'Beden Eğitimi', topic: 'Sağlık ve Postür', desc: 'Masa başında kitap okurken göz-kitap mesafesini cetvelle ölçüp doğru oturuşu fotoğraflayınız.', offset: 11 }
    ],
    '3': [
      { title: 'Gezegenimizin Katmanları Maketi veya Çizimi', subject: 'Fen Bilimleri', topic: 'Gezegenimizi Tanıyalım', desc: 'Oyun hamuru kullanarak veya pastel boya ile Dünya\'nın 5 katmanını kesit olarak gösteriniz.', offset: 3 },
      { title: 'Üç Basamaklı Sayılarla Eldeli Toplama ve Çıkarma', subject: 'Matematik', topic: 'Doğal Sayılarla İşlemler', desc: 'Kitap sayfa 62\'deki 15 adet üç basamaklı toplama ve çıkarma alıştırmasını çözünüz.', offset: 2 },
      { title: 'Hikaye Unsurları (Olay, Yer, Zaman, Kişiler)', subject: 'Türkçe', topic: 'Metin İnceleme', desc: 'Okuduğunuz 20 sayfalık hikaye kitabının serim, düğüm, çözüm ve ana fikrini çıkarınız.', offset: 1 },
      { title: 'Trafik İşaret Levhaları Anlam Tablosu', subject: 'Hayat Bilgisi', topic: 'Trafik Güvenliği', desc: 'Tehlike uyarı, tanzim ve bilgi levhalarından üçer tanesini çizip anlamlarını yazınız.', offset: 5 },
      { title: 'Feelings and Emotions Matching Exercise', subject: 'İngilizce', topic: 'Unit 3: Feelings', desc: '"Happy, sad, energetic, tired, hungry" ifadelerini örnek durum cümleleriyle eşleştiriniz.', offset: 4 },
      { title: 'Kuvvetin Cisimler Üzerindeki Etkileri Deneyi', subject: 'Fen Bilimleri', topic: 'Kuvvet ve Hareket', desc: 'Sünger, paket lastiği ve oyun hamuruna kuvvet uygulayarak şekil değişikliğini gözlemleyip yazınız.', offset: 6 },
      { title: 'Çevre Temizliği ve Geri Dönüşüm Projesi', subject: 'Fen Bilimleri', topic: 'Canlılar Dünyası', desc: 'Evdeki kağıt, plastik ve cam atıkları 3 gün boyunca ayrıştırıp miktarlarını kaydediniz.', offset: 7 },
      { title: 'Geometrik Örüntüler ve Süslemeler', subject: 'Matematik', topic: 'Örüntü ve Süslemeler', desc: 'Kare, üçgen ve daire kullanarak defterinize 4 adımlı renkli bir kenar süslemesi tasarlayınız.', offset: 8 },
      { title: 'Yazım Kuralları: "de" ve "ki" Bağlaçları', subject: 'Türkçe', topic: 'Yazım Kuralları', desc: 'Ek olan "-de" ile bağlaç olan "de"yi ayırt eden 10 cümlelik alıştırma kağıdını tamamlayınız.', offset: -3 },
      { title: 'Scratch Karınca Labirenti Akış Şeması', subject: 'Bilişim Teknolojileri', topic: 'Algoritma', desc: 'Labirentten çıkış adımlarını ok ve yön sembolleriyle kağıt üzerinde şemalandırınız.', offset: 12 }
    ],
    '4': [
      { title: 'Milli Mücadele Kahramanı Biyografisi Sunumu', subject: 'Sosyal Bilgiler', topic: 'Milli Mücadele', desc: 'Şerife Bacı veya Kazım Karabekir Paşa\'nın hayatını araştırıp 1 sayfalık özet hazırlayınız.', offset: 2 },
      { title: 'Dört İşlem Karışık Problem Çözümü (15 Soru)', subject: 'Matematik', topic: 'Problem Çözme', desc: 'Parantezli işlemler ve kat problemlerinden oluşan çalışma yaprağını eksiksiz çözünüz.', offset: 1 },
      { title: 'Besin Piramidi ve 3 Günlük Sağlıklı Menü', subject: 'Fen Bilimleri', topic: 'Besinlerimiz', desc: 'Karbonhidrat, protein, yağ ve vitamin dengesini gözeten 3 günlük örnek kahvaltı/öğle/akşam menüsü oluşturunuz.', offset: 4 },
      { title: 'My Daily Routine - Poster and Speech', subject: 'İngilizce', topic: 'Daily Life', desc: 'Sabah uyanıştan gece yatışa kadar 8 eylemi saatleriyle birlikte İngilizce olarak posterleştiriniz.', offset: 5 },
      { title: 'Kesirlerle Toplama ve Çıkarma İşlemleri', subject: 'Matematik', topic: 'Kesirler', desc: 'Paydaları eşit kesirlerle toplama ve çıkarma alıştırmalarından oluşan 20 soruyu çözünüz.', offset: 3 },
      { title: 'Çocuk Hakları Sözleşmesi Maddeleri İncelemesi', subject: 'İnsan Hakları', topic: 'Çocuk Hakları', desc: 'BM Çocuk Hakları Bildirgesi\'nden seçtiğiniz 3 maddeyi günlük hayattan örneklerle açıklayınız.', offset: 6 },
      { title: 'Maddenin Halleri ve Isı Etkisiyle Değişim', subject: 'Fen Bilimleri', topic: 'Maddenin Özellikleri', desc: 'Erime, donma, buharlaşma ve yoğuşma olaylarını evdeki su ve buz örnekleriyle gözlemleyip yazınız.', offset: 7 },
      { title: 'Atasözleri ve Deyimler Sözlüğü Kartları', subject: 'Türkçe', topic: 'Deyim ve Atasözü', desc: '5 atasözü ve 5 deyimi resmederek anlamlarını kartın arkasına yazınız.', offset: -2 },
      { title: 'Türkiye Haritası Üzerinde Coğrafi Bölgeler', subject: 'Sosyal Bilgiler', topic: 'İnsanlar ve Yerler', desc: 'Dilsiz Türkiye haritasında 7 coğrafi bölgeyi farklı renklere boyayıp dağ ve nehirleri işaretleyiniz.', offset: 8 },
      { title: 'Görsel Okuma ve Grafik Yorumlama', subject: 'Türkçe', topic: 'Görsel Okuma', desc: 'Verilen sütun grafiğindeki kitap okuma verilerini inceleyip 5 yorum cümlesi kurunuz.', offset: 10 }
    ],
    '5': [
      { title: 'Ondalık Gösterim ve Yüzde Problemleri', subject: 'Matematik', topic: 'Yüzdeler', desc: 'Etiket fiyatı üzerinden indirim ve KDV hesaplama problemlerinden oluşan 15 soruyu çözünüz.', offset: 2 },
      { title: 'Ay\'ın Evreleri Modeli ve Gözlem Çizelgesi', subject: 'Fen Bilimleri', topic: 'Güneş, Dünya ve Ay', desc: '14 gün boyunca Ay\'ı akşam saat 21:00\'de gözlemleyip şeklini kutucuklara çiziniz.', offset: 5 },
      { title: 'Scratch ile Labirentten Kaçış Oyunu Tasarımı', subject: 'Bilişim Teknolojileri', topic: 'Blok Kodlama', desc: 'Karakterin duvara çarpınca başlangıç noktasına döndüğü 1 bölümlük oyun kodlayınız.', offset: 3 },
      { title: 'Söz Sanatları: Benzetme ve Abartma Örnekleri', subject: 'Türkçe', topic: 'Edebi Sanatlar', desc: 'Ders kitabındaki metinden 5 benzetme, 3 abartma ve 3 kişileştirme cümlesi tespit ediniz.', offset: 1 },
      { title: 'İlk Çağ Anadolu Uygarlıkları Karşılaştırma Tablosu', subject: 'Sosyal Bilgiler', topic: 'Kültür ve Miras', desc: 'Hitit, Frig, Lidya ve Urartu medeniyetlerinin başkent, yazı ve geçim kaynaklarını tabloya dökünüz.', offset: 4 },
      { title: 'Health & Illnesses Dialogues', subject: 'İngilizce', topic: 'Unit 5: Health', desc: 'Doktor ve hasta arasında geçen "I have a headache / You should rest" konulu diyalog yazınız.', offset: 6 },
      { title: 'Işığın Yayılması ve Gölge Boyu Deneyi', subject: 'Fen Bilimleri', topic: 'Işığın Yayılması', desc: 'El feneri ve opak cisim kullanarak ışık kaynağına yaklaştıkça gölge boyunun değişimini kaydediniz.', offset: 7 },
      { title: 'Çokgenler ve Üçgen Çeşitleri (Açılarına Göre)', subject: 'Matematik', topic: 'Geometri', desc: 'Dar açılı, dik açılı ve geniş açılı üçgenleri iletki kullanarak defterinize çiziniz.', offset: 8 },
      { title: 'Paragrafta Ana Fikir ve Yardımcı Fikirler', subject: 'Türkçe', topic: 'Paragraf Bilgisi', desc: 'Verilen 5 metnin ana düşüncesini ve en az ikişer yardımcı düşüncesini maddeler halinde yazınız.', offset: -1 },
      { title: 'Siber Zorbalık ve Güvenli İnternet Kuralları', subject: 'Bilişim Teknolojileri', topic: 'Dijital Vatandaşlık', desc: 'Güvenli şifre oluşturma ve kişisel verileri koruma konulu bilgilendirici broşür hazırlayınız.', offset: 9 }
    ],
    '8': [
      { title: 'LGS Matematik: EBOB-EKOK Yeni Nesil Problem Seti', subject: 'Matematik', topic: 'Çarpanlar ve Katlar', desc: 'MEB örnek soruları ve çıkmış sorular formatında hazırlanan 20 adet yeni nesil EBOB-EKOK problemini çözünüz.', offset: 1 },
      { title: 'LGS Fen: DNA ve Genetik Kod Çaprazlama Analizi', subject: 'Fen Bilimleri', topic: 'Mevsimler ve İklim / DNA', desc: 'Mendel genetiği monohibrit çaprazlama ve kan grubu olasılık hesaplamalarını içeren test yaprağı.', offset: 2 },
      { title: 'LGS Türkçe: Fiilimsiler ve Cümlenin Öğeleri Karma Test', subject: 'Türkçe', topic: 'Dil Bilgisi', desc: 'Fiilimsiler, cümlenin temel ve yardımcı ögelerini içeren 30 soruluk tarama testini tamamlayınız.', offset: 3 },
      { title: 'LGS İnkılap: Milli Uyanış ve Cepheler Harita Çalışması', subject: 'T.C. İnkılap Tarihi', topic: 'Milli Mücadele', desc: 'Doğu, Güney ve Batı cephelerinde imzalanan antlaşmalar ve sınır değişikliklerini harita üzerinde gösteriniz.', offset: 4 },
      { title: 'LGS English: Friendship & Teen Life Vocab Master', subject: 'İngilizce', topic: 'Units 1-3 Review', desc: 'Sık çıkan 50 eş anlamlı/zıt anlamlı kelimeyi kartlara yazıp kabul/ret diyaloglarını analiz ediniz.', offset: 5 },
      { title: 'LGS Matematik: Üslü İfadeler ve Bilimsel Gösterim', subject: 'Matematik', topic: 'Üslü İfadeler', desc: 'Çok büyük ve çok küçük sayıların bilimsel gösterimi konusundan 25 soruluk pekiştirme ödevi.', offset: -2 },
      { title: 'LGS Fen: Basınç (Katı, Sıvı ve Gaz Basıncı)', subject: 'Fen Bilimleri', topic: 'Basınç', desc: 'Tuğla ve piston düzenekli yeni nesil deney sorularını adım adım işlem basamaklarıyla çözünüz.', offset: 6 },
      { title: 'LGS Türkçe: Paragrafta Anlam ve Mantık Muhakeme', subject: 'Türkçe', topic: 'Sözel Mantık', desc: 'Tablo yerleştirme ve şifreli sıralama içeren 15 sözel mantık sorusunu süre tutarak (25 dk) çözünüz.', offset: 7 },
      { title: 'LGS İnkılap: Lozan Barış Antlaşması Maddeleri Tahlili', subject: 'T.C. İnkılap Tarihi', topic: 'Lozan Antlaşması', desc: 'Boğazlar, kapitülasyonlar, azınlıklar ve dış borçlar kararlarının Türkiye açısından kazanımlarını yazınız.', offset: 8 },
      { title: 'LGS Genel Deneme Sınavı Hata Defteri Analizi', subject: 'Rehberlik & LGS', topic: 'Deneme Analizi', desc: 'Son kurumsal denemede yanlış yapılan ve boş bırakılan soruları kesip deftere yapıştırarak doğru çözümlerini ekleyiniz.', offset: 10 }
    ]
  };

  const pool = poolByGrade[grade] || poolByGrade['1'];
  for (const item of pool) {
    assignments.push({
      title: item.title,
      subject: item.subject,
      topic: item.topic,
      description: item.desc,
      assignmentType: 'class',
      dueAt: createDueDate(item.offset),
      status: 'active'
    });
  }

  return assignments;
};

// Generates at least 10 grade-tailored exams per class
const generateClassExams = (grade, className) => {
  const exams = [];
  const now = new Date();

  const createExamDate = (dayOffset) => {
    return new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  };

  const poolByGrade = {
    '1': [
      { name: '1. Dönem 1. Okuma Yazma Değerlendirmesi', subject: 'Türkçe', topic: 'Ses ve Hece Bilgisi', type: 'oral', offset: -14 },
      { name: '1. Dönem Rakamlar ve Sayma Becerisi Sınavı', subject: 'Matematik', topic: '1-20 Doğal Sayılar', type: 'midterm', offset: -7 },
      { name: 'Hayat Bilgisi Okul ve Çevre Bilgisi Sınavı', subject: 'Hayat Bilgisi', topic: 'Okul Heyecanım', type: 'midterm', offset: -3 },
      { name: 'Görsel Sanatlar Renk ve Şekil Uygulama Sınavı', subject: 'Görsel Sanatlar', topic: 'Ana ve Ara Renkler', type: 'oral', offset: 2 },
      { name: 'Müzik Ritim ve Ses Tanıma Değerlendirmesi', subject: 'Müzik', topic: 'Ritim Duygusu', type: 'oral', offset: 5 },
      { name: '1. Dönem 2. Türkçe Yazılı Değerlendirme', subject: 'Türkçe', topic: 'Kelime ve Basit Cümle', type: 'final', offset: 8 },
      { name: '1. Dönem 2. Matematik Toplama İşlemi Sınavı', subject: 'Matematik', topic: 'Temel Toplama', type: 'final', offset: 12 },
      { name: 'Beden Eğitimi Temel Hareket Becerileri', subject: 'Beden Eğitimi', topic: 'Denge ve Koordinasyon', type: 'oral', offset: 15 },
      { name: 'Akıcı Okuma ve Telaffuz Sözlü Değerlendirmesi', subject: 'Türkçe', topic: 'Cümle Okuma', type: 'oral', offset: 18 },
      { name: 'Uzamsal İlişkiler ve Sayı Eşleme Testi', subject: 'Matematik', topic: 'Geometrik Örüntüler', type: 'midterm', offset: 22 }
    ],
    '2': [
      { name: '1. Dönem 1. Türkçe Yazılı Sınavı', subject: 'Türkçe', topic: 'Metin Anlama ve Zıt Anlam', type: 'midterm', offset: -14 },
      { name: '1. Dönem 1. Matematik Yazılı Sınavı', subject: 'Matematik', topic: 'Doğal Sayılar ve Ritmik Sayma', type: 'midterm', offset: -10 },
      { name: 'Hayat Bilgisi Birey ve Toplum Ünite Sınavı', subject: 'Hayat Bilgisi', topic: 'Ben ve Ailem', type: 'midterm', offset: -4 },
      { name: 'English 1st Term Speaking & Listening Exam', subject: 'İngilizce', topic: 'Classroom & Greetings', type: 'oral', offset: 2 },
      { name: 'Matematik Çarpım Tablosu Hız ve Beceri Sınavı', subject: 'Matematik', topic: 'Çarpma İşlemi', type: 'oral', offset: 5 },
      { name: '1. Dönem 2. Türkçe Yazılı Sınavı', subject: 'Türkçe', topic: 'Noktalama ve Hece Bilgisi', type: 'final', offset: 9 },
      { name: '1. Dönem 2. Matematik Yazılı Sınavı', subject: 'Matematik', topic: 'Problem Çözme ve Zaman', type: 'final', offset: 13 },
      { name: 'Hayat Bilgisi Doğa ve Çevre Bilinci Sınavı', subject: 'Hayat Bilgisi', topic: 'Mevsimler ve Çevre', type: 'final', offset: 16 },
      { name: 'Türkçe Sözcükte Anlam ve Eş Sesliler Testi', subject: 'Türkçe', topic: 'Eş Sesli Sözcükler', type: 'midterm', offset: 20 },
      { name: 'İngilizce Kelime Bilgisi ve Eşleştirme Sınavı', subject: 'İngilizce', topic: 'Numbers & Colors', type: 'midterm', offset: 25 }
    ],
    '3': [
      { name: '1. Dönem 1. Fen Bilimleri Yazılı Sınavı', subject: 'Fen Bilimleri', topic: 'Dünya\'nın Katmanları', type: 'midterm', offset: -14 },
      { name: '1. Dönem 1. Matematik Yazılı Sınavı', subject: 'Matematik', topic: 'Basamak Değeri & 3 Basamaklı İşlemler', type: 'midterm', offset: -9 },
      { name: '1. Dönem 1. Türkçe Yazılı Sınavı', subject: 'Türkçe', topic: 'Okuduğunu Anlama & 5N1K', type: 'midterm', offset: -3 },
      { name: 'Hayat Bilgisi Güvenli Hayat Sınavı', subject: 'Hayat Bilgisi', topic: 'Trafik ve İlkyardım', type: 'midterm', offset: 3 },
      { name: 'English Unit 1-2 General Assessment', subject: 'İngilizce', topic: 'Feelings & Family', type: 'midterm', offset: 6 },
      { name: 'Fen Bilimleri Kuvveti Tanıyalım Deney Sınavı', subject: 'Fen Bilimleri', topic: 'İtme ve Çekme Kuvveti', type: 'oral', offset: 10 },
      { name: '1. Dönem 2. Matematik Yazılı Sınavı', subject: 'Matematik', topic: 'Çarpma ve Geometrik Cisimler', type: 'final', offset: 14 },
      { name: '1. Dönem 2. Türkçe Yazılı Sınavı', subject: 'Türkçe', topic: 'Yazım Kuralları ve Paragraf', type: 'final', offset: 17 },
      { name: 'Bilişim Teknolojileri Kodlama Becerileri Sınavı', subject: 'Bilişim Teknolojileri', topic: 'Algoritma ve Mantık', type: 'oral', offset: 21 },
      { name: 'Genel Değerlendirme ve Kazanım Tarama Sınavı', subject: 'Genel Yetenek', topic: 'Tüm Dersler Kazanım İzleme', type: 'final', offset: 26 }
    ],
    '4': [
      { name: '1. Dönem 1. Sosyal Bilgiler Yazılı Sınavı', subject: 'Sosyal Bilgiler', topic: 'Birey ve Toplum / Tarih', type: 'midterm', offset: -12 },
      { name: '1. Dönem 1. Matematik Yazılı Sınavı', subject: 'Matematik', topic: 'Doğal Sayılar & Dört İşlem', type: 'midterm', offset: -8 },
      { name: '1. Dönem 1. Fen Bilimleri Yazılı Sınavı', subject: 'Fen Bilimleri', topic: 'Besinlerimiz ve Sağlığımız', type: 'midterm', offset: -2 },
      { name: '1. Dönem 1. Türkçe Yazılı Sınavı', subject: 'Türkçe', topic: 'Ana Fikir & Deyimler', type: 'midterm', offset: 3 },
      { name: 'English Midterm Assessment (Reading & Writing)', subject: 'İngilizce', topic: 'Daily Life & Routines', type: 'midterm', offset: 6 },
      { name: 'İnsan Hakları ve Demokrasi 1. Yazılı Sınavı', subject: 'İnsan Hakları', topic: 'Hak ve Sorumluluklar', type: 'midterm', offset: 9 },
      { name: '1. Dönem 2. Matematik Yazılı Sınavı', subject: 'Matematik', topic: 'Kesirler ve Zaman Ölçüleri', type: 'final', offset: 13 },
      { name: '1. Dönem 2. Fen Bilimleri Yazılı Sınavı', subject: 'Fen Bilimleri', topic: 'Maddenin Özellikleri', type: 'final', offset: 16 },
      { name: '1. Dönem 2. Sosyal Bilgiler Yazılı Sınavı', subject: 'Sosyal Bilgiler', topic: 'Milli Mücadele Kahramanları', type: 'final', offset: 19 },
      { name: 'Din Kültürü ve Ahlak Bilgisi 1. Yazılı Sınavı', subject: 'Din Kültürü', topic: 'Ahlaki Davranışlar', type: 'midterm', offset: 23 }
    ],
    '5': [
      { name: '1. Dönem 1. Matematik Yazılı Sınavı', subject: 'Matematik', topic: 'Milyonlar & Doğal Sayılarla İşlemler', type: 'midterm', offset: -14 },
      { name: '1. Dönem 1. Fen Bilimleri Yazılı Sınavı', subject: 'Fen Bilimleri', topic: 'Güneş, Dünya ve Ay Sistemleri', type: 'midterm', offset: -9 },
      { name: '1. Dönem 1. Türkçe Yazılı Sınavı', subject: 'Türkçe', topic: 'Sözcükte ve Cümlede Anlam', type: 'midterm', offset: -4 },
      { name: '1. Dönem 1. Sosyal Bilgiler Yazılı Sınavı', subject: 'Sosyal Bilgiler', topic: 'İlk Çağ Anadolu Medeniyetleri', type: 'midterm', offset: 2 },
      { name: '1. Dönem 1. İngilizce Yazılı Sınavı', subject: 'İngilizce', topic: 'Hello & My Town', type: 'midterm', offset: 5 },
      { name: 'Bilişim Teknolojileri Scratch Kodlama Uygulama Sınavı', subject: 'Bilişim Teknolojileri', topic: 'Blok Tabanlı Kodlama', type: 'oral', offset: 8 },
      { name: '1. Dönem 2. Matematik Yazılı Sınavı', subject: 'Matematik', topic: 'Kesirler ve Yüzdeler', type: 'final', offset: 12 },
      { name: '1. Dönem 2. Fen Bilimleri Yazılı Sınavı', subject: 'Fen Bilimleri', topic: 'Kuvvetin Ölçülmesi ve Sürtünme', type: 'final', offset: 15 },
      { name: '1. Dönem 2. Türkçe Yazılı Sınavı', subject: 'Türkçe', topic: 'Metin Türleri & Söz Sanatları', type: 'final', offset: 18 },
      { name: 'Din Kültürü ve Ahlak Bilgisi 1. Yazılı Sınavı', subject: 'Din Kültürü', topic: 'İnanç ve İbadet Esasları', type: 'midterm', offset: 24 }
    ],
    '8': [
      { name: 'LGS Kurumsal Deneme Sınavı - 1', subject: 'LGS Deneme', topic: 'Tüm Dersler 1. Üniteler', type: 'midterm', offset: -15 },
      { name: '1. Dönem 1. Matematik Yazılı Sınavı', subject: 'Matematik', topic: 'Çarpanlar, Katlar & EBOB-EKOK', type: 'midterm', offset: -10 },
      { name: '1. Dönem 1. Fen Bilimleri Yazılı Sınavı', subject: 'Fen Bilimleri', topic: 'Mevsimler, İklim ve DNA', type: 'midterm', offset: -5 },
      { name: '1. Dönem 1. Türkçe Yazılı Sınavı', subject: 'Türkçe', topic: 'Fiilimsiler ve Paragraf Analizi', type: 'midterm', offset: 1 },
      { name: '1. Dönem 1. T.C. İnkılap Tarihi Yazılı Sınavı', subject: 'T.C. İnkılap Tarihi', topic: 'Bir Kahraman Doğuyor & I. Dünya Savaşı', type: 'midterm', offset: 4 },
      { name: '1. Dönem 1. İngilizce LGS Tarama Sınavı', subject: 'İngilizce', topic: 'Friendship & Teen Life', type: 'midterm', offset: 7 },
      { name: 'LGS Kurumsal Deneme Sınavı - 2 (MEB Formatı)', subject: 'LGS Deneme', topic: 'Sözel ve Sayısal Bölüm', type: 'midterm', offset: 11 },
      { name: '1. Dönem 2. Matematik Yazılı Sınavı (Kareköklü İfadeler)', subject: 'Matematik', topic: 'Kareköklü Sayılar ve Veri Analizi', type: 'final', offset: 15 },
      { name: '1. Dönem 2. Fen Bilimleri Yazılı Sınavı (Basınç)', subject: 'Fen Bilimleri', topic: 'Katı, Sıvı ve Gaz Basıncı', type: 'final', offset: 18 },
      { name: 'LGS Şampiyonlar Karması Türkiye Geneli Deneme', subject: 'LGS Deneme', topic: 'Tüm LGS Müfredatı Tarama', type: 'final', offset: 24 }
    ]
  };

  const pool = poolByGrade[grade] || poolByGrade['1'];
  for (const item of pool) {
    exams.push({
      name: item.name,
      subject: item.subject,
      topic: item.topic,
      examType: item.type,
      examDate: createExamDate(item.offset),
      maxScore: 100,
      description: `${className} ${item.subject} dersi kapsamında öğrencilerin konu kazanımlarını ölçmek amacıyla düzenlenen değerlendirme sınavıdır.`
    });
  }

  return exams;
};

// Generates realistic consultation / meeting requests
const generateDemoMeetings = (teacherId, classMap, studentDocs) => {
  const meetings = [];

  const sampleMeetingsData = [
    {
      studentIdx: 0, // Ali Yılmaz (1-A)
      subject: 'Okuma ve heceleme hızlandırma çalışmaları hakkında veli görüşmesi',
      urgency: 'normal',
      status: 'waiting_teacher',
      messages: [
        { role: 'student', text: 'Hocam iyi günler, Ali evde "E" ve "L" seslerini birleştirirken biraz zorlanıyor, evde nasıl bir ek alıştırma yapabiliriz?' }
      ]
    },
    {
      studentIdx: 11, // Asya Polat (2-B)
      subject: 'Kitap okuma kulübü ve ikinci dönem proje önerisi',
      urgency: 'low',
      status: 'waiting_student',
      messages: [
        { role: 'student', text: 'Öğretmenim, sınıf kütüphanemiz için yeni macera kitapları getirmek istiyorum, listeyi size gösterebilir miyim?' },
        { role: 'teacher', text: 'Harika bir fikir Asya! Yarın ilk teneffüste kitap listeni öğretmenler odasına getir, birlikte inceleyelim.' }
      ]
    },
    {
      studentIdx: 20, // Yiğit Aksoy (3-A)
      subject: 'Fen Bilimleri proje maketi malzeme listesi danışmanlığı',
      urgency: 'normal',
      status: 'resolved',
      messages: [
        { role: 'student', text: 'Öğretmenim, Dünya\'nın çekirdek katmanını simgelemek için kırmızı oyun hamuru bulamadım, strafor boyayabilir miyim?' },
        { role: 'teacher', text: 'Elbette Yiğit, strafor köpüğü kırmızı akrilik boyayla boyarsan çok daha sağlam ve güzel bir maket olur.' },
        { role: 'student', text: 'Çok teşekkür ederim öğretmenim, öyle yapacağım!' }
      ]
    },
    {
      studentIdx: 30, // Çağan Şen (4-C)
      subject: 'Sosyal Bilgiler Milli Mücadele sunumu hakkında geri bildirim',
      urgency: 'normal',
      status: 'resolved',
      messages: [
        { role: 'student', text: 'Hocam, Şerife Bacı sunumum için 5 dakikalık slayt hazırladım. Bakabilir misiniz?' },
        { role: 'teacher', text: 'Slaytlarını inceledim Çağan, görseller ve kronolojik sıra harika olmuş. Sınıfta ilk senin sunumunu dinleyeceğiz.' }
      ]
    },
    {
      studentIdx: 40, // Batu Yaman (5-A)
      subject: 'Scratch robotik kodlama yarışması başvurusu',
      urgency: 'high',
      status: 'waiting_teacher',
      messages: [
        { role: 'student', text: 'Hocam iyi akşamlar, TÜBİTAK Ortaokul öğrencileri Scratch kodlama yarışmasına okulumuz adına katılmak istiyorum. Başvuru formunu doldurdum, onayınızı rica ediyorum.' }
      ]
    },
    {
      studentIdx: 50, // Eren Yıldız (8-B LGS Demo Öğrenci)
      subject: 'LGS Matematik EBOB-EKOK yeni nesil soru çözüm taktikleri',
      urgency: 'urgent',
      status: 'waiting_student',
      messages: [
        { role: 'student', text: 'Hocam son denemede EBOB-EKOK sorularında işlem hatası yaptığım için 2 sorum boş kaldı, soru çözüm saatinde birlikte bakabilir miyiz?' },
        { role: 'teacher', text: 'Eren selam, yarın saat 15:30\'da etüt odasında soruları tek tek analiz edeceğiz. Yanında son deneme kitapçığını getirmeyi unutma.' }
      ]
    }
  ];

  return { sampleMeetingsData };
};

/**
 * Cleanly seed demo data:
 * - 1 Demo Teacher
 * - 6 Classes
 * - 60 Students (10 per class) with full profile, credentials, and 2 parents
 * - 30 Educational Whiteboards (5 per class with doodles & diverse subjects)
 * - 60 Assignments (10 per class) & hundreds of recipients
 * - 60 Exams (10 per class) & hundreds of exam result scores
 * - Multiple interactive Meeting consultations with realistic message threads
 */
async function seedDemoData() {
  console.log('[DEMO SERVICE] Starting comprehensive demo data reset & seed...');
  try {
    const teacherPasswordHash = await bcrypt.hash(DEMO_PASSWORD_PLAIN, 10);
    const studentPasswordHash = await bcrypt.hash(DEMO_STUDENT_PASSWORD, 10);

    // 1. Find or create demo teacher
    let demoTeacher = await User.findOne({ username: DEMO_TEACHER_USERNAME });
    if (!demoTeacher) {
      demoTeacher = new User({
        username: DEMO_TEACHER_USERNAME,
        email: DEMO_TEACHER_EMAIL,
        password: teacherPasswordHash,
        role: 'teacher',
        firstName: 'Demo',
        lastName: 'Öğretmen',
        isVerified: true,
        isEmailVerified: true,
        verificationStatus: 'approved',
        isDemo: true
      });
      await demoTeacher.save();
    } else {
      demoTeacher.password = teacherPasswordHash;
      demoTeacher.isVerified = true;
      demoTeacher.isEmailVerified = true;
      demoTeacher.verificationStatus = 'approved';
      demoTeacher.isDemo = true;
      await demoTeacher.save();
    }

    const teacherId = demoTeacher._id;

    // 2. Clean up previous demo data scoped ONLY to this demo teacher
    const existingClasses = await Class.find({ teacherId });
    const existingClassIds = existingClasses.map(c => c._id);

    // Save previous enabledModules for each class grade/section so teacher customizations aren't wiped!
    const previousClassModuleMap = {};
    for (const cls of existingClasses) {
      const classKey = `${cls.grade}-${cls.section}`;
      if (Array.isArray(cls.enabledModules) && cls.enabledModules.length > 0) {
        previousClassModuleMap[classKey] = cls.enabledModules;
      }
    }

    const existingStudents = await Student.find({ teacherId });
    const existingStudentIds = existingStudents.map(s => s._id);

    // Remove guardians
    await Guardian.deleteMany({ studentId: { $in: existingStudentIds } });

    // Remove student auth users cleanly (prevents username/email duplicate key conflicts)
    await User.deleteMany({
      $or: [
        { isDemo: true, role: 'student' },
        { username: { $regex: /^ogrenci_/i } },
        { username: DEMO_STUDENT_USERNAME },
        { email: DEMO_STUDENT_EMAIL },
        { email: { $regex: /@oxonom\.com$/i }, role: 'student' }
      ]
    });

    // Remove whiteboards for this teacher
    await Board.deleteMany({ createdBy: teacherId });

    // Remove assignments and assignment recipients
    const existingAssignments = await Assignment.find({ teacherId });
    const existingAssignmentIds = existingAssignments.map(a => a._id);
    await AssignmentRecipient.deleteMany({ assignmentId: { $in: existingAssignmentIds } });
    await Assignment.deleteMany({ teacherId });

    // Remove exams and exam results
    const existingExams = await Exam.find({ teacherId });
    const existingExamIds = existingExams.map(e => e._id);
    await ExamResult.deleteMany({ examId: { $in: existingExamIds } });
    await Exam.deleteMany({ teacherId });

    // Remove meetings and messages
    const existingMeetings = await MeetingRequest.find({ teacherId });
    const existingMeetingIds = existingMeetings.map(m => m._id);
    await MeetingMessage.deleteMany({ requestId: { $in: existingMeetingIds } });
    await MeetingRequest.deleteMany({ teacherId });

    // Remove announcements and recipients
    const existingAnnouncements = await Announcement.find({ teacherId });
    const existingAnnIds = existingAnnouncements.map(a => a._id);
    await AnnouncementRecipient.deleteMany({ announcementId: { $in: existingAnnIds } });
    await Announcement.deleteMany({ teacherId });

    // Remove attendance sessions
    await AttendanceSession.deleteMany({ teacherId });

    // Remove students and classes
    await Student.deleteMany({ teacherId });
    await Class.deleteMany({ teacherId });

    console.log('[DEMO SERVICE] Cleared old demo data. Seeding classes, students, whiteboards, assignments & exams...');

    // 2.5 Seed Initial Add-on Modules with categorized subjects
    const defaultModulesList = [
      INITIAL_READING_MODULE,
      INITIAL_LETTER_WRITING_MODULE,
      INITIAL_MATH_MODULE,
      INITIAL_SCIENCE_MODULE,
      INITIAL_BOARD_TOOLS_MODULE
    ];

    for (const defMod of defaultModulesList) {
      const existing = await Module.findOne({ key: defMod.key });
      if (!existing) {
        await Module.create(defMod);
        console.log(`[DEMO SERVICE] Seeded baseline ${defMod.key} module.`);
      } else {
        // Update subject and category if missing or updated
        let needsSave = false;
        if (!existing.subject || existing.subject !== defMod.subject) {
          existing.subject = defMod.subject;
          needsSave = true;
        }
        if (existing.category !== defMod.category) {
          existing.category = defMod.category;
          needsSave = true;
        }
        if (defMod.targetGrades && (!existing.targetGrades || existing.targetGrades.length === 0)) {
          existing.targetGrades = defMod.targetGrades;
          needsSave = true;
        }
        if (needsSave) {
          await existing.save();
        }
      }
    }

    // Fetch all active modules currently in system
    const activeModules = await Module.find({ isActive: true });
    const activeModuleKeys = activeModules.map(m => m.key);

    // 3. Create 6 distinct classes with grade-appropriate enabledModules
    const classConfigs = [
      { grade: '1', section: 'A', name: '1-A Sınıfı', schoolName: 'Oxonom İlkokulu', academicYear: '2024-2025', description: 'Okuma Yazma & Temel Sayılar', color: '#3B82F6' },
      { grade: '2', section: 'B', name: '2-B Sınıfı', schoolName: 'Oxonom İlkokulu', academicYear: '2024-2025', description: 'Hayat Bilgisi & Temel İşlemler', color: '#10B981' },
      { grade: '3', section: 'A', name: '3-A Sınıfı', schoolName: 'Oxonom İlkokulu', academicYear: '2024-2025', description: 'Fen Bilimleri & Çevre Bilinci', color: '#8B5CF6' },
      { grade: '4', section: 'C', name: '4-C Sınıfı', schoolName: 'Oxonom İlkokulu', academicYear: '2024-2025', description: 'Sosyal Bilgiler & İngilizce', color: '#F59E0B' },
      { grade: '5', section: 'A', name: '5-A Sınıfı', schoolName: 'Oxonom Ortaokulu', academicYear: '2024-2025', description: 'Bilişim Teknolojileri & Matematik', color: '#EC4899' },
      { grade: '8', section: 'B', name: '8-B Sınıfı', schoolName: 'Oxonom Ortaokulu', academicYear: '2024-2025', description: 'LGS Matematik & Fen Bilimleri', color: '#06B6D4' }
    ];

    const createdClasses = [];
    for (const cfg of classConfigs) {
      // Sınıf kademesine uygun modülleri ata (örneğin 1. sınıfa okuma-yazma, 2. sınıfa uygun olanlar vs.)
      const gradeAppropriateModules = activeModules.filter(m => {
        if (!m.targetGrades || m.targetGrades.length === 0) return true;
        return m.targetGrades.includes(cfg.grade);
      }).map(m => m.key);

      const combinedEnabledModules = gradeAppropriateModules.length > 0 
        ? gradeAppropriateModules 
        : activeModuleKeys;

      const cls = new Class({
        teacherId,
        teacherName: `${demoTeacher.firstName} ${demoTeacher.lastName}`,
        schoolName: cfg.schoolName,
        grade: cfg.grade,
        section: cfg.section,
        academicYear: cfg.academicYear,
        name: cfg.name,
        description: cfg.description,
        color: cfg.color,
        enabledModules: combinedEnabledModules,
        isActive: true
      });
      await cls.save();
      createdClasses.push(cls);
    }

    // 4. Create 60 students and their guardians distributed evenly (10 per class)
    const allStudentDocs = [];
    const classToStudentsMap = {};

    for (let cIdx = 0; cIdx < createdClasses.length; cIdx++) {
      const targetClass = createdClasses[cIdx];
      const studentsForClass = DEMO_STUDENTS_DATA.slice(cIdx * 10, (cIdx + 1) * 10);
      classToStudentsMap[targetClass._id.toString()] = [];

      for (let sIdx = 0; sIdx < studentsForClass.length; sIdx++) {
        const sData = studentsForClass[sIdx];
        const isDemoStud = !!sData.isDemoAccount;
        const studentUsername = isDemoStud ? DEMO_STUDENT_USERNAME : `ogrenci_${sData.num}`;
        const studentEmail = isDemoStud ? DEMO_STUDENT_EMAIL : `ogrenci${sData.num}@oxonom.com`;
        const initialPass = isDemoStud ? DEMO_PASSWORD_PLAIN : DEMO_STUDENT_PASSWORD;

        // Create auth user for student
        const studentUser = new User({
          username: studentUsername,
          email: studentEmail,
          password: studentPasswordHash,
          role: 'student',
          firstName: sData.first,
          lastName: sData.last,
          isVerified: true,
          isEmailVerified: true,
          verificationStatus: 'approved',
          isDemo: true
        });
        await studentUser.save();

        const nationalIdMasked = `100*****${sData.num}`;

        // Create Student profile
        const studentDoc = new Student({
          userId: studentUser._id,
          teacherId,
          classId: targetClass._id,
          status: 'active',
          studentNumber: String(sData.num),
          schoolNumber: String(1000 + sData.num),
          firstName: sData.first,
          lastName: sData.last,
          gender: sData.gender,
          birthDate: new Date(sData.birth),
          phone: `0555 ${sData.num} 0000`,
          email: studentEmail,
          address: sData.address,
          nationalIdMasked,
          initialPassword: initialPass,
          isDemo: true,
          notes: sData.note,
          parent1: {
            name: sData.p1Name,
            relationship: sData.p1Rel,
            phone: sData.p1Phone,
            phoneSecondary: '0533 555 ' + String(sData.num).padStart(4, '0')
          },
          parent2: {
            name: sData.p2Name,
            relationship: sData.p2Rel,
            phone: sData.p2Phone,
            phoneSecondary: '0544 555 ' + String(sData.num).padStart(4, '0')
          }
        });
        await studentDoc.save();
        allStudentDocs.push(studentDoc);
        classToStudentsMap[targetClass._id.toString()].push(studentDoc);

        // Create 2 Guardians in Guardian collection for full relational integrity
        const g1 = new Guardian({
          studentId: studentDoc._id,
          fullName: sData.p1Name,
          relationship: sData.p1Rel,
          phonePrimary: sData.p1Phone,
          phoneSecondary: '0533 555 ' + String(sData.num).padStart(4, '0'),
          orderIndex: 1
        });
        await g1.save();

        const g2 = new Guardian({
          studentId: studentDoc._id,
          fullName: sData.p2Name,
          relationship: sData.p2Rel,
          phonePrimary: sData.p2Phone,
          phoneSecondary: '0544 555 ' + String(sData.num).padStart(4, '0'),
          orderIndex: 2
        });
        await g2.save();
      }

      // 5. Create 5 Whiteboards per class (30 whiteboards in total)
      const classBoardsData = generateClassBoards(targetClass.grade, targetClass.name);
      for (let bIdx = 0; bIdx < classBoardsData.length; bIdx++) {
        const bData = classBoardsData[bIdx];
        const boardRoomId = `demo-board-${targetClass.grade}-${targetClass.section.toLowerCase()}-${bIdx + 1}-${Date.now().toString(36)}`;

        const boardDoc = new Board({
          roomId: boardRoomId,
          name: bData.name,
          createdBy: teacherId,
          classId: targetClass._id,
          color: bData.color,
          elements: bData.elements,
          order: bIdx,
          boardDate: new Date(Date.now() - bIdx * 24 * 60 * 60 * 1000),
          groupTitle: bData.groupTitle
        });
        await boardDoc.save();
      }

      // 6. Create at least 10 Assignments per class (60 assignments in total)
      const classAssignmentsData = generateClassAssignments(targetClass.grade, targetClass.name);
      for (const aData of classAssignmentsData) {
        const assignmentDoc = new Assignment({
          teacherId,
          classId: targetClass._id,
          title: aData.title,
          subject: aData.subject,
          topic: aData.topic,
          description: aData.description,
          assignmentType: 'class',
          dueAt: aData.dueAt,
          status: 'active'
        });
        await assignmentDoc.save();

        // Create recipients for all 10 students in this class with realistic completion statuses
        const classStudents = classToStudentsMap[targetClass._id.toString()];
        for (let stIdx = 0; stIdx < classStudents.length; stIdx++) {
          const st = classStudents[stIdx];
          // ~60% completed, ~30% pending, ~10% incomplete
          let status = 'pending';
          let completedAt = null;
          let viewedAt = new Date();

          if (stIdx % 3 === 0 || stIdx % 5 === 0) {
            status = 'completed';
            completedAt = new Date(Date.now() - (stIdx + 1) * 3600 * 1000);
          } else if (stIdx === 7) {
            status = 'incomplete';
          }

          const recipientDoc = new AssignmentRecipient({
            assignmentId: assignmentDoc._id,
            studentId: st._id,
            userId: st.userId,
            status,
            viewedAt,
            completedAt
          });
          await recipientDoc.save();
        }
      }

      // 7. Create at least 10 Exams per class (60 exams in total)
      const classExamsData = generateClassExams(targetClass.grade, targetClass.name);
      for (const eData of classExamsData) {
        const examDoc = new Exam({
          teacherId,
          classId: targetClass._id,
          name: eData.name,
          subject: eData.subject,
          topic: eData.topic,
          examType: eData.examType,
          description: eData.description,
          examDate: eData.examDate,
          maxScore: 100
        });
        await examDoc.save();

        // Create realistic ExamResults for all 10 students in this class
        const classStudents = classToStudentsMap[targetClass._id.toString()];
        const scoreGrades = [100, 96, 92, 88, 85, 82, 79, 75, 90, 94];
        const teacherFeedbackList = [
          'Harika bir sonuç, kavramsal ve pratik soruların tamamı doğru!',
          'Çok başarılı, sadece işlem adımlarını biraz daha düzenli yazabilir.',
          'Konuyu çok iyi kavramış, dikkati ve azmi takdire şayan.',
          'Güzel bir başarı, eksik kaldığı konuyu birlikte tekrar edeceğiz.',
          'Soruları dikkatle okuyarak çok iyi bir gelişim sergiledi.',
          'İyi düzeyde, soru köklerine biraz daha odaklanması faydalı olacaktır.',
          'Gayretli ve başarılı, grafik ve şekilli soruları kusursuz çözmüş.',
          'Tebrikler, sınıf ortalamasının üzerinde başarılı bir sonuç.',
          'İstikrarlı başarısını bu sınavda da devam ettirdi.',
          'Zaman yönetimini çok iyi kullanarak sınavı tam zamanında bitirdi.'
        ];

        for (let stIdx = 0; stIdx < classStudents.length; stIdx++) {
          const st = classStudents[stIdx];
          const score = scoreGrades[(stIdx + eData.name.length) % scoreGrades.length];
          const note = teacherFeedbackList[stIdx % teacherFeedbackList.length];

          const resultDoc = new ExamResult({
            examId: examDoc._id,
            studentId: st._id,
            score,
            teacherNote: note
          });
          await resultDoc.save();
        }
      }
    }

    // 8. Create Realistic Meeting Requests and Message Threads
    const { sampleMeetingsData } = generateDemoMeetings(teacherId, classToStudentsMap, allStudentDocs);
    for (const mData of sampleMeetingsData) {
      const targetStudent = allStudentDocs[mData.studentIdx] || allStudentDocs[0];
      const meetingReq = new MeetingRequest({
        studentId: targetStudent._id,
        studentUserId: targetStudent.userId,
        teacherId,
        classId: targetStudent.classId,
        subject: mData.subject,
        urgency: mData.urgency,
        status: mData.status
      });
      await meetingReq.save();

      for (const msg of mData.messages) {
        const msgDoc = new MeetingMessage({
          requestId: meetingReq._id,
          senderUserId: msg.role === 'teacher' ? teacherId : targetStudent.userId,
          senderRole: msg.role,
          message: msg.text,
          createdAt: new Date(Date.now() - 3600 * 1000)
        });
        await msgDoc.save();
      }
    }

    // 9. Create Realistic Announcements for 8-B Class
    const class8B = createdClasses.find(c => c.grade === '8' && c.section === 'B');
    if (class8B) {
      const announcementsData = [
        {
          title: '🚨 LGS 2. Genel Deneme Sınavı Tarihi ve Salon Dağılımları',
          priority: 'urgent',
          content: 'Sevgili 8-B öğrencileri, bu cumartesi saat 10:00\'da okulumuzda LGS 2. Genel Deneme Sınavı uygulanacaktır. Optik form kodlama kurallarına dikkat ediniz ve en geç 09:40\'ta sınav salonunuzda hazır bulununuz. Başarılar dileriz!'
        },
        {
          title: '📢 Matematik Proje Ödevi Taslak Teslimi',
          priority: 'normal',
          content: 'Dönem ödevi alan öğrencilerimizin taslak raporlarını ve çözüm basamaklarını cuma gününe kadar sistem üzerinden teslim etmeleri rica olunur.'
        },
        {
          title: '🔬 Fen Bilimleri DNA Modeli ve Kalıtım Sergisi',
          priority: 'normal',
          content: 'Önümüzdeki hafta okulumuz bilim sokağında 8. sınıflarımızın hazırladığı DNA ve genetik materyal modelleri sergilenecektir. Tüm velilerimiz ve öğrencilerimiz davetlidir.'
        },
        {
          title: '📚 Haftalık LGS Rehberlik ve Motivasyon Saati',
          priority: 'normal',
          content: 'Çarşamba günü saat 15:30\'da sınav kaygısı ve zaman yönetimi üzerine okul rehberlik servisimiz ile birlikte seminerimiz olacaktır.'
        }
      ];

      const students8B = classToStudentsMap[class8B._id.toString()] || [];

      for (let annIdx = 0; annIdx < announcementsData.length; annIdx++) {
        const aData = announcementsData[annIdx];
        const annDoc = new Announcement({
          teacherId,
          classId: class8B._id,
          title: aData.title,
          content: aData.content,
          priority: aData.priority,
          targetType: 'class',
          createdAt: new Date(Date.now() - (annIdx + 1) * 24 * 3600 * 1000)
        });
        await annDoc.save();

        for (const st of students8B) {
          // For demo student, keep 1 unread (urgent) and 3 read
          const isDemoStudent = st.studentNumber === '801';
          const isRead = isDemoStudent ? annIdx > 0 : true;
          const readRec = new AnnouncementRecipient({
            announcementId: annDoc._id,
            studentId: st._id,
            userId: st.userId,
            isRead,
            readAt: isRead ? new Date(Date.now() - 3600 * 1000) : null
          });
          await readRec.save();
        }
      }

      // 10. Create Realistic Attendance Sessions for 8-B Class (past 5 school days)
      const sessionDates = [
        new Date(Date.now() - 1 * 24 * 3600 * 1000),
        new Date(Date.now() - 2 * 24 * 3600 * 1000),
        new Date(Date.now() - 3 * 24 * 3600 * 1000),
        new Date(Date.now() - 4 * 24 * 3600 * 1000),
        new Date(Date.now() - 5 * 24 * 3600 * 1000)
      ];

      for (let sessIdx = 0; sessIdx < sessionDates.length; sessIdx++) {
        const sDate = sessionDates[sessIdx];
        const records = students8B.map((st, sIndex) => {
          const isDemoStudent = st.studentNumber === '801';
          if (isDemoStudent) {
            // 4 days present, 1 day late
            if (sessIdx === 1) {
              return {
                studentId: st._id,
                status: 'late',
                note: 'Servis gecikmesi nedeniyle 5 dk geç geldi'
              };
            }
            return {
              studentId: st._id,
              status: 'present',
              note: 'Ders içi katılımı aktif ve ödevlerini getirdi'
            };
          }

          // Other students
          if (sIndex === 3 && sessIdx === 0) {
            return { studentId: st._id, status: 'excused', note: 'Veli izin dilekçesi mevcut' };
          }
          if (sIndex === 7 && sessIdx === 2) {
            return { studentId: st._id, status: 'absent', note: 'Grip nedeniyle gelemedi' };
          }
          return { studentId: st._id, status: 'present', note: '' };
        });

        const attSession = new AttendanceSession({
          classId: class8B._id,
          teacherId,
          attendanceDate: sDate,
          records
        });
        await attSession.save();
      }
    }

    lastResetTimestamp = Date.now();
    if (isAutoResetActive) {
      nextResetTimestamp = lastResetTimestamp + (30 * 60 * 1000);
    } else {
      nextResetTimestamp = null;
    }
    console.log(`[DEMO SERVICE] Successfully seeded 6 classes, 60 students, 120 guardians, 30 whiteboards, 60 assignments, 60 exams, meetings, announcements & attendance!`);
    return { 
      success: true, 
      timestamp: lastResetTimestamp,
      lastResetAt: new Date(lastResetTimestamp).toISOString(),
      nextResetAt: nextResetTimestamp ? new Date(nextResetTimestamp).toISOString() : null,
      autoResetEnabled: isAutoResetActive
    };
  } catch (error) {
    console.error('[DEMO SERVICE] Error seeding demo data:', error);
    throw error;
  }
}

/**
 * Initializes the 30-minute auto-reset cycle respecting SystemSetting
 */
async function initDemoAutoReset() {
  try {
    const setting = await SystemSetting.findOne({ key: 'demo_auto_reset_enabled' });
    if (setting && setting.value === false) {
      isAutoResetActive = false;
      nextResetTimestamp = null;
      console.log('[DEMO SERVICE] Auto-reset is DISABLED in SystemSetting. Skipping startup seed and interval timer.');
      return;
    }

    isAutoResetActive = true;
    // Seed immediately on startup
    await seedDemoData().catch(err => console.error('[DEMO SERVICE] Initial seed error:', err));

    // Reset every 30 minutes (30 * 60 * 1000 ms)
    const THIRTY_MINUTES = 30 * 60 * 1000;
    if (resetTimer) clearInterval(resetTimer);
    nextResetTimestamp = Date.now() + THIRTY_MINUTES;

    resetTimer = setInterval(async () => {
      if (!isAutoResetActive) return;
      console.log('[DEMO SERVICE] 30-minute timer triggered. Auto-resetting demo environment...');
      nextResetTimestamp = Date.now() + THIRTY_MINUTES;
      await seedDemoData().catch(err => console.error('[DEMO SERVICE] Auto-reset interval error:', err));
    }, THIRTY_MINUTES);

    console.log('[DEMO SERVICE] 30-minute auto-reset interval scheduled.');
  } catch (err) {
    console.error('[DEMO SERVICE] Error initializing demo auto-reset:', err);
  }
}

/**
 * Enable or disable automatic demo reset from superadmin.
 * When enabled, it immediately resets the environment to the latest state (preserving all new/edited modules).
 */
async function setAutoResetEnabled(enabled) {
  const boolVal = !!enabled;
  await SystemSetting.findOneAndUpdate(
    { key: 'demo_auto_reset_enabled' },
    { value: boolVal, description: 'Demo ortamı 30 dakikalık otomatik sıfırlama ayarı' },
    { upsert: true, new: true }
  );

  isAutoResetActive = boolVal;
  const THIRTY_MINUTES = 30 * 60 * 1000;

  if (isAutoResetActive) {
    console.log('[DEMO SERVICE] Auto-reset ENABLED by admin. Resetting demo environment to latest state now...');
    await seedDemoData();
    if (resetTimer) clearInterval(resetTimer);
    nextResetTimestamp = Date.now() + THIRTY_MINUTES;
    resetTimer = setInterval(async () => {
      if (!isAutoResetActive) return;
      console.log('[DEMO SERVICE] 30-minute timer triggered. Auto-resetting demo environment...');
      nextResetTimestamp = Date.now() + THIRTY_MINUTES;
      await seedDemoData().catch(err => console.error('[DEMO SERVICE] Auto-reset interval error:', err));
    }, THIRTY_MINUTES);
  } else {
    console.log('[DEMO SERVICE] Auto-reset DISABLED by admin. Pausing 30-minute interval timer.');
    if (resetTimer) {
      clearInterval(resetTimer);
      resetTimer = null;
    }
    nextResetTimestamp = null;
  }

  return await getDemoStatus();
}

async function getDemoStatus() {
  // Sync in-memory state with DB setting if available
  try {
    const setting = await SystemSetting.findOne({ key: 'demo_auto_reset_enabled' });
    if (setting) {
      isAutoResetActive = !!setting.value;
    }
  } catch (e) {}

  const activeModulesCount = await Module.countDocuments({ isActive: true });
  const totalModulesCount = await Module.countDocuments();

  return {
    autoResetEnabled: isAutoResetActive,
    teacherUsername: DEMO_TEACHER_USERNAME,
    teacherPassword: DEMO_PASSWORD_PLAIN,
    studentUsername: DEMO_STUDENT_USERNAME,
    studentEmail: DEMO_STUDENT_EMAIL,
    studentPassword: DEMO_PASSWORD_PLAIN,
    totalClasses: 6,
    totalStudents: 60,
    totalWhiteboards: 30,
    totalAssignments: 60,
    totalExams: 60,
    totalAnnouncements: 4,
    totalAttendanceSessions: 5,
    activeModulesCount,
    totalModulesCount,
    resetIntervalMinutes: 30,
    lastResetAt: new Date(lastResetTimestamp).toISOString(),
    nextResetAt: nextResetTimestamp ? new Date(nextResetTimestamp).toISOString() : null
  };
}

module.exports = {
  seedDemoData,
  initDemoAutoReset,
  getDemoStatus,
  setAutoResetEnabled,
  DEMO_TEACHER_USERNAME,
  DEMO_STUDENT_USERNAME,
  DEMO_PASSWORD_PLAIN,
  DEMO_STUDENT_PASSWORD
};
