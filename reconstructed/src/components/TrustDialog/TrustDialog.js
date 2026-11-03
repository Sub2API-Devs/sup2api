/**
 * components/TrustDialog/TrustDialog.tsx
 *
 * 工作区信任对话框：首次进入目录时列出该项目的 hooks/MCP/bash 权限/apiKeyHelper/技能等风险来源，信任或退出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TrustDialog/TrustDialog.tsx
 * pieces: chunk-8rmevhsy.js (7)
 * attribution: placement 1, file-local 2, fingerprint 4
 */
import { j, P, R } from "../../../vendor/react/cjs/react.production.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getMcpConfigsByScope } from "../../services/mcp/config.js";
import {
  getHooksSources_3,
  getHooksSources,
  collectAllowRuleSources,
  collectAdditionalDirectorySources,
  getHooksSources_6,
  getHooksSources_7,
  getHooksSources_8,
  getHooksSources_4,
  getHooksSources_9,
  getBashPermissionSources,
  getBashAndMcpPermissionSources,
  hasUngatedTrustSources,
  getHooksSources_10,
  getHooksSources_5,
  formatListWithAnd_2,
} from "./utils.js";
import { checkHasTrustDialogAccepted, saveCurrentProjectConfig } from "../../utils/config.js";
import {
  isHomeDirectorySession,
  setSessionTrustAccepted,
  setHomeTrustDialogAccepted,
} from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { isShuttingDown, gracefulShutdownSync } from "../../utils/gracefulShutdown.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { CC } from "../../utils/kbCohesionFixes.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { escapePathForDisplay } from "../../utils/invisibleChars.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { plural } from "../../utils/stringUtils.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";

//@ chunk-8rmevhsy.js:14038-14042 placement
j();
//@ chunk-8rmevhsy.js:14042-14096 file-local
function zo(tool_0) {
  return tool_0 === BASH_TOOL_NAME || tool_0.startsWith(BASH_TOOL_NAME + "(");
}
//@ chunk-8rmevhsy.js:14096-14260 fingerprint = _temp2 (1)
function isLegacyProjectCommandWithBashAllow(command) {
  return (
    command.type === "prompt" &&
    command.loadedFrom === "commands_DEPRECATED" &&
    (command.source === "projectSettings" || command.source === "localSettings") &&
    command.allowedTools?.some(zo)
  );
}
//@ chunk-8rmevhsy.js:14260-14314 file-local
function Jo(tool) {
  return tool === BASH_TOOL_NAME || tool.startsWith(BASH_TOOL_NAME + "(");
}
//@ chunk-8rmevhsy.js:14314-14513 fingerprint = _temp4 (1)
function isProjectSkillWithBashAllow(command_0) {
  return (
    command_0.type === "prompt" &&
    (command_0.loadedFrom === "skills" || command_0.loadedFrom === "plugin") &&
    (command_0.source === "projectSettings" ||
      command_0.source === "localSettings" ||
      command_0.source === "plugin") &&
    command_0.allowedTools?.some(Jo)
  );
}
//@ chunk-8rmevhsy.js:14513-14569 fingerprint = _temp5 (1)
function Yo(current) {
  return { ...current, hasTrustDialogAccepted: !0 };
}
/**
 * 工作区信任对话框：列出项目中会自动执行或放权的配置（hooks、MCP 服务器、bash 权限、apiKeyHelper、OTEL headers helper、AWS/GCP 命令、危险 env、技能/插件），用户选择信任后写入项目配置；拒绝则退出。
 */
