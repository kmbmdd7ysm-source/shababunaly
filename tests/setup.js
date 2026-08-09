class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key) {
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }
  key(index) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key) {
    this.map.delete(String(key));
  }
  setItem(key, value) {
    this.map.set(String(key), String(value));
  }
}

if (!globalThis.localStorage)
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage() });
if (!globalThis.sessionStorage)
  Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage() });
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
  });
}
