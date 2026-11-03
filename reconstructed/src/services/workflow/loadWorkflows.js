/**
 * services/workflow/loadWorkflows.ts
 *
 * 加载用户/项目/插件工作流（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rmpsted2.js (17)
 * attribution: placement 17
 */
import { join, join as join_2, join as join_3 } from "path";
import { getFsImplementation, isDuplicatePath } from "../../utils/fsOperations.js";
import { readSmallFileChecked, checkSmallFileReadable } from "../../utils/readSmallFile.js";
import { gx, wPe } from "./scriptFile.js";
import { logForDebugging } from "../../utils/debug.js";
import { parseWorkflowScript, yFs } from "../workflows/workflowScriptMeta.js";
import { getPluginRegistry, clearPluginWorkflows } from "../../utils/plugins/pluginLoadState.js";
import { loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { pluginErrorText } from "../../types/plugin.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getProjectDirsUpToHome } from "../../utils/markdownConfigLoader.js";
import { isSyscallError } from "../../utils/errors.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "../../utils/pagedRead.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { env } from "../../utils/env.js";
import { getOrCreate, getHostState, keyOrNull } from "../../utils/hostEnvironment.js";
import { ppr } from "../../skills/bundledSkillsGate.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { getBundledWorkflows } from "../workflows/bundledWorkflows.js";

//@ chunk-rmpsted2.js:872-1139 placement
async function readWorkflowDir(o, a, r, l, p) {
  let w = getFsImplementation(),
    e;
  try {
    e = await w.readdir(o);
  } catch {
    return [];
  }
  return (
    await Promise.all(
      e.map(async (n) => {
        if (!(n.isFile() || n.isSymbolicLink())) return null;
        if (!n.name.endsWith(".js")) return null;
        return readPluginWorkflowFile(join(o, n.name), a, r, l, p);
      }),
    )
  ).filter((n) => n !== null);
}
//@ chunk-rmpsted2.js:1139-1774 placement
async function readPluginWorkflowFile(o, a, r, l, p) {
  let w = getFsImplementation();
  if (isDuplicatePath(w, o, p)) return null;
  try {
    let e = await readSmallFileChecked(w, o, gx);
    if (e === null)
      return (
        logForDebugging(`Plugin workflow ${o}: not a regular file or exceeds ${gx} bytes \u2014 skipping`, {
          level: "warn",
        }),
        null
      );
    let s = wPe(e),
      n = parseWorkflowScript(s, { validateBody: !1 });
    if ("error" in n)
      return (
        logForDebugging(`Plugin workflow ${o} has invalid meta: ${n.error} \u2014 skipping`, {
          level: "warn",
        }),
        null
      );
    let u = `${a}:${n.meta.name}`;
    return {
      source: "plugin",
      plugin: r,
      pluginManifest: l,
      name: u,
      description: n.meta.description,
      whenToUse: n.meta.whenToUse,
      phases: n.meta.phases,
      script: s,
      filePath: o,
    };
  } catch (error) {
    return (logForDebugging(`Failed to load workflow from ${o}: ${error}`, { level: "error" }), null);
  }
}
//@ chunk-rmpsted2.js:1774-3092 placement
function loadPluginWorkflows(o) {
  let a = getPluginRegistry();
  return (
    (a.workflows ??= (async () => {
      let { enabled: enabled, errors: errors } = await loadAllPluginsCacheOnly(o),
        p = [];
      if (errors.length > 0)
        logForDebugging(`Plugin loading errors: ${errors.map((e) => pluginErrorText(e)).join(", ")}`);
      let w = null;
      for (let e of enabled) {
        let s = new Set(),
          n = p.length;
        if (e.workflowsPath)
          try {
            let u = await readWorkflowDir(e.workflowsPath, e.name, e.source, e.manifest, s);
            if ((p.push(...u), u.length > 0))
              logForDebugging(`Loaded ${u.length} workflows from plugin ${e.name} default directory`);
          } catch (error) {
            ((w = "plugin_load_workflows_dir_failed"),
              logForDebugging(`Failed to load workflows from plugin ${e.name} default directory: ${error}`, {
                level: "error",
              }));
          }
        if (e.workflowsPaths)
          for (let workflowsPath of e.workflowsPaths)
            try {
              let stats = await getFsImplementation().stat(workflowsPath);
              if (stats.isDirectory()) {
                let k = await readWorkflowDir(workflowsPath, e.name, e.source, e.manifest, s);
                if ((p.push(...k), k.length > 0))
                  logForDebugging(
                    `Loaded ${k.length} workflows from plugin ${e.name} custom path: ${workflowsPath}`,
                  );
              } else if (stats.isFile() && workflowsPath.endsWith(".js")) {
                let k = await readPluginWorkflowFile(workflowsPath, e.name, e.source, e.manifest, s);
                if (k)
                  (p.push(k),
                    logForDebugging(`Loaded workflow from plugin ${e.name} custom file: ${workflowsPath}`));
              }
            } catch (error) {
              ((w = "plugin_load_workflows_path_failed"),
                logForDebugging(
                  `Failed to load workflows from plugin ${e.name} custom path ${workflowsPath}: ${error}`,
                  { level: "error" },
                ));
            }
        if (e.serverPluginId !== void 0) for (let u of p.slice(n)) u.serverPluginId = e.serverPluginId;
      }
      if ((logForDebugging(`Total plugin workflows loaded: ${p.length}`), w))
        logFeatureBad("plugin_load_workflows", w);
      else logFeatureOk("plugin_load_workflows");
      return p;
    })()),
    a.workflows
  );
}
//@ chunk-rmpsted2.js:3120-3321 placement
function canOverrideWorkflow(o, a) {
  if (!a || yFs(o.script)) return !0;
  return (
    logForDebugging(
      `Workflow ${o.filePath ?? o.name} (${o.source}) would override ${o.name} but does not parse \u2014 keeping the ${a.source} copy`,
      { level: "warn" },
    ),
    !1
  );
}
//@ chunk-rmpsted2.js:3321-3435 placement
function dedupeWorkflowsByName(o) {
  let a = new Map();
  for (let r of o) {
    if (!canOverrideWorkflow(r, a.get(r.name))) continue;
    a.set(r.name, r);
  }
  return [...a.values()];
}
//@ chunk-rmpsted2.js:3463-3505 placement
function iFt() {
  return join_3(getClaudeConfigDir(), "workflows");
}
//@ chunk-rmpsted2.js:3505-3690 placement
async function walkProjectWorkflowDirs(o, a) {
  try {
    return await getProjectDirsUpToHome("workflows", o);
  } catch (error) {
    if (isSyscallError(error))
      return (
        logForDebugging(`loadWorkflowsDir: project-dir walk failed: ${error.code}`, { level: "error" }),
        (a.walkFailed = !0),
        []
      );
    throw error;
  }
}
//@ chunk-rmpsted2.js:3690-4792 placement
async function loadUserWorkflows(o, a, r, l) {
  if (l !== void 0 && a === "userSettings") return loadWorkflowsDir(l, o, r);
  let p = getFsImplementation(),
    w;
  try {
    w = await p.readdir(o);
  } catch {
    return [];
  }
  return (
    await Promise.all(
      w.map(async (s) => {
        if (!(s.isFile() || s.isSymbolicLink())) return null;
        if (!s.name.endsWith(".js")) {
          if (/\.(mjs|cjs|ts)$/.test(s.name)) r.nearMissExt++;
          return null;
        }
        let n = join_2(o, s.name),
          u;
        try {
          if (
            s.isSymbolicLink() &&
            (await checkSmallFileReadable(p, n, Number.POSITIVE_INFINITY)).verdict !== "read"
          )
            return (
              logForDebugging(
                `Workflow ${n} is a link to no regular file, or one refused for where it leads \u2014 skipping`,
                { level: "warn" },
              ),
              r.skippedUnreadable++,
              null
            );
          u = await p.readFileBytes(n, gx + 1);
        } catch {
          return (r.skippedUnreadable++, null);
        }
        if (u.byteLength > gx)
          return (
            logForDebugging(`Workflow ${n} exceeds ${gx} bytes \u2014 skipping`, { level: "warn" }),
            r.skippedOversize++,
            null
          );
        let d = wPe(u.toString("utf-8")),
          c = parseWorkflowScript(d, { validateBody: !1 });
        if ("error" in c)
          return (
            logForDebugging(`Workflow ${n} has invalid meta: ${c.error} \u2014 skipping`, { level: "warn" }),
            r.skippedInvalidMeta++,
            null
          );
        return {
          source: a,
          name: c.meta.name,
          description: c.meta.description,
          whenToUse: c.meta.whenToUse,
          phases: c.meta.phases,
          script: d,
          filePath: n,
        };
      }),
    )
  ).filter((s) => s !== null);
}
//@ chunk-rmpsted2.js:4792-6287 placement
async function loadWorkflowsDir(o, a, r) {
  let l = [];
  switch (
    (
      await readAllPages(
        (e) =>
          o.listEntries(
            { namespace: "userConfigDir", dir: "workflows" },
            e === void 0 ? void 0 : { cursor: e },
          ),
        (e) => {
          for (let s of e) {
            if (s.kind !== "key" || s.key.namespace !== "userConfigDir") continue;
            let at = s.key.relPath.at(-1);
            if (at === void 0 || s.key.relPath.length !== 1) continue;
            if (!at.endsWith(".js")) {
              if (/\.(mjs|cjs|ts)$/.test(at)) r.nearMissExt++;
              continue;
            }
            l.push({ key: s.key, name: at });
          }
        },
      )
    ).status
  ) {
    case "done":
      break;
    case "error":
      return [];
    case "capped":
      (logForDebugging(
        `User workflows listing of ${a} truncated at ${DEFAULT_MAX_PAGES} pages \u2014 loading the ${l.length} workflow files seen`,
        { level: "warn" },
      ),
        (r.userListingTruncated = !0));
      break;
  }
  return (
    await Promise.all(
      l.map(async ({ key: key, name: s }) => {
        let read = await o.read([{ key: key, offset: 0, length: gx + 1 }]);
        if (!read.ok)
          return (
            logForDebugging(
              `Workflow ${join_2(a, s)} could not be read through the storage backend (${read.error.code}) \u2014 skipping`,
              { level: "warn" },
            ),
            r.skippedUnreadable++,
            null
          );
        let u = read.value.items[0];
        if (u === void 0 || !u.found) return (r.skippedUnreadable++, null);
        let d = join_2(a, s);
        if (u.value.byteLength > gx)
          return (
            logForDebugging(`Workflow ${d} exceeds ${gx} bytes \u2014 skipping`, { level: "warn" }),
            r.skippedOversize++,
            null
          );
        let c = wPe(Buffer.from(u.value).toString("utf-8")),
          k = parseWorkflowScript(c, { validateBody: !1 });
        if ("error" in k)
          return (
            logForDebugging(`Workflow ${d} has invalid meta: ${k.error} \u2014 skipping`, { level: "warn" }),
            r.skippedInvalidMeta++,
            null
          );
        return {
          source: "userSettings",
          name: k.meta.name,
          description: k.meta.description,
          whenToUse: k.meta.whenToUse,
          phases: k.meta.phases,
          script: c,
          filePath: d,
        };
      }),
    )
  ).filter((e) => e !== null);
}
//@ chunk-rmpsted2.js:6287-7480 placement
async function discoverProjectWorkflows(o, a) {
  let r = iFt(),
    l = {
      skippedInvalidMeta: 0,
      skippedOversize: 0,
      skippedUnreadable: 0,
      nearMissExt: 0,
      walkFailed: !1,
      userListingTruncated: !1,
    },
    p = await walkProjectWorkflowDirs(o, l),
    [w, ...e] = await Promise.all([
      isSettingSourceEnabled("userSettings")
        ? loadUserWorkflows(r, "userSettings", l, a)
        : Promise.resolve([]),
      ...(isSettingSourceEnabled("projectSettings")
        ? p.map((d) => loadUserWorkflows(d, "projectSettings", l))
        : []),
    ]),
    s = new Map();
  for (let d of w) {
    if (!canOverrideWorkflow(d, s.get(d.name))) continue;
    s.set(d.name, d);
  }
  for (let d = e.length - 1; d >= 0; d--)
    for (let c of e[d]) {
      if (!canOverrideWorkflow(c, s.get(c.name))) continue;
      s.set(c.name, c);
    }
  let n = l.walkFailed && isSettingSourceEnabled("projectSettings"),
    u = l.skippedInvalidMeta + l.skippedOversize + l.skippedUnreadable;
  if (n || l.userListingTruncated || u > 0 || l.nearMissExt > 0)
    logFeatureSad(
      "workflow_discover",
      n
        ? "project_dir_walk_failed"
        : l.userListingTruncated
          ? "user_listing_truncated"
          : l.skippedInvalidMeta > 0
            ? "invalid_meta"
            : l.skippedOversize > 0
              ? "oversize"
              : l.skippedUnreadable > 0
                ? "unreadable"
                : "near_miss_extension",
      {
        found: s.size,
        skipped_invalid_meta: l.skippedInvalidMeta,
        skipped_oversize: l.skippedOversize,
        skipped_unreadable: l.skippedUnreadable,
        near_miss_ext: l.nearMissExt,
        ...(l.userListingTruncated && { user_listing_truncated: !0 }),
      },
    );
  else logFeatureOk("workflow_discover", { found: s.size });
  return [...s.values()].sort((d, c) => d.name.localeCompare(c.name));
}
//@ chunk-rmpsted2.js:7480-7586 placement
var REMOTE_WORKFLOW_ENV = "CLAUDE_REMOTE_WORKFLOW_SCRIPT",
  CLAUDE_REMOTE_WORKFLOW_ARGS = "CLAUDE_REMOTE_WORKFLOW_ARGS",
  CLAUDE_WORKFLOW_NAME_ONLY = "CLAUDE_WORKFLOW_NAME_ONLY";
//@ chunk-rmpsted2.js:7586-7636 placement
function qht() {
  return env.CLAUDE_WORKFLOW_NAME_ONLY;
}
//@ chunk-rmpsted2.js:7636-7725 placement
function PGe(o, a) {
  return getOrCreate(getHostState().allWorkflows, `${ppr()}:${qht()}:${keyOrNull(o)}`, () =>
    loadAllWorkflows(o, a),
  );
}
/**
 * 汇总可用工作流：内置 + 插件（同名后者覆盖、不可解析的不覆盖）+ 项目目录工作流，按优先级去重；禁用自定义或只允许命名内置时只返回内置。
 */
//@ chunk-rmpsted2.js:7725-8087 placement
async function loadAllWorkflows(o, a) {
  if (isCustomizationDisabled("workflows") || qht()) return [...getBundledWorkflows()];
  let [r, l] = await Promise.all([discoverProjectWorkflows(o, a), loadPluginWorkflows(a)]),
    p = dedupeWorkflowsByName(l),
    w = getBundledWorkflows(),
    e = new Map(w.map((y) => [y.name, y])),
    s = O(p, e);
  for (let y of s) e.set(y.name, y);
  let n = O(r, e),
    u = new Set(n.map((y) => y.name)),
    filtered = s.filter((y) => !u.has(y.name)),
    c = new Set([...u, ...filtered.map((y) => y.name)]);
  return [...w.filter((y) => !c.has(y.name)), ...filtered, ...n];
}
//@ chunk-rmpsted2.js:8087-8144 placement
function O(o, a) {
  return o.filter((r) => canOverrideWorkflow(r, a.get(r.name)));
}
//@ chunk-rmpsted2.js:8144-8215 placement
async function din(o, a, r) {
  return (await PGe(a, r)).find((p) => p.name === o);
}
//@ chunk-rmpsted2.js:8215-8262 placement
function lDr() {
  (getHostState().allWorkflows.clear(), clearPluginWorkflows());
}

export {
  qht,
  din,
  PGe,
  iFt,
  lDr,
  REMOTE_WORKFLOW_ENV,
  CLAUDE_REMOTE_WORKFLOW_ARGS,
  CLAUDE_WORKFLOW_NAME_ONLY,
};
