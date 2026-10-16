# Common Algorithms & Data Structures — C# Implementations

> Seed data for the InterviewForge Algorithms section. Format: `# Category: X`, `## Algorithm name`,
> then the fixed `###` parts below. Edit or add entries and run `POST /api/admin/import`.

# Category: Arrays

## Two Sum

### Problem Statement

Given an integer array `nums` and a `target`, return the indices of the two numbers that add up to `target`. Exactly one solution exists.

### Explanation

A brute-force double loop checks every pair (O(n²)). Remembering previously seen values in a hash map lets us find the complement in O(1).

### Approach

- Iterate once.
- For each `nums[i]`, compute `target - nums[i]`.
- If the complement is already in the dictionary, return both indices; otherwise store `nums[i] → i`.

### Time Complexity

O(n)

### Space Complexity

O(n)

### C# Implementation

```csharp
public static int[] TwoSum(int[] nums, int target)
{
    var seen = new Dictionary<int, int>(nums.Length);
    for (var i = 0; i < nums.Length; i++)
    {
        var complement = target - nums[i];
        if (seen.TryGetValue(complement, out var j))
            return [j, i];
        seen[nums[i]] = i;
    }
    throw new ArgumentException("No two numbers add up to the target.");
}
```

### Example

`nums = [2, 7, 11, 15], target = 9` → `[0, 1]`

### Common Interview Questions

- What if the array is sorted? (two pointers, O(1) space)
- Return all unique pairs?
- How would you handle 3Sum?

### Common Mistakes

- Inserting before checking, which pairs an element with itself.
- Using `Add` instead of the indexer and throwing on duplicate keys.

## Maximum Subarray (Kadane's Algorithm)

### Problem Statement

Find the contiguous subarray with the largest sum and return that sum.

### Explanation

Kadane's algorithm keeps the best sum of a subarray that *ends* at the current index. Either extend the previous run or start fresh at the current element.

### Approach

- `current = max(x, current + x)`
- `best = max(best, current)`
- Initialise both with the first element so all-negative arrays work.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static int MaxSubArray(int[] nums)
{
    ArgumentOutOfRangeException.ThrowIfZero(nums.Length);
    int current = nums[0], best = nums[0];
    for (var i = 1; i < nums.Length; i++)
    {
        current = Math.Max(nums[i], current + nums[i]);
        best = Math.Max(best, current);
    }
    return best;
}
```

### Example

`[-2,1,-3,4,-1,2,1,-5,4]` → `6` (subarray `[4,-1,2,1]`)

### Common Interview Questions

- Return the start/end indices as well.
- Maximum product subarray?
- Circular array variant?

### Common Mistakes

- Initialising `best` with 0 (wrong for all-negative input).
- Confusing subarray (contiguous) with subsequence.

## Merge Sorted Arrays

### Problem Statement

Merge sorted array `nums2` (length n) into sorted array `nums1` which has length m + n with trailing space.

### Explanation

Filling from the front would overwrite unread values. Filling from the back uses the empty tail as a buffer.

### Approach

- Three pointers: end of `nums1` data (`i`), end of `nums2` (`j`), write position (`k`).
- Place the larger of `nums1[i]`/`nums2[j]` at `k`.
- Copy leftovers from `nums2`.

### Time Complexity

O(m + n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static void Merge(int[] nums1, int m, int[] nums2, int n)
{
    int i = m - 1, j = n - 1, k = m + n - 1;
    while (j >= 0)
    {
        if (i >= 0 && nums1[i] > nums2[j]) nums1[k--] = nums1[i--];
        else nums1[k--] = nums2[j--];
    }
}
```

### Example

`nums1 = [1,2,3,0,0,0], m=3, nums2 = [2,5,6]` → `[1,2,2,3,5,6]`

### Common Interview Questions

- Merge k sorted arrays (min-heap / `PriorityQueue`).
- Why is iterating from the end safe?

### Common Mistakes

- Looping while `i >= 0` and forgetting remaining `nums2` items.
- Off-by-one on initial indices.

## Rotate Array

### Problem Statement

Rotate an array to the right by `k` steps in place.

### Explanation

Rotating right by k equals: reverse whole array, reverse first k, reverse the rest.

### Approach

- `k %= n` to handle k > n.
- Reverse `[0..n-1]`, `[0..k-1]`, `[k..n-1]`.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static void Rotate(int[] nums, int k)
{
    var n = nums.Length;
    if (n == 0) return;
    k %= n;
    nums.AsSpan().Reverse();
    nums.AsSpan(0, k).Reverse();
    nums.AsSpan(k).Reverse();
}
```

### Example

`[1,2,3,4,5,6,7], k = 3` → `[5,6,7,1,2,3,4]`

### Common Interview Questions

- Rotate left instead?
- Alternative using cyclic replacements?

### Common Mistakes

- Forgetting `k %= n`.
- Allocating a new array when in-place was required.

## Remove Duplicates from Sorted Array

### Problem Statement

Remove duplicates in place from a sorted array so each element appears once; return the new length.

### Explanation

Because the array is sorted, duplicates are adjacent. A slow pointer marks where the next unique value is written.

### Approach

- `write = 1`.
- For each `read` from 1: if `nums[read] != nums[write-1]`, copy it to `write++`.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static int RemoveDuplicates(int[] nums)
{
    if (nums.Length == 0) return 0;
    var write = 1;
    for (var read = 1; read < nums.Length; read++)
        if (nums[read] != nums[write - 1])
            nums[write++] = nums[read];
    return write;
}
```

### Example

`[0,0,1,1,1,2,2,3,3,4]` → `5`, array starts with `[0,1,2,3,4]`

### Common Interview Questions

- Allow at most two duplicates?
- Unsorted input? (HashSet, O(n) space)

### Common Mistakes

- Comparing with `nums[read-1]` after overwriting.
- Returning the array instead of the length.

## Best Time to Buy and Sell Stock

### Problem Statement

Given daily prices, return the maximum profit from one buy followed by one sell.

### Explanation

Track the minimum price seen so far; the best profit at day i is `price[i] - minSoFar`.

### Approach

