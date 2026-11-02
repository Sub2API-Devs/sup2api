
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{v}from"./chunk-aepeg2w5.js";import{i}from"./chunk-jhrww53q.js";function t(){return process.argv.includes("--agent-teams")}function Ko(){if(!i.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS&&!t())return!1;if(!v("tengu_amber_flint",!0))return!1;return!0}async function e2o(){if(!Ko())return;let{captureTeammateModeSnapshot:e}=await import("./chunk-s90rfvdh.js");e()}
export{Ko,e2o};
