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
import { join, join as join_2, join as join_3, join as join_4, join as join_5, join as join_6 } from "path";
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

/**
 * 合并继承环境、服务器环境与 runner 强制变量；丢弃与强制变量同名变体或非法值并回调 onDropped。
 */
//@ chunk-hm0ce8vc.js:35698-36432 placement
function mergeSessionEnv({
  inheritedEnv: inheritedEnv,
  serverEnv: serverEnv,
  enforcedEnv: enforcedEnv,
  onDropped: onDropped,
}) {
  let a = new Set(Object.keys(enforcedEnv).map(foldEnvNameForComparison)),
    included = String(enforcedEnv.PATH).includes("\x00"),
    l = new Map();
  for (let [u, h] of [
    ["inherited", inheritedEnv],
    ["server", serverEnv],
  ])
    for (let [p, S] of Object.entries(h)) {
      if (S === void 0) continue;
      let T = foldEnvNameForComparison(p);
      if (p === "" || /[=\0]/.test(p) || String(S).includes("\x00"))
        onDropped(
          jsonStringify(firstLineOf(firstLineOf(p, "="), "\x00")),
          "not a usable environment entry",
          u,
        );
      else if (!a.has(T) || (u === "inherited" && included && T === "PATH")) l.set(p, S);
      else if (!Object.hasOwn(enforcedEnv, p))
        onDropped(jsonStringify(p), "a variant of a runner-enforced name", u);
    }
  for (let [u, h] of Object.entries(enforcedEnv)) {
    if (h === void 0) continue;
    if (String(h).includes("\x00"))
      onDropped(
        jsonStringify(u),
        "a runner-enforced value that is not a usable environment value",
        "enforced",
      );
    else l.set(u, h);
  }
  return Object.fromEntries(l);
}
/**
 * NFKD 去掉组合符后大写，用于判断变量名是否为强制变量的变体。
 */
//@ chunk-hm0ce8vc.js:36432-36524 placement
function foldEnvNameForComparison(name) {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().toUpperCase();
}
//@ chunk-hm0ce8vc.js:36553-36633 placement
var AGENT_NAME_PATTERN = /^[a-z][a-z0-9-]{0,63}$/,
  REMOTE_AGENTS_JSON = "remote-agents.json",
  Fa = 64,
  Ga = 1048576,
  Fl = 1e4;
/**
 * 校验服务器下发的 agent_files：数组、条目数、名字格式、内容大小、重名。
 */
