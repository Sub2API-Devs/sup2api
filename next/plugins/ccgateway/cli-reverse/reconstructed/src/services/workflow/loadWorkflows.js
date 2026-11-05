/**
 * services/workflow/loadWorkflows.ts
 *
 * 加载用户/项目/插件工作流（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-40b7pajj.js (17)
 * attribution: placement 17
 */
import { join } from "path";
import { getFsImplementation, isDuplicatePath } from "../../utils/fsOperations.js";
import { findSymlinkEscape } from "../../utils/plugins/pluginPathContainment.js";
import { logForDebugging } from "../../utils/debug.js";
import { readSmallFileChecked, checkSmallFileReadable } from "../../utils/readSmallFile.js";
import { MAX_SCRIPT_FILE_BYTES, normalizeCrLf } from "./scriptFile.js";
import { parseWorkflowScript, isValidWorkflowScript } from "../workflows/workflowScriptMeta.js";
import { getPluginRegistry, clearPluginWorkflows } from "../../utils/plugins/pluginLoadState.js";
import { loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { pluginErrorText } from "../../types/plugin.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getClaudeConfigDir, getProjectDirsUpToHome } from "../../utils/markdownConfigLoader.js";
import { isSyscallError } from "../../utils/errors.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "../../utils/pagedRead.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { env } from "../../utils/env.js";
import { getOrCreate, getHostState, keyOrNull } from "../../utils/hostEnvironment.js";
import { bundledSkillsGateKey } from "../../skills/bundledSkillsGate.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { getBundledWorkflows } from "../workflows/bundledWorkflows.js";

//@ chunk-40b7pajj.js:875-1296 placement
async function readWorkflowDir(workflowsPath, pluginName, plugin, pluginManifest, seenPaths, entriesAnchor) {
  let fsImplementation = getFsImplementation();
  let entries;
  try {
    entries = await fsImplementation.readdir(workflowsPath);
  } catch {
    return [];
  }
  return (
    await Promise.all(
      entries.map(async (entry) => {
        if (!(entry.isFile() || entry.isSymbolicLink())) return null;
        if (!entry.name.endsWith(".js")) return null;
        let entryInfo =
          entriesAnchor === undefined
            ? undefined
            : await findSymlinkEscape(entriesAnchor, workflowsPath, entry.name);
        if (entryInfo !== undefined) {
          logForDebugging(
            `Plugin ${pluginName}: did not read the workflow ${join(workflowsPath, entry.name)}: ${entryInfo}`,
            {
              level: "error",
            },
          );
          return null;
        }
        return readPluginWorkflowFile(
          join(workflowsPath, entry.name),
          pluginName,
          plugin,
          pluginManifest,
          seenPaths,
        );
      }),
    )
  ).filter((workflow) => workflow !== null);
}
//@ chunk-40b7pajj.js:1296-1931 placement
async function readPluginWorkflowFile(filePath, pluginName, plugin, pluginManifest, seenPaths) {
  let fsImplementation = getFsImplementation();
  if (isDuplicatePath(fsImplementation, filePath, seenPaths)) return null;
  try {
    let smallFileChecked = await readSmallFileChecked(fsImplementation, filePath, MAX_SCRIPT_FILE_BYTES);
    if (smallFileChecked === null) {
      logForDebugging(
        `Plugin workflow ${filePath}: not a regular file or exceeds ${MAX_SCRIPT_FILE_BYTES} bytes \u2014 skipping`,
        {
          level: "warn",
        },
      );
      return null;
    }
    let scriptText = normalizeCrLf(smallFileChecked);
    let workflowScript = parseWorkflowScript(scriptText, {
      validateBody: false,
    });
    if ("error" in workflowScript) {
      logForDebugging(
        `Plugin workflow ${filePath} has invalid meta: ${workflowScript.error} \u2014 skipping`,
        {
          level: "warn",
        },
      );
      return null;
    }
    let name = `${pluginName}:${workflowScript.meta.name}`;
    return {
      source: "plugin",
      plugin,
      pluginManifest,
      name,
      description: workflowScript.meta.description,
      whenToUse: workflowScript.meta.whenToUse,
      phases: workflowScript.meta.phases,
      script: scriptText,
      filePath,
    };
  } catch (error) {
    logForDebugging(`Failed to load workflow from ${filePath}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-40b7pajj.js:1931-3281 placement
function loadPluginWorkflows(storageV5) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.workflows ??= (async () => {
    let { enabled, errors } = await loadAllPluginsCacheOnly(storageV5);
    let workflows = [];
    if (errors.length > 0)
      logForDebugging(`Plugin loading errors: ${errors.map((error) => pluginErrorText(error)).join(", ")}`);
    let failureCode = null;
    for (let plugin of enabled) {
      let seenPaths = new Set();
      let startCount = workflows.length;
      if (plugin.workflowsPath)
        try {
          let workflowDir = await readWorkflowDir(
            plugin.workflowsPath,
            plugin.name,
            plugin.source,
            plugin.manifest,
            seenPaths,
            plugin.entriesAnchor,
          );
          workflows.push(...workflowDir);
          if (workflowDir.length > 0)
            logForDebugging(
              `Loaded ${workflowDir.length} workflows from plugin ${plugin.name} default directory`,
            );
        } catch (error) {
          failureCode = "plugin_load_workflows_dir_failed";
          logForDebugging(`Failed to load workflows from plugin ${plugin.name} default directory: ${error}`, {
            level: "error",
          });
        }
      if (plugin.workflowsPaths)
        for (let workflowsPath of plugin.workflowsPaths)
          try {
            let stats = await getFsImplementation().stat(workflowsPath);
            if (stats.isDirectory()) {
              let workflowDir = await readWorkflowDir(
                workflowsPath,
                plugin.name,
                plugin.source,
                plugin.manifest,
                seenPaths,
                plugin.entriesAnchor,
              );
              workflows.push(...workflowDir);
              if (workflowDir.length > 0)
                logForDebugging(
                  `Loaded ${workflowDir.length} workflows from plugin ${plugin.name} custom path: ${workflowsPath}`,
                );
            } else if (stats.isFile() && workflowsPath.endsWith(".js")) {
              let pluginWorkflowFile = await readPluginWorkflowFile(
                workflowsPath,
                plugin.name,
                plugin.source,
                plugin.manifest,
                seenPaths,
              );
              if (pluginWorkflowFile) {
                workflows.push(pluginWorkflowFile);
                logForDebugging(`Loaded workflow from plugin ${plugin.name} custom file: ${workflowsPath}`);
              }
            }
          } catch (error) {
            failureCode = "plugin_load_workflows_path_failed";
            logForDebugging(
              `Failed to load workflows from plugin ${plugin.name} custom path ${workflowsPath}: ${error}`,
              {
                level: "error",
              },
            );
          }
      if (plugin.serverPluginId !== undefined)
        for (let workflow of workflows.slice(startCount)) workflow.serverPluginId = plugin.serverPluginId;
    }
    logForDebugging(`Total plugin workflows loaded: ${workflows.length}`);
    if (failureCode) logFeatureBad("plugin_load_workflows", failureCode);
    else logFeatureOk("plugin_load_workflows");
    return workflows;
  })();
  return pluginRegistry.workflows;
}
//@ chunk-40b7pajj.js:3309-3510 placement
function canOverrideWorkflow(incoming, existing) {
  if (!existing || isValidWorkflowScript(incoming.script)) return true;
  logForDebugging(
    `Workflow ${incoming.filePath ?? incoming.name} (${incoming.source}) would override ${incoming.name} but does not parse \u2014 keeping the ${existing.source} copy`,
    {
      level: "warn",
    },
  );
  return false;
}
//@ chunk-40b7pajj.js:3510-3624 placement
function dedupeWorkflowsByName(pluginWorkflows) {
  let byName = new Map();
  for (let workflow of pluginWorkflows) {
    if (!canOverrideWorkflow(workflow, byName.get(workflow.name))) continue;
    byName.set(workflow.name, workflow);
  }
  return [...byName.values()];
}
//@ chunk-40b7pajj.js:3652-3694 placement
/**
 * 配置目录下的用户工作流目录。
 */
function userWorkflowsDir() {
  return join(getClaudeConfigDir(), "workflows");
}
//@ chunk-40b7pajj.js:3694-3879 placement
async function walkProjectWorkflowDirs(cwd, stats) {
  try {
    return await getProjectDirsUpToHome("workflows", cwd);
  } catch (error) {
    if (isSyscallError(error)) {
      logForDebugging(`loadWorkflowsDir: project-dir walk failed: ${error.code}`, {
        level: "error",
      });
      stats.walkFailed = true;
      return [];
    }
    throw error;
  }
}
//@ chunk-40b7pajj.js:3879-4981 placement
async function loadUserWorkflows(dirPath, source, stats, storageV5) {
  if (storageV5 !== undefined && source === "userSettings")
    return loadWorkflowsDir(storageV5, dirPath, stats);
  let fsImplementation = getFsImplementation();
  let entries;
  try {
    entries = await fsImplementation.readdir(dirPath);
  } catch {
    return [];
  }
  return (
    await Promise.all(
      entries.map(async (entry) => {
        if (!(entry.isFile() || entry.isSymbolicLink())) return null;
        if (!entry.name.endsWith(".js")) {
          if (/\.(mjs|cjs|ts)$/.test(entry.name)) stats.nearMissExt++;
          return null;
        }
        let filePath = join(dirPath, entry.name);
        let bytes;
        try {
          if (
            entry.isSymbolicLink() &&
            (await checkSmallFileReadable(fsImplementation, filePath, Number.POSITIVE_INFINITY)).verdict !==
              "read"
          ) {
            logForDebugging(
              `Workflow ${filePath} is a link to no regular file, or one refused for where it leads \u2014 skipping`,
              {
                level: "warn",
              },
            );
            stats.skippedUnreadable++;
            return null;
          }
          bytes = await fsImplementation.readFileBytes(filePath, MAX_SCRIPT_FILE_BYTES + 1);
        } catch {
          stats.skippedUnreadable++;
          return null;
        }
        if (bytes.byteLength > MAX_SCRIPT_FILE_BYTES) {
          logForDebugging(`Workflow ${filePath} exceeds ${MAX_SCRIPT_FILE_BYTES} bytes \u2014 skipping`, {
            level: "warn",
          });
          stats.skippedOversize++;
          return null;
        }
        let scriptText = normalizeCrLf(bytes.toString("utf-8"));
        let workflowScript = parseWorkflowScript(scriptText, {
          validateBody: false,
        });
        if ("error" in workflowScript) {
          logForDebugging(`Workflow ${filePath} has invalid meta: ${workflowScript.error} \u2014 skipping`, {
            level: "warn",
          });
          stats.skippedInvalidMeta++;
          return null;
        }
        return {
          source,
          name: workflowScript.meta.name,
          description: workflowScript.meta.description,
          whenToUse: workflowScript.meta.whenToUse,
          phases: workflowScript.meta.phases,
          script: scriptText,
          filePath,
        };
      }),
    )
  ).filter((workflow) => workflow !== null);
}
//@ chunk-40b7pajj.js:4981-6476 placement
async function loadWorkflowsDir(storage, dirPath, stats) {
  let candidates = [];
  switch (
    (
      await readAllPages(
        (cursor) =>
          storage.listEntries(
            {
              namespace: "userConfigDir",
              dir: "workflows",
            },
            cursor === undefined
              ? undefined
              : {
                  cursor,
                },
          ),
        (entries) => {
          for (let entry of entries) {
            if (entry.kind !== "key" || entry.key.namespace !== "userConfigDir") continue;
            let last = entry.key.relPath.at(-1);
            if (last === undefined || entry.key.relPath.length !== 1) continue;
            if (!last.endsWith(".js")) {
              if (/\.(mjs|cjs|ts)$/.test(last)) stats.nearMissExt++;
              continue;
            }
            candidates.push({
              key: entry.key,
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
        `User workflows listing of ${dirPath} truncated at ${DEFAULT_MAX_PAGES} pages \u2014 loading the ${candidates.length} workflow files seen`,
        {
          level: "warn",
        },
      );
      stats.userListingTruncated = true;
      break;
  }
  return (
    await Promise.all(
      candidates.map(async ({ key, name: fileName }) => {
        let readResult = await storage.read([
          {
            key,
            offset: 0,
            length: MAX_SCRIPT_FILE_BYTES + 1,
          },
        ]);
        if (!readResult.ok) {
          logForDebugging(
            `Workflow ${join(dirPath, fileName)} could not be read through the storage backend (${readResult.error.code}) \u2014 skipping`,
            {
              level: "warn",
            },
          );
          stats.skippedUnreadable++;
          return null;
        }
        let item = readResult.value.items[0];
        if (item === undefined || !item.found) {
          stats.skippedUnreadable++;
          return null;
        }
        let filePath = join(dirPath, fileName);
        if (item.value.byteLength > MAX_SCRIPT_FILE_BYTES) {
          logForDebugging(`Workflow ${filePath} exceeds ${MAX_SCRIPT_FILE_BYTES} bytes \u2014 skipping`, {
            level: "warn",
          });
          stats.skippedOversize++;
          return null;
        }
        let scriptText = normalizeCrLf(Buffer.from(item.value).toString("utf-8"));
        let workflowScript = parseWorkflowScript(scriptText, {
          validateBody: false,
        });
        if ("error" in workflowScript) {
          logForDebugging(`Workflow ${filePath} has invalid meta: ${workflowScript.error} \u2014 skipping`, {
            level: "warn",
          });
          stats.skippedInvalidMeta++;
          return null;
        }
        return {
          source: "userSettings",
          name: workflowScript.meta.name,
          description: workflowScript.meta.description,
          whenToUse: workflowScript.meta.whenToUse,
          phases: workflowScript.meta.phases,
          script: scriptText,
          filePath,
        };
      }),
    )
  ).filter((workflow) => workflow !== null);
}
//@ chunk-40b7pajj.js:6476-7669 placement
async function discoverProjectWorkflows(cwd, storageV5) {
  let userDir = userWorkflowsDir();
  let stats = {
    skippedInvalidMeta: 0,
    skippedOversize: 0,
    skippedUnreadable: 0,
    nearMissExt: 0,
    walkFailed: false,
    userListingTruncated: false,
  };
  let projectDirs = await walkProjectWorkflowDirs(cwd, stats);
  let [userWorkflows, ...projectResults] = await Promise.all([
    isSettingSourceEnabled("userSettings")
      ? loadUserWorkflows(userDir, "userSettings", stats, storageV5)
      : Promise.resolve([]),
    ...(isSettingSourceEnabled("projectSettings")
      ? projectDirs.map((dir) => loadUserWorkflows(dir, "projectSettings", stats))
      : []),
  ]);
  let byName = new Map();
  for (let workflow of userWorkflows) {
    if (!canOverrideWorkflow(workflow, byName.get(workflow.name))) continue;
    byName.set(workflow.name, workflow);
  }
  for (let j = projectResults.length - 1; j >= 0; j--)
    for (let workflow of projectResults[j]) {
      if (!canOverrideWorkflow(workflow, byName.get(workflow.name))) continue;
      byName.set(workflow.name, workflow);
    }
  let walkFailed = stats.walkFailed && isSettingSourceEnabled("projectSettings");
  let skippedTotal = stats.skippedInvalidMeta + stats.skippedOversize + stats.skippedUnreadable;
  if (walkFailed || stats.userListingTruncated || skippedTotal > 0 || stats.nearMissExt > 0)
    logFeatureSad(
      "workflow_discover",
      walkFailed
        ? "project_dir_walk_failed"
        : stats.userListingTruncated
          ? "user_listing_truncated"
          : stats.skippedInvalidMeta > 0
            ? "invalid_meta"
            : stats.skippedOversize > 0
              ? "oversize"
              : stats.skippedUnreadable > 0
                ? "unreadable"
                : "near_miss_extension",
      {
        found: byName.size,
        skipped_invalid_meta: stats.skippedInvalidMeta,
        skipped_oversize: stats.skippedOversize,
        skipped_unreadable: stats.skippedUnreadable,
        near_miss_ext: stats.nearMissExt,
        ...(stats.userListingTruncated && {
          user_listing_truncated: true,
        }),
      },
    );
  else
    logFeatureOk("workflow_discover", {
      found: byName.size,
    });
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}
//@ chunk-40b7pajj.js:7669-7775 placement
var REMOTE_WORKFLOW_ENV = "CLAUDE_REMOTE_WORKFLOW_SCRIPT";
var CLAUDE_REMOTE_WORKFLOW_ARGS = "CLAUDE_REMOTE_WORKFLOW_ARGS";
var CLAUDE_WORKFLOW_NAME_ONLY = "CLAUDE_WORKFLOW_NAME_ONLY";
//@ chunk-40b7pajj.js:7775-7825 placement
/**
 * 读环境变量 CLAUDE_WORKFLOW_NAME_ONLY。
 */
function workflowNameOnlyEnv() {
  return env.CLAUDE_WORKFLOW_NAME_ONLY;
}
//@ chunk-40b7pajj.js:7825-7914 placement
/**
 * 按 host 与配置键缓存全部工作流。
 */
function allWorkflowsForHost(cwd, storageV5) {
  return getOrCreate(
    getHostState().allWorkflows,
    `${bundledSkillsGateKey()}:${workflowNameOnlyEnv()}:${keyOrNull(cwd)}`,
    () => loadAllWorkflows(cwd, storageV5),
  );
}
//@ chunk-40b7pajj.js:7914-8276 placement
/**
 * 汇总可用工作流：内置 + 插件（同名后者覆盖、不可解析的不覆盖）+ 项目目录工作流，按优先级去重；禁用自定义或只允许命名内置时只返回内置。
 */
async function loadAllWorkflows(cwd, storageV5) {
  if (isCustomizationDisabled("workflows") || workflowNameOnlyEnv()) return [...getBundledWorkflows()];
  let [workflows, pluginWorkflows] = await Promise.all([
    discoverProjectWorkflows(cwd, storageV5),
    loadPluginWorkflows(storageV5),
  ]);
  let plugins = dedupeWorkflowsByName(pluginWorkflows);
  let bundledWorkflows = getBundledWorkflows();
  let byName = new Map(bundledWorkflows.map((workflow) => [workflow.name, workflow]));
  let overridingPlugins = overridableWorkflows(plugins, byName);
  for (let workflow of overridingPlugins) byName.set(workflow.name, workflow);
  let overridingProjects = overridableWorkflows(workflows, byName);
  let projectNames = new Set(overridingProjects.map((workflow) => workflow.name));
  let filtered = overridingPlugins.filter((workflow) => !projectNames.has(workflow.name));
  let overriddenNames = new Set([...projectNames, ...filtered.map((workflow) => workflow.name)]);
  return [
    ...bundledWorkflows.filter((workflow) => !overriddenNames.has(workflow.name)),
    ...filtered,
    ...overridingProjects,
  ];
}
//@ chunk-40b7pajj.js:8276-8333 placement
/**
 * 过滤出可被覆盖的工作流。
 */
function overridableWorkflows(workflows, byName) {
  return workflows.filter((workflow) => canOverrideWorkflow(workflow, byName.get(workflow.name)));
}
//@ chunk-40b7pajj.js:8333-8404 placement
/**
 * 按名字查找工作流。
 */
async function findWorkflowByName(name, cwd, storageV5) {
  return (await allWorkflowsForHost(cwd, storageV5)).find((workflow) => workflow.name === name);
}
//@ chunk-40b7pajj.js:8404-8451 placement
/**
 * 清空工作流缓存与插件工作流。
 */
function clearAllWorkflows() {
  getHostState().allWorkflows.clear();
  clearPluginWorkflows();
}
export {
  allWorkflowsForHost,
  REMOTE_WORKFLOW_ENV,
  CLAUDE_REMOTE_WORKFLOW_ARGS,
  workflowNameOnlyEnv,
  findWorkflowByName,
  CLAUDE_WORKFLOW_NAME_ONLY,
  userWorkflowsDir,
  clearAllWorkflows,
};
