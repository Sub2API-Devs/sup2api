/**
 * utils/permissions/editPermissionRules.ts
 *
 * 2.1.316 新增。编辑 settings 中的权限规则。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1), chunk-y3znj513.js (57)
 * attribution: placement 17, sole-consumer 38, layout 2, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  realpathSync,
  lstatSync,
  statSync,
  mkdirSync,
  renameSync,
  rmdirSync,
  openSync,
  constants,
  fstatSync,
  readFileSync,
  closeSync,
} from "fs";
import { join, dirname, parse, sep, isAbsolute, basename } from "path";
import { randomUUID } from "crypto";
import { isWebToolRestrictedInRelay } from "./permissionRulePayload.js";
import { isRemoteBrowserToolUnderModeFloor } from "./remoteBrowser.js";
import { getClassifiableBrowserAction, isAgentSpawningTool } from "./browserComputerUseTools.js";
import { checkReadOnlyConstraints } from "../../tools/BashTool/readOnlyValidation.js";
import { getOwn } from "../objectSafety.js";
import { validateFlags } from "../shell/readOnlyCommandValidation.js";
import { classifyAllShellEnabled, isDangerousClassifierPermission } from "./permissionSetup.js";
import { permissionRuleValueFromString, classifyRuleParens } from "./permissionRuleParser.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { normalizeRuleString, describeWildcardHint, parseRuleValue } from "./legacyWildcardRules.js";
import {
  parseBashPermissionRule,
  bashToolCheckExactMatchPermission,
  bashToolCheckPermission,
} from "../../tools/BashTool/bashPermissions.js";
import { validatePermissionRule } from "../settings/permissionValidation.js";
import { hasCertifiedPrefix, isCertifiedCommandRule } from "../../tools/BashTool/certifiedCommands.js";
import { BashTool } from "../../tools/BashTool/BashTool.js";
import { HOST_TOOL_INPUT_FIELD } from "../../bridge/deviceRegistration.js";
import {
  getDenyRuleForTool,
  findAskRuleForTool,
  applyPermissionRulesToPermissionContext,
  getContentRulesMapForToolName,
  toAllowRuleToolName,
} from "./permissions.js";
import { parseForSecurity, checkSemantics } from "../bash/ast.js";
import { buildCommandParts } from "../bash/bashPipeCommand.js";
import { extractOutputRedirections } from "../bash/commands.js";
import { argvRunsAnotherProgram } from "../../tools/BashTool/shouldUseSandbox.js";
import { getCwd } from "../cwd.js";
import { hostnameIsLocal } from "../localHostnames.js";
import { WebFetchTool } from "../../tools/WebFetchTool/WebFetchTool.js";
import {
  shouldAllowManagedSandboxDomainsOnly,
  isHostAllowedBySandboxNetworkPolicy,
  permissionRuleValueFromString as permissionRuleValueFromString_2,
} from "../sandbox/sandbox-adapter.js";
import { lookupDomainRule } from "../wildcardMapLookup.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { REMOTE_DEVICES, alnumLower, IDE_EXECUTE_CODE_TOOL } from "../../services/mcp/firstPartyServerIds.js";
import { REMOTE_BROWSER_SERVER_NAME } from "../../services/mcp/remoteBrowserServer.js";
import { reservedMcpServerNames } from "../../services/mcp/builtinServerNames.js";
import { isClaudeAiServerName, isOrgConnectorName, normalizedKey } from "../../services/mcp/normalization.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { logError } from "../log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, getErrnoCode } from "../errors.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import {
  loadAllPermissionRulesFromDisk,
  shouldAllowManagedPermissionRulesOnly,
  deletePermissionRuleFromSettings,
  getProjectGrantGates,
} from "./permissionsLoader.js";
import { getPlatform } from "../platform.js";
import { isSentinelInode, didInodeChange, jsonStringify } from "../slowOperations.js";
import { processChdir, getFsImplementation } from "../fsOperations.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import {
  MAX_SETTINGS_JSON_BYTES,
  getSettingsForSourceWriteSeed,
  getSettingsForSource,
  settleBackgroundSettingsWork,
  getSettingsFilePathForSource,
  runInSettingsWriteQueue,
  queueLocalSettingsGitignoreRule,
  parseSettingsFile,
} from "../settings/settings.js";
import { decodeTextBuffer } from "../fileRead.js";
import { safeParseJSON } from "../json.js";
import { isPlainObject } from "../isPlainObject.js";
import { readJsonFile } from "../../tools/AgentTool/agentMemorySnapshot.js";
import { ATOMIC_WRITE_DIRNAME } from "../plugins/safeCopy.js";
import { SymlinkWriteRefusedError } from "../fsSafety/atomicWriteStaging.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  _enum,
  stringSchema,
  zodStrictObject,
  literal,
  array,
  booleanSchema,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  EDITABLE_SETTING_SOURCES,
  isSettingSourceEnabled,
  getSettingSourceDisplayNameLowercase,
} from "../settings/constants.js";
import { PERMISSION_MODES } from "../../types/permissions.js";
import { policySettingsUnreadable } from "../hooks/hooksConfigSnapshot.js";
import { persistValidatedPermissionUpdate, validatePermissionUpdate } from "./PermissionUpdate.js";
import { isGitUsable } from "../plugins/pluginManifestRead.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { SAFE_GIT_REPO_ARGS, GIT_CONFIG_PARAMETERS_LIMIT } from "../git/gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { isWorkspacePersistedTrusted } from "../config.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1276404-1276643 placement
/**
 * 判断工具能否整体允许（不按调用内容细分）：排除需要用户交互、压制规则、浏览器/代理受限、及需按内容分类的工具。
 */
function isClassifiableForAutoAllow(tool, toolInput, mode) {
  return (
    tool.requiresUserInteraction?.() !== true &&
    tool.suppressesAlwaysAllowRule?.(toolInput) !== true &&
    tool.suppressesAllPermissionUpdates?.(toolInput) !== true &&
    !isWebToolRestrictedInRelay(tool.name) &&
    !isRemoteBrowserToolUnderModeFloor(tool) &&
    tool.ignoresWholeToolAllowRule?.(toolInput) !== true &&
    getClassifiableBrowserAction(tool, toolInput, mode) === undefined &&
    !isAgentSpawningTool(tool.name)
  );
}
//@ chunk-y3znj513.js:13585-14268 placement
/**
 * 编辑权限规则时的命令白名单、安全参数表与参数/命令名正则。
 */
