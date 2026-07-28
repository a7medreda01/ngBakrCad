import { Injectable } from '@angular/core';

export interface StoredFileRecord {
  name: string;
  type: string;
  size: number;
  blob: Blob;
}

export interface OrderDraftData {
  form: any;
  selectedTeeth: number[];
  assignments: any[];
  currentStep: number;
  files: File[];
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DraftStorageService {
  private readonly dbName = 'BakrCadOrderDraftDB';
  private readonly storeName = 'drafts';
  private readonly draftKey = 'current_order_draft';

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDraft(data: {
    form: any;
    selectedTeeth: number[];
    assignments: any[];
    currentStep: number;
    files: File[];
  }): Promise<void> {
    try {
      const db = await this.openDB();
      const fileRecords: StoredFileRecord[] = (data.files || []).map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        blob: f
      }));

      const recordToStore = {
        form: data.form,
        selectedTeeth: data.selectedTeeth || [],
        assignments: data.assignments || [],
        currentStep: data.currentStep || 1,
        files: fileRecords,
        updatedAt: new Date().toISOString()
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.put(recordToStore, this.draftKey);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to save draft to IndexedDB:', e);
    }
  }

  async getDraft(): Promise<OrderDraftData | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(this.draftKey);
        req.onsuccess = () => {
          const raw = req.result;
          if (!raw) {
            resolve(null);
            return;
          }

          // Reconstruct File objects from stored Blobs
          const restoredFiles: File[] = (raw.files || []).map((fr: StoredFileRecord) => {
            return new File([fr.blob], fr.name, { type: fr.type, lastModified: Date.now() });
          });

          resolve({
            form: raw.form,
            selectedTeeth: raw.selectedTeeth || [],
            assignments: raw.assignments || [],
            currentStep: raw.currentStep || 1,
            files: restoredFiles,
            updatedAt: raw.updatedAt
          });
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to load draft from IndexedDB:', e);
      return null;
    }
  }

  async clearDraft(): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.delete(this.draftKey);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to clear draft from IndexedDB:', e);
    }
  }
}
