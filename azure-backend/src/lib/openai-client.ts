import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { InvocationContext } from '@azure/functions';

/**
 * Singleton Azure OpenAI client instance
 */
let openaiClient: OpenAIClient | null = null;

/**
 * Get or create the Azure OpenAI client instance
 */
function getOpenAIClient(): OpenAIClient {
  if (!openaiClient) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_KEY;

    if (!endpoint || !apiKey) {
      throw new Error(
        'Azure OpenAI credentials not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY environment variables.'
      );
    }

    openaiClient = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
  }

  return openaiClient;
}

/**
 * Response format for structured outputs using JSON schema
 */
export interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    description?: string;
    schema: Record<string, any>;
    strict?: boolean;
  };
}

/**
 * Options for calling an agent with Azure OpenAI
 */
export interface AgentCallOptions {
  systemPrompt: string;
  userPrompt: string;
  responseFormat: ResponseFormat;
  temperature?: number;
  maxTokens?: number;
  context?: InvocationContext;
}

/**
 * Call Azure OpenAI with structured output format
 * 
 * @param options - Agent call configuration
 * @returns Parsed JSON response matching the schema
 */
export async function callAgent<T = any>(options: AgentCallOptions): Promise<T> {
  const {
    systemPrompt,
    userPrompt,
    temperature = 0.2,
    maxTokens = 2000,
    context,
  } = options;

  const client = getOpenAIClient();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

  const startTime = Date.now();
  
  if (context) {
    context.log(`Calling Azure OpenAI (deployment: ${deployment})`);
  }

  try {
    const result = await client.getChatCompletions(
      deployment,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature,
        maxTokens,
        responseFormat: {
          type: 'json_object',
        },
      }
    );

    const duration = Date.now() - startTime;
    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from Azure OpenAI');
    }

    if (context) {
      context.log(`Azure OpenAI response received (${duration}ms, ${result.usage?.totalTokens || 0} tokens)`);
    }

    const parsed = JSON.parse(content);
    return parsed as T;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (context) {
      context.error(`Azure OpenAI call failed after ${duration}ms: ${error}`);
    }

    // Rethrow with more context
    if (error instanceof Error) {
      throw new Error(`Azure OpenAI call failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Call Azure OpenAI with retry logic for rate limits and transient errors
 * 
 * @param options - Agent call configuration
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Parsed JSON response matching the schema
 */
export async function callAgentWithRetry<T = any>(
  options: AgentCallOptions,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callAgent<T>(options);
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a rate limit error (429)
      const is429 = lastError.message.includes('429') || lastError.message.includes('rate limit');
      
      // Check if it's a transient error (5xx)
      const is5xx = /5\d{2}/.test(lastError.message);
      
      // Only retry on rate limits or server errors
      if (!is429 && !is5xx) {
        throw lastError;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate exponential backoff: 2^attempt * 1000ms
      const backoffMs = Math.pow(2, attempt) * 1000;
      
      if (options.context) {
        options.context.warn(
          `Azure OpenAI call failed (attempt ${attempt}/${maxRetries}). Retrying in ${backoffMs}ms...`
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  throw lastError || new Error('callAgentWithRetry failed with no error captured');
}

/**
 * Validate that required Azure OpenAI environment variables are set
 * 
 * @throws Error if required variables are missing
 */
export function validateOpenAIConfig(): void {
  const required = ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_KEY', 'AZURE_OPENAI_DEPLOYMENT'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required Azure OpenAI environment variables: ${missing.join(', ')}`
    );
  }
}
