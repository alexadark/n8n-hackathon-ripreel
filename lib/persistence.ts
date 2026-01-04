const STORAGE_KEY = "shipkit-chat-preferred-model";

const isLocalStorageAvailable =
  typeof window !== "undefined" && window.localStorage;

const getStoredModelId = (): string | null => {
  if (!isLocalStorageAvailable) {
    return null;
  }
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return null;
  }
};

const setStoredModelId = (modelId: string) => {
  if (!isLocalStorageAvailable) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modelId));
  } catch (error) {
    console.error("Error writing to localStorage:", error);
  }
};

export const modelPersistence = {
  get: getStoredModelId,
  set: setStoredModelId,
};
