/**
 * Client-side TCKN validator and formatter
 */
export function validateTCKN(tc) {
    if (!tc) return false;
    const str = String(tc).trim();
    if (!/^[1-9]\d{10}$/.test(str)) {
        return false;
    }

    const digits = str.split('').map(Number);

    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const calculated10th = ((oddSum * 7) - evenSum) % 10;
    const tenthDigit = (calculated10th + 10) % 10;

    if (tenthDigit !== digits[9]) {
        return false;
    }

    let sum10 = 0;
    for (let i = 0; i < 10; i++) {
        sum10 += digits[i];
    }
    const calculated11th = sum10 % 10;

    if (calculated11th !== digits[10]) {
        return false;
    }

    return true;
}

export function maskTC(tc) {
    if (!tc) return '';
    const str = String(tc).trim();
    if (str.length < 2) return '***********';
    return '*********' + str.slice(-2);
}

export function transliterateTurkish(str) {
    if (!str) return '';
    const map = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ı': 'i', 'I': 'i', 'İ': 'i', 'i': 'i',
        'ö': 'o', 'Ö': 'o',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u'
    };
    return str
        .split('')
        .map(char => map[char] !== undefined ? map[char] : char)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

