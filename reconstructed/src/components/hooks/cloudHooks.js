/**
 * components/hooks/cloudHooks.tsx
 *
 * 2.1.316 新增：/hooks 中"云会话钩子"：本机钩子是否转发给云会话、状态与可接受性说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bajxb7bf.js (38)
 * attribution: placement 38
 */
import { basename } from "path";
import { realpath } from "fs/promises";
import { j, R, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import {
  deviceHooksRegistrationState,
  Vnt,
  isHookScopeInReach,
} from "../../utils/hooks/deviceHooks/cloudRegistration.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { GZs } from "../../utils/hooks/hookEventSets.js";
import {
  $Ne,
  readDeviceHooksConsent,
  resolveStoredConsent,
  mKt,
} from "../../utils/hooks/deviceHooks/consent.js";
import {
  deviceHooksPolicyEligibility,
  collectDeviceHookSources,
} from "../../utils/hooks/deviceHooks/eligibility.js";
import { findGitRootUncached } from "../../utils/git.js";
import {
  collectBaseReachRoots,
  collectSettingsWriteRoots,
  dSe,
} from "../../utils/git/builderGit/sandboxReach.js";
import { collectStickyRoots, m_ } from "../../utils/settings/stickyRoots.js";
import { SETTING_SOURCES } from "../../utils/settings/constants.js";
import { getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { hr } from "../../utils/invisibleChars.js";
import { getFlagSettingsExpectedContent } from "../../bootstrap/state.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { mergeHookEnv, resolveOptions } from "../../utils/hooks/hookCommandResolution.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import {
  settingsEnvInReach,
  legacyConfigFileOf,
  collectDeviceHookAttestations,
  projectConfigRootOr,
  shellPrefixOf,
} from "../../utils/hooks/deviceHooks/commandReach.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { scriptFileReaderDeps } from "../../utils/hooks/servedHooks/hookSandbox.js";
import { defaultShellKind } from "../../utils/shell/shellToolUtils.js";
import { uniq } from "../../utils/collections.js";
import { logError } from "../../utils/log.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { plural, countCharInString, capitalize, Mu } from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW, merged, pM } from "../CustomSelect/select.js";
import { Dialog } from "../design-system/Dialog.js";
import { StatusIcon, STATUS_CONFIG } from "../design-system/StatusIcon.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { $V, NV } from "../design-system/ScrollColumn.js";
import { useScrollViewportSize, Tl } from "../ScrollViewportContext.js";
import { zR, PANE_PADDING } from "../design-system/Pane.js";
import { OverflowHint } from "../CtrlOToExpand.js";
import { wrapText } from "../../ink/wrap-text.js";
import { Che } from "../../ink/wrapAnsi.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { getSortedMatchersForEvent } from "../../utils/hooks/hooksConfigManager.js";
import { StatusRow } from "../Settings/Status.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { hookSourceInlineDisplayString, getHookProgressDisplay } from "../../utils/hooks/hooksSettings.js";

//@ chunk-bajxb7bf.js:16364-16368 placement
j();
//@ chunk-bajxb7bf.js:16441-17018 placement
var NOT_REGISTERED_YET_TEXT = "not registered yet; your next message tries again",
  os = "not registered right now; reopen /hooks to check again",
  No = {
    dormant: "idle until your next message",
    kept_none: "the session kept none of them",
    paused: "paused until the session answers",
    declined: "off because the answer was No",
    disabled: "the session does not allow them",
    unsupported: "this session is too old; start a new one",
    invalid: "could not register; see the earlier notice",
    stale: "registration out of date; start a new session",
    muted: "turned off by Anthropic for now",
    flag_off: "not switched on for your account",
  };
//@ chunk-bajxb7bf.js:17018-17535 placement
function describeCloudHookState(m, o, h) {
  if (m.kind === "dormant" && m.senderUnverified)
    return {
      standing:
        "not running, because the session hasn't answered and doesn't recognize this machine as a trusted device; start a session from this machine to run them",
    };
  let i = deviceHooksRegistrationState({ standing: m, lapsesUnusedAt: o }, h);
  if (i !== null)
    return { standing: i === "dormant" ? No.dormant : NOT_REGISTERED_YET_TEXT, standingIsIdle: !0 };
  switch (m.kind) {
    case "paused":
    case "kept_none":
      return { standing: No[m.kind] };
    case "stopped":
      return { standing: No[m.reason] };
    case "registered":
    case "idle":
    case "dormant":
      return {};
  }
}
/**
 * 钩子不能在云会话运行的原因（云端改文件、只支持 command/http、事件只在本机发生等）。
 */
//@ chunk-bajxb7bf.js:17535-19407 placement
var CLOUD_HOOK_INELIGIBLE_REASONS = {
    after_edit:
      "cloud edits change files in the cloud. Put the hook in the repository's .claude/settings.json",
    kind_unsupported: "only command and http hooks can run for a cloud session",
    event_runs_locally: "this event happens on this machine",
    event_later: "this event is not forwarded yet",
    event_low_value: "this event is not forwarded",
    event_container_internal: "this event only concerns the cloud container",
    source_in_sync_root: "the cloud session may change its settings file",
    sync_root_is_config_dir: "the cloud session may change its settings file",
    unverifiable_target: "its script could not be read to pin it",
    in_reach:
      "the cloud session can change the hook's script. Check the script, then move it to ~/.claude/hooks",
    interpreter_unvouched:
      "this machine cannot verify the script's interpreter. Use bash, python3 or node from your PATH",
    loads_from_reach:
      "the hook's script reads files the cloud session can change. Keep those files outside the project",
    unpinned_command:
      "this machine cannot verify what the command runs. If it is an inline command, make it one script in ~/.claude/hooks",
    duplicate: "the same hook is configured twice",
    over_cap:
      "more hooks than one registration carries, or its matcher is too long or holds an invisible character",
    pattern_matcher: "cloud sessions cannot take a pattern matcher. List the names to match",
    author_skip: 'it is marked cloud: "skip" in its settings entry',
  },
  ss = {
    dot_folder:
      "its script is in a dot-folder this machine does not read hooks from. Check the script, then move it to ~/.claude/hooks",
    shell_prefix: "it would run through your CLAUDE_CODE_SHELL_PREFIX, which this machine cannot verify",
    script_missing: "its script is missing",
  },
  Ke = {
    user: { tag: "user settings", phrase: "your user settings" },
    local: { tag: "settings.local.json", phrase: "this folder's settings.local.json" },
    flag: { tag: "--settings file", phrase: "the --settings file" },
  };
//@ chunk-bajxb7bf.js:19407-19572 placement
function hookDisplayName(m, o) {
  let h =
    o !== void 0
      ? basename(o)
      : /^https?:\/\//i.test(m.trim())
        ? xt(m.trim())
        : basename(m.trim().split(/\s+/)[0] ?? "") || "hook";
  return sanitizeDisplayText(h, { maxCodeUnits: 120 }) || "hook";
}
//@ chunk-bajxb7bf.js:19572-20580 placement
function classifyHookForCloud(m, o = new Set()) {
  let h = (t) => (o.has(t) ? { fromWritableFile: !0 } : {}),
    mapped = m.forwarded.map((t) => ({
      where: "here",
      label:
        t.local.hook.type === "http"
          ? xt(t.local.hook.url)
          : t.local.hook.type === "command"
            ? hookDisplayName(t.local.hook.command, t.local.pinnedTarget?.path)
            : "hook",
      event: t.wire.event,
      ...(t.wire.matcher !== void 0 && {
        matcher: sanitizeDisplayText(t.wire.matcher, { maxCodeUnits: 200 }),
      }),
      source: t.local.source,
      ...h(t.local.source),
      ...(GZs(t.wire.event, t.wire.matcher) && { exceptAfterEdits: !0 }),
      ...(t.wire.author_opt_in && { optedIn: !0 }),
    })),
    mapped_2 = m.templates.map((template) => ({
      where: "cloud",
      label: `${template.local.templateId}${template.local.label === "legacy" ? " (older copy)" : ""}`,
      event: template.wire.event,
      ...(template.wire.matcher !== void 0 && {
        matcher: sanitizeDisplayText(template.wire.matcher, { maxCodeUnits: 200 }),
      }),
      source: template.local.source,
      ...h(template.local.source),
    })),
    mapped_3 = m.held.map((t) => {
      let f = t.cause !== void 0 ? ss[t.cause] : CLOUD_HOOK_INELIGIBLE_REASONS[t.reason];
      return {
        where: "local",
        label: hookDisplayName(t.command),
        event: t.event,
        ...(t.matcher !== void 0 && { matcher: t.matcher }),
        source: t.source,
        reason: t.reason,
        why: t.noRemedy ? f.replace(/\. .*$/, "") : f,
      };
    });
  return [...mapped, ...mapped_2, ...mapped_3];
}
//@ chunk-bajxb7bf.js:20580-20660 placement
function xt(m) {
  try {
    return new URL(m).host || "http hook";
  } catch {
    return "http hook";
  }
}
//@ chunk-bajxb7bf.js:20660-20711 placement
var is = { kind: "none", reason: "disabled_by_settings" };
//@ chunk-bajxb7bf.js:20711-20978 placement
function reconcileCapturedHooks(m, o, h) {
  if (
    m.kind === "none" &&
    m.reason === "disabled_by_settings" &&
    o !== null &&
    o.kind === "captured" &&
    h &&
    Vnt(o)
  )
    return { captured: o, kept: "launch_hooks" };
  if (o?.kind === "none" && o.reason === "disabled_by_settings" && Vnt(m))
    return { captured: is, kept: "off" };
  return { captured: m };
}
/**
 * 计算每个钩子在云会话中的状态（dormant、idle、registered 等）。
 */
//@ chunk-bajxb7bf.js:20978-25112 placement
async function buildCloudHookRows({
  launchDir: launchDir,
  storageV5: storageV5,
  forwarding: forwarding,
  consentPin: consentPin,
  senderMemory: senderMemory,
  processMemory: processMemory,
}) {
  let t = $Ne();
  if (forwarding !== "cloud") return { consent: forwarding, consentLocation: t, rows: [] };
  let f = readDeviceHooksConsent(storageV5),
    k = (M = []) => {
      let now = Date.now(),
        v = describeCloudHookState(senderMemory.standing, senderMemory.lapsesUnusedAt, now);
      if (v.standing !== void 0)
        return v.standingIsIdle && deviceHooksRegistrationState(senderMemory, now) === "dormant"
          ? v
          : { ...v, notInForce: !0 };
      return senderMemory.standing.kind === "idle" && M.some((P) => P.where === "here")
        ? { standing: os, standingIsIdle: !0, notInForce: !0 }
        : {};
    },
    C = consentPin,
    D = async (M) => (C.current?.origin === "given" ? C.current.value.catch(() => "unset") : M);
  try {
    let { stored: stored, origin: origin } = await resolveStoredConsent(C, f),
      v = stored,
      P = deviceHooksPolicyEligibility(collectDeviceHookSources()),
      _ = findGitRootUncached(launchDir),
      b = _ ?? launchDir,
      E = [launchDir, await realpath(launchDir).catch(() => launchDir), b, await realpath(b).catch(() => b)],
      B = senderMemory.commonRoots ?? collectBaseReachRoots(launchDir),
      N = new Map(senderMemory.pinnedRoots),
      L = await collectStickyRoots({
        stickyRoots: new Set(senderMemory.stickyRoots),
        pinnedScopes: new Set(senderMemory.pinnedScopes),
        pinnedRoots: N,
        baseRoots: E,
        reachBaseline:
          senderMemory.reachBaseline ??
          new Map(SETTING_SOURCES.map((p) => [p, collectSettingsWriteRoots(p, launchDir)])),
        scopeSettingsFile: (p) => getSettingsFilePathForSource(p) ?? null,
        realpath: realpath,
        commonRoots: () => B,
        scopeRoots: (p, J) => dSe(launchDir, p, J),
      }),
      x;
    if (origin === "read" && v !== "unset") {
      let p = t,
        J = await mKt(t, L, async (ge) => ((p = await realpath(ge)), p));
      if (J !== !1) v = "unset";
      let U = hr(t);
      if (J === "unresolvable") x = `${U} couldn't be read.`;
      else if (J === "writable") {
        let ge = [t, p],
          I = m_(ge, [...E, ...B])
            ? void 0
            : SETTING_SOURCES.find((He) => m_(ge, N.get(He) ?? dSe(launchDir, He, null))),
          pe = I && getSettingsFilePathForSource(I),
          Se =
            I === "policySettings"
              ? ", which your managed settings allow"
              : I === "flagSettings" && getFlagSettingsExpectedContent() !== void 0
                ? ", which the --settings value allows"
                : pe !== void 0
                  ? `, which ${hr(pe)} allows`
                  : "";
        x = `This cloud session can write ${U}${Se}.`;
      }
    }
    let { captured: captured, kept: kept } = reconcileCapturedHooks(
      P,
      senderMemory.baseline,
      P.kind === "none" && P.reason === "disabled_by_settings"
        ? await isHookScopeInReach(L, P.switchSources ?? ["user", "flag"], {
            realpath: realpath,
            scopeSettingsFile: (p) => getSettingsFilePathForSource(p) ?? null,
            everInReach: senderMemory.everInReach,
          })
        : !1,
    );
    if (captured.kind === "none")
      return {
        consent: await D(v),
        consentLocation: t,
        ...(x !== void 0 && { storedAnswerNotUsed: x }),
        ...k(),
        rows: [],
        unavailableReason: kept === "off" ? HOOKS_OFF_AT_START_TEXT : ls[captured.reason],
      };
    let X = subprocessEnv(),
      ne = mergeHookEnv({
        attached: X,
        beforeSettings: getLatchedPreSettingsEnvSnapshot(),
        ownEnv: settingsEnvInReach(senderMemory, legacyConfigFileOf(processMemory)),
        childrenSee: (p) => Object.hasOwn(X, p),
      }),
      ce = await collectDeviceHookAttestations(
        captured,
        {
          instanceId: "dev-0000000000000000",
          launchDir: launchDir,
          projectDir: projectConfigRootOr(launchDir),
          configHome: getClaudeConfigDir(),
          extraReachRoots: L,
          ...(b !== launchDir && { repoRoot: b }),
          inRepository: _ !== null,
          ...(senderMemory.lastSyncRoot !== null && {
            sync: { rootReal: senderMemory.lastSyncRoot.real, root: senderMemory.lastSyncRoot.root },
          }),
          allowLegacyTemplateDigests: !0,
          refusedTemplateIds: [...senderMemory.refusedTemplates],
          optInPins: new Map(senderMemory.optInPins),
          reachMemory: senderMemory,
          localSettingsLocation: { ...senderMemory.localSettingsLocation },
        },
        {
          realpath: realpath,
          open: scriptFileReaderDeps().openNoFollow,
          home: resolveOptions(ne),
          defaultShell: defaultShellKind(),
          shellPrefix: shellPrefixOf(ne),
        },
      ),
      ue = new Set([
        ...senderMemory.everInReach,
        ...[captured, senderMemory.baseline].flatMap((p) =>
          p?.kind === "captured" ? p.sources.map((source) => source.source) : [],
        ),
      ]),
      de = [
        ["user", getSettingsFilePathForSource("userSettings")],
        ["local", getSettingsFilePathForSource("localSettings")],
        [
          "flag",
          getFlagSettingsExpectedContent() === void 0 ? getSettingsFilePathForSource("flagSettings") : void 0,
        ],
      ],
      se = new Set(
        ce.held
          .filter((p) => p.reason === "source_in_sync_root" || p.reason === "sync_root_is_config_dir")
          .map((p) => p.source),
      ),
      ke = new Set(captured.withheld.map((p) => p.source)),
      le = new Set(),
      me = new Set();
    for (let [p, J] of de) {
      if (J === void 0 || !ue.has(p) || se.has(p) || (ke.has(p) && !senderMemory.everInReach.has(p)))
        continue;
      let U = p === "local" ? le : me;
      if (senderMemory.everInReach.has(p)) {
        U.add(p);
        continue;
      }
      let ge = uniq([J, await realpath(J).catch(() => J), ...(senderMemory.knownSpellings.get(p) ?? [])]);
      if (m_(ge, L)) U.add(p);
    }
    let ie = classifyHookForCloud(ce, le),
      Le = [
        ...captured.withheld
          .filter((p) => !le.has(p.source) && !me.has(p.source))
          .map(
            (p) => `Hooks from ${Ke[p.source].phrase} are not offered to the cloud session: ${ms[p.reason]}.`,
          ),
        ...[...me].map(
          (p) =>
            `Hooks from ${Ke[p].phrase} are not offered to the cloud session: the cloud session may change that file.`,
        ),
      ];
    return {
      consent: await D(v),
      consentLocation: t,
      ...(x !== void 0 && { storedAnswerNotUsed: x }),
      ...k(ie),
      rows: ie,
      ...(kept === "launch_hooks" && {
        keptFromLaunch:
          "All hooks were switched off in your settings during this cloud session; for it, this machine keeps offering the hooks it had when you launched (listed here) until you restart claude --cloud.",
      }),
      ...(le.size > 0 && {
        writableSources: [...le].map(
          (p) =>
            `This cloud session can write ${Ke[p].phrase}, so only the hooks that file held when you attached are offered.`,
        ),
      }),
      ...(Le.length > 0 && { withheld: Le }),
    };
  } catch (error) {
    return (
      logError(error),
      {
        consent: await D("unset"),
        consentLocation: t,
        ...k(),
        rows: [],
        unavailableReason: "they could not be read",
      }
    );
  }
}
//@ chunk-bajxb7bf.js:25112-26126 placement
var HOOKS_OFF_AT_START_TEXT =
    "all hooks were switched off in your settings when this cloud session started, and for it this machine keeps them off although that switch has since been removed \u2014 restart claude --cloud to offer them",
  ls = {
    policy_unreadable: "the managed policy on this machine could not be read",
    policy_disable_all: "a managed policy switches all hooks off",
    managed_only: "only managed hooks may run here (a managed-only policy, or safe mode)",
    plugin_only: "a managed policy allows plugin hooks only",
    disabled_by_settings: "all hooks are switched off in your settings",
    bare: "this session runs without user configuration",
    untrusted_workspace: "this folder's trust prompt was not accepted",
  },
  ms = {
    untrusted: "this folder's trust prompt was not accepted",
    repo_provenance:
      "that file is part of the repository (or its provenance could not be read), which the cloud session has its own copy of",
    runtime_patch: "hooks set for this run only are not forwarded",
    served_folder: "the cloud session this computer serves can write that file",
  };
//@ chunk-bajxb7bf.js:26126-26130 placement
j();
//@ chunk-bajxb7bf.js:26130-26141 placement
var Mt = 250;
//@ chunk-bajxb7bf.js:26141-28737 placement
function describeWhereHookRuns(m) {
  let k = w(34),
    {
      forwarded: forwarded,
      templateNames: templateNames,
      consentLocation: consentLocation,
      current: d,
      onDone: onDone,
    } = m,
    t = R(!1),
    f = useTimeout(Mt),
    C;
  if (k[0] !== f || k[1] !== onDone)
    ((C = function M(D) {
      if (t.current || !f) {
        return;
      }
      ((t.current = !0), onDone(D));
    }),
      (k[0] = f),
      (k[1] = onDone),
      (k[2] = C));
  else C = k[2];
  let M = C,
    g;
  if (k[3] !== forwarded)
    ((g = forwarded > 0 ? [`${forwarded} ${plural(forwarded, "hook")} would run here`] : []),
      (k[3] = forwarded),
      (k[4] = g));
  else g = k[4];
  let v;
  if (k[5] !== templateNames)
    ((v = templateNames.length > 0 ? [`${templateNames.join(", ")} would run in the cloud session`] : []),
      (k[5] = templateNames),
      (k[6] = v));
  else v = k[6];
  let P;
  if (k[7] !== g || k[8] !== v) ((P = [...g, ...v]), (k[7] = g), (k[8] = v), (k[9] = P));
  else P = k[9];
  let joined = P.join("; "),
    b;
  if (k[10] !== M) ((b = () => M("not_now")), (k[10] = M), (k[11] = b));
  else b = k[11];
  let E;
  if (k[12] === MEMO_CACHE_SENTINEL)
    ((E = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "skip for now",
        }),
      ],
    })),
      (k[12] = E));
  else E = k[12];
  let B, N;
  if (k[13] === MEMO_CACHE_SENTINEL)
    ((B = e(Text, {
      children:
        "Hooks in your user and local settings, or a --settings file, don't run in cloud sessions. If you say yes, cloud sessions started from this machine ask Claude Code here to run them. What a hook returns becomes part of the session's transcript.",
    })),
      (N = e(Text, {
        children:
          "Hooks run here only while Claude Code stays connected and answers in time. Otherwise the session continues without them: a hook that blocks a command here won't block it there, and your allow rules still apply.",
      })),
      (k[13] = B),
      (k[14] = N));
  else ((B = k[13]), (N = k[14]));
  let L;
  if (k[15] !== joined)
    ((L = joined !== "" && r(Text, { dimColor: !0, children: ["Right now: ", joined, "."] })),
      (k[15] = joined),
      (k[16] = L));
  else L = k[16];
  const x =
    d === "accepted"
      ? "Not now keeps your answer: yes."
      : d === "declined"
        ? "Not now keeps your answer: no."
        : "Not now: no hooks run until you say yes.";
  let Y;
  if (k[17] !== consentLocation || k[18] !== x)
    ((Y = r(Text, {
      dimColor: !0,
      children: [
        "Yes or No is saved for this machine in ",
        consentLocation,
        ". Change it in /hooks.",
        " ",
        x,
      ],
    })),
      (k[17] = consentLocation),
      (k[18] = x),
      (k[19] = Y));
  else Y = k[19];
  let W;
  if (k[20] !== Y || k[21] !== L)
    ((W = r(Box, { flexDirection: "column", gap: 1, children: [B, N, L, Y] })),
      (k[20] = Y),
      (k[21] = L),
      (k[22] = W));
  else W = k[22];
  let X;
  if (k[23] === MEMO_CACHE_SENTINEL)
    ((X = [
      { label: "Yes, run hooks for cloud sessions", value: "accepted" },
      { label: "No, don't run hooks for cloud sessions", value: "declined" },
      { label: "Not now", value: "not_now" },
    ]),
      (k[23] = X));
  else X = k[23];
  const ne = !f;
  let ce;
  if (k[24] !== M) ((ce = () => M("not_now")), (k[24] = M), (k[25] = ce));
  else ce = k[25];
  let ue;
  if (k[26] !== M || k[27] !== ne || k[28] !== ce)
    ((ue = e(ModelSelector, {
      selectedValue: NO_COMMITTED_ROW,
      options: X,
      defaultFocusValue: "not_now",
      hideIndexes: !0,
      isDisabled: ne,
      onChange: M,
      onCancel: ce,
    })),
      (k[26] = M),
      (k[27] = ne),
      (k[28] = ce),
      (k[29] = ue));
  else ue = k[29];
  let de;
  if (k[30] !== W || k[31] !== ue || k[32] !== b)
    ((de = r(Dialog, {
      title: "Run this machine's hooks for cloud sessions?",
      onCancel: b,
      inputGuide: E,
      children: [W, ue],
    })),
      (k[30] = W),
      (k[31] = ue),
      (k[32] = b),
      (k[33] = de));
  else de = k[33];
  return de;
}
//@ chunk-bajxb7bf.js:28737-28741 placement
j();
//@ chunk-bajxb7bf.js:28741-28893 placement
var PLUGIN_HOOKS_NOTE =
  "Plugin hooks are not listed above. A plugin's hooks run in this cloud session only if the session loaded that plugin (see the top of /plugin).";
