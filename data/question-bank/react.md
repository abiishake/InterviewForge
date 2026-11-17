# TOPIC --- React Components, JSX and Props
**topic_id:** `react-components`
**priority:** `Core`

## react-components-001 --- What is JSX, and how do props, children and composition work in React?

**question_id:** `react-components-001`\
**topic_id:** `react-components`\
**difficulty:** `Junior`\
**question_type:** `Conceptual / Practical`

**Question**

What is JSX, and how do props, `children` and composition work in React?

**Answer**

JSX is syntax sugar that compiles to function calls (`jsx("div", props)`); it is not HTML, so attributes are camelCase (`className`, `htmlFor`), expressions go in braces and a component must return one root (or a fragment). **Props** are read-only inputs; data flows down and events flow up through callback props. `children` lets a component wrap arbitrary content, and **composition** (passing components or render functions as props) is preferred over inheritance. React escapes text rendered in JSX, which protects against XSS unless you use `dangerouslySetInnerHTML`.

Real-world example: a layout card with slots and a typed props contract.

```tsx
import type { ReactNode } from "react";

type CardProps = {
  title: string;
  actions?: ReactNode;          // slot
  children: ReactNode;
};

export function Card({ title, actions, children }: CardProps) {
  return (
    <section className="card" aria-labelledby="card-title">
      <header>
        <h2 id="card-title">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function ClaimsPage({ claims }: { claims: Claim[] }) {
  return (
    <Card title="Open claims" actions={<button type="button" onClick={exportCsv}>Export</button>}>
      {claims.length === 0 ? <p>No claims yet.</p> : <ClaimsTable claims={claims} />}
    </Card>
  );
}
```

**Keywords:**
`JSX, props, children, composition, fragment, className, escaping, TypeScript props`

**Follow-ups:**

-   Why is `dangerouslySetInnerHTML` dangerous and when is it acceptable?
-   Why can't you mutate props?

## react-components-002 --- Why do keys matter in lists, and what goes wrong with index keys?

**question_id:** `react-components-002`\
**topic_id:** `react-components`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

Why do keys matter in lists, and what goes wrong with index keys?

**Answer**

During reconciliation React uses `key` to match elements between renders. With **stable unique keys**, React moves, preserves and updates the right component instances; with index keys, inserting or reordering items makes React reuse the wrong instance, so local state (inputs, focus, expanded rows) attaches to the wrong item. Keys must be unique among siblings, stable across renders and not random (a `Math.random()` key remounts everything every render). Keys can also deliberately **reset state**: changing a component's key remounts it.

Real-world example: an editable list where index keys scrambled input text after deleting a row, and a reset via key.

```tsx
function LineItems({ items, onRemove }: { items: LineItem[]; onRemove: (id: string) => void }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>                       {/* stable id, not the array index */}
          <input defaultValue={item.description} aria-label="Description" />
          <button onClick={() => onRemove(item.id)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}

// Intentional reset: switching claims remounts the editor and discards its local state
function ClaimEditorPage({ claimId }: { claimId: string }) {
  return <ClaimEditor key={claimId} claimId={claimId} />;
}
```

**Keywords:**
`keys, reconciliation, list rendering, index key, remount, state reset, virtual DOM`

**Follow-ups:**

-   What happens with `key={Math.random()}`?
-   How do you handle lists that do not have natural ids?

## react-components-003 --- What is the difference between controlled and uncontrolled components?

**question_id:** `react-components-003`\
**topic_id:** `react-components`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

What is the difference between controlled and uncontrolled components?

**Answer**

In a **controlled** input React state is the source of truth (`value` + `onChange`), which allows instant validation, formatting and conditional logic but re-renders on every keystroke. An **uncontrolled** input keeps its value in the DOM; you read it via a `ref` or `FormData` on submit and use `defaultValue`, which is cheaper and fine for simple forms. Libraries such as React Hook Form use uncontrolled inputs with refs for performance on large forms. Switching an input from uncontrolled to controlled (`value` going from `undefined` to a string) triggers warnings and bugs.

Real-world example: a controlled search field with formatting, and an uncontrolled form read via `FormData`.

```tsx
function PolicyNumberInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      inputMode="numeric"
      onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}   // controlled: enforce format
    />
  );
}

function FeedbackForm({ onSend }: { onSend: (data: { email: string; message: string }) => void }) {
  return (
    <form onSubmit={e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);                                // uncontrolled: read on submit
      onSend({ email: String(fd.get("email")), message: String(fd.get("message")) });
    }}>
      <input name="email" type="email" required defaultValue="" />
      <textarea name="message" required />
      <button>Send</button>
    </form>
  );
}
```

**Keywords:**
`controlled component, uncontrolled component, ref, FormData, defaultValue, React Hook Form`

**Follow-ups:**

-   When would you prefer uncontrolled inputs?
-   How do you reset an uncontrolled form?

## react-components-004 --- What are common composition patterns: compound components, render props and HOCs?

**question_id:** `react-components-004`\
**topic_id:** `react-components`\
**difficulty:** `Senior`\
**question_type:** `Design / Practical`

**Question**

What are common composition patterns: compound components, render props, higher-order components and custom hooks?

**Answer**

**Compound components** share implicit state through context so consumers compose a flexible API (`Tabs`, `Tabs.List`, `Tabs.Panel`). **Render props** pass a function to render with data. **HOCs** wrap a component to inject behaviour (older style; they obscure props and are mostly replaced by hooks). **Custom hooks** are now the default for reusing stateful logic. Prefer hooks for logic and composition (children, slots) for UI, and avoid prop drilling through more than two or three levels by using composition or context.

Real-world example: a compound `Tabs` component and a reusable hook.

```tsx
const TabsContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);
const useTabs = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* must be used inside <Tabs>");
  return ctx;
};

export function Tabs({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [active, setActive] = useState(defaultTab);
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}
Tabs.Tab = function Tab({ id, children }: { id: string; children: ReactNode }) {
  const { active, setActive } = useTabs();
  return <button role="tab" aria-selected={active === id} onClick={() => setActive(id)}>{children}</button>;
};
Tabs.Panel = function Panel({ id, children }: { id: string; children: ReactNode }) {
  return useTabs().active === id ? <div role="tabpanel">{children}</div> : null;
};

// usage
// <Tabs defaultTab="details"><Tabs.Tab id="details">Details</Tabs.Tab><Tabs.Panel id="details">...</Tabs.Panel></Tabs>
```

**Keywords:**
`compound components, render props, higher-order component, custom hook, context, composition, prop drilling`

**Follow-ups:**

-   Why did hooks largely replace HOCs and render props?
-   What are the trade-offs of context for compound components?

# TOPIC --- React Hooks
**topic_id:** `react-hooks`
**priority:** `Core`

