const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

exports.deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

exports.runtime = (initial = {}) => {
  const secure = new Map(Object.entries(initial.secure || {}));
  const plain = new Map(Object.entries(initial.plain || {}));
  const native = {
    getItemAsync: async (key) => secure.get(key) ?? null,
    setItemAsync: async (key, value) => { secure.set(key, value); },
    deleteItemAsync: async (key) => { secure.delete(key); },
  };
  const storage = {
    getItem: async (key) => plain.get(key) ?? null,
    setItem: async (key, value) => { plain.set(key, value); },
    removeItem: async (key) => { plain.delete(key); },
    getAllKeys: async () => [...plain.keys()],
  };
  const redirects = [];
  const cache = new Map();
  const mocks = {
    'expo-secure-store': native,
    '@react-native-async-storage/async-storage': storage,
    'expo-router': { router: { replace: (value) => redirects.push(value) } },
    '@/lib/env': { env: { BACKEND_URL: 'https://api.example.test' } },
  };
  function load(name) {
    if (mocks[name]) return mocks[name];
    if (!name.startsWith('@/')) return require(name);
    if (cache.has(name)) return cache.get(name).exports;
    const file = path.join(__dirname, '../src', `${name.slice(2)}.ts`);
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    cache.set(name, module);
    new Function('require', 'module', 'exports', output)(load, module, module.exports);
    return module.exports;
  }
  return { load, secure, plain, native, storage, redirects };
};

exports.tick = () => new Promise((resolve) => setImmediate(resolve));
