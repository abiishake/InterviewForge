# TOPIC --- TypeScript Type System Fundamentals
**topic_id:** `ts-basics`
**priority:** `Core`

## ts-basics-001 --- What is the difference between interface and type, and which should you use?

**question_id:** `ts-basics-001`\
**topic_id:** `ts-basics`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

What is the difference between `interface` and `type`, and which should you use?

**Answer**

Both describe the shape of data and are structurally typed. `interface` supports **declaration merging** (several declarations of the same name combine) and `extends`, and gives clearer error messages for object shapes. `type` can name anything: unions, intersections, tuples, primitives, mapped and conditional types. A reasonable rule: use `interface` for public object contracts and class shapes that others may extend or augment, and `type` for unions and computed types. Be consistent within a codebase and do not agonise over it.

Real-world example: API DTOs as interfaces, a status union as a type, and augmenting a library type via merging.

```ts
interface ClaimDto {
  id: string;
  policyId: string;
  amount: number;
  status: ClaimStatus;
}
type ClaimStatus = "Draft" | "Submitted" | "Approved" | "Rejected";   // a union needs `type`
type ClaimSummary = Pick<ClaimDto, "id" | "status"> & { reviewer?: string };

interface AuditedClaimDto extends ClaimDto { updatedBy: string; updatedAt: string }

// Declaration merging: add a property to Express's Request in a .d.ts
declare global {
  namespace Express {
    interface Request { user?: { id: string; roles: string[] } }
  }
}
export {};
```

**Keywords:**
`interface, type alias, declaration merging, union type, extends, intersection, structural typing`

**Follow-ups:**

-   What happens if you declare the same `type` name twice?
-   How do `extends` on interfaces and `&` on types differ when properties conflict?

## ts-basics-002 --- Explain any, unknown and never, and why unknown is safer than any.

**question_id:** `ts-basics-002`\
**topic_id:** `ts-basics`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

Explain `any`, `unknown` and `never`, and why `unknown` is safer than `any`.

**Answer**

`any` switches off type checking and spreads silently. `unknown` is the type-safe top type: any value can be assigned to it, but you must **narrow** it (typeof, instanceof, a type guard or schema parse) before use. `never` is the empty type: the return type of functions that never return, and the type left after exhaustive narrowing, which gives compile-time **exhaustiveness checks**. Treat all external data (JSON, `catch` variables with `useUnknownInCatchVariables`, `postMessage`) as `unknown`.

Real-world example: a safe error handler and an exhaustive reducer.

```ts
function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unexpected error";
}

try { await save(); } catch (e) { toast(toMessage(e)); }   // e is unknown under strict

type Action = { type: "add"; item: string } | { type: "clear" };
function reducer(state: string[], action: Action): string[] {
  switch (action.type) {
    case "add":   return [...state, action.item];
    case "clear": return [];
    default: {
      const _exhaustive: never = action;   // compile error if a new Action type is added but not handled
      return state;
    }
  }
}
```

**Keywords:**
`any, unknown, never, type narrowing, exhaustiveness check, useUnknownInCatchVariables, top type`

**Follow-ups:**

-   How does `JSON.parse` returning `any` undermine type safety, and what do you do about it?
-   What is the difference between `void` and `never`?

## ts-basics-003 --- How do union types, narrowing and discriminated unions work?

**question_id:** `ts-basics-003`\
**topic_id:** `ts-basics`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do union types, type narrowing and discriminated unions work?

**Answer**

A union (`A | B`) means a value is one of several types; TypeScript only allows operations valid for all members until you **narrow** with `typeof`, `instanceof`, `in`, equality checks, truthiness or user-defined type guards (`x is Foo`). A **discriminated union** adds a literal-typed tag property (`kind`, `type`, `status`), so a `switch` on the tag narrows to exactly one member. It models state machines and API results without optional-property soup and illegal states.

Real-world example: modelling async data so a component cannot read `data` while loading.