## react-hooks-001 --- How do useState and useReducer work, and why use functional updates?

**question_id:** `react-hooks-001`\
**topic_id:** `react-hooks`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

How do `useState` and `useReducer` work, and why use functional updates?

**Answer**

`useState` stores a value per component instance; calling the setter schedules a re-render and the new value is seen on the **next render**, not immediately. State updates are batched, and each render captures its own values (a snapshot), so using the old variable for consecutive updates loses changes: use the **functional form** `setCount(c => c + 1)`. State must be treated as immutable (create new objects/arrays). `useReducer` centralises transitions for related state or complex logic and makes them testable as a pure function, similar to Redux.

Real-world example: a multi-step claim wizard modelled with a reducer.

```tsx
type State = { step: 1 | 2 | 3; data: Partial<ClaimDraft>; submitting: boolean; error?: string };
type Action =
  | { type: "next"; patch: Partial<ClaimDraft> }
  | { type: "back" }
  | { type: "submit" }
  | { type: "failed"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "next":   return { ...state, step: Math.min(3, state.step + 1) as State["step"], data: { ...state.data, ...action.patch } };
    case "back":   return { ...state, step: Math.max(1, state.step - 1) as State["step"] };
    case "submit": return { ...state, submitting: true, error: undefined };
    case "failed": return { ...state, submitting: false, error: action.error };
  }
}

export function ClaimWizard() {
  const [state, dispatch] = useReducer(reducer, { step: 1, data: {}, submitting: false });
  const [clicks, setClicks] = useState(0);
  const bump = () => { setClicks(c => c + 1); setClicks(c => c + 1); };   // +2 (functional), not +1
  return /* render step components that call dispatch */ null;
}
```

**Keywords:**
`useState, useReducer, functional update, batching, immutability, state snapshot, reducer`

**Follow-ups:**

-   Why does `console.log(state)` right after `setState` show the old value?
-   When would you switch from `useState` to `useReducer`?

## react-hooks-002 --- How does useEffect work, what are its dependencies and cleanup, and when should you not use it?

**question_id:** `react-hooks-002`\
**topic_id:** `react-hooks`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How does `useEffect` work, what are its dependencies and cleanup, and when should you not use it?

**Answer**

`useEffect` runs **after render** to synchronise a component with something external (network, subscriptions, timers, DOM APIs). React re-runs it when a dependency changes and runs the **cleanup** function before the next run and on unmount. Declare every reactive value you use in the dependency array (the lint rule `react-hooks/exhaustive-deps` catches mistakes). In development, Strict Mode mounts, unmounts and remounts to expose missing cleanup. **You might not need an effect**: derive values during render, handle user events in event handlers, and use a data-fetching library instead of hand-written fetch effects. Fetching in effects needs cancellation to avoid race conditions.

Real-world example: a fetch effect done correctly, with cancellation and a subscription with cleanup.

