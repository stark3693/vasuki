import { useState, useEffect, useCallback } from 'react';

interface IndexedDBHook {
  isReady: boolean;
  error: string | null;
  getItem: <T>(key: string) => Promise<T | null>;
  setItem: <T>(key: string, value: T) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  exportData: () => Promise<{ [key: string]: any }>;
}

const DB_NAME = 'vasukii_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_data';

export function useIndexedDB(): IndexedDBHook {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        if (!window.indexedDB) {
          throw new Error('IndexedDB is not supported in this browser');
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          setError('Failed to open IndexedDB');
        };

        request.onsuccess = () => {
          setDb(request.result);
          setIsReady(true);
        };

        request.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize IndexedDB');
      }
    };

    initDB();

    return () => {
      if (db) {
        db.close();
      }
    };
  }, []);

  const getItem = useCallback(async <T,>(key: string): Promise<T | null> => {
    if (!db) {
      throw new Error('Database not ready');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get item from IndexedDB'));
      };
    });
  }, [db]);

  const setItem = useCallback(async <T,>(key: string, value: T): Promise<void> => {
    if (!db) {
      throw new Error('Database not ready');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: key, value, timestamp: Date.now() });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to set item in IndexedDB'));
      };
    });
  }, [db]);

  const removeItem = useCallback(async (key: string): Promise<void> => {
    if (!db) {
      throw new Error('Database not ready');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to remove item from IndexedDB'));
      };
    });
  }, [db]);

  const clear = useCallback(async (): Promise<void> => {
    if (!db) {
      throw new Error('Database not ready');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear IndexedDB'));
      };
    });
  }, [db]);

  const exportData = useCallback(async (): Promise<{ [key: string]: any }> => {
    if (!db) {
      throw new Error('Database not ready');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const data: { [key: string]: any } = {};
        request.result.forEach((item) => {
          data[item.id] = item.value;
        });
        resolve(data);
      };

      request.onerror = () => {
        reject(new Error('Failed to export data from IndexedDB'));
      };
    });
  }, [db]);

  return {
    isReady,
    error,
    getItem,
    setItem,
    removeItem,
    clear,
    exportData
  };
}
