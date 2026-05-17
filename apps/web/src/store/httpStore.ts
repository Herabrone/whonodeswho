import type { PersistedState } from '../types';
import { apiDelete, apiGet, apiPut } from '../lib/apiClient';
import type { RelationshipStore } from './persistence';

class HttpStore implements RelationshipStore {
  async load(): Promise<PersistedState> {
    return apiGet<PersistedState>('/graph');
  }

  async save(state: PersistedState): Promise<void> {
    await apiPut<PersistedState>('/graph', state);
  }

  async clear(): Promise<void> {
    await apiDelete<PersistedState>('/graph');
  }
}

const persistenceStore = new HttpStore();

export function createPersistenceStore(): RelationshipStore {
  return persistenceStore;
}
