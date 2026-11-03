/**
 * skills/bundled/pluginAuthoring/pluginAuthoring.ts
 *
 * 2.1.316 新增：plugin-authoring 内置技能（Make a mod）：按会话形态（云端、桌面、终端）给出分享 mod 的方式与提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jy3v56kg.js (35)
 * attribution: placement 35
 */
import { resolve, resolve as resolve_2, join, join as join_2, join as join_3, join as join_4 } from "path";
import { realpath } from "fs/promises";
import { homedir } from "os";
import { hookMatcherMatches } from "../../../utils/hooks.js";
import { PreToolUseHookInputSchema_2 } from "../../../entrypoints/sdk/coreSchemas.js";
import { xpe } from "../../../utils/hooks/matcherGrammar.js";
import { getCwd } from "../../../utils/cwd.js";
import { CL } from "../../../utils/fsJunctions.js";
import { hl } from "../../../utils/networkPaths.js";
import {
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
} from "./secretScanTool.js";
import { getSessionId, getIsNonInteractiveSession } from "../../../bootstrap/state.js";
import { getSessionEntrypoint, envSessionKind, hostScheduledRun } from "../../../utils/sessionShape.js";
import { lp } from "../../../plugins/functionHooks/surfaceBinding.js";
import { oZe } from "../../../utils/permissions/confirmWithUser.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { outsideBudget } from "../../../plugins/functionHooks/dispatch/valueSizing.js";
import { uniq } from "../../../utils/collections.js";
import { logError } from "../../../utils/log.js";
import { realpathAllowMissing } from "../../../utils/pathResolution.js";
import { lx } from "../../../utils/telemetry/pluginTelemetry.js";
import { env } from "../../../utils/env.js";
import { parseYaml } from "../../../utils/yaml.js";
import { isGithubDotCom } from "../../../utils/git/githubUrl.js";
import { repoDetectionGuards, detectCurrentRepositoryWithHost } from "../../../utils/detectRepository.js";
import { execFileNoThrowWithCwd } from "../../../utils/execFileNoThrow.js";
import { gitExe } from "../../../utils/git.js";
import { freeze } from "../../../utils/git/gitSafeEnv.js";
import { subprocessEnv } from "../../../utils/subprocessEnv.js";
import { readFileChecked } from "../../../utils/fileRead.js";
import {
  NO_ONE_TO_ASK_TEXT,
  expandDevModsPlaceholder,
} from "../../../services/plugins/devMods/devModsWatcher.js";
import { PUBLISH_PLUGIN_TOOL_NAME } from "../../../tools/PublishPluginTool/prompt.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { lGn, getAuthUnavailableReason } from "../../../utils/auth/authUnavailableReason.js";
import { Vt } from "../../../utils/agentId.js";
import { isPolicyAllowed } from "../../../services/policyLimits/policyEvidence.js";
import {
  ALLOW_PLUGIN_PUBLISH_KEY,
  isPluginPublishAllowed,
} from "../../../services/plugins/publish/publishGate.js";
import { isHeadlessHostEntrypoint, isRemoteEntrypoint } from "../../../utils/entrypointKinds.js";
import { getSubscriptionType, isConsumerSubscriber } from "../../../utils/auth.js";
import {
  CLOUD_SHARING_NOTE,
  isNativeTerminalNotifySupported,
  ORG_LIBRARY_SHARING_NOTE,
  TERMINAL_SHARING_NOTE,
} from "../pluginAuthoringPrompt.js";
import { getAllBaseToolsFromRegistry, toolMatchesName } from "../../../Tool.js";
import { _P } from "../../loadSkillsDir.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../../tools/SendUserFileTool/prompt.js";
import { buildPrompt } from "../claudeApi.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../../plugins/builtinPlugins.js";

