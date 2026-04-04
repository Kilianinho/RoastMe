import type { RoastResult, Question } from '@/types/database';

/**
 * Local compatibility score calculation
 * Mirror of the server-side compute-matches Edge Function
 */
export function computeLocalCompatibility(
  profileAResults: RoastResult[],
  profileBResults: RoastResult[],
  questions: Question[]
): { score: number; commonAnswers: number } {
  let totalWeight = 0;
  let matchedWeight = 0;
  let commonAnswers = 0;

  for (const resultA of profileAResults) {
    const resultB = profileBResults.find(
      (r) => r.question_id === resultA.question_id
    );
    if (!resultB) continue;

    const question = questions.find((q) => q.id === resultA.question_id);
    if (!question) continue;

    const weight = question.weight_for_matching;
    totalWeight += weight;

    if (
      resultA.top_answer &&
      resultB.top_answer &&
      resultA.top_answer === resultB.top_answer
    ) {
      const confidenceA = resultA.top_answer_percentage ?? 0;
      const confidenceB = resultB.top_answer_percentage ?? 0;
      const avgConfidence = (confidenceA + confidenceB) / 2;
      matchedWeight += weight * (avgConfidence / 100);
      commonAnswers++;
    }
  }

  const score = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  return { score, commonAnswers };
}
