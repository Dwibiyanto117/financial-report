/**
 * Registry & Resolving Parser Mutasi
 *
 * Mengelola daftar parser adapter yang terdaftar (Mandiri, Generic, dll.)
 * serta mendeteksi parser yang paling cocok berdasarkan skor keyakinan (confidence).
 */

import * as templateParser from "./template.js";
import * as mandiriParser from "./mandiri.js";
import * as genericParser from "./generic.js";

const PARSERS = {
  [templateParser.name]: templateParser,
  [mandiriParser.name]: mandiriParser,
  [genericParser.name]: genericParser
};

/**
 * Mengambil parser berdasarkan nama identifier.
 *
 * @param {string} parserName
 * @returns {object} Parser module
 */
export function getParser(parserName) {
  if (!parserName) return null;
  const key = String(parserName).toLowerCase().trim();
  const parser = PARSERS[key];
  if (!parser) {
    const error = new Error(`Parser "${parserName}" tidak dikenali atau belum didukung`);
    error.statusCode = 400;
    throw error;
  }
  return parser;
}

/**
 * Mendeteksi parser otomatis berdasarkan isi berkas (grid) dan nama file.
 * Mengambil skor tertinggi di antara parser otomatis (non-generic).
 * Jika skor di bawah ambang batas (0.5), melempar HTTP 400 meminta pengguna
 * menggunakan parser 'generic' dengan pemetaan kolom.
 *
 * @param {object} ctx
 * @param {any[][]} ctx.grid
 * @param {string} [ctx.fileName]
 * @param {object} [ctx.mapping]
 * @returns {object} Parser terpilih
 */
export function detectParser(ctx) {
  // Jika mapping disediakan secara eksplisit, arahkan ke generic
  if (ctx && ctx.mapping && Object.keys(ctx.mapping).length >= 2) {
    return genericParser;
  }

  let bestParser = null;
  let highestScore = 0;

  for (const [key, parser] of Object.entries(PARSERS)) {
    if (key === genericParser.name) continue; // Jangan otomatis jadikan generic pemenang tanpa mapping

    if (typeof parser.detect === "function") {
      const score = parser.detect(ctx);
      if (score > highestScore) {
        highestScore = score;
        bestParser = parser;
      }
    }
  }

  // Ambang batas kecocokan minimum adalah 0.5
  if (bestParser && highestScore >= 0.5) {
    return bestParser;
  }

  const error = new Error(
    "Format berkas mutasi tidak dapat dikenali secara otomatis. Silakan pilih format 'generic' dan tentukan pemetaan kolom (mapping)."
  );
  error.statusCode = 400;
  throw error;
}

/**
 * Mengembalikan daftar parser yang tersedia untuk informasi klien dan endpoint API.
 *
 * @returns {Array<{ name: string, label: string, formats: string[], requiresMapping: boolean }>}
 */
export function listParsers() {
  return Object.values(PARSERS).map((p) => ({
    name: p.name,
    label: p.label || p.name,
    formats: Array.isArray(p.formats) ? p.formats : ["xlsx"],
    requiresMapping: Boolean(p.requiresMapping)
  }));
}

/**
 * Mengambil daftar seluruh ekstensi/format yang diizinkan untuk diunggah,
 * diturunkan secara dinamis dari gabungan format seluruh parser yang terdaftar.
 *
 * @returns {string[]} Contoh: ["csv", "xlsx"]
 */
export function getAllowedUploadFormats() {
  const formatsSet = new Set();
  for (const parser of Object.values(PARSERS)) {
    if (Array.isArray(parser.formats)) {
      for (const fmt of parser.formats) {
        formatsSet.add(String(fmt).toLowerCase().replace(/^\./, "").trim());
      }
    }
  }
  return Array.from(formatsSet);
}

/**
 * Mendaftarkan parser baru secara dinamis ke registry (in-memory).
 * Berguna untuk ekstensi modular atau uji integrasi parser baru.
 *
 * @param {object} customParser
 */
export function registerParser(customParser) {
  if (!customParser || !customParser.name) {
    throw new Error("Parser harus memiliki properti name");
  }
  PARSERS[customParser.name.toLowerCase().trim()] = customParser;
}

/**
 * Menghapus parser dari registry (in-memory).
 *
 * @param {string} parserName
 */
export function unregisterParser(parserName) {
  if (!parserName) return;
  delete PARSERS[String(parserName).toLowerCase().trim()];
}