```ts
type Remote<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

function render(claims: Remote<Claim[]>): string {
  switch (claims.status) {
    case "idle":
    case "loading": return "Loading...";
    case "error":   return `Failed: ${claims.error}`;
    case "success": return claims.data.length ? `${claims.data.length} claims` : "No claims";
  }
}

// custom type guard
function isApiError(e: unknown): e is { status: number; title: string } {
  return typeof e === "object" && e !== null && "status" in e && "title" in e;
}
```

**Keywords:**
`union type, discriminated union, type narrowing, type guard, in operator, state machine, exhaustive switch`

**Follow-ups:**

-   How is a discriminated union better than a type with many optional fields?
-   What is an assertion function (`asserts x is T`)?

## ts-basics-004 --- What do as const, satisfies, readonly and literal types give you?

**question_id:** `ts-basics-004`\
**topic_id:** `ts-basics`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

What do `as const`, `satisfies`, `readonly` and literal types give you?

**Answer**

By default object literals widen (`"GET"` becomes `string`). `as const` freezes a literal into its narrowest readonly type, which lets you derive unions from runtime constants and avoid duplicating lists. `satisfies` checks that a value conforms to a type **without widening** it, keeping precise inference while still catching mistakes. `readonly` properties and `ReadonlyArray` prevent mutation at compile time only (there is no runtime effect, unlike `Object.freeze`).

Real-world example: one source of truth for roles and route config.

```ts
export const ROLES = ["admin", "adjuster", "viewer"] as const;
export type Role = (typeof ROLES)[number];            // "admin" | "adjuster" | "viewer"

type RouteConfig = { path: string; roles: readonly Role[] };
export const routes = {
  claims:  { path: "/claims",  roles: ["admin", "adjuster"] },
  reports: { path: "/reports", roles: ["admin"] },
} satisfies Record<string, RouteConfig>;

routes.claims.path;                // type is "/claims", not string
// routes.reports.roles = ["boss"];  // error: not a Role

const isRole = (v: string): v is Role => (ROLES as readonly string[]).includes(v);
```

**Keywords:**
`as const, satisfies, readonly, literal types, widening, derived types, typeof`

**Follow-ups:**

-   What is the difference between `satisfies` and a type annotation?
-   Does `readonly` protect against mutation at runtime?

## ts-basics-005 --- What is structural typing, and what are excess property checks and variance?

**question_id:** `ts-basics-005`\
**topic_id:** `ts-basics`\
**difficulty:** `Senior`\
**question_type:** `Conceptual`

**Question**

What is structural typing, and what are excess property checks and variance?

**Answer**

TypeScript is **structurally typed**: a value is assignable to a type if it has at least the required members, regardless of declared names. Fresh object literals get **excess property checks**, which catch typos, but the check does not apply when assigning a variable. Function parameters are checked contravariantly under `strictFunctionTypes` (method-style declarations remain bivariant). Structural typing means two unrelated types (`UserId` and `OrderId` both `string`) are interchangeable unless you use branding.

Real-world example: a typo caught by excess property checks and a leak when it is bypassed.

```ts
interface CreateClaim { policyId: string; amount: number }

const ok: CreateClaim = { policyId: "P1", amount: 100 };
// const typo: CreateClaim = { policyId: "P1", amount: 100, ammount: 1 }; // error: excess property

const payload = { policyId: "P1", amount: 100, internalNote: "secret" };
send(payload);   // OK structurally: extra props are NOT removed at runtime
function send(c: CreateClaim) { return fetch("/api/claims", { method: "POST", body: JSON.stringify(c) }); }

// Contravariance: a handler that accepts a wider type can stand in for a narrower one
type Handler<T> = (value: T) => void;
const logAny: Handler<unknown> = (v) => console.log(v);
const logString: Handler<string> = logAny;   // OK
```

**Keywords:**
`structural typing, excess property check, variance, contravariance, strictFunctionTypes, assignability`

**Follow-ups:**

-   Why can structural typing leak extra fields to an API?
-   How would you make `UserId` and `OrderId` non-interchangeable?

# TOPIC --- TypeScript Generics and Utility Types
**topic_id:** `ts-generics`
**priority:** `Core`