```tsx
function ClaimDetails({ claimId }: { claimId: string }) {
  const [state, setState] = useState<{ status: "loading" | "ok" | "error"; claim?: Claim }>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(`/api/claims/${claimId}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(claim => setState({ status: "ok", claim }))
      .catch(e => { if (e.name !== "AbortError") setState({ status: "error" }); });
    return () => controller.abort();                        // prevents out-of-order responses and setState after unmount
  }, [claimId]);

  useEffect(() => {
    const onOnline = () => toast("Back online");
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // NOT an effect: derived value computed during render
  const label = state.claim ? `${state.claim.id} (${state.claim.status})` : "Loading...";
  return <h1>{label}</h1>;
}
```

**Keywords:**
`useEffect, dependency array, cleanup, AbortController, Strict Mode, exhaustive-deps, race condition, derived state`

**Follow-ups:**

-   Why does Strict Mode run effects twice in development?
-   Name three things that should not be done in `useEffect`.

## react-hooks-003 --- What are stale closures in hooks and how do useRef and functional updates fix them?

**question_id:** `react-hooks-003`\
**topic_id:** `react-hooks`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Scenario`

**Question**

What are stale closures in hooks and how do `useRef` and functional updates fix them?

**Answer**

Every render creates new function and variable bindings. A callback captured by a long-lived timer, listener or memoised function with an **incomplete dependency list** keeps seeing the values from the render in which it was created. Fixes: include dependencies, use the functional setter form, or store the latest value in a **ref** (`ref.current` is mutable and does not trigger renders). `useRef` also holds DOM nodes and instance-like values (timer ids, previous values). `useEffectEvent` (stable in recent React versions) reads the latest props/state in effect callbacks without re-subscribing.

Real-world example: an auto-save interval that kept saving old text.

```tsx
function Editor({ claimId }: { claimId: string }) {
  const [text, setText] = useState("");
  const latestText = useRef(text);
  latestText.current = text;                                  // always the newest value

  // BUG: closure captures `text` from the first render -> always saves ""
  // useEffect(() => { const id = setInterval(() => save(claimId, text), 5000); return () => clearInterval(id); }, [claimId]);

  // FIX: read through a ref, interval is not recreated on every keystroke
  useEffect(() => {
    const id = setInterval(() => save(claimId, latestText.current), 5000);
    return () => clearInterval(id);
  }, [claimId]);

  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000);  // functional update: no stale count
    return () => clearInterval(id);
  }, []);

  return <textarea value={text} onChange={e => setText(e.target.value)} />;
}
```

**Keywords:**
`stale closure, useRef, functional update, useEffectEvent, setInterval, dependency array, mutable ref`

**Follow-ups:**

-   Why does mutating `ref.current` not cause a re-render?
-   How does `useEffectEvent` differ from a ref pattern?

## react-hooks-004 --- When do useMemo and useCallback help, and what does the React Compiler change?

**question_id:** `react-hooks-004`\
**topic_id:** `react-hooks`\
**difficulty:** `Senior`\
**question_type:** `Practical / Trade-offs`

**Question**

When do `useMemo` and `useCallback` help, and what does the React Compiler change?

**Answer**

`useMemo` caches a computed value and `useCallback` caches a function identity between renders. They help in two cases: avoiding genuinely **expensive recalculation**, and keeping **referential stability** for props of `memo`-wrapped children or for effect/memo dependencies. Elsewhere they add overhead and noise. Measure first with the React Profiler. The **React Compiler** (opt-in build step) analyses components and memoises automatically, so manual memoisation becomes largely unnecessary, but the rules of React (pure renders, no mutation) still apply.

Real-world example: a heavy aggregation and a memoised row.

```tsx
const Row = memo(function Row({ claim, onSelect }: { claim: Claim; onSelect: (id: string) => void }) {
  return <tr onClick={() => onSelect(claim.id)}><td>{claim.id}</td><td>{claim.amount}</td></tr>;
});

export function ClaimsTable({ claims }: { claims: Claim[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const totals = useMemo(() => {                       // O(n) on 50k rows: worth caching
    const byStatus = new Map<string, number>();
    for (const c of claims) byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + c.amount);
    return byStatus;
  }, [claims]);

  const onSelect = useCallback((id: string) => setSelected(id), []);   // stable identity so memo(Row) can skip renders

  return (
    <>
      <Summary totals={totals} />
      <table><tbody>{claims.map(c => <Row key={c.id} claim={c} onSelect={onSelect} />)}</tbody></table>
    </>
  );
}
```

**Keywords:**
`useMemo, useCallback, React.memo, referential equality, React Compiler, profiler, memoization`

**Follow-ups:**

-   Why does `useCallback` alone not prevent a child re-render?
-   How do you decide whether to memoise at all?

## react-hooks-005 --- How do you write a custom hook, and what are the Rules of Hooks?

**question_id:** `react-hooks-005`\
**topic_id:** `react-hooks`\
**difficulty:** `Intermediate`\
**question_type:** `Practical / Live coding`

**Question**

How do you write a custom hook, and what are the Rules of Hooks?

**Answer**

A custom hook is a function whose name starts with `use` and that calls other hooks; it shares **logic**, not state (each call gets its own state). The Rules of Hooks: call hooks only at the top level (never in loops, conditions or nested functions) and only from components or other hooks, so React can match hook calls by order. Good hooks have a small, clear API, clean up after themselves, are SSR-safe and are testable with `renderHook`.

Real-world example: `useDebouncedValue` and `useLocalStorage`.

```tsx
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial; }
    catch { return initial; }                                    // private mode / corrupted value
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
  }, [key, value]);
  return [value, setValue] as const;
}

function ClaimSearch() {
  const [term, setTerm] = useLocalStorage("claims.term", "");
  const debounced = useDebouncedValue(term, 300);
  const { data } = useQuery({ queryKey: ["claims", debounced], queryFn: () => searchClaims(debounced), enabled: debounced.length > 1 });
  return <input value={term} onChange={e => setTerm(e.target.value)} />;
}
```

**Keywords:**
`custom hook, rules of hooks, useDebouncedValue, useLocalStorage, renderHook, hook order, reuse`

**Follow-ups:**

-   Do two components using the same custom hook share state?
-   How would you test a custom hook?

# TOPIC --- React State Management and Context
**topic_id:** `react-state`
**priority:** `Strong`

## react-state-001 --- Where should state live, and when do you use lifting state, context or an external store?

**question_id:** `react-state-001`\
**topic_id:** `react-state`\
**difficulty:** `Senior`\
**question_type:** `Design / Scenario`

**Question**

Where should state live, and when do you use lifting state, context or an external store?

**Answer**

Keep state as **local** as possible. If two siblings need it, lift it to the closest common parent. For data needed by many distant components that changes rarely (theme, current user, locale), use **context**. For frequently changing shared client state, or when many components subscribe to small slices, use an external store (Zustand, Redux Toolkit, Jotai) with selectors. Server data is a different category and belongs in a data-fetching cache (TanStack Query, RTK Query), not in global client state. URL state (filters, pagination) belongs in the URL. Context re-renders **all consumers** when its value changes, so avoid putting fast-changing state in it.

Real-world example: choosing the right place for four kinds of state in one screen.

```tsx
// 1. Local UI state
const [menuOpen, setMenuOpen] = useState(false);

// 2. Server state: cached, deduplicated, refetched
const { data: claims, isPending } = useQuery({ queryKey: ["claims", filters], queryFn: () => api.listClaims(filters) });

// 3. URL state: shareable and survives refresh
const [params, setParams] = useSearchParams();
const status = params.get("status") ?? "all";

// 4. Global client state (small store with selectors)
export const useSelection = create<{ ids: Set<string>; toggle: (id: string) => void }>(set => ({
  ids: new Set(),
  toggle: id => set(s => {
    const ids = new Set(s.ids); ids.has(id) ? ids.delete(id) : ids.add(id); return { ids };
  }),
}));
const isSelected = useSelection(s => s.ids.has(claim.id));     // re-renders only when this value changes
```

**Keywords:**
`state management, lifting state, context, Zustand, Redux Toolkit, server state, URL state, selectors`

**Follow-ups:**

-   Why does context cause extra re-renders and how do you mitigate it?
-   Why is server state different from client state?

## react-state-002 --- How do you use Context correctly, and how do you avoid unnecessary re-renders?

**question_id:** `react-state-002`\
**topic_id:** `react-state`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you use Context correctly, and how do you avoid unnecessary re-renders?

**Answer**

Context is a dependency-injection mechanism, not a state manager. Every consumer re-renders when the provider's `value` identity changes, so **memoise the value** (`useMemo`), split contexts by update frequency (state vs dispatch, or separate contexts per concern) and keep the provider as low in the tree as possible. Wrap access in a hook that throws when used outside the provider. For high-frequency updates with many consumers prefer an external store with selectors or `useSyncExternalStore`.

Real-world example: auth context with split state and actions.

```tsx
type AuthState = { user: User | null; status: "loading" | "authenticated" | "anonymous" };
type AuthActions = { login: (returnUrl?: string) => void; logout: () => Promise<void> };

const AuthStateContext = createContext<AuthState | null>(null);
const AuthActionsContext = createContext<AuthActions | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, status: "loading" });

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(user => setState({ user, status: user ? "authenticated" : "anonymous" }));
  }, []);

  const actions = useMemo<AuthActions>(() => ({
    login: (returnUrl = "/") => { window.location.href = `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`; },
    logout: async () => { await fetch("/auth/logout", { method: "POST", credentials: "include" }); setState({ user: null, status: "anonymous" }); },
  }), []);

  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
export const useAuthActions = () => useContext(AuthActionsContext)!;     // components that only log out do not re-render on user changes
```

**Keywords:**
`context, Provider, useMemo, context splitting, re-render, useContext, dependency injection`

**Follow-ups:**

-   Why is passing an object literal as the Provider value a performance bug?
-   When would you replace context with Zustand or `useSyncExternalStore`?

## react-state-003 --- How do Redux Toolkit and RTK Query structure state, and when do you choose Zustand instead?

**question_id:** `react-state-003`\
**topic_id:** `react-state`\
**difficulty:** `Senior`\
**question_type:** `Design / Practical`

**Question**

How do Redux Toolkit and RTK Query structure state, and when do you choose Zustand instead?

**Answer**

Redux Toolkit (RTK) gives a standard way to write Redux: `createSlice` (reducers with Immer so "mutating" syntax is safe), `configureStore`, thunks and the Redux DevTools; **RTK Query** adds endpoint definitions with caching, invalidation and generated hooks. Redux suits large teams that value conventions, predictable flows, middleware and DevTools time travel. **Zustand** is a minimal store with selectors and no boilerplate, great for small to medium client state. Choose by team size and need for ecosystem and tooling; do not mix several global stores without reason.

Real-world example: a slice plus an RTK Query API with tag invalidation.

```ts
const selectionSlice = createSlice({
  name: "selection",
  initialState: { ids: [] as string[] },
  reducers: {
    toggle(state, action: PayloadAction<string>) {
      const i = state.ids.indexOf(action.payload);
      i >= 0 ? state.ids.splice(i, 1) : state.ids.push(action.payload);   // Immer makes this immutable
    },
    clear: state => { state.ids = []; },
  },
});

export const claimsApi = createApi({
  reducerPath: "claimsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api", credentials: "include" }),
  tagTypes: ["Claim"],
  endpoints: build => ({
    getClaims: build.query<Claim[], { status?: string }>({
      query: params => ({ url: "claims", params }),
      providesTags: result => [...(result ?? []).map(c => ({ type: "Claim" as const, id: c.id })), { type: "Claim", id: "LIST" }],
    }),
    approveClaim: build.mutation<Claim, string>({
      query: id => ({ url: `claims/${id}/approve`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Claim", id }, { type: "Claim", id: "LIST" }],
    }),
  }),
});
export const { useGetClaimsQuery, useApproveClaimMutation } = claimsApi;
export const store = configureStore({
  reducer: { selection: selectionSlice.reducer, [claimsApi.reducerPath]: claimsApi.reducer },
  middleware: gdm => gdm().concat(claimsApi.middleware),
});
```

**Keywords:**
`Redux Toolkit, createSlice, RTK Query, Immer, tag invalidation, Zustand, store, middleware`

**Follow-ups:**

-   How does Immer let you write "mutating" reducers safely?
-   What does tag invalidation do after a mutation?

## react-state-004 --- What is useSyncExternalStore and why does it exist?

**question_id:** `react-state-004`\
**topic_id:** `react-state`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What is `useSyncExternalStore` and why does it exist?

**Answer**

It subscribes a component to an **external mutable source** (a store, `navigator.onLine`, `matchMedia`, a WebSocket cache) in a way that is safe with concurrent rendering: React reads a snapshot, detects tearing (different components seeing different values in one render) and re-renders consistently. You provide `subscribe`, `getSnapshot` (must return a cached, referentially stable value) and optionally `getServerSnapshot` for SSR. State libraries (Zustand, Redux) use it internally; app code uses it for browser APIs.

Real-world example: an online/offline indicator and a media query hook.

```tsx
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
}
export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true /* server snapshot */);
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function SaveBar() {
  const online = useOnlineStatus();
  return <button disabled={!online}>{online ? "Save" : "Offline - changes will sync"}</button>;
}
```

**Keywords:**
`useSyncExternalStore, tearing, concurrent rendering, external store, subscribe, getSnapshot, SSR`

**Follow-ups:**

-   Why must `getSnapshot` return a stable reference?
-   What is "tearing"?

# TOPIC --- React Rendering and Performance
**topic_id:** `react-rendering`
**priority:** `Core`

## react-rendering-001 --- How does React reconcile and re-render, and what triggers a re-render?

**question_id:** `react-rendering-001`\
**topic_id:** `react-rendering`\
**difficulty:** `Senior`\
**question_type:** `Conceptual`

**Question**

How does React reconcile and re-render, and what triggers a re-render?

**Answer**

Rendering means calling your component function to produce a React element tree; **reconciliation** diffs it with the previous tree (same type and position means update, different type means remount; keys identify list items) and the **commit** phase applies minimal DOM changes. A component re-renders when its state changes, when its parent re-renders (even with identical props unless wrapped in `memo`), or when a context it consumes changes. Re-rendering is not the same as DOM updates, and it is usually cheap, so optimise only measured problems. Rendering must be **pure**: no mutation of props/state or side effects.

Real-world example: moving state down so typing does not re-render an expensive sibling.

```tsx
// BAD: every keystroke re-renders <HeavyChart /> because the state lives in the parent
function Page() {
  const [term, setTerm] = useState("");
  return (<><input value={term} onChange={e => setTerm(e.target.value)} /><HeavyChart data={bigData} /></>);
}

// GOOD 1: colocate the state with the component that uses it
function SearchBox() {
  const [term, setTerm] = useState("");
  return <input value={term} onChange={e => setTerm(e.target.value)} />;
}
function PageFixed() { return (<><SearchBox /><HeavyChart data={bigData} /></>); }

// GOOD 2: pass the expensive part as children (element identity is stable, React skips it)
function Shell({ children }: { children: ReactNode }) {
  const [term, setTerm] = useState("");
  return (<><input value={term} onChange={e => setTerm(e.target.value)} />{children}</>);
}
// <Shell><HeavyChart data={bigData} /></Shell>
```

**Keywords:**
`reconciliation, re-render, virtual DOM, commit phase, memo, state colocation, pure rendering`

**Follow-ups:**

-   Does a re-render always touch the DOM?
-   How does the "children as props" trick prevent re-renders?

## react-rendering-002 --- How do concurrent features such as useTransition, useDeferredValue and Suspense keep UIs responsive?

**question_id:** `react-rendering-002`\
**topic_id:** `react-rendering`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do concurrent features such as `useTransition`, `useDeferredValue` and Suspense keep UIs responsive?

**Answer**

React can render in an interruptible way and prioritise updates. `useTransition` marks a state update as non-urgent so urgent input (typing) stays responsive while the heavy render happens in the background and can be interrupted; `isPending` lets you show feedback. `useDeferredValue` gives a lagging copy of a value for expensive subtrees. **Suspense** declaratively shows a fallback while a child waits for code (`lazy`) or data (libraries/Server Components that support it), and nested boundaries control loading granularity. These do not make slow code fast; they schedule it better.

Real-world example: filtering 20k rows while typing without input lag.

```tsx
function ClaimsExplorer({ claims }: { claims: Claim[] }) {
  const [term, setTerm] = useState("");
  const deferredTerm = useDeferredValue(term);                 // may lag behind during heavy renders
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"list" | "chart">("list");

  const visible = useMemo(
    () => claims.filter(c => c.title.toLowerCase().includes(deferredTerm.toLowerCase())),
    [claims, deferredTerm],
  );

  return (
    <>
      <input value={term} onChange={e => setTerm(e.target.value)} aria-label="Search" />   {/* stays instant */}
      <button onClick={() => startTransition(() => setTab("chart"))}>Chart {isPending && "…"}</button>
      <Suspense fallback={<Spinner />}>
        {tab === "chart" ? <LazyChart rows={visible} /> : <ClaimsList rows={visible} />}
      </Suspense>
    </>
  );
}
const LazyChart = lazy(() => import("./RevenueChart"));
```

**Keywords:**
`concurrent rendering, useTransition, useDeferredValue, Suspense, lazy, isPending, scheduling`

**Follow-ups:**

-   What is the difference between debouncing and `useDeferredValue`?
-   How do nested Suspense boundaries affect loading UX?

## react-rendering-003 --- How do you render huge lists efficiently in React?

**question_id:** `react-rendering-003`\
**topic_id:** `react-rendering`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

How do you render huge lists efficiently in React?

**Answer**

Rendering 50,000 rows is slow regardless of memoisation because of DOM size. Use **virtualisation/windowing** (TanStack Virtual, react-window) so only visible rows plus a small overscan exist in the DOM, paginate or infinite-scroll from the server, keep row components small with stable keys, avoid inline object/array props to memoised rows, and move filtering/sorting to the server or a worker for very large data. Keep row heights predictable or measure them.

Real-world example: a virtualized audit log.

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

export function AuditLog({ rows }: { rows: AuditRow[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map(v => {
          const row = rows[v.index];
          return (
            <div key={row.id} style={{ position: "absolute", top: 0, transform: `translateY(${v.start}px)`, height: v.size, width: "100%" }}>
              {row.at} - {row.actor} - {row.action}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Keywords:**
`virtualization, windowing, TanStack Virtual, react-window, infinite scroll, large lists, overscan`

**Follow-ups:**

-   What are the accessibility concerns with virtualised lists?
-   When is server-side pagination better than virtualisation?

## react-rendering-004 --- How do error boundaries, portals and lazy loading improve resilience and UX?

**question_id:** `react-rendering-004`\
**topic_id:** `react-rendering`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do error boundaries, portals and `React.lazy` improve resilience and UX?

**Answer**

An **error boundary** (a class component with `getDerivedStateFromError`/`componentDidCatch`, or the `react-error-boundary` package) catches errors thrown while rendering its subtree and shows a fallback instead of a blank page; it does not catch event-handler, async or server errors. **Portals** render children into a different DOM node (modals, tooltips, toasts) while keeping React tree semantics for events and context. `React.lazy` with `Suspense` splits code per route/feature. Combine them: a route-level boundary, a Suspense fallback and a reset mechanism.

Real-world example: a route wrapper with boundary, lazy page and an accessible modal portal.

```tsx
import { ErrorBoundary } from "react-error-boundary";

const ReportsPage = lazy(() => import("./pages/ReportsPage"));

export function ReportsRoute() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div role="alert"><p>Something went wrong: {error.message}</p><button onClick={resetErrorBoundary}>Retry</button></div>
      )}
      onError={(error, info) => reportToMonitoring(error, info.componentStack)}
    >
      <Suspense fallback={<PageSkeleton />}><ReportsPage /></Suspense>
    </ErrorBoundary>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(<div role="dialog" aria-modal="true" className="modal">{children}</div>, document.body);
}
```

**Keywords:**
`error boundary, portal, React.lazy, Suspense, fallback, resilience, modal, accessibility`

**Follow-ups:**

-   Which kinds of errors do error boundaries not catch?
-   How do you restore focus when a modal closes?

# TOPIC --- React Data Fetching and Forms
**topic_id:** `react-data`
**priority:** `Strong`

## react-data-001 --- Why use TanStack Query instead of fetching in useEffect, and how do caching and invalidation work?

**question_id:** `react-data-001`\
**topic_id:** `react-data`\
**difficulty:** `Senior`\
**question_type:** `Practical / Design`

**Question**

Why use TanStack Query instead of fetching in `useEffect`, and how do caching and invalidation work?

**Answer**

Hand-written effects must solve caching, de-duplication, race conditions, retries, refetch on focus, pagination, loading/error state and cancellation each time. TanStack Query models **server state**: queries are cached by a `queryKey`, shared across components, considered fresh for `staleTime`, garbage-collected after `gcTime`, refetched on window focus/reconnect and retried automatically. After mutations you **invalidate** the related keys (or update the cache optimistically) so the UI reflects the server. Keep keys structured (`["claims", { status, page }]`) and treat the server as the source of truth.

Real-world example: a claims list with pagination and approve-mutation invalidation.

```tsx
export function useClaims(filters: { status: string; page: number }) {
  return useQuery({
    queryKey: ["claims", filters],
    queryFn: ({ signal }) => api.get<Page<Claim>>("/claims", { params: filters, signal }),   // signal cancels stale requests
    placeholderData: keepPreviousData,                  // keep showing the old page while loading the next
    staleTime: 30_000,
  });
}

export function useApproveClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Claim>(`/claims/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),     // refetch every cached claims list
  });
}

function ClaimsList() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, isFetching } = useClaims({ status: "open", page });
  const approve = useApproveClaim();
  if (isPending) return <Skeleton />;
  if (isError) return <ErrorState />;
  return <>{data.items.map(c => <Row key={c.id} claim={c} onApprove={() => approve.mutate(c.id)} />)}{isFetching && <Spinner />}</>;
}
```

**Keywords:**
`TanStack Query, useQuery, useMutation, queryKey, staleTime, invalidation, cache, server state`

**Follow-ups:**

-   What is the difference between `staleTime` and `gcTime`?
-   How does React Query prevent duplicate requests?

## react-data-002 --- How do you implement optimistic updates and handle mutation errors?

**question_id:** `react-data-002`\
**topic_id:** `react-data`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

How do you implement optimistic updates and handle mutation errors?

**Answer**

An optimistic update applies the expected result to the UI immediately and reconciles with the server later. With TanStack Query: in `onMutate` cancel outgoing queries, snapshot the cache and write the optimistic value; in `onError` roll back to the snapshot; in `onSettled` invalidate to sync with the server. React 19's `useOptimistic` does this for form actions. Use it for low-risk, high-success actions (toggle, reorder) and not for money movement without confirmation. Surface failures clearly and keep operations idempotent.

Real-world example: toggling a claim flag with rollback.

```tsx
export function useToggleFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, flagged }: { id: string; flagged: boolean }) => api.put(`/claims/${id}/flag`, { flagged }),
    onMutate: async ({ id, flagged }) => {
      await qc.cancelQueries({ queryKey: ["claims"] });                        // avoid overwriting our optimistic value
      const previous = qc.getQueriesData<Page<Claim>>({ queryKey: ["claims"] });
      qc.setQueriesData<Page<Claim>>({ queryKey: ["claims"] }, old =>
        old && { ...old, items: old.items.map(c => (c.id === id ? { ...c, flagged } : c)) });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));      // rollback
      toast.error("Could not update the claim");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["claims"] }),          // reconcile with server truth
  });
}

