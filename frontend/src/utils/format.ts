export function formatCurrency(amount: number, currency = 'VND'): string {
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function generateIdempotencyKey(prefix = 'WEB'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * Formats a raw number string or number into thousand-dot format: e.g. "1000000" -> "1.000.000"
 */
export function formatNumberWithDots(val: string | number): string {
  if (val === null || val === undefined || val === '') return '';
  const cleanStr = String(val).replace(/\D/g, '');
  if (!cleanStr) return '';
  return cleanStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parses a thousand-dot string back into an integer: e.g. "1.000.000" -> 1000000
 */
export function parseNumberFromDots(val: string): number {
  if (!val) return 0;
  const cleanStr = val.replace(/\D/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

const VI_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const VI_UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function readGroupOfThree(threeDigits: string, showZeroHundred: boolean): string {
  const a = parseInt(threeDigits[0], 10);
  const b = parseInt(threeDigits[1], 10);
  const c = parseInt(threeDigits[2], 10);
  let result = '';

  if (a !== 0 || showZeroHundred) {
    result += `${VI_DIGITS[a]} trăm `;
    if (b === 0 && c !== 0) {
      result += 'linh ';
    }
  }

  if (b !== 0 && b !== 1) {
    result += `${VI_DIGITS[b]} mươi `;
    if (c === 1) result += 'mốt ';
    else if (c === 5) result += 'lăm ';
    else if (c !== 0) result += `${VI_DIGITS[c]} `;
  } else if (b === 1) {
    result += 'mười ';
    if (c === 5) result += 'lăm ';
    else if (c !== 0) result += `${VI_DIGITS[c]} `;
  } else if (c !== 0) {
    result += `${VI_DIGITS[c]} `;
  }

  return result.trim();
}

/**
 * Converts a number to words in Vietnamese (e.g. 100000 -> "Một trăm nghìn đồng")
 */
export function numberToWordsVietnamese(num: number, currency = 'VND'): string {
  if (isNaN(num) || num <= 0) return '';
  let str = Math.floor(num).toString();
  while (str.length % 3 !== 0) {
    str = '0' + str;
  }

  const groups: string[] = [];
  for (let i = 0; i < str.length; i += 3) {
    groups.push(str.substring(i, i + 3));
  }

  const groupCount = groups.length;
  const words: string[] = [];

  for (let i = 0; i < groupCount; i++) {
    const groupVal = parseInt(groups[i], 10);
    if (groupVal !== 0) {
      const showZero = i > 0;
      const groupText = readGroupOfThree(groups[i], showZero);
      const unitIndex = groupCount - 1 - i;
      const unit = VI_UNITS[unitIndex] || '';
      words.push(`${groupText} ${unit}`.trim());
    }
  }

  if (words.length === 0) return '';

  const fullSentence = words.join(' ').replace(/\s+/g, ' ').trim();
  const currencyUnit = currency === 'USD' ? 'đô la Mỹ' : 'đồng';
  const capitalized = fullSentence.charAt(0).toUpperCase() + fullSentence.slice(1);
  return `${capitalized} ${currencyUnit}`.trim();
}

const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const EN_SCALES = ['', 'thousand', 'million', 'billion'];

function numberToWordsEnglishHelper(n: number): string {
  if (n === 0) return '';
  if (n < 20) return EN_ONES[n];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + EN_ONES[n % 10] : '');
  return EN_ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 !== 0 ? ' and ' + numberToWordsEnglishHelper(n % 100) : '');
}

export function numberToWordsEnglish(num: number, currency = 'VND'): string {
  if (isNaN(num) || num <= 0) return '';
  let n = Math.floor(num);
  const parts: string[] = [];
  let scaleIndex = 0;

  while (n > 0) {
    const chunk = n % 1000;
    if (chunk !== 0) {
      const chunkText = numberToWordsEnglishHelper(chunk);
      const scale = EN_SCALES[scaleIndex];
      parts.unshift(scale ? `${chunkText} ${scale}` : chunkText);
    }
    n = Math.floor(n / 1000);
    scaleIndex++;
  }

  if (parts.length === 0) return '';
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  const currencyUnit = currency === 'USD' ? 'US Dollars' : 'Vietnamese Dong';
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return `${capitalized} ${currencyUnit}`;
}

/**
 * Universal number to words converter with language support
 */
export function numberToWords(amount: number, lang = 'vi', currency = 'VND'): string {
  if (!amount || amount <= 0) return '';
  if (lang.startsWith('en')) {
    return numberToWordsEnglish(amount, currency);
  }
  return numberToWordsVietnamese(amount, currency);
}
