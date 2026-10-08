export const KNOWN_CORRUPTED_NAMES: Record<string, string> = {
  'Nguy?n H?ng V?': 'Nguyễn Hùng Vĩ',
  'Chu Th? L??ng': 'Chu Thị Lương',
  'V? Th? C?c': 'Vũ Thị Cúc',
  'Ch? duy?t': 'Chờ duyệt',
  'Th?nh C?ng': 'Thành Công',
};

export function sanitizeVietnameseText(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (KNOWN_CORRUPTED_NAMES[trimmed]) {
    return KNOWN_CORRUPTED_NAMES[trimmed];
  }

  let result = trimmed;
  for (const [corrupted, clean] of Object.entries(KNOWN_CORRUPTED_NAMES)) {
    if (result.includes(corrupted)) {
      result = result.replaceAll(corrupted, clean);
    }
  }
  return result;
}