- Single pass keeping `minPrice` and `maxProfit`.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static int MaxProfit(int[] prices)
{
    int min = int.MaxValue, best = 0;
    foreach (var p in prices)
    {
        min = Math.Min(min, p);
        best = Math.Max(best, p - min);
    }
    return best;
}
```

### Example

`[7,1,5,3,6,4]` → `5`

### Common Interview Questions

- Unlimited transactions?
- With cooldown or fee (DP)?

### Common Mistakes

- Selling before buying (using a global max minus global min).

## Product of Array Except Self

### Problem Statement

Return an array where `output[i]` is the product of all elements except `nums[i]`, without division.

### Explanation

Product except self = (product of everything left of i) × (product of everything right of i).

### Approach

- First pass fills prefix products.
- Second pass multiplies by a running suffix product.

### Time Complexity

O(n)

### Space Complexity

O(1) extra (output excluded)

### C# Implementation

```csharp
public static int[] ProductExceptSelf(int[] nums)
{
    var result = new int[nums.Length];
    var prefix = 1;
    for (var i = 0; i < nums.Length; i++) { result[i] = prefix; prefix *= nums[i]; }
    var suffix = 1;
    for (var i = nums.Length - 1; i >= 0; i--) { result[i] *= suffix; suffix *= nums[i]; }
    return result;
}
```

### Example

`[1,2,3,4]` → `[24,12,8,6]`

### Common Interview Questions

- Why not divide total product by `nums[i]`? (zeros)
- Overflow handling with `long` / `checked`.

### Common Mistakes

- Using division and breaking on zeros.

# Category: Strings

## Reverse String

### Problem Statement

Reverse a string (or a char array in place).

### Explanation

Swap characters from both ends moving inward. In .NET strings are immutable, so work on a `char[]`/`Span<char>`.

### Approach

- Two pointers `left`, `right`; swap and move until they meet.

### Time Complexity

O(n)

### Space Complexity

O(n) for a new string, O(1) for in-place char array

### C# Implementation

```csharp
public static string Reverse(string s)
{
    return string.Create(s.Length, s, static (span, src) =>
    {
        src.AsSpan().CopyTo(span);
        span.Reverse();
    });
}

public static void ReverseInPlace(char[] chars)
{
    for (int l = 0, r = chars.Length - 1; l < r; l++, r--)
        (chars[l], chars[r]) = (chars[r], chars[l]);
}
```

### Example

`"hello"` → `"olleh"`

### Common Interview Questions

- How do you handle surrogate pairs / grapheme clusters (`StringInfo`)?
- Reverse words in a sentence?

### Common Mistakes

- Concatenating in a loop (O(n²) allocations).
- Ignoring Unicode surrogate pairs.

## Valid Palindrome

### Problem Statement

Determine whether a string is a palindrome considering only alphanumeric characters and ignoring case.

### Explanation

Compare characters from both ends while skipping non-alphanumeric characters.

### Approach

- Two pointers; skip with `char.IsLetterOrDigit`; compare `char.ToLowerInvariant`.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static bool IsPalindrome(string s)
{
    int l = 0, r = s.Length - 1;
    while (l < r)
    {
        if (!char.IsLetterOrDigit(s[l])) { l++; continue; }
        if (!char.IsLetterOrDigit(s[r])) { r--; continue; }
        if (char.ToLowerInvariant(s[l]) != char.ToLowerInvariant(s[r])) return false;
        l++; r--;
    }
    return true;
}
```

### Example

`"A man, a plan, a canal: Panama"` → `true`

### Common Interview Questions

- Allow deleting at most one character?
- Longest palindromic substring (expand around centre)?

### Common Mistakes

- Building a cleaned copy unnecessarily.
- Culture-sensitive lower-casing.

## Valid Anagram

### Problem Statement

Determine whether two strings are anagrams of each other.

### Explanation

Anagrams have identical character counts. Count up for one string, down for the other.

### Approach

- Length check first.
- For lowercase ASCII use an `int[26]`; for Unicode use a `Dictionary<char,int>`.

### Time Complexity

O(n)

### Space Complexity

O(1) for fixed alphabet

### C# Implementation

```csharp
public static bool IsAnagram(string s, string t)
{
    if (s.Length != t.Length) return false;
    Span<int> counts = stackalloc int[26];
    for (var i = 0; i < s.Length; i++)
    {
        counts[s[i] - 'a']++;
        counts[t[i] - 'a']--;
    }
    foreach (var c in counts) if (c != 0) return false;
    return true;
}
```

### Example

`"anagram", "nagaram"` → `true`

### Common Interview Questions

- Group anagrams from a list (sorted key or count signature).
- Unicode input?

### Common Mistakes

- Sorting both strings (O(n log n)) when counting is enough.
- Not checking lengths first.

## Character Frequency

### Problem Statement

Count how often each character occurs in a string and return the most frequent one.

### Explanation

A dictionary (or LINQ `CountBy` in .NET 9+) aggregates counts in one pass.

### Approach

- Iterate characters, increment counts using `CollectionsMarshal.GetValueRefOrAddDefault` to avoid double lookups.

### Time Complexity

O(n)

### Space Complexity

O(k) distinct characters

### C# Implementation

```csharp
public static Dictionary<char, int> Frequencies(string s)
{
    var map = new Dictionary<char, int>();
    foreach (var c in s)
        System.Runtime.InteropServices.CollectionsMarshal.GetValueRefOrAddDefault(map, c, out _)++;
    return map;
}

public static char MostFrequent(string s) =>
    Frequencies(s).MaxBy(kv => kv.Value).Key;

// .NET 9+: s.CountBy(c => c).MaxBy(kv => kv.Value).Key
```

### Example

`"programming"` → `r:2, g:2, m:2, ...`

### Common Interview Questions

- First non-repeating character?
- Top-k frequent (heap or bucket sort)?

### Common Mistakes

- `map[c]++` on a missing key throws `KeyNotFoundException`.

## Longest Substring Without Repeating Characters

### Problem Statement

Find the length of the longest substring without repeating characters.

### Explanation

Sliding window: expand the right edge; when a character repeats, jump the left edge past its previous position.

### Approach

- Store last index of each char.
- `left = max(left, last[c] + 1)`.
- `best = max(best, right - left + 1)`.

### Time Complexity

O(n)

### Space Complexity

O(min(n, alphabet))

### C# Implementation

```csharp
public static int LengthOfLongestSubstring(string s)
{
    var last = new Dictionary<char, int>();
    int best = 0, left = 0;
    for (var right = 0; right < s.Length; right++)
    {
        if (last.TryGetValue(s[right], out var prev) && prev >= left)
            left = prev + 1;
        last[s[right]] = right;
        best = Math.Max(best, right - left + 1);
    }
    return best;
}
```

### Example

`"abcabcbb"` → `3` (`"abc"`)

### Common Interview Questions

- At most k distinct characters?
- Minimum window substring?

### Common Mistakes

- Moving `left` backwards when the previous index is outside the window.

# Category: Linked Lists

## Reverse Linked List

### Problem Statement

Reverse a singly linked list and return the new head.

### Explanation

Walk the list re-pointing each node's `Next` to the previous node.

### Approach

- Keep `prev`, `current`; save `next` before re-pointing.

### Time Complexity

O(n)

### Space Complexity

O(1) iterative, O(n) recursive

### C# Implementation

```csharp
public sealed class ListNode(int val, ListNode? next = null)
{
    public int Val = val;
    public ListNode? Next = next;
}


public static ListNode? Reverse(ListNode? head)
{
    ListNode? prev = null;
    var current = head;
    while (current is not null)
    {
        var next = current.Next;
        current.Next = prev;
        prev = current;
        current = next;
    }
    return prev;
}
```

