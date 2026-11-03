/**
 * utils/plugins/loadPluginAgents.ts
 *
 * 从插件 agents/ 目录加载子代理定义（frontmatter 解析、命名空间、禁止字段）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/loadPluginAgents.ts
 * pieces: chunk-bfnfj4kx.js (1), chunk-e6aww6q8.js (11)
 * attribution: fingerprint 3, placement 7, layout 2
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import { AWe } from "../frontmatterSchema.js";
import { BQ } from "../objectUtils.js";
import { similarNames } from "../settings/managedEnvKeys.js";
import { zG, formatFailureDetails_2, loadAllPluginsCacheOnly } from "./pluginLoader.js";
import { Mu } from "../stringUtils.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { getBuiltinPlugin } from "../../plugins/builtinPlugins.js";
import { walkPluginMarkdown } from "./walkPluginMarkdown.js";
import { getFsImplementation, isDuplicatePath } from "../fsOperations.js";
import { readSmallFileChecked } from "../readSmallFile.js";
import {
  parseFrontmatter,
  parseFrontmatterName,
  coerceDescriptionToString,
  parsePositiveIntFromFrontmatter,
  parseBoundedIntFromFrontmatter,
  parseExperimentalCacheTtl,
} from "../frontmatterParser.js";
import {
  parseAgentToolsFromFrontmatter,
  parseSlashCommandToolsFromFrontmatter,
} from "../markdownConfigLoader.js";
import {
  substitutePluginVariables,
  substituteUserConfigInContent,
  loadPluginOptions,
} from "./pluginOptionsStorage.js";
import { parseEffortValue, EFFORT_LEVELS } from "../effort.js";
import { Kx, d0 } from "../config.js";
import { isAutoMemoryEnabled } from "../../memdir/paths.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { loadAgentMemoryPrompt } from "../../tools/AgentTool/agentMemory.js";
import { pluginDisplayKey } from "./pluginIdentifier.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { pluginErrorText } from "../../types/plugin.js";
import { pluginGrantProvenanceOf } from "../permissions/permissionsLoader.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:2316979-2317099 placement
var RENAMED_AGENT_FRONTMATTER_KEYS = new Map([
    ["allowedtools", "tools"],
    ["whentouse", "description"],
    ["mode", null],
  ]),
  WHEN_TO_USE_KEY_SPELLINGS = ["when_to_use", "when-to-use"];
//@ chunk-e6aww6q8.js:2317099-2317779 placement
function validatePluginAgentFrontmatter({
  subject: subject,
  filePath: filePath,
  frontmatter: frontmatter,
  unhintedKeys: unhintedKeys = [],
}) {
  try {
    let keys = Object.keys(AWe().shape),
      y = subject === "Plugin agent file" ? [...keys, ...WHEN_TO_USE_KEY_SPELLINGS] : keys,
      S = new Set(y),
      filtered = y.filter((Se) => !unhintedKeys.includes(Se)),
      filtered_2 = Object.keys(frontmatter).filter((Se) => !S.has(Se)),
      mapped = filtered_2.map((Se) => {
        let ke = RENAMED_AGENT_FRONTMATTER_KEYS.get(BQ(Se)),
          we =
            ke !== void 0
              ? (ke ?? void 0)
              : (filtered.find((Ee) => BQ(Ee) === BQ(Se)) ?? similarNames(Se, filtered, 1)[0]);
        return we !== void 0 && filtered.includes(we) ? `${zG(Se)} (did you mean "${we}"?)` : zG(Se);
      }),
      q =
        filtered_2.length === 0
          ? ""
          : `${subject} ${Mu(filePath)} has ${filtered_2.length === 1 ? "a frontmatter key" : "frontmatter keys"} Claude Code does not recognize or apply: ${formatFailureDetails_2(mapped)}`;
    if (claimOnce().claimIfChanged(`agent-frontmatter-unknown-keys:${subject}:${filePath}`, q) && q !== "")
      logForDebugging(q, { level: "warn" });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2317809-2317970 placement
var builtinAgentFilesFromBundle = (e, n) =>
  Object.entries(n)
    .filter(([r]) => r.startsWith(`${loadAgentsFromDirectory}/`))
    .map(([r, s]) => ({ filePath: `builtin:${e}/${r}`, namespace: r.split("/").slice(1, -1), text: s }));
//@ chunk-e6aww6q8.js:2317970-2318132 placement
function getBuiltinPluginAgentsSource(e) {
  let n = getBuiltinPlugin(e)?.hooksModule,
    r = n !== void 0 && "folder" in n,
    h = n !== void 0 && "files" in n ? { files: builtinAgentFilesFromBundle(e, n.files) } : void 0;
  return r ? { folder: join_77(n.folder, loadAgentsFromDirectory) } : h;
}
//@ chunk-e6aww6q8.js:2318132-2318179 placement = isMcpServerFromProjectOrLocalSettings (1)
var jan = 1048576,
  Wan = ["user", "project", "local"];
//@ chunk-e6aww6q8.js:2318179-2318359 placement
async function loadAgentsFromDir(e, n, r, s, h, y, S, w = !1) {
  let L = [];
  return (
    await walkPluginMarkdown(
      e,
      async (G, q) => {
        let Z = await loadAgentFile(G, n, q, r, s, h, S);
        if (Z) L.push(Z);
      },
      { logLabel: "agents", isRootOptional: w, loadedPaths: y },
    ),
    L
  );
}
/**
 * 读取单个插件代理 markdown（非普通文件或超过 jan 字节跳过并记 warn），交给 loadAgentFromFile 解析；出错返回 null。
 */