//@ chunk-bajxb7bf.js:28893-28993 placement
function PluginHooksNote() {
  let m = w(1),
    o;
  if (m[0] === MEMO_CACHE_SENTINEL)
    ((o = e(Text, { dimColor: !0, children: PLUGIN_HOOKS_NOTE })), (m[0] = o));
  else o = m[0];
  return o;
}
//@ chunk-bajxb7bf.js:28993-29037 placement
function $s(xe) {
  return { text: xe, dimColor: !0 };
}
//@ chunk-bajxb7bf.js:29037-29068 placement
function As(Mo) {
  return Mo.text;
}
//@ chunk-bajxb7bf.js:29068-29190 placement
function renderStatusLine(m, Ce) {
  let { status: status, pieces: pieces } = m;
  return r(
    Text,
    { children: [e(StatusIcon, { status: status, withSpace: !0 }), e(TextPieces, { pieces: pieces })] },
    Ce,
  );
}
//@ chunk-bajxb7bf.js:29190-29279 placement
function Ws(je, co) {
  return e(Text, { dimColor: je.dimColor, color: je.color, children: je.text }, co);
}
//@ chunk-bajxb7bf.js:29279-29444 placement
var CLOUD_HOOKS_INTRO =
    "Each row says where one of this machine's hooks runs for this cloud session. Hooks committed to the repository run in the cloud.",
  Ft = 40,
  Bt = 7,
  qo = 10,
  fs = 8,
  ks = 3;
