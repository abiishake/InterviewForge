# TOPIC --- JavaScript Language Fundamentals
**topic_id:** `js-fundamentals`
**priority:** `Core`

## js-fundamentals-001 --- What are the JavaScript data types, and how do primitives differ from reference types?

**question_id:** `js-fundamentals-001`\
**topic_id:** `js-fundamentals`\
**difficulty:** `Junior`\
**question_type:** `Conceptual / Practical`

**Question**

What are the JavaScript data types, and how do primitives differ from reference types?

**Answer**

JavaScript has seven primitives (`string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol`) and one structural type, `object` (which includes arrays, functions, dates, maps and sets). Primitives are immutable and are compared and copied **by value**. Objects are compared and copied **by reference**, so two variables can point at the same mutable object. `typeof null === "object"` is a historical bug, so check `null` explicitly. Many production bugs come from mutating a shared object that was assumed to be a copy.

Real-world example: an order summary component receives a `cart` object from a store. Sorting `cart.items` in place silently reorders the list everywhere else the store is read.

```js
// BUG: sort() mutates the array that is shared with the store
function renderCartBug(cart) {
  return cart.items.sort((a, b) => a.price - b.price);
}

// FIX: copy first (toSorted() in ES2023 does this for you)
function renderCart(cart) {
  return [...cart.items].sort((a, b) => a.price - b.price);
}

const a = { id: 1 };
const b = a;            // same reference
b.id = 2;
console.log(a.id);      // 2
console.log({ id: 1 } === { id: 1 }); // false: different references
console.log(typeof null, typeof undefined, typeof 10n); // "object" "undefined" "bigint"
```

**Keywords:**
`primitives, reference types, immutability, typeof, bigint, symbol, pass by reference`

**Follow-ups:**

-   Is JavaScript pass-by-value or pass-by-reference? (Pass-by-value of the reference.)
-   How do you detect an array, a Date and a plain object reliably?

## js-fundamentals-002 --- Explain == versus ===, type coercion and the surprising results it produces.

**question_id:** `js-fundamentals-002`\
**topic_id:** `js-fundamentals`\
**difficulty:** `Junior`\
**question_type:** `Conceptual / Practical`

**Question**

Explain `==` versus `===`, type coercion and the surprising results it produces.

**Answer**

`===` compares type and value with no conversion. `==` applies the abstract equality algorithm and coerces operands (for example `"5" == 5` is true and `null == undefined` is true). Default to `===`; the one widely accepted use of `==` is `value == null` to test for both `null` and `undefined`. Be careful with `+` (string concatenation wins), `NaN` (not equal to itself, use `Number.isNaN`) and `Object.is` for `-0` versus `+0`.

Real-world example: query-string values always arrive as strings, so a loose comparison hides a type bug that later breaks arithmetic.

```js
const params = new URLSearchParams(location.search);
const page = params.get("page");        // "2" (string)

if (page == 2) { /* works by accident */ }
const next = page + 1;                  // "21" - concatenation, not 3
const nextOk = Number(page) + 1;        // 3

// Validate explicitly instead of relying on coercion
function parsePage(raw) {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

console.log(NaN === NaN, Number.isNaN(NaN)); // false true
console.log(Object.is(0, -0));               // false
console.log(null == undefined, null === undefined); // true false
```

**Keywords:**
`equality, coercion, strict equality, NaN, Object.is, parseInt, query string`

**Follow-ups:**

-   Why does `[] + {}` differ from `{} + []` in some consoles?
-   When is `Object.is` better than `===`?

## js-fundamentals-003 --- What are var, let and const, hoisting and the temporal dead zone?

**question_id:** `js-fundamentals-003`\
**topic_id:** `js-fundamentals`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

What are `var`, `let` and `const`, and how do hoisting and the temporal dead zone work?

**Answer**

`var` is function-scoped and hoisted with the value `undefined`. `let` and `const` are block-scoped and hoisted but unusable until their declaration runs; that window is the **temporal dead zone** and access throws a `ReferenceError`. `const` prevents rebinding, not mutation of the object it points to. Function declarations are hoisted completely; function expressions follow the rules of the variable that holds them. Prefer `const`, use `let` when you must reassign, and avoid `var`.

Real-world example: the classic loop-closure bug when attaching handlers to a list of buttons.

```js
// BUG: one shared function-scoped i, so every handler logs 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log("var", i), 0);
}
// FIX: let creates a fresh binding per iteration: logs 0 1 2
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log("let", j), 0);
}

console.log(a); // undefined (hoisted var)
var a = 1;
try { console.log(b); } catch (e) { console.log(e.name); } // ReferenceError (TDZ)
let b = 2;

const config = Object.freeze({ retries: 3 });
config.retries = 5;   // ignored (throws in strict mode)
```

**Keywords:**
`var, let, const, hoisting, temporal dead zone, block scope, closure in loop`

**Follow-ups:**

-   Does `const` make an object immutable?
-   Why is `typeof` on an undeclared variable safe but unsafe on a TDZ variable?

## js-fundamentals-004 --- How do truthy and falsy values, optional chaining and nullish coalescing differ from the || operator?

**question_id:** `js-fundamentals-004`\
**topic_id:** `js-fundamentals`\
**difficulty:** `Intermediate`\
**question_type:** `Practical / Scenario`

**Question**

How do truthy and falsy values, optional chaining (`?.`) and nullish coalescing (`??`) differ from the `||` operator?

**Answer**

Falsy values are `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined` and `NaN`; everything else is truthy (including `"0"`, `[]` and `{}`). `||` falls back on any falsy value, so it overrides legitimate `0`, `""` and `false`. `??` falls back only on `null` or `undefined`. `?.` short-circuits to `undefined` when the left side is nullish, preventing "cannot read properties of undefined" errors on partial API responses. The `??=`, `||=` and `&&=` operators assign conditionally.

Real-world example: a settings screen where `0` is a valid value and the API may omit nested objects.

