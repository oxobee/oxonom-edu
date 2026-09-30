const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.resolve(__dirname, '../client/public/audio/english');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const words = [
  // Animals
  { id: 'cat', text: 'Cat' },
  { id: 'dog', text: 'Dog' },
  { id: 'bird', text: 'Bird' },
  { id: 'lion', text: 'Lion' },
  { id: 'elephant', text: 'Elephant' },
  { id: 'monkey', text: 'Monkey' },
  { id: 'rabbit', text: 'Rabbit' },
  { id: 'fish', text: 'Fish' },
  { id: 'duck', text: 'Duck' },
  { id: 'horse', text: 'Horse' },

  // Food & Drinks
  { id: 'apple', text: 'Apple' },
  { id: 'banana', text: 'Banana' },
  { id: 'orange', text: 'Orange' },
  { id: 'milk', text: 'Milk' },
  { id: 'bread', text: 'Bread' },
  { id: 'cheese', text: 'Cheese' },
  { id: 'water', text: 'Water' },
  { id: 'egg', text: 'Egg' },
  { id: 'pizza', text: 'Pizza' },
  { id: 'cake', text: 'Cake' },

  // Colors & Shapes
  { id: 'red', text: 'Red' },
  { id: 'blue', text: 'Blue' },
  { id: 'green', text: 'Green' },
  { id: 'yellow', text: 'Yellow' },
  { id: 'purple', text: 'Purple' },
  { id: 'pink', text: 'Pink' },
  { id: 'star', text: 'Star' },
  { id: 'circle', text: 'Circle' },
  { id: 'triangle', text: 'Triangle' },
  { id: 'heart', text: 'Heart' },

  // Numbers
  { id: 'one', text: 'One' },
  { id: 'two', text: 'Two' },
  { id: 'three', text: 'Three' },
  { id: 'four', text: 'Four' },
  { id: 'five', text: 'Five' },
  { id: 'six', text: 'Six' },
  { id: 'seven', text: 'Seven' },
  { id: 'eight', text: 'Eight' },
  { id: 'nine', text: 'Nine' },
  { id: 'ten', text: 'Ten' },

  // Clothes
  { id: 'tshirt', text: 'T-Shirt' },
  { id: 'pants', text: 'Pants' },
  { id: 'shoes', text: 'Shoes' },
  { id: 'hat', text: 'Hat' },
  { id: 'dress', text: 'Dress' },
  { id: 'jacket', text: 'Jacket' },
  { id: 'socks', text: 'Socks' },
  { id: 'coat', text: 'Coat' },

  // Classroom & School
  { id: 'pencil', text: 'Pencil' },
  { id: 'book', text: 'Book' },
  { id: 'bag', text: 'School Bag' },
  { id: 'ruler', text: 'Ruler' },
  { id: 'desk', text: 'Desk' },
  { id: 'scissors', text: 'Scissors' },
  { id: 'eraser', text: 'Eraser' },
  { id: 'teacher', text: 'Teacher' },

  // Weather & Feelings
  { id: 'sunny', text: 'Sunny' },
  { id: 'rainy', text: 'Rainy' },
  { id: 'snowy', text: 'Snowy' },
  { id: 'windy', text: 'Windy' },
  { id: 'happy', text: 'Happy' },
  { id: 'sad', text: 'Sad' },
  { id: 'tired', text: 'Tired' },
  { id: 'excited', text: 'Excited' }
];

function downloadWord(item) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(targetDir, `${item.id}.mp3`);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(item.text)}`;

    const file = fs.createWriteStream(filePath);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${item.text}: status ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log(`Starting download of ${words.length} English words...`);
  for (const item of words) {
    process.stdout.write(`Downloading ${item.id} (${item.text})... `);
    try {
      await downloadWord(item);
      console.log('✓ OK');
    } catch (e) {
      console.error(`✗ ERROR: ${e.message}`);
    }
    // Small polite delay
    await new Promise(r => setTimeout(r, 120));
  }
  console.log('Finished downloading all audio files.');
}

main();
