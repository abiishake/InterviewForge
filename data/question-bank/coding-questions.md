# TOPIC --- String Manipulation

**topic_id:** `coding-strings`\
**priority:** `Core`\
**category:** `Coding`

## coding-strings-001 --- Minimum Replacements to Eliminate Adjacent Equal Characters

**question_id:** `coding-strings-001`\
**topic_id:** `coding-strings`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Minimum Replacements to Eliminate Adjacent Equal Characters" in C#?

**Answer**

**Problem.** Given a string `s`, replace as few characters as possible (each with any other letter) so that no two adjacent characters are equal. Return the number of replacements.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** A run of `k` equal characters needs `k / 2` replacements: change every second character of the run to a letter that differs from both neighbours. Count runs in one pass.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int MinReplacements(string s)
{
    var count = 0;
    for (var i = 0; i < s.Length;)
    {
        var j = i;
        while (j < s.Length && s[j] == s[i]) j++;   // end of the run
        count += (j - i) / 2;
        i = j;
    }
    return count;
}
```

**Worked example.** `"aaab"` → `1` (e.g. `abab`); `"aaaa"` → `2`; `"abab"` → `0`.

**Keywords:** `string, greedy, c#, interview`

**Follow-ups:**

-   How would you also return the modified string?
-   What changes if the replacement alphabet is limited to two letters?

## coding-strings-002 --- Minimum Replacements to Avoid Equal Adjacent Characters

**question_id:** `coding-strings-002`\
**topic_id:** `coding-strings`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Minimum Replacements to Avoid Equal Adjacent Characters" in C#?

**Answer**

**Problem.** Same goal as question 1, but also return a valid resulting string using lowercase letters.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Scan left to right. When `s[i] == s[i-1]`, replace `s[i]` with the first letter that differs from the previous character **and** the next one — that also stops the new character colliding with `s[i+1]`, so the run is fixed greedily with the minimum count.

