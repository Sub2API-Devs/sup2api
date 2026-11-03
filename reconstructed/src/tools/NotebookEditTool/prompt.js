/**
 * tools/NotebookEditTool/prompt.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/NotebookEditTool/prompt.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";

//@ chunk-e6aww6q8.js:4662689-4663432 placement
var NOTEBOOK_EDIT_DESCRIPTION = "Edit a cell in a Jupyter notebook \u2014 replace, insert, or delete.",
  NOTEBOOK_EDIT_PROMPT = `Replaces, inserts, or deletes a single cell in a Jupyter notebook (.ipynb file).

Usage:
- You must use the ${FILE_READ_TOOL_NAME} tool on the notebook in this conversation before editing \u2014 this tool will fail otherwise.
- \`notebook_path\` must be an absolute path.
- \`cell_id\` is the \`id\` attribute shown in the ${FILE_READ_TOOL_NAME} tool's \`<cell id="...">\` output. It is required for \`replace\` and \`delete\`.
- \`edit_mode\` defaults to \`replace\`. Use \`insert\` to add a new cell after the cell with the given \`cell_id\` (or at the beginning of the notebook if \`cell_id\` is omitted) \u2014 \`cell_type\` is required when inserting. Use \`delete\` to remove the cell.`;

export { NOTEBOOK_EDIT_DESCRIPTION, NOTEBOOK_EDIT_PROMPT };
