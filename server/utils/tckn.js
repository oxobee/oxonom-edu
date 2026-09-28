const crypto = require('crypto');

// Use ENCRYPTION_KEY if provided in env, otherwise fallback to hash of JWT_SECRET
const SECRET = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'eduboard_default_encryption_secret_key_32bytes!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String(SECRET)).digest(); // exactly 32 bytes for AES-256
const ALGORITHM = 'aes-256-gcm';

/**
 * Validates Republic of Turkey Identification Number (T.C. Kimlik Numarası)
 * - 11 numeric digits
 * - Cannot start with 0
 * - 10th digit = ((d1+d3+d5+d7+d9)*7 - (d2+d4+d6+d8)) % 10
 * - 11th digit = sum(d1..d10) % 10
 */
function validateTCKN(tc) {
    if (!tc) return false;
    const str = String(tc).trim();
    if (!/^[1-9]\d{10}$/.test(str)) {
        return false;
    }

    const digits = str.split('').map(Number);

    // Rule 1: 10th digit verification
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const calculated10th = ((oddSum * 7) - evenSum) % 10;
    const tenthDigit = (calculated10th + 10) % 10;

    if (tenthDigit !== digits[9]) {
        return false;
    }

    // Rule 2: 11th digit verification
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

/**
 * Encrypts TCKN using AES-256-GCM
 */
function encryptTC(tc) {
    if (!tc) return null;
    const cleanTc = String(tc).trim();
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(cleanTc, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return {
        encrypted,
        iv: iv.toString('hex'),
        tag,
        masked: maskTC(cleanTc),
        hash: hashTC(cleanTc)
    };
}

/**
 * Decrypts TCKN using AES-256-GCM
 */
function decryptTC(encryptedHex, ivHex, tagHex) {
    if (!encryptedHex || !ivHex || !tagHex) return null;
    try {
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Failed to decrypt TCKN:', err.message);
        return null;
    }
}

/**
 * Mask TCKN to show only the last 2 digits: *********42
 */
function maskTC(tc) {
    if (!tc) return '';
    const str = String(tc).trim();
    if (str.length < 2) return '***********';
    return '*********' + str.slice(-2);
}

/**
 * One-way deterministic SHA-256 hash for duplicate check without exposing raw TC
 */
function hashTC(tc) {
    if (!tc) return '';
    return crypto.createHmac('sha256', ENCRYPTION_KEY).update(String(tc).trim()).digest('hex');
}

module.exports = {
    validateTCKN,
    encryptTC,
    decryptTC,
    maskTC,
    hashTC
};
