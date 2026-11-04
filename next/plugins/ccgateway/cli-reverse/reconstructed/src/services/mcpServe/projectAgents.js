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
import {
  objectSchema,
  array,
  stringSchema,
  record,
  unknown,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
  objectSchema({
    agents: array(
      objectSchema({
        filePath: stringSchema(),
        baseDir: stringSchema(),
        frontmatter: record(stringSchema(), unknown()),
        content: stringSchema(),
        fromAdditionalDirectory: booleanSchema().optional(),
      }),
    ).max(MAX_AGENTS),
    cut: booleanSchema(),
  }),
);
var UNBOUNDED_LIMITS = {
  bytes: 1 / 0,
  values: 1 / 0,
  levels: 1 / 0,
};
//@ chunk-wy9dbk5f.js:32560-33069 placement = reorderBidi (0.534)
function measureJsonSize(value, level = 0, seen = new Map()) {
  if (typeof value !== "object" || value === null)
    return {
      bytes: Buffer.byteLength(jsonStringifyRaw(value)),
      values: 0,
      levels: 0,
    };
  let cached = seen.get(value);
  if (level + (cached?.levels ?? 1) > MAX_AGENT_DEPTH) return UNBOUNDED_LIMITS;
  if (cached !== undefined) return cached;
  seen.set(value, UNBOUNDED_LIMITS);
  let children = Array.isArray(value) ? value : Object.values(value);
  let max = Math.max(children.length + 1, 2);
  if (children !== value)
    for (let key of Object.keys(value)) max += Buffer.byteLength(jsonStringifyRaw(key)) + 1;
  let values = children.length;
  let maxLevels = 1;
  for (let child of children) {
    let childSize = measureJsonSize(child, level + 1, seen);
    max += childSize.bytes;
    values += childSize.values;
    if (max > MAX_AGENTS_BYTES) return UNBOUNDED_LIMITS;
    maxLevels = Math.max(maxLevels, childSize.levels + 1);
  }
  let size = {
    bytes: max,
    values,
    levels: maxLevels,
  };
  seen.set(value, size);
  return size;
}
//@ chunk-wy9dbk5f.js:33069-34460 placement
async function serveListProjectAgents(input, signal, context) {
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
  let markdownFiles = await loadMarkdownFilesCached(
    "agents",
    getOriginalCwd(),
    context.toolUseContext().storageV5,
  );
  signal.throwIfAborted();
  let agents = [];
  let agentCount = 0;
  let bytesUsed = 0;
  let stale = hostState.markdownScansGivenUp !== markdownScansGivenUp;
  let searchDirs = [];
  if (isSettingSourceEnabled("projectSettings") && !isRestrictedToPluginOnly("agents")) {
    searchDirs.push(...(await getProjectDirsUpToHome("agents", getOriginalCwd())));
    for (let extraDir of getAdditionalDirectoriesForClaudeMd())
      searchDirs.push(join(extraDir, ".claude", "agents"));
  }
  let coveredDirs = new Set();
  for (let baseDir of new Set(markdownFiles.map((markdownFile) => markdownFile.baseDir)))
    coveredDirs.add(await realpath(baseDir));
  for (let dir of searchDirs)
    try {
      let covered = coveredDirs.has(await realpath(dir));
      for (let entry of await readdir(dir, {
        withFileTypes: true,
      }))
        stale ||= entry.name.endsWith(".md") && !entry.isDirectory() && !covered;
    } catch (error) {
      if (!isPathAbsent(error)) {
        stale = true;
        logForDebugging(`ListProjectAgents: ${dir} is there and cannot be read: ${getErrnoCode(error)}`, {
          level: "error",
        });
      }
    }
  signal.throwIfAborted();
  let agentFiles = markdownFiles.toSorted(
    (left, right) =>
      Number(left.fromAdditionalDirectory ?? false) - Number(right.fromAdditionalDirectory ?? false),
  );
  let seenPaths = new Set();
  for (let file of agentFiles) {
    let { filePath, baseDir, frontmatter, content, source } = file;
    if (source !== "projectSettings") continue;
    let agentFile = {
      filePath,
      baseDir,
      frontmatter,
      content,
      ...(file.fromAdditionalDirectory && {
        fromAdditionalDirectory: true,
      }),
    };
    let size = measureJsonSize(agentFile);
    if (
      size !== UNBOUNDED_LIMITS &&
      !parseAgentFromMarkdown(filePath, baseDir, frontmatter, content, source)
    ) {
      if (!seenPaths.has(file)) {
        let blankFile = {
          ...file,
          frontmatter: {},
          content: "",
        };
        seenPaths.add(blankFile);
        agentFiles.push(blankFile);
        continue;
      }
      if (!stale) continue;
    }
    if (
      agents.length === MAX_AGENTS ||
      agentCount + size.bytes > MAX_AGENTS_BYTES ||
      bytesUsed + size.values + 1 > MAX_AGENT_VALUES
    ) {
      stale = true;
      continue;
    }
    agentCount += size.bytes;
    bytesUsed += size.values + 1;
    agents.push(agentFile);
  }
  return {
    summary: `${agents.length} agents${stale ? ", cut at a limit" : ""}`,
    output: {
      agents,
      cut: stale,
    },
  };
}
export { LISTPROJECTAGENTS, serveListProjectAgents };