### Example

`1→2→3→4→5` → `5→4→3→2→1`

### Common Interview Questions

- Recursive version?
- Reverse between positions m and n?
- Reverse in groups of k?

### Common Mistakes

- Losing the rest of the list by not saving `next`.
- Returning `head` instead of `prev`.

## Detect Cycle (Floyd's Tortoise and Hare)

### Problem Statement

Determine whether a linked list has a cycle.

### Explanation

A fast pointer (2 steps) eventually meets a slow pointer (1 step) inside a cycle; otherwise it reaches null.

### Approach

- Advance `slow` by 1 and `fast` by 2 until they meet or `fast` ends.
- To find the cycle start: reset one pointer to head and move both by 1.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public sealed class ListNode(int val, ListNode? next = null)
{
    public int Val = val;
    public ListNode? Next = next;
}


public static bool HasCycle(ListNode? head)
{
    ListNode? slow = head, fast = head;
    while (fast?.Next is not null)
    {
        slow = slow!.Next;
        fast = fast.Next.Next;
        if (ReferenceEquals(slow, fast)) return true;
    }
    return false;
}
```

### Example

List `3→2→0→-4→(back to 2)` → `true`

### Common Interview Questions

- Return the node where the cycle starts.
- Why does Floyd's algorithm work?

### Common Mistakes

- Null checks on `fast.Next` missing.
- Using a HashSet when O(1) space was requested.

## Merge Two Sorted Lists

### Problem Statement

Merge two sorted linked lists into one sorted list.

### Explanation

A dummy head node removes edge cases; repeatedly attach the smaller current node.

### Approach

- `tail` pointer starting at dummy.
- Attach remainder at the end.

### Time Complexity

O(n + m)

### Space Complexity

O(1)

### C# Implementation

```csharp
public sealed class ListNode(int val, ListNode? next = null)
{
    public int Val = val;
    public ListNode? Next = next;
}


public static ListNode? Merge(ListNode? a, ListNode? b)
{
    var dummy = new ListNode(0);
    var tail = dummy;
    while (a is not null && b is not null)
    {
        if (a.Val <= b.Val) { tail.Next = a; a = a.Next; }
        else { tail.Next = b; b = b.Next; }
        tail = tail.Next;
    }
    tail.Next = a ?? b;
    return dummy.Next;
}
```

### Example

`1→2→4` + `1→3→4` → `1→1→2→3→4→4`

### Common Interview Questions

- Merge k sorted lists with `PriorityQueue<ListNode,int>`.

### Common Mistakes

- Forgetting to attach the remaining list.

## Find Middle Node

### Problem Statement

Return the middle node of a linked list (second middle for even lengths).

### Explanation

When the fast pointer reaches the end, the slow pointer is at the middle.

### Approach

- `slow` 1 step, `fast` 2 steps.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public sealed class ListNode(int val, ListNode? next = null)
{
    public int Val = val;
    public ListNode? Next = next;
}


public static ListNode? Middle(ListNode? head)
{
    ListNode? slow = head, fast = head;
    while (fast?.Next is not null)
    {
        slow = slow!.Next;
        fast = fast.Next.Next;
    }
    return slow;
}
```

### Example

`1→2→3→4→5` → node `3`; `1→2→3→4` → node `3`

### Common Interview Questions

- Return the first middle for even length?
- Check if list is a palindrome?

### Common Mistakes

- Counting length first then walking again (works but two passes).

## Remove Nth Node From End

### Problem Statement

Remove the n-th node from the end of a list in one pass.

### Explanation

Advance a lead pointer n steps; then move both pointers until lead reaches the end. The trailing pointer is just before the target.

### Approach

- Use a dummy node so removing the head is not a special case.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public sealed class ListNode(int val, ListNode? next = null)
{
    public int Val = val;
    public ListNode? Next = next;
}


public static ListNode? RemoveNthFromEnd(ListNode? head, int n)
{
    var dummy = new ListNode(0, head);
    ListNode? lead = dummy;
    var trail = dummy;
    for (var i = 0; i <= n; i++)
    {
        if (lead is null) throw new ArgumentOutOfRangeException(nameof(n));
        lead = lead.Next;
    }
    while (lead is not null) { lead = lead.Next; trail = trail.Next!; }
    trail.Next = trail.Next!.Next;
    return dummy.Next;
}
```

### Example

`1→2→3→4→5, n = 2` → `1→2→3→5`

### Common Interview Questions

- What if n is larger than the list length?

### Common Mistakes

- Not using a dummy node and failing when removing the head.

# Category: Stack & Queue

## Valid Parentheses

### Problem Statement

Given a string of `()[]{}`, determine whether brackets are balanced and correctly nested.

### Explanation

Push opening brackets; on a closing bracket the top of the stack must be the matching opener.

### Approach

- `Stack<char>`; a map from closer to opener.
- Valid only if the stack is empty at the end.

### Time Complexity

O(n)

### Space Complexity

O(n)

### C# Implementation

```csharp
public static bool IsValid(string s)
{
    var stack = new Stack<char>();
    foreach (var c in s)
    {
        switch (c)
        {
            case '(' or '[' or '{': stack.Push(c); break;
            case ')': if (!stack.TryPop(out var a) || a != '(') return false; break;
            case ']': if (!stack.TryPop(out var b) || b != '[') return false; break;
            case '}': if (!stack.TryPop(out var d) || d != '{') return false; break;
        }
    }
    return stack.Count == 0;
}
```

### Example

`"{[]}"` → `true`, `"([)]"` → `false`

### Common Interview Questions

- Minimum additions to make valid?
- Longest valid parentheses?

### Common Mistakes

- Forgetting to check the stack is empty at the end.
- Calling `Pop` on an empty stack.

## Min Stack

### Problem Statement

Design a stack supporting push, pop, top and retrieving the minimum in O(1).

### Explanation

Store, alongside each value, the minimum at the time it was pushed.

### Approach

- Stack of `(Value, Min)` tuples.

### Time Complexity

O(1) per operation

### Space Complexity

O(n)

### C# Implementation

```csharp
public sealed class MinStack
{
    private readonly Stack<(int Value, int Min)> _stack = new();

    public void Push(int value) =>
        _stack.Push((value, _stack.Count == 0 ? value : Math.Min(value, _stack.Peek().Min)));

