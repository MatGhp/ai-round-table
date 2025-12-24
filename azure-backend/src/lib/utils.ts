import { format } from 'date-fns';

/**
 * Generate a unique run ID with format: run_YYYY-MM-DD_NNNN
 * Example: run_2025-12-24_0001
 */
export function generateRunId(): string {
  const date = format(new Date(), 'yyyy-MM-dd');
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `run_${date}_${random}`;
}

/**
 * Generate a preflight ID with format: pf_YYYY-MM-DD_NNNN
 */
export function generatePreflightId(): string {
  const date = format(new Date(), 'yyyy-MM-dd');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `pf_${date}_${random}`;
}

/**
 * Validate idea text length
 */
export function validateIdeaText(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Idea text cannot be empty' };
  }
  if (text.length < 10) {
    return { valid: false, error: 'Idea text must be at least 10 characters' };
  }
  if (text.length > 5000) {
    return { valid: false, error: 'Idea text must not exceed 5000 characters' };
  }
  return { valid: true };
}

/**
 * Validate conversational message length (max 700 chars)
 */
export function validateConversationalMessage(message: string): { valid: boolean; error?: string } {
  if (message.length > 700) {
    return { valid: false, error: 'Conversational message exceeds 700 characters' };
  }
  return { valid: true };
}

/**
 * Build conversation history for agent prompt
 */
export function buildConversationHistory(conversation: any[]): string {
  if (conversation.length === 0) {
    return 'No previous conversation.';
  }

  return conversation
    .map((turn) => {
      return `**${turn.agent_name} (Turn ${turn.turn_number}):**\n${turn.conversational_message}\n`;
    })
    .join('\n');
}

/**
 * Calculate elapsed time in milliseconds
 */
export function calculateDuration(startTime: Date): number {
  return Date.now() - startTime.getTime();
}
