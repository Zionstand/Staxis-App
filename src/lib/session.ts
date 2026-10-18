let generation = 0;
let storageQueue: Promise<unknown> = Promise.resolve();

export const session = {
  current: () => generation,
  isCurrent: (expected: number) => generation === expected,
  advance: () => ++generation,
  assertCurrent(expected: number) {
    if (generation !== expected) throw new Error('The signed-in session changed');
  },
};

/** One queue for credential, account and checkout mutations, including logout. */
export function serializeStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation);
  storageQueue = result.catch(() => undefined);
  return result;
}
