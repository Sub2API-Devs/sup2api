// The management endpoints' User-Agent is Claude Code's own `Ds()`:
// `claude-code/<version>`. It is not the model request's client User-Agent
// (`claude-cli/<version> (external, ...)`, request-agent.js): the two come from
// different functions in Claude Code, and these endpoints carry this one. The
// native binding is the version module's own function, never a copy here.
import { userAgent as nativeUserAgent } from './native-management.js';

export const managementUserAgent = nativeUserAgent;
