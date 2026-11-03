/**
 * services/mcpServe/projectAgents.ts
 *
 * 2.1.316 新增：mcp serve 列出项目代理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (3)
 * attribution: placement 3
 */
import { join } from "path";
import { realpath, readdir } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string, record, unknown, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { clearAgentDefinitionsCache, parseAgentFromMarkdown } from "../../tools/AgentTool/loadAgentsDir.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { loadMarkdownFilesCached, getProjectDirsUpToHome } from "../../utils/markdownConfigLoader.js";
import { getOriginalCwd, getAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { isPathAbsent, getErrnoCode } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-wy9dbk5f.js:32313-32560 placement
/**
 * 表示“无上限”的限制对象。
 */
var LISTPROJECTAGENTS = "ListProjectAgents";
var MAX_AGENTS_BYTES = 8388608;
var MAX_AGENT_VALUES = 32768;
var MAX_AGENTS = 2000;
var MAX_AGENT_DEPTH = 1000;
var listProjectAgentsResultSchema = DoctorLazy(() =>
  u({
    agents: array(
      u({
        filePath: string(),
        baseDir: string(),
        frontmatter: record(string(), unknown()),
        content: string(),
        fromAdditionalDirectory: M().optional(),
      }),
    ).max(MAX_AGENTS),
    cut: M(),
  }),
);
var UNBOUNDED_LIMITS = {
  bytes: 1 / 0,
  values: 1 / 0,
  levels: 1 / 0,
};
//@ chunk-wy9dbk5f.js:32560-33069 placement = reorderBidi (0.534)
function measureJsonSize(e, r = 0, n = new Map()) {
  if (typeof e !== "object" || e === null)
    return {
      bytes: Buffer.byteLength(jsonStringifyRaw(e)),
      values: 0,
      levels: 0,
    };
  let s = n.get(e);
  if (r + (s?.levels ?? 1) > MAX_AGENT_DEPTH) return UNBOUNDED_LIMITS;
  if (s !== undefined) return s;
  n.set(e, UNBOUNDED_LIMITS);
  let a = Array.isArray(e) ? e : Object.values(e);
  let max = Math.max(a.length + 1, 2);
  if (a !== e) for (let key of Object.keys(e)) max += Buffer.byteLength(jsonStringifyRaw(key)) + 1;
  let values = a.length;
  let g = 1;
  for (let S of a) {
    let C = measureJsonSize(S, r + 1, n);
    max += C.bytes;
    values += C.values;
    if (max > MAX_AGENTS_BYTES) return UNBOUNDED_LIMITS;
    g = Math.max(g, C.levels + 1);
  }
  let h = {
    bytes: max,
    values,
    levels: g,
  };
  n.set(e, h);
  return h;
}
//@ chunk-wy9dbk5f.js:33069-34460 placement
async function serveListProjectAgents(e, r, n) {
  if (isCustomizationDisabled("agents"))
    return {
      summary: "agents are off",
      output: {
        agents: [],
        cut: false,
      },
    };
  clearAgentDefinitionsCache();
  invalidateCommandNames();
  let hostState = getHostState();
  let markdownScansGivenUp = hostState.markdownScansGivenUp;
  let markdownFiles = await loadMarkdownFilesCached("agents", getOriginalCwd(), n.toolUseContext().storageV5);
  r.throwIfAborted();
  let y = [];
  let g = 0;
  let h = 0;
  let S = hostState.markdownScansGivenUp !== markdownScansGivenUp;
  let C = [];
  if (isSettingSourceEnabled("projectSettings") && !isRestrictedToPluginOnly("agents")) {
    C.push(...(await getProjectDirsUpToHome("agents", getOriginalCwd())));
    for (let w of getAdditionalDirectoriesForClaudeMd()) C.push(join(w, ".claude", "agents"));
  }
  let b = new Set();
  for (let w of new Set(markdownFiles.map((markdownFile) => markdownFile.baseDir))) b.add(await realpath(w));
  for (let w of C)
    try {
      let O = b.has(await realpath(w));
      for (let P of await readdir(w, {
        withFileTypes: true,
      }))
        S ||= P.name.endsWith(".md") && !P.isDirectory() && !O;
    } catch (error) {
      if (!isPathAbsent(error)) {
        S = true;
        logForDebugging(`ListProjectAgents: ${w} is there and cannot be read: ${getErrnoCode(error)}`, {
          level: "error",
        });
      }
    }
  r.throwIfAborted();
  let R = markdownFiles.toSorted(
    (w, O) => Number(w.fromAdditionalDirectory ?? false) - Number(O.fromAdditionalDirectory ?? false),
  );
  let x = new Set();
  for (let w of R) {
    let { filePath, baseDir, frontmatter, content, source } = w;
    if (source !== "projectSettings") continue;
    let H = {
      filePath,
      baseDir,
      frontmatter,
      content,
      ...(w.fromAdditionalDirectory && {
        fromAdditionalDirectory: true,
      }),
    };
    let Y = measureJsonSize(H);
    if (Y !== UNBOUNDED_LIMITS && !parseAgentFromMarkdown(filePath, baseDir, frontmatter, content, source)) {
      if (!x.has(w)) {
        let Q = {
          ...w,
          frontmatter: {},
          content: "",
        };
        x.add(Q);
        R.push(Q);
        continue;
      }
      if (!S) continue;
    }
    if (y.length === MAX_AGENTS || g + Y.bytes > MAX_AGENTS_BYTES || h + Y.values + 1 > MAX_AGENT_VALUES) {
      S = true;
      continue;
    }
    g += Y.bytes;
    h += Y.values + 1;
    y.push(H);
  }
  return {
    summary: `${y.length} agents${S ? ", cut at a limit" : ""}`,
    output: {
      agents: y,
      cut: S,
    },
  };
}
export { LISTPROJECTAGENTS, serveListProjectAgents };
