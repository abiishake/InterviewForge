/**
 * IBM coding questions with answers.
 *
 * Source of the titles: "IBM 1Point3Acres Coding Question Tracker" workbook (OJ Coding Titles + user screenshot sheet).
 * The workbook only captured titles — the statements are member-only on the source site — so every problem text below is a
 * RECONSTRUCTION from the title and pattern. `confidence: 'tentative'` marks titles whose meaning is a best guess; verify the
 * real prompt before relying on those. Solutions are C# and the logic of each was cross-checked against brute force.
 */
const c = String.raw;

export type Confidence = 'likely' | 'tentative';

export interface CodingQuestion {
  no: number;
  title: string;
  pattern: string;
  confidence: Confidence;
  problem: string;
  approach: string;
  time: string;
  space: string;
  code: string;
  example: string;
}

export const CODING_QUESTIONS: CodingQuestion[] = [
  {
    no: 1, title: 'Minimum Replacements to Eliminate Adjacent Equal Characters', pattern: 'String / Greedy', confidence: 'likely',
    problem: 'Given a string `s`, replace as few characters as possible (each with any other letter) so that no two adjacent characters are equal. Return the number of replacements.',
    approach: 'A run of `k` equal characters needs `k / 2` replacements: change every second character of the run to a letter that differs from both neighbours. Count runs in one pass.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static int MinReplacements(string s)
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
}`,
    example: '`"aaab"` → `1` (e.g. `abab`); `"aaaa"` → `2`; `"abab"` → `0`.'
  },
  {
    no: 2, title: 'Maximum Revenue from Renting Highest-Stock VMs', pattern: 'Heap / Greedy', confidence: 'likely',
    problem: 'There are several VM types; `stock[i]` is the number of units of type `i`. Each of `customers` renters takes the type with the highest remaining stock and pays a price equal to that stock, then the stock drops by one. Return the maximum total revenue.',
    approach: 'Greedy: always rent from the largest stock. Use a max-heap — pop the largest, add it to revenue, push back `stock - 1` if still positive. C# `PriorityQueue` is a min-heap, so negate the priority.',
    time: 'O(m log n)', space: 'O(n)',
    code: c`public static long MaxRevenue(IEnumerable<int> stock, int customers)
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
}`,
    example: '`stock = [5, 3]`, `customers = 3` → `5 + 4 + 3 = 12`.'
  },
  {
    no: 3, title: 'Design Authentication Manager', pattern: 'Hash map / Simulation', confidence: 'likely',
    problem: 'Tokens live for `timeToLive` seconds. Implement `Generate(tokenId, t)`, `Renew(tokenId, t)` (only if the token has not expired at `t`; it then expires at `t + timeToLive`) and `CountUnexpiredTokens(t)`. A token expiring exactly at `t` counts as expired.',
    approach: 'Store each token\'s expiry time in a dictionary. Renew only when `expiry > t`. Counting scans the values; for very large inputs keep a time-ordered structure and drop expired entries lazily.',
    time: 'O(1) generate/renew, O(n) count', space: 'O(n)',
    code: c`public sealed class AuthenticationManager
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
}`,
    example: '`ttl = 5`: `Generate("a", 2)` → expires 7; `Renew("a", 6)` → expires 11; `CountUnexpiredTokens(10)` → `1`; `Renew("a", 11)` is ignored.'
  },
  {
    no: 4, title: 'Minimum Replacements to Avoid Equal Adjacent Characters', pattern: 'String / Greedy', confidence: 'likely',
    problem: 'Same goal as question 1, but also return a valid resulting string using lowercase letters.',
    approach: 'Scan left to right. When `s[i] == s[i-1]`, replace `s[i]` with the first letter that differs from the previous character **and** the next one — that also stops the new character colliding with `s[i+1]`, so the run is fixed greedily with the minimum count.',
    time: 'O(n)', space: 'O(n)',
    code: c`public static (int Count, string Result) AvoidEqualAdjacent(string s)
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
}`,
    example: '`"aaab"` → `(1, "abab")`; `"aab"` → `(1, "acb")`.'
  },
  {
    no: 5, title: 'Maximum Revenue from VM Rentals', pattern: 'Heap / Greedy', confidence: 'tentative',
    problem: 'Same pricing rule as question 2, but the number of customers can be huge (up to ~10^9), so a one-customer-at-a-time heap is too slow. Return the maximum revenue.',
    approach: 'Sort stocks descending. Process the "layers" between consecutive distinct heights at once: with `width` types at the top height, dropping all of them from `high` to `low` sells `width * (high - low)` units whose total price is an arithmetic series. If customers run out mid-layer, sell whole levels, then the remainder at the next price.',
    time: 'O(n log n)', space: 'O(n)',
    code: c`public static long MaxRevenueLarge(int[] stock, long customers)
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
}`,
    example: '`stock = [5, 3]`, `customers = 3` → `12`; `customers = 100` → `15 + 6 = 21` (everything sold).'
  },
  {
    no: 6, title: 'Minimum Deletions to Eliminate Adjacent Equal Characters', pattern: 'String / Greedy', confidence: 'likely',
    problem: 'Delete as few characters as possible from `s` so that no two adjacent characters are equal. Return the number of deletions.',
    approach: 'In each run of `k` equal characters keep one and delete `k - 1`. That is simply the number of positions where `s[i] == s[i-1]`.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static int MinDeletions(string s)
{
    var deletions = 0;
    for (var i = 1; i < s.Length; i++)
        if (s[i] == s[i - 1]) deletions++;
    return deletions;
}`,
    example: '`"aaabbb"` → `4` (result `"ab"`); `"abab"` → `0`.'
  },
  {
    no: 7, title: 'Count strictly decreasing-by-1 subarrays of length at least 2', pattern: 'Array / Counting', confidence: 'likely',
    problem: 'Count subarrays of length ≥ 2 in which every element is exactly 1 less than the previous one (e.g. `5, 4, 3`).',
    approach: 'Track `run`, the number of consecutive "drop by 1" steps ending at `i`. Every such step extends `run` subarrays that end at `i`, so add `run` to the answer. Reset `run` to 0 when the step is not −1.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static long CountDecreasingByOne(int[] a)
{
    long total = 0, run = 0;
    for (var i = 1; i < a.Length; i++)
    {
        run = (long)a[i - 1] - a[i] == 1 ? run + 1 : 0;
        total += run;
    }
    return total;
}`,
    example: '`[5, 4, 3, 7, 6]` → `[5,4] [4,3] [5,4,3] [7,6]` = `4`.'
  },
  {
    no: 8, title: 'Count numbers of the form 3^x * 5^y within a range', pattern: 'Math / Enumeration', confidence: 'likely',
    problem: 'Given `low` and `high`, count integers in `[low, high]` that can be written as `3^x * 5^y` with `x, y ≥ 0`.',
    approach: 'There are only ~40 × ~27 such numbers below 10^18, so enumerate them. Each is unique (prime factorisation). Guard multiplication with a `> high / base` check to avoid overflow.',
    time: 'O(log₃ high · log₅ high)', space: 'O(1)',
    code: c`public static int CountThreeFive(long low, long high)
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
}`,
    example: '`[1, 100]` → `1, 3, 5, 9, 15, 25, 27, 45, 75, 81` = `10`.'
  },
  {
    no: 9, title: 'Reverse Last Two Characters with a Space', pattern: 'String manipulation', confidence: 'tentative',
    problem: 'Assumed reading: swap the last two characters of the string and put a single space between them. Strings shorter than two characters are returned unchanged.',
    approach: 'Use C# ranges: keep everything before the last two characters, then append the last character, a space and the second-to-last character. Check the real prompt — if it means "replace" or "reverse words", only this one expression changes.',
    time: 'O(n)', space: 'O(n)',
    code: c`public static string ReverseLastTwoWithSpace(string s)
{
    if (s.Length < 2) return s;
    return s[..^2] + s[^1] + " " + s[^2];
}`,
    example: '`"hello"` → `"helo l"`.'
  },
  {
    no: 10, title: 'Minimum Number of Meeting Rooms (Intervals as List<List<Integer>>)', pattern: 'Intervals / Sorting / Heap', confidence: 'likely',
    problem: 'Given meeting intervals `[start, end)`, return the minimum number of rooms so no two overlapping meetings share one. A meeting ending at `t` frees its room for one starting at `t`.',
    approach: 'Sort start times and end times separately and sweep: if the next start is ≥ the earliest unfinished end, reuse that room; otherwise open a new one. (A min-heap of end times gives the same result.)',
    time: 'O(n log n)', space: 'O(n)',
    code: c`public static int MinMeetingRooms(List<List<int>> intervals)
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
}`,
    example: '`[[0,30],[5,10],[15,20]]` → `2`; `[[7,10],[2,4]]` → `1`.'
  },
  {
    no: 11, title: 'Get Minimum Increment', pattern: 'Array / Greedy (tentative)', confidence: 'tentative',
    problem: 'Assumed reading: you may only add 1 to elements. Return the minimum total number of increments that makes the array strictly increasing.',
    approach: 'Walk left to right keeping the previous (already fixed) value. If `a[i] <= prev`, raise it to `prev + 1` and add the difference; otherwise keep it. Raising as little as possible keeps later elements cheap.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static long GetMinimumIncrement(int[] a)
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
}`,
    example: '`[1, 1, 1]` → `0 + 1 + 2 = 3`; `[1, 5, 2, 4, 1]` → `14`.'
  },
  {
    no: 12, title: 'Get Minimum Operations', pattern: 'Array / Greedy (tentative)', confidence: 'tentative',
    problem: 'Assumed reading: one operation adds or subtracts 1 from a single element. Return the minimum operations to make all elements equal.',
    approach: 'The target that minimises the sum of absolute differences is the median. Sort, take the median, sum the distances.',
    time: 'O(n log n)', space: 'O(n)',
    code: c`public static long GetMinimumOperations(int[] a)
{
    if (a.Length == 0) return 0;
    var sorted = (int[])a.Clone();
    Array.Sort(sorted);
    long median = sorted[sorted.Length / 2];
    long ops = 0;
    foreach (var x in sorted) ops += Math.Abs(x - median);
    return ops;
}`,
    example: '`[1, 10, 2, 9]` → target 9 or 2 → `16`; `[1, 2, 3]` → `2`.'
  },
  {
    no: 13, title: 'Minimum Hits Needed', pattern: 'Greedy / Math (tentative)', confidence: 'tentative',
    problem: 'Assumed reading: each enemy has a health value and one hit removes `damage` health from one enemy. Return the minimum number of hits to defeat all of them.',
    approach: 'Enemies are independent, so the answer is the sum of `ceil(health / damage)`. Use integer arithmetic `(h + d - 1) / d` in `long` to avoid overflow.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static long MinimumHits(int[] health, int damage)
{
    long hits = 0;
    foreach (var h in health)
        if (h > 0) hits += ((long)h + damage - 1) / damage;
    return hits;
}`,
    example: '`health = [10, 4, 7]`, `damage = 3` → `4 + 2 + 3 = 9`.'
  },
  {
    no: 14, title: 'Maximum Increment to Make Array Ascending', pattern: 'Array / Greedy', confidence: 'tentative',
    problem: 'Assumed reading: you may only increase elements. Make the array non-decreasing with the fewest total increments, and report both the total and the largest increment applied to any one element.',
    approach: 'Keep the running maximum. Any element below it must be raised to exactly that maximum — no less (still not ascending) and no more (wasted). The largest single increment is the biggest gap `runningMax - a[i]`.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static (long Total, int MaxSingle) MakeAscending(int[] a)
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
}`,
    example: '`[3, 1, 4, 1, 5]` → total `2 + 3 = 5`, max single `3`.'
  },
  {
    no: 15, title: 'Find Length of Longest Bitonic Subarray', pattern: 'Array / Dynamic programming', confidence: 'likely',
    problem: 'A bitonic subarray strictly increases and then strictly decreases (either part may be a single element). Return the length of the longest one.',
    approach: 'Precompute `inc[i]` = length of the strictly increasing run ending at `i`, and `dec[i]` = length of the strictly decreasing run starting at `i`. The best bitonic subarray peaking at `i` has length `inc[i] + dec[i] - 1`.',
    time: 'O(n)', space: 'O(n)',
    code: c`public static int LongestBitonicSubarray(int[] a)
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
}`,
    example: '`[1, 3, 5, 4, 2, 6]` → `[1,3,5,4,2]` = `5`.'
  },
  {
    no: 16, title: 'Find Common Keys in Product Recommendations', pattern: 'Hash set / Hash map (tentative)', confidence: 'tentative',
    problem: 'Assumed reading: several users each have a list of recommended product keys. Return the keys that appear in every list, sorted.',
    approach: 'Count in how many lists each key appears, de-duplicating inside a list with a `HashSet` so repeats do not inflate the count. Keys whose count equals the number of lists are common.',
    time: 'O(total items)', space: 'O(distinct keys)',
    code: c`public static List<string> CommonKeys(IReadOnlyList<IEnumerable<string>> lists)
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
}`,
    example: '`[["a","b","c"], ["b","c","d"], ["c","b"]]` → `["b", "c"]`.'
  },
  {
    no: 17, title: 'Optimize Streaming Platform Sessions', pattern: 'Sliding window / Queue (tentative)', confidence: 'tentative',
    problem: 'Assumed reading: `usage[i]` is the data used by session `i` (positive). Find the longest run of consecutive sessions whose total usage fits within `capacity`.',
    approach: 'Variable-size sliding window: extend `right`, and while the total exceeds `capacity` shrink from `left`. Because all values are positive, each pointer only moves forward.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static int LongestSessionRun(int[] usage, int capacity)
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
}`,
    example: '`usage = [2, 1, 3, 2, 1]`, `capacity = 6` → `[1,3,2]` or `[3,2,1]` = `3`.'
  },
  {
    no: 18, title: 'Search Values in a Binary Search Tree', pattern: 'Tree / BST', confidence: 'likely',
    problem: 'Given the root of a BST and a list of query values, return for each query whether it exists in the tree.',
    approach: 'Walk down iteratively: go left when the value is smaller than the node, right when larger. Each query costs the tree height — O(log n) when balanced.',
    time: 'O(q · h)', space: 'O(1) extra',
    code: c`public sealed class TreeNode
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
    => queries.Select(q => Contains(root, q)).ToArray();`,
    example: 'BST `4 / (2, 7)`, queries `[2, 5, 7]` → `[true, false, true]`.'
  },
  {
    no: 19, title: 'Retrieve and Filter Elite Clubs from Football Teams API', pattern: 'API / JSON / Filtering', confidence: 'tentative',
    problem: 'Call a paginated REST endpoint that returns `{ page, total_pages, data: [...] }`, fetch **every** page, and return the names of clubs that qualify as "elite" (here: at least `minTitles` titles). The field names are assumed — adapt the record to the real payload.',
    approach: 'Loop pages until `total_pages`, deserialising with `HttpClient.GetFromJsonAsync` and `JsonPropertyName` for snake_case. Filter with LINQ, sort for deterministic output. Take an injected `HttpClient` so the function is testable with a fake handler.',
    time: 'O(pages + clubs)', space: 'O(clubs)',
    code: c`using System.Net.Http.Json;
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
}`,
    example: 'Pages return teams with titles `[12, 3]` and `[20, 1]`; `minTitles = 10` → the two clubs with 12 and 20 titles.'
  },
  {
    no: 20, title: 'Group Words by Character Frequency', pattern: 'String / Hash map', confidence: 'likely',
    problem: 'Group words that contain exactly the same letters with the same counts (anagrams). Words are lowercase `a–z`.',
    approach: 'Build a canonical key from the 26 letter counts (cheaper than sorting each word) and group in a dictionary.',
    time: 'O(total characters)', space: 'O(n)',
    code: c`public static List<List<string>> GroupByCharacterFrequency(IEnumerable<string> words)
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
}`,
    example: '`["eat","tea","tan","ate","nat","bat"]` → `[[eat,tea,ate],[tan,nat],[bat]]`.'
  },
  {
    no: 21, title: 'Return the Last Lexicographical Substring', pattern: 'String / Two pointers (tentative)', confidence: 'likely',
    problem: 'Among all substrings of `s`, return the one that is largest in lexicographic order.',
    approach: 'The answer is always a suffix. Compare two candidate suffixes starting at `i` and `j` with a running match length `k`; the loser (and the positions it covers) is skipped, so each index is visited a constant number of times.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static string LastSubstring(string s)
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
}`,
    example: '`"abab"` → `"bab"`; `"leetcode"` → `"tcode"`.'
  },
  {
    no: 22, title: 'Compare Products from Three Separate Lists', pattern: 'Array / Hash map (tentative)', confidence: 'tentative',
    problem: 'Assumed reading: three lists of product IDs from three sources. Return the IDs that appear in at least two of the lists, sorted ascending.',
    approach: 'Count the number of *lists* (not occurrences) containing each ID using a `HashSet` per list, then keep IDs with count ≥ 2. Changing the threshold to 3 gives "in all three".',
    time: 'O(n)', space: 'O(n)',
    code: c`public static List<int> ProductsInAtLeastTwo(int[] a, int[] b, int[] c)
{
    var seen = new Dictionary<int, int>();
    foreach (var list in new[] { a, b, c })
        foreach (var id in new HashSet<int>(list))
            seen[id] = seen.GetValueOrDefault(id) + 1;

    return seen.Where(kv => kv.Value >= 2)
               .Select(kv => kv.Key)
               .OrderBy(id => id)
               .ToList();
}`,
    example: '`a=[1,1,3], b=[3,4], c=[4,5]` → `[3, 4]`.'
  },
  {
    no: 23, title: 'Find the Largest Subset of a String', pattern: 'String / Set (tentative)', confidence: 'tentative',
    problem: 'Assumed reading: find the length of the longest substring whose characters are all distinct (the largest "set" you can read contiguously).',
    approach: 'Sliding window with a dictionary of each character\'s last index. When a character repeats inside the window, move `start` just past its previous position.',
    time: 'O(n)', space: 'O(σ)',
    code: c`public static int LongestDistinctSubstring(string s)
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
}`,
    example: '`"abcabcbb"` → `3` (`"abc"`); `"bbbb"` → `1`.'
  },
  {
    no: 24, title: 'Merge 2 Arrays', pattern: 'Array / Merge', confidence: 'likely',
    problem: 'Merge two sorted arrays into a single sorted array.',
    approach: 'Two pointers, always copying the smaller head; then drain whichever array remains. Using `<=` keeps the merge stable.',
    time: 'O(n + m)', space: 'O(n + m)',
    code: c`public static int[] MergeSorted(int[] a, int[] b)
{
    var result = new int[a.Length + b.Length];
    int i = 0, j = 0, k = 0;
    while (i < a.Length && j < b.Length)
        result[k++] = a[i] <= b[j] ? a[i++] : b[j++];
    while (i < a.Length) result[k++] = a[i++];
    while (j < b.Length) result[k++] = b[j++];
    return result;
}`,
    example: '`[1, 4, 7]` + `[2, 3, 9]` → `[1, 2, 3, 4, 7, 9]`.'
  },
  {
    no: 25, title: 'Find Missing Integer', pattern: 'Array / Math', confidence: 'tentative',
    problem: 'Return the smallest positive integer that is missing from an unsorted array. This also covers the classic "one number missing from 1..n" version.',
    approach: 'Cyclic placement: swap each value `v` in `1..n` into index `v - 1`. A second pass finds the first index where `nums[i] != i + 1`. (For the single-missing version `n(n+1)/2 − sum` also works.) Note: it mutates the input — copy first if needed.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static int FirstMissingPositive(int[] nums)
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
}`,
    example: '`[3, 4, -1, 1]` → `2`; `[1, 2, 3]` → `4`.'
  },
  {
    no: 26, title: 'Maximize Integer with Swap', pattern: 'Greedy / String or Array (tentative)', confidence: 'likely',
    problem: 'You may swap two digits of a non-negative integer at most once. Return the largest number you can make.',
    approach: 'Record the last index of each digit 0–9. For each position left to right, look for a larger digit (9 down) that occurs later; swap with its **last** occurrence and stop. If none exists the number is already maximal. Use `long` because a swap can push the value past `int.MaxValue`.',
    time: 'O(d)', space: 'O(1)',
    code: c`public static long MaximumSwap(long num)
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
}`,
    example: '`2736` → `7236`; `9973` → `9973`.'
  },
  {
    no: 27, title: 'Find Non-Repeated Elements', pattern: 'Array / Hash set', confidence: 'likely',
    problem: 'Return the elements that appear exactly once in the array, in their original order.',
    approach: 'One pass builds a frequency map; a second pass keeps elements whose count is 1, which preserves input order.',
    time: 'O(n)', space: 'O(n)',
    code: c`public static List<int> NonRepeated(int[] a)
{
    var counts = new Dictionary<int, int>();
    foreach (var x in a) counts[x] = counts.GetValueOrDefault(x) + 1;
    return a.Where(x => counts[x] == 1).ToList();
}`,
    example: '`[4, 3, 2, 4, 1, 3]` → `[2, 1]`.'
  },
  {
    no: 28, title: 'Get Final String', pattern: 'String / Simulation (tentative)', confidence: 'tentative',
    problem: 'Assumed reading (the "faulty keyboard" puzzle): type the characters of `s` one by one; typing `\'i\'` reverses everything typed so far instead of adding a character. Return the final text.',
    approach: 'Reversing on every `i` would be O(n²). Instead keep a deque-like list and a `reversed` flag: when reversed, new characters go to the **front**; flip the flag on `i`. Reverse once at the end if the flag is set.',
    time: 'O(n)', space: 'O(n)',
    code: c`public static string GetFinalString(string s)
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
}`,
    example: '`"string"` → `"rtsng"`; `"poiinter"` → `"ponter"`.'
  },
  {
    no: 29, title: 'Card Packets', pattern: 'Greedy / Heap (tentative)', confidence: 'tentative',
    problem: 'Assumed reading: there are packets of cards with sizes `packets[i]`. Merging two packets costs the sum of their sizes. Return the minimum total cost to merge all packets into one.',
    approach: 'Optimal merge pattern (Huffman-style): always merge the two smallest packets, because small packets get re-added to the cost the most times. A min-heap does this in `O(log n)` per merge.',
    time: 'O(n log n)', space: 'O(n)',
    code: c`public static long MinMergeCost(IEnumerable<int> packets)
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
}`,
    example: '`[4, 3, 2, 6]` → `5 + 9 + 15 = 29`.'
  },
  {
    no: 30, title: 'Get Query Answers', pattern: 'Queries / Data structures (tentative)', confidence: 'tentative',
    problem: 'Assumed reading: given an array and queries `[l, r]` (inclusive, 0-based), return the sum of `a[l..r]` for each query.',
    approach: 'Build a prefix-sum array once; each query is then `prefix[r + 1] - prefix[l]` in O(1). If the array also changes between queries, switch to a Fenwick tree.',
    time: 'O(n + q)', space: 'O(n)',
    code: c`public static long[] GetQueryAnswers(int[] a, int[][] queries)
{
    var prefix = new long[a.Length + 1];
    for (var i = 0; i < a.Length; i++) prefix[i + 1] = prefix[i] + a[i];
    return queries.Select(q => prefix[q[1] + 1] - prefix[q[0]]).ToArray();
}`,
    example: '`a = [1, 2, 3, 4]`, queries `[[0,1],[1,3]]` → `[3, 9]`.'
  },
  {
    no: 31, title: 'toolchanger (from your screenshot)', pattern: 'Circular array / Simulation', confidence: 'likely',
    problem: 'Signature `toolchanger(List<string> tools, int startIndex, string target)`. The tools sit on a circular carousel. Each step moves one position left or right. Return the minimum number of moves from `startIndex` to reach `target` (−1 if absent; 0 if already there).',
    approach: 'For every index holding `target` take the shorter way round the circle: `min(d, n - d)` where `d = |i - startIndex|`. Return the minimum across all matches.',
    time: 'O(n)', space: 'O(1)',
    code: c`public static int Toolchanger(List<string> tools, int startIndex, string target)
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
}`,
    example: '`["ballendmill","keywaycutter","slotdrill","facemill"]`, start 1, `"ballendmill"` → `1`; `["ballendmill","facemill","keywaycutter","slotdrill"]`, start 1, `"slotdrill"` → `2`.'
  }
];
