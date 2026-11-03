/**
 * skills/bundled/pluginAuthoring/secretScanTool.ts
 *
 * 2.1.316 新增：plugin-authoring 技能的 scan_secrets 工具：分享 mod 前扫描文件夹中的密钥（读权限检查、合规开关、大小与链接限制）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jy3v56kg.js (52)
 * attribution: placement 51, sole-consumer 1
 */
import { stat, lstat, readdir, open } from "fs/promises";
import { join, basename, resolve } from "path";
import { x, Ar } from "../../../../runtime/bun-runtime.js";
import {
  CLOUD_SURFACE_NOTE,
  GIT_PUSH_ONLY_SHARING_NOTE,
  HOSTED_SURFACE_NOTE,
  ORGANIZATION_LIBRARY_NOTE,
  SHARE_OR_SEND_NOTE,
  SHARE_AFTER_SAVE_NOTE,
  SEND_FILE_SHARE_NOTE,
  SESSION_SURFACE_PLACEHOLDER,
  PLUGIN_AUTHORING_SKILL,
  PLUGIN_AUTHORING_DESCRIPTION,
  SKILL_DIR_PLACEHOLDER,
  PLUGIN_AUTHORING_2,
  TERMINAL_SURFACE_NOTE,
  TYPES_CLAUDE_CODE_D_TS,
  PLUGIN_AUTHORING_PLUGIN,
  describeSharingSurface,
  FILES_NOT_WRITTEN_NOTE,
  loadPluginAuthoringFiles,
  isHookInputPathAllowed,
} from "./pluginAuthoring.js";
import {
  ORG_LIBRARY_SHARING_NOTE,
  CLOUD_SHARING_NOTE,
  TERMINAL_SHARING_NOTE,
} from "../pluginAuthoringPrompt.js";
import { buildPrompt } from "../claudeApi.js";
import { areHooksModulesAllowed } from "../../../services/analytics/growthbookCredentials.js";
import { scanForSecrets_2 } from "../../../services/teamMemorySync/secretScanner.js";
import { isENOENT } from "../../../utils/errors.js";
import { jsonParse, isSentinelInode } from "../../../utils/slowOperations.js";
import { yieldToEventLoop } from "../../../native-ts/file-index/index.js";
import { uniq } from "../../../utils/collections.js";
import { getPlatform } from "../../../utils/platform.js";
import { readOnlyNoFollowFlags } from "../../../utils/platformTargets.js";
import { readJunction } from "../../../utils/fsJunctions.js";
import { GIT_LFS_POINTER_PREFIX } from "../../../utils/plugins/marketplaceGitCheckout.js";
import { plural, urlPatternToRegex, cleanForDisplay, truncateWithCount } from "../../../utils/stringUtils.js";
import { stripCombiningRepeated } from "../../../utils/sanitization.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import {
  isPolicyLimitsCacheMissing,
  isPolicyVerdictAbsent,
} from "../../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../../services/policyLimits/complianceTaints.js";
import { identity } from "../../../utils/identity.js";
import { createValueSlot } from "../../../utils/valueSlot.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { union, string, array, u } from "../../../../vendor/zod/v4/classic/schemas.js";
import { getSessionId, getRegisteredHooks } from "../../../bootstrap/state.js";
import { skillWatchStateByHost } from "../../skillChangeWatch.js";
import { isClaudeAiChatOrigin } from "../../../utils/entrypointKinds.js";
import {
  loadedModuleArgs,
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { childNameUnder } from "../../../plugins/functionHooks/devModsWatch.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { policySettingsUnreadable } from "../../../utils/hooks/hooksConfigSnapshot.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import { isPolicyTier } from "../../../plugins/functionHooks/hookDispatch.js";
import { getSettingsForSource } from "../../../utils/settings/settings.js";
import { getPolicyAllowedSet } from "../../../utils/plugins/pluginPolicy.js";

//@ chunk-jy3v56kg.js:12745-12907 placement
/**
 * plugin-authoring 内置插件声明的函数钩子能力清单。
 */
var PLUGIN_AUTHORING_HOOK_SCAN = x(function (Vs, xn) {
  xn.exports = {
    scan: {
      hooks: ["skill.prompt", "tool.check", "tool.call"],
      calls: ["tool.check", "tool.list", "tool.register", "ui.ask"],
    },
    files: {},
  };
});
//@ chunk-jy3v56kg.js:12907-12917 placement
/**
 * plugin-authoring 技能模块的导出表（分享面文案、技能名与描述、文件与提示词）。
 */
var PLUGIN_AUTHORING_SKILL_MODULE = {};
//@ chunk-jy3v56kg.js:12917-13502 placement
Ar(PLUGIN_AUTHORING_SKILL_MODULE, {
  CLOUD_SURFACE: () => CLOUD_SURFACE_NOTE,
  EXISTING_REMOTES_ONLY: () => GIT_PUSH_ONLY_SHARING_NOTE,
  HOSTED_SURFACE: () => HOSTED_SURFACE_NOTE,
  ORGANIZATION_LIBRARY: () => ORGANIZATION_LIBRARY_NOTE,
  ORGANIZATION_LIBRARY_OFFER: () => ORG_LIBRARY_SHARING_NOTE,
  PACKAGE_ANY_PLAN: () => SHARE_OR_SEND_NOTE,
  PACKAGE_OFFER: () => CLOUD_SHARING_NOTE,
  PACKAGE_ORGANIZATION_PLAN: () => SHARE_AFTER_SAVE_NOTE,
  PACKAGE_PERSONAL_PLAN: () => SEND_FILE_SHARE_NOTE,
  SESSION_SURFACE_PLACEHOLDER: () => SESSION_SURFACE_PLACEHOLDER,
  SHARE_OFFER: () => TERMINAL_SHARING_NOTE,
  SKILL: () => PLUGIN_AUTHORING_SKILL,
  SKILL_DESCRIPTION: () => PLUGIN_AUTHORING_DESCRIPTION,
  SKILL_DIR_PLACEHOLDER: () => SKILL_DIR_PLACEHOLDER,
  SKILL_NAME: () => PLUGIN_AUTHORING_2,
  TERMINAL_SURFACE: () => TERMINAL_SURFACE_NOTE,
  TYPES_FILE: () => TYPES_CLAUDE_CODE_D_TS,
  default: () => PLUGIN_AUTHORING_SKILL_MODULE,
  isAvailable: () => isPluginAuthoringHooksAllowed,
  registerPlugin: () => PLUGIN_AUTHORING_PLUGIN,
  sessionSurfaceOf: () => describeSharingSurface,
  skillFilesMissingNoteOf: () => FILES_NOT_WRITTEN_NOTE,
  skillFilesOf: () => loadPluginAuthoringFiles,
  skillPromptOf: () => buildPrompt,
});
//@ chunk-jy3v56kg.js:13502-13511 placement
/**
 * scan_secrets 技能模块的导出表（工具名、spec、注册入口）。
 */
var SECRET_SCAN_SKILL_MODULE = {};
//@ chunk-jy3v56kg.js:13511-13655 placement
Ar(SECRET_SCAN_SKILL_MODULE, {
  SEND_FILE_TOOL: () => SENDUSERFILE,
  SKILL_NAME: () => PLUGIN_AUTHORING,
  TOOL: () => MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
  TOOL_NAME: () => SCAN_SECRETS_TOOL_NAME,
  TOOL_SPEC: () => SCAN_SECRETS_TOOL_SPEC,
  default: () => SECRET_SCAN_SKILL_MODULE,
  register: () => formatScanNotRun,
  registerHooks: () => registerSecretScanSkillHook,
});
//@ chunk-jy3v56kg.js:13655-13671 placement
/**
 * 是否允许插件创作技能的 hooks 模块。
 */
var isPluginAuthoringHooksAllowed = () => areHooksModulesAllowed();
//@ chunk-jy3v56kg.js:13671-14565 placement
/**
 * scan_secrets 工具的名字、描述与输入 schema。
 */
var SCAN_SECRETS_TOOL_NAME = "scan_secrets";
var MCP_PLUGIN_AUTHORING_SCAN_SECRETS = "mcp__plugin-authoring__scan_secrets";
var SENDUSERFILE = "SendUserFile";
var PLUGIN_AUTHORING = "plugin-authoring";
var SCAN_SECRETS_TOOL_SPEC = {
  name: "scan_secrets",
  description:
    "Scans the files in a mod's folder, before the mod is shared, for known key and token formats, reading them as they are on disk now (it runs no git and reads nothing in .git). Starts and ends its answer with a Result: line. Names the files with a possible secret and the kind of secret, never the value (up to 100; the rest are counted), and the files and folders it did not scan and why (up to 30; the rest are counted), and says where the folder was too large to look at in full; a file name that holds a secret is shown as <name holding a secret>. Reads only; changes nothing.",
  inputSchema: {
    type: "object",
    properties: {
      folder: {
        type: "string",
        description: "The mod's folder, as an absolute path: the top folder of its git repository",
      },
    },
    required: ["folder"],
  },
};
//@ chunk-jy3v56kg.js:14565-14604 placement
var SCAN_IT_LABEL = "Scan it";
var CHECK_THEM_LABEL = "Check them";
var PATH_LIST_CHUNK = 32;
//@ chunk-jy3v56kg.js:14604-14678 placement
/**
 * 把文本结果包成工具结果（失败时带 isError）。
 */
function toolResultFromText(e) {
  return e.isError
    ? {
        result: e.text,
        isError: true,
      }
    : {
        result: e.text,
      };
}
//@ chunk-jy3v56kg.js:14678-14789 placement
var READ_UNAVAILABLE_REASON = "Read is not available in this session";
var PERMISSION_CHECK_FAILED_REASON = "the secret scan could not check its permission";
var MAX_CACHED_DECISIONS = 64;
var MAX_SEEN_PATHS = 64;
//@ chunk-jy3v56kg.js:14789-17540 placement
/**
 * 在 skill.prompt 中注入 scan_secrets 是否可用的说明（合规关闭、托管设置不可读等）。
 */
function registerSecretScanSkillHook(e, n) {
  let t;
  e(
    "skill.prompt",
    {
      skill: PLUGIN_AUTHORING,
      source: "built-in",
    },
    async (d, s, h) => {
      let c = await h(s);
      let w = n.complianceOff();
      let _ =
        w !== undefined
          ? SCAN_OFF_REASONS[w]
          : t === undefined
            ? await registerScanTool(d)
            : (await isMcpToolListed(d, MCP_PLUGIN_AUTHORING_SCAN_SECRETS))
              ? undefined
              : t;
      t = _ === TOOL_NOT_LISTED_REASON ? _ : undefined;
      return _ === undefined
        ? c
        : {
            ...c,
            text:
              c.text +
              `

The secret scan tool is not available in this session: ` +
              _ +
              " So the scan in the share steps cannot run here, and a mod cannot be shared until it can: do not open, print or search any file in the folder of a mod to be shared, and tell the person why it can't be shared.",
          };
    },
  );
  e(
    "tool.check",
    {
      tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
    },
    async (d, s, h) => {
      let c = await h(s);
      let folder = s.input.folder;
      if (c.decision === "deny" || c.rule !== undefined || c.hook !== undefined || typeof folder !== "string")
        return c;
      let _ = await d.tool
        .check({
          tool: "Read",
          input: {
            file_path: n.absolute(folder),
          },
        })
        .catch(() => {
          return;
        });
      if (_ === undefined)
        return {
          decision: "deny",
          reason: READ_UNAVAILABLE_REASON,
        };
      return {
        decision: _.decision === "allow" && c.ceiling === "ask" ? "ask" : _.decision,
        ...(_.reason !== undefined && {
          reason: _.reason,
        }),
        ...(_.rule !== undefined && {
          rule: _.rule,
        }),
        ...(c.ceiling !== undefined && {
          ceiling: c.ceiling,
        }),
      };
    },
  ).catch(() => ({
    decision: "deny",
    reason: PERMISSION_CHECK_FAILED_REASON,
  }));
  let r = new Set();
  let a = new Map();
  e(
    "tool.call",
    {
      tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
    },
    async (d, s) => {
      let h = n.complianceOff();
      if (h !== undefined) {
        rememberPath(r, s.tool_use_id);
        return toolResultFromText(n.refuse(SCAN_OFF_REASONS_SHORT[h], false));
      }
      let folder = s.folder;
      if (typeof folder !== "string" || folder === "") {
        let k = n.refuse(
          "no folder was given; the scan takes the mod's folder, as an absolute path, in its folder argument.",
        );
        return toolResultFromText(k);
      }
      let w = n.managedReadHook();
      if (w !== undefined) {
        rememberPath(r, s.tool_use_id);
        return toolResultFromText(
          w === "hooks"
            ? n.refuse(MANAGED_READ_HOOK_NOTE, "managed_read_hook")
            : n.refuse(MANAGED_SETTINGS_UNREADABLE_NOTE, "managed_settings_unreadable"),
        );
      }
      let _ = n.absolute(folder);
      let y = n.shownPlain(_);
      if (n.isNetworkPath(folder)) {
        rememberPath(r, s.tool_use_id);
        return toolResultFromText(
          n.refuse(`the scan reads only folders it can tell are on this computer, and ${y} is not one.`),
        );
      }
      let S = await checkScanReadPermission(d, _, y, {
        mayAsk: n.mayAsk,
        inChat: n.inChat,
        resolveFolder: () => n.resolveFolder(_),
        wasAllowed: (k, N) => {
          let R = a.get(n.session() + "\x00" + k);
          return R?.dev === N.dev && R.ino === N.ino;
        },
        allow: (k, N) => rememberDecision(a, n.session() + "\x00" + k, N),
      });
      if (S.refusal !== undefined) {
        rememberPath(r, s.tool_use_id);
        let k = n.refuse(S.refusal);
        return toolResultFromText(k);
      }
      let { real, identity, answeredRule } = S;
      rememberPath(r, s.tool_use_id);
      let F = await n.scan(
        real,
        async (k) => {
          let N = new Set();
          for (let R = 0; R < k.length; R += PATH_LIST_CHUNK)
            await Promise.all(
              k.slice(R, R + PATH_LIST_CHUNK).map(async (P) => {
                let C = await d.tool
                  .check({
                    tool: "Read",
                    input: {
                      file_path: P,
                    },
                  })
                  .catch(() => {
                    return;
                  });
                if (
                  C === undefined ||
                  C.decision === "deny" ||
                  (C.decision === "ask" && C.rule !== undefined && C.rule !== answeredRule)
                )
                  N.add(P);
              }),
            );
          return N;
        },
        identity,
        _,
      );
      if (F.changed === true) a.delete(n.session() + "\x00" + real);
      return toolResultFromText(F);
    },
  ).catch((error, s) => {
    let h = n.refuse("the scan did not finish.", s.tool_use_id === undefined || !r.has(s.tool_use_id));
    return toolResultFromText(h);
  });
  if (n.inChat())
    e(
      "tool.call",
      {
        tool: SENDUSERFILE,
      },
      async (d, s, h) => {
        let c = await h(s);
        n.handedOver(s.files, c.deny === undefined && c.isError === undefined ? c.result : undefined);
        return c;
      },
    ).catch((error, s, h) => h(s));
}
//@ chunk-jy3v56kg.js:17540-20511 placement
/**
 * 检查扫描能否读取目标文件夹（权限规则、托管读钩子）。
 */
async function checkScanReadPermission(e, n, t, r) {
  let a = await e.tool
    .check({
      tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
      input: {
        folder: n,
      },
    })
    .catch(() => {
      return;
    });
  if (a === undefined)
    return {
      refusal: `Claude Code could not check whether the scan may read ${t}.`,
    };
  if (a.decision === "deny")
    return {
      refusal:
        a.reason === READ_UNAVAILABLE_REASON || a.reason === PERMISSION_CHECK_FAILED_REASON
          ? `Claude Code could not check whether the scan may read ${t}.`
          : `the permission settings do not allow the scan to read ${t}.`,
    };
  let d =
    a.rule === undefined
      ? undefined
      : await e.tool
          .check({
            tool: "Read",
            input: {
              file_path: n,
            },
          })
          .catch(() => {
            return;
          });
  if (a.rule !== undefined && d?.decision !== "allow" && d?.decision !== "ask")
    return {
      refusal:
        d === undefined
          ? `Claude Code could not check whether the scan may read ${t}.`
          : `the permission settings do not allow the scan to read ${t}.`,
    };
  let rule = d?.decision === "ask" ? d.rule : undefined;
  let decision = a.decision === "allow" && rule !== undefined ? "ask" : a.decision;
  let c = decision === "ask" && a.rule === undefined && a.hook === undefined && a.ceiling !== "ask";
  if (decision === "ask" && !c && !r.mayAsk())
    return {
      refusal: askNotPossibleRefusal(t),
    };
  let folder = await r.resolveFolder();
  let _ = folder.network
    ? `the scan could not tell that ${t} is a folder on this computer.`
    : folder.unidentified
      ? `the scan does not run on ${t}: its file system does not tell folders apart (it gives them no inode numbers).`
      : folder.real === undefined || folder.identity === undefined
        ? `the scan could not read ${t}.`
        : undefined;
  let y =
    _ === undefined
      ? {
          real: folder.real,
          identity: folder.identity,
        }
      : undefined;
  let S =
    decision === "allow" && y !== undefined && y.real !== n
      ? await e.tool
          .check({
            tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
            input: {
              folder: y.real,
            },
          })
          .catch(() => null)
      : undefined;
  if (decision === "allow" && S?.decision !== "ask") {
    if (y === undefined)
      return {
        refusal: _,
      };
    if (S === null || S?.reason === READ_UNAVAILABLE_REASON || S?.reason === PERMISSION_CHECK_FAILED_REASON)
      return {
        refusal: `Claude Code could not check whether the scan may read ${t}.`,
      };
    if (S !== undefined && S.decision !== "allow")
      return {
        refusal: `${t} leads to another folder, through a link, and the permission settings do not allow the scan to read that folder.`,
      };
    return y;
  }
  if (c && y !== undefined && r.wasAllowed(y.real, y.identity)) return y;
  if (!r.mayAsk())
    return {
      refusal: askNotPossibleRefusal(t),
    };
  let E = r.inChat() && c && y !== undefined && y.real === n;
  let b = E ? CHECK_THEM_LABEL : SCAN_IT_LABEL;
  let M = await (
    E
      ? e.ui.ask(
          `Check the files in this folder and its subfolders for secret keys first?
${folder.shown}
Claude is told which files might hold one and what kind, never the key itself. A yes covers this folder for the rest of this session.`,
          {
            options: [b, "Don't check"],
            header: "Key check",
          },
        )
      : e.ui.ask(
          `Scan the files in this folder for keys and tokens before the mod is shared?
${folder.shown}
The scan reads each file in the folder and its subfolders, except .git, and reports only which files may hold one and what kind, never the value.` +
            (c ? " A yes holds for this folder until /clear or Claude Code restarts." : ""),
          {
            options: [b, "Don't scan"],
            header: "Secret scan",
          },
        )
  ).catch(() => {
    return;
  });
  if (M !== b)
    return {
      refusal:
        M === undefined
          ? `nobody answered whether the scan may read ${t}: the question was dismissed or got no answer, or this session does not ask.`
          : `the person did not choose "${b}" when asked whether the scan may read ${t}.`,
    };
  if (y === undefined)
    return {
      refusal: _,
    };
  if (c) r.allow(y.real, y.identity);
  let F = S?.decision === "ask" ? S.rule : (rule ?? a.rule);
  return F === undefined
    ? y
    : {
        ...y,
        answeredRule: F,
      };
}
//@ chunk-jy3v56kg.js:20511-20604 placement
/**
 * 记下已见路径，超过上限时逐出最早加入的。
 */
function rememberPath(e, toolUseId) {
  if (toolUseId === undefined) return;
  e.add(toolUseId);
  if (e.size > MAX_SEEN_PATHS) e.delete(e.values().next().value);
}
//@ chunk-jy3v56kg.js:20604-20679 placement
/**
 * 记下某路径的判定结果，超过缓存上限时逐出最早的。
 */
function rememberDecision(e, n, t) {
  e.set(n, t);
  if (e.size > MAX_CACHED_DECISIONS) e.delete(e.keys().next().value);
}
//@ chunk-jy3v56kg.js:20679-20979 placement
/**
 * 托管设置无法读取时说明「扫描不读文件」的两个文案。
 */
var MANAGED_READ_HOOK_NOTE =
  "your organization runs its own checks before files are read, and the scan can't run those checks, so it doesn't read files here.";
var MANAGED_SETTINGS_UNREADABLE_NOTE =
  "your organization's managed settings could not be read, so the scan can't tell whether they check files before they're read, and it doesn't read files here.";
//@ chunk-jy3v56kg.js:20979-21094 placement
function askNotPossibleRefusal(e) {
  return `the permission settings ask before the scan reads ${e}, and this session cannot ask anyone.`;
}
//@ chunk-jy3v56kg.js:21094-21598 placement
/**
 * 合规关闭扫描的原因文案与对应的简短版本。
 */
var SCAN_OFF_REASONS = {
  tainted: "your organization's compliance settings turn it off.",
  pending:
    "your organization's policy has not loaded, and the scan cannot run until it does; once it has, loading the skill again adds the tool.",
};
var SCAN_OFF_REASONS_SHORT = {
  tainted: "your organization's compliance settings turn the scan off.",
  pending: "your organization's policy has not loaded, and the scan cannot run until it does.",
};
var TOOL_NOT_LISTED_REASON =
  "Claude Code did not list it, which usually means a permission rule or an organization's MCP server policy blocks it.";
//@ chunk-jy3v56kg.js:21598-21752 placement
async function registerScanTool(e) {
  try {
    let { tool } = await e.tool.register(SCAN_SECRETS_TOOL_SPEC);
    return (await isMcpToolListed(e, tool)) ? undefined : TOOL_NOT_LISTED_REASON;
  } catch (error) {
    return describeNoBuiltinTools(error instanceof Error ? error.message : String(error));
  }
}
//@ chunk-jy3v56kg.js:21752-21839 placement
/**
 * 当前 MCP 工具列表里是否有该工具名。
 */
async function isMcpToolListed(e, n) {
  return (await e.tool.list().catch(() => [])).some((r) => r.name === n);
}
//@ chunk-jy3v56kg.js:21839-22343 placement
function describeNoBuiltinTools(e) {
  if (e.includes("--bare"))
    return "this session runs with --bare, which takes no tools from built-in plugins.";
  if (e.includes("no built-in tools")) return "this session was started with no tools.";
  if (e.includes("cannot add tools at run time"))
    return "this kind of session cannot add tools while it runs.";
  if (e.includes("no session is bound")) return "no session was running to add it to.";
  return `Claude Code refused to add it (${e.replace(/^.*?\$\.tool\.register:\s*/s, "").replace(/[.\s]+$/, "")}).`;
}
//@ chunk-jy3v56kg.js:22343-22743 placement
function formatScanNotRun(e) {
  let n = (t) => ({
    text: `Result: the scan could not run: ${t}`,
    isError: true,
  });
  registerSecretScanSkillHook(e, {
    absolute: (t) => t,
    shownPlain: (t) => t,
    isNetworkPath: () => false,
    resolveFolder: async (t) => ({
      network: false,
      real: t,
      identity: {
        dev: 0n,
        ino: 0n,
      },
      shown: t,
    }),
    mayAsk: () => false,
    managedReadHook: () => {
      return;
    },
    complianceOff: () => {
      return;
    },
    session: () => "",
    inChat: () => false,
    handedOver: () => {},
    refuse: n,
    scan: async () => n("this build carries no scan."),
  });
}
//@ chunk-jy3v56kg.js:22843-23056 placement
/**
 * 扫描上限与检测用的常量：总字节、目录条目、插件清单、密钥正则、类型标签与占位符。
 */
var SCAN_MAX_TOTAL_BYTES = 10485760;
var MAX_SCAN_TOTAL_BYTES = 26214400;
var MAX_SCAN_DIR_ENTRIES = 20000;
var PLUGIN_MANIFEST_FILES = [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"];
var MAX_MANIFEST_BYTES = 1048576;
var ANTHROPIC_KEY_IN_PATH_REGEX = /(?:^|[^A-Za-z0-9_-])sk-ant-[A-Za-z0-9_-]{40,}/;
var ANTHROPIC_KEY_LABEL = "Anthropic Key";
var SECRET_IN_NAME_PLACEHOLDER = "<name holding a secret>";
//@ chunk-jy3v56kg.js:23056-23182 placement
function redactSecretsInPath(e, n = SECRET_IN_NAME_PLACEHOLDER) {
  let joined = e
    .split(/([\\/])/)
    .map((r) => (r !== "/" && r !== "\\" && scanForSecrets_2(r).length > 0 ? n : r))
    .join("");
  return scanForSecrets_2(joined).length > 0 ? n : joined;
}
//@ chunk-jy3v56kg.js:23182-23243 placement
/**
 * 报告里展示路径前先脱敏，并把占位符还原成「含密钥的名字」。
 */
function redactPathForReport(e) {
  return quoteForReport(redactSecretsInPath(e, "\x00")).replaceAll("\x00", SECRET_IN_NAME_PLACEHOLDER);
}
//@ chunk-jy3v56kg.js:23243-23511 placement
function quoteForReport(e) {
  let replaced = e.replaceAll("\x00", "_");
  if (/^[!-~](?:[ -~]*[!-~])?$/.test(replaced) && !/["\\:<>]/.test(replaced)) return e;
  return `"${[...e].map((r) => (r === "\x00" ? r : r === '"' || r === "\\" ? `\\${r}` : /[ -~]/.test(r) && r !== "<" && r !== ">" ? r : `\\u{${r.codePointAt(0).toString(16)}}`)).join("")}"`;
}
//@ chunk-jy3v56kg.js:23511-23527 placement
var REPLACEMENT_CHAR = "\uFFFD";
//@ chunk-jy3v56kg.js:23527-25732 placement
/**
 * 收集要扫描的文件（拒绝 .git 内、不可读、超总大小、链接/硬链接/LFS 指针）。
 */
async function collectScanFiles(
  filePath,
  { maxTotalBytes: n = MAX_SCAN_TOTAL_BYTES, readDenied: t, approved: r } = {},
) {
  if (filePath.split(/[\\/]/).some(isGitDir))
    return {
      ok: false,
      error: "the folder is a .git folder or inside one, which the scan does not read",
    };
  let a;
  try {
    a = await stat(filePath, {
      bigint: true,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        r !== undefined
          ? FOLDER_CHANGED_ERROR
          : isENOENT(error)
            ? "no such folder"
            : "the folder cannot be read",
    };
  }
  if (r !== undefined && (a.dev !== r.dev || a.ino !== r.ino))
    return {
      ok: false,
      error: FOLDER_CHANGED_ERROR,
    };
  if (!a.isDirectory())
    return {
      ok: false,
      error: "not a folder",
    };
  let d = await lstat(filePath, {
    bigint: true,
  }).catch(() => {
    return;
  });
  if (d === undefined)
    return {
      ok: false,
      error: r !== undefined ? FOLDER_CHANGED_ERROR : "the folder cannot be read",
    };
  if (!d.isDirectory())
    return {
      ok: false,
      error: "the folder is a link, not the folder it leads to",
    };
  let scanFile = await readScanFileSafely(filePath, {
    dev: d.dev,
    ino: d.ino,
  });
  if (scanFile === undefined)
    return {
      ok: false,
      error: "the folder cannot be read",
    };
  if (scanFile === "changed")
    return {
      ok: false,
      error: FOLDER_CHANGED_ERROR,
    };
  let mapped = [...scanFile.skipped].map(([k, N]) => ({
    path: k,
    reason: N,
  }));
  let c = [];
  let w = 0;
  for (let [k, { size: N }] of [...scanFile.files].toSorted(
    ([R, P], [C, Rn]) => Number(isSkippedScanDir(R)) - Number(isSkippedScanDir(C)) || P.size - Rn.size,
  ))
    if (N > SCAN_MAX_TOTAL_BYTES)
      mapped.push({
        path: k,
        reason: "too large",
      });
    else if (w + N > n)
      mapped.push({
        path: k,
        reason: "total limit",
      });
    else {
      w += N;
      c.push(k);
    }
  let _ = t === undefined ? new Set() : await t(c);
  let y = new Map();
  let S = new Map();
  for (let k of c) {
    if (_.has(k)) {
      mapped.push({
        path: k,
        reason: "read denied",
      });
      continue;
    }
    let N = k.includes("/") ? k.slice(0, k.lastIndexOf("/")) : "";
    if (!(await getFileIdentity(filePath, N, scanFile.folderIds)))
      return {
        ok: false,
        error: FOLDER_CHANGED_ERROR,
      };
    let R = await isWindowsReservedPath(join(filePath, k), scanFile.files.get(k));
    if (!(await getFileIdentity(filePath, N, scanFile.folderIds)))
      return {
        ok: false,
        error: FOLDER_CHANGED_ERROR,
      };
    let P = R === undefined ? "unreadable" : scanBufferForSecrets(R);
    if (Array.isArray(P)) y.set(k, P);
    else
      mapped.push({
        path: k,
        reason: P,
      });
    if (R !== undefined && PLUGIN_MANIFEST_FILES.includes(k) && R.length <= MAX_MANIFEST_BYTES)
      try {
        let C = jsonParse(R.toString("utf8"))?.name;
        if (typeof C === "string" && C !== "") S.set(k, C);
      } catch {}
    await yieldToEventLoop();
  }
  if (r !== undefined && !(await getFileIdentity_3(filePath, r)))
    return {
      ok: false,
      error: FOLDER_CHANGED_ERROR,
    };
  for (let key of scanFile.folderIds.keys())
    if (!(await getFileIdentity(filePath, key, scanFile.folderIds)))
      return {
        ok: false,
        error: FOLDER_CHANGED_ERROR,
      };
  let flattened = [...scanFile.files.keys(), ...scanFile.skipped.keys()].flatMap((k) => {
    let N = uniq([...(y.get(k) ?? []), ...scanForSecrets_2(k)]);
    return N.length > 0
      ? [
          {
            path: k,
            kinds: N,
          },
        ]
      : [];
  });
  let b = S.get(PLUGIN_MANIFEST_FILES[0]);
  let M = S.get(PLUGIN_MANIFEST_FILES[1]);
  let F = (k, N) =>
    Number(isSkippedScanDir(k.path)) - Number(isSkippedScanDir(N.path)) ||
    (k.path < N.path ? -1 : k.path > N.path ? 1 : 0);
  return {
    ok: true,
    scannedCount: y.size,
    findings: flattened.toSorted(F),
    notScanned: mapped.toSorted(F),
    ...(scanFile.capped && {
      capped: true,
    }),
    ...(b !== undefined &&
      M !== undefined && {
        pluginNames: {
          plugin: b,
          marketplace: M,
        },
      }),
  };
}
//@ chunk-jy3v56kg.js:25732-26716 placement
async function readScanFileSafely(e, n) {
  let t = new Map();
  let r = new Map();
  let a = new Map([["", n]]);
  let d = getPlatform() === "windows";
  let s = [""];
  let h = [];
  let c = 0;
  let w = false;
  for (let _ = s.shift() ?? h.shift(); _ !== undefined; _ = s.shift() ?? h.shift()) {
    if (!(await getFileIdentity(e, _, a))) return "changed";
    let y = await readdir(_ === "" ? e : join(e, _), {
      withFileTypes: true,
    }).catch(() => {
      return;
    });
    if (y === undefined) {
      if (_ === "") return;
      r.set(_, "unreadable");
      continue;
    }
    for (let S of y) {
      if (isGitDir(S.name)) continue;
      if (++c > MAX_SCAN_DIR_ENTRIES) {
        w = true;
        break;
      }
      let E = _ === "" ? S.name : `${_}/${S.name}`;
      if (!d && S.isSymbolicLink()) {
        r.set(E, "link");
        continue;
      }
      let b = await lstat(join(e, E), {
        bigint: true,
      }).catch(() => {
        return;
      });
      if (b === undefined) r.set(E, "unreadable");
      else if (b.isFile() && b.nlink > 1n) r.set(E, "hard link");
      else if (b.isFile())
        t.set(E, {
          dev: b.dev,
          ino: b.ino,
          size: Number(b.size),
        });
      else if (b.isDirectory()) {
        if (await scanDirectory(join(e, E))) r.set(E, "link");
        else {
          a.set(E, {
            dev: b.dev,
            ino: b.ino,
          });
          if (isSkippedScanDir(E)) h.push(E);
          else s.push(E);
        }
      } else r.set(E, b.isSymbolicLink() ? "link" : "not a plain file");
    }
    if (!(await getFileIdentity(e, _, a))) return "changed";
    if (w) break;
  }
  return {
    files: t,
    skipped: r,
    folderIds: a,
    capped: w,
  };
}
//@ chunk-jy3v56kg.js:26716-26891 placement = getFileIdentity (1)
async function getFileIdentity(e, n, folderIds) {
  let r = folderIds.get(n);
  if (r === undefined) return true;
  let a = await lstat(join(e, n), {
    bigint: true,
  }).catch(() => {
    return;
  });
  return a?.isDirectory() === true && a.dev === r.dev && a.ino === r.ino;
}
//@ chunk-jy3v56kg.js:26891-26937 placement
var SCAN_SKIP_DIRS = [".mcpb-cache", ".claude-plugin/types"];
//@ chunk-jy3v56kg.js:26937-27001 placement
function isSkippedScanDir(e) {
  return SCAN_SKIP_DIRS.some((n) => e === n || e.startsWith(`${n}/`));
}
//@ chunk-jy3v56kg.js:27001-27048 placement
function isGitDir(name) {
  return name.toLowerCase() === ".git";
}
//@ chunk-jy3v56kg.js:27048-27580 placement
async function isWindowsReservedPath(e, n) {
  if (getPlatform() === "windows") {
    let r = await lstat(e, {
      bigint: true,
    }).catch(() => {
      return;
    });
    if (r?.isFile() !== true || r.dev !== n.dev || r.ino !== n.ino) return;
  }
  let t;
  try {
    t = await open(e, readOnlyNoFollowFlags());
  } catch {
    return;
  }
  try {
    let stats = await t.stat({
      bigint: true,
    });
    if (
      !stats.isFile() ||
      stats.nlink !== 1n ||
      stats.dev !== n.dev ||
      stats.ino !== n.ino ||
      isSentinelInode(stats.ino)
    )
      return;
    let a = Buffer.alloc(Math.min(n.size, SCAN_MAX_TOTAL_BYTES) + 1);
    let d = 0;
    while (d < a.length) {
      let { bytesRead } = await t.read(a, d, a.length - d, d);
      if (bytesRead === 0) break;
      d += bytesRead;
    }
    return d > n.size ? undefined : a.subarray(0, d);
  } catch {
    return;
  } finally {
    await t.close().catch(() => {
      return;
    });
  }
}
//@ chunk-jy3v56kg.js:27580-27634 placement
/**
 * 扫描期间文件夹发生变化的错误文案。
 */
var FOLDER_CHANGED_ERROR = "the folder changed while it was being scanned";
//@ chunk-jy3v56kg.js:27634-27763 placement = getFileIdentity (1)
async function getFileIdentity_2(filePath) {
  let stats = await stat(filePath, {
    bigint: true,
  }).catch(() => {
    return;
  });
  return stats === undefined || isSentinelInode(stats.ino)
    ? undefined
    : {
        dev: stats.dev,
        ino: stats.ino,
      };
}
//@ chunk-jy3v56kg.js:27763-27841 placement = getFileIdentity (0.794)
async function getFileIdentity_3(filePath, n) {
  let stats = await getFileIdentity_2(filePath);
  return stats?.dev === n.dev && stats.ino === n.ino;
}
//@ chunk-jy3v56kg.js:27841-27929 placement = scanDirectory (0.766)
async function scanDirectory(dirPath) {
  if (getPlatform() !== "windows") return false;
  return (await readJunction(dirPath)).kind !== "directory";
}
//@ chunk-jy3v56kg.js:28144-28246 sole-consumer
function scanBufferForSecrets(e) {
  let str = e.toString("utf8");
  let t = scanForSecrets_2(str);
  return t.length === 0 && str.startsWith(GIT_LFS_POINTER_PREFIX) ? "lfs pointer" : t;
}
//@ chunk-jy3v56kg.js:28246-29247 placement
/**
 * 报告用的上限与未扫描原因的说明文案（单数/复数两套）。
 */
var SCAN_MAX_LISTED = 100;
var MAX_LISTED_NOT_SCANNED = 30;
var MAX_REPORT_LINE_CHARS = 300;
var MAX_SECRET_KINDS_LISTED = 3;
var NOT_SCANNED_REASONS = {
  "too large": `over ${SCAN_MAX_TOTAL_BYTES / 1048576} MB`,
  "total limit": `the scan reads at most ${MAX_SCAN_TOTAL_BYTES / 1048576} MB in all`,
  "lfs pointer": "a Git LFS pointer",
  unreadable: "it could not be read",
  "read denied":
    "the person's Read permission rules do not allow reading it without asking, or could not be checked",
  link: "a link, which the scan does not follow",
  "hard link":
    "a hard link, a second name for a file that may sit outside the folder, which the scan does not read",
  "not a plain file": "not a plain file or folder",
};
var NOT_SCANNED_REASONS_PLURAL = {
  "too large": () => `over ${SCAN_MAX_TOTAL_BYTES / 1048576} MB`,
  "total limit": () => `past the ${MAX_SCAN_TOTAL_BYTES / 1048576} MB total`,
  "lfs pointer": (e) => plural(e, "Git LFS pointer"),
  unreadable: () => "that couldn't be read",
  "read denied": () => "that the person's Read rules keep from the scan",
  link: (e) => plural(e, "link"),
  "hard link": (e) => plural(e, "hard link"),
  "not a plain file": (e) =>
    e === 1 ? "that is not a plain file or folder" : "that are not plain files or folders",
};
var regExp = new RegExp(
  `${urlPatternToRegex(SECRET_IN_NAME_PLACEHOLDER)}|\\\\u\\{[0-9a-f]+\\}|\\\\["\\\\]|[\\s\\S]`,
  "gu",
);
//@ chunk-jy3v56kg.js:29247-29578 placement
function truncateForReport(e, n) {
  if (e.length <= n) return e;
  let t = e.match(regExp) ?? [];
  let max = Math.max(n - 32, 8);
  let a = Math.ceil(max / 3);
  let d = "";
  let s = 0;
  while (s < t.length && d.length + t[s].length <= a) {
    d += t[s];
    s++;
  }
  let h = "";
  let c = t.length;
  while (c > s && h.length + t[c - 1].length <= max - d.length) {
    h = t[c - 1] + h;
    c--;
  }
  let w = e.length - d.length - h.length;
  return `${d}\u2026(${w} characters left out)\u2026${h}`;
}
//@ chunk-jy3v56kg.js:29578-29680 placement
function sanitizeForReport(e, n) {
  let replaced = cleanForDisplay(stripCombiningRepeated(e)).replace(/[<>]/g, (r) =>
    r === "<" ? "\\u{3c}" : "\\u{3e}",
  );
  return truncateForReport(redactSecretsInPath(replaced), n);
}
//@ chunk-jy3v56kg.js:29680-29724 placement
/**
 * 脱敏、去重复组合字符并截断的错误文本。
 */
function sanitizeErrorText(error) {
  return truncateWithCount(redactSecretsInPath(cleanForDisplay(stripCombiningRepeated(error))), 400);
}
//@ chunk-jy3v56kg.js:29724-31029 placement
function formatScanSkipped(e, n) {
  let t = sanitizeForReport(e, 200);
  if (!n.ok)
    return {
      text: `Result: the scan could not run in ${t}: ${sanitizeErrorText(n.error)}`,
      isError: true,
    };
  let { scannedCount, findings, notScanned, capped } = n;
  let joined = [
    ...(notScanned.length > 0
      ? [
          `${notScanned.length} ${plural(notScanned.length, "file or folder was", "files or folders were")} not scanned`,
        ]
      : []),
    ...(capped === true ? ["part of the folder was not looked at"] : []),
  ].join("; ");
  let c =
    findings.length > 0
      ? `Result: possible secrets in ${findings.length} ${plural(findings.length, "file")}${joined === "" ? "" : `; ${joined}`}. Values are not shown.`
      : joined !== ""
        ? `Result: no known key or token format in the scanned files; ${joined}.`
        : "Result: no known key or token format found.";
  let sliced = findings.slice(0, SCAN_MAX_LISTED);
  let sliced_2 = notScanned.slice(0, MAX_LISTED_NOT_SCANNED);
  return {
    text: [
      c,
      `Scanned ${scannedCount} ${plural(scannedCount, "file")} in ${t} for known key and token formats.`,
      ...sliced.map((S) => formatSecretFinding(figures_default.cross, S.path, summarizeSecretKinds(S.kinds))),
      ...(findings.length > sliced.length
        ? [
            `${figures_default.cross} \u2026 and ${findings.length - sliced.length} more ${plural(findings.length - sliced.length, "file")} with possible secrets, not listed here.`,
          ]
        : []),
      ...sliced_2.map((S) =>
        formatSecretFinding(
          figures_default.warning,
          S.path,
          `not scanned (${NOT_SCANNED_REASONS[S.reason]})`,
        ),
      ),
      ...(notScanned.length > sliced_2.length
        ? [
            `${figures_default.warning} \u2026 and ${notScanned.length - sliced_2.length} more not scanned: ${summarizeNotScannedReasons(notScanned.slice(sliced_2.length))}.`,
          ]
        : []),
      ...(capped === true
        ? [
            `${figures_default.warning} Only the first ${MAX_SCAN_DIR_ENTRIES.toLocaleString("en-US")} files and folders were looked at; the rest of the folder was not scanned, and which files it holds is unknown.`,
          ]
        : []),
      c,
    ].join(`
`),
    isError: false,
  };
}
//@ chunk-jy3v56kg.js:31029-31138 placement
function summarizeSecretKinds(kinds) {
  let joined = kinds.slice(0, MAX_SECRET_KINDS_LISTED).join(", ");
  let t = kinds.length - MAX_SECRET_KINDS_LISTED;
  return t > 0 ? `${joined} and ${t} more ${plural(t, "kind")}` : joined;
}
//@ chunk-jy3v56kg.js:31138-31233 placement
/**
 * 拼出「路径 密钥种类: 说明」的一行（按长度上限截断）。
 */
function formatSecretFinding(e, path, t) {
  let max = Math.max(40, MAX_REPORT_LINE_CHARS - t.length - e.length - 3);
  return `${e} ${truncateForReport(redactPathForReport(path), max)}: ${t}`;
}
//@ chunk-jy3v56kg.js:31233-31366 placement
function summarizeNotScannedReasons(e) {
  let n = new Map();
  for (let { reason } of e) n.set(reason, (n.get(reason) ?? 0) + 1);
  return [...n].map(([t, r]) => `${r} ${NOT_SCANNED_REASONS_PLURAL[t](r)}`).join("; ");
}
//@ chunk-jy3v56kg.js:31495-31585 placement
/**
 * 扫描是否被合规设置关闭：命中 hipaa/zdr 污点为 tainted，策略未载入为 pending。
 */
function scanOffReason() {
  let e = isPolicyLimitsCacheMissing() || isPolicyVerdictAbsent();
  return hasComplianceTaint("hipaa") || hasComplianceTaint("zdr") ? "tainted" : e ? "pending" : undefined;
}
//@ chunk-jy3v56kg.js:31585-31752 placement
var PLUGIN_FILE_EXTENSION = ".plugin";
var lastPackagedModState = identity(createValueSlot(), (e) => e.set(undefined));
var stringOrStringArraySchema = DoctorLazy(() => union([string().transform((e) => [e]), array(string())]));
var attachmentsResultSchema = DoctorLazy(() =>
  u({
    attachments: array(
      u({
        path: string(),
        upload_error: string().optional(),
      }),
    ),
  }),
);
//@ chunk-jy3v56kg.js:31752-31812 placement
function noteLastPackagedMod(e, isClean) {
  lastPackagedModState.set({
    session: getSessionId(),
    name: basename(e),
    isClean,
  });
}
//@ chunk-jy3v56kg.js:31812-31841 placement
function clearLastPackagedMod() {
  lastPackagedModState.set(undefined);
}
//@ chunk-jy3v56kg.js:31841-32633 placement
function recordPackageHandOver(e, n) {
  let folder = skillWatchStateByHost.get()?.folder;
  let r = stringOrStringArraySchema().safeParse(e);
  if (folder === undefined || !r.success || scanOffReason() !== undefined) return;
  let a = n === undefined ? undefined : attachmentsResultSchema().safeParse(n);
  let d = new Set(
    (a?.success === true ? a.data.attachments : [])
      .filter((h) => h.upload_error === undefined)
      .map((h) => basename(h.path)),
  );
  let s = {
    chat_origin: isClaudeAiChatOrigin(),
  };
  for (let h of r.data) {
    let c = h.endsWith(PLUGIN_FILE_EXTENSION) ? basename(h, PLUGIN_FILE_EXTENSION) : undefined;
    let pluginRoot = c === undefined ? undefined : loadedModuleArgs(c)?.pluginRoot;
    if (
      c === undefined ||
      pluginRoot === undefined ||
      childNameUnder(resolve(folder), resolve(pluginRoot)) === undefined
    )
      continue;
    if (!d.has(c + PLUGIN_FILE_EXTENSION)) {
      logFeatureBad(
        "plugin_authoring_package_hand_over",
        a?.success === false ? "result_unread" : "not_delivered",
        s,
      );
      continue;
    }
    let _ = lastPackagedModState.get();
    if (_?.session !== getSessionId() || _.name !== c) {
      logFeatureSad("plugin_authoring_package_hand_over", "not_scanned", s);
      continue;
    }
    if (_.isClean) logFeatureOk("plugin_authoring_package_hand_over", s);
    else logFeatureSad("plugin_authoring_package_hand_over", "scan_not_clean", s);
    clearLastPackagedMod();
  }
}
//@ chunk-jy3v56kg.js:32633-33118 placement
function buildScanCheckHooks() {
  if (policySettingsUnreadable()) return "unreadable";
  if (
    ["tool.call", "classic.PreToolUse"].some((r) =>
      hasModuleHookingSite(
        r,
        {
          tool: FILE_READ_TOOL_NAME,
        },
        getLoadedModulesForSite(r).filter((a) => isPolicyTier(a.name)),
      ),
    )
  )
    return "hooks";
  let settingsForSource = getSettingsForSource("policySettings");
  if (settingsForSource?.disableAllHooks === true) return;
  if (
    (settingsForSource?.hooks?.PreToolUse ?? []).some(
      (r) => r.hooks.length > 0 && isHookInputPathAllowed(r.matcher),
    )
  )
    return "hooks";
  let policyAllowedSet = getPolicyAllowedSet();
  if (policyAllowedSet === null || policyAllowedSet.size === 0) return;
  let registeredHooks = getRegisteredHooks();
  return registeredHooks === null ||
    (registeredHooks.PreToolUse ?? []).some(
      (r) =>
        "pluginRoot" in r &&
        policyAllowedSet.has(r.pluginId) &&
        r.hooks.length > 0 &&
        isHookInputPathAllowed(r.matcher),
    )
    ? "hooks"
    : undefined;
}
export {
  REPLACEMENT_CHAR,
  ANTHROPIC_KEY_LABEL,
  ANTHROPIC_KEY_IN_PATH_REGEX,
  scanOffReason,
  recordPackageHandOver,
  clearLastPackagedMod,
  buildScanCheckHooks,
  collectScanFiles,
  noteLastPackagedMod,
  formatScanSkipped,
  FOLDER_CHANGED_ERROR,
  sanitizeForReport,
  getFileIdentity_2,
  isPluginAuthoringHooksAllowed,
  SECRET_SCAN_SKILL_MODULE,
  PLUGIN_AUTHORING_HOOK_SCAN,
};