```js
function readSettings(dto) {
  return {
    // BUG with ||: a saved page size of 0 (meaning "all") becomes 25
    pageSizeBug: dto.pageSize || 25,
    // OK: only null/undefined fall back
    pageSize: dto.pageSize ?? 25,
    // OK: nested optional data from a partial payload
    city: dto.profile?.address?.city ?? "Unknown",
    // OK: optional method call
    label: dto.formatter?.(dto.pageSize) ?? String(dto.pageSize ?? 25),
  };
}

const cache = {};
cache.token ??= await fetchToken(); // assign only when missing
```

**Keywords:**
`truthy, falsy, nullish coalescing, optional chaining, logical assignment, default values`

**Follow-ups:**

-   What does `a?.b.c` do if `a` exists but `b` is undefined?
-   Why can you not mix `??` with `||` without parentheses?

# TOPIC --- Functions, Closures and this
**topic_id:** `js-functions`
**priority:** `Core`

## js-functions-001 --- What is a closure, and where do you use closures in production code?

**question_id:** `js-functions-001`\
**topic_id:** `js-functions`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

What is a closure, and where do you use closures in production code?

**Answer**

A closure is a function that keeps access to the variables of the scope where it was created, even after that outer function has returned. Closures power private state, factories, callbacks, memoization, debounce and React hooks. The cost is that captured variables stay alive as long as the closure does, which can retain large objects and cause memory leaks if the closure is stored in a long-lived registry.

Real-world example: a tiny in-memory rate limiter factory that keeps its counters private.

```js
function createRateLimiter({ limit, windowMs }) {
  const hits = new Map(); // private: unreachable from outside

  return function allow(key, now = Date.now()) {
    const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
    if (recent.length >= limit) { hits.set(key, recent); return false; }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

const allow = createRateLimiter({ limit: 3, windowMs: 1000 });
console.log(allow("user-1"), allow("user-1"), allow("user-1"), allow("user-1")); // true true true false
```

**Keywords:**
`closure, lexical scope, private state, factory, memory leak, encapsulation`

**Follow-ups:**

-   How can a closure cause a memory leak in a single-page app?
-   How do closures relate to the stale-closure problem in React hooks?

## js-functions-002 --- How is `this` determined in JavaScript, and what do call, apply, bind and arrow functions change?

**question_id:** `js-functions-002`\
**topic_id:** `js-functions`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

How is `this` determined in JavaScript, and what do `call`, `apply`, `bind` and arrow functions change?

**Answer**

For normal functions `this` is decided by **how the function is called**: `obj.method()` binds `obj`, a bare call gives `undefined` in strict mode (or the global object in sloppy mode), `new` binds the new instance, and `call`/`apply`/`bind` set it explicitly. Arrow functions have **no own `this`**; they capture it lexically from the enclosing scope, which is why they are the default for callbacks inside classes. Passing `obj.method` as a callback loses the receiver.

Real-world example: a class-based analytics tracker whose method is passed to an event listener.

```js
class Tracker {
  events = [];
  // BUG: `this` is the DOM element when called by addEventListener
  onClickBug(e) { this.events.push(e.type); }
  // FIX 1: arrow class field captures the instance
  onClick = (e) => { this.events.push(e.type); };
}

const t = new Tracker();
button.addEventListener("click", t.onClick);                  // works
button.addEventListener("click", t.onClickBug.bind(t));       // also works

function greet(greeting, punct) { return `${greeting}, ${this.name}${punct}`; }
console.log(greet.call({ name: "Ada" }, "Hi", "!"));          // Hi, Ada!
console.log(greet.apply({ name: "Lin" }, ["Hello", "?"]));    // Hello, Lin?
```

**Keywords:**
`this, call, apply, bind, arrow function, lexical this, strict mode, receiver`

**Follow-ups:**

-   What is `this` inside a `setTimeout` callback using a regular function?
-   Can you rebind `this` on an arrow function with `bind`?

## js-functions-003 --- What are higher-order functions, currying and memoization, and when are they worth it?

**question_id:** `js-functions-003`\
**topic_id:** `js-functions`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

What are higher-order functions, currying and memoization, and when are they worth it?

**Answer**

A higher-order function takes or returns functions (`map`, `filter`, `reduce`, middleware, decorators). Currying turns `f(a, b)` into `f(a)(b)` to preconfigure behaviour. Memoization caches results of a **pure** function keyed by its arguments. Memoize only when the computation is expensive and inputs repeat, bound the cache size (otherwise it is a leak) and never memoize impure functions or functions on large object arguments without a key strategy.

Real-world example: memoizing currency formatting and building a reusable API logger.

```js
const memoize = (fn, keyFn = (...a) => JSON.stringify(a), max = 500) => {
  const cache = new Map();
  return (...args) => {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key);
    const value = fn(...args);
    cache.set(key, value);
    if (cache.size > max) cache.delete(cache.keys().next().value); // evict oldest
    return value;
  };
};

const formatter = memoize((locale, currency) =>
  new Intl.NumberFormat(locale, { style: "currency", currency }));
formatter("en-US", "USD").format(1234.5); // "$1,234.50"

// currying: configure once, reuse everywhere
const logger = (level) => (scope) => (msg) => console[level](`[${scope}] ${msg}`);
const warnBilling = logger("warn")("billing");
warnBilling("card declined");
```

**Keywords:**
`higher-order function, currying, memoization, pure function, cache eviction, reduce`

**Follow-ups:**

-   Why is `Intl.NumberFormat` construction worth caching?
-   How would you memoize an async function safely?

## js-functions-004 --- Implement debounce and throttle. When do you use each?

**question_id:** `js-functions-004`\
**topic_id:** `js-functions`\
**difficulty:** `Intermediate`\
**question_type:** `Practical / Live coding`

**Question**

Implement debounce and throttle. When do you use each?

**Answer**