**Complexity.** Time O(n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static (int Count, string Result) AvoidEqualAdjacent(string s)
{
    var chars = s.ToCharArray();
    var count = 0;
    for (var i = 1; i < chars.Length; i++)
    {
        if (chars[i] != chars[i - 1]) continue;
        var next = i + 1 < chars.Length ? chars[i + 1] : '\0';
        var replacement = 'a';
        while (replacement == chars[i - 1] || replacement == next) replacement++;
        chars[i] = replacement;
        count++;
    }
    return (count, new string(chars));
}
```

**Worked example.** `"aaab"` → `(1, "abab")`; `"aab"` → `(1, "acb")`.

**Keywords:** `string, greedy, c#, interview`

**Follow-ups:**

-   Why must the replacement differ from the next character too?
-   Can the greedy ever use more replacements than necessary?

## coding-strings-003 --- Minimum Deletions to Eliminate Adjacent Equal Characters

**question_id:** `coding-strings-003`\
**topic_id:** `coding-strings`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Minimum Deletions to Eliminate Adjacent Equal Characters" in C#?

**Answer**

**Problem.** Delete as few characters as possible from `s` so that no two adjacent characters are equal. Return the number of deletions.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** In each run of `k` equal characters keep one and delete `k - 1`. That is simply the number of positions where `s[i] == s[i-1]`.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int MinDeletions(string s)
{
    var deletions = 0;
    for (var i = 1; i < s.Length; i++)
        if (s[i] == s[i - 1]) deletions++;
    return deletions;
}
```

**Worked example.** `"aaabbb"` → `4` (result `"ab"`); `"abab"` → `0`.

**Keywords:** `string, greedy, c#, interview`

**Follow-ups:**

-   How does this differ from the replacement version (question 1)?
-   How would you return the resulting string in O(n)?

## coding-strings-004 --- Reverse Last Two Characters with a Space

**question_id:** `coding-strings-004`\
**topic_id:** `coding-strings`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Reverse Last Two Characters with a Space" in C#?

**Answer**

**Problem.** Assumed reading: swap the last two characters of the string and put a single space between them. Strings shorter than two characters are returned unchanged.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Use C# ranges: keep everything before the last two characters, then append the last character, a space and the second-to-last character. Check the real prompt — if it means "replace" or "reverse words", only this one expression changes.

**Complexity.** Time O(n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static string ReverseLastTwoWithSpace(string s)
{
    if (s.Length < 2) return s;
    return s[..^2] + s[^1] + " " + s[^2];
}
```

**Worked example.** `"hello"` → `"helo l"`.

**Keywords:** `string manipulation, c#, interview`

**Follow-ups:**

-   How would the code change if the string has fewer than two characters?
-   Would you use StringBuilder for repeated edits?

## coding-strings-005 --- Group Words by Character Frequency

**question_id:** `coding-strings-005`\
**topic_id:** `coding-strings`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Group Words by Character Frequency" in C#?

**Answer**

**Problem.** Group words that contain exactly the same letters with the same counts (anagrams). Words are lowercase `a–z`.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Build a canonical key from the 26 letter counts (cheaper than sorting each word) and group in a dictionary.

**Complexity.** Time O(total characters); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static List<List<string>> GroupByCharacterFrequency(IEnumerable<string> words)
{
    var groups = new Dictionary<string, List<string>>();
    foreach (var word in words)
    {
        var counts = new int[26];
        foreach (var ch in word) counts[ch - 'a']++;
        var key = string.Join(",", counts);

        if (!groups.TryGetValue(key, out var list))
            groups[key] = list = new List<string>();
        list.Add(word);
    }
    return groups.Values.ToList();
}
```

**Worked example.** `["eat","tea","tan","ate","nat","bat"]` → `[[eat,tea,ate],[tan,nat],[bat]]`.

**Keywords:** `string, hash map, c#, interview`

**Follow-ups:**

-   Why is a count signature cheaper than sorting each word?
-   How would you support Unicode characters?

## coding-strings-006 --- Return the Last Lexicographical Substring

**question_id:** `coding-strings-006`\
**topic_id:** `coding-strings`\
**difficulty:** `Senior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Return the Last Lexicographical Substring" in C#?

**Answer**

**Problem.** Among all substrings of `s`, return the one that is largest in lexicographic order.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** The answer is always a suffix. Compare two candidate suffixes starting at `i` and `j` with a running match length `k`; the loser (and the positions it covers) is skipped, so each index is visited a constant number of times.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static string LastSubstring(string s)
{
    int i = 0, j = 1, k = 0, n = s.Length;
    while (j + k < n)
    {
        if (s[i + k] == s[j + k]) { k++; continue; }
        if (s[i + k] < s[j + k]) { i = Math.Max(i + k + 1, j); j = i + 1; }
        else j += k + 1;
        k = 0;
    }
    return s[i..];
}
```

**Worked example.** `"abab"` → `"bab"`; `"leetcode"` → `"tcode"`.

**Keywords:** `string, two pointers, c#, interview`

**Follow-ups:**

-   Why is the answer always a suffix?
-   How would you prove the two-pointer skipping is safe?

## coding-strings-007 --- Find the Largest Subset of a String

**question_id:** `coding-strings-007`\
**topic_id:** `coding-strings`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Find the Largest Subset of a String" in C#?

**Answer**

**Problem.** Assumed reading: find the length of the longest substring whose characters are all distinct (the largest "set" you can read contiguously).

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Sliding window with a dictionary of each character's last index. When a character repeats inside the window, move `start` just past its previous position.

**Complexity.** Time O(n); space O(σ).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int LongestDistinctSubstring(string s)
{
    var lastSeen = new Dictionary<char, int>();
    int best = 0, start = 0;
    for (var i = 0; i < s.Length; i++)
    {
        if (lastSeen.TryGetValue(s[i], out var prev) && prev >= start)
            start = prev + 1;
        lastSeen[s[i]] = i;
        best = Math.Max(best, i - start + 1);
    }
    return best;
}
```

**Worked example.** `"abcabcbb"` → `3` (`"abc"`); `"bbbb"` → `1`.

**Keywords:** `string, set, c#, interview`

**Follow-ups:**

-   How does the answer change if the substring may skip characters (a true subset)?
-   What data structure replaces the dictionary for ASCII-only input?

## coding-strings-008 --- Get Final String

**question_id:** `coding-strings-008`\
**topic_id:** `coding-strings`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Get Final String" in C#?

**Answer**

**Problem.** Assumed reading (the "faulty keyboard" puzzle): type the characters of `s` one by one; typing `'i'` reverses everything typed so far instead of adding a character. Return the final text.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Reversing on every `i` would be O(n²). Instead keep a deque-like list and a `reversed` flag: when reversed, new characters go to the **front**; flip the flag on `i`. Reverse once at the end if the flag is set.

**Complexity.** Time O(n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static string GetFinalString(string s)
{
    var buffer = new LinkedList<char>();
    var reversed = false;
    foreach (var ch in s)
    {
        if (ch == 'i') { reversed = !reversed; continue; }
        if (reversed) buffer.AddFirst(ch);
        else buffer.AddLast(ch);
    }
    var chars = buffer.ToArray();
    if (reversed) Array.Reverse(chars);
    return new string(chars);
}
```

**Worked example.** `"string"` → `"rtsng"`; `"poiinter"` → `"ponter"`.

**Keywords:** `string, simulation, c#, interview`

**Follow-ups:**

-   Why is reversing on every i too slow?
-   Which collection gives O(1) adds at both ends?

# TOPIC --- Array Scans and Counting

**topic_id:** `coding-arrays`\
**priority:** `Core`\
**category:** `Coding`

## coding-arrays-001 --- Count strictly decreasing-by-1 subarrays of length at least 2

**question_id:** `coding-arrays-001`\
**topic_id:** `coding-arrays`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Count strictly decreasing-by-1 subarrays of length at least 2" in C#?

**Answer**

**Problem.** Count subarrays of length ≥ 2 in which every element is exactly 1 less than the previous one (e.g. `5, 4, 3`).

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Track `run`, the number of consecutive "drop by 1" steps ending at `i`. Every such step extends `run` subarrays that end at `i`, so add `run` to the answer. Reset `run` to 0 when the step is not −1.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static long CountDecreasingByOne(int[] a)
{
    long total = 0, run = 0;
    for (var i = 1; i < a.Length; i++)
    {
        run = (long)a[i - 1] - a[i] == 1 ? run + 1 : 0;
        total += run;
    }
    return total;
}
```

**Worked example.** `[5, 4, 3, 7, 6]` → `[5,4] [4,3] [5,4,3] [7,6]` = `4`.

**Keywords:** `array, counting, c#, interview`

**Follow-ups:**

-   How would you list the subarrays instead of counting them?
-   What if the step could be any fixed value k?

## coding-arrays-002 --- Get Minimum Increment

**question_id:** `coding-arrays-002`\
**topic_id:** `coding-arrays`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Get Minimum Increment" in C#?

**Answer**

**Problem.** Assumed reading: you may only add 1 to elements. Return the minimum total number of increments that makes the array strictly increasing.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Walk left to right keeping the previous (already fixed) value. If `a[i] <= prev`, raise it to `prev + 1` and add the difference; otherwise keep it. Raising as little as possible keeps later elements cheap.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static long GetMinimumIncrement(int[] a)
{
    if (a.Length == 0) return 0;
    long ops = 0, prev = a[0];
    for (var i = 1; i < a.Length; i++)
    {
        if (a[i] <= prev)
        {
            prev++;                  // smallest legal value
            ops += prev - a[i];
        }
        else prev = a[i];
    }
    return ops;
}
```

**Worked example.** `[1, 1, 1]` → `0 + 1 + 2 = 3`; `[1, 5, 2, 4, 1]` → `14`.

**Keywords:** `array, greedy, c#, interview`

**Follow-ups:**

-   How does the result change if equal neighbours are allowed (non-decreasing)?
-   Can a decrement also be allowed? What then?

## coding-arrays-003 --- Get Minimum Operations

**question_id:** `coding-arrays-003`\
**topic_id:** `coding-arrays`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Get Minimum Operations" in C#?

**Answer**

**Problem.** Assumed reading: one operation adds or subtracts 1 from a single element. Return the minimum operations to make all elements equal.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** The target that minimises the sum of absolute differences is the median. Sort, take the median, sum the distances.

**Complexity.** Time O(n log n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static long GetMinimumOperations(int[] a)
{
    if (a.Length == 0) return 0;
    var sorted = (int[])a.Clone();
    Array.Sort(sorted);
    long median = sorted[sorted.Length / 2];
    long ops = 0;
    foreach (var x in sorted) ops += Math.Abs(x - median);
    return ops;
}
```

**Worked example.** `[1, 10, 2, 9]` → target 9 or 2 → `16`; `[1, 2, 3]` → `2`.

**Keywords:** `array, greedy, c#, interview`

**Follow-ups:**

-   Why is the median optimal and not the mean?
-   How would you do it in O(n) on average?

## coding-arrays-004 --- Minimum Hits Needed

**question_id:** `coding-arrays-004`\
**topic_id:** `coding-arrays`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Minimum Hits Needed" in C#?

**Answer**

**Problem.** Assumed reading: each enemy has a health value and one hit removes `damage` health from one enemy. Return the minimum number of hits to defeat all of them.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Enemies are independent, so the answer is the sum of `ceil(health / damage)`. Use integer arithmetic `(h + d - 1) / d` in `long` to avoid overflow.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static long MinimumHits(int[] health, int damage)
{
    long hits = 0;
    foreach (var h in health)
        if (h > 0) hits += ((long)h + damage - 1) / damage;
    return hits;
}
```

**Worked example.** `health = [10, 4, 7]`, `damage = 3` → `4 + 2 + 3 = 9`.

**Keywords:** `greedy, math, c#, interview`

**Follow-ups:**

-   What if a hit can also splash damage to a neighbour?
-   How do you guard against integer overflow?

## coding-arrays-005 --- Maximum Increment to Make Array Ascending

**question_id:** `coding-arrays-005`\
**topic_id:** `coding-arrays`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Maximum Increment to Make Array Ascending" in C#?

**Answer**

**Problem.** Assumed reading: you may only increase elements. Make the array non-decreasing with the fewest total increments, and report both the total and the largest increment applied to any one element.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Keep the running maximum. Any element below it must be raised to exactly that maximum — no less (still not ascending) and no more (wasted). The largest single increment is the biggest gap `runningMax - a[i]`.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static (long Total, int MaxSingle) MakeAscending(int[] a)
{
    if (a.Length == 0) return (0, 0);
    long total = 0;
    var maxSingle = 0;
    var ceiling = a[0];
    for (var i = 1; i < a.Length; i++)
    {
        if (a[i] < ceiling)
        {
            var gap = ceiling - a[i];
            total += gap;
            maxSingle = Math.Max(maxSingle, gap);
        }
        else ceiling = a[i];
    }
    return (total, maxSingle);
}
```

**Worked example.** `[3, 1, 4, 1, 5]` → total `2 + 3 = 5`, max single `3`.

**Keywords:** `array, greedy, c#, interview`

**Follow-ups:**

-   Why raise an element to exactly the running maximum and no higher?
-   How would you report which elements were changed?

## coding-arrays-006 --- Find Length of Longest Bitonic Subarray

**question_id:** `coding-arrays-006`\
**topic_id:** `coding-arrays`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Find Length of Longest Bitonic Subarray" in C#?

**Answer**

**Problem.** A bitonic subarray strictly increases and then strictly decreases (either part may be a single element). Return the length of the longest one.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Precompute `inc[i]` = length of the strictly increasing run ending at `i`, and `dec[i]` = length of the strictly decreasing run starting at `i`. The best bitonic subarray peaking at `i` has length `inc[i] + dec[i] - 1`.

**Complexity.** Time O(n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int LongestBitonicSubarray(int[] a)
{
    var n = a.Length;
    if (n == 0) return 0;
    var inc = new int[n];
    var dec = new int[n];
    Array.Fill(inc, 1);
    Array.Fill(dec, 1);

    for (var i = 1; i < n; i++)
        if (a[i] > a[i - 1]) inc[i] = inc[i - 1] + 1;
    for (var i = n - 2; i >= 0; i--)
        if (a[i] > a[i + 1]) dec[i] = dec[i + 1] + 1;

    var best = 1;
    for (var i = 0; i < n; i++)
        best = Math.Max(best, inc[i] + dec[i] - 1);
    return best;
}
```

**Worked example.** `[1, 3, 5, 4, 2, 6]` → `[1,3,5,4,2]` = `5`.

**Keywords:** `array, dynamic programming, c#, interview`

**Follow-ups:**

-   Can you solve it in O(1) extra space?
-   How does this differ from the longest increasing subsequence?

## coding-arrays-007 --- Merge 2 Arrays

**question_id:** `coding-arrays-007`\
**topic_id:** `coding-arrays`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Merge 2 Arrays" in C#?

**Answer**

**Problem.** Merge two sorted arrays into a single sorted array.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Two pointers, always copying the smaller head; then drain whichever array remains. Using `<=` keeps the merge stable.

**Complexity.** Time O(n + m); space O(n + m).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int[] MergeSorted(int[] a, int[] b)
{
    var result = new int[a.Length + b.Length];
    int i = 0, j = 0, k = 0;
    while (i < a.Length && j < b.Length)
        result[k++] = a[i] <= b[j] ? a[i++] : b[j++];
    while (i < a.Length) result[k++] = a[i++];
    while (j < b.Length) result[k++] = b[j++];
    return result;
}
```

**Worked example.** `[1, 4, 7]` + `[2, 3, 9]` → `[1, 2, 3, 4, 7, 9]`.

**Keywords:** `array, merge, c#, interview`

**Follow-ups:**

-   How would you merge in place when the first array has spare capacity?
-   How would you merge k sorted arrays?

## coding-arrays-008 --- Find Missing Integer

**question_id:** `coding-arrays-008`\
**topic_id:** `coding-arrays`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Find Missing Integer" in C#?

**Answer**

**Problem.** Return the smallest positive integer that is missing from an unsorted array. This also covers the classic "one number missing from 1..n" version.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Cyclic placement: swap each value `v` in `1..n` into index `v - 1`. A second pass finds the first index where `nums[i] != i + 1`. (For the single-missing version `n(n+1)/2 − sum` also works.) Note: it mutates the input — copy first if needed.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int FirstMissingPositive(int[] nums)
{
    var n = nums.Length;
    for (var i = 0; i < n; i++)
    {
        while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] != nums[i])
        {
            var target = nums[i] - 1;
            (nums[i], nums[target]) = (nums[target], nums[i]);
        }
    }
    for (var i = 0; i < n; i++)
        if (nums[i] != i + 1) return i + 1;
    return n + 1;
}
```

**Worked example.** `[3, 4, -1, 1]` → `2`; `[1, 2, 3]` → `4`.

**Keywords:** `array, math, c#, interview`

**Follow-ups:**

-   What if the input may not be modified?
-   How does the sum-formula version fail on duplicates?

## coding-arrays-009 --- Find Non-Repeated Elements

**question_id:** `coding-arrays-009`\
**topic_id:** `coding-arrays`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Find Non-Repeated Elements" in C#?

**Answer**

**Problem.** Return the elements that appear exactly once in the array, in their original order.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** One pass builds a frequency map; a second pass keeps elements whose count is 1, which preserves input order.

**Complexity.** Time O(n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static List<int> NonRepeated(int[] a)
{
    var counts = new Dictionary<int, int>();
    foreach (var x in a) counts[x] = counts.GetValueOrDefault(x) + 1;
    return a.Where(x => counts[x] == 1).ToList();
}
```

**Worked example.** `[4, 3, 2, 4, 1, 3]` → `[2, 1]`.

**Keywords:** `array, hash set, c#, interview`

**Follow-ups:**

-   How would you do it with O(1) extra space on sorted input?
-   What if elements are objects instead of integers?

## coding-arrays-010 --- Get Query Answers

**question_id:** `coding-arrays-010`\
**topic_id:** `coding-arrays`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Get Query Answers" in C#?

**Answer**

**Problem.** Assumed reading: given an array and queries `[l, r]` (inclusive, 0-based), return the sum of `a[l..r]` for each query.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Build a prefix-sum array once; each query is then `prefix[r + 1] - prefix[l]` in O(1). If the array also changes between queries, switch to a Fenwick tree.

**Complexity.** Time O(n + q); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static long[] GetQueryAnswers(int[] a, int[][] queries)
{
    var prefix = new long[a.Length + 1];
    for (var i = 0; i < a.Length; i++) prefix[i + 1] = prefix[i] + a[i];
    return queries.Select(q => prefix[q[1] + 1] - prefix[q[0]]).ToArray();
}
```

**Worked example.** `a = [1, 2, 3, 4]`, queries `[[0,1],[1,3]]` → `[3, 9]`.

**Keywords:** `queries, data structures, c#, interview`

**Follow-ups:**

-   How would you support updates between queries (Fenwick tree)?
-   How do you avoid overflow in the prefix sums?

# TOPIC --- Greedy and Heap Problems

**topic_id:** `coding-greedy`\
**priority:** `Core`\
**category:** `Coding`

## coding-greedy-001 --- Maximum Revenue from Renting Highest-Stock VMs

**question_id:** `coding-greedy-001`\
**topic_id:** `coding-greedy`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Maximum Revenue from Renting Highest-Stock VMs" in C#?

**Answer**

**Problem.** There are several VM types; `stock[i]` is the number of units of type `i`. Each of `customers` renters takes the type with the highest remaining stock and pays a price equal to that stock, then the stock drops by one. Return the maximum total revenue.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Greedy: always rent from the largest stock. Use a max-heap — pop the largest, add it to revenue, push back `stock - 1` if still positive. C# `PriorityQueue` is a min-heap, so negate the priority.

**Complexity.** Time O(m log n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static long MaxRevenue(IEnumerable<int> stock, int customers)
{
    var heap = new PriorityQueue<int, int>();
    foreach (var s in stock)
        if (s > 0) heap.Enqueue(s, -s);          // negate: max-heap

    long revenue = 0;
    while (customers-- > 0 && heap.TryDequeue(out var top, out _))
    {
        revenue += top;
        if (top > 1) heap.Enqueue(top - 1, -(top - 1));
    }
    return revenue;
}
```

**Worked example.** `stock = [5, 3]`, `customers = 3` → `5 + 4 + 3 = 12`.

**Keywords:** `heap, greedy, c#, interview`

**Follow-ups:**

-   Why does a plain max-heap solution time out for very large customer counts?
-   How do you avoid overflow in the revenue total?

## coding-greedy-002 --- Maximum Revenue from VM Rentals

**question_id:** `coding-greedy-002`\
**topic_id:** `coding-greedy`\
**difficulty:** `Senior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Maximum Revenue from VM Rentals" in C#?

**Answer**

**Problem.** Same pricing rule as question 2, but the number of customers can be huge (up to ~10^9), so a one-customer-at-a-time heap is too slow. Return the maximum revenue.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Sort stocks descending. Process the "layers" between consecutive distinct heights at once: with `width` types at the top height, dropping all of them from `high` to `low` sells `width * (high - low)` units whose total price is an arithmetic series. If customers run out mid-layer, sell whole levels, then the remainder at the next price.

**Complexity.** Time O(n log n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static long MaxRevenueLarge(int[] stock, long customers)
{
    var a = stock.Where(x => x > 0).OrderByDescending(x => x).ToArray();
    long revenue = 0;
    var width = 1;                                   // types currently at the top height
    for (var i = 0; i < a.Length && customers > 0; i++, width++)
    {
        long high = a[i];
        long low = i + 1 < a.Length ? a[i + 1] : 0;
        long full = (high - low) * width;            // units sold to flatten this layer

        if (customers >= full)
        {
            revenue += width * (Tri(high) - Tri(low));
            customers -= full;
        }
        else
        {
            var levels = customers / width;
            var rest = customers % width;
            var newHigh = high - levels;
            revenue += width * (Tri(high) - Tri(newHigh)) + rest * newHigh;
            customers = 0;
        }
    }
    return revenue;

    static long Tri(long v) => v * (v + 1) / 2;
}
```

**Worked example.** `stock = [5, 3]`, `customers = 3` → `12`; `customers = 100` → `15 + 6 = 21` (everything sold).

**Keywords:** `heap, greedy, c#, interview`

**Follow-ups:**

-   Why does processing whole price layers beat a heap here?
-   What happens when customers exceed the total stock?

## coding-greedy-003 --- Maximize Integer with Swap

**question_id:** `coding-greedy-003`\
**topic_id:** `coding-greedy`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Maximize Integer with Swap" in C#?

**Answer**

**Problem.** You may swap two digits of a non-negative integer at most once. Return the largest number you can make.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Record the last index of each digit 0–9. For each position left to right, look for a larger digit (9 down) that occurs later; swap with its **last** occurrence and stop. If none exists the number is already maximal. Use `long` because a swap can push the value past `int.MaxValue`.

**Complexity.** Time O(d); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static long MaximumSwap(long num)
{
    var digits = num.ToString().ToCharArray();
    var last = new int[10];
    for (var i = 0; i < digits.Length; i++) last[digits[i] - '0'] = i;

    for (var i = 0; i < digits.Length; i++)
    {
        for (var d = 9; d > digits[i] - '0'; d--)
        {
            if (last[d] > i)
            {
                (digits[i], digits[last[d]]) = (digits[last[d]], digits[i]);
                return long.Parse(new string(digits));
            }
        }
    }
    return num;
}
```

**Worked example.** `2736` → `7236`; `9973` → `9973`.

**Keywords:** `greedy, string or array, c#, interview`

**Follow-ups:**

-   Why swap with the last occurrence of the larger digit?
-   How would you allow k swaps?

## coding-greedy-004 --- Card Packets

**question_id:** `coding-greedy-004`\
**topic_id:** `coding-greedy`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Card Packets" in C#?

**Answer**

**Problem.** Assumed reading: there are packets of cards with sizes `packets[i]`. Merging two packets costs the sum of their sizes. Return the minimum total cost to merge all packets into one.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Optimal merge pattern (Huffman-style): always merge the two smallest packets, because small packets get re-added to the cost the most times. A min-heap does this in `O(log n)` per merge.

**Complexity.** Time O(n log n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static long MinMergeCost(IEnumerable<int> packets)
{
    var heap = new PriorityQueue<long, long>();
    foreach (var p in packets) heap.Enqueue(p, p);

    long cost = 0;
    while (heap.Count > 1)
    {
        var merged = heap.Dequeue() + heap.Dequeue();
        cost += merged;
        heap.Enqueue(merged, merged);
    }
    return cost;
}
```

**Worked example.** `[4, 3, 2, 6]` → `5 + 9 + 15 = 29`.

**Keywords:** `greedy, heap, c#, interview`

**Follow-ups:**

-   Why do the two smallest packets merge first?
-   How does this relate to Huffman coding?

# TOPIC --- Hash Maps and Simulation

**topic_id:** `coding-hashing`\
**priority:** `Strong`\
**category:** `Coding`

## coding-hashing-001 --- Design Authentication Manager

**question_id:** `coding-hashing-001`\
**topic_id:** `coding-hashing`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Design Authentication Manager" in C#?

**Answer**

**Problem.** Tokens live for `timeToLive` seconds. Implement `Generate(tokenId, t)`, `Renew(tokenId, t)` (only if the token has not expired at `t`; it then expires at `t + timeToLive`) and `CountUnexpiredTokens(t)`. A token expiring exactly at `t` counts as expired.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Store each token's expiry time in a dictionary. Renew only when `expiry > t`. Counting scans the values; for very large inputs keep a time-ordered structure and drop expired entries lazily.

**Complexity.** Time O(1) generate/renew, O(n) count; space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public sealed class AuthenticationManager
{
    private readonly int _ttl;
    private readonly Dictionary<string, int> _expiry = new();

    public AuthenticationManager(int timeToLive) => _ttl = timeToLive;

    public void Generate(string tokenId, int currentTime)
        => _expiry[tokenId] = currentTime + _ttl;

    public void Renew(string tokenId, int currentTime)
    {
        if (_expiry.TryGetValue(tokenId, out var expiresAt) && expiresAt > currentTime)
            _expiry[tokenId] = currentTime + _ttl;
    }

    public int CountUnexpiredTokens(int currentTime)
    {
        var count = 0;
        foreach (var expiresAt in _expiry.Values)
            if (expiresAt > currentTime) count++;
        return count;
    }
}
```

**Worked example.** `ttl = 5`: `Generate("a", 2)` → expires 7; `Renew("a", 6)` → expires 11; `CountUnexpiredTokens(10)` → `1`; `Renew("a", 11)` is ignored.

**Keywords:** `hash map, simulation, c#, interview`

**Follow-ups:**

-   How would you make CountUnexpiredTokens faster than O(n)?
-   How would you make this thread-safe?

## coding-hashing-002 --- Find Common Keys in Product Recommendations

**question_id:** `coding-hashing-002`\
**topic_id:** `coding-hashing`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Find Common Keys in Product Recommendations" in C#?

**Answer**

**Problem.** Assumed reading: several users each have a list of recommended product keys. Return the keys that appear in every list, sorted.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Count in how many lists each key appears, de-duplicating inside a list with a `HashSet` so repeats do not inflate the count. Keys whose count equals the number of lists are common.

**Complexity.** Time O(total items); space O(distinct keys).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static List<string> CommonKeys(IReadOnlyList<IEnumerable<string>> lists)
{
    if (lists.Count == 0) return new List<string>();
    var counts = new Dictionary<string, int>();
    foreach (var list in lists)
        foreach (var key in new HashSet<string>(list))
            counts[key] = counts.GetValueOrDefault(key) + 1;

    return counts.Where(kv => kv.Value == lists.Count)
                 .Select(kv => kv.Key)
                 .OrderBy(k => k, StringComparer.Ordinal)
                 .ToList();
}
```

**Worked example.** `[["a","b","c"], ["b","c","d"], ["c","b"]]` → `["b", "c"]`.

**Keywords:** `hash set, hash map, c#, interview`

**Follow-ups:**

-   How would you handle a very large number of lists?
-   What changes if keys need only appear in a majority of lists?

## coding-hashing-003 --- Compare Products from Three Separate Lists

**question_id:** `coding-hashing-003`\
**topic_id:** `coding-hashing`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Compare Products from Three Separate Lists" in C#?

**Answer**

**Problem.** Assumed reading: three lists of product IDs from three sources. Return the IDs that appear in at least two of the lists, sorted ascending.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Count the number of *lists* (not occurrences) containing each ID using a `HashSet` per list, then keep IDs with count ≥ 2. Changing the threshold to 3 gives "in all three".

**Complexity.** Time O(n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static List<int> ProductsInAtLeastTwo(int[] a, int[] b, int[] c)
{
    var seen = new Dictionary<int, int>();
    foreach (var list in new[] { a, b, c })
        foreach (var id in new HashSet<int>(list))
            seen[id] = seen.GetValueOrDefault(id) + 1;

    return seen.Where(kv => kv.Value >= 2)
               .Select(kv => kv.Key)
               .OrderBy(id => id)
               .ToList();
}
```

**Worked example.** `a=[1,1,3], b=[3,4], c=[4,5]` → `[3, 4]`.

**Keywords:** `array, hash map, c#, interview`

**Follow-ups:**

-   How would you require presence in all three lists instead?
-   How would you keep memory low for huge lists?

# TOPIC --- Intervals and Range Sweeps

**topic_id:** `coding-windows`\
**priority:** `Strong`\
**category:** `Coding`

## coding-windows-001 --- Minimum Number of Meeting Rooms (Intervals as List<List<Integer>>)

**question_id:** `coding-windows-001`\
**topic_id:** `coding-windows`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Minimum Number of Meeting Rooms (Intervals as List<List<Integer>>)" in C#?

**Answer**

**Problem.** Given meeting intervals `[start, end)`, return the minimum number of rooms so no two overlapping meetings share one. A meeting ending at `t` frees its room for one starting at `t`.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Sort start times and end times separately and sweep: if the next start is ≥ the earliest unfinished end, reuse that room; otherwise open a new one. (A min-heap of end times gives the same result.)

**Complexity.** Time O(n log n); space O(n).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int MinMeetingRooms(List<List<int>> intervals)
{
    var starts = intervals.Select(i => i[0]).OrderBy(x => x).ToArray();
    var ends = intervals.Select(i => i[1]).OrderBy(x => x).ToArray();

    int rooms = 0, endPtr = 0;
    foreach (var start in starts)
    {
        if (start >= ends[endPtr]) endPtr++;   // a meeting finished: reuse its room
        else rooms++;                          // everything still running: need another room
    }
    return rooms;
}
```

**Worked example.** `[[0,30],[5,10],[15,20]]` → `2`; `[[7,10],[2,4]]` → `1`.

**Keywords:** `intervals, sorting, heap, c#, interview`

**Follow-ups:**

-   Solve it again with a min-heap of end times.
-   What if a meeting ending at t must not share a room with one starting at t?

## coding-windows-002 --- Optimize Streaming Platform Sessions

**question_id:** `coding-windows-002`\
**topic_id:** `coding-windows`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Optimize Streaming Platform Sessions" in C#?

**Answer**

**Problem.** Assumed reading: `usage[i]` is the data used by session `i` (positive). Find the longest run of consecutive sessions whose total usage fits within `capacity`.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Variable-size sliding window: extend `right`, and while the total exceeds `capacity` shrink from `left`. Because all values are positive, each pointer only moves forward.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int LongestSessionRun(int[] usage, int capacity)
{
    long sum = 0;
    int left = 0, best = 0;
    for (var right = 0; right < usage.Length; right++)
    {
        sum += usage[right];
        while (sum > capacity && left <= right)
            sum -= usage[left++];
        best = Math.Max(best, right - left + 1);
    }
    return best;
}
```

**Worked example.** `usage = [2, 1, 3, 2, 1]`, `capacity = 6` → `[1,3,2]` or `[3,2,1]` = `3`.

**Keywords:** `sliding window, queue, c#, interview`

**Follow-ups:**

-   Why does the sliding window need strictly positive values?
-   How would you also return the window position?

# TOPIC --- Binary Search Trees and JSON Filtering

**topic_id:** `coding-trees`\
**priority:** `Strong`\
**category:** `Coding`

## coding-trees-001 --- Search Values in a Binary Search Tree

**question_id:** `coding-trees-001`\
**topic_id:** `coding-trees`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Search Values in a Binary Search Tree" in C#?

**Answer**

**Problem.** Given the root of a BST and a list of query values, return for each query whether it exists in the tree.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** Walk down iteratively: go left when the value is smaller than the node, right when larger. Each query costs the tree height — O(log n) when balanced.

**Complexity.** Time O(q · h); space O(1) extra.

Real-world example: a complete C# solution followed by a worked case.

```csharp
public sealed class TreeNode
{
    public int Val;
    public TreeNode? Left, Right;
    public TreeNode(int val) => Val = val;
}

public static bool Contains(TreeNode? root, int value)
{
    while (root is not null)
    {
        if (value == root.Val) return true;
        root = value < root.Val ? root.Left : root.Right;
    }
    return false;
}

public static bool[] SearchValues(TreeNode? root, int[] queries)
    => queries.Select(q => Contains(root, q)).ToArray();
```

**Worked example.** BST `4 / (2, 7)`, queries `[2, 5, 7]` → `[true, false, true]`.

**Keywords:** `tree, bst, c#, interview`

**Follow-ups:**

-   How would you write this recursively and what is the stack risk?
-   How would you handle duplicates in the tree?

## coding-trees-002 --- Retrieve and Filter Elite Clubs from Football Teams API

**question_id:** `coding-trees-002`\
**topic_id:** `coding-trees`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Retrieve and Filter Elite Clubs from Football Teams API" in C#?

**Answer**

**Problem.** Call a paginated REST endpoint that returns `{ page, total_pages, data: [...] }`, fetch **every** page, and return the names of clubs that qualify as "elite" (here: at least `minTitles` titles). The field names are assumed — adapt the record to the real payload.

*Statement note: the source list only gives the title, so this problem statement is a best-guess reconstruction. Verify it against the real prompt.*

**Approach.** Loop pages until `total_pages`, deserialising with `HttpClient.GetFromJsonAsync` and `JsonPropertyName` for snake_case. Filter with LINQ, sort for deterministic output. Take an injected `HttpClient` so the function is testable with a fake handler.

**Complexity.** Time O(pages + clubs); space O(clubs).

Real-world example: a complete C# solution followed by a worked case.

```csharp
using System.Net.Http.Json;
using System.Text.Json.Serialization;

public sealed record Team(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("country")] string Country,
    [property: JsonPropertyName("titles")] int Titles);

public sealed record TeamsPage(
    [property: JsonPropertyName("page")] int Page,
    [property: JsonPropertyName("total_pages")] int TotalPages,
    [property: JsonPropertyName("data")] List<Team> Data);

public static async Task<List<string>> GetEliteClubsAsync(
    HttpClient http, string baseUrl, int minTitles, CancellationToken ct = default)
{
    var elite = new List<string>();
    var page = 1;
    int totalPages;
    do
    {
        var result = await http.GetFromJsonAsync<TeamsPage>($"{baseUrl}?page={page}", ct)
                     ?? throw new InvalidOperationException("Empty response.");
        elite.AddRange(result.Data.Where(t => t.Titles >= minTitles).Select(t => t.Name));
        totalPages = result.TotalPages;
    } while (++page <= totalPages);

    elite.Sort(StringComparer.Ordinal);
    return elite;
}
```

**Worked example.** Pages return teams with titles `[12, 3]` and `[20, 1]`; `minTitles = 10` → the two clubs with 12 and 20 titles.

**Keywords:** `api, json, filtering, c#, interview`

**Follow-ups:**

-   How would you add retries and a timeout with HttpClient?
-   How would you unit test it without calling the network?

# TOPIC --- Math and Circular Movement

**topic_id:** `coding-math`\
**priority:** `Useful`\
**category:** `Coding`

## coding-math-001 --- Count numbers of the form 3^x * 5^y within a range

**question_id:** `coding-math-001`\
**topic_id:** `coding-math`\
**difficulty:** `Mid`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "Count numbers of the form 3^x * 5^y within a range" in C#?

**Answer**

**Problem.** Given `low` and `high`, count integers in `[low, high]` that can be written as `3^x * 5^y` with `x, y ≥ 0`.

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** There are only ~40 × ~27 such numbers below 10^18, so enumerate them. Each is unique (prime factorisation). Guard multiplication with a `> high / base` check to avoid overflow.

**Complexity.** Time O(log₃ high · log₅ high); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int CountThreeFive(long low, long high)
{
    var count = 0;
    for (long p3 = 1; p3 <= high;)
    {
        for (long v = p3; v <= high;)
        {
            if (v >= low) count++;
            if (v > high / 5) break;     // next *5 would pass high (or overflow)
            v *= 5;
        }
        if (p3 > high / 3) break;
        p3 *= 3;
    }
    return count;
}
```

**Worked example.** `[1, 100]` → `1, 3, 5, 9, 15, 25, 27, 45, 75, 81` = `10`.

**Keywords:** `math, enumeration, c#, interview`

**Follow-ups:**

-   What if x and y had to be strictly positive?
-   Why is enumeration enough and no search needed?

## coding-math-002 --- toolchanger (from your screenshot)

**question_id:** `coding-math-002`\
**topic_id:** `coding-math`\
**difficulty:** `Junior`\
**question_type:** `Coding / Practical`

**Question**

How do you solve "toolchanger (from your screenshot)" in C#?

**Answer**

**Problem.** Signature `toolchanger(List<string> tools, int startIndex, string target)`. The tools sit on a circular carousel. Each step moves one position left or right. Return the minimum number of moves from `startIndex` to reach `target` (−1 if absent; 0 if already there).

*Statement note: reconstructed from the title (the full prompt was not available).*

**Approach.** For every index holding `target` take the shorter way round the circle: `min(d, n - d)` where `d = |i - startIndex|`. Return the minimum across all matches.

**Complexity.** Time O(n); space O(1).

Real-world example: a complete C# solution followed by a worked case.

```csharp
public static int Toolchanger(List<string> tools, int startIndex, string target)
{
    var n = tools.Count;
    var best = -1;
    for (var i = 0; i < n; i++)
    {
        if (tools[i] != target) continue;
        var d = Math.Abs(i - startIndex);
        var steps = Math.Min(d, n - d);          // clockwise vs counter-clockwise
        if (best < 0 || steps < best) best = steps;
    }
    return best;
}
```

**Worked example.** `["ballendmill","keywaycutter","slotdrill","facemill"]`, start 1, `"ballendmill"` → `1`; `["ballendmill","facemill","keywaycutter","slotdrill"]`, start 1, `"slotdrill"` → `2`.

**Keywords:** `circular array, simulation, c#, interview`

**Follow-ups:**

-   What if the target appears more than once?
-   How would you return the direction as well as the distance?
