/**
 * tools/ProjectsTool/activityLabels.ts
 *
 * 2.1.316 新增：Projects 工具活动标签
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eg496hkq.js (1)
 * attribution: placement 1
 */
import { resolveLocalPath } from "./inputSchema.js";

//@ chunk-eg496hkq.js:19077-19652 placement
function projectsActivityLabel(e) {
  switch (e?.method) {
    case "project_info":
      return "Read project info";
    case "project_read":
      return e.path ? `Read ${e.path}` : "Read project doc";
    case "project_search":
      return e.query ? `Search "${e.query}"` : "Search project";
    case "project_write": {
      let path = e.path ?? "?";
      let r = e.local_path ? ` from ${resolveLocalPath(e.local_path)}` : "";
      return `Write ${path}${r}`;
    }
    case "project_delete":
      return e.path ? `Delete ${e.path}` : "Delete project doc";
    case "project_memory_list":
      return "List project memory";
    case "project_memory_read":
      return e.path ? `Read memory ${e.path}` : "Read project memory file";
    default:
      return "Project";
  }
}
export { projectsActivityLabel };