//@ chunk-hm0ce8vc.js:36633-37395 placement
function validateAgentFiles(agentFiles) {
  if (!Array.isArray(agentFiles))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `agent_files is not an array: ${jsonStringify(typeof agentFiles)}`,
      "agent_files is not an array",
    );
  if (agentFiles.length > Fa)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `agent_files has ${agentFiles.length} entries (at most ${Fa})`,
      "agent_files has too many entries",
    );
  let n = new Set();
  for (let r of agentFiles) {
    let s = r?.name;
    if (typeof s !== "string" || !AGENT_NAME_PATTERN.test(s))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent_files entry rejected (name must match ${AGENT_NAME_PATTERN}): ${jsonStringify(s)}`,
        "agent_files entry has an invalid name",
      );
    let content = r.content;
    if (typeof content !== "string" || Buffer.byteLength(content) > Ga)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent_files entry '${s}' rejected (content must be a string of at most ${Ga} bytes)`,
        "agent_files entry has invalid content",
      );
    if (n.has(s))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent_files contains duplicate name: ${jsonStringify(s)}`,
        "agent_files contains a duplicate name",
      );
    n.add(s);
  }
}
/**
 * 把 agent_files 与服务器 --agents 参数合成会话的 --agents 值。
 */
//@ chunk-hm0ce8vc.js:37395-37843 placement
function buildAgentsArgFromFiles(e, n) {
  validateAgentFiles(e);
  let r = n === void 0 || String(n) === "" ? {} : safeParseJSON(String(n), !1);
  if (typeof r !== "object" || r === null || Array.isArray(r))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "claude_code_args agents is not a JSON object",
      "claude_code_args agents is not a JSON object",
    );
  let s = { ...r };
  for (let { name: l, content: content } of e) s[l] = parseAgentFileEntry(l, content);
  let a = jsonStringify(s),
    o = validateAgentsJson(a);
  if (o !== null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `agent_files do not form a valid --agents value: ${o}`,
      "agent_files do not form a valid --agents value",
    );
  return a;
}
/**
 * 解析单个 agent 文件的 frontmatter，确认它定义的是同名 agent。
 */
//@ chunk-hm0ce8vc.js:37843-39183 placement
function parseAgentFileEntry(name, content) {
  let r = `${name}.md`,
    { frontmatter: frontmatter, content: content_2 } = parseFrontmatter(content, r, { normalizeKeys: !0 }),
    o = parseAgentFromMarkdown(r, "", frontmatter, content_2, "flagSettings");
  if (o === null || o.agentType !== name)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `agent_files entry '${name}' is not an agent definition named '${name}' (frontmatter needs name: ${name} and a description)`,
      "agent_files entry is not a matching agent definition",
    );
  let l = parseAgentToolsFromFrontmatter(frontmatter.tools);
  return {
    description: o.whenToUse,
    prompt: content_2.trim(),
    ...(l !== void 0 && { tools: l }),
    ...(o.disallowedTools !== void 0 && { disallowedTools: o.disallowedTools }),
    ...(o.model !== void 0 && { model: o.model }),
    ...(o.effort !== void 0 && { effort: o.effort }),
    ...(o.permissionMode !== void 0 && { permissionMode: o.permissionMode }),
    ...(o.mcpServers !== void 0 && { mcpServers: o.mcpServers }),
    ...(o.hooks !== void 0 && { hooks: o.hooks }),
    ...(o.maxTurns !== void 0 && { maxTurns: o.maxTurns }),
    ...(o.autoCompactWindow !== void 0 && { autoCompactWindow: o.autoCompactWindow }),
    ...(o.skills !== void 0 && o.skills.length > 0 && { skills: o.skills }),
    ...(o.initialPrompt !== void 0 && { initialPrompt: o.initialPrompt }),
    ...(o.memory !== void 0 && { memory: o.memory }),
    ...(o.background !== void 0 && { background: o.background }),
    ...(o.omitClaudeMd !== void 0 && { omitClaudeMd: o.omitClaudeMd }),
    ...(o.isolation !== void 0 && { isolation: o.isolation }),
    ...(o.observer !== void 0 && { observer: o.observer }),
    ...(o.observerMessage !== void 0 && { observerMessage: o.observerMessage }),
    ...(o.observeSubagents !== void 0 && { observeSubagents: o.observeSubagents }),
  };
}
/**
 * 把合成的 agents 定义写入会话配置目录（remote-agents.json）。
 */
//@ chunk-hm0ce8vc.js:39183-39874 placement
async function writeSessionAgentsFile(e) {
  let {
    args: args,
    agentFiles: agentFiles,
    serverAgentsArg: serverAgentsArg,
    configDir: configDir,
    stagedPaths: stagedPaths,
  } = e;
  if (
    Array.isArray(agentFiles) &&
    agentFiles.length === 0 &&
    (serverAgentsArg === void 0 || String(serverAgentsArg) === "")
  )
    return;
  await withFeatureTelemetry(
    "self_hosted_agent_files",
    async () => {
      let l = buildAgentsArgFromFiles(agentFiles, serverAgentsArg),
        u = join_5(configDir, REMOTE_AGENTS_JSON);
      stagedPaths.push(u);
      let h = { cancelled: !1 };
      try {
        await withBoundedTimeout(
          writeSessionFileAtomically(configDir, REMOTE_AGENTS_JSON, l, 384, h),
          Fl,
          `[runner:stuck] write ${u} (check NFS/CSI mount health)`,
        );
      } catch (error) {
        throw (
          (h.cancelled = !0),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `could not write the --agents file for the session (${sanitizedErrCodeForTelemetry(error) ?? "unknown error"})`,
            "could not write the --agents file for the session",
          )
        );
      }
      (args.push("--agents", u),
        e.onDebug(
          `[runner:session] delivering agents by file: ${u} (${agentFiles.length} server-composed, ${Buffer.byteLength(l)} bytes)`,
        ));
    },
    () => "deliver_failed",
  );
}
//@ chunk-hm0ce8vc.js:39874-39893 placement
var Cm = `api.${GITHUB_HOST}`;

export { writeSessionAgentsFile, mergeSessionEnv };
