import * as df from 'durable-functions';

/**
 * Conversation Turn Structure
 */
interface ConversationTurn {
  turn_number: number;
  agent_id: string;
  agent_name: string;
  message: string;
  structured_output: Record<string, any>;
  model_id?: string;
  model_version?: string;
}

/**
 * Orchestrator Input
 */
interface OrchestratorInput {
  runId: string;
  ideaText: string;
}

/**
 * Agent Pipeline Orchestrator
 * 
 * Executes the 5-agent evaluation pipeline sequentially:
 * 1. Refiner → structures the idea
 * 2. Reality Checker → challenges assumptions
 * 3. Assassin → veto power (early exit if veto=true)
 * 4. Cost Analyst → evaluates implementation costs
 * 5. Synthesizer → final recommendation
 * 
 * Updates run status in CosmosDB at key stages.
 */
const agentPipelineOrchestrator: df.OrchestrationHandler = function* (context) {
  const input: OrchestratorInput = context.df.getInput();
  const { runId, ideaText } = input;

  context.log(`AgentPipeline: Starting for run ${runId}`);
  
  const conversation: ConversationTurn[] = [];

  try {
    // Update status to AGENTS_RUNNING
    yield context.df.callActivity('UpdateRunStatus', {
      runId,
      status: 'AGENTS_RUNNING',
    });

    // Agent 1: Refiner
    context.log('AgentPipeline: Calling Refiner');
    const refinerTurn: ConversationTurn = yield context.df.callActivity('RefinerAgent', {
      ideaText,
      conversation,
    });
    conversation.push(refinerTurn);
    
    yield context.df.callActivity('AppendTurn', {
      runId,
      turn: refinerTurn,
    });

    // Agent 2: Reality Checker
    context.log('AgentPipeline: Calling Reality Checker');
    const realityTurn: ConversationTurn = yield context.df.callActivity('RealityCheckerAgent', {
      ideaText,
      conversation,
    });
    conversation.push(realityTurn);
    
    yield context.df.callActivity('AppendTurn', {
      runId,
      turn: realityTurn,
    });

    // Agent 3: Assassin
    context.log('AgentPipeline: Calling Assassin');
    const assassinTurn: ConversationTurn = yield context.df.callActivity('AssassinAgent', {
      ideaText,
      conversation,
    });
    conversation.push(assassinTurn);
    
    yield context.df.callActivity('AppendTurn', {
      runId,
      turn: assassinTurn,
    });

    // Check for veto
    if (assassinTurn.structured_output.veto === true) {
      context.log('AgentPipeline: VETO issued by Assassin - terminating pipeline');
      
      yield context.df.callActivity('FinalizeRun', {
        runId,
        status: 'VETOED',
        finalTurn: assassinTurn,
      });

      return {
        status: 'VETOED',
        conversation,
        vetoReason: assassinTurn.structured_output.kill_reason,
        failureMode: assassinTurn.structured_output.failure_mode,
      };
    }

    // Agent 4: Cost Analyst
    context.log('AgentPipeline: Calling Cost Analyst');
    const costTurn: ConversationTurn = yield context.df.callActivity('CostAnalystAgent', {
      ideaText,
      conversation,
    });
    conversation.push(costTurn);
    
    yield context.df.callActivity('AppendTurn', {
      runId,
      turn: costTurn,
    });

    // Update status to SYNTHESIZING
    yield context.df.callActivity('UpdateRunStatus', {
      runId,
      status: 'SYNTHESIZING',
    });

    // Agent 5: Synthesizer
    context.log('AgentPipeline: Calling Synthesizer');
    const synthesizerTurn: ConversationTurn = yield context.df.callActivity('SynthesizerAgent', {
      ideaText,
      conversation,
    });
    conversation.push(synthesizerTurn);
    
    yield context.df.callActivity('AppendTurn', {
      runId,
      turn: synthesizerTurn,
    });

    // Finalize as COMPLETED
    yield context.df.callActivity('FinalizeRun', {
      runId,
      status: 'COMPLETED',
      finalTurn: synthesizerTurn,
    });

    context.log('AgentPipeline: Pipeline completed successfully');

    return {
      status: 'COMPLETED',
      conversation,
      recommendation: synthesizerTurn.structured_output.recommendation,
      constrainedVersion: synthesizerTurn.structured_output.constrained_version,
      openRisks: synthesizerTurn.structured_output.open_risks,
    };

  } catch (error) {
    context.error('AgentPipeline: Pipeline failed', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    yield context.df.callActivity('UpdateRunStatus', {
      runId,
      status: 'FAILED',
      errorMessage,
    });

    throw error;
  }
};

df.app.orchestration('AgentPipeline', agentPipelineOrchestrator);