**Debounce** delays execution until calls have stopped for a given time (search-as-you-type, auto-save, window-resize end). **Throttle** guarantees at most one execution per interval (scroll, mousemove, telemetry). Both rely on closures and timers. Always provide a `cancel` so components can clean up on unmount, and consider leading/trailing options. For search boxes also cancel the in-flight request, since debounce alone does not prevent out-of-order responses.

Real-world example: a typeahead calling an ASP.NET Core search endpoint.

```js
function debounce(fn, wait = 300) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

function throttle(fn, interval = 200) {
  let last = 0;
  return (...args) => {
    const now = performance.now();
    if (now - last >= interval) { last = now; fn(...args); }
  };
}

let controller;
const search = debounce(async (term) => {
  controller?.abort();                 // drop the previous request
  controller = new AbortController();
  const res = await fetch(`/api/claims/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
  render(await res.json());
}, 300);
input.addEventListener("input", e => search(e.target.value));
window.addEventListener("scroll", throttle(updateStickyHeader, 100), { passive: true });
```

**Keywords:**
`debounce, throttle, timers, typeahead, AbortController, scroll, cancel`

**Follow-ups:**

-   What is the difference between leading and trailing edge execution?
-   Why add `{ passive: true }` to scroll listeners?

# TOPIC --- Objects, Prototypes and Classes
**topic_id:** `js-objects`
**priority:** `Strong`

## js-objects-001 --- Explain the prototype chain and how it differs from classical inheritance.

**question_id:** `js-objects-001`\
**topic_id:** `js-objects`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual`

**Question**

Explain the prototype chain and how it differs from classical inheritance.

**Answer**

Every object has an internal `[[Prototype]]` link. Property lookup walks the chain until it finds the property or reaches `null`. JavaScript delegates to other objects rather than copying behaviour from classes, and ES6 `class` is syntax sugar over constructor functions and prototypes. Methods defined on the prototype are shared across instances (cheap), whereas methods created in the constructor or as arrow class fields are per instance. `Object.create(proto)` builds an object with an explicit prototype, and `hasOwn` distinguishes own from inherited properties.

Real-world example: a base entity with shared audit behaviour and an `Object.create(null)` dictionary for untrusted keys.

```js
const auditable = {
  touch() { this.updatedAt = new Date().toISOString(); return this; },
};
const claim = Object.create(auditable, { id: { value: 42, enumerable: true } });
claim.touch();
console.log(Object.hasOwn(claim, "touch"), "touch" in claim); // false true

// Untrusted keys (e.g. from a query string) must not hit Object.prototype
const counts = Object.create(null);
for (const key of ["__proto__", "constructor", "ok"]) counts[key] = (counts[key] ?? 0) + 1;
console.log(Object.keys(counts)); // ["__proto__","constructor","ok"]
```

**Keywords:**
`prototype chain, Object.create, delegation, hasOwn, inheritance, __proto__`

**Follow-ups:**

-   How does `instanceof` work under the hood?
-   What is prototype pollution and how do you prevent it?

## js-objects-002 --- How do ES6 classes work, including private fields, static members and getters?

**question_id:** `js-objects-002`\
**topic_id:** `js-objects`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do ES6 classes work, including private fields, static members and getters?

**Answer**

Classes define a constructor and prototype methods, support `extends`/`super`, static members, accessors and **truly private** `#fields` enforced by the engine (unlike the `_name` convention). Class fields are initialized per instance. Classes are not hoisted like functions (they are in the TDZ), and calling one without `new` throws. Prefer composition over deep inheritance, keep invariants inside the class and expose behaviour rather than raw state.

Real-world example: a money value object that protects its invariant and cannot be mutated.

```js
class Money {
  #cents;
  static #instances = 0;

  constructor(cents, currency) {
    if (!Number.isInteger(cents)) throw new RangeError("cents must be an integer");
    this.#cents = cents;
    this.currency = currency;
    Money.#instances++;
    Object.freeze(this);
  }
  static of(amount, currency) { return new Money(Math.round(amount * 100), currency); }
  get amount() { return this.#cents / 100; }
  add(other) {
    if (other.currency !== this.currency) throw new Error("currency mismatch");
    return new Money(this.#cents + other.#cents, this.currency);
  }
  toString() { return `${this.amount.toFixed(2)} ${this.currency}`; }
}
console.log(String(Money.of(10.10, "USD").add(Money.of(0.20, "USD")))); // 10.30 USD
```

**Keywords:**
`class, private fields, static, getter, value object, immutability, composition`

**Follow-ups:**

-   How do private `#fields` differ from TypeScript `private`?
-   Why use integer cents instead of floating point for money?

## js-objects-003 --- What is the difference between shallow copy, deep copy and structuredClone?

**question_id:** `js-objects-003`\
**topic_id:** `js-objects`\
**difficulty:** `Intermediate`\
**question_type:** `Practical / Scenario`

**Question**

What is the difference between shallow copy, deep copy and `structuredClone`?

**Answer**

Spread (`{...o}`), `Object.assign` and `slice` copy only the first level; nested objects are still shared. `JSON.parse(JSON.stringify(x))` deep-copies plain data but drops `undefined`, functions, symbols and `Map`/`Set`, turns `Date` into strings and throws on cycles. `structuredClone` deep-copies most built-ins (Date, Map, Set, RegExp, typed arrays, cycles) but not functions or class prototypes. For state updates prefer immutable updates of only the changed path rather than cloning everything.

Real-world example: editing a draft copy of a form model without touching the saved original.

```js
const saved = { id: 7, tags: ["vip"], address: { city: "Pune" }, updatedAt: new Date() };

const shallow = { ...saved };
shallow.address.city = "Delhi";
console.log(saved.address.city);       // "Delhi" - shared nested object!

const draft = structuredClone(saved);
draft.address.city = "Mumbai";
console.log(saved.address.city);       // "Delhi" unchanged
console.log(draft.updatedAt instanceof Date); // true (JSON clone would give a string)

// Immutable update: copy only the path that changes (React/NgRx style)
const next = { ...saved, address: { ...saved.address, city: "Chennai" } };
```