    public int Pop() => _stack.Pop().Value;
    public int Top() => _stack.Peek().Value;
    public int GetMin() => _stack.Peek().Min;
}
```

### Example

push(-2), push(0), push(-3), getMin() → -3, pop(), getMin() → -2

### Common Interview Questions

- Max stack?
- Reduce memory with a second stack only storing new minima?

### Common Mistakes

- Using a single `min` field that becomes wrong after popping.

## Queue Using Stacks

### Problem Statement

Implement a FIFO queue using two stacks.

### Explanation

Push into an inbox stack; when dequeuing, if the outbox is empty, pour the inbox into it (reversing order).

### Approach

- Amortised O(1) because each element moves at most once.

### Time Complexity

Amortised O(1)

### Space Complexity

O(n)

### C# Implementation

```csharp
public sealed class StackQueue<T>
{
    private readonly Stack<T> _in = new(), _out = new();

    public void Enqueue(T item) => _in.Push(item);

    public T Dequeue() { Shift(); return _out.Pop(); }
    public T Peek() { Shift(); return _out.Peek(); }
    public int Count => _in.Count + _out.Count;

    private void Shift()
    {
        if (_out.Count == 0)
            while (_in.Count > 0) _out.Push(_in.Pop());
        if (_out.Count == 0) throw new InvalidOperationException("Queue is empty.");
    }
}
```

### Example

enqueue 1,2,3 → dequeue returns 1

### Common Interview Questions

- Explain the amortised analysis.

### Common Mistakes

- Pouring on every dequeue even when outbox is not empty (breaks order).

## Stack Using Queues

### Problem Statement

Implement a LIFO stack using a queue.

### Explanation

After enqueuing, rotate the queue so the newest element is at the front.

### Approach

- Push: enqueue then dequeue/enqueue `count-1` items.

### Time Complexity

Push O(n), Pop O(1)

### Space Complexity

O(n)

### C# Implementation

```csharp
public sealed class QueueStack<T>
{
    private readonly Queue<T> _q = new();

    public void Push(T item)
    {
        _q.Enqueue(item);
        for (var i = 0; i < _q.Count - 1; i++) _q.Enqueue(_q.Dequeue());
    }

    public T Pop() => _q.Dequeue();
    public T Top() => _q.Peek();
    public bool IsEmpty => _q.Count == 0;
}
```

### Example

push 1, push 2, pop → 2

### Common Interview Questions

- Trade-off: costly push vs costly pop?

### Common Mistakes

- Rotating `Count` times instead of `Count - 1`.

# Category: Trees

## Depth-First Search (Tree)

### Problem Statement

Visit every node of a binary tree depth-first.

### Explanation

DFS explores one branch fully before backtracking. Recursion uses the call stack; an explicit `Stack<T>` avoids stack overflow on deep trees.

### Approach

- Push root; pop a node, visit, push right then left (so left is processed first).

### Time Complexity

O(n)

### Space Complexity

O(h) where h is tree height

### C# Implementation

```csharp
public sealed class TreeNode(int val, TreeNode? left = null, TreeNode? right = null)
{
    public int Val = val;
    public TreeNode? Left = left, Right = right;
}


public static IEnumerable<int> Dfs(TreeNode? root)
{
    if (root is null) yield break;
    var stack = new Stack<TreeNode>();
    stack.Push(root);
    while (stack.TryPop(out var node))
    {
        yield return node.Val;
        if (node.Right is not null) stack.Push(node.Right);
        if (node.Left is not null) stack.Push(node.Left);
    }
}
```

### Example

Tree `1(2(4,5),3)` → `1,2,4,5,3`

### Common Interview Questions

- Recursive vs iterative trade-offs?
- Path sum problems?

### Common Mistakes

- Pushing left before right (changes order).
- Recursion on very deep/degenerate trees causing `StackOverflowException` (which cannot be caught in .NET).

## Breadth-First Search (Level Order)

### Problem Statement

Return the values of a binary tree level by level.

### Explanation

BFS uses a queue; processing `queue.Count` nodes at a time groups them by level.

### Approach

- Enqueue root; for each level, dequeue `levelSize` nodes and enqueue their children.

### Time Complexity

O(n)

### Space Complexity

O(w) where w is maximum width

### C# Implementation

```csharp
public sealed class TreeNode(int val, TreeNode? left = null, TreeNode? right = null)
{
    public int Val = val;
    public TreeNode? Left = left, Right = right;
}


public static List<List<int>> LevelOrder(TreeNode? root)
{
    var result = new List<List<int>>();
    if (root is null) return result;
    var queue = new Queue<TreeNode>([root]);
    while (queue.Count > 0)
    {
        var level = new List<int>(queue.Count);
        for (var i = queue.Count; i > 0; i--)
        {
            var node = queue.Dequeue();
            level.Add(node.Val);
            if (node.Left is not null) queue.Enqueue(node.Left);
            if (node.Right is not null) queue.Enqueue(node.Right);
        }
        result.Add(level);
    }
    return result;
}
```

### Example

`3(9,20(15,7))` → `[[3],[9,20],[15,7]]`

### Common Interview Questions

- Zigzag level order?
- Right side view?
- Minimum depth (BFS stops early)?

### Common Mistakes

- Reading `queue.Count` inside the loop condition while it changes.

## Inorder Traversal

### Problem Statement

Return the inorder traversal (left, node, right) of a binary tree.

### Explanation

For a BST, inorder yields values in sorted order.

### Approach

- Iterative: walk left pushing nodes; pop, visit, then go right.

### Time Complexity

O(n)

### Space Complexity

O(h)

### C# Implementation

```csharp
public sealed class TreeNode(int val, TreeNode? left = null, TreeNode? right = null)
{
    public int Val = val;
    public TreeNode? Left = left, Right = right;
}


public static List<int> Inorder(TreeNode? root)
{
    var result = new List<int>();
    var stack = new Stack<TreeNode>();
    var current = root;
    while (current is not null || stack.Count > 0)
    {
        while (current is not null) { stack.Push(current); current = current.Left; }
        current = stack.Pop();
        result.Add(current.Val);
        current = current.Right;
    }
    return result;
}
```

### Example

`1(null,2(3,null))` → `[1,3,2]`

### Common Interview Questions

- Morris traversal with O(1) space?
- k-th smallest element in a BST?

### Common Mistakes

- Visiting the node before its left subtree.

## Preorder Traversal

### Problem Statement

Return the preorder traversal (node, left, right).

### Explanation

Preorder is useful for copying/serialising a tree because the root comes first.

### Approach

- Recursive helper appending node then recursing left and right.

### Time Complexity

O(n)

### Space Complexity

O(h)

### C# Implementation

```csharp
public sealed class TreeNode(int val, TreeNode? left = null, TreeNode? right = null)
{
    public int Val = val;
    public TreeNode? Left = left, Right = right;
}


