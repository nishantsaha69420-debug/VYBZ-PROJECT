// Room Code Generator for VYBZ // ARCADE SYSTEM

const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generate high-visibility arcade room code, e.g. "VYBZ-7K4P"
 */
export function generateRoomCode(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `VYBZ-${suffix}`;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}