//@ chunk-bajxb7bf.js:29444-30098 placement
function renderCloudSessionBadge(m) {
  let d = w(11),
    { summaryPromise: summaryPromise, savedLine: savedLine, hasPluginHooks: hasPluginHooks } = m,
    u;
  if (d[0] === MEMO_CACHE_SENTINEL)
    ((u = r(Text, { color: "suggestion", children: [re.info, " Cloud session"] })), (d[0] = u));
  else u = d[0];
  let t;
  if (d[1] !== savedLine)
    ((t = savedLine !== void 0 && e(Text, { color: "success", children: savedLine })),
      (d[1] = savedLine),
      (d[2] = t));
  else t = d[2];
  let f;
  if (d[3] === MEMO_CACHE_SENTINEL)
    ((f = e(Text, { dimColor: !0, children: "Checking this machine's hooks\u2026" })), (d[3] = f));
  else f = d[3];
  let k;
  if (d[4] !== hasPluginHooks || d[5] !== savedLine || d[6] !== summaryPromise)
    ((k = e(fo, {
      fallback: f,
      children: e(renderRemoteHostNotice, {
        summaryPromise: summaryPromise,
        savedLine: savedLine,
        hasPluginHooks: hasPluginHooks,
      }),
    })),
      (d[4] = hasPluginHooks),
      (d[5] = savedLine),
      (d[6] = summaryPromise),
      (d[7] = k));
  else k = d[7];
  let C;
  if (d[8] !== t || d[9] !== k)
    ((C = r(Box, { flexDirection: "column", children: [u, t, k] })), (d[8] = t), (d[9] = k), (d[10] = C));
  else C = d[10];
  return C;
}
//@ chunk-bajxb7bf.js:30098-30796 placement
function renderRemoteHostNotice(m) {
  let t = w(7),
    { summaryPromise: summaryPromise, savedLine: savedLine, hasPluginHooks: hasPluginHooks } = m,
    d = Qr(summaryPromise),
    consent = d.consent;
  if (consent === "off") {
    let f;
    if (t[0] === MEMO_CACHE_SENTINEL)
      ((f = e(Text, {
        dimColor: !0,
        children:
          "Hooks from this machine's settings are not forwarded to this cloud session (hooks committed to the repository still run from the cloud's own copy).",
      })),
        (t[0] = f));
    else f = t[0];
    return f;
  }
  if (consent === "remote_host") {
    let f;
    if (t[1] === MEMO_CACHE_SENTINEL)
      ((f = e(Text, {
        dimColor: !0,
        children:
          "The hooks below are this machine's; this remote session runs the hooks configured on its own host.",
      })),
        (t[1] = f));
    else f = t[1];
    return f;
  }
  let f;
  if (t[2] !== consent || t[3] !== hasPluginHooks || t[4] !== savedLine || t[5] !== d)
    ((f = e(renderCloudHookOffers, {
      summary: d,
      consent: consent,
      savedLine: savedLine,
      hasPluginHooks: hasPluginHooks,
    })),
      (t[2] = consent),
      (t[3] = hasPluginHooks),
      (t[4] = savedLine),
      (t[5] = d),
      (t[6] = f));
  else f = t[6];
  return f;
}
//@ chunk-bajxb7bf.js:30796-33547 placement
function renderCloudHookOffers(m) {
  let k = w(52),
    { summary: summary, consent: consent, savedLine: savedLine, hasPluginHooks: hasPluginHooks } = m,
    u = useTerminalSize(),
    t = $V()?.reserve ?? NV;
  const f = u.rows - t - Bt;
  let C;
  if (k[0] !== f || k[1] !== u.columns)
    ((C = { rows: f, columns: u.columns }), (k[0] = f), (k[1] = u.columns), (k[2] = C));
  else C = k[2];
  let { rows: rows, columns: columns } = useScrollViewportSize(C),
    g = columns - 2 * (Tl() ? zR : PANE_PADDING),
    v;
  if (k[3] !== summary.withheld) ((v = summary.withheld ?? []), (k[3] = summary.withheld), (k[4] = v));
  else v = k[4];
  let P, _, b, E, B, N;
  if (
    k[5] !== consent ||
    k[6] !== hasPluginHooks ||
    k[7] !== rows ||
    k[8] !== savedLine ||
    k[9] !== summary ||
    k[10] !== v ||
    k[11] !== g
  ) {
    let L;
    if (k[18] !== summary.writableSources)
      ((L = summary.writableSources ?? []), (k[18] = summary.writableSources), (k[19] = L));
    else L = k[19];
    let mapped = v.concat(L).map($s);
    if (summary.keptFromLaunch !== void 0) mapped.push({ text: summary.keptFromLaunch, color: "warning" });
    let Y = renderHookOriginSummary(summary, consent);
    const W = [
      ...(savedLine === void 0 ? [] : [savedLine]),
      ...mapped.map(As),
      ...(hasPluginHooks ? [PLUGIN_HOOKS_NOTE] : []),
      go(Y),
    ];
    let X;
    if (k[20] !== g) ((X = (ne, ce) => ne - Ie(ce, g)), (k[20] = g), (k[21] = X));
    else X = k[21];
    let reduced = W.reduce(X, rows - 1);
    let de = Ie(CLOUD_HOOKS_INTRO, g) + 1;
    let se =
      summary.unavailableReason !== void 0
        ? `None of this machine's hooks are offered (${summary.unavailableReason}).`
        : summary.rows.length === 0
          ? "This machine has no hooks a cloud session could use."
          : void 0;
    let ke = se === void 0 ? summary.rows.length : 0;
    let me =
      se === void 0 ? summary.rows.slice(0, Ft).map((le) => classifyHookLocation(le, consent, summary)) : [];
    let ie;
    if (k[22] !== g)
      ((ie = (V) => {
        let { status: status, pieces: pieces } = V;
        return Ie(`${STATUS_CONFIG[status].icon} ${go(pieces)}`, g);
      }),
        (k[22] = g),
        (k[23] = ie));
    else ie = k[23];
    let mapped_2 = me.map(ie);
    let U = fittingRowCount(mapped_2, ke, reduced - de);
    let ge = se === void 0 ? U > 0 : reduced - de - Ie(se, g) >= qo;
    P = mapped;
    _ = Y;
    b = se;
    E = ke;
    B = ge;
    N = me.slice(0, ge ? U : fittingRowCount(mapped_2, ke, reduced));
    ((k[5] = consent),
      (k[6] = hasPluginHooks),
      (k[7] = rows),
      (k[8] = savedLine),
      (k[9] = summary),
      (k[10] = v),
      (k[11] = g),
      (k[12] = P),
      (k[13] = _),
      (k[14] = b),
      (k[15] = E),
      (k[16] = B),
      (k[17] = N));
  } else ((P = k[12]), (_ = k[13]), (b = k[14]), (E = k[15]), (B = k[16]), (N = k[17]));
  let L;
  if (k[24] !== P || k[25] !== _ || k[26] !== b || k[27] !== E || k[28] !== B || k[29] !== N)
    ((L = { notes: P, inForce: _, standIn: b, total: E, isIntroShown: B, rows: N }),
      (k[24] = P),
      (k[25] = _),
      (k[26] = b),
      (k[27] = E),
      (k[28] = B),
      (k[29] = N),
      (k[30] = L));
  else L = k[30];
  let I = L,
    W;
  if (k[31] !== I.isIntroShown)
    ((W = I.isIntroShown && e(Text, { dimColor: !0, children: CLOUD_HOOKS_INTRO })),
      (k[31] = I.isIntroShown),
      (k[32] = W));
  else W = k[32];
  const X = I.isIntroShown ? 1 : 0;
  let ie;
  if (k[33] !== I.rows || k[34] !== I.standIn || k[35] !== I.total)
    ((ie =
      I.standIn !== void 0
        ? e(Text, { dimColor: !0, children: I.standIn })
        : r(Fragment, {
            children: [
              I.rows.map(renderStatusLine),
              e(OverflowHint, { count: I.total - I.rows.length, unit: "hook" }),
            ],
          })),
      (k[33] = I.rows),
      (k[34] = I.standIn),
      (k[35] = I.total),
      (k[36] = ie));
  else ie = k[36];
  let V;
  if (k[37] !== I.notes) ((V = I.notes.map(Ws)), (k[37] = I.notes), (k[38] = V));
  else V = k[38];
  let pe;
  if (k[39] !== hasPluginHooks)
    ((pe = hasPluginHooks && e(PluginHooksNote, {})), (k[39] = hasPluginHooks), (k[40] = pe));
  else pe = k[40];
  let Se;
  if (k[41] !== I.inForce)
    ((Se = e(Text, { children: e(TextPieces, { pieces: I.inForce }) })), (k[41] = I.inForce), (k[42] = Se));
  else Se = k[42];
  let He;
  if (k[43] !== X || k[44] !== ie || k[45] !== V || k[46] !== pe || k[47] !== Se)
    ((He = r(Box, { flexDirection: "column", marginTop: X, children: [ie, V, pe, Se] })),
      (k[43] = X),
      (k[44] = ie),
      (k[45] = V),
      (k[46] = pe),
      (k[47] = Se),
      (k[48] = He));
  else He = k[48];
  let he;
  if (k[49] !== W || k[50] !== He)
    ((he = r(Box, { flexDirection: "column", children: [W, He] })), (k[49] = W), (k[50] = He), (k[51] = he));
  else he = k[51];
  return he;
}
//@ chunk-bajxb7bf.js:33547-33663 placement
function TextPieces({ pieces: pieces }) {
  return pieces.map((o, h) =>
    e(Text, { bold: o.bold, dimColor: o.dimColor, color: o.color, children: o.text }, h),
  );
}
//@ chunk-bajxb7bf.js:33663-33772 placement
function fittingRowCount(m, o, h) {
  let i = 0,
    d = 0;
  for (let u of m) {
    i += u;
    let t = d < ks ? fs : qo;
    if (i + (d + 1 < o ? 1 : 0) > h - t) break;
    d++;
  }
  return d;
}
//@ chunk-bajxb7bf.js:33772-33822 placement
function go(m) {
  return m.map((o) => o.text).join("");
}
//@ chunk-bajxb7bf.js:33822-33888 placement
function Ie(m, o) {
  return (
    1 +
    countCharInString(
      wrapText(Che(m), Math.max(1, o), "wrap"),
      `
`,
    )
  );
}
//@ chunk-bajxb7bf.js:33888-34513 placement
function renderHookOriginSummary(m, o) {
  let h = { text: "Hooks from this machine: " };
  switch (o) {
    case "accepted":
      return [
        h,
        { text: "on", bold: !0 },
        { text: " \xB7 change it below", dimColor: !0 },
        ...(m.standing === void 0 ? [] : [qt(` \xB7 for this session: ${m.standing}`, m.standingIsIdle)]),
      ];
    case "declined":
      return [h, { text: "off", bold: !0 }, { text: " \xB7 change it below", dimColor: !0 }];
    case "unset":
      return m.storedAnswerNotUsed !== void 0
        ? [
            h,
            { text: "saved answer not used", bold: !0 },
            { text: `. ${m.storedAnswerNotUsed} Answer again below for this terminal.`, dimColor: !0 },
          ]
        : [
            h,
            { text: "not decided", bold: !0 },
            { text: " \xB7 none run for cloud sessions until you decide below", dimColor: !0 },
          ];
  }
}
//@ chunk-bajxb7bf.js:34513-35101 placement
function describeCloudAcceptance(m, o) {
  switch (m.where) {
    case "cloud":
      return o === "accepted"
        ? "runs in the cloud"
        : o === "declined"
          ? "would run in the cloud (hooks from this machine are off)"
          : "will run in the cloud once you allow it";
    case "local":
      return m.reason === "event_runs_locally"
        ? "is not sent to the cloud"
        : m.reason === "duplicate"
          ? "duplicates a row above"
          : "does not run for cloud work";
    case "here":
      return o === "declined"
        ? "does not run (hooks from this machine are off)"
        : `${o === "accepted" ? "runs here when the session asks" : "will run here once you allow it"}${m.exceptAfterEdits ? ", except after cloud file edits" : ""}`;
  }
}
//@ chunk-bajxb7bf.js:35101-35863 placement
function classifyHookLocation(m, o, { notInForce: notInForce, standingIsIdle: standingIsIdle }) {
  let d = m.where === "here" && o === "accepted" && notInForce === !0,
    u = m.matcher !== void 0 && m.matcher !== "" ? `${m.event}:${m.matcher}` : m.event;
  return {
    status: m.where === "local" || o !== "accepted" || d ? "pending" : "success",
    pieces: [
      { text: m.label, bold: !0 },
      { text: " " },
      { text: `\xB7 ${u} \xB7 ${Ke[m.source].tag} \xB7`, dimColor: !0 },
      { text: ` ${describeCloudAcceptance(m, o)}` },
      ...(o !== "declined" && m.where === "here" && m.optedIn
        ? [{ text: ', only because its entry is marked cloud: "device"', dimColor: !0 }]
        : []),
      ...(m.where === "local" ? [{ text: `: ${m.why}`, dimColor: !0 }] : []),
      ...(m.where !== "local" && m.fromWritableFile
        ? [
            {
              text: " (its settings file can be written by the cloud session; what was registered when you attached is what runs)",
              dimColor: !0,
            },
          ]
        : []),
      ...(d ? [qt(" \xB7 not running now", standingIsIdle)] : []),
    ],
  };
}
//@ chunk-bajxb7bf.js:35863-35935 placement
function qt(m, o) {
  return o ? { text: m, dimColor: !0 } : { text: m, color: "warning" };
}
//@ chunk-bajxb7bf.js:35935-36254 placement
function useEnterEscape(m) {
  let d = w(8),
    { enter: enter, escape: h } = m,
    i = useIsScreenReaderEnabled(),
    u;
  if (d[0] !== enter || d[1] !== i)
    ((u = !i && e(KeyboardShortcutHint, { chord: "enter", action: enter })),
      (d[0] = enter),
      (d[1] = i),
      (d[2] = u));
  else u = d[2];
  let t;
  if (d[3] !== h) ((t = e(KeyboardShortcutHint, { chord: "escape", action: h })), (d[3] = h), (d[4] = t));
  else t = d[4];
  let f;
  if (d[5] !== u || d[6] !== t) ((f = r(Byline, { children: [u, t] })), (d[5] = u), (d[6] = t), (d[7] = f));
  else f = d[7];
  return f;
}
//@ chunk-bajxb7bf.js:36254-36286 placement
function dr(co) {
  return co.hooks;
}
//@ chunk-bajxb7bf.js:36286-36326 placement
function lr(vt) {
  return vt.toLowerCase();
}
/**
 * /hooks 首页：列出事件及其钩子数量、托管钩子提示与云会话钩子状态。
 */
