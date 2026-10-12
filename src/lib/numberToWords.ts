/**
 * Converts a number to its Vietnamese words representation.
 * Example: 28650000 -> "Hai mươi tám triệu sáu trăm năm mươi nghìn đồng"
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(threeDigits: number, isHeadGroup: boolean): string {
  const hundreds = Math.floor(threeDigits / 100);
  const tens = Math.floor((threeDigits % 100) / 10);
  const ones = threeDigits % 10;

  if (hundreds === 0 && tens === 0 && ones === 0) {
    return '';
  }

  let result = '';

  // Đọc hàng trăm
  if (!isHeadGroup || hundreds > 0) {
    result += `${DIGITS[hundreds]} trăm `;
  }

  // Đọc hàng chục
  if (tens === 0) {
    if (ones > 0) {
      if (!isHeadGroup || hundreds > 0) {
        result += 'lẻ ';
      }
      result += DIGITS[ones];
    }
  } else if (tens === 1) {
    result += 'mười ';
    if (ones === 1) {
      result += 'một';
    } else if (ones === 5) {
      result += 'lăm';
    } else if (ones > 0) {
      result += DIGITS[ones];
    }
  } else {
    result += `${DIGITS[tens]} mươi `;
    if (ones === 1) {
      result += 'mốt';
    } else if (ones === 4) {
      result += 'tư';
    } else if (ones === 5) {
      result += 'lăm';
    } else if (ones > 0) {
      result += DIGITS[ones];
    }
  }

  return result.trim();
}

export function numberToVietnameseWords(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount) || amount <= 0) {
    return 'Không đồng';
  }

  const rounded = Math.round(amount);
  if (rounded === 0) return 'Không đồng';

  const SCALE_UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const groups: number[] = [];
  let temp = rounded;

  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val > 0) {
      const isHead = i === groups.length - 1;
      const text = readThreeDigits(val, isHead);
      const unit = SCALE_UNITS[i];
      parts.push(`${text} ${unit}`.trim());
    }
  }

  let finalStr = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (!finalStr) return 'Không đồng';

  // Viết hoa chữ cái đầu và thêm 'đồng'
  finalStr = finalStr.charAt(0).toUpperCase() + finalStr.slice(1) + ' đồng';
  return finalStr;
}