//@ chunk-jy3v56kg.js:33238-33321 placement
function isHookInputPathAllowed(e) {
  try {
    return hookMatcherMatches(PreToolUseHookInputSchema_2, e);
  } catch (error) {
    if (error instanceof xpe) return !0;
    throw error;
  }
}
//@ chunk-jy3v56kg.js:33321-34656 placement
var createPluginAuthoringHooks = (e) => ({
    register: (n) => {
      e.registerHooks(n, {
        absolute: (t) => resolve(getCwd(), t),
        shownPlain: (t) => Z(resolve(getCwd(), t)),
        isNetworkPath: (t) => [t, resolve(getCwd(), t)].some((r) => CL(r) || hl(r)),
        resolveFolder: (t) => describeModFolder(resolve(getCwd(), t)),
        complianceOff: () => ke(),
        session: () => getSessionId(),
        inChat: () => getSessionEntrypoint() === "remote_cowork",
        handedOver: (t, r) => recordPackageHandOver(t, r),
        mayAsk: () => {
          let t = lp();
          if (t === void 0) return !1;
          try {
            return oZe(t.toolContext(new AbortController()));
          } catch {
            return !1;
          }
        },
        refuse: (t, r = !0) => {
          if ((Ae(), r === "managed_read_hook"))
            logFeatureBad("plugin_authoring_scan_secrets", "managed_read_hook");
          else if (r === "managed_settings_unreadable")
            logFeatureBad("plugin_authoring_scan_secrets", "managed_settings_unreadable");
          else if (r) logFeatureBad("plugin_authoring_scan_secrets", "scan_not_run");
          return { text: `Result: the scan could not run: ${t}`, isError: !0 };
        },
        managedReadHook: () => buildScanCheckHooks(),
        scan: (t, r, a, d) =>
          outsideBudget(async () => {
            let s = resolve(getCwd(), t),
              h = d === void 0 ? s : resolve(getCwd(), d),
              c = (_) => (h === s ? [join_2(s, _)] : [join_2(s, _), join_2(h, _)]),
              w;
            try {
              w = await collectScanFiles(s, {
                approved: a,
                readDenied: async (_) => {
                  let y = new Set(),
                    S = await r(uniq(_.flatMap(c)));
                  for (let E of _) if (c(E).some((b) => S.has(b))) y.add(E);
                  return y;
                },
              });
            } catch {
              (logError(Error("the secret scan threw an unexpected error")),
                (w = { ok: !1, error: "the scan hit an unexpected error." }));
            }
            if (w.ok) mt(s, w.findings.length === 0 && w.notScanned.length === 0 && w.capped !== !0);
            else Ae();
            return (
              await logScanOutcome(w).catch(() => {
                return;
              }),
              { ...formatScanSkipped(t, w), ...(!w.ok && w.error === L && { changed: !0 }) }
            );
          }),
      });
    },
  }),
  kt = 200;