public static List<int> Preorder(TreeNode? root)
{
    var result = new List<int>();
    void Visit(TreeNode? n)
    {
        if (n is null) return;
        result.Add(n.Val);
        Visit(n.Left);
        Visit(n.Right);
    }
    Visit(root);
    return result;
}
```

### Example

`1(2,3)` → `[1,2,3]`

### Common Interview Questions

- Serialise and deserialise a tree?

### Common Mistakes

- Allocating a new list per recursive call.

## Postorder Traversal

### Problem Statement

Return the postorder traversal (left, right, node).

### Explanation

Postorder processes children before parents — useful for deleting trees or computing subtree aggregates.

### Approach

- Iterative trick: produce node-right-left with a stack, then reverse.

### Time Complexity

O(n)

### Space Complexity

O(n)

### C# Implementation

```csharp
public sealed class TreeNode(int val, TreeNode? left = null, TreeNode? right = null)
{
    public int Val = val;
    public TreeNode? Left = left, Right = right;
}


public static List<int> Postorder(TreeNode? root)
{
    var result = new List<int>();
    if (root is null) return result;
    var stack = new Stack<TreeNode>([root]);
    while (stack.TryPop(out var node))
    {
        result.Add(node.Val);
        if (node.Left is not null) stack.Push(node.Left);
        if (node.Right is not null) stack.Push(node.Right);
    }
    result.Reverse();
    return result;
}
```

### Example

`1(2,3)` → `[2,3,1]`

### Common Interview Questions

- When would you need postorder in practice?

### Common Mistakes

- Pushing children in the wrong order for the reverse trick.

## Maximum Depth of Binary Tree

### Problem Statement

Return the number of nodes along the longest root-to-leaf path.

### Explanation

Depth of a node = 1 + max(depth(left), depth(right)).

### Approach

- Recursive DFS; base case null → 0.

### Time Complexity

O(n)

### Space Complexity

O(h)

### C# Implementation

```csharp
public sealed class TreeNode(int val, TreeNode? left = null, TreeNode? right = null)
{
    public int Val = val;
    public TreeNode? Left = left, Right = right;
}


public static int MaxDepth(TreeNode? root) =>
    root is null ? 0 : 1 + Math.Max(MaxDepth(root.Left), MaxDepth(root.Right));
```

### Example

`3(9,20(15,7))` → `3`

### Common Interview Questions

- Check if a tree is balanced?
- Diameter of a tree?

### Common Mistakes

- Counting edges instead of nodes (clarify the definition).

## Validate Binary Search Tree

### Problem Statement

Determine whether a binary tree is a valid BST.

### Explanation

Every node must lie within a (min, max) range inherited from its ancestors — checking only direct children is not enough.

### Approach

- Recurse with bounds; use `long` or nullable bounds to handle `int.MinValue/MaxValue`.

### Time Complexity

O(n)

### Space Complexity

O(h)

### C# Implementation

```csharp
public sealed class TreeNode(int val, TreeNode? left = null, TreeNode? right = null)
{
    public int Val = val;
    public TreeNode? Left = left, Right = right;
}


public static bool IsValidBst(TreeNode? root) => Check(root, null, null);

private static bool Check(TreeNode? node, int? min, int? max)
{
    if (node is null) return true;
    if (min is not null && node.Val <= min) return false;
    if (max is not null && node.Val >= max) return false;
    return Check(node.Left, min, node.Val) && Check(node.Right, node.Val, max);
}
```

### Example

`5(1,4(3,6))` → `false` (3 is in the right subtree of 5)

### Common Interview Questions

- Validate using inorder traversal?
- Duplicates allowed?

### Common Mistakes

- Only comparing a node with its immediate children.

## Lowest Common Ancestor (BST)

### Problem Statement

Find the lowest common ancestor of two nodes in a BST.

### Explanation

In a BST, the LCA is the first node whose value lies between p and q.

### Approach

- Walk from root: go left if both smaller, right if both larger, otherwise current is the LCA.

### Time Complexity

O(h)

### Space Complexity

O(1)

### C# Implementation

```csharp
public sealed class TreeNode(int val, TreeNode? left = null, TreeNode? right = null)
{
    public int Val = val;
    public TreeNode? Left = left, Right = right;
}