// React 19 alternative for form actions
// const [optimisticLikes, addOptimistic] = useOptimistic(likes, (state, delta: number) => state + delta);
```

**Keywords:**
`optimistic update, rollback, onMutate, onError, onSettled, useOptimistic, cache, mutation`

**Follow-ups:**

-   Why cancel in-flight queries in `onMutate`?
-   When is an optimistic update a bad idea?

## react-data-003 --- How do you build performant, accessible forms with React Hook Form and Zod?

**question_id:** `react-data-003`\
**topic_id:** `react-data`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do you build performant, accessible forms with React Hook Form and Zod?

**Answer**

React Hook Form registers inputs as uncontrolled and subscribes to only what you read, minimising re-renders on large forms. A **schema resolver** (Zod) provides one definition for validation and TypeScript types. For accessibility give each input a label, link error messages with `aria-describedby`, mark invalid fields with `aria-invalid`, move focus to the first error on submit and disable the submit button while submitting. Validate again on the server and map ProblemDetails validation errors back onto fields with `setError`.

Real-world example: claim form with server-side error mapping.

```tsx
const schema = z.object({
  policyId: z.string().regex(/^P-\d{6}$/, "Format: P-123456"),
  amount: z.coerce.number().positive("Must be greater than 0").max(1_000_000),
  description: z.string().min(10, "Please add more detail"),
});
type FormValues = z.infer<typeof schema>;