//@ chunk-jy3v56kg.js:34656-34686 placement
function Z(e) {
  return sanitizeForReport(e, kt);
}
//@ chunk-jy3v56kg.js:34686-34983 placement
async function describeModFolder(e) {
  if (realpathAllowMissing(e)) return { network: !0, shown: `Folder: ${Z(e)}` };
  let n = await realpath(e).catch(() => {
      return;
    }),
    t = n === void 0 ? void 0 : await getFileIdentity_2(n);
  return {
    network: !1,
    real: n,
    identity: t,
    unidentified: n !== void 0 && t === void 0,
    shown:
      n === void 0 || n === e
        ? `Folder: ${Z(e)}`
        : `Folder: ${Z(e)}
It leads to: ${Z(n)}`,
  };
}
//@ chunk-jy3v56kg.js:34983-35428 placement
async function logScanOutcome(e) {
  if (!e.ok) {
    logFeatureBad("plugin_authoring_scan_secrets", "scan_not_run");
    return;
  }
  let pluginNames = e.pluginNames,
    t = {
      files_with_secrets: e.findings.length,
      files_not_scanned: e.notScanned.length,
      ...(pluginNames !== void 0 && { plugin_id_hash: lx(pluginNames.plugin, pluginNames.marketplace) }),
    };
  if (e.capped === !0) logFeatureSad("plugin_authoring_scan_secrets", "folder_capped", t);
  else if (e.notScanned.length > 0) logFeatureSad("plugin_authoring_scan_secrets", "files_not_scanned", t);
  else logFeatureOk("plugin_authoring_scan_secrets", t);
}
//@ chunk-jy3v56kg.js:35516-35553 placement
var At = /^[a-z0-9][a-z0-9_-]{0,38}$/i;
//@ chunk-jy3v56kg.js:35553-35695 placement
function getGhConfigDir() {
  if (env.GH_CONFIG_DIR) return env.GH_CONFIG_DIR;
  if (env.XDG_CONFIG_HOME) return join_4(env.XDG_CONFIG_HOME, "gh");
  return join_4(homedir(), ".config", "gh");
}
//@ chunk-jy3v56kg.js:35695-36095 placement
function readPluginJsonFields(e) {
  let n;
  try {
    n = parseYaml(e);
  } catch {
    return [];
  }
  if (typeof n !== "object" || n === null) return [];
  let t = [];
  for (let [r, a] of Object.entries(n)) {
    if (!isGithubDotCom(r) || typeof a !== "object" || a === null) continue;
    let { user: user, users: users } = a;
    if (typeof user === "string" || typeof user === "number") t.push(String(user));
    if (typeof users === "object" && users !== null && !Array.isArray(users)) t.push(...Object.keys(users));
  }
  return uniq(t.map((r) => r.trim()).filter((r) => At.test(r)));
}
//@ chunk-jy3v56kg.js:36095-36108 placement
var Nt = 65536;
//@ chunk-jy3v56kg.js:36108-36324 placement
async function isRepoOwnedByGhUser() {
  if (repoDetectionGuards().blocked()) return !1;
  let e = await detectCurrentRepositoryWithHost(void 0, { skipCache: !0 });
  if (e === null) return describeGitRemote(getCwd());
  if (!isGithubDotCom(e.host)) return !1;
  let lower = e.owner.toLowerCase();
  return (await readGhHostUsers()).some((t) => t.toLowerCase() === lower);
}
//@ chunk-jy3v56kg.js:36324-36562 placement
async function describeGitRemote(e) {
  let n = await execFileNoThrowWithCwd(gitExe(), [...freeze, "remote"], {
    cwd: e,
    env: { ...subprocessEnv(), LC_ALL: "C" },
    preserveOutputOnError: !0,
  });
  if (n.exitCode === 0) return n.stdout.trim() === "";
  return n.exitCode === 128 && n.stderr.includes("not a git repository (or any");
}
//@ chunk-jy3v56kg.js:36562-36664 placement
async function readGhHostUsers() {
  try {
    let { content: content } = await readFileChecked(join_3(getGhConfigDir(), "hosts.yml"), Nt);
    return readPluginJsonFields(content);
  } catch {
    return [];
  }
}
//@ chunk-jy3v56kg.js:36664-36931 placement
var CLOUD_SURFACE_NOTE =
  "THIS SESSION runs in a cloud container and draws in no terminal of its own: whatever shows it (an app, a client) seats a pane where its surface seats panes. The mod's folder is in the container, not on the person's computer, and ends when the container does.";
//@ chunk-jy3v56kg.js:36931-37087 placement
var GIT_PUSH_ONLY_SHARING_NOTE = `

SHARING IT. In this session, git pushes a mod only to a remote the person already has; no new repository is created on GitHub or any other host.`;
//@ chunk-jy3v56kg.js:37087-37389 placement
var HOSTED_SURFACE_NOTE = `THIS SESSION draws in no terminal of its own: a program started it, and a pane is seated by a surface it attaches, if any. Where hot reloading is off as ${NO_ONE_TO_ASK_TEXT}, the mod loads in a session started with \`--plugin-dir <mod folder>\`, or one with the folder named in \`CLAUDE_CODE_PLUGIN_DIRS\`.`;
//@ chunk-jy3v56kg.js:37389-37811 placement
var ORGANIZATION_LIBRARY_NOTE = ` This session has the \`${PUBLISH_PLUGIN_TOOL_NAME}\` tool, so the normal way to share a mod here is the person's organization's library on claude.ai: when they ask to share or publish one, publish it with that tool, which shows them every file and sends nothing before their yes. A GitHub repository, by Sharing a mod in reference.md, is the other road: for people outside the organization, or when the person asks for a repository.`;
//@ chunk-jy3v56kg.js:37811-38478 placement
var SHARE_AFTER_SAVE_NOTE =
    " After saving, the person sees Share appear on the file's card and presses it, then adds teammates by name or, where the organization allows, picks Publish to org. Where no Share appears, they send the file, to add with Upload plugin.",
  Le =
    " After saving, the person sends someone the file, downloaded from its card or the saved plugin's page, for them to add under Customize or Plugins, with Add, then Upload plugin.",
  Fe =
    " After saving, the person presses Share where it then appears on the file's card, or sends someone the file, downloaded from its card or the saved plugin's page, for them to add under Customize or Plugins, with Add, then Upload plugin.";