**Keywords:**
`shallow copy, deep copy, structuredClone, spread, JSON clone, immutability`

**Follow-ups:**

-   What cannot be passed to `structuredClone`?
-   Why do immutable updates make change detection cheaper?

## js-objects-004 --- Explain Object.freeze, Object.seal and property descriptors.

**question_id:** `js-objects-004`\
**topic_id:** `js-objects`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

Explain `Object.freeze`, `Object.seal` and property descriptors.

**Answer**

Each property has a descriptor: `value`, `writable`, `enumerable`, `configurable` (or `get`/`set`). `Object.preventExtensions` blocks new properties, `Object.seal` also makes all properties non-configurable, and `Object.freeze` additionally makes them read-only. All three are **shallow**, so nested objects remain mutable unless frozen recursively. Freezing config and enum-like constants catches accidental writes early (assignment throws in strict mode).

Real-world example: an immutable application configuration with a deep freeze helper.

```js
function deepFreeze(obj) {
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) deepFreeze(value);
  }
  return Object.freeze(obj);
}

export const Status = deepFreeze({ Draft: "draft", Submitted: "submitted", Closed: "closed" });
export const config = deepFreeze({ api: { baseUrl: "/api", timeoutMs: 8000 } });

"use strict";
try { config.api.timeoutMs = 1; } catch (e) { console.log(e instanceof TypeError); } // true

Object.defineProperty(config, "internalId", { value: 1, enumerable: false });
```

**Keywords:**
`freeze, seal, preventExtensions, property descriptor, enumerable, configurable, immutability`

**Follow-ups:**

-   Does `const` plus `Object.freeze` give deep immutability?
-   How does `Object.defineProperty` help build observable models?

# TOPIC --- Asynchronous JavaScript
**topic_id:** `js-async`
**priority:** `Core`

## js-async-001 --- Explain the event loop, the call stack, microtasks and macrotasks.

**question_id:** `js-async-001`\
**topic_id:** `js-async`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

Explain the event loop, the call stack, microtasks and macrotasks.

**Answer**

JavaScript runs on a single thread with a call stack. Asynchronous work (timers, network, I/O) is performed by the host (browser or Node.js) and the callbacks are queued. After the stack empties the loop first drains the **microtask queue** (promise callbacks, `queueMicrotask`, `MutationObserver`) completely, then renders if needed, then takes the next **macrotask** (timers, events, I/O). A long synchronous task or an endless microtask chain blocks rendering and input, which is why heavy work belongs in a Web Worker or must be chunked.

Real-world example: predicting output order, a favourite interview exercise, and yielding to keep a UI responsive.

```js
console.log("1 sync");
setTimeout(() => console.log("5 macrotask"), 0);
Promise.resolve().then(() => console.log("3 microtask A"))
                 .then(() => console.log("4 microtask B"));
queueMicrotask(() => console.log("3b microtask"));
console.log("2 sync");
// 1 sync, 2 sync, 3 microtask A, 3b microtask, 4 microtask B, 5 macrotask

// Process 50k rows without freezing the page
async function processInChunks(rows, handle, chunk = 500) {
  for (let i = 0; i < rows.length; i += chunk) {
    rows.slice(i, i + chunk).forEach(handle);
    await new Promise(r => setTimeout(r)); // yield to the event loop between chunks
  }
}
```

**Keywords:**
`event loop, call stack, microtask, macrotask, queueMicrotask, blocking, Web Worker`

**Follow-ups:**

-   Why can a promise loop starve rendering while `setTimeout` does not?
-   Where does `requestAnimationFrame` run relative to microtasks?

## js-async-002 --- How do Promises work, and when do you use Promise.all, allSettled, race and any?

**question_id:** `js-async-002`\
**topic_id:** `js-async`\
**difficulty:** `Intermediate`\
**question_type:** `Practical / Scenario`

**Question**

How do Promises work, and when do you use `Promise.all`, `allSettled`, `race` and `any`?

**Answer**

A promise is a one-shot container for a future value in the states pending, fulfilled or rejected. `then` returns a new promise, enabling chaining and error propagation to the nearest `catch`. `Promise.all` fails fast on the first rejection, `allSettled` waits for everything and reports each outcome, `race` settles with the first settled promise and `any` resolves with the first **fulfilled** one (rejecting with `AggregateError` if all fail). Unhandled rejections are bugs: always attach a handler or `await` inside `try/catch`.

Real-world example: a dashboard calling independent APIs where one widget failing must not blank the page.

```js
async function loadDashboard(userId) {
  const [profile, claims, alerts] = await Promise.allSettled([
    fetchJson(`/api/users/${userId}`),
    fetchJson(`/api/users/${userId}/claims`),
    fetchJson(`/api/users/${userId}/alerts`),
  ]);
  return {
    profile: profile.status === "fulfilled" ? profile.value : null,
    claims:  claims.status  === "fulfilled" ? claims.value  : [],
    alerts:  alerts.status  === "fulfilled" ? alerts.value  : [],
    degraded: [profile, claims, alerts].some(r => r.status === "rejected"),
  };
}

// Fastest healthy mirror wins
const data = await Promise.any([fetchJson(urlEu), fetchJson(urlUs)]);
// Hard deadline
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
```

**Keywords:**
`Promise, Promise.all, allSettled, race, any, chaining, unhandled rejection`

**Follow-ups:**

-   Does `Promise.race` cancel the losing promises?
-   What is the difference between `then(a, b)` and `then(a).catch(b)`?

## js-async-003 --- How do you handle errors, cancellation and timeouts with async/await and AbortController?

**question_id:** `js-async-003`\
**topic_id:** `js-async`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

How do you handle errors, cancellation and timeouts with async/await and `AbortController`?

**Answer**

