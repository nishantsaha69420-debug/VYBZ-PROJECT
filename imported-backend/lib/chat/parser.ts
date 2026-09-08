// WhatsApp & Chat Log Parser for VYBZ // ARCADE SYSTEM
// Extracts stable message IDs, authors, message texts, and timestamps.

import { ParsedChatMessage } from "@/types/vybz";

export interface ParseResult {
  messages: ParsedChatMessage[];
  participants: string[];
  messageCount: number;
}

// Regex patterns for WhatsApp standard export formats
const BRACKET_REGEX = /^\[(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s+([^:]+?):\s+(.*)$/;
const DASH_REGEX = /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s+-\s+([^:]+?):\s+(.*)$/;

const SYSTEM_PATTERNS = [
  /Messages and calls are end-to-end encrypted/i,
  /<Media omitted>/i,
  /joined using this group's invite link/i,
  /changed the subject to/i,
  /changed this group's icon/i,
  /left the group/i,
  /added you/i,
  /security code changed/i,
  /This message was deleted/i,
  /You deleted this message/i,
];

export function parseChatLog(rawText: string): ParseResult {
  if (!rawText || !rawText.trim()) {
    return { messages: [], participants: [], messageCount: 0 };
  }

  // 1. Try JSON array format first
  const trimmed = rawText.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsedJson = JSON.parse(trimmed);
      if (Array.isArray(parsedJson) && parsedJson.length > 0) {
        const messages: ParsedChatMessage[] = [];
        const participantsSet = new Set<string>();

        parsedJson.forEach((item, index) => {
          if (item.author && item.text) {
            const author = String(item.author).trim();
            const text = String(item.text).trim();
            if (author && text) {
              participantsSet.add(author);
              messages.push({
                id: item.id || `msg_${String(index + 1).padStart(4, "0")}`,
                author,
                text,
                timestamp: item.timestamp || new Date().toISOString(),
              });
            }
          }
        });

        return {
          messages,
          participants: Array.from(participantsSet),
          messageCount: messages.length,
        };
      }
    } catch {
      // Continue to TXT parsing if JSON parsing fails
    }
  }

  // 2. WhatsApp TXT Line-by-Line Parsing
  const lines = rawText.split(/\r?\n/);
  const messages: ParsedChatMessage[] = [];
  const participantsSet = new Set<string>();

  let currentMessage: ParsedChatMessage | null = null;
  let counter = 1;

  for (const line of lines) {
    if (!line.trim()) continue;

    const bracketMatch = line.match(BRACKET_REGEX);
    const dashMatch = line.match(DASH_REGEX);
    const match = bracketMatch || dashMatch;

    if (match) {
      const [, date, time, rawAuthor, rawText] = match;
      const author = rawAuthor.trim();
      const text = rawText.trim();

      // Check if message is system text
      const isSystem = SYSTEM_PATTERNS.some((pat) => pat.test(text) || pat.test(author));
      if (isSystem) {
        currentMessage = null;
        continue;
      }

      currentMessage = {
        id: `msg_${String(counter++).padStart(4, "0")}`,
        author,
        text,
        timestamp: `${date}, ${time}`,
      };

      participantsSet.add(author);
      messages.push(currentMessage);
    } else if (currentMessage) {
      // Multi-line continuation
      currentMessage.text += `\n${line.trim()}`;
    }
  }

  return {
    messages,
    participants: Array.from(participantsSet),
    messageCount: messages.length,
  };
}
