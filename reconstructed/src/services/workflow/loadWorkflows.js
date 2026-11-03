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
import { join } from "path";
import { getFsImplementation, isDuplicatePath } from "../../utils/fsOperations.js";
import { readSmallFileChecked, checkSmallFileReadable } from "../../utils/readSmallFile.js";
import { MAX_SCRIPT_FILE_BYTES, normalizeCrLf } from "./scriptFile.js";
import { logForDebugging } from "../../utils/debug.js";
import { parseWorkflowScript, isValidWorkflowScript } from "../workflows/workflowScriptMeta.js";
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
import { bundledSkillsGateKey } from "../../skills/bundledSkillsGate.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { getBundledWorkflows } from "../workflows/bundledWorkflows.js";

//@ chunk-rmpsted2.js:872-1139 placement
async function readWorkflowDir(workflowsPath, name, plugin, pluginManifest, p) {
  let fsImplementation = getFsImplementation();
  let e;
  try {
    e = await fsImplementation.readdir(workflowsPath);
  } catch {
    return [];
  }
  return (
    await Promise.all(
      e.map(async (n) => {
        if (!(n.isFile() || n.isSymbolicLink())) return null;
        if (!n.name.endsWith(".js")) return null;
        return readPluginWorkflowFile(join(workflowsPath, n.name), name, plugin, pluginManifest, p);
      }),
    )
  ).filter((n) => n !== null);
}
//@ chunk-rmpsted2.js:1139-1774 placement
async function readPluginWorkflowFile(o, a, plugin, pluginManifest, p) {
  let fsImplementation = getFsImplementation();
  if (isDuplicatePath(fsImplementation, o, p)) return null;
  try {
    let smallFileChecked = await readSmallFileChecked(fsImplementation, o, MAX_SCRIPT_FILE_BYTES);
    if (smallFileChecked === null) {
      logForDebugging(
        `Plugin workflow ${o}: not a regular file or exceeds ${MAX_SCRIPT_FILE_BYTES} bytes \u2014 skipping`,
        {
          level: "warn",
        },
      );
      return null;
    }
    let s = normalizeCrLf(smallFileChecked);
    let workflowScript = parseWorkflowScript(s, {
      validateBody: false,
    });
    if ("error" in workflowScript) {
      logForDebugging(`Plugin workflow ${o} has invalid meta: ${workflowScript.error} \u2014 skipping`, {
        level: "warn",
      });
      return null;
    }
    let name = `${a}:${workflowScript.meta.name}`;
    return {
      source: "plugin",
      plugin,
      pluginManifest,
      name,
      description: workflowScript.meta.description,
      whenToUse: workflowScript.meta.whenToUse,
      phases: workflowScript.meta.phases,
      script: s,
      filePath: o,
    };
  } catch (error) {
    logForDebugging(`Failed to load workflow from ${o}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-rmpsted2.js:1774-3092 placement
function loadPluginWorkflows(o) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.workflows ??= (async () => {
    let { enabled, errors } = await loadAllPluginsCacheOnly(o);
    let p = [];
    if (errors.length > 0)
      logForDebugging(`Plugin loading errors: ${errors.map((error) => pluginErrorText(error)).join(", ")}`);
    let w = null;
    for (let e of enabled) {
      let s = new Set();
      let n = p.length;
      if (e.workflowsPath)
        try {
          let workflowDir = await readWorkflowDir(e.workflowsPath, e.name, e.source, e.manifest, s);
          p.push(...workflowDir);
          if (workflowDir.length > 0)
            logForDebugging(`Loaded ${workflowDir.length} workflows from plugin ${e.name} default directory`);
        } catch (error) {
          w = "plugin_load_workflows_dir_failed";
          logForDebugging(`Failed to load workflows from plugin ${e.name} default directory: ${error}`, {
            level: "error",
          });
        }
      if (e.workflowsPaths)
        for (let workflowsPath of e.workflowsPaths)
          try {
            let stats = await getFsImplementation().stat(workflowsPath);
            if (stats.isDirectory()) {
              let workflowDir = await readWorkflowDir(workflowsPath, e.name, e.source, e.manifest, s);
              p.push(...workflowDir);
              if (workflowDir.length > 0)
                logForDebugging(
                  `Loaded ${workflowDir.length} workflows from plugin ${e.name} custom path: ${workflowsPath}`,
                );
            } else if (stats.isFile() && workflowsPath.endsWith(".js")) {
              let pluginWorkflowFile = await readPluginWorkflowFile(
                workflowsPath,
                e.name,
                e.source,
                e.manifest,
                s,
              );
              if (pluginWorkflowFile) {
                p.push(pluginWorkflowFile);
                logForDebugging(`Loaded workflow from plugin ${e.name} custom file: ${workflowsPath}`);
              }
            }
          } catch (error) {
            w = "plugin_load_workflows_path_failed";
            logForDebugging(
              `Failed to load workflows from plugin ${e.name} custom path ${workflowsPath}: ${error}`,
              {
                level: "error",
              },
            );
          }
      if (e.serverPluginId !== undefined) for (let u of p.slice(n)) u.serverPluginId = e.serverPluginId;
    }
    logForDebugging(`Total plugin workflows loaded: ${p.length}`);
    if (w) logFeatureBad("plugin_load_workflows", w);
    else logFeatureOk("plugin_load_workflows");
    return p;
  })();
  return pluginRegistry.workflows;
}
//@ chunk-rmpsted2.js:3120-3321 placement
function canOverrideWorkflow(o, a) {
  if (!a || isValidWorkflowScript(o.script)) return true;
  logForDebugging(
    `Workflow ${o.filePath ?? o.name} (${o.source}) would override ${o.name} but does not parse \u2014 keeping the ${a.source} copy`,
    {
      level: "warn",
    },
  );
  return false;
}
//@ chunk-rmpsted2.js:3321-3435 placement
function dedupeWorkflowsByName(pluginWorkflows) {
  let a = new Map();
  for (let r of pluginWorkflows) {
    if (!canOverrideWorkflow(r, a.get(r.name))) continue;
    a.set(r.name, r);
  }
  return [...a.values()];
}
//@ chunk-rmpsted2.js:3463-3505 placement
/**
 * 配置目录下的用户工作流目录。
 */
function userWorkflowsDir() {
  return join(getClaudeConfigDir(), "workflows");
}
//@ chunk-rmpsted2.js:3505-3690 placement
async function walkProjectWorkflowDirs(o, a) {
  try {
    return await getProjectDirsUpToHome("workflows", o);
  } catch (error) {
    if (isSyscallError(error)) {
      logForDebugging(`loadWorkflowsDir: project-dir walk failed: ${error.code}`, {
        level: "error",
      });
      a.walkFailed = true;
      return [];
    }
    throw error;
  }
}
//@ chunk-rmpsted2.js:3690-4792 placement
async function loadUserWorkflows(o, a, r, l) {
  if (l !== undefined && a === "userSettings") return loadWorkflowsDir(l, o, r);
  let fsImplementation = getFsImplementation();
  let w;
  try {
    w = await fsImplementation.readdir(o);
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
        let n = join(o, s.name);
        let u;
        try {
          if (
            s.isSymbolicLink() &&
            (await checkSmallFileReadable(fsImplementation, n, Number.POSITIVE_INFINITY)).verdict !== "read"
          ) {
            logForDebugging(
              `Workflow ${n} is a link to no regular file, or one refused for where it leads \u2014 skipping`,
              {
                level: "warn",
              },
            );
            r.skippedUnreadable++;
            return null;
          }
          u = await fsImplementation.readFileBytes(n, MAX_SCRIPT_FILE_BYTES + 1);
        } catch {
          r.skippedUnreadable++;
          return null;
        }
        if (u.byteLength > MAX_SCRIPT_FILE_BYTES) {
          logForDebugging(`Workflow ${n} exceeds ${MAX_SCRIPT_FILE_BYTES} bytes \u2014 skipping`, {
            level: "warn",
          });
          r.skippedOversize++;
          return null;
        }
        let d = normalizeCrLf(u.toString("utf-8"));
        let workflowScript = parseWorkflowScript(d, {
          validateBody: false,
        });
        if ("error" in workflowScript) {
          logForDebugging(`Workflow ${n} has invalid meta: ${workflowScript.error} \u2014 skipping`, {
            level: "warn",
          });
          r.skippedInvalidMeta++;
          return null;
        }
        return {
          source: a,
          name: workflowScript.meta.name,
          description: workflowScript.meta.description,
          whenToUse: workflowScript.meta.whenToUse,
          phases: workflowScript.meta.phases,
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
            {
              namespace: "userConfigDir",
              dir: "workflows",
            },
            e === undefined
              ? undefined
              : {
                  cursor: e,
                },
          ),
        (e) => {
          for (let s of e) {
            if (s.kind !== "key" || s.key.namespace !== "userConfigDir") continue;
            let last = s.key.relPath.at(-1);
            if (last === undefined || s.key.relPath.length !== 1) continue;
            if (!last.endsWith(".js")) {
              if (/\.(mjs|cjs|ts)$/.test(last)) r.nearMissExt++;
              continue;
            }
            l.push({
              key: s.key,
              name: last,
            });
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
      logForDebugging(
        `User workflows listing of ${a} truncated at ${DEFAULT_MAX_PAGES} pages \u2014 loading the ${l.length} workflow files seen`,
        {
          level: "warn",
        },
      );
      r.userListingTruncated = true;
      break;
  }
  return (
    await Promise.all(
      l.map(async ({ key, name: s }) => {
        let n = await o.read([
          {
            key,
            offset: 0,
            length: MAX_SCRIPT_FILE_BYTES + 1,
          },
        ]);
        if (!n.ok) {
          logForDebugging(
            `Workflow ${join(a, s)} could not be read through the storage backend (${n.error.code}) \u2014 skipping`,
            {
              level: "warn",
            },
          );
          r.skippedUnreadable++;
          return null;
        }
        let u = n.value.items[0];
        if (u === undefined || !u.found) {
          r.skippedUnreadable++;
          return null;
        }
        let d = join(a, s);
        if (u.value.byteLength > MAX_SCRIPT_FILE_BYTES) {
          logForDebugging(`Workflow ${d} exceeds ${MAX_SCRIPT_FILE_BYTES} bytes \u2014 skipping`, {
            level: "warn",
          });
          r.skippedOversize++;
          return null;
        }
        let c = normalizeCrLf(Buffer.from(u.value).toString("utf-8"));
        let workflowScript = parseWorkflowScript(c, {
          validateBody: false,
        });
        if ("error" in workflowScript) {
          logForDebugging(`Workflow ${d} has invalid meta: ${workflowScript.error} \u2014 skipping`, {
            level: "warn",
          });
          r.skippedInvalidMeta++;
          return null;
        }
        return {
          source: "userSettings",
          name: workflowScript.meta.name,
          description: workflowScript.meta.description,
          whenToUse: workflowScript.meta.whenToUse,
          phases: workflowScript.meta.phases,
          script: c,
          filePath: d,
        };
      }),
    )
  ).filter((e) => e !== null);
}
//@ chunk-rmpsted2.js:6287-7480 placement
async function discoverProjectWorkflows(o, a) {
  let r = userWorkflowsDir();
  let l = {
    skippedInvalidMeta: 0,
    skippedOversize: 0,
    skippedUnreadable: 0,
    nearMissExt: 0,
    walkFailed: false,
    userListingTruncated: false,
  };
  let p = await walkProjectWorkflowDirs(o, l);
  let [w, ...e] = await Promise.all([
    isSettingSourceEnabled("userSettings") ? loadUserWorkflows(r, "userSettings", l, a) : Promise.resolve([]),
    ...(isSettingSourceEnabled("projectSettings")
      ? p.map((d) => loadUserWorkflows(d, "projectSettings", l))
      : []),
  ]);
  let s = new Map();
  for (let d of w) {
    if (!canOverrideWorkflow(d, s.get(d.name))) continue;
    s.set(d.name, d);
  }
  for (let j = e.length - 1; j >= 0; j--)
    for (let c of e[j]) {
      if (!canOverrideWorkflow(c, s.get(c.name))) continue;
      s.set(c.name, c);
    }
  let n = l.walkFailed && isSettingSourceEnabled("projectSettings");
  let u = l.skippedInvalidMeta + l.skippedOversize + l.skippedUnreadable;
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
        ...(l.userListingTruncated && {
          user_listing_truncated: true,
        }),
      },
    );
  else
    logFeatureOk("workflow_discover", {
      found: s.size,
    });
  return [...s.values()].sort((d, c) => d.name.localeCompare(c.name));
}
//@ chunk-rmpsted2.js:7480-7586 placement
var REMOTE_WORKFLOW_ENV = "CLAUDE_REMOTE_WORKFLOW_SCRIPT";
var CLAUDE_REMOTE_WORKFLOW_ARGS = "CLAUDE_REMOTE_WORKFLOW_ARGS";
var CLAUDE_WORKFLOW_NAME_ONLY = "CLAUDE_WORKFLOW_NAME_ONLY";
//@ chunk-rmpsted2.js:7586-7636 placement
/**
 * 读环境变量 CLAUDE_WORKFLOW_NAME_ONLY。
 */
function workflowNameOnlyEnv() {
  return env.CLAUDE_WORKFLOW_NAME_ONLY;
}
//@ chunk-rmpsted2.js:7636-7725 placement
/**
 * 按 host 与配置键缓存全部工作流。
 */
function allWorkflowsForHost(o, a) {
  return getOrCreate(
    getHostState().allWorkflows,
    `${bundledSkillsGateKey()}:${workflowNameOnlyEnv()}:${keyOrNull(o)}`,
    () => loadAllWorkflows(o, a),
  );
}
//@ chunk-rmpsted2.js:7725-8087 placement
/**
 * 汇总可用工作流：内置 + 插件（同名后者覆盖、不可解析的不覆盖）+ 项目目录工作流，按优先级去重；禁用自定义或只允许命名内置时只返回内置。
 */
async function loadAllWorkflows(o, a) {
  if (isCustomizationDisabled("workflows") || workflowNameOnlyEnv()) return [...getBundledWorkflows()];
  let [projectWorkflows, pluginWorkflows] = await Promise.all([
    discoverProjectWorkflows(o, a),
    loadPluginWorkflows(a),
  ]);
  let p = dedupeWorkflowsByName(pluginWorkflows);
  let bundledWorkflows = getBundledWorkflows();
  let e = new Map(bundledWorkflows.map((y) => [y.name, y]));
  let s = overridableWorkflows(p, e);
  for (let y of s) e.set(y.name, y);
  let n = overridableWorkflows(projectWorkflows, e);
  let u = new Set(n.map((y) => y.name));
  let filtered = s.filter((y) => !u.has(y.name));
  let c = new Set([...u, ...filtered.map((y) => y.name)]);
  return [...bundledWorkflows.filter((y) => !c.has(y.name)), ...filtered, ...n];
}
//@ chunk-rmpsted2.js:8087-8144 placement
/**
 * 过滤出可被覆盖的工作流。
 */
function overridableWorkflows(o, a) {
  return o.filter((r) => canOverrideWorkflow(r, a.get(r.name)));
}
//@ chunk-rmpsted2.js:8144-8215 placement
/**
 * 按名字查找工作流。
 */
async function findWorkflowByName(name, cwd, storageV5) {
  return (await allWorkflowsForHost(cwd, storageV5)).find((p) => p.name === name);
}
//@ chunk-rmpsted2.js:8215-8262 placement
/**
 * 清空工作流缓存与插件工作流。
 */
function clearAllWorkflows() {
  getHostState().allWorkflows.clear();
  clearPluginWorkflows();
}
export {
  workflowNameOnlyEnv,
  findWorkflowByName,
  allWorkflowsForHost,
  userWorkflowsDir,
  clearAllWorkflows,
  REMOTE_WORKFLOW_ENV,
  CLAUDE_REMOTE_WORKFLOW_ARGS,
  CLAUDE_WORKFLOW_NAME_ONLY,
};
