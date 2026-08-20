import "@testing-library/jest-dom/vitest";

// This jsdom/Vitest combination doesn't reliably expose a working
// window.localStorage (it resolves to a plain object with no Storage
// prototype), so tests that exercise localStorage-backed persistence get a
// deterministic in-memory polyfill instead of depending on jsdom's own.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

if (typeof window.localStorage?.setItem !== "function") {
  Object.defineProperty(window, "localStorage", {
    value: createMemoryStorage(),
    writable: true,
    configurable: true,
  });
}

// jsdom doesn't implement the Blob URL registry — CSV export builds a download
// link via createObjectURL/revokeObjectURL, so stub them for deterministic tests.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock-url";
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = () => {};
}