## ts-generics-001 --- How do generics and constraints work, and when are they overused?

**question_id:** `ts-generics-001`\
**topic_id:** `ts-generics`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

How do generics and constraints work, and when are they overused?

**Answer**

Generics parameterise types so a function or class keeps the relationship between input and output types (`identity<T>(x: T): T`). Constraints (`T extends { id: string }`) let you use members of `T`, and `keyof` plus indexed access types express relations between keys and values. Defaults (`<T = string>`) make type parameters optional. A generic is overused when it appears only once in a signature (it could be a plain type) or when explicit type arguments are needed everywhere because inference fails.

Real-world example: a typed repository helper and a type-safe property getter.

```ts
interface Entity { id: string }

class InMemoryRepo<T extends Entity> {
  private items = new Map<string, T>();
  add(item: T): T { this.items.set(item.id, item); return item; }
  get(id: string): T | undefined { return this.items.get(id); }
  find(predicate: (item: T) => boolean): T[] { return [...this.items.values()].filter(predicate); }
}

const claims = new InMemoryRepo<{ id: string; amount: number }>();
claims.add({ id: "c1", amount: 50 });

function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map(i => i[key]);
}
const amounts = pluck([{ id: "c1", amount: 50 }], "amount");   // number[]
// pluck(items, "amout")  -> compile error
```

**Keywords:**
`generics, constraints, keyof, indexed access, default type parameter, inference`

**Follow-ups:**

-   Why is `function f<T>(x: T): void` a code smell?
-   What is the difference between `T extends U` in a constraint and in a conditional type?

## ts-generics-002 --- Which built-in utility types do you use most (Partial, Pick, Omit, Record, Readonly) and why?

**question_id:** `ts-generics-002`\
**topic_id:** `ts-generics`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

Which built-in utility types do you use most (`Partial`, `Pick`, `Omit`, `Record`, `Readonly`) and why?

**Answer**

Utility types derive new types from existing ones so models stay in sync. `Partial<T>` makes all properties optional (patch payloads), `Required<T>` the opposite, `Readonly<T>` blocks assignment, `Pick`/`Omit` select or drop keys, `Record<K, V>` builds dictionaries and exhaustive maps. Derive request/response types from one entity type rather than hand-copying fields, so that a new field is automatically reflected or flagged by the compiler.

Real-world example: create, patch and read models derived from a single entity.

```ts
interface Claim {
  id: string;
  policyId: string;
  amount: number;
  status: "Draft" | "Submitted" | "Approved" | "Rejected";
  createdAt: string;
  internalRiskScore: number;
}

type CreateClaimRequest = Omit<Claim, "id" | "createdAt" | "status" | "internalRiskScore">;
type UpdateClaimRequest = Partial<Pick<Claim, "amount" | "status">>;
type ClaimResponse      = Readonly<Omit<Claim, "internalRiskScore">>;

// exhaustive map: adding a new status forces you to add its label
const statusLabel: Record<Claim["status"], string> = {
  Draft: "Draft", Submitted: "In review", Approved: "Approved", Rejected: "Declined",
};

function patchClaim(id: string, changes: UpdateClaimRequest) {
  return fetch(`/api/claims/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}
```

**Keywords:**
`Partial, Pick, Omit, Record, Readonly, utility types, DTO, derived types`

**Follow-ups:**

-   Why does `Omit` not complain about keys that do not exist, and how do you fix that?
-   How do you make only some properties optional?

## ts-generics-003 --- How do ReturnType, Parameters, Awaited and NonNullable help you avoid duplicating types?

**question_id:** `ts-generics-003`\
**topic_id:** `ts-generics`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do `ReturnType`, `Parameters`, `Awaited` and `NonNullable` help you avoid duplicating types?

**Answer**

They infer types from values so there is a single source of truth. `ReturnType<typeof fn>` and `Parameters<typeof fn>` reflect a function signature, `Awaited<T>` unwraps promises (including nested), `NonNullable<T>` removes `null` and `undefined`, and `InstanceType`/`ConstructorParameters` do the same for classes. They are particularly useful for wrappers, test helpers and derived store types, but should not be used to hide poorly designed public types.

Real-world example: typing a wrapper that adds logging and a derived store state type.

```ts
async function fetchClaim(id: string, includeNotes = false) {
  const res = await fetch(`/api/claims/${id}?notes=${includeNotes}`);
  return (await res.json()) as { id: string; amount: number };
}