`async` functions always return a promise; `await` unwraps it and `try/catch/finally` handles rejections. Promises cannot be cancelled by themselves, so cancellation is cooperative through an `AbortSignal` passed to `fetch` and other APIs; `AbortSignal.timeout(ms)` and `AbortSignal.any([...])` make deadlines simple. `fetch` only rejects on network failure, so check `response.ok`. Distinguish `AbortError` from real failures so users do not see an error toast when they navigate away.

Real-world example: a typed fetch wrapper with timeout, caller cancellation and ProblemDetails handling for an ASP.NET Core API.

```js
class ApiError extends Error {
  constructor(status, problem) { super(problem?.title ?? `HTTP ${status}`); this.status = status; this.problem = problem; }
}

export async function api(path, { signal, timeoutMs = 8000, ...init } = {}) {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const res = await fetch(`/api${path}`, { credentials: "include", ...init, signal: combined });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null)); // RFC 7807
    return res.status === 204 ? null : await res.json();
  } catch (err) {
    if (err.name === "AbortError" && signal?.aborted) return null;  // user navigated away: not an error
    throw err;
  }
}
```

**Keywords:**
`async await, AbortController, AbortSignal.timeout, fetch, ProblemDetails, cancellation, try catch`

**Follow-ups:**

-   Why does `fetch` not reject on HTTP 500?
-   How would you cancel in-flight requests when a React component unmounts?

## js-async-004 --- How do you implement retry with backoff and limit concurrency in asynchronous code?

**question_id:** `js-async-004`\
**topic_id:** `js-async`\
**difficulty:** `Senior`\
**question_type:** `Practical / Live coding`

**Question**

How do you implement retry with exponential backoff and limit concurrency in asynchronous code?

**Answer**

Retry only **idempotent** operations and only on transient failures (network errors, 429, 502, 503, 504), using exponential backoff with jitter to avoid synchronized retry storms and honouring `Retry-After`. To avoid overwhelming a server or the browser's connection pool, run a bounded pool of workers instead of `Promise.all` over thousands of items. Always allow cancellation and cap the total attempts.

Real-world example: uploading many files to an API with at most four requests in flight.

```js
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retry(fn, { attempts = 4, base = 300 } = {}) {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (err) {
      const transient = !err.status || [429, 502, 503, 504].includes(err.status);
      if (!transient || i >= attempts - 1) throw err;
      await sleep(base * 2 ** i * (0.5 + Math.random())); // exponential backoff + jitter
    }
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await retry(() => worker(items[i], i));
    }
  }));
  return results;
}

await mapLimit(files, 4, (file) => uploadFile(file));
```

**Keywords:**
`retry, exponential backoff, jitter, concurrency limit, idempotent, Promise.all, worker pool`

**Follow-ups:**

-   Why is jitter important when thousands of clients retry?
-   How would you stop all workers on the first fatal error?

# TOPIC --- Modern JavaScript Features
**topic_id:** `js-modern`
**priority:** `Strong`

## js-modern-001 --- How do destructuring, spread and rest make code safer and more expressive?

**question_id:** `js-modern-001`\
**topic_id:** `js-modern`\
**difficulty:** `Junior`\
**question_type:** `Practical`

**Question**

How do destructuring, spread and rest make code safer and more expressive?

**Answer**

Destructuring extracts values from arrays and objects with defaults, renaming and nesting. Rest collects the remaining items (`...others`), while spread expands iterables or object properties (`{...a, ...b}`; later keys win). Together they enable immutable updates, named-argument style functions and omitting properties without mutation. Beware that spread is shallow and that destructuring `null` or `undefined` throws.

Real-world example: an options-object function and omitting a sensitive field before logging.

```js
function createClaim({ policyId, amount, currency = "USD", notes = "", ...extra }) {
  return { policyId, amount, currency, notes, meta: extra };
}

const user = { id: 1, name: "Ada", passwordHash: "x", roles: ["admin"] };
const { passwordHash, ...safeUser } = user;          // omit without mutating
console.log(safeUser);

const [first, , third = "n/a", ...tail] = ["a", "b", undefined, "d", "e"];
console.log(first, third, tail); // a n/a ["d","e"]

const next = { ...user, roles: [...user.roles, "auditor"] }; // immutable update
const { data: { items = [] } = {} } = response ?? {};         // safe nested defaults
```

**Keywords:**
`destructuring, spread, rest, default values, immutable update, object omit`

**Follow-ups:**

-   Why is spread of a large array into `Math.max(...arr)` risky?
-   How do you rename a destructured property?

## js-modern-002 --- How do ES modules work, and what are dynamic import and tree shaking?

**question_id:** `js-modern-002`\
**topic_id:** `js-modern`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

How do ES modules work, and what are dynamic `import()` and tree shaking?

**Answer**

ES modules use static `import`/`export`, are strict by default, evaluated once and live-bound (importers see updated exports). Because imports are static, bundlers can **tree shake** unused exports, provided modules are side-effect free (`"sideEffects": false`) and you avoid barrel files that import everything. Dynamic `import()` returns a promise and enables code splitting: heavy features (charts, editors, PDF export) load only when needed. CommonJS (`require`) is synchronous and dynamic, which hampers tree shaking.

Real-world example: lazy-loading a heavy charting library only when the user opens the analytics tab.

```js
// analytics-tab.js
let chartsPromise;
export async function renderRevenueChart(canvas, data) {
  chartsPromise ??= import("./charts/revenue-chart.js"); // separate chunk, cached after first load
  const { drawRevenueChart } = await chartsPromise;
  drawRevenueChart(canvas, data);
}

// utils/index.js (barrel) can defeat tree shaking; prefer direct imports
import { formatDate } from "./utils/format-date.js";

// package.json
// { "type": "module", "sideEffects": false }
```

**Keywords:**
`ES modules, dynamic import, tree shaking, code splitting, CommonJS, sideEffects, bundle size`

**Follow-ups:**

-   What does "live binding" mean in ES modules?
-   How would you find what bloats a bundle?

