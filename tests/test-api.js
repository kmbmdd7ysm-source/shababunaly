import assert from 'node:assert/strict';
import { afterEach, describe, test as nodeTest } from 'node:test';

const ARRAY_CONTAINING = Symbol('arrayContaining');
const stubs = [];

function isObject(value) {
  return value !== null && typeof value === 'object';
}
function matchesPartial(actual, expected) {
  if (expected && expected[ARRAY_CONTAINING]) {
    return (
      Array.isArray(actual) &&
      expected.values.every((entry) => actual.some((candidate) => matchesPartial(candidate, entry)))
    );
  }
  if (expected instanceof RegExp) return expected.test(String(actual));
  if (!isObject(expected)) return Object.is(actual, expected);
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((entry, index) => matchesPartial(actual[index], entry))
    );
  }
  if (!isObject(actual)) return false;
  return Object.entries(expected).every(([key, value]) => matchesPartial(actual[key], value));
}

function assertEqual(actual, expected) {
  if (expected && expected[ARRAY_CONTAINING]) {
    assert.ok(
      matchesPartial(actual, expected),
      `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected.values)}`,
    );
  } else {
    assert.deepStrictEqual(actual, expected);
  }
}

function makeMatchers(actual, negate = false) {
  const check = (fn) => {
    if (!negate) return fn();
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    if (!failed)
      throw new assert.AssertionError({ message: 'Negated expectation passed unexpectedly' });
  };
  return {
    get not() {
      return makeMatchers(actual, !negate);
    },
    toBe(expected) {
      check(() => assert.strictEqual(actual, expected));
    },
    toEqual(expected) {
      check(() => assertEqual(actual, expected));
    },
    toContain(expected) {
      check(() => {
        if (typeof actual === 'string') assert.ok(actual.includes(expected));
        else if (Array.isArray(actual))
          assert.ok(actual.some((value) => matchesPartial(value, expected)));
        else throw new assert.AssertionError({ message: 'toContain requires a string or array' });
      });
    },
    toBeTruthy() {
      check(() => assert.ok(actual));
    },
    toHaveLength(expected) {
      check(() => assert.strictEqual(actual?.length, expected));
    },
    toBeGreaterThan(expected) {
      check(() => assert.ok(actual > expected));
    },
    toBeLessThan(expected) {
      check(() => assert.ok(actual < expected));
    },
    toMatchObject(expected) {
      check(() =>
        assert.ok(
          matchesPartial(actual, expected),
          `Expected partial object ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
        ),
      );
    },
    toMatch(expected) {
      check(() =>
        assert.ok(
          expected instanceof RegExp
            ? expected.test(String(actual))
            : String(actual).includes(String(expected)),
        ),
      );
    },
    toThrow(expected) {
      check(() => {
        assert.strictEqual(typeof actual, 'function');
        let error;
        try {
          actual();
        } catch (caught) {
          error = caught;
        }
        assert.ok(error, 'Expected function to throw');
        if (expected instanceof RegExp) assert.match(String(error.message || error), expected);
        else if (typeof expected === 'string')
          assert.ok(String(error.message || error).includes(expected));
        else if (typeof expected === 'function') assert.ok(error instanceof expected);
      });
    },
  };
}

export function expect(actual) {
  return makeMatchers(actual);
}
expect.arrayContaining = (values) => ({ [ARRAY_CONTAINING]: true, values });

function test(name, fn, options) {
  return nodeTest(name, options || {}, fn);
}
test.each = (cases) => (name, fn) =>
  cases.forEach((entry) => {
    const values = Array.isArray(entry) ? entry : [entry];
    let index = 0;
    const title = name.replace(/%[sid]/g, () => String(values[index++]));
    nodeTest(title, () => fn(...values));
  });
export const it = test;
export { describe, afterEach };

/** @param {(...args:any[])=>any} [implementation] */
function createMock(implementation = () => undefined) {
  const mock = (...args) => {
    mock.mock.calls.push(args);
    return Reflect.apply(mock._implementation, null, args);
  };
  mock.mock = { calls: [] };
  mock._implementation = implementation;
  mock.mockImplementation = (next) => {
    mock._implementation = next;
    return mock;
  };
  mock.mockResolvedValue = (value) => mock.mockImplementation(() => Promise.resolve(value));
  mock.mockRejectedValue = (error) => mock.mockImplementation(() => Promise.reject(error));
  mock.mockReturnValue = (value) => mock.mockImplementation(() => value);
  return mock;
}

export const vi = {
  fn: createMock,
  stubGlobal(name, value) {
    const had = Object.prototype.hasOwnProperty.call(globalThis, name);
    const original = globalThis[name];
    stubs.push(() =>
      had
        ? Object.defineProperty(globalThis, name, {
            configurable: true,
            writable: true,
            value: original,
          })
        : delete globalThis[name],
    );
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  },
  restoreAllMocks() {
    while (stubs.length) stubs.pop()();
  },
};