type FetchClaimArgs = Parameters<typeof fetchClaim>;          // [id: string, includeNotes?: boolean]
type Claim = Awaited<ReturnType<typeof fetchClaim>>;          // { id: string; amount: number }

function withTiming<F extends (...args: any[]) => Promise<any>>(fn: F) {
  return async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
    const start = performance.now();
    try { return await fn(...args); }
    finally { console.debug(`${fn.name} took ${(performance.now() - start).toFixed(1)}ms`); }
  };
}
const timedFetchClaim = withTiming(fetchClaim);

type DefinedUser = NonNullable<ReturnType<typeof getCurrentUser>>;
declare function getCurrentUser(): { id: string } | null;
```

**Keywords:**
`ReturnType, Parameters, Awaited, NonNullable, inference, wrapper function, higher-order function`

**Follow-ups:**

-   What does `typeof` do in a type position?
-   Why do overloaded functions confuse `ReturnType`?

## ts-generics-004 --- How do you write a generic, type-safe API client or event emitter?

**question_id:** `ts-generics-004`\
**topic_id:** `ts-generics`\
**difficulty:** `Senior`\
**question_type:** `Practical / Live coding`

**Question**

How do you write a generic, type-safe API client or event emitter?

**Answer**

Describe the contract once as a map type (endpoint or event name to payload) and let generics with `keyof` constraints connect the name to its payload and response. Callers get autocompletion for names and compile errors for wrong payloads, while the implementation stays small. This is the pattern behind typed event buses, RPC clients and Redux action creators.

Real-world example: a typed event bus for UI modules and a typed endpoint map.

```ts
type Events = {
  "claim:submitted": { claimId: string; amount: number };
  "user:signedOut": undefined;
};

class TypedEmitter<E extends Record<string, unknown>> {
  private handlers: { [K in keyof E]?: Array<(payload: E[K]) => void> } = {};
  on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): () => void {
    (this.handlers[event] ??= []).push(handler);
    return () => { this.handlers[event] = this.handlers[event]?.filter(h => h !== handler); };
  }
  emit<K extends keyof E>(event: K, ...payload: E[K] extends undefined ? [] : [E[K]]) {
    this.handlers[event]?.forEach(h => h(payload[0] as E[K]));
  }
}

const bus = new TypedEmitter<Events>();
const off = bus.on("claim:submitted", ({ claimId }) => console.log(claimId));
bus.emit("claim:submitted", { claimId: "c1", amount: 120 });
bus.emit("user:signedOut");
// bus.emit("claim:submitted", { claimId: 1 });   // compile error
```

**Keywords:**
`generics, keyof, mapped type, event emitter, typed API client, conditional tuple, autocomplete`

**Follow-ups:**

-   How would you type an API client generated from an OpenAPI document?
-   Why return an unsubscribe function from `on`?

# TOPIC --- TypeScript Advanced Types
**topic_id:** `ts-advanced`
**priority:** `Strong`

## ts-advanced-001 --- What are conditional types and infer, and where are they useful?

**question_id:** `ts-advanced-001`\
**topic_id:** `ts-advanced`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are conditional types and `infer`, and where are they useful?

**Answer**

A conditional type `T extends U ? X : Y` selects a type based on a relationship. With `infer` you can capture a part of a matched type (a promise's value, a function's return type, an array's element). Conditional types are **distributive** over naked union type parameters (use `[T] extends [U]` to disable). They underpin `ReturnType`, `Awaited` and `Exclude`. Use them in library-style helpers, not in everyday application code where they hurt readability and compile time.

Real-world example: unwrapping API envelopes and extracting a union member.

```ts
type ApiEnvelope<T> = { data: T; traceId: string };
type Unwrap<T> = T extends ApiEnvelope<infer D> ? D : T;