//@ chunk-e6aww6q8.js:2318359-2318755 placement
async function loadAgentFile(e, n, r, s, h, y, S) {
  let w = getFsImplementation();
  try {
    let L = await readSmallFileChecked(w, e, jan);
    if (L === null)
      return (
        logForDebugging(`Skipping plugin agent ${e}: not a regular file or exceeds ${jan} byte limit`, {
          level: "warn",
        }),
        null
      );
    return await loadAgentFromFile({
      filePath: e,
      content: L,
      pluginName: n,
      namespace: r,
      sourceName: s,
      pluginPath: h,
      pluginManifest: y,
      credentials: S,
    });
  } catch (error) {
    return (logForDebugging(`Failed to load agent from ${e}: ${error}`, { level: "error" }), null);
  }
}
//@ chunk-e6aww6q8.js:2318755-2318873 layout
var PLUGIN_AGENT_FORBIDDEN_FIELDS = ["permissionMode", "hooks", "mcpServers"],
  PLUGIN_AGENT_IGNORED_FIELDS = ["initialPrompt", "observer", "observerMessage", "observeSubagents"];
/**
 * 从插件的 agents/*.md 解析一个代理定义：frontmatter（name、description、tools、model、color…，插件代理禁止 permissionMode/hooks/mcpServers 等字段），名字加 <插件>: 命名空间，正文作为系统提示（替换插件变量与 user_config）。
 */
