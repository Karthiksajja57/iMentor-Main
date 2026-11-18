const crypto = require("crypto");
const log = require("./logger");

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

const DEFAULT_SECRET = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
const secretToUse = (process.env.ENCRYPTION_SECRET && process.env.ENCRYPTION_SECRET.length === 64)
  ? process.env.ENCRYPTION_SECRET
  : DEFAULT_SECRET;

let ENCRYPTION_KEY_BUFFER;
try {
  ENCRYPTION_KEY_BUFFER = Buffer.from(secretToUse, "hex");
  if (ENCRYPTION_KEY_BUFFER.length !== 32) {
    ENCRYPTION_KEY_BUFFER = Buffer.from(DEFAULT_SECRET, "hex");
  }
} catch (e) {
  log.warn('SYSTEM', `Using default crypto key fallback: ${e.message}`);
  ENCRYPTION_KEY_BUFFER = Buffer.from(DEFAULT_SECRET, "hex");
}

function encrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY_BUFFER) {
    log.error('SYSTEM', "Encryption service not configured");
    throw new Error("Encryption service is not properly configured.");
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY_BUFFER) {
    log.error('SYSTEM', "Decryption service not configured");
    throw new Error("Decryption service is not properly configured.");
  }
  try {
    const textParts = text.split(":");
    if (textParts.length !== 2) {
      log.error('SYSTEM', "Decryption failed: Invalid format");
      return null;
    }
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY_BUFFER,
      iv
    );
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted.toString();
  } catch (error) {
    log.error('SYSTEM', "Decryption failed", error);
    return null;
  }
}

module.exports = { encrypt, decrypt };