//@ chunk-jy3v56kg.js:38478-38506 placement
var TENGU_WOVEN_PARCEL = "tengu_woven_parcel";
//@ chunk-jy3v56kg.js:38506-38516 placement
var Ct = !1;
//@ chunk-jy3v56kg.js:38516-38551 placement
function Lt() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WOVEN_PARCEL, Ct) === !0;
}
//@ chunk-jy3v56kg.js:38551-38578 placement
var TENGU_SPICY_PEARL = "tengu_spicy_pearl";
//@ chunk-jy3v56kg.js:38578-38588 placement
var Tt = !1;
//@ chunk-jy3v56kg.js:38588-38623 placement
function Dt() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SPICY_PEARL, Tt) === !0;
}
//@ chunk-jy3v56kg.js:38623-38684 placement
var vt = () => lGn() && Vt(env.CLAUDE_CODE_ORGANIZATION_UUID) === null;
//@ chunk-jy3v56kg.js:38684-38989 placement
var TERMINAL_SURFACE_NOTE = `THIS SESSION is drawn in a terminal. A pane the person opened seats at any width; one opened unasked seats from 144 columns, or 110 as \`$.ui.open\`'s doc says, and waits below that. Where hot reloading is off as ${NO_ONE_TO_ASK_TEXT}, \`claude --plugin-dir <mod folder>\` starts a session with the mod loaded.`;
//@ chunk-jy3v56kg.js:38989-39496 placement
function describeSharingSurface(e, n, t) {
  let r = !isPolicyAllowed(ALLOW_PLUGIN_PUBLISH_KEY),
    a =
      e &&
      !r &&
      isPluginPublishAllowed() &&
      envSessionKind() &&
      getAuthUnavailableReason() === void 0 &&
      !vt(),
    d = (a ? ORGANIZATION_LIBRARY_NOTE : "") + (r ? GIT_PUSH_ONLY_SHARING_NOTE : "");
  if (isHeadlessHostEntrypoint() || isRemoteEntrypoint()) {
    if (
      getSessionEntrypoint() !== "remote_cowork" ||
      !envSessionKind() ||
      r ||
      a ||
      !t ||
      ke() !== void 0 ||
      buildScanCheckHooks() !== void 0 ||
      !Lt()
    )
      return CLOUD_SURFACE_NOTE + d;
    switch (getSubscriptionType()) {
      case "team":
      case "enterprise":
        return CLOUD_SURFACE_NOTE + CLOUD_SHARING_NOTE + SHARE_AFTER_SAVE_NOTE;
      case "pro":
      case "max":
        return CLOUD_SURFACE_NOTE + CLOUD_SHARING_NOTE + Le;
      default:
        return CLOUD_SURFACE_NOTE + CLOUD_SHARING_NOTE + Fe;
    }
  }
  let s = getIsNonInteractiveSession(),
    c = (s ? HOSTED_SURFACE_NOTE : TERMINAL_SURFACE_NOTE) + d,
    w =
      !s ||
      (isNativeTerminalNotifySupported() &&
        !hostScheduledRun() &&
        env.CLAUDE_SSH_DAEMON_CHILD === void 0 &&
        env.CLAUDE_SSH_RUN_DIR === void 0);
  if (r || !envSessionKind() || !w || (!a && (!isConsumerSubscriber() || !n)) || !Dt()) return c;
  return c + (a ? ORG_LIBRARY_SHARING_NOTE : TERMINAL_SHARING_NOTE);
}
//@ chunk-jy3v56kg.js:39496-39531 placement
var Te = "${CLAUDE_SESSION_SURFACE}";
//@ chunk-jy3v56kg.js:39531-39787 placement
var PLUGIN_AUTHORING_DESCRIPTION =
  "Make a mod: a change to Claude's own interface or behaviour, such as a panel or pane that stays beside the chat and updates, a band, status line, toast, slash command, or hook on tool calls. Use to make, change or debug a mod or its hooks module.";
