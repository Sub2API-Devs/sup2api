/**
 * tools/WorkflowTool/constants.ts
 *
 * Workflow 工具名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-39r7st4c.js (1)
 * attribution: placement 1
 */

//@ chunk-39r7st4c.js:191-299 placement
var WORKFLOW_TOOL_NAME = "Workflow",
  WORKFLOW_SUBAGENT_TYPE = "workflow-subagent",
  WORKFLOW_TRANSCRIPT_SUBDIR = "workflows",
  WORKFLOW_RUN_ID_PATTERN = /^wf_[a-z0-9-]{6,}$/,
  WORKFLOW_JOURNAL_HOST_COPY_FLAG = "tengu_amber_ledger";

export {
  WORKFLOW_TOOL_NAME,
  WORKFLOW_RUN_ID_PATTERN,
  WORKFLOW_SUBAGENT_TYPE,
  WORKFLOW_JOURNAL_HOST_COPY_FLAG,
  WORKFLOW_TRANSCRIPT_SUBDIR,
};
