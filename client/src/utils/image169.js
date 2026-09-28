/**
 * Otomatik 16:9 Format Dönüştürücü (Auto Crop & Resize to 16:9)
 * Görselin boyutu veya en/boy oranı ne olursa olsun (kare, dikey veya geniş),
 * görseli merkeze odaklayarak (center-cover) bozulma ve esneme olmadan
 * standart 16:9 yatay formata dönüştürür.
 * 
 * @param {File} file - Cihazdan seçilen orijinal görsel dosyası
 * @returns {Promise<File>} 16:9 oranına getirilmiş optimize JPEG File nesnesi
 */
export async function cropImageTo16by9(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const naturalWidth = img.naturalWidth || 1280;
      const naturalHeight = img.naturalHeight || 720;

      // 16:9 hedef oranı (1.7777...)
      const targetRatio = 16 / 9;
      const srcRatio = naturalWidth / naturalHeight;

      let cropWidth = naturalWidth;
      let cropHeight = naturalHeight;
      let cropX = 0;
      let cropY = 0;

      if (srcRatio > targetRatio) {
        // Kaynak görsel 16:9'dan daha geniş -> yanlardan eşit kırp
        cropWidth = Math.round(naturalHeight * targetRatio);
        cropX = Math.round((naturalWidth - cropWidth) / 2);
      } else {
        // Kaynak görsel 16:9'dan daha dar (veya dikey/kare) -> alt ve üstten eşit kırp
        cropHeight = Math.round(naturalWidth / targetRatio);
        cropY = Math.round((naturalHeight - cropHeight) / 2);
      }

      // Yüksek çözünürlüklü 16:9 tuval (1280x720 ile 1920x1080 arası)
      const canvasWidth = Math.min(1920, Math.max(1280, cropWidth));
      const canvasHeight = Math.round(canvasWidth / targetRatio);

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Merkeze odaklı 16:9 kırpma ve çizim
      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvasWidth,
        canvasHeight
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file); // Tuval oluşturulamazsa orijinali dön
          }
          const baseName = (file.name || 'image.jpg').replace(/\.[^/.]+$/, '');
          const newFile = new File([blob], `${baseName}-16x9.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(newFile);
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Hata durumunda orijinal dosyayı koru
    };

    img.src = objectUrl;
  });
}
