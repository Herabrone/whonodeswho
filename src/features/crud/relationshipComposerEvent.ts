export const OPEN_RELATIONSHIP_COMPOSER_EVENT = "whonodeswho:open-relationship-composer";

export interface OpenRelationshipComposerDetail {
  sourceId: string;
  targetId: string;
}

export function dispatchOpenRelationshipComposer(detail: OpenRelationshipComposerDetail): void {
  window.dispatchEvent(
    new CustomEvent<OpenRelationshipComposerDetail>(
      OPEN_RELATIONSHIP_COMPOSER_EVENT,
      { detail },
    ),
  );
}
