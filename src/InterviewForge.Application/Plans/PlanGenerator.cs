using InterviewForge.Domain;

namespace InterviewForge.Application.Plans;

public sealed record PlanCandidate(
    int QuestionId, int TopicId, string TopicName, int SectionId,
    int SectionOrder, int TopicOrder, Priority TopicPriority, Difficulty Difficulty, int QuestionOrder, bool IsCompleted);

public sealed record GeneratedDay(int DayNumber, string Title, IReadOnlyList<PlanCandidate> Items);

public sealed record GeneratedPlan(IReadOnlyList<GeneratedDay> Days, int Unscheduled);

/// <summary>
/// Pure, deterministic plan generator (no database access, fully unit-testable).
///
/// Ordering respects the hierarchy: section order (skill-matrix progression, ending with
/// Interview Scenarios) → topic priority (Core before Strong/Useful/Legacy) → topic order →
/// difficulty → question order. Topics are kept contiguous, so a day contains a few coherent
/// topics rather than random questions.
///
/// Daily capacity is min(questionsPerDay, studyMinutes / estimated minutes per question).
/// Load is spread evenly across the available days. A topic is not split across days when it would
/// fit entirely in the next day and the current day is already at least half full.
/// </summary>
public static class PlanGenerator
{
    public static int EstimatedMinutes(Difficulty d) => d switch
    {
        Difficulty.Beginner => 3,
        Difficulty.Intermediate => 5,
        Difficulty.Advanced => 6,
        Difficulty.Expert => 8,
        _ => 5
    };

    public static GeneratedPlan Generate(IEnumerable<PlanCandidate> candidates, int days, int questionsPerDay, int studyMinutesPerDay,
        bool includeCompleted = false, int firstDayNumber = 1)
    {
        if (days <= 0) return new GeneratedPlan(Array.Empty<GeneratedDay>(), candidates.Count());

        var ordered = candidates
            .Where(c => includeCompleted || !c.IsCompleted)
            .DistinctBy(c => c.QuestionId)
            .OrderBy(c => c.SectionOrder).ThenBy(c => c.SectionId)
            .ThenBy(c => c.TopicPriority).ThenBy(c => c.TopicOrder).ThenBy(c => c.TopicId)
            .ThenBy(c => c.Difficulty).ThenBy(c => c.QuestionOrder).ThenBy(c => c.QuestionId)
            .ToList();

        // Topic blocks (contiguous)
        var blocks = ordered.GroupBy(c => c.TopicId).Select(g => g.ToList()).ToList();

        var minutesCap = studyMinutesPerDay <= 0 ? int.MaxValue : studyMinutesPerDay;
        var hardCap = Math.Max(1, questionsPerDay);
        var target = Math.Max(1, Math.Min(hardCap, (int)Math.Ceiling(ordered.Count / (double)days)));

        var result = new List<List<PlanCandidate>>();
        var current = new List<PlanCandidate>();
        var currentMinutes = 0;

        bool DayFull(PlanCandidate next) =>
            current.Count >= target || (current.Count > 0 && currentMinutes + EstimatedMinutes(next.Difficulty) > minutesCap);

        void NewDay()
        {
            result.Add(current);
            current = new List<PlanCandidate>();
            currentMinutes = 0;
        }

        foreach (var block in blocks)
        {
            if (result.Count >= days) break;
            var remainingCapacity = target - current.Count;
            if (current.Count >= target / 2.0 && block.Count > remainingCapacity && block.Count <= target && result.Count + 1 < days)
                NewDay();

            foreach (var item in block)
            {
                if (DayFull(item))
                {
                    NewDay();
                    if (result.Count >= days) break;
                }
                current.Add(item);
                currentMinutes += EstimatedMinutes(item.Difficulty);
            }
        }
        if (current.Count > 0 && result.Count < days) result.Add(current);

        var scheduled = result.Sum(d => d.Count);
        var generated = result.Select((items, i) => new GeneratedDay(firstDayNumber + i, Title(items), items)).ToList();
        return new GeneratedPlan(generated, ordered.Count - scheduled);
    }

    private static string Title(IReadOnlyList<PlanCandidate> items) =>
        string.Join(", ", items.Select(i => i.TopicName).Distinct().Take(3)) +
        (items.Select(i => i.TopicId).Distinct().Count() > 3 ? " …" : "");
}
