export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type Priority = 'Core' | 'Strong' | 'Useful' | 'Legacy';
export type ProgressStatus = 'NotStarted' | 'InProgress' | 'Completed' | 'NeedsReview';
export type RecallRating = 'DidNotKnow' | 'Hard' | 'Okay' | 'Easy';
export type PlanStatus = 'Active' | 'Paused' | 'Completed' | 'Archived';
export type PlanDayStatus = 'Pending' | 'Completed' | 'Skipped';
export type QuestionFilter = 'All' | 'NotStarted' | 'InProgress' | 'Completed' | 'NeedsReview' | 'Favorites' | 'Mine';
export type ReviewBucket = 'Due' | 'Hard' | 'NeedsReview' | 'RecentlyIncorrect' | 'Favorites' | 'All';

export const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export interface Paged<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number; }
export interface ProgressSummary { total: number; completed: number; needsReview: number; inProgress: number; percent: number; }

export interface Contribution { createdByUserId?: string; addedBy?: string; canEdit: boolean; }
export interface Section extends Contribution { id: number; name: string; slug: string; description?: string; priority: Priority; isUserCreated: boolean; sortOrder: number; topicCount: number; progress: ProgressSummary; }
export interface SectionDetail { section: Section; topics: Topic[]; }
export interface Topic extends Contribution { id: number; sectionId: number; sectionName: string; name: string; slug: string; description?: string; scope?: string; priority: Priority; isUserCreated: boolean; sortOrder: number; progress: ProgressSummary; }

export interface Reference { title: string; url: string; }
export interface UserState { status: ProgressStatus; lastRating?: RecallRating; isFavorite: boolean; personalDifficulty?: Difficulty; nextReviewAt?: string; reviewCount: number; note?: string; }
export interface QuestionSummary extends Contribution { id: number; topicId: number; topicName: string; sectionId: number; sectionName: string; text: string; difficulty: Difficulty; isUserCreated: boolean; status: ProgressStatus; isFavorite: boolean; lastRating?: RecallRating; tags: string[]; }
export interface TopicRef { id: number; name: string; sectionId: number; sectionName: string; }
export interface QuestionDetail extends Contribution {
  id: number; externalId?: string; topicId: number; topicName: string; sectionId: number; sectionName: string; text: string;
  difficulty: Difficulty; questionType?: string; isUserCreated: boolean; answerMarkdown: string; followUpsMarkdown?: string;
  tags: string[]; references: Reference[]; additionalTopics: TopicRef[]; userState: UserState; previousId?: number; nextId?: number;
  createdAt: string; updatedAt: string;
}
export interface SaveQuestion {
  topicId?: number | null; sectionId?: number | null; newSectionName?: string | null; newTopicName?: string | null;
  text: string; answer: string; difficulty: Difficulty; tags: string[]; references: Reference[]; additionalTopicIds?: number[];
}
export interface UpdateProgress { status?: ProgressStatus; rating?: RecallRating; isFavorite?: boolean; personalDifficulty?: Difficulty; }
export interface Note { id: number; questionId: number; questionText: string; body: string; updatedAt: string; }

export interface SearchResult {
  query: string;
  sections: { id: number; name: string; topicCount: number }[];
  topics: { id: number; name: string; sectionId: number; sectionName: string; questionCount: number }[];
  questions: Paged<QuestionSummary>;
  algorithms: AlgorithmSummary[];
}

export interface AlgorithmSummary extends Contribution { id: number; slug: string; category: string; name: string; timeComplexity: string; spaceComplexity: string; }
export interface AlgorithmDetail extends AlgorithmSummary {
  problemStatement: string; explanation: string; approach: string; implementation: string; example: string;
  interviewQuestions: string; commonMistakes: string; previousSlug?: string; nextSlug?: string;
}

export interface Plan {
  id: number; name: string; durationDays: number; questionsPerDay: number; studyMinutesPerDay: number; startDate: string;
  status: PlanStatus; isCurrent: boolean; currentDay: number; sectionIds: number[]; topicIds: number[]; includeCompleted: boolean;
  progress: ProgressSummary; unscheduledCount: number;
}
export interface CreatePlan { name: string; durationDays: number; questionsPerDay: number; studyMinutesPerDay: number; startDate?: string | null; sectionIds: number[]; topicIds: number[]; includeCompleted: boolean; makeCurrent: boolean; }
export interface PlanDaySummary { id: number; dayNumber: number; date: string; status: PlanDayStatus; title?: string; total: number; completed: number; topicNames: string[]; isToday: boolean; isPast: boolean; }
export interface PlanItem { id: number; questionId: number; questionText: string; topicId: number; topicName: string; sectionName: string; difficulty: Difficulty; status: ProgressStatus; isReview: boolean; sortOrder: number; }
export interface PlanDayDetail { day: PlanDaySummary; topics: { topicId: number; topicName: string; sectionName: string; total: number; completed: number }[]; items: PlanItem[]; }

export interface Dashboard {
  currentPlan?: Plan; today?: PlanDayDetail; streak: number; completedToday: number; overall: ProgressSummary;
  topicsCompleted: number; topicsTotal: number; questionsRemaining: number; overdueItems: number; dueForReview: number; needsReview: number;
  continue?: { questionId: number; questionText: string; topicName: string; reason: string };
  sections: Section[];
}
export interface ReviewOverview { totalNeedingRevision: number; hard: number; needsReview: number; recentlyIncorrect: number; dueNow: number; favorites: number; }
export interface OverallProgress { overall: ProgressSummary; sections: Section[]; topicsCompleted: number; topicsTotal: number; activity: { date: string; count: number }[]; }

export interface ApiError { code: string; message: string; details?: Record<string, string[]>; }

export interface Account { id: string; username: string; email: string; displayName: string; isAdmin: boolean; }
export interface Feedback { id: number; kind: string; contentId: number; userId: string; addedBy: string; message: string; status: string; adminResponse?: string; }
export interface AdminUser { id: string; username: string; displayName: string; email: string; completed: number; reviews: number; plans: number; contributions: number; }
export type SaveAlgorithm = Pick<AlgorithmDetail, 'category'|'name'|'problemStatement'|'explanation'|'approach'|'timeComplexity'|'spaceComplexity'|'implementation'|'example'|'interviewQuestions'|'commonMistakes'>;
export interface AdminProgress { progress: {questionId: number; question: string; status: string; reviewCount: number; isFavorite: boolean; nextReviewAt?: string}[]; plans: {id: number; name: string; status: string; durationDays: number}[]; activity: {questionId: number; kind: string; occurredAt: string}[]; }