var SHORT_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PRINTABLE_ASCII_RE;
var READ_ONLY_COMMANDS;
var SAFE_WRITING_COMMANDS;
var SAFE_TEST_COMMAND_RE;
var SAFE_PATH_ARG_RE;
deferInit("chunk-y3znj513.js:13585", () => {
  SHORT_TIMEOUT_MS = 300;
  PRINTABLE_ASCII_RE = /^[\x20-\x7e]*$/;
  READ_ONLY_COMMANDS = new Set([
    "basename",
    "cat",
    "cmp",
    "cut",
    "diff",
    "dirname",
    "file",
    "find",
    "grep",
    "head",
    "id",
    "ls",
    "pwd",
    "rg",
    "sort",
    "stat",
    "tail",
    "tr",
    "uname",
    "uniq",
    "wc",
    "which",
    "whoami",
  ]);
  SAFE_WRITING_COMMANDS = {
    mkdir: {
      safeFlags: {
        "-p": "none",
        "--parents": "none",
        "-v": "none",
        "--verbose": "none",
      },
    },
    touch: {
      safeFlags: {
        "-c": "none",
        "--no-create": "none",
      },
    },
    rmdir: {
      safeFlags: {
        "-p": "none",
        "--parents": "none",
        "-v": "none",
        "--verbose": "none",
      },
    },
    rm: {
      safeFlags: {
        "-r": "none",
        "-R": "none",
        "--recursive": "none",
        "-f": "none",
        "--force": "none",
        "-v": "none",
        "--verbose": "none",
      },
    },
    mv: {
      safeFlags: {},
    },
    cp: {
      safeFlags: {},
    },
  };
  SAFE_TEST_COMMAND_RE = /^(?:npm test|make(?: [A-Za-z][A-Za-z0-9_-]*)?)$/;
  SAFE_PATH_ARG_RE = /^[A-Za-z0-9_@%+=,./][A-Za-z0-9_@%+=,./-]*$/;
});
//@ chunk-y3znj513.js:14268-14383 placement
function isPlainReadOnlyCommand(command, argv) {
  return (
    READ_ONLY_COMMANDS.has(argv[0] ?? "") &&
    !argv.some((arg) => arg.startsWith("--")) &&
    checkReadOnlyConstraints(
      {
        command,
      },
      false,
    ).behavior === "allow"
  );
}
//@ chunk-y3znj513.js:14383-14615 placement
function isSafeWritingCommand(argv, env) {
  let spec = getOwn(SAFE_WRITING_COMMANDS, argv[0] ?? "");
  let filtered = argv.slice(1).filter((arg) => !arg.startsWith("-"));
  return (
    !env.shared &&
    (env.platform === "macos" || env.platform === "linux") &&
    spec !== undefined &&
    !argv.includes("--") &&
    filtered.length > 0 &&
    filtered.every((pathArg) => SAFE_PATH_ARG_RE.test(pathArg)) &&
    validateFlags([...argv], 1, spec)
  );
}
//@ chunk-y3znj513.js:14615-14681 placement
function isProjectTestCommand(command, env, mode) {
  return !env.shared && mode !== "auto" && classifyAllShellEnabled() && SAFE_TEST_COMMAND_RE.test(command);
}
//@ chunk-y3znj513.js:14681-14849 placement
function cautionsForArgv(argv) {
  if (getOwn(SAFE_WRITING_COMMANDS, argv[0] ?? "") === undefined) return [];
  return argv[0] === "rm" && argv.some((arg) => /^-[A-Za-z]*[rR]/.test(arg) || arg === "--recursive")
    ? ["recursive_delete"]
    : ["writes_files"];
}
//@ chunk-y3znj513.js:14849-14984 placement
function refusalCode(behavior, source) {
  let isManaged = source === "policySettings";
  if (behavior === "deny") return isManaged ? "managed_deny" : "own_deny_rule";
  return isManaged ? "managed_ask" : "own_ask_rule";
}
//@ chunk-y3znj513.js:14984-15096 placement
function existingRuleRefusal(denyRuleForTool, askRuleForTool) {
  if (denyRuleForTool)
    return {
      ok: false,
      refusal: refusalCode("deny", denyRuleForTool.source),
    };
  return askRuleForTool
    ? {
        ok: false,
        refusal: refusalCode("ask", askRuleForTool.source),
      }
    : undefined;
}
//@ chunk-y3znj513.js:15096-15277 placement
function buildExactBashRule(command) {
  let ruleValue = permissionRuleValueFromString({
    toolName: BASH_TOOL_NAME,
    ruleContent: command,
  });
  let allowRule = normalizeRuleString(ruleValue, "allow");
  let bashPermissionRule = parseBashPermissionRule(allowRule.ruleContent ?? "");
  return allowRule.toolName === BASH_TOOL_NAME &&
    bashPermissionRule.type === "exact" &&
    bashPermissionRule.command === command &&
    validatePermissionRule(ruleValue, "allow").valid
    ? ruleValue
    : undefined;
}
//@ chunk-y3znj513.js:15400-15438 sole-consumer
function refuse(refusal) {
  return {
    ok: false,
    refusal,
  };
}
//@ chunk-y3znj513.js:15438-16983 sole-consumer
async function deriveExactBashRule(command, machine, context, env, mode) {
  if (machine === undefined) return refuse("invalid_request");
  if (command.trim() === "") return refuse("empty");
  if (command.length > SHORT_TIMEOUT_MS) return refuse("too_long");
  if (!PRINTABLE_ASCII_RE.test(command) || command !== command.trim()) return refuse("unprintable");
  if (hasCertifiedPrefix(command)) return refuse("certified_namespace");
  if (
    !isClassifiableForAutoAllow(
      BashTool,
      {
        command,
        [HOST_TOOL_INPUT_FIELD]: machine ?? undefined,
      },
      mode,
    )
  )
    return refuse("tool_takes_no_rule");
  let existingRefusal = existingRuleRefusal(
    getDenyRuleForTool(context, {
      name: BASH_TOOL_NAME,
    }),
    findAskRuleForTool(context, {
      name: BASH_TOOL_NAME,
    }),
  );
  if (existingRefusal !== undefined) return existingRefusal;
  let parsed = await parseForSecurity(command);
  if (parsed.kind !== "simple") return refuse("not_parsed");
  let astCommand = parsed.commands[0];
  if (astCommand === undefined || parsed.commands.length !== 1 || parsed.bareAssignmentNames.length > 0)
    return refuse("compound");
  if (astCommand.envVars.length > 0) return refuse("env_prefix");
  if (astCommand.argvSourceLiteral !== true || astCommand.hasUnquotedGlob) return refuse("expansion");
  if (!astCommand.redirects.every(buildCommandParts)) return refuse("redirect");
  let commandNoRedirects =
    astCommand.redirects.length === 0
      ? command
      : extractOutputRedirections(command).commandWithoutRedirections.trim();
  if (astCommand.text !== commandNoRedirects) return refuse("compound");
  if (
    argvRunsAnotherProgram(astCommand.text, astCommand.argv) ||
    !checkSemantics(parsed.commands, {
      hasLoop: parsed.hasLoop,
    }).ok
  )
    return refuse("runs_other_code");
  let runsProjectCode = isProjectTestCommand(commandNoRedirects, env, mode);
  if (
    !runsProjectCode &&
    !isPlainReadOnlyCommand(command, astCommand.argv) &&
    !isSafeWritingCommand(astCommand.argv, env)
  )
    return refuse("not_known_safe");
  let rule = buildExactBashRule(commandNoRedirects);
  if (rule === undefined) return refuse("not_exact_rule");
  if (rule.length > SHORT_TIMEOUT_MS) return refuse("too_long");
  let toolPermissionContext = applyPermissionRulesToPermissionContext(context, [
    {
      source: "localSettings",
      ruleBehavior: "allow",
      ruleValue: normalizeRuleString(rule, "allow"),
    },
  ]);
  if (
    bashToolCheckExactMatchPermission(
      {
        command,
      },
      toolPermissionContext,
    ).behavior === "passthrough"
  )
    return refuse("not_exact_rule");
  let check = bashToolCheckPermission(
    {
      command,
    },
    toolPermissionContext,
    false,
    astCommand,
    getCwd(),
  );
  let source = check.decisionReason?.type === "rule" ? check.decisionReason.rule.source : undefined;
  if (check.behavior === "deny") return refuse(refusalCode("deny", source));
  if (check.behavior === "ask" && source !== undefined) return refuse(refusalCode("ask", source));
  return check.behavior === "allow"
    ? {
        ok: true,
        rule,
        cautions: runsProjectCode ? ["runs_project_code"] : cautionsForArgv(astCommand.argv),
      }
    : refuse("rule_would_not_apply");
}
//@ chunk-y3znj513.js:16983-17465 sole-consumer
var DNS_LABEL_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NUMERIC_TLD_RE;
var regExp;
var NUMERIC_LABEL_SOURCE;
var regExp_2;
deferInit("chunk-y3znj513.js:16983", () => {
  DNS_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  NUMERIC_TLD_RE = /^(?:\d+|0x[0-9a-f]+)$/;
  regExp = new RegExp(
    [
      "^0x[0-9a-f]*$",
      String.raw`^0\d+$`,
      String.raw`^\d{8,}$`,
      String.raw`^(?=[a-f]*\d)[0-9a-f]{8}$`,
      "^[0-9a-f-]*--[0-9a-f-]*$",
      "^[0-9a-f]{1,4}(?:-[0-9a-f]{1,4}){7}$",
    ].join("|"),
  );
  NUMERIC_LABEL_SOURCE = String.raw`(?:\d{1,3}|0\d+|0x[0-9a-f]*)`;
  regExp_2 = new RegExp(
    [
      `(?:^|[.-])${NUMERIC_LABEL_SOURCE}[.-]${NUMERIC_LABEL_SOURCE}[.-]${NUMERIC_LABEL_SOURCE}[.-]${NUMERIC_LABEL_SOURCE}(?:[.-]|$)`,
      String.raw`(?:^|\.)${NUMERIC_LABEL_SOURCE}\.(?:${NUMERIC_LABEL_SOURCE}|\d{4,7})(?:\.|$)`,
      String.raw`(?:^|\.)${NUMERIC_LABEL_SOURCE}-${NUMERIC_LABEL_SOURCE}(?:-${NUMERIC_LABEL_SOURCE})?(?:\.|$)`,
    ].join("|"),
  );
});
//@ chunk-y3znj513.js:17465-18265 sole-consumer
function deriveHostRule(host, context, mode) {
  let host_2 = host.toLowerCase().replace(/\.$/, "");
  let parts = host_2.split(".");
  if (host_2.length === 0 || host_2.length > 253)
    return {
      ok: false,
      refusal: "host_invalid",
    };
  if (parts.some((label) => label.startsWith("xn--")))
    return {
      ok: false,
      refusal: "host_internationalized",
    };
  if (!parts.every((label) => DNS_LABEL_RE.test(label)))
    return {
      ok: false,
      refusal: "host_invalid",
    };
  if (
    parts.length < 2 ||
    NUMERIC_TLD_RE.test(parts.at(-1) ?? "") ||
    parts.some((label) => regExp.test(label)) ||
    regExp_2.test(host_2) ||
    hostnameIsLocal(host_2)
  )
    return {
      ok: false,
      refusal: "host_not_public",
    };
  if (
    !isClassifiableForAutoAllow(
      WebFetchTool,
      {
        url: `https://${host_2}/`,
        prompt: "",
      },
      mode,
    )
  )
    return {
      ok: false,
      refusal: "tool_takes_no_rule",
    };
  if (shouldAllowManagedSandboxDomainsOnly())
    return {
      ok: false,
      refusal: "managed_hosts_only",
    };
  let ruleContent = `domain:${host_2}`;
  let policy = isHostAllowedBySandboxNetworkPolicy(host_2);
  return (
    existingRuleRefusal(
      getDenyRuleForTool(context, WebFetchTool) ??
        lookupDomainRule(getContentRulesMapForToolName(context, WEBFETCH, "deny"), ruleContent),
      findAskRuleForTool(context, WebFetchTool) ??
        lookupDomainRule(getContentRulesMapForToolName(context, WEBFETCH, "ask"), ruleContent),
    ) ??
    (policy.allowed
      ? {
          ok: true,
          rule: permissionRuleValueFromString({
            toolName: WEBFETCH,
            ruleContent,
          }),
          cautions: ["whole_domain"],
        }
      : {
          ok: false,
          refusal: policy.byPolicy ? "managed_deny" : "own_deny_rule",
        })
  );
}
//@ chunk-y3znj513.js:18265-18313 sole-consumer
var MCP_TOOL_NAME_RE = /^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_.-]+$/;
//@ chunk-y3znj513.js:18313-18615 sole-consumer
function isReservedMcpToolName(name) {
  let sliced = name.split("__").slice(1, -1);
  let mapped = sliced.map((part, index) => sliced.slice(0, index + 1).join("__"));
  let mapped_2 = [REMOTE_DEVICES, REMOTE_BROWSER_SERVER_NAME, ...reservedMcpServerNames()].map(alnumLower);
  return (
    mapped.some(
      (candidate) =>
        mapped_2.includes(alnumLower(candidate)) ||
        isClaudeAiServerName(candidate) ||
        isOrgConnectorName(candidate),
    ) ||
    normalizedKey(name) === normalizedKey(IDE_EXECUTE_CODE_TOOL) ||
    require("../../services/mcp/emitTripwireEvent.lazy.js")
      .mcpClientModule()
      .suppressDesignWriteAddRules(true, name.slice(name.lastIndexOf("__") + 2))
  );
}
//@ chunk-y3znj513.js:18615-18961 sole-consumer
function deriveMcpToolRule(name, context, mode) {
  let mcpInfo = mcpInfoFromString(name);
  if (
    name.length > SHORT_TIMEOUT_MS ||
    !MCP_TOOL_NAME_RE.test(name) ||
    mcpInfo === null ||
    mcpInfo.toolName === undefined
  )
    return {
      ok: false,
      refusal: "tool_name_invalid",
    };
  let tool = {
    name,
    mcpInfo: {
      serverName: mcpInfo.serverName,
      toolName: mcpInfo.toolName,
    },
  };
  if (isReservedMcpToolName(name) || !isClassifiableForAutoAllow(tool, {}, mode))
    return {
      ok: false,
      refusal: "tool_takes_no_rule",
    };
  return (
    existingRuleRefusal(
      getDenyRuleForTool(context, {
        name,
      }),
      findAskRuleForTool(context, {
        name,
      }),
    ) ?? {
      ok: true,
      rule: name,
      cautions: ["whole_tool"],
    }
  );
}
//@ chunk-y3znj513.js:18961-19119 sole-consumer
function deriveRule(dimension, context, env, mode) {
  switch (dimension.kind) {
    case "command":
      return deriveExactBashRule(dimension.command, dimension.machine, context, env, mode);
    case "host":
      return deriveHostRule(dimension.host, context, mode);
    case "mcp_tool":
      return deriveMcpToolRule(dimension.name, context, mode);
  }
}
//@ chunk-y3znj513.js:19119-19243 sole-consumer (2.1.88 match: parseDimension, 0.767)
function parseDimension(rule, mode) {
  let { toolName, ruleContent } = normalizeRuleString(rule, "allow");
  if (toolName === BASH_TOOL_NAME && mode !== "auto") return false;
  return (
    toAllowRuleToolName(toolName) === undefined || isDangerousClassifierPermission(toolName, ruleContent)
  );
}
//@ chunk-y3znj513.js:19243-19406 sole-consumer
function message(error) {
  let message = `Could not compose a standing allow rule: ${error instanceof Error ? error.name : "unknown error"}`;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      message,
      "Could not compose a standing allow rule",
    ),
  );
}
//@ chunk-y3znj513.js:19406-19604 sole-consumer
async function deriveRuleForDimension(dimension, context, env, mode) {
  try {
    let effectiveMode = mode === "plan" || mode === "bubble" ? "auto" : mode;
    let result = await deriveRule(dimension, context, env, effectiveMode);
    return result.ok && parseDimension(result.rule, effectiveMode) ? refuse("rule_would_not_apply") : result;
  } catch (error) {
    message(error);
    return {
      ok: false,
      refusal: "undecidable",
    };
  }
}
//@ chunk-y3znj513.js:19604-19722 sole-consumer
async function deriveRuleFromDiskRules(dimension, mode, mode_2) {
  try {
    return await deriveRuleForDimension(
      dimension,
      applyPermissionRulesToPermissionContext(
        getEmptyToolPermissionContext(),
        loadAllPermissionRulesFromDisk(),
      ),
      mode,
      mode_2,
    );
  } catch (error) {
    message(error);
    return {
      ok: false,
      refusal: "undecidable",
    };
  }
}
//@ chunk-y3znj513.js:19722-19993 sole-consumer
function dimensionOfRule(rule, machine) {
  let { toolName, ruleContent } = normalizeRuleString(rule, "allow");
  if (toolName === BASH_TOOL_NAME && ruleContent !== undefined)
    return {
      kind: "command",
      command: ruleContent,
      machine,
    };
  if (toolName === WEBFETCH && ruleContent?.startsWith("domain:"))
    return {
      kind: "host",
      host: ruleContent.slice(7),
    };
  return toolName.startsWith("mcp__") && ruleContent === undefined
    ? {
        kind: "mcp_tool",
        name: toolName,
      }
    : undefined;
}
//@ chunk-y3znj513.js:20322-20392 sole-consumer
class RuleWriteError extends Error {
  refusal;
  constructor(message) {
    super(message);
    this.refusal = message;
  }
}
//@ chunk-y3znj513.js:20392-20471 sole-consumer
function windowsRealPath(path) {
  if (getPlatform() !== "windows") return;
  try {
    return realpathSync.native(path);
  } catch {
    return;
  }
}
//@ chunk-y3znj513.js:20471-20693 sole-consumer
function requireRealDir(path) {
  let stats;
  try {
    stats = lstatSync(path, {
      bigint: true,
    });
  } catch (error) {
    throw new RuleWriteError(getErrnoCode(error) === "ENOENT" ? "path_changed" : "write_failed");
  }
  if (stats.isSymbolicLink()) throw new RuleWriteError("symlink_in_path");
  if (!stats.isDirectory()) throw new RuleWriteError("write_failed");
  return stats;
}
//@ chunk-y3znj513.js:20693-20751 sole-consumer
var SHORT_NAME_WITH_TILDE_RE = /^(?=[^.]{1,8}(?:\.|$))[^.]*~\d+(?:\.[^.]{1,3})?$/;
//@ chunk-y3znj513.js:20751-21061 sole-consumer
function isSameRealDir(target, name) {
  let lower = windowsRealPath(".")?.toLowerCase();
  let lower_2 = target?.toLowerCase();
  if (lower === undefined || lower_2 === undefined) return false;
  if (lower === join(lower_2, name.toLowerCase())) return true;
  if (!SHORT_NAME_WITH_TILDE_RE.test(name) || dirname(lower) !== lower_2) return false;
  let otherStats = lstatSync(join("..", name), {
    bigint: true,
    throwIfNoEntry: false,
  });
  let cwdStats = statSync(".", {
    bigint: true,
  });
  return (
    otherStats !== undefined &&
    !otherStats.isSymbolicLink() &&
    !isSentinelInode(otherStats.ino) &&
    otherStats.ino === cwdStats.ino
  );
}
//@ chunk-y3znj513.js:21061-21128 sole-consumer
function ensureDirExistsAtomic(dir) {
  let stagingDir = `${dir}.${randomUUID()}`;
  mkdirSync(stagingDir);
  try {
    renameSync(stagingDir, dir);
  } catch {
    rmdirSync(stagingDir);
  }
}
//@ chunk-y3znj513.js:21128-21414 sole-consumer
function enterDirPart(name, create) {
  let isWindows = getPlatform() === "windows";
  if (create && !isWindows)
    try {
      mkdirSync(name);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
  else if (
    create &&
    lstatSync(name, {
      throwIfNoEntry: false,
    }) === undefined
  )
    ensureDirExistsAtomic(name);
  let entryStats = requireRealDir(name);
  let cwdBefore = windowsRealPath(".");
  processChdir(name);
  let cwdStats = statSync(".", {
    bigint: true,
  });
  if (
    cwdStats.dev !== entryStats.dev ||
    cwdStats.ino !== entryStats.ino ||
    (isWindows ? !isSameRealDir(cwdBefore, name) : isSentinelInode(cwdStats.ino))
  )
    throw new RuleWriteError("symlink_in_path");
}
//@ chunk-y3znj513.js:21414-21549 sole-consumer
function enterDirectories(dir, create) {
  let { root } = parse(dir);
  processChdir(root);
  let filtered = dir.slice(root.length).split(sep).filter(Boolean);
  filtered.forEach((part, index) => {
    enterDirPart(part, create && index === filtered.length - 1);
  });
}
//@ chunk-y3znj513.js:21549-21681 sole-consumer
function isSameFileStat(before, after) {
  return (
    !isSentinelInode(before.ino) &&
    !isSentinelInode(after.ino) &&
    before.ino === after.ino &&
    before.size === after.size &&
    before.mtimeNs === after.mtimeNs &&
    before.birthtimeNs === after.birthtimeNs
  );
}
//@ chunk-y3znj513.js:21681-22411 sole-consumer
function readSettingsFileSecure(path) {
  let isWindows = getPlatform() === "windows";
  let preStat = isWindows
    ? lstatSync(path, {
        bigint: true,
        throwIfNoEntry: false,
      })
    : undefined;
  if (preStat?.isSymbolicLink() === true) throw new RuleWriteError("symlink_in_path");
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return null;
    throw new RuleWriteError(errnoCode === "ELOOP" ? "symlink_in_path" : "settings_unreadable");
  }
  try {
    let fdStats = fstatSync(fd, {
      bigint: true,
    });
    if (isWindows && (preStat === undefined || !isSameFileStat(preStat, fdStats)))
      throw new RuleWriteError("symlink_in_path");
    if (fdStats.nlink > 1n) throw new RuleWriteError("symlink_in_path");
    if (!fdStats.isFile() || Number(fdStats.size) > MAX_SETTINGS_JSON_BYTES)
      throw new RuleWriteError("settings_unreadable");
    let file = readFileSync(fd);
    let postStat = lstatSync(path, {
      bigint: true,
      throwIfNoEntry: false,
    });
    if (postStat === undefined || postStat.nlink > 1n || didInodeChange(postStat, fdStats))
      throw new RuleWriteError("symlink_in_path");
    let text = decodeTextBuffer(file);
    if (text.trim() === "") return null;
    let parsed = safeParseJSON(text, false);
    if (!isPlainObject(parsed)) throw new RuleWriteError("settings_unreadable");
    return parsed;
  } finally {
    closeSync(fd);
  }
}
//@ chunk-y3znj513.js:22411-22447 sole-consumer
function ruleIdentity(rule, behavior) {
  return permissionRuleValueFromString(normalizeRuleString(rule, behavior));
}
//@ chunk-y3znj513.js:22447-22718 sole-consumer
function addRuleToSettings(settings, behavior, rule) {
  let permissions = settings?.permissions ?? {};
  if (!isPlainObject(permissions)) throw new RuleWriteError("settings_unreadable");
  let rules = permissions[behavior] ?? [];
  if (!Array.isArray(rules)) throw new RuleWriteError("settings_unreadable");
  if (
    rules.some(
      (existing) =>
        typeof existing === "string" && ruleIdentity(existing, behavior) === ruleIdentity(rule, behavior),
    )
  )
    return null;
  return {
    ...settings,
    permissions: {
      ...permissions,
      [behavior]: [...rules, rule],
    },
  };
}
//@ chunk-y3znj513.js:22718-23493 sole-consumer
function writeConfirmedRule(filePath, behavior, rule) {
  if (!isAbsolute(filePath))
    return {
      ok: false,
      refusal: "write_failed",
    };
  let fileName = basename(filePath);
  let cwdBefore = getFsImplementation().cwd();
  try {
    enterDirectories(dirname(filePath), true);
    let nextSettings = addRuleToSettings(readSettingsFileSecure(fileName), behavior, rule);
    if (nextSettings === null)
      return {
        ok: true,
        written: false,
      };
    readJsonFile(
      fileName,
      jsonStringify(nextSettings, null, 2) +
        `
`,
      {
        encoding: "utf-8",
        checkParentDir: true,
        stagingDir: ATOMIC_WRITE_DIRNAME,
        refuseHardLinkedInPlace: true,
      },
    );
    if (getPlatform() === "windows")
      return {
        ok: true,
        written: true,
      };
    let afterStats = lstatSync(fileName, {
      bigint: true,
    });
    let targetStats;
    try {
      targetStats = lstatSync(filePath, {
        bigint: true,
      });
    } catch {
      return {
        ok: false,
        refusal: "path_changed",
      };
    }
    return targetStats.dev === afterStats.dev && targetStats.ino === afterStats.ino
      ? {
          ok: true,
          written: true,
        }
      : {
          ok: false,
          refusal: "path_changed",
        };
  } catch (error) {
    if (error instanceof RuleWriteError)
      return {
        ok: false,
        refusal: error.refusal,
      };
    if (error instanceof SymlinkWriteRefusedError)
      return {
        ok: false,
        refusal: "symlink_in_path",
      };
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not write a confirmed rule: ${getErrnoCode(error) ?? "unknown error"}`,
        "Could not write a confirmed rule",
      ),
    );
    return {
      ok: false,
      refusal: "write_failed",
    };
  } finally {
    try {
      processChdir(cwdBefore);
    } catch {}
  }
}
//@ chunk-y3znj513.js:23493-23820 sole-consumer
function checkSettingsPathWrite(settingsFilePathForSource) {
  let cwdBefore = getFsImplementation().cwd();
  try {
    enterDirectories(dirname(settingsFilePathForSource), false);
    return lstatSync(basename(settingsFilePathForSource), {
      throwIfNoEntry: false,
    })?.isSymbolicLink() === true
      ? "symlink_in_path"
      : undefined;
  } catch (error) {
    if (error instanceof RuleWriteError)
      return error.refusal === "path_changed"
        ? undefined
        : error.refusal === "symlink_in_path"
          ? error.refusal
          : "write_failed";
    return getErrnoCode(error) === "ENOENT" ? undefined : "write_failed";
  } finally {
    try {
      processChdir(cwdBefore);
    } catch {}
  }
}
//@ chunk-y3znj513.js:23820-24961 placement
/**
 * 权限规则编辑请求的 schema：add（1–100 条、每条 ≤10000 字符）与 remove 两种操作，按 op 区分。
 */
var RULE_BEHAVIORS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_RULE_LENGTH;
var MAX_RULES_PER_EDIT;
var MAX_CONFIRMED_PATH_LENGTH;
var MAX_HOST_INPUT_LENGTH;
var ruleBehaviorSchema;
var editableSourceSchema;
var hostToolInputSchema;
var addRulesEditSchema;
var removeRuleEditSchema;
var permissionRuleEditSchema;
var composeRuleEditSchema;
deferInit("chunk-y3znj513.js:23820", () => {
  RULE_BEHAVIORS = ["allow", "deny", "ask"];
  MAX_RULE_LENGTH = 1e4;
  MAX_RULES_PER_EDIT = 100;
  MAX_CONFIRMED_PATH_LENGTH = 4096;
  MAX_HOST_INPUT_LENGTH = 1000;
  ruleBehaviorSchema = DoctorLazy(() =>
    _enum(RULE_BEHAVIORS, {
      error: "behavior must be one of: allow, deny, ask",
    }),
  );
  editableSourceSchema = DoctorLazy(() => _enum(EDITABLE_SETTING_SOURCES));
  hostToolInputSchema = DoctorLazy(() => stringSchema().max(MAX_HOST_INPUT_LENGTH).nullable());
  addRulesEditSchema = DoctorLazy(() =>
    zodStrictObject({
      op: literal("add"),
      rules: array(stringSchema().max(MAX_RULE_LENGTH, "each rule must be at most 10000 characters"))
        .min(1, "rules must be an array of 1 to 100 strings")
        .max(MAX_RULES_PER_EDIT, "rules must be an array of 1 to 100 strings"),
      behavior: ruleBehaviorSchema(),
      destination: editableSourceSchema(),
      offerCheck: literal(true).optional(),
      confirmedPath: stringSchema().min(1).max(MAX_CONFIRMED_PATH_LENGTH).optional(),
      allowRuleSuppressed: booleanSchema().optional(),
      permissionMode: _enum(PERMISSION_MODES).optional(),
      [HOST_TOOL_INPUT_FIELD]: hostToolInputSchema().optional(),
    }),
  );
  removeRuleEditSchema = DoctorLazy(() =>
    zodStrictObject({
      op: literal("remove"),
      rule: stringSchema()
        .min(1, "rule must be a non-empty string of at most 10000 characters")
        .max(MAX_RULE_LENGTH, "rule must be a non-empty string of at most 10000 characters"),
      behavior: ruleBehaviorSchema(),
      source: editableSourceSchema(),
    }),
  );
  permissionRuleEditSchema = DoctorLazy(() =>
    discriminatedUnion("op", [addRulesEditSchema(), removeRuleEditSchema()]),
  );
  composeRuleEditSchema = DoctorLazy(() =>
    zodStrictObject({
      op: literal("compose"),
      tool: stringSchema().min(1).max(MAX_RULE_LENGTH),
      input: zodStrictObject({
        command: stringSchema().optional(),
        host: stringSchema().max(MAX_RULE_LENGTH).optional(),
        [HOST_TOOL_INPUT_FIELD]: hostToolInputSchema().optional(),
      }).optional(),
      destination: _enum(["localSettings", "projectSettings"]),
      allowRuleSuppressed: booleanSchema(),
      permissionMode: _enum(PERMISSION_MODES),
      copyOnly: booleanSchema().optional(),
      copyPlatform: _enum(["linux", "macos", "windows", "wsl"]).nullable().optional(),
    }),
  );
});
//@ chunk-y3znj513.js:24961-25661 placement
/**
 * 把规则编辑 schema 的第一个校验问题转成面向用户的错误信息（目的地、来源、op、rules/rule 类型错误等有专门措辞）。
 */
function formatRuleEditIssue(zodError) {
  let issue = zodError.issues[0];
  if (!issue) return "the edit is not a valid permission-rule edit";
  let joined = issue.path.map(String).join(".");
  if (joined === "destination" || joined === "source")
    return joined === "destination"
      ? `destination must be one of: ${EDITABLE_SETTING_SOURCES.join(", ")}`
      : `rules from this source cannot be removed here (removable sources: ${EDITABLE_SETTING_SOURCES.join(", ")})`;
  if (joined === "op") return "op must be one of: add, remove, compose";
  if (joined.startsWith("rules") && issue.code === "invalid_type")
    return "rules must be an array of 1 to 100 strings";
  if (joined === "rule" && issue.code === "invalid_type")
    return "rule must be a non-empty string of at most 10000 characters";
  let pathRoot = issue.path[0] === undefined ? "" : String(issue.path[0]);
  return joined && !issue.message.startsWith(pathRoot) ? `${joined}: ${issue.message}` : issue.message;
}
//@ chunk-y3znj513.js:25661-25901 placement
function getRuleEditBlockedReason() {
  if (shouldAllowManagedPermissionRulesOnly())
    return "enterprise managed settings allow only managed permission rules; rules cannot be added or removed";
  if (policySettingsUnreadable())
    return "enterprise managed settings could not be read, so permission rules cannot be edited";
  return null;
}
//@ chunk-y3znj513.js:25901-25997 placement
function settingSourceNotLoadedReason(source) {
  return isSettingSourceEnabled(source)
    ? null
    : `${getSettingSourceDisplayNameLowercase(source)} are not loaded here, so their rules cannot be edited`;
}
//@ chunk-y3znj513.js:25997-26773 placement
/**
 * 校验 add 操作的每条规则：去空白、validatePermissionRule 校验并收集警告；Tool(*) 写法提示会保存为整工具规则。返回解析后的规则值。
 */
function validateAddRulesEdit(edit) {
  let { rules, behavior, destination } = edit;
  let ruleValues = [];
  let warnings = [];
  for (let rawRule of rules) {
    let ruleString = rawRule.trim();
    if (ruleString.length === 0)
      return {
        ok: false,
        error: "rules must not be empty",
      };
    if (isCertifiedCommandRule(ruleString))
      return {
        ok: false,
        error: "certified rules cannot be added",
      };
    let validation = validatePermissionRule(ruleString, behavior);
    if (!validation.valid)
      return {
        ok: false,
        error: validation.suggestion
          ? `${validation.error} \u2014 ${validation.suggestion}`
          : (validation.error ?? "invalid permission rule"),
      };
    if (validation.warning !== undefined) warnings.push(validation.warning);
    let ruleValue = normalizeRuleString(ruleString, behavior);
    let parens = classifyRuleParens(ruleString);
    if (
      parens.kind === "call" &&
      parens.toolName !== "" &&
      !/\s/.test(parens.toolName) &&
      parens.rawContent === "*"
    )
      warnings.push(
        permissionRuleValueFromString_2(ruleValue)
          ? `"${ruleString}" was saved. It ${describeWildcardHint(ruleString, parens.toolName)}`
          : `"${ruleString}" was saved as the tool-wide rule "${permissionRuleValueFromString(ruleValue)}", which matches every use of the tool. To limit it, put a specific pattern inside the parentheses.`,
      );
    ruleValues.push(ruleValue);
  }
  return {
    ok: true,
    ruleValues,
    behavior,
    destination,
    warnings,
  };
}
//@ chunk-y3znj513.js:26773-27361 placement
/**
 * 在来源的存储规则中按原样查找要删除的规则；找不到或同一文件有等价拼写时报错，否则返回规则对象与原文。
 */
function resolveRemoveRuleEdit(edit, storedRules) {
  let { rule, behavior, source } = edit;
  let found = storedRules.find((storedRule) => storedRule === rule);
  if (found === undefined)
    return {
      ok: false,
      error: `rule not found: no ${behavior} rule with this exact value in ${getSettingSourceDisplayNameLowercase(source)} (rules are matched verbatim, as the listing reports them; the file may have been changed outside this dialog)`,
    };
  let canonicalKey = parseRuleValue(found);
  let found_2 = storedRules.find(
    (storedRule) => storedRule !== found && parseRuleValue(storedRule) === canonicalKey,
  );
  if (found_2 !== undefined)
    return {
      ok: false,
      error: `this rule cannot be removed here: removing it would also remove "${found_2}" from the same settings file, so edit the file by hand to remove the one you mean`,
    };
  return {
    ok: true,
    rule: {
      source,
      ruleBehavior: behavior,
      ruleValue: normalizeRuleString(found, behavior),
    },
    storedRaw: found,
  };
}
//@ chunk-y3znj513.js:27361-27396 layout
function ruleValueOf(rule, behavior) {
  return permissionRuleValueFromString(normalizeRuleString(rule, behavior));
}
//@ chunk-y3znj513.js:27396-27443 placement
function rulesOfBehavior(settings, behavior) {
  return settings?.permissions?.[behavior] ?? [];
}
//@ chunk-y3znj513.js:27443-27559 layout
function findExistingRule(existing, candidates) {
  for (let candidate of candidates) {
    let candidateIdentity = parseRuleValue(candidate);
    let found = existing.find((rule) => parseRuleValue(rule) === candidateIdentity);
    if (found !== undefined)
      return {
        typed: candidate,
        stored: found,
      };
  }
  return;
}
//@ chunk-y3znj513.js:27559-30893 placement
async function editPermissionRules(input, storage) {
  let fail = (error) => ({
    ok: false,
    error,
  });
  let ruleEditBlockedReason = getRuleEditBlockedReason();
  if (ruleEditBlockedReason !== null)
    return hostToolInput(input, "offerCheck") === true
      ? ruleAddRefusal(shouldAllowManagedPermissionRulesOnly() ? "managed_rules_only" : "managed_unreadable")
      : fail(ruleEditBlockedReason);
  let parsed = permissionRuleEditSchema().safeParse(input);
  if (!parsed.success)
    return hostToolInput(input, "offerCheck") === true
      ? ruleAddRefusal("invalid_request")
      : fail(formatRuleEditIssue(parsed.error));
  let edit = parsed.data;
  if (edit.op === "add") {
    let validated = validateAddRulesEdit(edit);
    if (!validated.ok)
      return edit.offerCheck === true
        ? ruleAddRefusal(edit.rules.some(isCertifiedCommandRule) ? "certified_namespace" : "invalid_request")
        : fail(validated.error);
    let { destination, behavior, ruleValues } = validated;
    let isOfferCheck = edit.offerCheck === true;
    if (
      isOfferCheck !== (edit.confirmedPath !== undefined) ||
      isOfferCheck !== (edit.allowRuleSuppressed !== undefined) ||
      isOfferCheck !== (edit.permissionMode !== undefined) ||
      (!isOfferCheck && edit[HOST_TOOL_INPUT_FIELD] !== undefined)
    )
      return ruleAddRefusal("invalid_request");
    if (edit.offerCheck === true) {
      let refusal = await offerCheckRefusal(edit);
      if (refusal !== undefined) return ruleAddRefusal(refusal);
    }
    let notLoadedReason = settingSourceNotLoadedReason(destination);
    if (notLoadedReason !== null) return fail(notLoadedReason);
    let seedRefusal = lockRefusal(destination);
    if (seedRefusal !== null) return fail(seedRefusal);
    let candidates = ruleValues.map(permissionRuleValueFromString);
    let seenByIdentity = new Map();
    for (let ruleValue of candidates) {
      let identity = parseRuleValue(ruleValue);
      let firstRule = seenByIdentity.get(identity) ?? ruleValue;
      if (firstRule !== ruleValue)
        return fail(
          `"${firstRule}" and "${ruleValue}" were not added, because removing either removes both. Add only one of them.`,
        );
      seenByIdentity.set(identity, ruleValue);
    }
    let existingInSeed = findExistingRule(
      rulesOfBehavior(getSettingsForSourceWriteSeed(destination), behavior),
      candidates,
    );
    if (existingInSeed !== undefined) {
      let settingSourceDisplayNameLowercase = getSettingSourceDisplayNameLowercase(destination);
      return {
        ...fail(
          ruleValueOf(existingInSeed.stored, behavior) === existingInSeed.typed
            ? `"${existingInSeed.typed}" is already in the ${behavior} rules in ${settingSourceDisplayNameLowercase}`
            : `"${existingInSeed.typed}" was not added, because the ${behavior} rules in ${settingSourceDisplayNameLowercase} already hold "${existingInSeed.stored}", and removing either removes both. To use "${existingInSeed.typed}" instead, remove "${existingInSeed.stored}" first, then add "${existingInSeed.typed}".`,
        ),
        ...(edit.offerCheck === true && {
          refusal: "already_present",
        }),
      };
    }
    if (destination === "localSettings") {
      let launchDirKeys = findExistingRule(
        rulesOfBehavior(getSettingsForSource(destination), behavior),
        candidates,
      );
      if (launchDirKeys !== undefined)
        return {
          ...fail(
            ruleValueOf(launchDirKeys.stored, behavior) === launchDirKeys.typed
              ? `"${launchDirKeys.typed}" is already in effect from the launch directory\u2019s own .claude/settings.local.json`
              : `"${launchDirKeys.typed}" was not added, because the launch directory\u2019s own .claude/settings.local.json already holds "${launchDirKeys.stored}", and removing either removes both. To use "${launchDirKeys.typed}" instead, remove "${launchDirKeys.stored}" from that file first, then add "${launchDirKeys.typed}".`,
          ),
          ...(edit.offerCheck === true && {
            refusal: "already_present",
          }),
        };
    }
    if (edit.confirmedPath !== undefined)
      return finishConfirmedWrite(edit.confirmedPath, ruleValues, destination, validated.warnings);
    await persistValidatedPermissionUpdate(
      {
        type: "addRules",
        rules: ruleValues,
        behavior,
        destination,
      },
      storage,
    );
    await settleBackgroundSettingsWork();
    let writtenKeys = new Set(
      rulesOfBehavior(getSettingsForSourceWriteSeed(destination), behavior).map((rule) =>
        ruleValueOf(rule, behavior),
      ),
    );
    let filtered = candidates.filter((ruleValue) => !writtenKeys.has(ruleValue));
    if (filtered.length > 0)
      return fail(
        filtered.length === ruleValues.length
          ? `the rules could not be written to ${getSettingSourceDisplayNameLowercase(destination)}: the settings write was refused or failed`
          : `${filtered.length} of ${ruleValues.length} rules could not be written to ${getSettingSourceDisplayNameLowercase(destination)}: the settings write was refused or failed for those`,
      );
    return {
      ok: true,
      warnings: validated.warnings,
      stored: candidates,
    };
  }
  let { behavior, source } = edit;
  let notLoadedReason = settingSourceNotLoadedReason(source);
  if (notLoadedReason !== null) return fail(notLoadedReason);
  let sourceRefusal = lockRefusal(source);
  if (sourceRefusal !== null) return fail(sourceRefusal);
  let storedRules = rulesOfBehavior(getSettingsForSourceWriteSeed(source), behavior);
  if (
    source === "localSettings" &&
    !storedRules.includes(edit.rule) &&
    rulesOfBehavior(getSettingsForSource(source), behavior).includes(edit.rule)
  )
    return fail(
      "that rule is defined in the launch directory\u2019s own .claude/settings.local.json, which is not edited here; edit that file directly",
    );
  let removeRuleEdit = resolveRemoveRuleEdit(edit, storedRules);
  if (!removeRuleEdit.ok) return fail(removeRuleEdit.error);
  let siblingRule =
    source === "localSettings"
      ? rulesOfBehavior(getSettingsForSource(source), behavior).find(
          (siblingRule) =>
            siblingRule !== removeRuleEdit.storedRaw &&
            parseRuleValue(siblingRule) === parseRuleValue(removeRuleEdit.storedRaw),
        )
      : undefined;
  if (siblingRule !== undefined)
    return fail(
      `this rule cannot be removed here: removing it would also remove "${siblingRule}" from the launch directory\u2019s own .claude/settings.local.json, so edit that file by hand to remove the one you mean`,
    );
  let removed = await deletePermissionRuleFromSettings(removeRuleEdit.rule, storage);
  await settleBackgroundSettingsWork();
  let any = rulesOfBehavior(getSettingsForSourceWriteSeed(source), behavior).some(
    (rule) => ruleValueOf(rule, behavior) === ruleValueOf(removeRuleEdit.storedRaw, behavior),
  );
  if (!removed || any)
    return fail(
      `the rule could not be removed from ${getSettingSourceDisplayNameLowercase(source)}: the settings write was refused or failed, so it is still in its settings file`,
    );
  return {
    ok: true,
    warnings: [],
    stored: [],
  };
}
//@ chunk-y3znj513.js:30893-30968 affinity
function ruleAddRefusal(refusal) {
  return {
    ok: false,
    error: `the rule was not added: ${refusal}`,
    refusal,
  };
}
//@ chunk-y3znj513.js:30968-31029 sole-consumer
function isSharedWithProject(destination) {
  return destination === "projectSettings" || getProjectGrantGates().gateLocal;
}
//@ chunk-y3znj513.js:31029-31240 sole-consumer
async function isInsideGitWorkTree() {
  if (!getProjectGrantGates().gateProject || !(await isGitUsable())) return false;
  let { code, stdout } = await execFileNoThrow(
    gitExe(),
    [...SAFE_GIT_REPO_ARGS, "rev-parse", "--is-inside-work-tree"],
    {
      env: getRemoteHostSessionCount(),
      timeout: GIT_CONFIG_PARAMETERS_LIMIT,
      useCwd: true,
    },
  );
  return code === 0 && stdout.trim() === "true";
}
//@ chunk-y3znj513.js:31240-31308 sole-consumer
async function getRuleGrantEnv(destination) {
  return {
    shared: isSharedWithProject(destination) || !(await isInsideGitWorkTree()),
    platform: getPlatform(),
  };
}
//@ chunk-y3znj513.js:31308-31648 sole-consumer
function ruleDestinationRefusal(source, copyOnly) {
  if (shouldAllowManagedPermissionRulesOnly()) return "managed_rules_only";
  if (policySettingsUnreadable()) return "managed_unreadable";
  if (settingSourceNotLoadedReason(source) !== null) return "source_not_loaded";
  if (lockRefusal(source) !== null) return "settings_unreadable";
  let { gateProject, gateLocal } = getProjectGrantGates();
  if (source === "projectSettings" && !gateProject) return "user_settings_alias";
  return !copyOnly &&
    (source === "projectSettings" ? gateProject : gateLocal) &&
    !isWorkspacePersistedTrusted()
    ? "rule_would_not_apply"
    : undefined;
}
//@ chunk-y3znj513.js:31648-32276 sole-consumer
async function offerCheckRefusal(edit) {
  let [rule] = edit.rules;
  if (
    rule === undefined ||
    edit.rules.length !== 1 ||
    edit.behavior !== "allow" ||
    edit.permissionMode === undefined ||
    (edit.destination !== "localSettings" && edit.destination !== "projectSettings")
  )
    return "invalid_request";
  let destinationRefusal = ruleDestinationRefusal(edit.destination, false);
  if (destinationRefusal !== undefined) return destinationRefusal;
  if (edit.allowRuleSuppressed === true) return "rule_suppressed";
  let rule_2 = rule.trim();
  let dimension = dimensionOfRule(rule_2, edit[HOST_TOOL_INPUT_FIELD]);
  if (dimension === undefined) return "rule_mismatch";
  if (dimension.kind !== "command" && edit[HOST_TOOL_INPUT_FIELD] !== undefined) return "invalid_request";
  let check = await deriveRuleFromDiskRules(
    dimension,
    await getRuleGrantEnv(edit.destination),
    edit.permissionMode,
  );
  if (!check.ok) return check.refusal;
  if (check.rule !== rule_2) return "rule_mismatch";
  return edit.confirmedPath === getSettingsFilePathForSource(edit.destination) ? undefined : "path_mismatch";
}
//@ chunk-y3znj513.js:32276-32637 sole-consumer
async function finishConfirmedWrite(confirmedPath, ruleValues, destination, warnings) {
  let updateValidation = validatePermissionUpdate({
    type: "addRules",
    rules: ruleValues,
    behavior: "allow",
    destination,
  });
  let mapped = ruleValues.map(permissionRuleValueFromString);
  let [ruleValue] = mapped;
  if (updateValidation.action === "drop" || ruleValue === undefined) return ruleAddRefusal("write_failed");
  let writeResult = await runInSettingsWriteQueue(confirmedPath, async () =>
    writeConfirmedRule(confirmedPath, "allow", ruleValue),
  );
  if (!writeResult.ok) return ruleAddRefusal(writeResult.refusal);
  if (!writeResult.written) return ruleAddRefusal("already_present");
  if (destination === "localSettings") {
    queueLocalSettingsGitignoreRule();
    await settleBackgroundSettingsWork();
  }
  return {
    ok: true,
    warnings,
    stored: mapped,
  };
}
//@ chunk-y3znj513.js:32637-32677 sole-consumer
function hostToolInput(input, key) {
  return isPlainObject(input) ? input[key] : undefined;
}
//@ chunk-y3znj513.js:32677-32721 sole-consumer
function isComposeInput(input) {
  return hostToolInput(input, "op") === "compose";
}
//@ chunk-y3znj513.js:32721-33084 sole-consumer
function classifyRuleDimension(tool, input) {
  if (tool === BASH_TOOL_NAME)
    return input?.command !== undefined && input.host === undefined
      ? {
          kind: "command",
          command: input.command,
          machine: input[HOST_TOOL_INPUT_FIELD],
        }
      : "invalid_request";
  if (tool === WEBFETCH)
    return input?.host !== undefined &&
      input.command === undefined &&
      input[HOST_TOOL_INPUT_FIELD] === undefined
      ? {
          kind: "host",
          host: input.host,
        }
      : "invalid_request";
  if (tool.startsWith("mcp__"))
    return input === undefined
      ? {
          kind: "mcp_tool",
          name: tool,
        }
      : "invalid_request";
  return "unsupported_tool";
}
//@ chunk-y3znj513.js:33084-33837 sole-consumer
async function composeRuleEdit(editInput) {
  let parsed = composeRuleEditSchema().safeParse(editInput);
  if (!parsed.success)
    return {
      ok: false,
      refusal: "invalid_request",
    };
  let { tool, input, destination, allowRuleSuppressed, permissionMode, copyOnly, copyPlatform } = parsed.data;
  if ((copyOnly === true) !== (copyPlatform !== undefined))
    return {
      ok: false,
      refusal: "invalid_request",
    };
  let destinationRefusal = ruleDestinationRefusal(destination, copyOnly === true);
  if (destinationRefusal !== undefined)
    return {
      ok: false,
      refusal: destinationRefusal,
    };
  if (allowRuleSuppressed === true)
    return {
      ok: false,
      refusal: "rule_suppressed",
    };
  let dimension = classifyRuleDimension(tool, input);
  if (typeof dimension === "string")
    return {
      ok: false,
      refusal: dimension,
    };
  let settingsFilePathForSource = getSettingsFilePathForSource(destination);
  if (settingsFilePathForSource === undefined)
    return {
      ok: false,
      refusal: "no_settings_file",
    };
  let pathRefusal = checkSettingsPathWrite(settingsFilePathForSource);
  if (pathRefusal !== undefined)
    return {
      ok: false,
      refusal: pathRefusal,
    };
  let grantEnv =
    copyPlatform === undefined
      ? await getRuleGrantEnv(destination)
      : {
          shared: true,
          platform: copyPlatform,
        };
  let result = await deriveRuleFromDiskRules(dimension, grantEnv, permissionMode);
  let sharedWithProject =
    copyPlatform === undefined ? isSharedWithProject(destination) : destination === "projectSettings";
  return result.ok
    ? {
        ...result,
        cautions: sharedWithProject ? [...result.cautions, "shared_with_project"] : result.cautions,
        path: settingsFilePathForSource,
      }
    : result;
}
//@ chunk-y3znj513.js:33837-34053 sole-consumer
function lockRefusal(source) {
  if (getSettingsForSourceWriteSeed(source) !== null) return null;
  let settingsFilePathForSource = getSettingsFilePathForSource(source);
  if (settingsFilePathForSource === undefined) return null;
  return parseSettingsFile(settingsFilePathForSource).errors.some((error) => error.severity !== "warning")
    ? `the ${getSettingSourceDisplayNameLowercase(source)} file has errors and could not be loaded; fix it by hand first`
    : null;
}
export { isClassifiableForAutoAllow, isComposeInput, composeRuleEdit, editPermissionRules };