export function ClaimForm({ onCreated }: { onCreated: (c: Claim) => void }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), mode: "onBlur" });

  const onSubmit = handleSubmit(async values => {
    const res = await fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(values) });
    if (res.status === 400) {                                        // ASP.NET Core ValidationProblemDetails
      const problem = await res.json() as { errors: Record<string, string[]> };
      for (const [field, msgs] of Object.entries(problem.errors)) setError(field.toLowerCase() as keyof FormValues, { message: msgs[0] });
      return;
    }
    onCreated(await res.json());
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="policyId">Policy</label>
      <input id="policyId" aria-invalid={!!errors.policyId} aria-describedby="policyId-err" {...register("policyId")} />
      {errors.policyId && <p id="policyId-err" role="alert">{errors.policyId.message}</p>}
      <button disabled={isSubmitting}>Submit</button>
    </form>
  );
}
```

**Keywords:**
`React Hook Form, Zod, zodResolver, validation, accessibility, aria-invalid, ProblemDetails, uncontrolled inputs`

**Follow-ups:**

-   Why do uncontrolled inputs reduce re-renders?
-   How do you focus the first invalid field on submit?

## react-data-004 --- How do React 19 Actions, useActionState and use() change data mutations and loading?

**question_id:** `react-data-004`\
**topic_id:** `react-data`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do React 19 Actions, `useActionState`, `useFormStatus` and `use()` change data mutations and loading?

**Answer**

React 19 lets a `<form action={fn}>` accept an async function (an **Action**), and manages pending state, errors, optimistic updates and form reset for you. `useActionState` returns `[state, formAction, isPending]` for the last result of an action; `useFormStatus` lets child components (a submit button) read the pending state; `useOptimistic` shows optimistic values; and `use(promise)` reads a promise (or context) during render, suspending until it resolves. In frameworks such as Next.js, actions can be **Server Actions** running on the server. They reduce boilerplate but you still need validation, authorisation and error handling.

Real-world example: a newsletter form with pending state and validation messages.

```tsx
type FormState = { ok: boolean; message?: string; errors?: Record<string, string> };

