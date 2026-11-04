
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Fe}from"./chunk-bwbq4xvm.js";function Uen(e){if(e.toolName===Fe){if(!e.ruleContent)return{prefix:"Any Bash command"};if(e.ruleContent.endsWith(":*")||e.ruleContent.endsWith(" *"))return{prefix:"Any Bash command starting with ",emphasis:e.ruleContent.slice(0,-2)};return{prefix:"The Bash command ",emphasis:e.ruleContent}}if(!e.ruleContent)return{prefix:"Any use of the ",emphasis:e.toolName,suffix:" tool"};return null}
export{Uen};
