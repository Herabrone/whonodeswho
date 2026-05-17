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

export const OPEN_IMPORT_EXPORT_EVENT = "whonodeswho:open-import-export";

export function dispatchOpenImportExport(): void {
  window.dispatchEvent(new CustomEvent(OPEN_IMPORT_EXPORT_EVENT));
}