type A = Unwrap<ApiEnvelope<{ id: string }>>;   // { id: string }
type B = Unwrap<number>;                         // number

type ElementOf<T> = T extends readonly (infer U)[] ? U : never;
type Item = ElementOf<Claim[]>;                  // Claim

type Event =
  | { type: "created"; id: string }
  | { type: "deleted"; id: string; reason: string };
type OfType<T extends Event["type"]> = Extract<Event, { type: T }>;
type Deleted = OfType<"deleted">;                // { type: "deleted"; id: string; reason: string }

type NonFunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
interface Claim { id: string; amount: number }
```

**Keywords:**
`conditional types, infer, distributive, Extract, Exclude, utility type, type-level programming`

**Follow-ups:**

-   What does "distributive conditional type" mean and how do you prevent it?
-   When would you avoid type-level programming?

## ts-advanced-002 --- What are mapped types, key remapping and template literal types?

**question_id:** `ts-advanced-002`\
**topic_id:** `ts-advanced`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

What are mapped types, key remapping and template literal types?

**Answer**

A mapped type iterates over keys (`{ [K in keyof T]: ... }`) and can add or remove modifiers (`readonly`, `?`, with `-` to remove). Key remapping with `as` renames or filters keys. Template literal types compose string literal types (`` `on${Capitalize<K>}` ``) and can model route params, CSS tokens and event names. These features let you generate APIs like getters or handler maps from a single model.

Real-world example: auto-generating form-field change handlers and typed route params.

```ts
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };

interface Claim { id: string; amount: number }
type ClaimGetters = Getters<Claim>;   // { getId: () => string; getAmount: () => number }

type Mutable<T> = { -readonly [K in keyof T]-?: T[K] };
type OnlyStrings<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] };

type RouteParams<S extends string> =
  S extends `${string}:${infer P}/${infer Rest}` ? P | RouteParams<`/${Rest}`> :
  S extends `${string}:${infer P}` ? P : never;

type P = RouteParams<"/policies/:policyId/claims/:claimId">;   // "policyId" | "claimId"
function buildUrl<S extends string>(route: S, params: Record<RouteParams<S>, string>) {
  return route.replace(/:(\w+)/g, (_, k) => encodeURIComponent((params as Record<string, string>)[k]));
}
buildUrl("/policies/:policyId/claims/:claimId", { policyId: "p1", claimId: "c9" });
```

**Keywords:**
`mapped types, key remapping, template literal types, Capitalize, modifiers, route params`

**Follow-ups:**

-   How do you remove `readonly` or optionality in a mapped type?
-   What is the cost of heavy type-level computation?

## ts-advanced-003 --- What are branded (nominal) types and how do they prevent bugs?

**question_id:** `ts-advanced-003`\
**topic_id:** `ts-advanced`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

What are branded (nominal) types and how do they prevent bugs?

**Answer**

Because TypeScript is structural, `UserId` and `OrderId` (both `string`) are interchangeable, so a function can silently receive the wrong id. A **brand** adds a phantom property (`string & { readonly __brand: "UserId" }`) that exists only in the type system. Values are created through a validating constructor, so the brand also records "this has been validated". The cost is zero at runtime, and it prevents argument-order bugs, mixing currencies or passing unvalidated input.

Real-world example: preventing a swap of policy and claim ids and enforcing validated email addresses.

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };

type PolicyId = Brand<string, "PolicyId">;
type ClaimId  = Brand<string, "ClaimId">;
type Email    = Brand<string, "Email">;

const PolicyId = (v: string) => v as PolicyId;
const ClaimId  = (v: string) => v as ClaimId;
function parseEmail(v: string): Email {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw new Error("Invalid email");
  return v as Email;
}

function getClaim(policyId: PolicyId, claimId: ClaimId) { /* ... */ }
const p = PolicyId("P-1"), c = ClaimId("C-9");
getClaim(p, c);
// getClaim(c, p);              // compile error: arguments swapped
// sendMail("typo")            // compile error: needs an Email
function sendMail(to: Email) { /* ... */ }
```

