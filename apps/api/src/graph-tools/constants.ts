import type { RelationshipCategory } from '@relationflow/contracts';

export const ALLOWED_RELATIONSHIP_TYPES = [
  'friend',
  'close_friend',
  'best_friend',
  'acquaintance',
  'family',
  'parent',
  'child',
  'sibling',
  'spouse',
  'partner',
  'grandparent',
  'grandchild',
  'aunt_uncle',
  'niece_nephew',
  'cousin',
  'ex_partner',
  'ex_spouse',
  'coworker',
  'manager',
  'employee',
  'business_partner',
  'client',
  'classmate',
  'estranged',
  'no_contact',
  'rival',
  'enemy',
  'frenemy',
  'betrayed',
  'traitor',
  'on_bad_terms',
  'complicated',
  'mentor',
  'mentee',
  'roommate',
  'neighbour',
  'met_at_event',
  'mutual_contact',
  'professional_contact',
  'unknown',
] as const;

export type RelationshipType = (typeof ALLOWED_RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_TYPE_CATEGORY: Record<
  RelationshipType,
  RelationshipCategory
> = {
  friend: 'friend',
  close_friend: 'friend',
  best_friend: 'friend',
  acquaintance: 'friend',
  family: 'family',
  parent: 'family',
  child: 'family',
  sibling: 'family',
  spouse: 'romantic',
  partner: 'romantic',
  grandparent: 'family',
  grandchild: 'family',
  aunt_uncle: 'family',
  niece_nephew: 'family',
  cousin: 'family',
  ex_partner: 'romantic',
  ex_spouse: 'romantic',
  coworker: 'work',
  manager: 'work',
  employee: 'work',
  business_partner: 'work',
  client: 'work',
  classmate: 'education',
  estranged: 'conflict',
  no_contact: 'conflict',
  rival: 'conflict',
  enemy: 'conflict',
  frenemy: 'conflict',
  betrayed: 'conflict',
  traitor: 'conflict',
  on_bad_terms: 'conflict',
  complicated: 'conflict',
  mentor: 'other',
  mentee: 'other',
  roommate: 'other',
  neighbour: 'other',
  met_at_event: 'other',
  mutual_contact: 'other',
  professional_contact: 'work',
  unknown: 'other',
};

export function isAllowedRelationshipType(
  value: string,
): value is RelationshipType {
  return ALLOWED_RELATIONSHIP_TYPES.includes(value as RelationshipType);
}

export function categoryForRelationshipType(
  type: RelationshipType,
): RelationshipCategory {
  return RELATIONSHIP_TYPE_CATEGORY[type];
}