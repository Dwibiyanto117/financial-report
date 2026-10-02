/**
 * Currency Formatter Utility
 * Dirancang fleksibel untuk mempermudah penambahan multi-currency di masa depan.
 */

const CURRENCY_CONFIG = {
  IDR: {
    locale: 'id-ID',
    currency: 'IDR',
    fractionDigits: 0
  },
  USD: {
    locale: 'en-US',
    currency: 'USD',
    fractionDigits: 2
  },
  SGD: {
    locale: 'en-SG',
    currency: 'SGD',
    fractionDigits: 2
  }
};

export function formatCurrency(amount, currencyCode = 'IDR') {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.IDR;
  const numericAmount = Number(amount) || 0;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits
  }).format(numericAmount);
}

export function parseCurrencyInput(valueString) {
  if (!valueString) return 0;
  const sanitized = valueString.toString().replace(/[^0-9.-]+/g, '');
  return parseFloat(sanitized) || 0;
}

/**
 * Format raw numeric string/number to Rupiah input display with dots separator and ,00 suffix
 * e.g. "50000" -> "50.000,00"
 */
export function formatRupiahDisplay(raw, allowZero = false) {
  if (raw === undefined || raw === null || raw === '') return '';
  const str = String(raw).replace(/\D/g, '');
  if (!str) return '';
  if (str === '0' && !allowZero) return '0,00';
  const formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted},00`;
}

/**
 * Parse user input string while typing into clean raw integer digits
 * Handles keystrokes at end, before ,00, paste, and backspaces
 */
export function parseRupiahInput(inputValue, prevRawNumber) {
  if (!inputValue) return '';
  const trimmed = inputValue.trim();
  if (trimmed === '' || trimmed === ',00' || trimmed === ',0' || trimmed === ',') {
    return '';
  }

  let raw = '';
  if (trimmed.includes('Rp') || trimmed.includes('rp')) {
    const withoutRp = trimmed.replace(/rp/gi, '').trim();
    if (withoutRp.endsWith(',00')) {
      raw = withoutRp.slice(0, -3).replace(/\D/g, '');
    } else {
      raw = withoutRp.replace(/\D/g, '');
    }
  } else if (trimmed.endsWith(',00')) {
    raw = trimmed.slice(0, -3).replace(/\D/g, '');
  } else if (trimmed.endsWith(',0')) {
    const numStr = String(prevRawNumber || '');
    raw = numStr.slice(0, -1);
  } else if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    const intPart = parts[0].replace(/\D/g, '');
    const decPart = parts[1] || '';
    if (decPart.startsWith('00') && decPart.length > 2) {
      const extra = decPart.slice(2).replace(/\D/g, '');
      raw = intPart + extra;
    } else {
      raw = intPart;
    }
  } else {
    raw = trimmed.replace(/\D/g, '');
  }

  // Remove leading zeros unless it's just '0'
  raw = raw.replace(/^0+(?=\d)/, '');
  return raw;
}