//@ chunk-bajxb7bf.js:36326-40626 placement
function HooksOverview(m) {
  let g = w(70),
    {
      hookEventMetadata: hookEventMetadata,
      hooksByEventAndMatcher: hooksByEventAndMatcher,
      restrictedByPolicy: restrictedByPolicy,
      suspendedBySafeMode: suspendedBySafeMode,
      cloudSessionPanel: cloudSessionPanel,
      onDecideCloudHooks: onDecideCloudHooks,
      defaultFocusIndex: defaultFocusIndex,
      onFocusRow: onFocusRow,
      onSelectHook: onSelectHook,
      onOpenEvents: onOpenEvents,
      onCancel: onCancel,
    } = m,
    v,
    P,
    _,
    b,
    E,
    B,
    N,
    L,
    x,
    Y,
    W,
    X,
    ne,
    ce,
    ue,
    de,
    se,
    ke,
    le;
  if (
    g[0] !== cloudSessionPanel ||
    g[1] !== defaultFocusIndex ||
    g[2] !== hookEventMetadata ||
    g[3] !== hooksByEventAndMatcher ||
    g[4] !== onCancel ||
    g[5] !== onDecideCloudHooks ||
    g[6] !== onFocusRow ||
    g[7] !== onOpenEvents ||
    g[8] !== onSelectHook ||
    g[9] !== restrictedByPolicy ||
    g[10] !== suspendedBySafeMode
  ) {
    const entries = Object.entries(hookEventMetadata);
    let ie;
    if (g[30] !== hooksByEventAndMatcher)
      ((ie = (V) => {
        let [Le, p] = V;
        let J = Le;
        let U = hooksByEventAndMatcher[J] ?? {};
        let flattened = getSortedMatchersForEvent(hooksByEventAndMatcher, J).flatMap((ge) => U[ge] ?? []);
        return flattened.length > 0 ? [{ event: J, metadata: p, hooks: flattened }] : [];
      }),
        (g[30] = hooksByEventAndMatcher),
        (g[31] = ie));
    else ie = g[31];
    let flattened = entries.flatMap(ie);
    b = flattened.flatMap(dr);
    let Se = onDecideCloudHooks ? 1 : 0;
    _ = Dialog;
    L = "Hooks";
    x =
      b.length === 0
        ? restrictedByPolicy
          ? "managed hooks only"
          : "no hooks yet"
        : `${b.length} ${plural(b.length, "hook")} on ${flattened.length} ${plural(flattened.length, "event")}`;
    Y = onCancel;
    if (g[32] === MEMO_CACHE_SENTINEL)
      ((W = e(useEnterEscape, { enter: "view", escape: "close" })), (g[32] = W));
    else W = g[32];
    P = Box;
    de = "column";
    se = 1;
    ke = cloudSessionPanel;
    if (g[33] !== suspendedBySafeMode)
      ((le =
        suspendedBySafeMode &&
        r(Box, {
          flexDirection: "column",
          children: [
            e(StatusRow, {
              status: "warning",
              children: "Safe mode: hooks from settings files won't run this session.",
            }),
            r(Text, {
              dimColor: !0,
              children: [
                "Session hooks created by /goal, agents and skills still run",
                suspendedBySafeMode.managedHooksStillApply ? ", and managed policy hooks still apply" : "",
                ". Settings edits save but don't load until safe mode is off.",
                " ",
                capitalize(suspendedBySafeMode.exitHint),
                " to leave safe mode.",
              ],
            }),
          ],
        })),
        (g[33] = suspendedBySafeMode),
        (g[34] = le));
    else le = g[34];
    if (g[35] !== restrictedByPolicy)
      ((B =
        restrictedByPolicy &&
        r(Box, {
          flexDirection: "column",
          children: [
            e(StatusRow, { status: "info", children: "Only hooks from managed settings run here." }),
            e(Text, {
              dimColor: !0,
              children:
                "Hooks in your own settings files (user, project and local) are blocked and aren't listed. Managed hooks aren't shown here either.",
            }),
          ],
        })),
        (g[35] = restrictedByPolicy),
        (g[36] = B));
    else B = g[36];
    if (g[37] === MEMO_CACHE_SENTINEL)
      ((N = r(Text, {
        dimColor: !0,
        children: [
          "This menu is read-only. To add or change a hook, edit settings.json or ask Claude.",
          " ",
          e(Link, { url: "https://code.claude.com/docs/en/hooks", children: "Learn more" }),
        ],
      })),
        (g[37] = N));
    else N = g[37];
    v = OrderedListWithItem;
    E = defaultFocusIndex;
    X = onFocusRow;
    ne = (He) => {
      if (He < Se) {
        onDecideCloudHooks?.();
        return;
      }
      let he = b[He - Se];
      if (he) {
        onSelectHook(he);
        return;
      }
      onOpenEvents();
    };
    if (g[38] !== onDecideCloudHooks)
      ((ce =
        onDecideCloudHooks &&
        e(
          merged.Item,
          {
            lines: 2,
            children: r(Box, {
              flexDirection: "column",
              children: [
                e(Text, {
                  color: "suggestion",
                  wrap: "truncate-end",
                  children: "Decide whether cloud sessions run this machine's hooks\u2026",
                }),
                e(Text, {
                  dimColor: !0,
                  wrap: "truncate-end",
                  children: "Saved for this machine; change the answer here any time",
                }),
              ],
            }),
          },
          "decide-cloud-hooks",
        )),
        (g[38] = onDecideCloudHooks),
        (g[39] = ce));
    else ce = g[39];
    let V;
    if (g[40] !== onDecideCloudHooks)
      ((V = (xe, Mo) => [
        ...(Mo > 0 || onDecideCloudHooks ? [e(merged.Heading, {}, `${xe.event}-gap`)] : []),
        e(
          merged.Heading,
          {
            children: r(Text, {
              wrap: "truncate-end",
              children: [
                e(Text, { bold: !0, children: xe.event }),
                r(Text, {
                  dimColor: !0,
                  children: ["  ", xe.metadata.summary.replace(/^\p{Lu}(?=\p{Ll}|\s)/u, lr)],
                }),
              ],
            }),
          },
          `${xe.event}-heading`,
        ),
        ...xe.hooks.map((hook, ao) =>
          e(
            OrderedListWithItem.Item,
            {
              icon: r(Text, {
                dimColor: !0,
                children: ["[", hookSourceInlineDisplayString(hook.source), "]"],
              }),
              label: getHookProgressDisplay(hook.config).command,
              meta: [
                hook.source === "pluginHook" && hook.pluginName ? Mu(hook.pluginName) : "",
                hook.matcher ? Mu(hook.matcher) : "",
                hook.config.type,
              ],
            },
            `${xe.event}-${ao}`,
          ),
        ),
      ]),
        (g[40] = onDecideCloudHooks),
        (g[41] = V));
    else V = g[41];
    ue = flattened.flatMap(V);
    ((g[0] = cloudSessionPanel),
      (g[1] = defaultFocusIndex),
      (g[2] = hookEventMetadata),
      (g[3] = hooksByEventAndMatcher),
      (g[4] = onCancel),
      (g[5] = onDecideCloudHooks),
      (g[6] = onFocusRow),
      (g[7] = onOpenEvents),
      (g[8] = onSelectHook),
      (g[9] = restrictedByPolicy),
      (g[10] = suspendedBySafeMode),
      (g[11] = v),
      (g[12] = P),
      (g[13] = _),
      (g[14] = b),
      (g[15] = E),
      (g[16] = B),
      (g[17] = N),
      (g[18] = L),
      (g[19] = x),
      (g[20] = Y),
      (g[21] = W),
      (g[22] = X),
      (g[23] = ne),
      (g[24] = ce),
      (g[25] = ue),
      (g[26] = de),
      (g[27] = se),
      (g[28] = ke),
      (g[29] = le));
  } else
    ((v = g[11]),
      (P = g[12]),
      (_ = g[13]),
      (b = g[14]),
      (E = g[15]),
      (B = g[16]),
      (N = g[17]),
      (L = g[18]),
      (x = g[19]),
      (Y = g[20]),
      (W = g[21]),
      (X = g[22]),
      (ne = g[23]),
      (ce = g[24]),
      (ue = g[25]),
      (de = g[26]),
      (se = g[27]),
      (ke = g[28]),
      (le = g[29]));
  let me;
  if (g[42] !== b.length || g[43] !== onDecideCloudHooks)
    ((me = (b.length > 0 || onDecideCloudHooks) && e(merged.Heading, {}, "events-gap")),
      (g[42] = b.length),
      (g[43] = onDecideCloudHooks),
      (g[44] = me));
  else me = g[44];
  let ie;
  if (g[45] === MEMO_CACHE_SENTINEL)
    ((ie = e(merged.Item, { children: e(AllEventsLabel, {}) }, "events")), (g[45] = ie));
  else ie = g[45];
  let V;
  if (
    g[46] !== v ||
    g[47] !== E ||
    g[48] !== me ||
    g[49] !== X ||
    g[50] !== ne ||
    g[51] !== ce ||
    g[52] !== ue
  )
    ((V = r(v, { defaultFocusIndex: E, onFocus: X, onSelect: ne, children: [ce, ue, me, ie] })),
      (g[46] = v),
      (g[47] = E),
      (g[48] = me),
      (g[49] = X),
      (g[50] = ne),
      (g[51] = ce),
      (g[52] = ue),
      (g[53] = V));
  else V = g[53];
  let We;
  if (
    g[54] !== P ||
    g[55] !== B ||
    g[56] !== N ||
    g[57] !== V ||
    g[58] !== de ||
    g[59] !== se ||
    g[60] !== ke ||
    g[61] !== le
  )
    ((We = r(P, { flexDirection: de, gap: se, children: [ke, le, B, N, V] })),
      (g[54] = P),
      (g[55] = B),
      (g[56] = N),
      (g[57] = V),
      (g[58] = de),
      (g[59] = se),
      (g[60] = ke),
      (g[61] = le),
      (g[62] = We));
  else We = g[62];
  let je;
  if (g[63] !== _ || g[64] !== L || g[65] !== x || g[66] !== Y || g[67] !== W || g[68] !== We)
    ((je = e(_, { title: L, subtitle: x, onCancel: Y, inputGuide: W, children: We })),
      (g[63] = _),
      (g[64] = L),
      (g[65] = x),
      (g[66] = Y),
      (g[67] = W),
      (g[68] = We),
      (g[69] = je));
  else je = g[69];
  return je;
}
//@ chunk-bajxb7bf.js:40626-40776 placement
function AllEventsLabel() {
  let h = w(2);
  const o = pM() ? "suggestion" : void 0;
  let i;
  if (h[0] !== o) ((i = e(Text, { color: o, children: "All events" })), (h[0] = o), (h[1] = i));
  else i = h[1];
  return i;
}

export { useEnterEscape, buildCloudHookRows, renderCloudSessionBadge, HooksOverview, describeWhereHookRuns };
