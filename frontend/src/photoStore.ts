// photoStore.ts
//
// Owner: Marcos Lepage - Requirement 4 (pictures).
//
// Photos are kept in IndexedDB rather than localStorage, since localStorage
// only holds about 5 MB and a single photo can be up to 10 MB. Each photo is
// tied to its experience by experienceId. Swap this out for the backend
// photo upload API once experiences are stored on the server.

const DB_NAME = 'triptrace';
const STORE = 'photos';

export type StoredPhoto = {
  id: number;
  experienceId: number;
  name: string;
  blob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('experienceId', 'experienceId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Saves every file for the experience and returns the new photo ids.
export async function savePhotos(experienceId: number, files: File[]): Promise<number[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const ids: number[] = [];
    files.forEach((file) => {
      const request = store.add({ experienceId, name: file.name, blob: file });
      request.onsuccess = () => ids.push(request.result as number);
    });
    tx.oncomplete = () => resolve(ids);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPhotos(experienceId: number): Promise<StoredPhoto[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).index('experienceId').getAll(experienceId);
    request.onsuccess = () => resolve(request.result as StoredPhoto[]);
    request.onerror = () => reject(request.error);
  });
}