**Keywords:**
`branded types, nominal typing, phantom type, validation, type safety, opaque types`

**Follow-ups:**

-   Can a brand be forged, and does that matter?
-   How would you combine brands with a runtime schema library?

## ts-advanced-004 --- How do you narrow safely with type predicates, assertion functions and exhaustive checks?

**question_id:** `ts-advanced-004`\
**topic_id:** `ts-advanced`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you narrow safely with type predicates, assertion functions and exhaustive checks?

**Answer**

A type predicate (`x is T`) tells the compiler that a boolean function narrows its argument; the compiler trusts it, so the body must be correct. An assertion function (`asserts x is T`) throws if the check fails and narrows afterwards. Combine both with exhaustive `never` checks so that adding a union member causes compile errors where it is not handled. For external data prefer a schema validator (Zod, Valibot) rather than hand-written guards, which can drift from reality.

Real-world example: filtering nulls from arrays and asserting a configuration at start-up.

```ts
const maybeNames: Array<string | null | undefined> = ["a", null, "b"];
const names = maybeNames.filter((n): n is string => n != null);   // string[]

function assertDefined<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value == null) throw new Error(`${name} is required`);
}

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
assertDefined(apiUrl, "VITE_API_URL");
fetch(apiUrl);                       // narrowed to string

type Shape = { kind: "circle"; r: number } | { kind: "rect"; w: number; h: number };
function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "rect": return s.w * s.h;
    default: return assertNever(s);
  }
}
function assertNever(x: never): never { throw new Error(`Unhandled: ${JSON.stringify(x)}`); }
```

**Keywords:**
`type predicate, assertion function, never, exhaustive check, filter narrowing, runtime validation`

**Follow-ups:**

-   Why is a wrong type predicate dangerous?
-   How does TypeScript 5.5 infer type predicates from `filter` callbacks?

# TOPIC --- TypeScript in Real Projects
**topic_id:** `ts-practice`
**priority:** `Core`

## ts-practice-001 --- Which tsconfig strictness options matter, and how do you migrate a JavaScript codebase to TypeScript?

**question_id:** `ts-practice-001`\
**topic_id:** `ts-practice`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

Which `tsconfig` strictness options matter, and how do you migrate a JavaScript codebase to TypeScript?

**Answer**

Turn on `"strict": true`; the most valuable members are `strictNullChecks`, `noImplicitAny` and `strictFunctionTypes`. Add `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` and `useUnknownInCatchVariables` for extra safety. For a migration: enable `allowJs` and `checkJs` gradually, rename files to `.ts` leaf-first, start with relaxed settings and ratchet up per directory (project references or per-folder tsconfig), generate types for API contracts, and block `any` regressions with ESLint. Do not do a big-bang rewrite.