//@ chunk-8rmevhsy.js:14569-20723 fingerprint = TrustDialog (0.487)
function TrustDialog(t0) {
  let $ = w(67),
    { onDone: onDone, commands: commands } = t0,
    { storageV5: storageV5 } = Me(),
    qe;
  if ($[0] === MEMO_CACHE_SENTINEL) ((qe = getMcpConfigsByScope("project")), ($[0] = qe));
  else qe = $[0];
  let { servers: projectServers } = qe,
    Qe;
  if ($[1] === MEMO_CACHE_SENTINEL) ((Qe = Object.keys(projectServers)), ($[1] = Qe));
  else Qe = $[1];
  let we = Qe.length > 0,
    Ue;
  if ($[2] === MEMO_CACHE_SENTINEL) ((Ue = getHooksSources_3()), ($[2] = Ue));
  else Ue = $[2];
  let He = Ue.length > 0,
    Xe;
  if ($[3] === MEMO_CACHE_SENTINEL) ((Xe = getHooksSources()), ($[3] = Xe));
  else Xe = $[3];
  let Lo = Xe,
    A = collectAllowRuleSources(),
    B = A.sources.length > 0,
    k = collectAdditionalDirectorySources(),
    E = k.sources.length > 0,
    Ye;
  if ($[4] === MEMO_CACHE_SENTINEL) ((Ye = getHooksSources_6()), ($[4] = Ye));
  else Ye = $[4];
  let ye = Ye.length > 0,
    ze;
  if ($[5] === MEMO_CACHE_SENTINEL) ((ze = getHooksSources_7()), ($[5] = ze));
  else ze = $[5];
  let Ae = ze.length > 0,
    Je;
  if ($[6] === MEMO_CACHE_SENTINEL) ((Je = getHooksSources_8()), ($[6] = Je));
  else Je = $[6];
  let ke = Je.length > 0,
    Ze;
  if ($[7] === MEMO_CACHE_SENTINEL) ((Ze = getHooksSources_4()), ($[7] = Ze));
  else Ze = $[7];
  let De = Ze.length > 0,
    $e;
  if ($[8] === MEMO_CACHE_SENTINEL) (($e = getHooksSources_9()), ($[8] = $e));
  else $e = $[8];
  let Se = $e.length > 0,
    Le;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    let eo = getBashPermissionSources();
    let oo = getBashAndMcpPermissionSources(eo);
    Le = { marketplaceHelperSources: eo, repoHelperSources: oo, offerBackstop: hasUngatedTrustSources(oo) };
    $[9] = Le;
  } else Le = $[9];
  let {
      marketplaceHelperSources: marketplaceHelperSources,
      repoHelperSources: repoHelperSources,
      offerBackstop: offerBackstop,
    } = Le,
    je = marketplaceHelperSources.length > 0,
    _ = repoHelperSources.length > 0,
    so;
  if ($[10] === MEMO_CACHE_SENTINEL) ((so = getHooksSources_10()), ($[10] = so));
  else so = $[10];
  let Ce = so.length > 0,
    to;
  if ($[11] === MEMO_CACHE_SENTINEL) ((to = getHooksSources_5()), ($[11] = to));
  else to = $[11];
  let be = to.length > 0,
    ao;
  if ($[12] !== commands)
    ((ao = commands?.some(isLegacyProjectCommandWithBashAllow) ?? !1), ($[12] = commands), ($[13] = ao));
  else ao = $[13];
  let rr = ao,
    no;
  if ($[14] !== commands)
    ((no = commands?.some(isProjectSkillWithBashAllow) ?? !1), ($[14] = commands), ($[15] = no));
  else no = $[15];
  let sr = no,
    p = Lo.length > 0 || rr || sr,
    co;
  if ($[16] === MEMO_CACHE_SENTINEL) ((co = checkHasTrustDialogAccepted()), ($[16] = co));
  else co = $[16];
  let io = co,
    u = io,
    lo,
    po;
  if ($[17] !== p)
    ((lo = () => {
      let hasTrustDialogAccepted = isHomeDirectorySession();
      logEvent("tengu_trust_dialog_shown", {
        isHomeDir: hasTrustDialogAccepted,
        hasMcpServers: we,
        hasHooks: He,
        hasBashExecution: p,
        hasProjectAllowRules: B,
        hasProjectAddDirs: E,
        hasApiKeyHelper: ye,
        hasAwsCommands: Ae,
        hasGcpCommands: ke,
        hasOtelHeadersHelper: De,
        hasProxyAuthHelper: Se,
        hasMarketplaceHeadersHelper: je,
        hasRepoHeadersHelpers: _,
        hasDangerousEnvVars: Ce,
        hasAutoMemoryDirectory: be,
      });
    }),
      (po = [we, He, p, B, E, ye, Ae, ke, De, Se, je, _, Ce, be]),
      ($[17] = p),
      ($[18] = lo),
      ($[19] = po));
  else ((lo = $[18]), (po = $[19]));
  P(lo, po);
  let G = R(!1),
    t = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    uo;
  if ($[20] !== t || $[21] !== noteRefused || $[22] !== refusedWithin)
    ((uo = function K() {
      if (t() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[20] = t),
      ($[21] = noteRefused),
      ($[22] = refusedWithin),
      ($[23] = uo));
  else uo = $[23];
  let K = uo,
    Re = useMountTime(),
    xe = settleKey(epoch),
    ho;
  if (
    $[24] !== p ||
    $[25] !== u ||
    $[26] !== t ||
    $[27] !== noteRefused ||
    $[28] !== onDone ||
    $[29] !== refusedWithin ||
    $[30] !== storageV5
  )
    ((ho = function l(value) {
      if (G.current || isShuttingDown()) {
        return;
      }
      if (t() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (((G.current = !0), value === "exit")) {
        if (u) {
          (logFeatureBad("onboarding_trust_dialog", "gated_grants_backstop_declined"), onDone());
          return;
        }
        (logFeatureBad("onboarding_trust_dialog", "onboarding_trust_denied"), gracefulShutdownSync(1));
        return;
      }
      let mo = isHomeDirectorySession();
      if (
        (logFeatureOk("onboarding_trust_dialog"),
        logEvent("tengu_trust_dialog_accept", {
          isHomeDir: mo,
          hasMcpServers: we,
          hasHooks: He,
          hasBashExecution: p,
          hasProjectAllowRules: B,
          hasProjectAddDirs: E,
          hasApiKeyHelper: ye,
          hasAwsCommands: Ae,
          hasGcpCommands: ke,
          hasOtelHeadersHelper: De,
          hasProxyAuthHelper: Se,
          hasMarketplaceHeadersHelper: je,
          hasRepoHeadersHelpers: _,
          hasDangerousEnvVars: Ce,
          hasAutoMemoryDirectory: be,
        }),
        mo)
      )
        (setSessionTrustAccepted(!0), setHomeTrustDialogAccepted(!0));
      else saveCurrentProjectConfig(Yo, storageV5);
      onDone();
    }),
      ($[24] = p),
      ($[25] = u),
      ($[26] = t),
      ($[27] = noteRefused),
      ($[28] = onDone),
      ($[29] = refusedWithin),
      ($[30] = storageV5),
      ($[31] = ho));
  else ho = $[31];
  let l = ho,
    fo;
  if ($[32] === MEMO_CACHE_SENTINEL)
    ((fo = () => {
      ((G.current = !0), gracefulShutdownSync(1));
    }),
      ($[32] = fo));
  else fo = $[32];
  let exitState = useGlobalExitKeybindings(fo),
    go;
  if ($[33] !== u || $[34] !== t || $[35] !== noteRefused || $[36] !== l || $[37] !== refusedWithin)
    ((go = () => {
      if (CC()) {
        l("exit");
        return;
      }
      if (u) {
        l("exit");
        return;
      }
      if (t() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (G.current || isShuttingDown()) {
        return;
      }
      ((G.current = !0), gracefulShutdownSync(0));
    }),
      ($[33] = u),
      ($[34] = t),
      ($[35] = noteRefused),
      ($[36] = l),
      ($[37] = refusedWithin),
      ($[38] = go));
  else go = $[38];
  let wo;
  if ($[39] === MEMO_CACHE_SENTINEL) ((wo = { context: "Confirmation" }), ($[39] = wo));
  else wo = $[39];
  if ((useKeybinding("confirm:no", go, wo), io && !offerBackstop)) {
    return (queueMicrotask(onDone), null);
  }
  const ve = PermissionDialog_2,
    ir = "warning",
    lr = "warning",
    dr = "Accessing workspace:",
    Pe = Box,
    pr = "column",
    ur = 1,
    hr = 1;
  let F, W, N;
  if ($[40] === MEMO_CACHE_SENTINEL)
    ((F = e(Text, { bold: !0, children: escapePathForDisplay(getFsImplementation().cwd()) })),
      (W = r(Text, {
        children: [
          "Quick safety check: Is this a project you created or one you trust? (Like your own code, a well-known open source project, or work from your team). If not, take a moment to review what",
          "'",
          "s in this folder first.",
        ],
      })),
      (N = r(Text, { children: ["Claude Code", "'", "ll be able to read, edit, and execute files here."] })),
      ($[40] = F),
      ($[41] = W),
      ($[42] = N));
  else ((F = $[40]), (W = $[41]), (N = $[42]));
  const Te =
    (B || E || _) &&
    r(Box, {
      flexDirection: "column",
      children: [
        B &&
          r(Fragment, {
            children: [
              r(Text, {
                bold: !0,
                color: "warning",
                children: [
                  e(StatusIcon, { status: "warning", withSpace: !0 }),
                  "This folder pre-approves ",
                  A.rawCount,
                  " ",
                  plural(A.rawCount, "tool permission"),
                  " in",
                  " ",
                  formatListWithAnd_2(A.sources),
                  ":",
                ],
              }),
              r(Text, {
                children: [
                  "  ",
                  A.rules.length > 0
                    ? formatListWithAnd_2(A.rules, 8)
                    : "(rule names contain unprintable characters)",
                ],
              }),
            ],
          }),
        E &&
          r(Fragment, {
            children: [
              r(Text, {
                bold: !0,
                color: "warning",
                children: [
                  e(StatusIcon, { status: "warning", withSpace: !0 }),
                  "This folder adds ",
                  k.rawCount,
                  " ",
                  plural(k.rawCount, "directory", "directories"),
                  " ",
                  "to the workspace in",
                  " ",
                  formatListWithAnd_2(k.sources),
                  ":",
                ],
              }),
              r(Text, {
                children: [
                  "  ",
                  k.dirs.length > 0
                    ? formatListWithAnd_2(k.dirs, 6)
                    : "(directory names contain unprintable characters)",
                ],
              }),
            ],
          }),
        _ &&
          r(Text, {
            bold: !0,
            color: "warning",
            children: [
              e(StatusIcon, { status: "warning", withSpace: !0 }),
              "This folder runs commands to mint HTTP headers (headersHelper), declared in ",
              formatListWithAnd_2(repoHelperSources),
            ],
          }),
        e(Text, {
          dimColor: !0,
          children: "These will apply without asking. Only proceed if you trust this configuration.",
        }),
      ],
    });
  let Ho;
  if ($[43] === MEMO_CACHE_SENTINEL)
    ((Ho = e(Text, {
      dimColor: !0,
      children: e(Link, { url: "https://code.claude.com/docs/en/security", children: "Security guide" }),
    })),
      ($[43] = Ho));
  else Ho = $[43];
  let U, X;
  if ($[44] !== l)
    ((U = () => l("enable_all")), (X = () => l("exit")), ($[44] = l), ($[45] = U), ($[46] = X));
  else ((U = $[45]), (X = $[46]));
  let Y;
  if ($[47] !== xe.remountKey || $[48] !== K || $[49] !== Re || $[50] !== U || $[51] !== X)
    ((Y = e(
      ConfirmSelect,
      {
        refuseInput: K,
        openedAt: Re,
        hideIndexes: !0,
        cancelFirst: !0,
        focus: "cancel",
        confirmLabel: "Yes, I trust this folder",
        cancelLabel: u ? "No, continue without these permissions" : "No, exit",
        onConfirm: U,
        onCancel: X,
      },
      xe.remountKey,
    )),
      ($[47] = xe.remountKey),
      ($[48] = K),
      ($[49] = Re),
      ($[50] = U),
      ($[51] = X),
      ($[52] = Y));
  else Y = $[52];
  let z;
  if ($[53] !== exitState.keyName || $[54] !== exitState.pending)
    ((z = e(Text, {
      dimColor: !0,
      children: exitState.pending
        ? r(Fragment, { children: ["Press ", exitState.keyName, " again to exit"] })
        : r(Byline, {
            children: [
              e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
              e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
            ],
          }),
    })),
      ($[53] = exitState.keyName),
      ($[54] = exitState.pending),
      ($[55] = z));
  else z = $[55];
  let J;
  if ($[56] !== Pe || $[57] !== F || $[58] !== W || $[59] !== N || $[60] !== Te || $[61] !== Y || $[62] !== z)
    ((J = r(Pe, { flexDirection: pr, gap: ur, paddingTop: hr, children: [F, W, N, Te, Ho, Y, z] })),
      ($[56] = Pe),
      ($[57] = F),
      ($[58] = W),
      ($[59] = N),
      ($[60] = Te),
      ($[61] = Y),
      ($[62] = z),
      ($[63] = J));
  else J = $[63];
  let yo;
  if ($[64] !== ve || $[65] !== J)
    ((yo = e(ve, { color: ir, titleColor: lr, title: dr, children: J })),
      ($[64] = ve),
      ($[65] = J),
      ($[66] = yo));
  else yo = $[66];
  return yo;
}
