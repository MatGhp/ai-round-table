import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { generatePreflightId, validateIdeaText } from '../lib/utils';
import { PreflightResponseSchema } from '../lib/schemas';

const PreflightRequestSchema = z.object({
  idea_text: z.string().min(1).max(5000),
  preset_id: z.string().default('default'),
});

/**
 * POST /api/preflight
 * Validates idea text and returns clarification questions if needed
 */
export async function preflight(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Preflight check initiated');

  try {
    // Parse request body
    const body = await request.json();
    const parsed = PreflightRequestSchema.safeParse(body);

    if (!parsed.success) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid request',
          details: parsed.error.errors,
        },
      };
    }

    const { idea_text } = parsed.data;

    // Validate idea text
    const validation = validateIdeaText(idea_text);
    if (!validation.valid) {
      return {
        status: 400,
        jsonBody: {
          error: validation.error,
        },
      };
    }

    // Generate preflight ID
    const preflight_id = generatePreflightId();

    // Rule-based clarification logic
    const questions = generateClarificationQuestions(idea_text);

    const response = {
      preflight_id,
      ready: questions.length === 0,
      questions,
    };

    // Validate response against schema
    const validatedResponse = PreflightResponseSchema.parse(response);

    context.log(`Preflight complete: ${questions.length} questions generated`);

    return {
      status: 200,
      jsonBody: validatedResponse,
    };
  } catch (error: any) {
    context.error('Preflight error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

/**
 * Rule-based clarification question generator
 * Returns i18n keys for questions
 */
function generateClarificationQuestions(ideaText: string): any[] {
  const questions: any[] = [];
  const lowerText = ideaText.toLowerCase();

  // Rule 1: Very short ideas (< 50 chars)
  if (ideaText.length < 50) {
    questions.push({
      id: 'q_detail',
      question: 'questions.detail.question',
      required: true,
      default_answers: [
        'questions.detail.answers.addContext',
        'questions.detail.answers.provideExamples',
      ],
    });
  }

  // Rule 2: No mention of target user
  const userKeywords = ['user', 'customer', 'client', 'audience', 'people', 'for'];
  const hasUserMention = userKeywords.some((keyword) => lowerText.includes(keyword));
  
  if (!hasUserMention) {
    questions.push({
      id: 'q_target_user',
      question: 'questions.targetUser.question',
      required: true,
      default_answers: [
        'questions.targetUser.answers.productManager',
        'questions.targetUser.answers.soloFounder',
        'questions.targetUser.answers.techLead',
      ],
    });
  }

  // Rule 3: No mention of problem/solution
  const problemKeywords = ['problem', 'issue', 'challenge', 'pain', 'solve', 'fix'];
  const hasProblemMention = problemKeywords.some((keyword) => lowerText.includes(keyword));

  if (!hasProblemMention) {
    questions.push({
      id: 'q_problem',
      question: 'questions.problem.question',
      required: false,
      default_answers: [
        'questions.problem.answers.efficiency',
        'questions.problem.answers.cost',
        'questions.problem.answers.userExperience',
      ],
    });
  }

  // Rule 4: Vague scope (contains words like "platform", "system", "ecosystem")
  const vagueKeywords = ['platform', 'system', 'ecosystem', 'framework', 'infrastructure'];
  const hasVagueScope = vagueKeywords.some((keyword) => lowerText.includes(keyword));

  if (hasVagueScope) {
    questions.push({
      id: 'q_scope',
      question: 'questions.scope.question',
      required: true,
      default_answers: [
        'questions.scope.answers.mvp',
        'questions.scope.answers.fullProduct',
        'questions.scope.answers.prototype',
      ],
    });
  }

  return questions;
}

// Register function
app.http('preflight', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: preflight,
});
