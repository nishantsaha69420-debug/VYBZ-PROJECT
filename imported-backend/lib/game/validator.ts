// Critical Question Grounding Validator for VYBZ // ARCADE SYSTEM
// Enforces that OpenAI output is never treated as authoritative over source chat messages.

import { VybzQuestion, ParsedChatMessage } from "@/types/vybz";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateQuestion(
  question: VybzQuestion,
  sourceMessagesMap: Map<string, ParsedChatMessage>
): ValidationResult {
  const errors: string[] = [];

  // 1. Verify sourceMessageIds exist
  if (!Array.isArray(question.sourceMessageIds) || question.sourceMessageIds.length === 0) {
    errors.push(`MISSING_SOURCE_ID // Question ${question.id} has no sourceMessageIds`);
  } else {
    for (const msgId of question.sourceMessageIds) {
      if (!sourceMessagesMap.has(msgId)) {
        errors.push(`INVALID_SOURCE_ID // sourceMessageId '${msgId}' not found in chat database.`);
      }
    }
  }

  // 2. Verify options structure
  if (!Array.isArray(question.options) || question.options.length !== 4) {
    errors.push(`INVALID_OPTION_COUNT // Expected exactly 4 options, received ${question.options?.length}`);
  } else {
    const keys = new Set(question.options.map((o) => o.key));
    if (keys.size !== 4 || !["A", "B", "C", "D"].every((k) => keys.has(k as any))) {
      errors.push(`INVALID_OPTION_KEYS // Options must have unique keys A, B, C, D`);
    }

    const labels = question.options.map((o) => o.label.trim().toLowerCase());
    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size !== 4) {
      errors.push(`DUPLICATE_OPTION_LABELS // Options contain duplicate candidate names: [${question.options.map((o) => o.label).join(", ")}]`);
    }
  }

  // 3. Verify correctAnswer points to an actual option
  const correctOption = question.options?.find((o) => o.key === question.correctAnswer);
  if (!correctOption) {
    errors.push(`INVALID_CORRECT_ANSWER // Key '${question.correctAnswer}' does not match any option.`);
  }

  // 4. Source Grounding Invariant for WHO_SAID_IT
  if (question.sourceType === "WHO_SAID_IT" && question.sourceMessageIds.length > 0) {
    const primaryMsg = sourceMessagesMap.get(question.sourceMessageIds[0]);
    if (primaryMsg) {
      // Clean quote text for comparison
      const cleanQuote = question.quote.replace(/^["']|["']$/g, "").trim().toLowerCase();
      const cleanSource = primaryMsg.text.toLowerCase();

      if (!cleanSource.includes(cleanQuote) && !cleanQuote.includes(cleanSource)) {
        errors.push(
          `UNGROUNDED_QUOTE // Quote "${question.quote}" does not appear in source message '${primaryMsg.id}'`
        );
      }

      if (correctOption && correctOption.label.trim().toLowerCase() !== primaryMsg.author.trim().toLowerCase()) {
        errors.push(
          `AUTHOR_MISMATCH_INVARIANT // Correct option '${correctOption.label}' does not match source author '${primaryMsg.author}'`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
