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
import { join, join as join_2 } from "path";
import { realpath, realpath as realpath_2, readdir } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u as u_2, A, o, pe, oe, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { clearAgentDefinitionsCache, parseAgentFromMarkdown } from "../../tools/AgentTool/loadAgentsDir.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { loadMarkdownFilesCached, getProjectDirsUpToHome } from "../../utils/markdownConfigLoader.js";
import { getOriginalCwd, getAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { isPathAbsent, getErrnoCode } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-wy9dbk5f.js:32313-32560 placement
var LISTPROJECTAGENTS = "ListProjectAgents",
  Bt = 8388608,
  Wn = 32768,
  Gt = 2000,
  Vn = 1000,
  Ac = DoctorLazy(() =>
    u_2({
      agents: A(
        u_2({
          filePath: o(),
          baseDir: o(),
          frontmatter: pe(o(), oe()),
          content: o(),
          fromAdditionalDirectory: M().optional(),
        }),
      ).max(Gt),
      cut: M(),
    }),
  ),
  we = { bytes: 1 / 0, values: 1 / 0, levels: 1 / 0 };
//@ chunk-wy9dbk5f.js:32560-33069 placement = reorderBidi (0.534)
function measureJsonSize(e, r = 0, n = new Map()) {
  if (typeof e !== "object" || e === null)
    return { bytes: Buffer.byteLength(jsonStringifyRaw(e)), values: 0, levels: 0 };
  let s = n.get(e);
  if (r + (s?.levels ?? 1) > Vn) return we;
  if (s !== void 0) return s;
  n.set(e, we);
  let a = Array.isArray(e) ? e : Object.values(e),
    max = Math.max(a.length + 1, 2);
  if (a !== e) for (let S of Object.keys(e)) max += Buffer.byteLength(jsonStringifyRaw(S)) + 1;
  let y = a.length,
    g = 1;
  for (let S of a) {
    let C = measureJsonSize(S, r + 1, n);
    if (((max += C.bytes), (y += C.values), max > Bt)) return we;
    g = Math.max(g, C.levels + 1);
  }
  let h = { bytes: max, values: y, levels: g };
  return (n.set(e, h), h);
}
//@ chunk-wy9dbk5f.js:33069-34460 placement
async function serveListProjectAgents(e, r, n) {
  if (isCustomizationDisabled("agents"))
    return { summary: "agents are off", output: { agents: [], cut: !1 } };
  (clearAgentDefinitionsCache(), or());
  let s = getHostState(),
    markdownScansGivenUp = s.markdownScansGivenUp,
    c = await loadMarkdownFilesCached("agents", getOriginalCwd(), n.toolUseContext().storageV5);
  r.throwIfAborted();
  let y = [],
    g = 0,
    h = 0,
    S = s.markdownScansGivenUp !== markdownScansGivenUp,
    C = [];
  if (isSettingSourceEnabled("projectSettings") && !isRestrictedToPluginOnly("agents")) {
    C.push(...(await getProjectDirsUpToHome("agents", getOriginalCwd())));
    for (let w of getAdditionalDirectoriesForClaudeMd()) C.push(join_2(w, ".claude", "agents"));
  }
  let b = new Set();
  for (let w of new Set(c.map((O) => O.baseDir))) b.add(await realpath_2(w));
  for (let w of C)
    try {
      let O = b.has(await realpath_2(w));
      for (let P of await readdir(w, { withFileTypes: !0 }))
        S ||= P.name.endsWith(".md") && !P.isDirectory() && !O;
    } catch (error) {
      if (!isPathAbsent(error))
        ((S = !0),
          logForDebugging(`ListProjectAgents: ${w} is there and cannot be read: ${getErrnoCode(error)}`, {
            level: "error",
          }));
    }
  r.throwIfAborted();
  let toSorted = c.toSorted(
      (w, O) => Number(w.fromAdditionalDirectory ?? !1) - Number(O.fromAdditionalDirectory ?? !1),
    ),
    x = new Set();
  for (let w of toSorted) {
    let {
      filePath: filePath,
      baseDir: baseDir,
      frontmatter: frontmatter,
      content: content,
      source: source,
    } = w;
    if (source !== "projectSettings") continue;
    let H = {
        filePath: filePath,
        baseDir: baseDir,
        frontmatter: frontmatter,
        content: content,
        ...(w.fromAdditionalDirectory && { fromAdditionalDirectory: !0 }),
      },
      Y = measureJsonSize(H);
    if (Y !== we && !parseAgentFromMarkdown(filePath, baseDir, frontmatter, content, source)) {
      if (!x.has(w)) {
        let Q = { ...w, frontmatter: {}, content: "" };
        (x.add(Q), toSorted.push(Q));
        continue;
      }
      if (!S) continue;
    }
    if (y.length === Gt || g + Y.bytes > Bt || h + Y.values + 1 > Wn) {
      S = !0;
      continue;
    }
    ((g += Y.bytes), (h += Y.values + 1), y.push(H));
  }
  return { summary: `${y.length} agents${S ? ", cut at a limit" : ""}`, output: { agents: y, cut: S } };
}

export { LISTPROJECTAGENTS, serveListProjectAgents };
