/**
 * tools/WorkflowTool/constants.ts
 *
 * Workflow 工具名。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8jmzq9hw.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-8jmzq9hw.js:191-299 placement
var WORKFLOW_TOOL_NAME = "Workflow";
var WORKFLOW_SUBAGENT_TYPE = "workflow-subagent";
var WORKFLOW_TRANSCRIPT_SUBDIR = "workflows";
var WORKFLOW_RUN_ID_PATTERN = /^wf_[a-z0-9-]{6,}$/;
var WORKFLOW_JOURNAL_HOST_COPY_FLAG = "tengu_amber_ledger";
export {
  WORKFLOW_TOOL_NAME,
  WORKFLOW_RUN_ID_PATTERN,
  WORKFLOW_SUBAGENT_TYPE,
  WORKFLOW_JOURNAL_HOST_COPY_FLAG,
  WORKFLOW_TRANSCRIPT_SUBDIR,
};
