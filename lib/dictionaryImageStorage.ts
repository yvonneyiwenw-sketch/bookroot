"use client";

const DB_NAME = "bookroot-media";
const DB_VERSION = 1;
const STORE_NAME = "dictionary-images";

type StoredDictionaryImage = {
  cacheKey: string;
  dataUrl: string;
  model?: string;
  generatedAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "cacheKey" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open IndexedDB."));
  });
}

export async function getDictionaryImage(cacheKey: string) {
  if (typeof window === "undefined" || !window.indexedDB) return undefined;

  const db = await openDatabase();

  return new Promise<StoredDictionaryImage | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(cacheKey);

    request.onsuccess = () => resolve(request.result as StoredDictionaryImage | undefined);
    request.onerror = () => reject(request.error || new Error("Could not read the saved image."));
    transaction.oncomplete = () => db.close();
  });
}

export async function saveDictionaryImage(
  cacheKey: string,
  dataUrl: string,
  model?: string
) {
  const db = await openDatabase();
  const record: StoredDictionaryImage = {
    cacheKey,
    dataUrl,
    model,
    generatedAt: new Date().toISOString()
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Could not save the image."));
  });

  db.close();
  return record;
}
