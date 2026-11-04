/**
 * services/selfHostedRunner/sessionEnvironment.ts
 *
 * 2.1.316 新增：自托管 runner 合成会话子进程环境（继承、服务器下发与 runner 强制变量的合并）与 agent_files 校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (8)
 * attribution: placement 8
 */
import { join } from "path";
import { jsonStringify } from "../../utils/slowOperations.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedErrCodeForTelemetry,
} from "../../utils/errors.js";
import { safeParseJSON } from "../../utils/json.js";
import { validateAgentsJson, parseAgentFromMarkdown } from "../../tools/AgentTool/loadAgentsDir.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";
import { parseAgentToolsFromFrontmatter } from "../../utils/markdownConfigLoader.js";
import { withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { writeSessionFileAtomically } from "./hostConfigSnapshot.js";
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";

//@ chunk-hm0ce8vc.js:35698-36432 placement
/**
 * 合并继承环境、服务器环境与 runner 强制变量；丢弃与强制变量同名变体或非法值并回调 onDropped。
 */
function mergeSessionEnv({ inheritedEnv, serverEnv, enforcedEnv, onDropped }) {
  let enforcedFoldedNames = new Set(Object.keys(enforcedEnv).map(foldEnvNameForComparison));
  let included = String(enforcedEnv.PATH).includes("\x00");
  let merged = new Map();
  for (let [source, envMap] of [
    ["inherited", inheritedEnv],
    ["server", serverEnv],
  ])
    for (let [key, value] of Object.entries(envMap)) {
      if (value === undefined) continue;
      let foldedKey = foldEnvNameForComparison(key);
      if (key === "" || /[=\0]/.test(key) || String(value).includes("\x00"))
        onDropped(
          jsonStringify(firstLineOf(firstLineOf(key, "="), "\x00")),
          "not a usable environment entry",
          source,
        );
      else if (
        !enforcedFoldedNames.has(foldedKey) ||
        (source === "inherited" && included && foldedKey === "PATH")
      )
        merged.set(key, value);
      else if (!Object.hasOwn(enforcedEnv, key))
        onDropped(jsonStringify(key), "a variant of a runner-enforced name", source);
    }
  for (let [key, value] of Object.entries(enforcedEnv)) {
    if (value === undefined) continue;
    if (String(value).includes("\x00"))
      onDropped(
        jsonStringify(key),
        "a runner-enforced value that is not a usable environment value",
        "enforced",
      );
    else merged.set(key, value);
  }
  return Object.fromEntries(merged);
}
//@ chunk-hm0ce8vc.js:36432-36524 placement
/**
 * NFKD 去掉组合符后大写，用于判断变量名是否为强制变量的变体。
 */
function foldEnvNameForComparison(name) {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().toUpperCase();
}
//@ chunk-hm0ce8vc.js:36553-36633 placement
/**
 * agent_files 校验用常量：条目数上限、单个内容上限、--agents 文件写入超时，以及 agent 名模式与文件名。
 */
var AGENT_NAME_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
var REMOTE_AGENTS_JSON = "remote-agents.json";
var MAX_AGENT_FILES = 64;
var MAX_AGENT_FILE_BYTES = 1048576;
var AGENTS_FILE_WRITE_TIMEOUT_MS = 1e4;
//@ chunk-hm0ce8vc.js:36633-37395 placement
/**
 * 校验服务器下发的 agent_files：数组、条目数、名字格式、内容大小、重名。
 */
function validateAgentFiles(agentFiles) {
  if (!Array.isArray(agentFiles))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `agent_files is not an array: ${jsonStringify(typeof agentFiles)}`,
      "agent_files is not an array",
    );
  if (agentFiles.length > MAX_AGENT_FILES)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `agent_files has ${agentFiles.length} entries (at most ${MAX_AGENT_FILES})`,
      "agent_files has too many entries",
    );
  let seenNames = new Set();
  for (let agentFile of agentFiles) {
    let name = agentFile?.name;
    if (typeof name !== "string" || !AGENT_NAME_PATTERN.test(name))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent_files entry rejected (name must match ${AGENT_NAME_PATTERN}): ${jsonStringify(name)}`,
        "agent_files entry has an invalid name",
      );
    let content = agentFile.content;
    if (typeof content !== "string" || Buffer.byteLength(content) > MAX_AGENT_FILE_BYTES)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent_files entry '${name}' rejected (content must be a string of at most ${MAX_AGENT_FILE_BYTES} bytes)`,
        "agent_files entry has invalid content",
      );
    if (seenNames.has(name))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent_files contains duplicate name: ${jsonStringify(name)}`,
        "agent_files contains a duplicate name",
      );
    seenNames.add(name);
  }
}
//@ chunk-hm0ce8vc.js:37395-37843 placement
/**
 * 把 agent_files 与服务器 --agents 参数合成会话的 --agents 值。
 */
function buildAgentsArgFromFiles(agentFiles, serverAgentsArg) {
  validateAgentFiles(agentFiles);
  let parsedServerAgents =
    serverAgentsArg === undefined || String(serverAgentsArg) === ""
      ? {}
      : safeParseJSON(String(serverAgentsArg), false);
  if (
    typeof parsedServerAgents !== "object" ||
    parsedServerAgents === null ||
    Array.isArray(parsedServerAgents)
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "claude_code_args agents is not a JSON object",
      "claude_code_args agents is not a JSON object",
    );
  let agents = {
    ...parsedServerAgents,
  };
  for (let { name, content } of agentFiles) agents[name] = parseAgentFileEntry(name, content);
  let agentsJson = jsonStringify(agents);
  let validationError = validateAgentsJson(agentsJson);
  if (validationError !== null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `agent_files do not form a valid --agents value: ${validationError}`,
      "agent_files do not form a valid --agents value",
    );
  return agentsJson;
}
//@ chunk-hm0ce8vc.js:37843-39183 placement
/**
 * 解析单个 agent 文件的 frontmatter，确认它定义的是同名 agent。
 */
function parseAgentFileEntry(name, content) {
  let filePath = `${name}.md`;
  let { frontmatter, content: content_2 } = parseFrontmatter(content, filePath, {
    normalizeKeys: true,
  });
  let agentFromMarkdown = parseAgentFromMarkdown(filePath, "", frontmatter, content_2, "flagSettings");
  if (agentFromMarkdown === null || agentFromMarkdown.agentType !== name)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `agent_files entry '${name}' is not an agent definition named '${name}' (frontmatter needs name: ${name} and a description)`,
      "agent_files entry is not a matching agent definition",
    );
  let agentToolsFromFrontmatter = parseAgentToolsFromFrontmatter(frontmatter.tools);
  return {
    description: agentFromMarkdown.whenToUse,
    prompt: content_2.trim(),
    ...(agentToolsFromFrontmatter !== undefined && {
      tools: agentToolsFromFrontmatter,
    }),
    ...(agentFromMarkdown.disallowedTools !== undefined && {
      disallowedTools: agentFromMarkdown.disallowedTools,
    }),
    ...(agentFromMarkdown.model !== undefined && {
      model: agentFromMarkdown.model,
    }),
    ...(agentFromMarkdown.effort !== undefined && {
      effort: agentFromMarkdown.effort,
    }),
    ...(agentFromMarkdown.permissionMode !== undefined && {
      permissionMode: agentFromMarkdown.permissionMode,
    }),
    ...(agentFromMarkdown.mcpServers !== undefined && {
      mcpServers: agentFromMarkdown.mcpServers,
    }),
    ...(agentFromMarkdown.hooks !== undefined && {
      hooks: agentFromMarkdown.hooks,
    }),
    ...(agentFromMarkdown.maxTurns !== undefined && {
      maxTurns: agentFromMarkdown.maxTurns,
    }),
    ...(agentFromMarkdown.autoCompactWindow !== undefined && {
      autoCompactWindow: agentFromMarkdown.autoCompactWindow,
    }),
    ...(agentFromMarkdown.skills !== undefined &&
      agentFromMarkdown.skills.length > 0 && {
        skills: agentFromMarkdown.skills,
      }),
    ...(agentFromMarkdown.initialPrompt !== undefined && {
      initialPrompt: agentFromMarkdown.initialPrompt,
    }),
    ...(agentFromMarkdown.memory !== undefined && {
      memory: agentFromMarkdown.memory,
    }),
    ...(agentFromMarkdown.background !== undefined && {
      background: agentFromMarkdown.background,
    }),
    ...(agentFromMarkdown.omitClaudeMd !== undefined && {
      omitClaudeMd: agentFromMarkdown.omitClaudeMd,
    }),
    ...(agentFromMarkdown.isolation !== undefined && {
      isolation: agentFromMarkdown.isolation,
    }),
    ...(agentFromMarkdown.observer !== undefined && {
      observer: agentFromMarkdown.observer,
    }),
    ...(agentFromMarkdown.observerMessage !== undefined && {
      observerMessage: agentFromMarkdown.observerMessage,
    }),
    ...(agentFromMarkdown.observeSubagents !== undefined && {
      observeSubagents: agentFromMarkdown.observeSubagents,
    }),
  };
}
//@ chunk-hm0ce8vc.js:39183-39874 placement
/**
 * 把合成的 agents 定义写入会话配置目录（remote-agents.json）。
 */
async function writeSessionAgentsFile(options) {
  let { args, agentFiles, serverAgentsArg, configDir, stagedPaths } = options;
  if (
    Array.isArray(agentFiles) &&
    agentFiles.length === 0 &&
    (serverAgentsArg === undefined || String(serverAgentsArg) === "")
  )
    return;
  await withFeatureTelemetry(
    "self_hosted_agent_files",
    async () => {
      let agentsArgFromFiles = buildAgentsArgFromFiles(agentFiles, serverAgentsArg);
      let agentsPath = join(configDir, REMOTE_AGENTS_JSON);
      stagedPaths.push(agentsPath);
      let cancelState = {
        cancelled: false,
      };
      try {
        await withBoundedTimeout(
          writeSessionFileAtomically(configDir, REMOTE_AGENTS_JSON, agentsArgFromFiles, 384, cancelState),
          AGENTS_FILE_WRITE_TIMEOUT_MS,
          `[runner:stuck] write ${agentsPath} (check NFS/CSI mount health)`,
        );
      } catch (error) {
        cancelState.cancelled = true;
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `could not write the --agents file for the session (${sanitizedErrCodeForTelemetry(error) ?? "unknown error"})`,
          "could not write the --agents file for the session",
        );
      }
      args.push("--agents", agentsPath);
      options.onDebug(
        `[runner:session] delivering agents by file: ${agentsPath} (${agentFiles.length} server-composed, ${Buffer.byteLength(agentsArgFromFiles)} bytes)`,
      );
    },
    () => "deliver_failed",
  );
}
//@ chunk-hm0ce8vc.js:39874-39893 placement
var GITHUB_API_HOST = `api.${GITHUB_HOST}`;
export { writeSessionAgentsFile, mergeSessionEnv };
