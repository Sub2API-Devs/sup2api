/**
 * tools/ProjectsTool/activityLabels.ts
 *
 * 2.1.316 新增：Projects 工具活动标签
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y2k9w57g.js (1)
 * attribution: placement 1
 */
import { resolveLocalPath } from "./inputSchema.js";

//@ chunk-y2k9w57g.js:20285-20860 placement
function projectsActivityLabel(input) {
  switch (input?.method) {
    case "project_info":
      return "Read project info";
    case "project_read":
      return input.path ? `Read ${input.path}` : "Read project doc";
    case "project_search":
      return input.query ? `Search "${input.query}"` : "Search project";
    case "project_write": {
      let path = input.path ?? "?";
      let localSuffix = input.local_path ? ` from ${resolveLocalPath(input.local_path)}` : "";
      return `Write ${path}${localSuffix}`;
    }
    case "project_delete":
      return input.path ? `Delete ${input.path}` : "Delete project doc";
    case "project_memory_list":
      return "List project memory";
    case "project_memory_read":
      return input.path ? `Read memory ${input.path}` : "Read project memory file";
    default:
      return "Project";
  }
}
export { projectsActivityLabel };