//@ chunk-jy3v56kg.js:39787-39816 placement
var ve = "${CLAUDE_SKILL_DIR}";
//@ chunk-jy3v56kg.js:39816-39848 placement
var TYPES_CLAUDE_CODE_D_TS = "types/claude-code.d.ts";
/**
 * 加载 plugin-authoring 技能附带的参考文件（类型定义、示例）。
 */
//@ chunk-jy3v56kg.js:39848-40846 placement
async function loadPluginAuthoringFiles(e) {
  let [n, t, r] = await Promise.all([
    import("./chunk-z88hz9c9.js"),
    import("./chunk-72n15jmc.js"),
    import("./chunk-k7f98cn0.js"),
  ]);
  return {
    [TYPES_CLAUDE_CODE_D_TS]: t.pluginDeclarationsOf(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      r.builtinToolSchemasOf(getAllBaseToolsFromRegistry() ?? e.options.tools),
    ),
    "examples/pane.tsx": n.EXAMPLE_PANE,
    "examples/pane-state.d.ts": n.EXAMPLE_PANE_STATE,
    "examples/pane.test.tsx": n.EXAMPLE_PANE_TEST,
    "examples/band.tsx": n.EXAMPLE_BAND,
    "examples/band-state.d.ts": n.EXAMPLE_BAND_STATE,
    "examples/tool-call.ts": n.EXAMPLE_TOOL_CALL,
    "reference.md": n.REFERENCE_MD,
  };
}
//@ chunk-jy3v56kg.js:40846-41106 placement
var FILES_NOT_WRITTEN_NOTE = (
  e,
) => `The engine could not write this skill's folder, ${e}, this time, so the files named below under it are absent; once the engine has loaded the mod from its folder the same declarations are in its \`.claude-plugin/types/claude-code/index.d.ts\`.

`;
//@ chunk-jy3v56kg.js:41106-41132 placement
var PLUGIN_AUTHORING_2 = "plugin-authoring";
/**
 * plugin-authoring 内置技能定义（名称、描述、可由用户调用、附带文件）。
 */
//@ chunk-jy3v56kg.js:41250-41836 placement
var PLUGIN_AUTHORING_SKILL = Object.freeze({
  name: PLUGIN_AUTHORING_2,
  description: PLUGIN_AUTHORING_DESCRIPTION,
  menuDescription: "Write a mod: a live pane, view or behaviour change in Claude Code",
  userInvocable: !0,
  files: loadPluginAuthoringFiles,
  async getPromptForCommand(e, n, t) {
    let { SKILL_MD: SKILL_MD } = await import("./chunk-z88hz9c9.js"),
      a = _P(t ?? (await import("./chunk-et4cgz1y.js")).getBundledSkillExtractDir(PLUGIN_AUTHORING_2)),
      d = await isRepoOwnedByGhUser().catch((c) => (logError(c), !1)),
      s = await expandDevModsPlaceholder(
        SKILL_MD.replaceAll(ve, () => a).replaceAll(Te, () =>
          describeSharingSurface(
            n.options.tools.some((tool) => toolMatchesName(tool, PUBLISH_PLUGIN_TOOL_NAME)),
            d,
            n.options.tools.some((tool) => toolMatchesName(tool, SEND_USER_FILE_TOOL_NAME)),
          ),
        ),
        { isPreload: n.options.isSkillPreload === !0 },
      );
    return [{ type: "text", text: (t === null ? FILES_NOT_WRITTEN_NOTE(a) : "") + buildPrompt(s, e) }];
  },
});
//@ chunk-jy3v56kg.js:41836-42087 placement
var PLUGIN_AUTHORING_PLUGIN = () =>
  registerBuiltinPlugin({
    name: "cc-plugin-plugin-authoring",
    description:
      "Plugin authoring: Claude knows how a plugin of function hooks is written, typed and debugged against this build",
    isAvailable: se,
    skills: [PLUGIN_AUTHORING_SKILL],
    hooksModule: builtinHooksModuleRef(import.meta.dir, createPluginAuthoringHooks(W), () =>
      PLUGIN_AUTHORING_HOOK_SCAN(),
    ),
  });

export {
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
};
