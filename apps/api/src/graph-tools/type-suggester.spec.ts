import { suggestRelationshipType } from './type-suggester';

describe('suggestRelationshipType', () => {
  it('maps common synonyms to allowed relationship types', () => {
    expect(suggestRelationshipType('my boss').bestMatch).toBe('manager');
    expect(suggestRelationshipType('old roommate').bestMatch).toBe('roommate');
    expect(suggestRelationshipType('bff from college').bestMatch).toBe(
      'best_friend',
    );
  });

  it('falls back to fuzzy matching for enum-like text', () => {
    const suggestion = suggestRelationshipType('profesional contact');

    expect(suggestion.bestMatch).toBe('professional_contact');
    expect(suggestion.confidence).toBeGreaterThan(0.7);
    expect(suggestion.allowedTypes).toContain('professional_contact');
  });
});