## js-modern-003 --- What are iterators and generators, and where are they useful?

**question_id:** `js-modern-003`\
**topic_id:** `js-modern`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are iterators and generators, and where are they useful?

**Answer**

An iterable implements `[Symbol.iterator]()` returning an iterator with `next()`; `for...of`, spread and destructuring consume it. Generators (`function*`) produce iterators with `yield`, pausing execution and enabling **lazy** sequences, infinite streams and cooperative flows (Redux-Saga). Async generators with `for await...of` consume streams such as paginated APIs or server-sent chunks without loading everything into memory.

Real-world example: reading every page of a paginated REST endpoint as a lazy async stream.

```js
async function* paginate(url, pageSize = 100) {
  let page = 1;
  while (true) {
    const res = await fetch(`${url}?page=${page}&pageSize=${pageSize}`);
    const { items, hasNext } = await res.json();
    yield* items;                // hand out one item at a time
    if (!hasNext) return;
    page++;
  }
}

for await (const claim of paginate("/api/claims")) {
  if (claim.status === "Rejected") { audit(claim); break; } // early exit stops further requests
}

function* take(iterable, n) { let i = 0; for (const x of iterable) { if (i++ >= n) return; yield x; } }
console.log([...take(fibonacci(), 8)]);
```

**Keywords:**
`iterator, generator, yield, async generator, for await, lazy evaluation, pagination`

**Follow-ups:**

-   What is the difference between `yield` and `yield*`?
-   How do generators relate to async/await?

## js-modern-004 --- When do you use Map, Set, WeakMap and WeakRef instead of plain objects and arrays?

**question_id:** `js-modern-004`\
**topic_id:** `js-modern`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

When do you use `Map`, `Set`, `WeakMap` and `WeakRef` instead of plain objects and arrays?

**Answer**

`Map` accepts any key type, preserves insertion order, has O(1) lookups and a reliable `size`, so it beats objects for dictionaries with dynamic keys. `Set` stores unique values with O(1) membership tests. `WeakMap`/`WeakSet` hold keys weakly, so metadata attached to an object disappears when the object is garbage collected, which avoids leaks in caches and per-DOM-node data. `WeakRef`/`FinalizationRegistry` are for advanced caches and are non-deterministic, so do not rely on them for correctness.

Real-world example: de-duplicating and grouping records, and caching per-element data without leaks.

```js
const claims = [{ id: 1, type: "auto" }, { id: 2, type: "home" }, { id: 3, type: "auto" }];

const byType = Map.groupBy(claims, c => c.type);          // ES2024
const seen = new Set();
const unique = claims.filter(c => !seen.has(c.id) && seen.add(c.id));

const meta = new WeakMap();                                // entry dies with the element
function track(el) {
  if (!meta.has(el)) meta.set(el, { shownAt: performance.now() });
  return meta.get(el);
}

const lookup = new Map(claims.map(c => [c.id, c]));        // O(1) join instead of find() in a loop
```

**Keywords:**
`Map, Set, WeakMap, WeakRef, garbage collection, dictionary, de-duplication`

**Follow-ups:**

-   Why can't you iterate a WeakMap?
-   When is a plain object still the better choice?

# TOPIC --- Browser, DOM and Web APIs
**topic_id:** `js-browser`
**priority:** `Strong`

## js-browser-001 --- Explain event bubbling, capturing and event delegation.

**question_id:** `js-browser-001`\
**topic_id:** `js-browser`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

Explain event bubbling, capturing and event delegation.

**Answer**

DOM events travel in three phases: capture (window to target), target, then bubble (target back up). Listeners run on bubble by default; pass `{ capture: true }` to hear the capture phase. **Delegation** attaches one listener to a stable ancestor and uses `event.target.closest(...)` to handle many dynamic children, which saves memory and works for elements added later. `stopPropagation` halts travel, `preventDefault` cancels the default action, and `event.currentTarget` is the element the listener is on.

Real-world example: a data grid with thousands of rows and row-level action buttons.

```js
const grid = document.querySelector("#claims-grid");

grid.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button || !grid.contains(button)) return;
  const row = button.closest("tr[data-id]");
  const id = row.dataset.id;
  switch (button.dataset.action) {
    case "approve": return approveClaim(id);
    case "delete":  return confirmDelete(id);
  }
});

// one listener handles rows added later via infinite scroll
grid.insertAdjacentHTML("beforeend", rowHtml); // no new listeners required
```

**Keywords:**
`event bubbling, capturing, event delegation, closest, stopPropagation, preventDefault, currentTarget`

**Follow-ups:**

-   Which events do not bubble (e.g. `focus`, `blur`) and what is the alternative?
-   Why use passive listeners for touch and scroll?

## js-browser-002 --- Compare cookies, localStorage, sessionStorage and IndexedDB, and explain CORS.

**question_id:** `js-browser-002`\
**topic_id:** `js-browser`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Scenario`

**Question**

Compare cookies, `localStorage`, `sessionStorage` and IndexedDB, and explain CORS.

**Answer**

`localStorage` and `sessionStorage` are synchronous, string-only and readable by any script on the origin, so they are exposed to XSS and unsuitable for tokens. `sessionStorage` is per tab. **Cookies** are sent automatically with requests; mark them `HttpOnly`, `Secure` and `SameSite` so scripts cannot read them and cross-site abuse is limited. IndexedDB is asynchronous structured storage for large offline data. **CORS** is a browser policy that lets a server opt in to cross-origin reads via `Access-Control-Allow-*` headers; non-simple requests trigger a preflight `OPTIONS`. It protects users' browsers and is not server-side authentication.

Real-world example: SPA on one origin calling an ASP.NET Core API on another with cookie authentication.

```js
// Browser: send the HttpOnly session cookie cross-origin
const res = await fetch("https://api.example.com/claims", {
  credentials: "include",
  headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrfToken },
});