//@ chunk-e6aww6q8.js:2318873-2321705 fingerprint = loadAgentFromFile (0.676)
async function loadAgentFromFile({
  filePath: filePath,
  content: content,
  pluginName: pluginName,
  namespace: namespace,
  sourceName: sourceName,
  pluginPath: pluginPath,
  pluginManifest: pluginManifest,
  credentials: credentials,
  untrusted: untrusted,
  pluginDataDir: pluginDataDir,
}) {
  let {
    frontmatter: frontmatter,
    content: content_2,
    parseError: parseError,
  } = parseFrontmatter(content, filePath, { normalizeKeys: !0, untrusted: untrusted });
  if (untrusted && parseError !== void 0) throw Error("the frontmatter is refused or does not parse");
  let ke =
      parseFrontmatterName(frontmatter.name, `plugin agent ${filePath}`) ||
      basename_43(filePath).replace(/\.md$/, ""),
    agentType = [pluginName, ...namespace, ke].join(":"),
    Ae =
      coerceDescriptionToString(frontmatter.description, agentType) ??
      coerceDescriptionToString(frontmatter.when_to_use, agentType) ??
      coerceDescriptionToString(frontmatter["when-to-use"], agentType) ??
      `Agent from ${pluginName} plugin`,
    tools = parseAgentToolsFromFrontmatter(frontmatter.tools),
    skills = parseSlashCommandToolsFromFrontmatter(frontmatter.skills),
    { color: color, model: model } = frontmatter,
    lt;
  if (typeof model === "string" && model.trim().length > 0) {
    let trimmed = model.trim();
    lt = trimmed.toLowerCase() === "inherit" ? "inherit" : trimmed;
  }
  let backgroundRaw = frontmatter.background,
    nt = backgroundRaw === "true" || backgroundRaw === !0 ? !0 : void 0,
    omitClaudeMd = frontmatter.omitClaudeMd,
    Et = omitClaudeMd === "true" || omitClaudeMd === !0 ? !0 : void 0,
    systemPrompt = substitutePluginVariables(content_2.trim(), {
      path: pluginPath,
      source: sourceName,
      dataDir: pluginDataDir,
    });
  if (pluginManifest.userConfig)
    systemPrompt = substituteUserConfigInContent(
      systemPrompt,
      await loadPluginOptions(sourceName, credentials),
      pluginManifest.userConfig,
    );
  let memoryRaw = frontmatter.memory,
    At;
  if (memoryRaw !== void 0)
    if (Wan.includes(memoryRaw)) At = memoryRaw;
    else
      logForDebugging(
        `Plugin agent file ${filePath} has invalid memory value '${memoryRaw}'. Valid options: ${Wan.join(", ")}`,
      );
  let Yt = frontmatter.isolation === "worktree" ? "worktree" : void 0,
    effortRaw = frontmatter.effort,
    Zt = effortRaw !== void 0 ? parseEffortValue(effortRaw) : void 0;
  if (effortRaw !== void 0 && Zt === void 0)
    logForDebugging(
      `Plugin agent file ${filePath} has invalid effort '${effortRaw}'. Valid options: ${EFFORT_LEVELS.join(", ")} or an integer`,
    );
  let rn = Mu(filePath);
  for (let Xn of PLUGIN_AGENT_FORBIDDEN_FIELDS)
    if (frontmatter[Xn] !== void 0)
      logForDebugging(
        `Plugin agent file ${rn} sets ${Xn}, which is ignored for plugin agents. Use .claude/agents/ for this level of control.`,
        { level: "warn" },
      );
  for (let Xn of PLUGIN_AGENT_IGNORED_FIELDS)
    if (frontmatter[Xn] !== void 0)
      logForDebugging(
        `Plugin agent file ${rn} sets ${Xn}, which is ignored for plugin agents. Define the agent in .claude/agents/ to use ${Xn}.`,
        { level: "warn" },
      );
  validatePluginAgentFrontmatter({
    subject: "Plugin agent file",
    filePath: filePath,
    frontmatter: frontmatter,
    unhintedKeys: [...PLUGIN_AGENT_FORBIDDEN_FIELDS, ...PLUGIN_AGENT_IGNORED_FIELDS],
  });
  let maxTurnsRaw = frontmatter.maxTurns,
    maxTurns = parsePositiveIntFromFrontmatter(maxTurnsRaw);
  if (maxTurnsRaw !== void 0 && maxTurns === void 0)
    logForDebugging(
      `Plugin agent file ${filePath} has invalid maxTurns '${maxTurnsRaw}'. Must be a positive integer.`,
    );
  let autoCompactWindow = frontmatter.autoCompactWindow,
    ho = parseBoundedIntFromFrontmatter(autoCompactWindow);
  if (autoCompactWindow !== void 0 && ho === void 0)
    logForDebugging(
      `Plugin agent file ${filePath} has invalid autoCompactWindow '${autoCompactWindow}'. Must be an integer from ${Kx} to ${d0}.`,
      { level: "warn" },
    );
  let yn = parseExperimentalCacheTtl(frontmatter),
    Kn =
      frontmatter.disallowedTools !== void 0
        ? parseAgentToolsFromFrontmatter(frontmatter.disallowedTools)
        : void 0;
  if (isAutoMemoryEnabled() && At && tools !== void 0) {
    let toolSet = new Set(tools);
    for (let tool of [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME])
      if (!toolSet.has(tool)) tools = [...tools, tool];
  }
  return {
    agentType: agentType,
    whenToUse: Ae,
    tools: tools,
    ...(Kn !== void 0 && { disallowedTools: Kn }),
    ...(skills !== void 0 && { skills: skills }),
    getSystemPrompt: (Xn) => {
      if (isAutoMemoryEnabled() && At) {
        let fo = loadAgentMemoryPrompt(agentType, At, Xn?.toolUseContext?.storageV5, Xn?.primedAgentMemory);
        return (
          systemPrompt +
          `

` +
          fo
        );
      }
      return systemPrompt;
    },
    source: "plugin",
    color: color,
    model: lt,
    filename: ke,
    filePath: filePath,
    plugin: sourceName,
    pluginSource: {
      filePath: filePath,
      pluginName: pluginName,
      namespace: namespace,
      sourceName: sourceName,
      pluginPath: pluginPath,
      pluginManifest: pluginManifest,
    },
    ...(nt && { background: nt }),
    ...(Et && { omitClaudeMd: Et }),
    ...(At && { memory: At }),
    ...(Yt && { isolation: Yt }),
    ...(Zt !== void 0 && { effort: Zt }),
    ...(maxTurns !== void 0 && { maxTurns: maxTurns }),
    ...(ho !== void 0 && { autoCompactWindow: ho }),
    ...(yn !== void 0 && { cacheTtl: yn }),
  };
}
/**
 * 内置插件：hooksModule 给的是目录就按目录遍历加载，给的是打包文件就逐个解析内容；失败的条目记错误并丢弃。
 */