Real-world example: a strict base config and incremental adoption.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "paths": { "@app/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

```ts
// Incremental: opt a legacy file out temporarily, with a tracked reason
// @ts-expect-error TODO(CLAIMS-412): remove once ApiResponse type is generated
const legacy = window.__legacyConfig.endpoint;

// noUncheckedIndexedAccess forces handling of missing items
const first = claims[0];          // Claim | undefined
console.log(first?.id);
```

**Keywords:**
`tsconfig, strict mode, noUncheckedIndexedAccess, migration, allowJs, ts-expect-error, ESLint`

**Follow-ups:**

-   Why prefer `@ts-expect-error` over `@ts-ignore`?
-   How do you measure migration progress?

## ts-practice-002 --- How do you type untrusted runtime data, such as API responses, safely?

**question_id:** `ts-practice-002`\
**topic_id:** `ts-practice`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

How do you type untrusted runtime data, such as API responses, safely?

**Answer**

Types are erased at runtime, so `await res.json() as Claim` is a promise, not a check. Validate at the boundary with a schema library (Zod, Valibot, io-ts) and **derive** the static type from the schema (`z.infer`), so there is one definition. Fail loudly with a good error, log the validation issue, and decide whether to reject or coerce. Alternatively generate clients from the backend's OpenAPI document so contract changes surface at compile time.

Real-world example: validating a response from an ASP.NET Core endpoint with Zod.

```ts
import { z } from "zod";

const ClaimSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().nonnegative(),
  status: z.enum(["Draft", "Submitted", "Approved", "Rejected"]),
  submittedAt: z.coerce.date().nullable(),
});
export type Claim = z.infer<typeof ClaimSchema>;            // type derived from schema

export async function getClaim(id: string): Promise<Claim> {
  const res = await fetch(`/api/claims/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = ClaimSchema.safeParse(await res.json());
  if (!parsed.success) {
    console.error("Contract violation", parsed.error.flatten());
    throw new Error("Unexpected response from /claims");
  }
  return parsed.data;
}
```

**Keywords:**
`runtime validation, Zod, schema, z.infer, type assertion, API contract, OpenAPI`

**Follow-ups:**

-   Why is `as Claim` after `res.json()` unsafe?
-   When would you generate types from OpenAPI instead of writing schemas?

## ts-practice-003 --- Enums versus union types versus const objects: which should you choose?

**question_id:** `ts-practice-003`\
**topic_id:** `ts-practice`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

Enums versus union types versus `as const` objects: which should you choose?

**Answer**

Regular `enum`s emit runtime code, numeric enums accept any number (before TS 5) and `const enum` conflicts with `isolatedModules`. String literal unions have no runtime footprint, work naturally with JSON and are easy to narrow. When you need both a runtime list and a type, use an `as const` object or array and derive the union. Use a real `enum` mostly for interop with existing code. Reverse mapping exists only in numeric enums.

Real-world example: statuses shared by the UI dropdown and the API contract.

```ts
export const ClaimStatus = {
  Draft: "Draft",
  Submitted: "Submitted",
  Approved: "Approved",
} as const;
export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];   // "Draft" | "Submitted" | "Approved"

export const claimStatusOptions = Object.values(ClaimStatus);               // runtime list for a <select>

function canEdit(status: ClaimStatus) { return status === ClaimStatus.Draft; }

// Traditional enum for comparison: emits an object at runtime
enum Priority { Low, Medium, High }
console.log(Priority[0]);          // "Low" (numeric enums have a reverse mapping)
```

**Keywords:**
`enum, union type, const enum, as const, isolatedModules, string literal, tree shaking`

**Follow-ups:**

-   Why does `const enum` cause trouble with Babel or esbuild?
-   How do you iterate over every value of a union type?

## ts-practice-004 --- How do you write and consume declaration files, module augmentation and ambient types?

**question_id:** `ts-practice-004`\
**topic_id:** `ts-practice`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you write and consume declaration files (`.d.ts`), module augmentation and ambient types?

**Answer**

`.d.ts` files describe types for JavaScript code that has no types of its own. Install `@types/*` packages for popular libraries, write local declarations for untyped modules (`declare module "x"`), and **augment** existing modules or globals to add fields (for example `window.dataLayer` or a custom property on a library's interface). Keep `skipLibCheck` on for speed, but do not use `declare module "*"` as a blanket `any`. Make sure ambient files are included by `tsconfig` and that augmentation files contain a top-level `import` or `export` so they are modules.

Real-world example: typing a vendor script and extending Vite's environment variables.

```ts
// src/types/vendor.d.ts
declare module "legacy-pdf-viewer" {
  export interface ViewerOptions { url: string; page?: number }
  export function open(el: HTMLElement, opts: ViewerOptions): { destroy(): void };
}

// src/types/globals.d.ts
export {};
declare global {
  interface Window {
    dataLayer: Array<Record<string, unknown>>;
    __APP_VERSION__: string;
  }
}

// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

window.dataLayer.push({ event: "claim_submitted" });
```

**Keywords:**
`declaration file, d.ts, module augmentation, ambient declaration, declare global, DefinitelyTyped, import.meta.env`

**Follow-ups:**

-   Why does an augmentation file need an `export {}`?
-   How do you publish a library with correct type declarations?
