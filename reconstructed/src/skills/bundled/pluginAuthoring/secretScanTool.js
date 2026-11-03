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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  basename,
  resolve,
  resolve as resolve_2,
} from "path";
import { x, Ar } from "../../../../runtime/bun-runtime.js";
import {
  CLOUD_SURFACE_NOTE,
  GIT_PUSH_ONLY_SHARING_NOTE,
  HOSTED_SURFACE_NOTE,
  ORGANIZATION_LIBRARY_NOTE,
  Fe,
  SHARE_AFTER_SAVE_NOTE,
  Le,
  Te,
  PLUGIN_AUTHORING_SKILL,
  PLUGIN_AUTHORING_DESCRIPTION,
  ve,
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
import { $c } from "../../../utils/platformTargets.js";
import { readJunction } from "../../../utils/fsJunctions.js";
import { GIT_LFS_POINTER_PREFIX } from "../../../utils/plugins/marketplaceGitCheckout.js";
import { plural, urlPatternToRegex, ql, truncateWithCount } from "../../../utils/stringUtils.js";
import { stripCombiningRepeated } from "../../../utils/sanitization.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import {
  isPolicyLimitsCacheMissing,
  isPolicyVerdictAbsent,
} from "../../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../../services/policyLimits/complianceTaints.js";
import { ge } from "../../../utils/identity.js";
import { to } from "../../../utils/valueSlot.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { Ue, o, A, u } from "../../../../vendor/zod/v4/classic/schemas.js";
import { getSessionId, getRegisteredHooks } from "../../../bootstrap/state.js";
import { skillWatchStateByHost } from "../../skillChangeWatch.js";
import { isClaudeAiChatOrigin } from "../../../utils/entrypointKinds.js";
import {
  IT,
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

/**
 * plugin-authoring 内置插件声明的函数钩子能力清单。
 */
//@ chunk-jy3v56kg.js:12745-12907 placement
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
var Ke = {};
//@ chunk-jy3v56kg.js:12917-13502 placement
Ar(Ke, {
  CLOUD_SURFACE: () => CLOUD_SURFACE_NOTE,
  EXISTING_REMOTES_ONLY: () => GIT_PUSH_ONLY_SHARING_NOTE,
  HOSTED_SURFACE: () => HOSTED_SURFACE_NOTE,
  ORGANIZATION_LIBRARY: () => ORGANIZATION_LIBRARY_NOTE,
  ORGANIZATION_LIBRARY_OFFER: () => ORG_LIBRARY_SHARING_NOTE,
  PACKAGE_ANY_PLAN: () => Fe,
  PACKAGE_OFFER: () => CLOUD_SHARING_NOTE,
  PACKAGE_ORGANIZATION_PLAN: () => SHARE_AFTER_SAVE_NOTE,
  PACKAGE_PERSONAL_PLAN: () => Le,
  SESSION_SURFACE_PLACEHOLDER: () => Te,
  SHARE_OFFER: () => TERMINAL_SHARING_NOTE,
  SKILL: () => PLUGIN_AUTHORING_SKILL,
  SKILL_DESCRIPTION: () => PLUGIN_AUTHORING_DESCRIPTION,
  SKILL_DIR_PLACEHOLDER: () => ve,
  SKILL_NAME: () => PLUGIN_AUTHORING_2,
  TERMINAL_SURFACE: () => TERMINAL_SURFACE_NOTE,
  TYPES_FILE: () => TYPES_CLAUDE_CODE_D_TS,
  default: () => Ke,
  isAvailable: () => se,
  registerPlugin: () => PLUGIN_AUTHORING_PLUGIN,
  sessionSurfaceOf: () => describeSharingSurface,
  skillFilesMissingNoteOf: () => FILES_NOT_WRITTEN_NOTE,
  skillFilesOf: () => loadPluginAuthoringFiles,
  skillPromptOf: () => buildPrompt,
});
//@ chunk-jy3v56kg.js:13502-13511 placement
var W = {};
//@ chunk-jy3v56kg.js:13511-13655 placement
Ar(W, {
  SEND_FILE_TOOL: () => SENDUSERFILE,
  SKILL_NAME: () => PLUGIN_AUTHORING,
  TOOL: () => MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
  TOOL_NAME: () => SCAN_SECRETS_TOOL_NAME,
  TOOL_SPEC: () => le,
  default: () => W,
  register: () => formatScanNotRun,
  registerHooks: () => registerSecretScanSkillHook,
});
//@ chunk-jy3v56kg.js:13655-13671 placement
var se = () => areHooksModulesAllowed();
//@ chunk-jy3v56kg.js:13671-14565 placement
var SCAN_SECRETS_TOOL_NAME = "scan_secrets",
  MCP_PLUGIN_AUTHORING_SCAN_SECRETS = "mcp__plugin-authoring__scan_secrets",
  SENDUSERFILE = "SendUserFile",
  PLUGIN_AUTHORING = "plugin-authoring",
  le = {
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
var Fn = "Scan it",
  Pn = "Check them",
  We = 32;
//@ chunk-jy3v56kg.js:14604-14678 placement
function D(e) {
  return e.isError ? { result: e.text, isError: !0 } : { result: e.text };
}
//@ chunk-jy3v56kg.js:14678-14789 placement
var READ_UNAVAILABLE_REASON = "Read is not available in this session",
  PERMISSION_CHECK_FAILED_REASON = "the secret scan could not check its permission",
  MAX_CACHED_DECISIONS = 64,
  MAX_SEEN_PATHS = 64;
/**
 * 在 skill.prompt 中注入 scan_secrets 是否可用的说明（合规关闭、托管设置不可读等）。
 */
//@ chunk-jy3v56kg.js:14789-17540 placement
function registerSecretScanSkillHook(e, n) {
  let t;
  (e("skill.prompt", { skill: PLUGIN_AUTHORING, source: "built-in" }, async (d, s, h) => {
    let c = await h(s),
      complianceOff = n.complianceOff(),
      _ =
        complianceOff !== void 0
          ? SCAN_OFF_REASONS[complianceOff]
          : t === void 0
            ? await registerScanTool(d)
            : (await Ze(d, MCP_PLUGIN_AUTHORING_SCAN_SECRETS))
              ? void 0
              : t;
    return (
      (t = _ === Ye ? _ : void 0),
      _ === void 0
        ? c
        : {
            ...c,
            text:
              c.text +
              `

The secret scan tool is not available in this session: ` +
              _ +
              " So the scan in the share steps cannot run here, and a mod cannot be shared until it can: do not open, print or search any file in the folder of a mod to be shared, and tell the person why it can't be shared.",
          }
    );
  }),
    e("tool.check", { tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS }, async (d, s, h) => {
      let c = await h(s),
        folder = s.input.folder;
      if (c.decision === "deny" || c.rule !== void 0 || c.hook !== void 0 || typeof folder !== "string")
        return c;
      let _ = await d.tool.check({ tool: "Read", input: { file_path: n.absolute(folder) } }).catch(() => {
        return;
      });
      if (_ === void 0) return { decision: "deny", reason: READ_UNAVAILABLE_REASON };
      return {
        decision: _.decision === "allow" && c.ceiling === "ask" ? "ask" : _.decision,
        ...(_.reason !== void 0 && { reason: _.reason }),
        ...(_.rule !== void 0 && { rule: _.rule }),
        ...(c.ceiling !== void 0 && { ceiling: c.ceiling }),
      };
    }).catch(() => ({ decision: "deny", reason: PERMISSION_CHECK_FAILED_REASON })));
  let r = new Set(),
    a = new Map();
  if (
    (e("tool.call", { tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS }, async (d, s) => {
      let complianceOff = n.complianceOff();
      if (complianceOff !== void 0) return (B(r, s.tool_use_id), D(n.refuse(Gn[complianceOff], !1)));
      let folder = s.folder;
      if (typeof folder !== "string" || folder === "") {
        let refuse = n.refuse(
          "no folder was given; the scan takes the mod's folder, as an absolute path, in its folder argument.",
        );
        return D(refuse);
      }
      let managedReadHook = n.managedReadHook();
      if (managedReadHook !== void 0)
        return (
          B(r, s.tool_use_id),
          D(
            managedReadHook === "hooks"
              ? n.refuse(MANAGED_READ_HOOK_NOTE, "managed_read_hook")
              : n.refuse($n, "managed_settings_unreadable"),
          )
        );
      let absolute = n.absolute(folder),
        shownPlain = n.shownPlain(absolute);
      if (n.isNetworkPath(folder))
        return (
          B(r, s.tool_use_id),
          D(
            n.refuse(
              `the scan reads only folders it can tell are on this computer, and ${shownPlain} is not one.`,
            ),
          )
        );
      let S = await checkScanReadPermission(d, absolute, shownPlain, {
        mayAsk: n.mayAsk,
        inChat: n.inChat,
        resolveFolder: () => n.resolveFolder(absolute),
        wasAllowed: (k, N) => {
          let R = a.get(n.session() + "\x00" + k);
          return R?.dev === N.dev && R.ino === N.ino;
        },
        allow: (k, N) => vn(a, n.session() + "\x00" + k, N),
      });
      if (S.refusal !== void 0) {
        B(r, s.tool_use_id);
        let refuse = n.refuse(S.refusal);
        return D(refuse);
      }
      let { real: real, identity: identity, answeredRule: answeredRule } = S;
      B(r, s.tool_use_id);
      let scan = await n.scan(
        real,
        async (k) => {
          let N = new Set();
          for (let R = 0; R < k.length; R += We)
            await Promise.all(
              k.slice(R, R + We).map(async (P) => {
                let C = await d.tool.check({ tool: "Read", input: { file_path: P } }).catch(() => {
                  return;
                });
                if (
                  C === void 0 ||
                  C.decision === "deny" ||
                  (C.decision === "ask" && C.rule !== void 0 && C.rule !== answeredRule)
                )
                  N.add(P);
              }),
            );
          return N;
        },
        identity,
        absolute,
      );
      if (scan.changed === !0) a.delete(n.session() + "\x00" + real);
      return D(scan);
    }).catch((d, s) => {
      let refuse = n.refuse("the scan did not finish.", s.tool_use_id === void 0 || !r.has(s.tool_use_id));
      return D(refuse);
    }),
    n.inChat())
  )
    e("tool.call", { tool: SENDUSERFILE }, async (d, s, h) => {
      let c = await h(s);
      return (n.handedOver(s.files, c.deny === void 0 && c.isError === void 0 ? c.result : void 0), c);
    }).catch((d, s, h) => h(s));
}
/**
 * 检查扫描能否读取目标文件夹（权限规则、托管读钩子）。
 */
//@ chunk-jy3v56kg.js:17540-20511 placement
async function checkScanReadPermission(e, n, t, r) {
  let a = await e.tool.check({ tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS, input: { folder: n } }).catch(() => {
    return;
  });
  if (a === void 0) return { refusal: `Claude Code could not check whether the scan may read ${t}.` };
  if (a.decision === "deny")
    return {
      refusal:
        a.reason === READ_UNAVAILABLE_REASON || a.reason === PERMISSION_CHECK_FAILED_REASON
          ? `Claude Code could not check whether the scan may read ${t}.`
          : `the permission settings do not allow the scan to read ${t}.`,
    };
  let d =
    a.rule === void 0
      ? void 0
      : await e.tool.check({ tool: "Read", input: { file_path: n } }).catch(() => {
          return;
        });
  if (a.rule !== void 0 && d?.decision !== "allow" && d?.decision !== "ask")
    return {
      refusal:
        d === void 0
          ? `Claude Code could not check whether the scan may read ${t}.`
          : `the permission settings do not allow the scan to read ${t}.`,
    };
  let s = d?.decision === "ask" ? d.rule : void 0,
    h = a.decision === "allow" && s !== void 0 ? "ask" : a.decision,
    c = h === "ask" && a.rule === void 0 && a.hook === void 0 && a.ceiling !== "ask";
  if (h === "ask" && !c && !r.mayAsk()) return { refusal: askNotPossibleRefusal(t) };
  let folder = await r.resolveFolder(),
    _ = folder.network
      ? `the scan could not tell that ${t} is a folder on this computer.`
      : folder.unidentified
        ? `the scan does not run on ${t}: its file system does not tell folders apart (it gives them no inode numbers).`
        : folder.real === void 0 || folder.identity === void 0
          ? `the scan could not read ${t}.`
          : void 0,
    y = _ === void 0 ? { real: folder.real, identity: folder.identity } : void 0,
    S =
      h === "allow" && y !== void 0 && y.real !== n
        ? await e.tool
            .check({ tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS, input: { folder: y.real } })
            .catch(() => null)
        : void 0;
  if (h === "allow" && S?.decision !== "ask") {
    if (y === void 0) return { refusal: _ };
    if (S === null || S?.reason === READ_UNAVAILABLE_REASON || S?.reason === PERMISSION_CHECK_FAILED_REASON)
      return { refusal: `Claude Code could not check whether the scan may read ${t}.` };
    if (S !== void 0 && S.decision !== "allow")
      return {
        refusal: `${t} leads to another folder, through a link, and the permission settings do not allow the scan to read that folder.`,
      };
    return y;
  }
  if (c && y !== void 0 && r.wasAllowed(y.real, y.identity)) return y;
  if (!r.mayAsk()) return { refusal: askNotPossibleRefusal(t) };
  let E = r.inChat() && c && y !== void 0 && y.real === n,
    b = E ? Pn : Fn,
    M = await (
      E
        ? e.ui.ask(
            `Check the files in this folder and its subfolders for secret keys first?
${folder.shown}
Claude is told which files might hold one and what kind, never the key itself. A yes covers this folder for the rest of this session.`,
            { options: [b, "Don't check"], header: "Key check" },
          )
        : e.ui.ask(
            `Scan the files in this folder for keys and tokens before the mod is shared?
${folder.shown}
The scan reads each file in the folder and its subfolders, except .git, and reports only which files may hold one and what kind, never the value.` +
              (c ? " A yes holds for this folder until /clear or Claude Code restarts." : ""),
            { options: [b, "Don't scan"], header: "Secret scan" },
          )
    ).catch(() => {
      return;
    });
  if (M !== b)
    return {
      refusal:
        M === void 0
          ? `nobody answered whether the scan may read ${t}: the question was dismissed or got no answer, or this session does not ask.`
          : `the person did not choose "${b}" when asked whether the scan may read ${t}.`,
    };
  if (y === void 0) return { refusal: _ };
  if (c) r.allow(y.real, y.identity);
  let F = S?.decision === "ask" ? S.rule : (s ?? a.rule);
  return F === void 0 ? y : { ...y, answeredRule: F };
}
//@ chunk-jy3v56kg.js:20511-20604 placement
function B(e, n) {
  if (n === void 0) return;
  if ((e.add(n), e.size > MAX_SEEN_PATHS)) e.delete(e.values().next().value);
}
//@ chunk-jy3v56kg.js:20604-20679 placement
function vn(e, n, t) {
  if ((e.set(n, t), e.size > MAX_CACHED_DECISIONS)) e.delete(e.keys().next().value);
}
//@ chunk-jy3v56kg.js:20679-20979 placement
var MANAGED_READ_HOOK_NOTE =
    "your organization runs its own checks before files are read, and the scan can't run those checks, so it doesn't read files here.",
  $n =
    "your organization's managed settings could not be read, so the scan can't tell whether they check files before they're read, and it doesn't read files here.";
//@ chunk-jy3v56kg.js:20979-21094 placement
function askNotPossibleRefusal(e) {
  return `the permission settings ask before the scan reads ${e}, and this session cannot ask anyone.`;
}
//@ chunk-jy3v56kg.js:21094-21598 placement
var SCAN_OFF_REASONS = {
    tainted: "your organization's compliance settings turn it off.",
    pending:
      "your organization's policy has not loaded, and the scan cannot run until it does; once it has, loading the skill again adds the tool.",
  },
  Gn = {
    tainted: "your organization's compliance settings turn the scan off.",
    pending: "your organization's policy has not loaded, and the scan cannot run until it does.",
  },
  Ye =
    "Claude Code did not list it, which usually means a permission rule or an organization's MCP server policy blocks it.";
//@ chunk-jy3v56kg.js:21598-21752 placement
async function registerScanTool(e) {
  try {
    let { tool: tool } = await e.tool.register(le);
    return (await Ze(e, tool)) ? void 0 : Ye;
  } catch (error) {
    return describeNoBuiltinTools(error instanceof Error ? error.message : String(error));
  }
}
//@ chunk-jy3v56kg.js:21752-21839 placement
async function Ze(e, n) {
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
  let n = (t) => ({ text: `Result: the scan could not run: ${t}`, isError: !0 });
  registerSecretScanSkillHook(e, {
    absolute: (t) => t,
    shownPlain: (t) => t,
    isNetworkPath: () => !1,
    resolveFolder: async (t) => ({ network: !1, real: t, identity: { dev: 0n, ino: 0n }, shown: t }),
    mayAsk: () => !1,
    managedReadHook: () => {
      return;
    },
    complianceOff: () => {
      return;
    },
    session: () => "",
    inChat: () => !1,
    handedOver: () => {},
    refuse: n,
    scan: async () => n("this build carries no scan."),
  });
}
//@ chunk-jy3v56kg.js:22843-23056 placement
var SCAN_MAX_TOTAL_BYTES = 10485760,
  Q = 26214400,
  me = 20000,
  pe = [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"],
  Xn = 1048576,
  Yn = /(?:^|[^A-Za-z0-9_-])sk-ant-[A-Za-z0-9_-]{40,}/,
  qe = "Anthropic Key",
  ee = "<name holding a secret>";
//@ chunk-jy3v56kg.js:23056-23182 placement
function redactSecretsInPath(e, n = ee) {
  let joined = e
    .split(/([\\/])/)
    .map((r) => (r !== "/" && r !== "\\" && scanForSecrets_2(r).length > 0 ? n : r))
    .join("");
  return scanForSecrets_2(joined).length > 0 ? n : joined;
}
//@ chunk-jy3v56kg.js:23182-23243 placement
function en(e) {
  return quoteForReport(redactSecretsInPath(e, "\x00")).replaceAll("\x00", ee);
}
//@ chunk-jy3v56kg.js:23243-23511 placement
function quoteForReport(e) {
  let replaced = e.replaceAll("\x00", "_");
  if (/^[!-~](?:[ -~]*[!-~])?$/.test(replaced) && !/["\\:<>]/.test(replaced)) return e;
  return `"${[...e].map((r) => (r === "\x00" ? r : r === '"' || r === "\\" ? `\\${r}` : /[ -~]/.test(r) && r !== "<" && r !== ">" ? r : `\\u{${r.codePointAt(0).toString(16)}}`)).join("")}"`;
}
//@ chunk-jy3v56kg.js:23511-23527 placement
var Je = "\uFFFD";
/**
 * 收集要扫描的文件（拒绝 .git 内、不可读、超总大小、链接/硬链接/LFS 指针）。
 */
//@ chunk-jy3v56kg.js:23527-25732 placement
async function collectScanFiles(e, { maxTotalBytes: n = Q, readDenied: t, approved: r } = {}) {
  if (e.split(/[\\/]/).some(tn))
    return { ok: !1, error: "the folder is a .git folder or inside one, which the scan does not read" };
  let a;
  try {
    a = await stat(e, { bigint: !0 });
  } catch (error) {
    return {
      ok: !1,
      error: r !== void 0 ? L : isENOENT(error) ? "no such folder" : "the folder cannot be read",
    };
  }
  if (r !== void 0 && (a.dev !== r.dev || a.ino !== r.ino)) return { ok: !1, error: L };
  if (!a.isDirectory()) return { ok: !1, error: "not a folder" };
  let d = await lstat(e, { bigint: !0 }).catch(() => {
    return;
  });
  if (d === void 0) return { ok: !1, error: r !== void 0 ? L : "the folder cannot be read" };
  if (!d.isDirectory()) return { ok: !1, error: "the folder is a link, not the folder it leads to" };
  let s = await readScanFileSafely(e, { dev: d.dev, ino: d.ino });
  if (s === void 0) return { ok: !1, error: "the folder cannot be read" };
  if (s === "changed") return { ok: !1, error: L };
  let mapped = [...s.skipped].map(([k, N]) => ({ path: k, reason: N })),
    c = [],
    w = 0;
  for (let [k, { size: N }] of [...s.files].toSorted(
    ([R, P], [C, Rn]) => Number(j(R)) - Number(j(C)) || P.size - Rn.size,
  ))
    if (N > SCAN_MAX_TOTAL_BYTES) mapped.push({ path: k, reason: "too large" });
    else if (w + N > n) mapped.push({ path: k, reason: "total limit" });
    else ((w += N), c.push(k));
  let _ = t === void 0 ? new Set() : await t(c),
    y = new Map(),
    S = new Map();
  for (let k of c) {
    if (_.has(k)) {
      mapped.push({ path: k, reason: "read denied" });
      continue;
    }
    let N = k.includes("/") ? k.slice(0, k.lastIndexOf("/")) : "";
    if (!(await getFileIdentity(e, N, s.folderIds))) return { ok: !1, error: L };
    let R = await isWindowsReservedPath(join(e, k), s.files.get(k));
    if (!(await getFileIdentity(e, N, s.folderIds))) return { ok: !1, error: L };
    let P = R === void 0 ? "unreadable" : scanBufferForSecrets(R);
    if (Array.isArray(P)) y.set(k, P);
    else mapped.push({ path: k, reason: P });
    if (R !== void 0 && pe.includes(k) && R.length <= Xn)
      try {
        let C = jsonParse(R.toString("utf8"))?.name;
        if (typeof C === "string" && C !== "") S.set(k, C);
      } catch {}
    await yieldToEventLoop();
  }
  if (r !== void 0 && !(await getFileIdentity_3(e, r))) return { ok: !1, error: L };
  for (let k of s.folderIds.keys())
    if (!(await getFileIdentity(e, k, s.folderIds))) return { ok: !1, error: L };
  let flattened = [...s.files.keys(), ...s.skipped.keys()].flatMap((k) => {
      let N = uniq([...(y.get(k) ?? []), ...scanForSecrets_2(k)]);
      return N.length > 0 ? [{ path: k, kinds: N }] : [];
    }),
    b = S.get(pe[0]),
    M = S.get(pe[1]),
    F = (k, N) => Number(j(k.path)) - Number(j(N.path)) || (k.path < N.path ? -1 : k.path > N.path ? 1 : 0);
  return {
    ok: !0,
    scannedCount: y.size,
    findings: flattened.toSorted(F),
    notScanned: mapped.toSorted(F),
    ...(s.capped && { capped: !0 }),
    ...(b !== void 0 && M !== void 0 && { pluginNames: { plugin: b, marketplace: M } }),
  };
}
//@ chunk-jy3v56kg.js:25732-26716 placement
async function readScanFileSafely(e, n) {
  let t = new Map(),
    r = new Map(),
    a = new Map([["", n]]),
    d = getPlatform() === "windows",
    s = [""],
    h = [],
    c = 0,
    w = !1;
  for (let _ = s.shift() ?? h.shift(); _ !== void 0; _ = s.shift() ?? h.shift()) {
    if (!(await getFileIdentity(e, _, a))) return "changed";
    let y = await readdir(_ === "" ? e : join(e, _), { withFileTypes: !0 }).catch(() => {
      return;
    });
    if (y === void 0) {
      if (_ === "") return;
      r.set(_, "unreadable");
      continue;
    }
    for (let S of y) {
      if (tn(S.name)) continue;
      if (++c > me) {
        w = !0;
        break;
      }
      let E = _ === "" ? S.name : `${_}/${S.name}`;
      if (!d && S.isSymbolicLink()) {
        r.set(E, "link");
        continue;
      }
      let b = await lstat(join(e, E), { bigint: !0 }).catch(() => {
        return;
      });
      if (b === void 0) r.set(E, "unreadable");
      else if (b.isFile() && b.nlink > 1n) r.set(E, "hard link");
      else if (b.isFile()) t.set(E, { dev: b.dev, ino: b.ino, size: Number(b.size) });
      else if (b.isDirectory())
        if (await scanDirectory(join(e, E))) r.set(E, "link");
        else if ((a.set(E, { dev: b.dev, ino: b.ino }), j(E))) h.push(E);
        else s.push(E);
      else r.set(E, b.isSymbolicLink() ? "link" : "not a plain file");
    }
    if (!(await getFileIdentity(e, _, a))) return "changed";
    if (w) break;
  }
  return { files: t, skipped: r, folderIds: a, capped: w };
}
//@ chunk-jy3v56kg.js:26716-26891 placement = getFileIdentity (1)
async function getFileIdentity(e, n, t) {
  let r = t.get(n);
  if (r === void 0) return !0;
  let a = await lstat(join(e, n), { bigint: !0 }).catch(() => {
    return;
  });
  return a?.isDirectory() === !0 && a.dev === r.dev && a.ino === r.ino;
}
//@ chunk-jy3v56kg.js:26891-26937 placement
var qn = [".mcpb-cache", ".claude-plugin/types"];
//@ chunk-jy3v56kg.js:26937-27001 placement
function j(e) {
  return qn.some((n) => e === n || e.startsWith(`${n}/`));
}
//@ chunk-jy3v56kg.js:27001-27048 placement
function tn(e) {
  return e.toLowerCase() === ".git";
}
//@ chunk-jy3v56kg.js:27048-27580 placement
async function isWindowsReservedPath(e, n) {
  if (getPlatform() === "windows") {
    let r = await lstat(e, { bigint: !0 }).catch(() => {
      return;
    });
    if (r?.isFile() !== !0 || r.dev !== n.dev || r.ino !== n.ino) return;
  }
  let t;
  try {
    t = await open(e, $c());
  } catch {
    return;
  }
  try {
    let stats = await t.stat({ bigint: !0 });
    if (
      !stats.isFile() ||
      stats.nlink !== 1n ||
      stats.dev !== n.dev ||
      stats.ino !== n.ino ||
      isSentinelInode(stats.ino)
    )
      return;
    let alloc = Buffer.alloc(Math.min(n.size, SCAN_MAX_TOTAL_BYTES) + 1),
      d = 0;
    while (d < alloc.length) {
      let { bytesRead: bytesRead } = await t.read(alloc, d, alloc.length - d, d);
      if (bytesRead === 0) break;
      d += bytesRead;
    }
    return d > n.size ? void 0 : alloc.subarray(0, d);
  } catch {
    return;
  } finally {
    await t.close().catch(() => {
      return;
    });
  }
}
//@ chunk-jy3v56kg.js:27580-27634 placement
var L = "the folder changed while it was being scanned";
//@ chunk-jy3v56kg.js:27634-27763 placement = getFileIdentity (1)
async function getFileIdentity_2(filePath) {
  let n = await stat(filePath, { bigint: !0 }).catch(() => {
    return;
  });
  return n === void 0 || isSentinelInode(n.ino) ? void 0 : { dev: n.dev, ino: n.ino };
}
//@ chunk-jy3v56kg.js:27763-27841 placement = getFileIdentity (0.794)
async function getFileIdentity_3(e, n) {
  let t = await getFileIdentity_2(e);
  return t?.dev === n.dev && t.ino === n.ino;
}
//@ chunk-jy3v56kg.js:27841-27929 placement = scanDirectory (0.766)
async function scanDirectory(dirPath) {
  if (getPlatform() !== "windows") return !1;
  return (await readJunction(dirPath)).kind !== "directory";
}
//@ chunk-jy3v56kg.js:28144-28246 sole-consumer
function scanBufferForSecrets(e) {
  let str = e.toString("utf8"),
    t = scanForSecrets_2(str);
  return t.length === 0 && str.startsWith(GIT_LFS_POINTER_PREFIX) ? "lfs pointer" : t;
}
//@ chunk-jy3v56kg.js:28246-29247 placement
var SCAN_MAX_LISTED = 100,
  ot = 30,
  rt = 300,
  on = 3,
  it = {
    "too large": `over ${SCAN_MAX_TOTAL_BYTES / 1048576} MB`,
    "total limit": `the scan reads at most ${Q / 1048576} MB in all`,
    "lfs pointer": "a Git LFS pointer",
    unreadable: "it could not be read",
    "read denied":
      "the person's Read permission rules do not allow reading it without asking, or could not be checked",
    link: "a link, which the scan does not follow",
    "hard link":
      "a hard link, a second name for a file that may sit outside the folder, which the scan does not read",
    "not a plain file": "not a plain file or folder",
  },
  st = {
    "too large": () => `over ${SCAN_MAX_TOTAL_BYTES / 1048576} MB`,
    "total limit": () => `past the ${Q / 1048576} MB total`,
    "lfs pointer": (e) => plural(e, "Git LFS pointer"),
    unreadable: () => "that couldn't be read",
    "read denied": () => "that the person's Read rules keep from the scan",
    link: (e) => plural(e, "link"),
    "hard link": (e) => plural(e, "hard link"),
    "not a plain file": (e) =>
      e === 1 ? "that is not a plain file or folder" : "that are not plain files or folders",
  },
  regExp = new RegExp(`${urlPatternToRegex(ee)}|\\\\u\\{[0-9a-f]+\\}|\\\\["\\\\]|[\\s\\S]`, "gu");
//@ chunk-jy3v56kg.js:29247-29578 placement
function truncateForReport(e, n) {
  if (e.length <= n) return e;
  let t = e.match(regExp) ?? [],
    max = Math.max(n - 32, 8),
    ceil = Math.ceil(max / 3),
    d = "",
    s = 0;
  while (s < t.length && d.length + t[s].length <= ceil) ((d += t[s]), s++);
  let h = "",
    c = t.length;
  while (c > s && h.length + t[c - 1].length <= max - d.length) ((h = t[c - 1] + h), c--);
  let w = e.length - d.length - h.length;
  return `${d}\u2026(${w} characters left out)\u2026${h}`;
}
//@ chunk-jy3v56kg.js:29578-29680 placement
function sanitizeForReport(e, n) {
  let replaced = ql(stripCombiningRepeated(e)).replace(/[<>]/g, (r) => (r === "<" ? "\\u{3c}" : "\\u{3e}"));
  return truncateForReport(redactSecretsInPath(replaced), n);
}
//@ chunk-jy3v56kg.js:29680-29724 placement
function lt(e) {
  return truncateWithCount(redactSecretsInPath(ql(stripCombiningRepeated(e))), 400);
}
//@ chunk-jy3v56kg.js:29724-31029 placement
function formatScanSkipped(e, n) {
  let t = sanitizeForReport(e, 200);
  if (!n.ok) return { text: `Result: the scan could not run in ${t}: ${lt(n.error)}`, isError: !0 };
  let { scannedCount: scannedCount, findings: findings, notScanned: notScanned, capped: capped } = n,
    joined = [
      ...(notScanned.length > 0
        ? [
            `${notScanned.length} ${plural(notScanned.length, "file or folder was", "files or folders were")} not scanned`,
          ]
        : []),
      ...(capped === !0 ? ["part of the folder was not looked at"] : []),
    ].join("; "),
    c =
      findings.length > 0
        ? `Result: possible secrets in ${findings.length} ${plural(findings.length, "file")}${joined === "" ? "" : `; ${joined}`}. Values are not shown.`
        : joined !== ""
          ? `Result: no known key or token format in the scanned files; ${joined}.`
          : "Result: no known key or token format found.",
    sliced = findings.slice(0, SCAN_MAX_LISTED),
    sliced_2 = notScanned.slice(0, ot);
  return {
    text: [
      c,
      `Scanned ${scannedCount} ${plural(scannedCount, "file")} in ${t} for known key and token formats.`,
      ...sliced.map((S) => rn(re.cross, S.path, summarizeSecretKinds(S.kinds))),
      ...(findings.length > sliced.length
        ? [
            `${re.cross} \u2026 and ${findings.length - sliced.length} more ${plural(findings.length - sliced.length, "file")} with possible secrets, not listed here.`,
          ]
        : []),
      ...sliced_2.map((S) => rn(re.warning, S.path, `not scanned (${it[S.reason]})`)),
      ...(notScanned.length > sliced_2.length
        ? [
            `${re.warning} \u2026 and ${notScanned.length - sliced_2.length} more not scanned: ${summarizeNotScannedReasons(notScanned.slice(sliced_2.length))}.`,
          ]
        : []),
      ...(capped === !0
        ? [
            `${re.warning} Only the first ${me.toLocaleString("en-US")} files and folders were looked at; the rest of the folder was not scanned, and which files it holds is unknown.`,
          ]
        : []),
      c,
    ].join(`
`),
    isError: !1,
  };
}
//@ chunk-jy3v56kg.js:31029-31138 placement
function summarizeSecretKinds(e) {
  let joined = e.slice(0, on).join(", "),
    t = e.length - on;
  return t > 0 ? `${joined} and ${t} more ${plural(t, "kind")}` : joined;
}
//@ chunk-jy3v56kg.js:31138-31233 placement
function rn(e, n, t) {
  let max = Math.max(40, rt - t.length - e.length - 3);
  return `${e} ${truncateForReport(en(n), max)}: ${t}`;
}
//@ chunk-jy3v56kg.js:31233-31366 placement
function summarizeNotScannedReasons(e) {
  let n = new Map();
  for (let { reason: reason } of e) n.set(reason, (n.get(reason) ?? 0) + 1);
  return [...n].map(([t, r]) => `${r} ${st[t](r)}`).join("; ");
}
//@ chunk-jy3v56kg.js:31495-31585 placement
function ke() {
  let e = isPolicyLimitsCacheMissing() || isPolicyVerdictAbsent();
  return hasComplianceTaint("hipaa") || hasComplianceTaint("zdr") ? "tainted" : e ? "pending" : void 0;
}
//@ chunk-jy3v56kg.js:31585-31752 placement
var PLUGIN_FILE_EXTENSION = ".plugin",
  lastPackagedModState = ge(to(), (e) => e.set(void 0)),
  stringOrStringArraySchema = DoctorLazy(() => Ue([o().transform((e) => [e]), A(o())])),
  attachmentsResultSchema = DoctorLazy(() =>
    u({ attachments: A(u({ path: o(), upload_error: o().optional() })) }),
  );
//@ chunk-jy3v56kg.js:31752-31812 placement
function mt(e, n) {
  lastPackagedModState.set({ session: getSessionId(), name: basename(e), isClean: n });
}
//@ chunk-jy3v56kg.js:31812-31841 placement
function Ae() {
  lastPackagedModState.set(void 0);
}
//@ chunk-jy3v56kg.js:31841-32633 placement
function recordPackageHandOver(e, n) {
  let t = skillWatchStateByHost.get()?.folder,
    safeParse = stringOrStringArraySchema().safeParse(e);
  if (t === void 0 || !safeParse.success || ke() !== void 0) return;
  let a = n === void 0 ? void 0 : attachmentsResultSchema().safeParse(n),
    d = new Set(
      (a?.success === !0 ? a.data.attachments : [])
        .filter((h) => h.upload_error === void 0)
        .map((h) => basename(h.path)),
    ),
    s = { chat_origin: isClaudeAiChatOrigin() };
  for (let h of safeParse.data) {
    let c = h.endsWith(PLUGIN_FILE_EXTENSION) ? basename(h, PLUGIN_FILE_EXTENSION) : void 0,
      w = c === void 0 ? void 0 : IT(c)?.pluginRoot;
    if (c === void 0 || w === void 0 || childNameUnder(resolve_2(t), resolve_2(w)) === void 0) continue;
    if (!d.has(c + PLUGIN_FILE_EXTENSION)) {
      logFeatureBad(
        "plugin_authoring_package_hand_over",
        a?.success === !1 ? "result_unread" : "not_delivered",
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
    Ae();
  }
}
//@ chunk-jy3v56kg.js:32633-33118 placement
function buildScanCheckHooks() {
  if (policySettingsUnreadable()) return "unreadable";
  if (
    ["tool.call", "classic.PreToolUse"].some((r) =>
      hasModuleHookingSite(
        r,
        { tool: FILE_READ_TOOL_NAME },
        getLoadedModulesForSite(r).filter((a) => isPolicyTier(a.name)),
      ),
    )
  )
    return "hooks";
  let e = getSettingsForSource("policySettings");
  if (e?.disableAllHooks === !0) return;
  if ((e?.hooks?.PreToolUse ?? []).some((r) => r.hooks.length > 0 && isHookInputPathAllowed(r.matcher)))
    return "hooks";
  let n = getPolicyAllowedSet();
  if (n === null || n.size === 0) return;
  let t = getRegisteredHooks();
  return t === null ||
    (t.PreToolUse ?? []).some(
      (r) =>
        "pluginRoot" in r && n.has(r.pluginId) && r.hooks.length > 0 && isHookInputPathAllowed(r.matcher),
    )
    ? "hooks"
    : void 0;
}

export {
  Je,
  qe,
  Yn,
  ke,
  recordPackageHandOver,
  Ae,
  buildScanCheckHooks,
  collectScanFiles,
  mt,
  formatScanSkipped,
  L,
  sanitizeForReport,
  getFileIdentity_2,
  se,
  W,
  PLUGIN_AUTHORING_HOOK_SCAN,
};
