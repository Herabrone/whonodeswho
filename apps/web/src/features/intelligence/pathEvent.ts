export const OPEN_PATH_MODAL_EVENT = "whonodeswho:open-path-modal";

export function dispatchOpenPathModal(): void {
  window.dispatchEvent(new CustomEvent(OPEN_PATH_MODAL_EVENT));
}
