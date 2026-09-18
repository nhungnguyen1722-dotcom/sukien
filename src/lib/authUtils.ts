export function safeDecodeURI(str: string | null | undefined): string {
  if (!str) return '';
  let decoded = str;
  for (let i = 0; i < 3; i++) {
    if (decoded.includes('%')) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch {
        break;
      }
    } else {
      break;
    }
  }
  return decoded.trim();
}