//@ chunk-e6aww6q8.js:2321705-2322206 layout
async function loadBuiltinPluginAgents(e, n, r) {
  let s = getBuiltinPluginAgentsSource(e.name);
  if (s === void 0) return [];
  let h = pluginDisplayKey(e.name, e.source);
  if ("folder" in s) return loadAgentsFromDir(s.folder, h, e.source, e.path, e.manifest, n, r, !0);
  return (
    await Promise.all(
      s.files.map(async (file) => {
        try {
          return await loadAgentFromFile({
            filePath: file.filePath,
            content: file.text,
            pluginName: h,
            namespace: file.namespace,
            sourceName: e.source,
            pluginPath: e.path,
            pluginManifest: e.manifest,
            credentials: r,
          });
        } catch (error) {
          return (
            logForDebugging(`Failed to load agent from ${file.filePath}: ${error}`, { level: "error" }),
            null
          );
        }
      }),
    )
  ).filter((S) => S !== null);
}
/**
 * 加载所有启用插件的代理（缓存在全局 agents），扫描 agentsPath/agentsPaths 下的 markdown。
 */
//@ chunk-e6aww6q8.js:2322206-2323863 fingerprint = loadPluginAgents (0.827)
function loadPluginAgents(e, n) {
  let r = getPluginRegistry();
  return (
    (r.agents ??= (async () => {
      let { enabled: enabled, errors: errors } = await loadAllPluginsCacheOnly(e);
      if (r.handedIn !== void 0) {
        let results = await Promise.all(
          enabled.filter((G) => G.isBuiltin).map((G) => loadBuiltinPluginAgents(G, new Set(), n)),
        );
        return [...(await r.handedIn).agents, ...results.flat()];
      }
      if (errors.length > 0)
        logForDebugging(`Plugin loading errors: ${errors.map((L) => pluginErrorText(L)).join(", ")}`);
      let y = null,
        flat = (
          await Promise.all(
            enabled.map(async (plugin) => {
              let loadedPaths = new Set(),
                pluginAgents = [];
              if (plugin.agentsPath)
                try {
                  let Se = await loadAgentsFromDir(
                    plugin.agentsPath,
                    plugin.name,
                    plugin.source,
                    plugin.path,
                    plugin.manifest,
                    loadedPaths,
                    n,
                  );
                  if ((pluginAgents.push(...Se), Se.length > 0))
                    logForDebugging(
                      `Loaded ${Se.length} agents from plugin ${plugin.name} default directory`,
                    );
                } catch (error) {
                  ((y = "plugin_load_agents_dir_failed"),
                    logForDebugging(
                      `Failed to load agents from plugin ${plugin.name} default directory: ${error}`,
                      { level: "error" },
                    ));
                }
              if (plugin.agentsPaths) {
                let pathResults = await Promise.all(
                  plugin.agentsPaths.map(async (agentPath) => {
                    try {
                      let fs = getFsImplementation(),
                        stats = await fs.stat(agentPath);
                      if (stats.isDirectory()) {
                        let Ae = await loadAgentsFromDir(
                          agentPath,
                          plugin.name,
                          plugin.source,
                          plugin.path,
                          plugin.manifest,
                          loadedPaths,
                          n,
                        );
                        if (Ae.length > 0)
                          logForDebugging(
                            `Loaded ${Ae.length} agents from plugin ${plugin.name} custom path: ${agentPath}`,
                          );
                        return Ae;
                      } else if (stats.isFile() && agentPath.endsWith(".md")) {
                        if (isDuplicatePath(fs, agentPath, loadedPaths)) return [];
                        let agent = await loadAgentFile(
                          agentPath,
                          plugin.name,
                          [],
                          plugin.source,
                          plugin.path,
                          plugin.manifest,
                          n,
                        );
                        if (agent)
                          return (
                            logForDebugging(
                              `Loaded agent from plugin ${plugin.name} custom file: ${agentPath}`,
                            ),
                            [agent]
                          );
                      }
                      return [];
                    } catch (error) {
                      return (
                        (y = "plugin_load_agents_path_failed"),
                        logForDebugging(
                          `Failed to load agents from plugin ${plugin.name} custom path ${agentPath}: ${error}`,
                          { level: "error" },
                        ),
                        []
                      );
                    }
                  }),
                );
                for (let agents of pathResults) pluginAgents.push(...agents);
              }
              if (plugin.isBuiltin)
                pluginAgents.push(...(await loadBuiltinPluginAgents(plugin, loadedPaths, n)));
              let Z = pluginGrantProvenanceOf(plugin);
              return pluginAgents.map((Se) => (Se.source === "plugin" ? { ...Se, pluginProvenance: Z } : Se));
            }),
          )
        ).flat();
      if ((logForDebugging(`Total plugin agents loaded: ${flat.length}`), y))
        logFeatureBad("plugin_load_agents", y);
      else logFeatureOk("plugin_load_agents");
      return flat;
    })()),
    r.agents
  );
}
//@ chunk-bfnfj4kx.js:75173-75190 fingerprint = loadAgentsFromDirectory (0.741)
var loadAgentsFromDirectory = "agents";

export { loadPluginAgents, validatePluginAgentFrontmatter };