// Server (ASP.NET Core): explicit origins, never "*" with credentials
// builder.Services.AddCors(o => o.AddPolicy("spa", p => p
//     .WithOrigins("https://app.example.com")
//     .AllowCredentials().WithHeaders("Content-Type", "X-CSRF-TOKEN").WithMethods("GET", "POST")));

// Per-tab UI state only: never tokens
sessionStorage.setItem("claimsFilter", JSON.stringify({ status: "open" }));
```

**Keywords:**
`cookies, localStorage, sessionStorage, IndexedDB, CORS, preflight, HttpOnly, SameSite`

**Follow-ups:**

-   Why can't you use `Access-Control-Allow-Origin: *` with credentials?
-   How does SameSite=Lax differ from Strict in practice?

## js-browser-003 --- How do IntersectionObserver, ResizeObserver and MutationObserver replace polling and scroll listeners?

**question_id:** `js-browser-003`\
**topic_id:** `js-browser`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do `IntersectionObserver`, `ResizeObserver` and `MutationObserver` replace polling and scroll listeners?

**Answer**

Observers deliver batched, asynchronous notifications from the browser, avoiding expensive scroll handlers and `getBoundingClientRect` polling. `IntersectionObserver` reports visibility of elements (lazy loading, infinite scroll, analytics impressions). `ResizeObserver` reacts to element size changes (responsive charts, text truncation). `MutationObserver` watches DOM changes (third-party widgets). Always `disconnect()` when finished to avoid leaks.

Real-world example: infinite scroll plus lazy images without a single scroll handler.

```js
const sentinel = document.querySelector("#load-more-sentinel");
const io = new IntersectionObserver(async ([entry]) => {
  if (!entry.isIntersecting) return;
  io.unobserve(sentinel);
  await loadNextPage();
  io.observe(sentinel);
}, { rootMargin: "400px" }); // start loading before the user hits the bottom
io.observe(sentinel);

const lazy = new IntersectionObserver((entries, obs) => {
  for (const e of entries) if (e.isIntersecting) { e.target.src = e.target.dataset.src; obs.unobserve(e.target); }
});
document.querySelectorAll("img[data-src]").forEach(img => lazy.observe(img));

new ResizeObserver(([e]) => chart.resize(e.contentRect.width, e.contentRect.height)).observe(chartHost);
```

**Keywords:**
`IntersectionObserver, ResizeObserver, MutationObserver, infinite scroll, lazy loading, rootMargin`

**Follow-ups:**

-   What does `loading="lazy"` do, and when do you still need the observer?
-   How do you avoid ResizeObserver loop errors?

## js-browser-004 --- When do you use Web Workers, Service Workers and requestAnimationFrame?

**question_id:** `js-browser-004`\
**topic_id:** `js-browser`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

When do you use Web Workers, Service Workers and `requestAnimationFrame`?

**Answer**

A **Web Worker** runs JavaScript on a background thread (no DOM) and communicates via `postMessage`, ideal for CPU-heavy work such as parsing a large CSV or hashing files. A **Service Worker** is a programmable network proxy for caching, offline support and push notifications; it has its own lifecycle (install, activate, fetch) and needs HTTPS. `requestAnimationFrame` schedules work right before the next paint, the right place for animations and DOM reads/writes batching. Use `scheduler.yield()` or chunking for work that must stay on the main thread.

Real-world example: parsing a 50 MB CSV import in a worker and caching API GETs offline.

```js
// main.js
const worker = new Worker(new URL("./csv-worker.js", import.meta.url), { type: "module" });
worker.postMessage({ file });                           // File objects can be transferred
worker.onmessage = ({ data }) => (data.done ? showSummary(data) : updateProgress(data.rows));

// csv-worker.js
self.onmessage = async ({ data: { file } }) => {
  let rows = 0;
  for await (const line of lineReader(file.stream())) { validate(line); if (++rows % 5000 === 0) self.postMessage({ rows }); }
  self.postMessage({ done: true, rows });
};

// sw.js: stale-while-revalidate for GET /api/lookups
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.includes("/api/lookups")) return;
  e.respondWith(caches.open("lookups-v1").then(async (cache) => {
    const cached = await cache.match(e.request);
    const network = fetch(e.request).then(r => { cache.put(e.request, r.clone()); return r; });
    return cached ?? network;
  }));
});
```

**Keywords:**
`Web Worker, Service Worker, postMessage, offline, stale-while-revalidate, requestAnimationFrame, main thread`

**Follow-ups:**

-   What can and cannot be transferred to a worker?
-   How do you version and update a service worker safely?

# TOPIC --- JavaScript Performance, Memory and Security
**topic_id:** `js-performance`
**priority:** `Strong`

## js-performance-001 --- What causes memory leaks in browser JavaScript and how do you find them?

**question_id:** `js-performance-001`\
**topic_id:** `js-performance`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

What causes memory leaks in browser JavaScript and how do you find them?

**Answer**

Garbage collection frees what is unreachable, so leaks are **unintended references**: forgotten event listeners and timers, closures holding large objects, global caches that never evict, detached DOM nodes still referenced from JavaScript, and subscriptions never unsubscribed. Find them with Chrome DevTools: take heap snapshots before and after repeating an action, compare, filter by "Detached", and use the allocation timeline. Fix by cleaning up in unmount hooks, using `AbortController` for listeners, `WeakMap` for metadata and bounded caches.

Real-world example: a polling dashboard that leaked timers and listeners on every route change.

```js
class LiveTicker {
  #timer;
  #ac = new AbortController();

