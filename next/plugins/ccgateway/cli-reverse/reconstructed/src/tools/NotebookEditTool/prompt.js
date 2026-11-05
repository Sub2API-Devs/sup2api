/**
 * tools/NotebookEditTool/prompt.ts
 *
 * NotebookEdit 工具的描述与提示词（替换/插入/删除 Jupyter 单元格的用法），与旧版同文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/NotebookEditTool/prompt.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { READ } from "../FileReadTool/constants.js";

//@ chunk-5xgkngpb.js:4771287-4772030 placement
var NOTEBOOK_EDIT_DESCRIPTION = "Edit a cell in a Jupyter notebook \u2014 replace, insert, or delete.";
var NOTEBOOK_EDIT_PROMPT = `Replaces, inserts, or deletes a single cell in a Jupyter notebook (.ipynb file).

Usage:
- You must use the ${READ} tool on the notebook in this conversation before editing \u2014 this tool will fail otherwise.
- \`notebook_path\` must be an absolute path.
- \`cell_id\` is the \`id\` attribute shown in the ${READ} tool's \`<cell id="...">\` output. It is required for \`replace\` and \`delete\`.
- \`edit_mode\` defaults to \`replace\`. Use \`insert\` to add a new cell after the cell with the given \`cell_id\` (or at the beginning of the notebook if \`cell_id\` is omitted) \u2014 \`cell_type\` is required when inserting. Use \`delete\` to remove the cell.`;
export { NOTEBOOK_EDIT_DESCRIPTION, NOTEBOOK_EDIT_PROMPT };