public static TreeNode? Lca(TreeNode? root, int p, int q)
{
    var node = root;
    while (node is not null)
    {
        if (p < node.Val && q < node.Val) node = node.Left;
        else if (p > node.Val && q > node.Val) node = node.Right;
        else return node;
    }
    return null;
}
```

### Example

BST `6(2(0,4),8(7,9))`, p=2, q=8 → `6`

### Common Interview Questions

- LCA in a general binary tree (recursive)?

### Common Mistakes

- Using the general-tree algorithm and ignoring BST ordering.

# Category: Graphs

## Breadth-First Search (Graph)

### Problem Statement

Traverse a graph from a start node level by level.

### Explanation

BFS finds the shortest path (fewest edges) in an unweighted graph. A visited set prevents revisiting nodes in cycles.

### Approach

- Queue + `HashSet` visited; mark visited when enqueuing.

### Time Complexity

O(V + E)

### Space Complexity

O(V)

### C# Implementation

```csharp
public static List<int> Bfs(Dictionary<int, List<int>> graph, int start)
{
    var order = new List<int>();
    var visited = new HashSet<int> { start };
    var queue = new Queue<int>([start]);
    while (queue.TryDequeue(out var node))
    {
        order.Add(node);
        foreach (var next in graph.GetValueOrDefault(node, []))
            if (visited.Add(next)) queue.Enqueue(next);
    }
    return order;
}
```

### Example

`0:[1,2], 1:[3], 2:[3]` from 0 → `0,1,2,3`

### Common Interview Questions

- Shortest path in a grid?
- Multi-source BFS (rotting oranges)?

### Common Mistakes

- Marking visited on dequeue (nodes enqueued multiple times).

## Depth-First Search (Graph)

### Problem Statement

Traverse a graph depth-first from a start node.

### Explanation

DFS is the basis of cycle detection, topological sort, connected components and path finding.

### Approach

- Explicit stack to avoid recursion depth limits.

### Time Complexity

O(V + E)

### Space Complexity

O(V)

### C# Implementation

```csharp
public static List<int> Dfs(Dictionary<int, List<int>> graph, int start)
{
    var order = new List<int>();
    var visited = new HashSet<int>();
    var stack = new Stack<int>([start]);
    while (stack.TryPop(out var node))
    {
        if (!visited.Add(node)) continue;
        order.Add(node);
        var neighbours = graph.GetValueOrDefault(node, []);
        for (var i = neighbours.Count - 1; i >= 0; i--)
            if (!visited.Contains(neighbours[i])) stack.Push(neighbours[i]);
    }
    return order;
}
```

### Example

`0:[1,2], 1:[3], 2:[3]` from 0 → `0,1,3,2`

### Common Interview Questions

- Number of islands?
- Count connected components?

### Common Mistakes

- Forgetting the visited set on cyclic graphs (infinite loop).

## Detect Cycle in a Directed Graph

### Problem Statement

Determine whether a directed graph contains a cycle.

### Explanation

Three-colour DFS: white (unvisited), grey (on current path), black (done). Reaching a grey node means a back edge → cycle.

### Approach

- DFS each unvisited node tracking state.

### Time Complexity

O(V + E)

### Space Complexity

O(V)

### C# Implementation

```csharp
public static bool HasCycle(int n, IReadOnlyList<(int From, int To)> edges)
{
    var adj = Enumerable.Range(0, n).Select(_ => new List<int>()).ToArray();
    foreach (var (f, t) in edges) adj[f].Add(t);
    var state = new byte[n]; // 0 = white, 1 = grey, 2 = black

    bool Visit(int u)
    {
        state[u] = 1;
        foreach (var v in adj[u])
        {
            if (state[v] == 1) return true;
            if (state[v] == 0 && Visit(v)) return true;
        }
        state[u] = 2;
        return false;
    }

    for (var i = 0; i < n; i++)
        if (state[i] == 0 && Visit(i)) return true;
    return false;
}
```

### Example

Edges `0→1, 1→2, 2→0` → `true`

### Common Interview Questions

- Undirected graph version (parent tracking or union-find)?
- Course schedule problem?

### Common Mistakes

- Using a single visited set for directed graphs (reports false cycles).

## Topological Sort (Kahn's Algorithm)

### Problem Statement

Order the nodes of a DAG so every edge goes from earlier to later.

### Explanation

Repeatedly remove nodes with in-degree 0. If not all nodes are removed, the graph has a cycle.

### Approach

- Compute in-degrees, queue all zero in-degree nodes, decrement neighbours.

### Time Complexity

O(V + E)

### Space Complexity

O(V + E)

### C# Implementation

```csharp
public static List<int>? TopologicalSort(int n, IReadOnlyList<(int From, int To)> edges)
{
    var adj = Enumerable.Range(0, n).Select(_ => new List<int>()).ToArray();
    var indegree = new int[n];
    foreach (var (f, t) in edges) { adj[f].Add(t); indegree[t]++; }

    var queue = new Queue<int>(Enumerable.Range(0, n).Where(i => indegree[i] == 0));
    var order = new List<int>(n);
    while (queue.TryDequeue(out var u))
    {
        order.Add(u);
        foreach (var v in adj[u])
            if (--indegree[v] == 0) queue.Enqueue(v);
    }
    return order.Count == n ? order : null; // null => cycle
}
```

### Example

Edges `5→2, 5→0, 4→0, 4→1, 2→3, 3→1` → e.g. `4,5,2,0,3,1`

### Common Interview Questions

- Build order / dependency resolution in a build system?
- DFS-based topological sort?

### Common Mistakes

- Not detecting cycles (returning a partial order).

## Shortest Path (Dijkstra)

### Problem Statement

Find the shortest distances from a source to all nodes in a graph with non-negative edge weights.

### Explanation

Always expand the closest unsettled node. `PriorityQueue<TElement,TPriority>` (built into .NET 6+) provides the min-heap.

### Approach

- `dist[source] = 0`; push `(source, 0)`.
- Pop the minimum; skip stale entries; relax edges.

### Time Complexity

O((V + E) log V)

### Space Complexity

O(V + E)

### C# Implementation

```csharp
public static long[] Dijkstra(int n, IReadOnlyList<(int From, int To, int Weight)> edges, int source)
{
    var adj = Enumerable.Range(0, n).Select(_ => new List<(int To, int W)>()).ToArray();
    foreach (var (f, t, w) in edges) adj[f].Add((t, w));

    var dist = Enumerable.Repeat(long.MaxValue, n).ToArray();
    dist[source] = 0;
    var pq = new PriorityQueue<int, long>();
    pq.Enqueue(source, 0);

    while (pq.TryDequeue(out var u, out var d))
    {
        if (d > dist[u]) continue; // stale entry
        foreach (var (v, w) in adj[u])
        {
            var nd = d + w;
            if (nd < dist[v]) { dist[v] = nd; pq.Enqueue(v, nd); }
        }
    }
    return dist;
}
```

### Example

Edges `0→1 (4), 0→2 (1), 2→1 (2)` from 0 → `[0, 3, 1]`

### Common Interview Questions

- Negative weights? (Bellman-Ford)
- Reconstruct the path (store predecessors)?
- Unweighted graph? (BFS)

### Common Mistakes

- Using Dijkstra with negative weights.
- Not skipping stale heap entries.

# Category: Searching

## Linear Search

### Problem Statement

Find the index of a value in an unsorted collection.

### Explanation

Check each element in turn. Simple and optimal when data is unsorted and searched once.

### Approach

- Iterate and compare; return -1 when not found.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static int LinearSearch<T>(IReadOnlyList<T> items, T target) where T : IEquatable<T>
{
    for (var i = 0; i < items.Count; i++)
        if (items[i].Equals(target)) return i;
    return -1;
}
// Built-in: Array.IndexOf(array, target) / list.IndexOf(target)
```

### Example

`[4, 2, 9], 9` → `2`

### Common Interview Questions

- When is linear search better than sorting + binary search?

### Common Mistakes

- Using `==` on generic `T` (not allowed without constraints).

## Binary Search

### Problem Statement

Find a target in a sorted array in logarithmic time.

### Explanation

Halve the search space each step by comparing with the middle element.

### Approach

- `lo = 0, hi = n - 1`; `mid = lo + (hi - lo) / 2` to avoid overflow.

### Time Complexity