  start(el) {
    this.#timer = setInterval(() => this.refresh(el), 5000);
    window.addEventListener("resize", () => this.layout(el), { signal: this.#ac.signal });
    window.addEventListener("online", () => this.refresh(el), { signal: this.#ac.signal });
  }
  stop() {                        // call from the route's destroy/unmount hook
    clearInterval(this.#timer);
    this.#ac.abort();             // removes ALL listeners registered with this signal
  }
}
// Leak pattern: storing DOM nodes in a module-level array after the nodes are removed
const cache = []; // BUG: grows forever; use a WeakMap/LRU or clear on teardown
```

**Keywords:**
`memory leak, garbage collection, detached DOM, heap snapshot, event listener, setInterval, AbortController`

**Follow-ups:**

-   How do you recognise a leak versus normal memory growth?
-   Why can closures keep large arrays alive unexpectedly?

## js-performance-002 --- What are reflow, repaint and layout thrashing, and how do you avoid them?

**question_id:** `js-performance-002`\
**topic_id:** `js-performance`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

What are reflow, repaint and layout thrashing, and how do you avoid them?

**Answer**

Changing geometry (width, margins, text) triggers **layout/reflow**; changing visuals (colour) triggers **repaint**; transforms and opacity can be composited on the GPU. **Layout thrashing** happens when code alternates DOM reads (`offsetHeight`, `getBoundingClientRect`) and writes in a loop, forcing synchronous layout each time. Batch reads then writes, prefer `transform`/`opacity` for animation, use `DocumentFragment` or `requestAnimationFrame`, virtualize long lists and measure with the Performance panel and Long Tasks / INP metrics.

Real-world example: equalizing the height of 300 dashboard cards.

```js
// BAD: read-write-read-write forces layout 300 times
cards.forEach(c => { c.style.height = c.parentElement.offsetHeight + "px"; });

// GOOD: batch reads, then writes in one frame
requestAnimationFrame(() => {
  const heights = cards.map(c => c.parentElement.offsetHeight);   // all reads
  cards.forEach((c, i) => { c.style.height = heights[i] + "px"; }); // all writes
});

// Insert many nodes with one DOM mutation
const frag = document.createDocumentFragment();
for (const row of rows) frag.append(buildRow(row));
tbody.append(frag);

// Animate with the compositor, not with `left`
el.animate([{ transform: "translateX(0)" }, { transform: "translateX(240px)" }], { duration: 250 });
```

**Keywords:**
`reflow, repaint, layout thrashing, requestAnimationFrame, DocumentFragment, compositing, INP`

**Follow-ups:**

-   Which CSS properties are cheap to animate?
-   How do you find long tasks blocking interaction?

## js-performance-003 --- How do you prevent XSS, and what are CSP and prototype pollution?

**question_id:** `js-performance-003`\
**topic_id:** `js-performance`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Scenario`

**Question**

How do you prevent XSS, and what are Content Security Policy (CSP) and prototype pollution?

**Answer**

XSS happens when untrusted data is interpreted as markup or script. Prevent it by treating all external data as text (`textContent`, framework binding), never concatenating into `innerHTML`, sanitizing required HTML with DOMPurify, avoiding `eval`/`new Function`, validating URL schemes and keeping tokens in `HttpOnly` cookies. **CSP** restricts script sources (use nonces or hashes, no `unsafe-inline`) as a defence-in-depth layer. **Prototype pollution** occurs when merging untrusted JSON writes `__proto__` or `constructor.prototype`, altering all objects; block those keys, use `Object.create(null)` or `Map`, and keep dependencies patched.

Real-world example: rendering a user-supplied comment and safely merging JSON.

```js
// BAD
el.innerHTML = `<p>${comment.body}</p>`;   // <img src=x onerror=steal()>

// GOOD 1: text
el.textContent = comment.body;
// GOOD 2: rich text through a sanitizer
el.innerHTML = DOMPurify.sanitize(comment.html, { USE_PROFILES: { html: true } });

// Safe deep merge
const BLOCKED = new Set(["__proto__", "constructor", "prototype"]);
function safeMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (BLOCKED.has(k)) continue;
    target[k] = v && typeof v === "object" && !Array.isArray(v) ? safeMerge(target[k] ?? {}, v) : v;
  }
  return target;
}

// Response header (ASP.NET Core middleware or reverse proxy)
// Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; object-src 'none'; base-uri 'self'
```

**Keywords:**
`XSS, CSP, prototype pollution, innerHTML, DOMPurify, sanitization, nonce`

**Follow-ups:**

-   Why is `javascript:` in an `href` dangerous?
-   How does Trusted Types help?

## js-performance-004 --- How do you reduce JavaScript bundle size and improve load performance?

**question_id:** `js-performance-004`\
**topic_id:** `js-performance`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

How do you reduce JavaScript bundle size and improve load performance?

**Answer**

Measure first with a bundle analyzer and Lighthouse/WebPageTest. Then split code by route and by heavy feature (`import()`), tree shake with ES modules, replace heavy libraries with lighter ones (date-fns instead of moment, native `Intl`), defer non-critical scripts (`defer`, `async`), preload critical assets, compress with Brotli, cache fingerprinted files with `Cache-Control: immutable`, and set performance budgets in CI. Ship modern syntax to modern browsers and keep third-party scripts out of the critical path.

Real-world example: route-level splitting and a CI budget guard.

```js
// router.js: each route becomes its own chunk
export const routes = [
  { path: "/", load: () => import("./pages/home.js") },
  { path: "/claims", load: () => import("./pages/claims.js") },
  { path: "/reports", load: () => import("./pages/reports.js") }, // heavy chart code stays out of the main bundle
];

// vite.config.js: analyze and cap size
// build: { chunkSizeWarningLimit: 250, rollupOptions: { output: { manualChunks: { vendor: ["react", "react-dom"] } } } }

// HTML: do not block rendering
// <script type="module" src="/assets/app.4f1c.js" defer></script>
// <link rel="preload" href="/assets/inter.woff2" as="font" type="font/woff2" crossorigin>

// ASP.NET Core static files: fingerprinted assets cached for a year
// Cache-Control: public, max-age=31536000, immutable
```

**Keywords:**
`bundle size, code splitting, tree shaking, defer, preload, Brotli, performance budget, Lighthouse`

**Follow-ups:**

-   What is the difference between `async` and `defer` scripts?
-   How would you stop a performance regression from reaching production?
