import { QUESTIONS, PilierCode } from '@/config/questionnaireConfig';

export function computePilierCompletion(pilierCode: PilierCode, qstData: Record<string, string>) {
  const questions = QUESTIONS.filter(q => q.pilier === pilierCode);
  if (questions.length === 0) return 0;
  const filled = questions.filter(q => {
    const v = qstData[q.champ_id];
    return v !== undefined && v !== null && v !== '';
  }).length;
  return Math.round((filled / questions.length) * 100);
}