O(log n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static int BinarySearch(int[] nums, int target)
{
    int lo = 0, hi = nums.Length - 1;
    while (lo <= hi)
    {
        var mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
// Built-in: Array.BinarySearch returns the bitwise complement of the insertion point when not found.
```

### Example

`[-1,0,3,5,9,12], 9` → `4`

### Common Interview Questions

- What does `Array.BinarySearch` return when not found?
- Recursive version?

### Common Mistakes

- `(lo + hi) / 2` overflow.
- Infinite loops from `lo = mid` instead of `mid + 1`.

## Binary Search Variations (First/Last Occurrence, Rotated Array)

### Problem Statement

Find the first and last positions of a target in a sorted array with duplicates; search in a rotated sorted array.

### Explanation

Lower-bound search keeps moving left even after a match. For rotated arrays one half is always sorted — check whether the target lies in it.

### Approach

- `LowerBound`: first index with value ≥ target.
- Last occurrence = `LowerBound(target + 1) - 1`.
- Rotated: compare `nums[lo]` with `nums[mid]` to find the sorted half.

### Time Complexity

O(log n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static int LowerBound(int[] nums, int target)
{
    int lo = 0, hi = nums.Length;
    while (lo < hi)
    {
        var mid = lo + (hi - lo) / 2;
        if (nums[mid] < target) lo = mid + 1; else hi = mid;
    }
    return lo;
}

public static (int First, int Last) SearchRange(int[] nums, int target)
{
    var first = LowerBound(nums, target);
    if (first == nums.Length || nums[first] != target) return (-1, -1);
    return (first, LowerBound(nums, target + 1) - 1);
}

public static int SearchRotated(int[] nums, int target)
{
    int lo = 0, hi = nums.Length - 1;
    while (lo <= hi)
    {
        var mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid])
        {
            if (target >= nums[lo] && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
        }
        else
        {
            if (target > nums[mid] && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
        }
    }
    return -1;
}
```

### Example

`[5,7,7,8,8,10], 8` → `(3,4)`; rotated `[4,5,6,7,0,1,2], 0` → `4`

### Common Interview Questions

- Find the minimum in a rotated array?
- Binary search on the answer (e.g. minimum capacity to ship packages)?

### Common Mistakes

- Mixing inclusive/exclusive `hi` conventions.

# Category: Sorting

## Bubble Sort

### Problem Statement

Sort an array by repeatedly swapping adjacent out-of-order elements.

### Explanation

After each pass the largest remaining element 'bubbles' to the end. An early-exit flag makes it O(n) on sorted input.

### Approach

- Outer loop over passes; inner loop compares neighbours; stop when no swaps happen.

### Time Complexity

O(n²) worst/average, O(n) best

### Space Complexity

O(1)

### C# Implementation

```csharp
public static void BubbleSort(int[] a)
{
    for (var end = a.Length - 1; end > 0; end--)
    {
        var swapped = false;
        for (var i = 0; i < end; i++)
            if (a[i] > a[i + 1]) { (a[i], a[i + 1]) = (a[i + 1], a[i]); swapped = true; }
        if (!swapped) return;
    }
}
```

### Example

`[5,1,4,2,8]` → `[1,2,4,5,8]`

### Common Interview Questions

- Is bubble sort stable? (yes)
- Why is it rarely used in practice?

### Common Mistakes

- Missing the early exit.
- Off-by-one in the inner loop bound.

## Selection Sort

### Problem Statement

Sort by repeatedly selecting the minimum of the unsorted part.

### Explanation

Performs at most n swaps, which can matter when writes are expensive. Not stable.

### Approach

- For each position i, find the minimum in `[i..n)` and swap it into i.

### Time Complexity

O(n²)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static void SelectionSort(int[] a)
{
    for (var i = 0; i < a.Length - 1; i++)
    {
        var min = i;
        for (var j = i + 1; j < a.Length; j++)
            if (a[j] < a[min]) min = j;
        if (min != i) (a[i], a[min]) = (a[min], a[i]);
    }
}
```

### Example

`[64,25,12,22,11]` → `[11,12,22,25,64]`

### Common Interview Questions

- Why is selection sort not stable?

### Common Mistakes

- Swapping inside the inner loop (turns it into a worse bubble sort).

## Insertion Sort

### Problem Statement

Sort by inserting each element into its place in the already-sorted prefix.

### Explanation

Very fast for small or nearly sorted arrays — .NET's introsort switches to insertion sort for small partitions.

### Approach

- Shift larger elements right, then drop the key into the gap.

### Time Complexity

O(n²) worst, O(n) best

### Space Complexity

O(1)

### C# Implementation

```csharp
public static void InsertionSort(int[] a)
{
    for (var i = 1; i < a.Length; i++)
    {
        var key = a[i];
        var j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}
```

### Example

`[12,11,13,5,6]` → `[5,6,11,12,13]`

### Common Interview Questions

- Why does introsort use insertion sort for small ranges?

### Common Mistakes

- Using `>=` and breaking stability.

## Merge Sort

### Problem Statement

Sort using divide and conquer: split, sort halves, merge.

### Explanation

Guaranteed O(n log n) and stable; needs O(n) extra space. Good for linked lists and external sorting.

### Approach

- Recursively sort halves into a shared buffer, then merge.

### Time Complexity

O(n log n)

### Space Complexity

O(n)

### C# Implementation

```csharp
public static void MergeSort(int[] a)
{
    var buffer = new int[a.Length];
    Sort(a, buffer, 0, a.Length - 1);
}

private static void Sort(int[] a, int[] buf, int lo, int hi)
{
    if (lo >= hi) return;
    var mid = lo + (hi - lo) / 2;
    Sort(a, buf, lo, mid);
    Sort(a, buf, mid + 1, hi);
    if (a[mid] <= a[mid + 1]) return; // already ordered
    int i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) buf[k++] = a[i] <= a[j] ? a[i++] : a[j++];
    while (i <= mid) buf[k++] = a[i++];
    while (j <= hi) buf[k++] = a[j++];
    Array.Copy(buf, lo, a, lo, hi - lo + 1);
}
```

### Example

`[38,27,43,3,9,82,10]` → `[3,9,10,27,38,43,82]`

### Common Interview Questions

- Count inversions using merge sort?
- Sort a linked list in O(n log n)?

### Common Mistakes

- Allocating new arrays on every recursion.
- Using `<` instead of `<=` in merge (loses stability).

## Quick Sort

### Problem Statement

Sort by partitioning around a pivot and recursively sorting the partitions.

### Explanation

Average O(n log n), in place, cache friendly, but O(n²) worst case with bad pivots. `Array.Sort` uses introsort (quick sort + heap sort fallback + insertion sort).

### Approach

- Lomuto partition with a random pivot.
- Recurse into the smaller side first to bound stack depth.

### Time Complexity

O(n log n) average, O(n²) worst

### Space Complexity

O(log n) stack

### C# Implementation

```csharp
public static void QuickSort(int[] a) => QuickSort(a, 0, a.Length - 1);

private static void QuickSort(int[] a, int lo, int hi)
{
    while (lo < hi)
    {
        var p = Partition(a, lo, hi);
        if (p - lo < hi - p) { QuickSort(a, lo, p - 1); lo = p + 1; }
        else { QuickSort(a, p + 1, hi); hi = p - 1; }
    }
}

private static int Partition(int[] a, int lo, int hi)
{
    var r = Random.Shared.Next(lo, hi + 1);
    (a[r], a[hi]) = (a[hi], a[r]);
    var pivot = a[hi];
    var i = lo;
    for (var j = lo; j < hi; j++)
        if (a[j] < pivot) { (a[i], a[j]) = (a[j], a[i]); i++; }
    (a[i], a[hi]) = (a[hi], a[i]);
    return i;
}
```

### Example

`[10,7,8,9,1,5]` → `[1,5,7,8,9,10]`

### Common Interview Questions

- Quickselect for the k-th largest element?
- How does .NET's `Array.Sort` avoid the worst case?

### Common Mistakes

- Always choosing the first element as pivot (sorted input → O(n²)).
- Not handling many duplicates (consider 3-way partition).

## Heap Sort

### Problem Statement

Sort by building a max-heap and repeatedly extracting the maximum.

### Explanation

O(n log n) worst case and in place, but not stable and less cache friendly than quick sort.

### Approach

- Build heap bottom-up from `n/2 - 1`.
- Swap root with the last element and sift down.

### Time Complexity

O(n log n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static void HeapSort(int[] a)
{
    var n = a.Length;
    for (var i = n / 2 - 1; i >= 0; i--) SiftDown(a, i, n);
    for (var end = n - 1; end > 0; end--)
    {
        (a[0], a[end]) = (a[end], a[0]);
        SiftDown(a, 0, end);
    }
}

private static void SiftDown(int[] a, int i, int size)
{
    while (true)
    {
        int largest = i, l = 2 * i + 1, r = l + 1;
        if (l < size && a[l] > a[largest]) largest = l;
        if (r < size && a[r] > a[largest]) largest = r;
        if (largest == i) return;
        (a[i], a[largest]) = (a[largest], a[i]);
        i = largest;
    }
}
```

### Example

`[12,11,13,5,6,7]` → `[5,6,7,11,12,13]`

### Common Interview Questions

- Why is heap construction O(n)?
- Top-k elements using `PriorityQueue`?

### Common Mistakes

- Sifting with the full array length instead of the shrinking heap size.

# Category: Dynamic Programming

## Climbing Stairs (Fibonacci)

### Problem Statement

You can climb 1 or 2 steps at a time. How many distinct ways are there to reach step n?

### Explanation

ways(n) = ways(n-1) + ways(n-2): the classic introduction to overlapping subproblems.

### Approach

- Bottom-up with two rolling variables.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static long ClimbStairs(int n)
{
    if (n <= 1) return 1;
    long prev = 1, curr = 1;
    for (var i = 2; i <= n; i++) (prev, curr) = (curr, prev + curr);
    return curr;
}
```

### Example

`n = 5` → `8`

### Common Interview Questions

- Steps of 1, 2 or 3?
- Naive recursion complexity? (O(2^n))

### Common Mistakes

- Pure recursion without memoisation.
- `int` overflow for larger n.

## Coin Change (Minimum Coins)

### Problem Statement

Return the fewest coins needed to make an amount, or -1 if impossible.

### Explanation

Unbounded knapsack: `dp[a] = min(dp[a - coin] + 1)` over all coins.

### Approach

- `dp[0] = 0`, others = amount + 1 (acts as infinity).

### Time Complexity

O(amount × coins)

### Space Complexity

O(amount)

### C# Implementation

```csharp
public static int CoinChange(int[] coins, int amount)
{
    var dp = new int[amount + 1];
    Array.Fill(dp, amount + 1);
    dp[0] = 0;
    for (var a = 1; a <= amount; a++)
        foreach (var c in coins)
            if (c <= a) dp[a] = Math.Min(dp[a], dp[a - c] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}
```

### Example

`coins = [1,2,5], amount = 11` → `3` (5+5+1)

### Common Interview Questions

- Number of combinations instead of minimum?
- Why is greedy wrong for `[1,3,4]`, amount 6?

### Common Mistakes

- Using greedy selection.
- Using `int.MaxValue` as infinity and overflowing on `+ 1`.

## Longest Common Subsequence

### Problem Statement

Return the length of the longest subsequence common to two strings.

### Explanation

`dp[i][j]` = LCS of prefixes. If characters match, extend the diagonal; otherwise take the best of dropping one character.

### Approach

- 2D table of size (m+1)×(n+1); can be reduced to two rows.

### Time Complexity

O(m × n)

### Space Complexity

O(m × n), O(n) optimised

### C# Implementation

```csharp
public static int Lcs(string a, string b)
{
    var dp = new int[a.Length + 1, b.Length + 1];
    for (var i = 1; i <= a.Length; i++)
        for (var j = 1; j <= b.Length; j++)
            dp[i, j] = a[i - 1] == b[j - 1]
                ? dp[i - 1, j - 1] + 1
                : Math.Max(dp[i - 1, j], dp[i, j - 1]);
    return dp[a.Length, b.Length];
}
```

### Example

`"abcde", "ace"` → `3`

### Common Interview Questions

- Edit distance (Levenshtein)?
- Reconstruct the subsequence itself?

### Common Mistakes

- Confusing subsequence with substring.

## House Robber

### Problem Statement

Maximise the sum of non-adjacent elements.

### Explanation

At each house: rob it (previous-but-one best + value) or skip it (previous best).

### Approach

- Two rolling variables.

### Time Complexity

O(n)

### Space Complexity

O(1)

### C# Implementation

```csharp
public static int Rob(int[] nums)
{
    int prev = 0, curr = 0;
    foreach (var x in nums) (prev, curr) = (curr, Math.Max(curr, prev + x));
    return curr;
}
```

### Example

`[2,7,9,3,1]` → `12`

### Common Interview Questions

- Houses arranged in a circle?

### Common Mistakes

- Greedy picking of largest values.

## 0/1 Knapsack

### Problem Statement

Given item weights and values and a capacity, maximise total value without exceeding capacity; each item used at most once.

### Explanation

`dp[w]` = best value for capacity w. Iterate capacity downwards so each item is used once.

### Approach

- For each item, for w from capacity down to weight: `dp[w] = max(dp[w], dp[w - weight] + value)`.

### Time Complexity

O(n × W)

### Space Complexity

O(W)

### C# Implementation

```csharp
public static int Knapsack(int[] weights, int[] values, int capacity)
{
    var dp = new int[capacity + 1];
    for (var i = 0; i < weights.Length; i++)
        for (var w = capacity; w >= weights[i]; w--)
            dp[w] = Math.Max(dp[w], dp[w - weights[i]] + values[i]);
    return dp[capacity];
}
```

### Example

weights `[1,3,4,5]`, values `[1,4,5,7]`, capacity 7 → `9`

### Common Interview Questions

- Why iterate capacity backwards?
- Unbounded knapsack difference?

### Common Mistakes

- Iterating capacity upwards (accidentally allows reusing items).

## Longest Increasing Subsequence

### Problem Statement

Return the length of the longest strictly increasing subsequence.

### Explanation

Patience sorting: maintain `tails[k]` = smallest tail of an increasing subsequence of length k+1; binary search the position for each number.

### Approach

- For each x, replace the first tail ≥ x, or append.

### Time Complexity

O(n log n)

### Space Complexity

O(n)

### C# Implementation

```csharp
public static int LengthOfLis(int[] nums)
{
    var tails = new List<int>();
    foreach (var x in nums)
    {
        var i = tails.BinarySearch(x);
        if (i < 0) i = ~i;
        if (i == tails.Count) tails.Add(x); else tails[i] = x;
    }
    return tails.Count;
}
```

### Example

`[10,9,2,5,3,7,101,18]` → `4`

### Common Interview Questions

- O(n²) DP version?
- Reconstruct the actual subsequence?

### Common Mistakes

- Assuming `tails` is the actual subsequence (it is not).
