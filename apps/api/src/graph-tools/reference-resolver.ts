export interface ResolvablePerson {
  id: string;
  name: string;
  notes?: string | null;
  aliasesJson?: string | null;
  directRelationshipCount?: number;
}

export interface ResolvedPersonReference {
  resolved: true;
  personId: string;
  name: string;
  context: string;
}

export interface AmbiguousPersonReference {
  resolved: false;
  candidates: Array<{
    personId: string;
    name: string;
    context: string;
  }>;
}

export type PersonReferenceResolution =
  | ResolvedPersonReference
  | AmbiguousPersonReference
  | null;

export function resolvePersonReference(
  text: string,
  people: ResolvablePerson[],
  limit = 5,
): PersonReferenceResolution {
  const query = normalize(text);
  if (!query) {
    return null;
  }

  const matches = people
    .map((person) => ({ person, score: scorePerson(query, person) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name))
    .slice(0, Math.max(1, limit));

  if (matches.length === 0) {
    return null;
  }

  const [best, second] = matches;
  if (!second || best.score >= second.score + 0.2) {
    return {
      resolved: true,
      personId: best.person.id,
      name: best.person.name,
      context: personContext(best.person),
    };
  }

  return {
    resolved: false,
    candidates: matches.map(({ person }) => ({
      personId: person.id,
      name: person.name,
      context: personContext(person),
    })),
  };
}

function scorePerson(query: string, person: ResolvablePerson): number {
  const name = normalize(person.name);
  const aliases = parseAliases(person.aliasesJson).map(normalize);
  const notes = normalize(person.notes ?? '');

  if (name === query || aliases.includes(query)) {
    return 1;
  }
  if (name.startsWith(query) || aliases.some((alias) => alias.startsWith(query))) {
    return 0.9;
  }
  if (name.includes(query) || aliases.some((alias) => alias.includes(query))) {
    return 0.75;
  }
  if (notes.includes(query)) {
    return 0.35;
  }
  return fuzzyScore(query, name);
}

function personContext(person: ResolvablePerson): string {
  const count = person.directRelationshipCount ?? 0;
  const relationshipText = count === 1 ? '1 direct relationship' : `${count} direct relationships`;
  return person.notes ? `${person.notes} ${relationshipText}.` : relationshipText;
}

function parseAliases(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function fuzzyScore(query: string, value: string): number {
  if (query.length < 3 || value.length < 3) {
    return 0;
  }
  const distance = levenshtein(query, value);
  const maxLength = Math.max(query.length, value.length, 1);
  const score = 1 - distance / maxLength;
  return score >= 0.7 ? score : 0;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]+/g, ' ')
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