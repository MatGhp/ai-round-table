import * as df from 'durable-functions';

// Import all agent activities
import { refinerAgent } from './refiner-agent';
import { realityCheckerAgent } from './reality-agent';
import { assassinAgent } from './assassin-agent';
import { costAnalystAgent } from './cost-agent';
import { synthesizerAgent } from './synthesizer-agent';

// Register all agent activities
df.app.activity('RefinerAgent', { handler: refinerAgent });
df.app.activity('RealityCheckerAgent', { handler: realityCheckerAgent });
df.app.activity('AssassinAgent', { handler: assassinAgent });
df.app.activity('CostAnalystAgent', { handler: costAnalystAgent });
df.app.activity('SynthesizerAgent', { handler: synthesizerAgent });
