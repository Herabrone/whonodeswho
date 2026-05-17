import {
  ALLOWED_RELATIONSHIP_TYPES,
  type RelationshipType,
} from './constants';

export interface RelationshipTypeSuggestion {
  bestMatch: RelationshipType;
  confidence: number;
  alternatives: RelationshipType[];
  allowedTypes: readonly RelationshipType[];
}

const SYNONYMS: Record<string, RelationshipType> = {
  aunt: 'aunt_uncle',
  bestie: 'best_friend',
  bff: 'best_friend',
  boss: 'manager',
  brother: 'sibling',
  colleague: 'coworker',
  cousin: 'cousin',
  dad: 'parent',
  daughter: 'child',
  employee: 'employee',
  ex: 'ex_partner',
  father: 'parent',
  grandchild: 'grandchild',
  grandfather: 'grandparent',
  grandmother: 'grandparent',
  grandparent: 'grandparent',
  husband: 'spouse',
  manager: 'manager',
  mentor: 'mentor',
  mentee: 'mentee',
  mom: 'parent',
  mother: 'parent',
  neighbour: 'neighbour',
  neighbor: 'neighbour',
  niece: 'niece_nephew',
  nephew: 'niece_nephew',
  partner: 'partner',
  roommate: 'roommate',
  sister: 'sibling',
  son: 'child',
  spouse: 'spouse',
  uncle: 'aunt_uncle',
  wife: 'spouse',
};

export function suggestRelationshipType(
  freeText: string,
): RelationshipTypeSuggestion {
  const normalized = normalize(freeText);
  const synonymMatch = findSynonym(normalized);
  const scored = ALLOWED_RELATIONSHIP_TYPES.map((type) => ({
    type,
    score: scoreType(normalized, type),
  })).sort((a, b) => b.score - a.score);

  if (synonymMatch) {
    const alternatives = scored
      .map((item) => item.type)
      .filter((type) => type !== synonymMatch)
      .slice(0, 3);
    return {
      bestMatch: synonymMatch,
      confidence: 0.92,
      alternatives,
      allowedTypes: ALLOWED_RELATIONSHIP_TYPES,
    };
  }

  const [best, ...rest] = scored;
  return {
    bestMatch: best.type,
    confidence: Number(best.score.toFixed(2)),
    alternatives: rest.slice(0, 3).map((item) => item.type),
    allowedTypes: ALLOWED_RELATIONSHIP_TYPES,
  };
}

function findSynonym(value: string): RelationshipType | null {
  const words = value.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (SYNONYMS[word]) {
      return SYNONYMS[word];
    }
  }
  return SYNONYMS[value] ?? null;
}

function scoreType(value: string, type: RelationshipType): number {
  const typeText = normalize(type.replace(/_/g, ' '));
  if (!value) {
    return type === 'unknown' ? 0.5 : 0;
  }
  if (value === typeText || value === type) {
    return 1;
  }
  if (value.includes(typeText) || typeText.includes(value)) {
    return 0.85;
  }

  const distance = levenshtein(value, typeText);
  const maxLength = Math.max(value.length, typeText.length, 1);
  return Math.max(0, 1 - distance / maxLength);
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const cost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      current[rightIndex + 1] = Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}