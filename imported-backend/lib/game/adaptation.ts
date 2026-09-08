// Player Behavioral Adaptation Engine for VYBZ // ARCADE SYSTEM
// Personalizes future game generation based on persistent behavioral history.

import { PlayerBehavioralProfile, VybzQuestion } from "@/types/vybz";

export interface AdaptationDirectives {
  targetDifficulty: "easy" | "medium" | "hard" | "extreme";
  emphasizedCategories: string[];
  candidateDistractorsPriority?: string[];
  reinforcementNeeded: boolean;
}

export function computeAdaptationDirectives(
  profile?: Partial<PlayerBehavioralProfile> | null
): AdaptationDirectives {
  if (!profile || !profile.gamesPlayed || profile.gamesPlayed === 0) {
    return {
      targetDifficulty: "medium",
      emphasizedCategories: [],
      reinforcementNeeded: false,
    };
  }

  // 1. Difficulty Scaling
  let targetDifficulty: "easy" | "medium" | "hard" | "extreme" = "medium";
  if (profile.accuracy && profile.accuracy >= 80) {
    targetDifficulty = "hard";
  } else if (profile.accuracy && profile.accuracy < 40) {
    targetDifficulty = "easy";
  }

  // 2. Weak Area Reinforcement
  const weakAreas = Array.isArray(profile.weakAreas) ? profile.weakAreas : [];
  const reinforcementNeeded = weakAreas.length > 0;

  return {
    targetDifficulty,
    emphasizedCategories: weakAreas,
    reinforcementNeeded,
  };
}

export function applyAdaptationToQuestions(
  questions: VybzQuestion[],
  directives: AdaptationDirectives
): VybzQuestion[] {
  return questions.map((q) => {
    // If reinforcement is needed and question matches weak area, flag category
    if (directives.emphasizedCategories.includes(q.category)) {
      return {
        ...q,
        category: `${q.category} [REINFORCEMENT]`,
        difficulty: directives.targetDifficulty,
      };
    }
    return {
      ...q,
      difficulty: directives.targetDifficulty,
    };
  });
}
