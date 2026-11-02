
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{mki}from"./chunk-aepeg2w5.js";import{$f}from"./chunk-e6aww6q8.js";function n$t(e,n,t){return()=>{if(t?.aborted===!0)return;let a=n();return e.getCommandQueueSnapshot().some(i)||e.someSubmissionInFlight((r)=>s(r,a))||(t===void 0?e.getInFlightDrainBatchStanding()!=="appended"&&e.someInFlightDrainCommand((r)=>s(r,a)):e.getInFlightDrainBatchStanding()==="passed-over"&&e.someInFlightDrainCommand(i))?void 0:a}}function s(e,n){return i(e)&&(e.uuid===void 0||n.findLast((t)=>t.uuid===e.uuid)===void 0)}function i(e){if(!$f(e))return!1;switch(e.mode){case"task-notification":return!1;case"poll-event":{let n=e.pollEvent?.provenance?.authority;return n!==void 0&&n!=="peer-agent"&&n!=="world-event"}case"prompt":case"bash":return mki(e);case"orphaned-permission":return!0}return!0}
export{n$t};
