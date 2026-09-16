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