async function subscribeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, errors: { email: "Enter a valid email" } };
  const res = await fetch("/api/subscribe", { method: "POST", body: JSON.stringify({ email }), headers: { "Content-Type": "application/json" } });
  return res.ok ? { ok: true, message: "Subscribed!" } : { ok: false, message: "Try again later" };
}

function SubmitButton() {
  const { pending } = useFormStatus();                       // reads the parent form's status
  return <button disabled={pending}>{pending ? "Saving..." : "Subscribe"}</button>;
}

export function SubscribeForm() {
  const [state, formAction] = useActionState(subscribeAction, { ok: false });
  return (
    <form action={formAction}>
      <input name="email" type="email" aria-invalid={!!state.errors?.email} />
      {state.errors?.email && <p role="alert">{state.errors.email}</p>}
      <SubmitButton />
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
```

**Keywords:**
`React 19, Actions, useActionState, useFormStatus, useOptimistic, use hook, Server Actions, forms`

**Follow-ups:**

-   What does `use()` do differently from other hooks?
-   Why must Server Actions still authorise every call?

# TOPIC --- React Routing, SSR and Server Components
**topic_id:** `react-next`
**priority:** `Strong`

## react-next-001 --- What are React Server Components and how do they differ from Client Components?

**question_id:** `react-next-001`\
**topic_id:** `react-next`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Design`

**Question**

What are React Server Components and how do they differ from Client Components?

**Answer**

**Server Components** render only on the server (or at build time), can be `async`, access databases or secrets directly and send **no component JavaScript** to the browser, only the rendered output (RSC payload). **Client Components** (marked with `"use client"`) are hydrated in the browser and can use state, effects and browser APIs. A server component can render client components and pass them serialisable props, but a client component cannot import a server component (it can receive one as `children`). Keep the client boundary small and low in the tree to reduce bundle size, and never pass secrets across it.

Real-world example: a Next.js App Router page that loads data on the server and hydrates only an interactive filter.

```tsx
// app/claims/page.tsx (Server Component, no "use client")
import { ClaimFilter } from "./claim-filter";

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "all" } = await searchParams;
  const res = await fetch(`${process.env.API_URL}/claims?status=${status}`, {
    headers: { Authorization: `Bearer ${await getServiceToken()}` },   // secret stays on the server
    next: { revalidate: 30, tags: ["claims"] },
  });
  const claims: Claim[] = await res.json();
  return (
    <main>
      <ClaimFilter initial={status} />
      <ul>{claims.map(c => <li key={c.id}>{c.id} - {c.status}</li>)}</ul>
    </main>
  );
}

// app/claims/claim-filter.tsx (Client Component: needs state and event handlers)
"use client";
import { useRouter } from "next/navigation";
export function ClaimFilter({ initial }: { initial: string }) {
  const router = useRouter();
  return <select defaultValue={initial} onChange={e => router.push(`/claims?status=${e.target.value}`)}>
    <option value="all">All</option><option value="open">Open</option>
  </select>;
}
```

**Keywords:**
`Server Components, Client Components, use client, RSC payload, Next.js App Router, hydration, bundle size`

**Follow-ups:**

-   What props can cross the server/client boundary?
-   Why can't a Server Component use `useState`?

## react-next-002 --- Compare CSR, SSR, SSG and ISR, and how do you choose?

**question_id:** `react-next-002`\
**topic_id:** `react-next`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Scenario`

**Question**

Compare CSR, SSR, SSG and ISR, and how do you choose a rendering strategy?

**Answer**

**CSR** (client-side rendering) ships an empty shell and renders in the browser: simple hosting, but slower first content and weaker SEO. **SSR** renders HTML per request: fresh and SEO-friendly but needs a server and adds latency. **SSG** renders at build time: fastest and cheapest for content that rarely changes. **ISR** (incremental static regeneration, `revalidate`) serves static pages and regenerates them in the background on a schedule or on demand. Choose per route: marketing and docs as SSG/ISR, personalised dashboards as CSR or SSR behind auth, product pages as ISR with on-demand revalidation. Streaming and Suspense improve perceived performance for SSR.

Real-world example: per-route strategies in the Next.js App Router.

```tsx
// app/blog/[slug]/page.tsx - SSG + ISR
export const revalidate = 3600;                                      // regenerate at most hourly
export async function generateStaticParams() {
  const posts: { slug: string }[] = await fetch(`${API}/posts`).then(r => r.json());
  return posts.map(p => ({ slug: p.slug }));
}

// app/dashboard/page.tsx - dynamic SSR because it depends on the signed-in user
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const user = await getUserFromCookie();                            // cookies() makes the route dynamic
  return <Greeting name={user.name} />;
}

// app/api/revalidate/route.ts - on-demand ISR triggered by the CMS or backend
import { revalidateTag } from "next/cache";
export async function POST(req: Request) {
  if (req.headers.get("x-webhook-secret") !== process.env.WEBHOOK_SECRET) return new Response("Forbidden", { status: 403 });
  revalidateTag("posts");
  return Response.json({ revalidated: true });
}
```

**Keywords:**
`CSR, SSR, SSG, ISR, revalidate, Next.js, streaming, SEO, rendering strategy`

**Follow-ups:**

-   How does on-demand revalidation avoid stale pages?
-   Why does personalised content usually rule out SSG?

## react-next-003 --- How do you structure routing, layouts, loading and error states with React Router or Next.js?

**question_id:** `react-next-003`\
**topic_id:** `react-next`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do you structure routing, layouts, loading and error states with React Router or the Next.js App Router?

**Answer**

Use **nested routes and layouts** so shared chrome persists across navigations, route-level **loaders** (React Router data APIs) or server components to fetch data before render, per-route `errorElement`/`error.tsx` and `loading.tsx` boundaries, and **protected routes** that redirect unauthenticated users (with the API still enforcing authorisation). Store shareable view state in the URL, lazy-load route components and use route-level code splitting. Provide a 404 route and typed links.

Real-world example: a React Router data-router setup with a protected layout and per-route loader/error handling.

```tsx
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RootError />,
    children: [
      { index: true, element: <Navigate to="/claims" replace /> },
      { path: "login", lazy: () => import("./routes/login") },
      {
        element: <RequireAuth />,                                    // layout route that guards its children
        children: [
          {
            path: "claims",
            lazy: () => import("./routes/claims"),
            loader: async ({ request }) => {
              const url = new URL(request.url);
              return api.listClaims({ status: url.searchParams.get("status") ?? "all", signal: request.signal });
            },
          },
          { path: "claims/:id", lazy: () => import("./routes/claim-detail"), errorElement: <ClaimNotFound /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <PageSkeleton />;
  if (status === "anonymous") return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
```

**Keywords:**
`React Router, nested routes, loader, errorElement, layout, protected route, lazy routes, Next.js`

**Follow-ups:**

-   What is the benefit of loaders over fetching in `useEffect`?
-   How do you preserve the intended destination after login?

## react-next-004 --- What is hydration, and what causes hydration mismatches?

**question_id:** `react-next-004`\
**topic_id:** `react-next`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Troubleshooting`

**Question**

What is hydration, and what causes hydration mismatches?

**Answer**

With SSR the server sends HTML; **hydration** attaches React's event handlers and state to that markup in the browser without recreating the DOM. The first client render must produce the **same output** as the server. Mismatches come from rendering values that differ between server and client: `Date.now()`, `Math.random()`, locale/time-zone formatting, `window`/`localStorage` checks (`typeof window !== "undefined"` branches), invalid HTML nesting (a `<div>` in a `<p>`) and browser extensions altering the DOM. Fix by deferring client-only values to an effect (render a placeholder first), using stable ids (`useId`), formatting with an explicit locale/time zone and `suppressHydrationWarning` only for unavoidable text differences.

Real-world example: a "last updated" timestamp and a theme toggle that mismatched.

```tsx
// BAD: server renders its own time/locale, client renders a different one
function LastUpdated({ iso }: { iso: string }) {
  return <time>{new Date(iso).toLocaleString()}</time>;
}

// GOOD 1: deterministic formatting, explicit locale and time zone
const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
function LastUpdatedFixed({ iso }: { iso: string }) { return <time dateTime={iso}>{fmt.format(new Date(iso))} UTC</time>; }

// GOOD 2: client-only value rendered after mount
function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => setTheme((localStorage.getItem("theme") as "light" | "dark") ?? "light"), []);
  if (theme === null) return <button aria-hidden style={{ visibility: "hidden" }}>Theme</button>;   // same on server and first client render
  return <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme}</button>;
}

function Field() { const id = useId(); return (<><label htmlFor={id}>Name</label><input id={id} /></>); }   // stable ids across server/client
```

**Keywords:**
`hydration, SSR, hydration mismatch, useId, suppressHydrationWarning, deterministic rendering, Intl`

**Follow-ups:**

-   Why does `Math.random()` in render break hydration?
-   How does `useId` solve id mismatches?

# TOPIC --- React Testing and Accessibility
**topic_id:** `react-testing`
**priority:** `Strong`

## react-testing-001 --- How do you test React components with React Testing Library and user-event?

**question_id:** `react-testing-001`\
**topic_id:** `react-testing`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do you test React components with React Testing Library and `user-event`?

**Answer**

React Testing Library encourages testing what users experience: render the component, query by **accessible role, label or text** (`getByRole`, `findBy...` for async), interact with `userEvent` (which simulates real typing/clicking sequences) and assert on visible output. Avoid testing implementation details (state values, internal methods, snapshot overuse). Prefer `findBy` and `waitFor` for async UI, `within` for scoped queries and wrap providers in a custom render. Pair with Vitest or Jest.

Real-world example: testing a claim approval flow.

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

test("approves a claim and shows confirmation", async () => {
  const user = userEvent.setup();
  renderWithProviders(<ClaimsList />);

  const row = await screen.findByRole("row", { name: /C-1001/ });         // waits for data to load
  await user.click(within(row).getByRole("button", { name: /approve/i }));

  expect(await screen.findByRole("status")).toHaveTextContent("Claim C-1001 approved");
  expect(within(row).getByText("Approved")).toBeInTheDocument();
});

test("shows validation errors", async () => {
  const user = userEvent.setup();
  render(<ClaimForm onCreated={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: /submit/i }));
  expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
});
```

**Keywords:**
`React Testing Library, user-event, getByRole, findBy, waitFor, Vitest, Jest, testing behaviour`

**Follow-ups:**

-   Why prefer `getByRole` over `getByTestId`?
-   What is wrong with testing component state directly?

## react-testing-002 --- How do you mock APIs with Mock Service Worker and test hooks and async behaviour?

**question_id:** `react-testing-002`\
**topic_id:** `react-testing`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you mock APIs with Mock Service Worker (MSW) and test hooks and async behaviour?

**Answer**

MSW intercepts requests at the network layer, so components run with their real `fetch`/axios/React Query code and you only fake the **server**. Define handlers that mirror your API contract (ideally generated from OpenAPI), reuse them in unit, integration, Storybook and local development, and override per test for error and edge cases (500s, slow responses, empty lists). Reset handlers after each test and fail on unhandled requests. Test custom hooks with `renderHook` and wrap providers; avoid fake timers unless necessary.

Real-world example: default handlers plus a per-test failure.

```tsx
// test/server.ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const handlers = [
  http.get("/api/claims", () => HttpResponse.json({ items: [{ id: "C-1001", status: "Submitted", amount: 250 }], total: 1 })),
  http.post("/api/claims/:id/approve", ({ params }) => HttpResponse.json({ id: params.id, status: "Approved" })),
];
export const server = setupServer(...handlers);

// test/setup.ts
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// claims.test.tsx
test("shows an error state when the API fails", async () => {
  server.use(http.get("/api/claims", () => HttpResponse.json({ title: "Boom" }, { status: 500 })));
  renderWithProviders(<ClaimsList />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
});

test("useDebouncedValue waits for the delay", async () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: "a" } });
  rerender({ v: "ab" });
  expect(result.current).toBe("a");
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(result.current).toBe("ab");
  vi.useRealTimers();
});
```

**Keywords:**
`Mock Service Worker, MSW, renderHook, fake timers, API mocking, onUnhandledRequest, contract`

**Follow-ups:**

-   Why is network-level mocking better than mocking `fetch` or modules?
-   How do you keep mocks in sync with the real API?

## react-testing-003 --- How do you build accessible React components (focus, ARIA, keyboard) and test them?

**question_id:** `react-testing-003`\
**topic_id:** `react-testing`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you build accessible React components (focus management, ARIA, keyboard support) and test them?

**Answer**

Start with **semantic HTML** (`button`, `a`, `label`, headings, landmarks) because it gives keyboard and screen-reader behaviour for free; add ARIA only to fill gaps (`aria-expanded`, `aria-controls`, `aria-live`, roles for custom widgets) and never use ARIA to contradict native semantics. Manage focus on route changes, dialogs (trap and restore), and errors (focus the first invalid field or an error summary). Ensure visible focus styles, colour contrast and full keyboard operability. Test with `getByRole` queries (which fail on poor semantics), `jest-axe`/`axe-core` in CI, Playwright keyboard flows and manual screen-reader checks. Prefer headless libraries (Radix, React Aria) for complex widgets.

Real-world example: an accessible disclosure and live-region announcement with an axe check.

```tsx
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(o => !o)}>{title}</button>
      <div id={panelId} hidden={!open}>{children}</div>
    </div>
  );
}

export function SaveStatus({ message }: { message: string }) {
  return <p role="status" aria-live="polite">{message}</p>;      // announced by screen readers without moving focus
}

// a11y.test.tsx
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

test("Disclosure has no obvious accessibility violations and works by keyboard", async () => {
  const user = userEvent.setup();
  const { container } = render(<Disclosure title="Details">Hidden text</Disclosure>);
  expect(await axe(container)).toHaveNoViolations();
  await user.tab();
  expect(screen.getByRole("button", { name: "Details" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute("aria-expanded", "true");
});
```

**Keywords:**
`accessibility, ARIA, focus management, aria-live, keyboard navigation, jest-axe, semantic HTML, WCAG`

**Follow-ups:**

-   Why is `div onClick` a poor replacement for `button`?
-   How do you manage focus after a client-side route change?

## react-testing-004 --- How do you structure end-to-end tests with Playwright for a React app?

**question_id:** `react-testing-004`\
**topic_id:** `react-testing`\
**difficulty:** `Senior`\
**question_type:** `Practical / Strategy`

**Question**

How do you structure end-to-end tests with Playwright for a React app, and what belongs in E2E versus unit tests?

**Answer**

Keep a **small number of E2E tests for critical user journeys** (sign-in, submit a claim, pay, export) and cover logic and edge cases in unit/integration tests, following the test pyramid. Use Playwright's auto-waiting locators (`getByRole`, `getByLabel`), isolate tests with fresh storage state, seed data through the API (not through the UI), reuse authentication via `storageState`, run in parallel, capture traces on failure and run against a production-like build in CI. Avoid arbitrary sleeps and brittle CSS selectors, and quarantine flaky tests with an owner rather than retry forever.

Real-world example: authenticated claim submission with API seeding.

```ts
// global-setup: log in once and save the session cookie
import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ seededPolicy: { id: string } }>({
  seededPolicy: async ({ request }, use) => {
    const res = await request.post("/api/test-support/policies", { data: { holder: "E2E User" } });   // seed via API, not UI
    const policy = await res.json();
    await use(policy);
    await request.delete(`/api/test-support/policies/${policy.id}`);
  },
});

test("customer submits a claim", async ({ page, seededPolicy }) => {
  await page.goto("/claims/new");
  await page.getByLabel("Policy").fill(seededPolicy.id);
  await page.getByLabel("Amount").fill("250");
  await page.getByLabel("Description").fill("Rear bumper damage after parking incident");
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByRole("status")).toContainText("Claim submitted");
  await expect(page).toHaveURL(/\/claims\/C-\d+/);
});

// playwright.config.ts: use: { storageState: "auth.json", trace: "retain-on-failure" }, retries: process.env.CI ? 1 : 0
```

**Keywords:**
`Playwright, end-to-end testing, locators, storageState, test pyramid, trace, flaky tests, API seeding`

**Follow-ups:**

-   How do you reduce flakiness in E2E tests?
-   What is the right split between unit, integration and E2E tests?
