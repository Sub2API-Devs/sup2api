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
import { init_react_production, R, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import {
  deviceHooksRegistrationState,
  hasCapturedHooks,
  isHookScopeInReach,
} from "../../utils/hooks/deviceHooks/cloudRegistration.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { mayTouchCodeEditingTool } from "../../utils/hooks/hookEventSets.js";
import {
  deviceHooksConsentPath,
  readDeviceHooksConsent,
  resolveStoredConsent,
  probeWritability,
} from "../../utils/hooks/deviceHooks/consent.js";
import {
  deviceHooksPolicyEligibility,
  collectDeviceHookSources,
} from "../../utils/hooks/deviceHooks/eligibility.js";
import { findGitRootUncached } from "../../utils/git.js";
import {
  collectBaseReachRoots,
  collectSettingsWriteRoots,
  settingsReachRootsForSource,
} from "../../utils/git/builderGit/sandboxReach.js";
import { collectStickyRoots, anyPairMatches } from "../../utils/settings/stickyRoots.js";
import { SETTING_SOURCES } from "../../utils/settings/constants.js";
import { getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { getFlagSettingsExpectedContent } from "../../bootstrap/state.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { mergeHookEnv_2, resolveOptions } from "../../utils/hooks/hookCommandResolution.js";
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
import {
  plural,
  countCharInString,
  capitalize,
  escapeControlCharsForDisplay,
} from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW, merged, isMenuOpen } from "../CustomSelect/select.js";
import { Dialog } from "../design-system/Dialog.js";
import { StatusIcon, STATUS_CONFIG } from "../design-system/StatusIcon.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollColumnContext, SCROLL_COLUMN_MIN_ROWS } from "../design-system/ScrollColumn.js";
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import { PANE_PADDING_X, PANE_PADDING } from "../design-system/Pane.js";
import { OverflowHint } from "../CtrlOToExpand.js";
import { wrapText } from "../../ink/wrap-text.js";
import { expandTabsInText } from "../../ink/wrapAnsi.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { getSortedMatchersForEvent } from "../../utils/hooks/hooksConfigManager.js";
import { StatusRow } from "../Settings/Status.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { hookSourceInlineDisplayString, getHookProgressDisplay } from "../../utils/hooks/hooksSettings.js";

//@ chunk-bajxb7bf.js:16364-16368 placement
init_react_production();
//@ chunk-bajxb7bf.js:16441-17018 placement
var NOT_REGISTERED_YET_TEXT = "not registered yet; your next message tries again";
var NOT_REGISTERED_NOW_TEXT = "not registered right now; reopen /hooks to check again";
var CLOUD_HOOK_STATE_LABELS = {
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
function describeCloudHookState(standing, lapsesUnusedAt, h) {
  if (standing.kind === "dormant" && standing.senderUnverified)
    return {
      standing:
        "not running, because the session hasn't answered and doesn't recognize this machine as a trusted device; start a session from this machine to run them",
    };
  let i = deviceHooksRegistrationState(
    {
      standing,
      lapsesUnusedAt,
    },
    h,
  );
  if (i !== null)
    return {
      standing: i === "dormant" ? CLOUD_HOOK_STATE_LABELS.dormant : NOT_REGISTERED_YET_TEXT,
      standingIsIdle: true,
    };
  switch (standing.kind) {
    case "paused":
    case "kept_none":
      return {
        standing: CLOUD_HOOK_STATE_LABELS[standing.kind],
      };
    case "stopped":
      return {
        standing: CLOUD_HOOK_STATE_LABELS[standing.reason],
      };
    case "registered":
    case "idle":
    case "dormant":
      return {};
  }
}
//@ chunk-bajxb7bf.js:17535-19407 placement
/**
 * 钩子不能在云会话运行的原因（云端改文件、只支持 command/http、事件只在本机发生等）。
 */
var CLOUD_HOOK_INELIGIBLE_REASONS = {
  after_edit: "cloud edits change files in the cloud. Put the hook in the repository's .claude/settings.json",
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
};
var CLOUD_HOOK_BLOCK_REASONS = {
  dot_folder:
    "its script is in a dot-folder this machine does not read hooks from. Check the script, then move it to ~/.claude/hooks",
  shell_prefix: "it would run through your CLAUDE_CODE_SHELL_PREFIX, which this machine cannot verify",
  script_missing: "its script is missing",
};
var HOOK_SOURCE_LABELS = {
  user: {
    tag: "user settings",
    phrase: "your user settings",
  },
  local: {
    tag: "settings.local.json",
    phrase: "this folder's settings.local.json",
  },
  flag: {
    tag: "--settings file",
    phrase: "the --settings file",
  },
};
//@ chunk-bajxb7bf.js:19407-19572 placement
function hookDisplayName(command, path) {
  let h =
    path !== undefined
      ? basename(path)
      : /^https?:\/\//i.test(command.trim())
        ? httpHostLabel(command.trim())
        : basename(command.trim().split(/\s+/)[0] ?? "") || "hook";
  return (
    sanitizeDisplayText(h, {
      maxCodeUnits: 120,
    }) || "hook"
  );
}
//@ chunk-bajxb7bf.js:19572-20580 placement
function classifyHookForCloud(deviceHookAttestations, o = new Set()) {
  let h = (source) =>
    o.has(source)
      ? {
          fromWritableFile: true,
        }
      : {};
  let mapped = deviceHookAttestations.forwarded.map((t) => ({
    where: "here",
    label:
      t.local.hook.type === "http"
        ? httpHostLabel(t.local.hook.url)
        : t.local.hook.type === "command"
          ? hookDisplayName(t.local.hook.command, t.local.pinnedTarget?.path)
          : "hook",
    event: t.wire.event,
    ...(t.wire.matcher !== undefined && {
      matcher: sanitizeDisplayText(t.wire.matcher, {
        maxCodeUnits: 200,
      }),
    }),
    source: t.local.source,
    ...h(t.local.source),
    ...(mayTouchCodeEditingTool(t.wire.event, t.wire.matcher) && {
      exceptAfterEdits: true,
    }),
    ...(t.wire.author_opt_in && {
      optedIn: true,
    }),
  }));
  let mapped_2 = deviceHookAttestations.templates.map((template) => ({
    where: "cloud",
    label: `${template.local.templateId}${template.local.label === "legacy" ? " (older copy)" : ""}`,
    event: template.wire.event,
    ...(template.wire.matcher !== undefined && {
      matcher: sanitizeDisplayText(template.wire.matcher, {
        maxCodeUnits: 200,
      }),
    }),
    source: template.local.source,
    ...h(template.local.source),
  }));
  let mapped_3 = deviceHookAttestations.held.map((t) => {
    let f =
      t.cause !== undefined ? CLOUD_HOOK_BLOCK_REASONS[t.cause] : CLOUD_HOOK_INELIGIBLE_REASONS[t.reason];
    return {
      where: "local",
      label: hookDisplayName(t.command),
      event: t.event,
      ...(t.matcher !== undefined && {
        matcher: t.matcher,
      }),
      source: t.source,
      reason: t.reason,
      why: t.noRemedy ? f.replace(/\. .*$/, "") : f,
    };
  });
  return [...mapped, ...mapped_2, ...mapped_3];
}
//@ chunk-bajxb7bf.js:20580-20660 placement
function httpHostLabel(m) {
  try {
    return new URL(m).host || "http hook";
  } catch {
    return "http hook";
  }
}
//@ chunk-bajxb7bf.js:20660-20711 placement
var NO_HOOK_REASON = {
  kind: "none",
  reason: "disabled_by_settings",
};
//@ chunk-bajxb7bf.js:20711-20978 placement
function reconcileCapturedHooks(m, baseline, h) {
  if (
    m.kind === "none" &&
    m.reason === "disabled_by_settings" &&
    baseline !== null &&
    baseline.kind === "captured" &&
    h &&
    hasCapturedHooks(baseline)
  )
    return {
      captured: baseline,
      kept: "launch_hooks",
    };
  if (baseline?.kind === "none" && baseline.reason === "disabled_by_settings" && hasCapturedHooks(m))
    return {
      captured: NO_HOOK_REASON,
      kept: "off",
    };
  return {
    captured: m,
  };
}
//@ chunk-bajxb7bf.js:20978-25112 placement
/**
 * 计算每个钩子在云会话中的状态（dormant、idle、registered 等）。
 */
async function buildCloudHookRows({
  launchDir,
  storageV5,
  forwarding,
  consentPin,
  senderMemory,
  processMemory,
}) {
  let t = deviceHooksConsentPath();
  if (forwarding !== "cloud")
    return {
      consent: forwarding,
      consentLocation: t,
      rows: [],
    };
  let deviceHooksConsent = readDeviceHooksConsent(storageV5);
  let k = (M = []) => {
    let now = Date.now();
    let v = describeCloudHookState(senderMemory.standing, senderMemory.lapsesUnusedAt, now);
    if (v.standing !== undefined)
      return v.standingIsIdle && deviceHooksRegistrationState(senderMemory, now) === "dormant"
        ? v
        : {
            ...v,
            notInForce: true,
          };
    return senderMemory.standing.kind === "idle" && M.some((P) => P.where === "here")
      ? {
          standing: NOT_REGISTERED_NOW_TEXT,
          standingIsIdle: true,
          notInForce: true,
        }
      : {};
  };
  let C = consentPin;
  let D = async (M) => (C.current?.origin === "given" ? C.current.value.catch(() => "unset") : M);
  try {
    let { stored, origin } = await resolveStoredConsent(C, deviceHooksConsent);
    let v = stored;
    let P = deviceHooksPolicyEligibility(collectDeviceHookSources());
    let gitRootUncached = findGitRootUncached(launchDir);
    let b = gitRootUncached ?? launchDir;
    let E = [
      launchDir,
      await realpath(launchDir).catch(() => launchDir),
      b,
      await realpath(b).catch(() => b),
    ];
    let B = senderMemory.commonRoots ?? collectBaseReachRoots(launchDir);
    let N = new Map(senderMemory.pinnedRoots);
    let stickyRoots = await collectStickyRoots({
      stickyRoots: new Set(senderMemory.stickyRoots),
      pinnedScopes: new Set(senderMemory.pinnedScopes),
      pinnedRoots: N,
      baseRoots: E,
      reachBaseline:
        senderMemory.reachBaseline ??
        new Map(SETTING_SOURCES.map((p) => [p, collectSettingsWriteRoots(p, launchDir)])),
      scopeSettingsFile: (p) => getSettingsFilePathForSource(p) ?? null,
      realpath,
      commonRoots: () => B,
      scopeRoots: (p, J) => settingsReachRootsForSource(launchDir, p, J),
    });
    let x;
    if (origin === "read" && v !== "unset") {
      let p = t;
      let J = await probeWritability(t, stickyRoots, async (ge) => {
        p = await realpath(ge);
        return p;
      });
      if (J !== false) v = "unset";
      let U = stripInvisibleChars(t);
      if (J === "unresolvable") x = `${U} couldn't be read.`;
      else if (J === "writable") {
        let ge = [t, p];
        let I = anyPairMatches(ge, [...E, ...B])
          ? undefined
          : SETTING_SOURCES.find((He) =>
              anyPairMatches(ge, N.get(He) ?? settingsReachRootsForSource(launchDir, He, null)),
            );
        let pe = I && getSettingsFilePathForSource(I);
        let Se =
          I === "policySettings"
            ? ", which your managed settings allow"
            : I === "flagSettings" && getFlagSettingsExpectedContent() !== undefined
              ? ", which the --settings value allows"
              : pe !== undefined
                ? `, which ${stripInvisibleChars(pe)} allows`
                : "";
        x = `This cloud session can write ${U}${Se}.`;
      }
    }
    let { captured, kept } = reconcileCapturedHooks(
      P,
      senderMemory.baseline,
      P.kind === "none" && P.reason === "disabled_by_settings"
        ? await isHookScopeInReach(stickyRoots, P.switchSources ?? ["user", "flag"], {
            realpath,
            scopeSettingsFile: (p) => getSettingsFilePathForSource(p) ?? null,
            everInReach: senderMemory.everInReach,
          })
        : false,
    );
    if (captured.kind === "none")
      return {
        consent: await D(v),
        consentLocation: t,
        ...(x !== undefined && {
          storedAnswerNotUsed: x,
        }),
        ...k(),
        rows: [],
        unavailableReason: kept === "off" ? HOOKS_OFF_AT_START_TEXT : POLICY_BLOCK_REASONS[captured.reason],
      };
    let X = subprocessEnv();
    let ne = mergeHookEnv_2({
      attached: X,
      beforeSettings: getLatchedPreSettingsEnvSnapshot(),
      ownEnv: settingsEnvInReach(senderMemory, legacyConfigFileOf(processMemory)),
      childrenSee: (p) => Object.hasOwn(X, p),
    });
    let deviceHookAttestations = await collectDeviceHookAttestations(
      captured,
      {
        instanceId: "dev-0000000000000000",
        launchDir,
        projectDir: projectConfigRootOr(launchDir),
        configHome: getClaudeConfigDir(),
        extraReachRoots: stickyRoots,
        ...(b !== launchDir && {
          repoRoot: b,
        }),
        inRepository: gitRootUncached !== null,
        ...(senderMemory.lastSyncRoot !== null && {
          sync: {
            rootReal: senderMemory.lastSyncRoot.real,
            root: senderMemory.lastSyncRoot.root,
          },
        }),
        allowLegacyTemplateDigests: true,
        refusedTemplateIds: [...senderMemory.refusedTemplates],
        optInPins: new Map(senderMemory.optInPins),
        reachMemory: senderMemory,
        localSettingsLocation: {
          ...senderMemory.localSettingsLocation,
        },
      },
      {
        realpath,
        open: scriptFileReaderDeps().openNoFollow,
        home: resolveOptions(ne),
        defaultShell: defaultShellKind(),
        shellPrefix: shellPrefixOf(ne),
      },
    );
    let ue = new Set([
      ...senderMemory.everInReach,
      ...[captured, senderMemory.baseline].flatMap((p) =>
        p?.kind === "captured" ? p.sources.map((source) => source.source) : [],
      ),
    ]);
    let de = [
      ["user", getSettingsFilePathForSource("userSettings")],
      ["local", getSettingsFilePathForSource("localSettings")],
      [
        "flag",
        getFlagSettingsExpectedContent() === undefined
          ? getSettingsFilePathForSource("flagSettings")
          : undefined,
      ],
    ];
    let se = new Set(
      deviceHookAttestations.held
        .filter((p) => p.reason === "source_in_sync_root" || p.reason === "sync_root_is_config_dir")
        .map((p) => p.source),
    );
    let ke = new Set(captured.withheld.map((p) => p.source));
    let le = new Set();
    let me = new Set();
    for (let [p, J] of de) {
      if (J === undefined || !ue.has(p) || se.has(p) || (ke.has(p) && !senderMemory.everInReach.has(p)))
        continue;
      let U = p === "local" ? le : me;
      if (senderMemory.everInReach.has(p)) {
        U.add(p);
        continue;
      }
      let ge = uniq([J, await realpath(J).catch(() => J), ...(senderMemory.knownSpellings.get(p) ?? [])]);
      if (anyPairMatches(ge, stickyRoots)) U.add(p);
    }
    let ie = classifyHookForCloud(deviceHookAttestations, le);
    let Le = [
      ...captured.withheld
        .filter((p) => !le.has(p.source) && !me.has(p.source))
        .map(
          (p) =>
            `Hooks from ${HOOK_SOURCE_LABELS[p.source].phrase} are not offered to the cloud session: ${UNTRUSTED_BLOCK_REASONS[p.reason]}.`,
        ),
      ...[...me].map(
        (p) =>
          `Hooks from ${HOOK_SOURCE_LABELS[p].phrase} are not offered to the cloud session: the cloud session may change that file.`,
      ),
    ];
    return {
      consent: await D(v),
      consentLocation: t,
      ...(x !== undefined && {
        storedAnswerNotUsed: x,
      }),
      ...k(ie),
      rows: ie,
      ...(kept === "launch_hooks" && {
        keptFromLaunch:
          "All hooks were switched off in your settings during this cloud session; for it, this machine keeps offering the hooks it had when you launched (listed here) until you restart claude --cloud.",
      }),
      ...(le.size > 0 && {
        writableSources: [...le].map(
          (p) =>
            `This cloud session can write ${HOOK_SOURCE_LABELS[p].phrase}, so only the hooks that file held when you attached are offered.`,
        ),
      }),
      ...(Le.length > 0 && {
        withheld: Le,
      }),
    };
  } catch (error) {
    logError(error);
    return {
      consent: await D("unset"),
      consentLocation: t,
      ...k(),
      rows: [],
      unavailableReason: "they could not be read",
    };
  }
}
//@ chunk-bajxb7bf.js:25112-26126 placement
var HOOKS_OFF_AT_START_TEXT =
  "all hooks were switched off in your settings when this cloud session started, and for it this machine keeps them off although that switch has since been removed \u2014 restart claude --cloud to offer them";
var POLICY_BLOCK_REASONS = {
  policy_unreadable: "the managed policy on this machine could not be read",
  policy_disable_all: "a managed policy switches all hooks off",
  managed_only: "only managed hooks may run here (a managed-only policy, or safe mode)",
  plugin_only: "a managed policy allows plugin hooks only",
  disabled_by_settings: "all hooks are switched off in your settings",
  bare: "this session runs without user configuration",
  untrusted_workspace: "this folder's trust prompt was not accepted",
};
var UNTRUSTED_BLOCK_REASONS = {
  untrusted: "this folder's trust prompt was not accepted",
  repo_provenance:
    "that file is part of the repository (or its provenance could not be read), which the cloud session has its own copy of",
  runtime_patch: "hooks set for this run only are not forwarded",
  served_folder: "the cloud session this computer serves can write that file",
};
//@ chunk-bajxb7bf.js:26126-26130 placement
init_react_production();
//@ chunk-bajxb7bf.js:26130-26141 placement
var HOOK_LABEL_WIDTH = 250;
//@ chunk-bajxb7bf.js:26141-28737 placement
function describeWhereHookRuns(props) {
  let k = w(34);
  let { forwarded, templateNames, consentLocation, current: d, onDone } = props;
  let t = R(false);
  let timeout = useTimeout(HOOK_LABEL_WIDTH);
  let C;
  if (k[0] !== timeout || k[1] !== onDone) {
    C = function M(D) {
      if (t.current || !timeout) {
        return;
      }
      t.current = true;
      onDone(D);
    };
    k[0] = timeout;
    k[1] = onDone;
    k[2] = C;
  } else C = k[2];
  let M = C;
  let g;
  if (k[3] !== forwarded) {
    g = forwarded > 0 ? [`${forwarded} ${plural(forwarded, "hook")} would run here`] : [];
    k[3] = forwarded;
    k[4] = g;
  } else g = k[4];
  let v;
  if (k[5] !== templateNames) {
    v = templateNames.length > 0 ? [`${templateNames.join(", ")} would run in the cloud session`] : [];
    k[5] = templateNames;
    k[6] = v;
  } else v = k[6];
  let P;
  if (k[7] !== g || k[8] !== v) {
    P = [...g, ...v];
    k[7] = g;
    k[8] = v;
    k[9] = P;
  } else P = k[9];
  let joined = P.join("; ");
  let onCancel;
  if (k[10] !== M) {
    onCancel = () => M("not_now");
    k[10] = M;
    k[11] = onCancel;
  } else onCancel = k[11];
  let inputGuide;
  if (k[12] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "skip for now",
        }),
      ],
    });
    k[12] = inputGuide;
  } else inputGuide = k[12];
  let B;
  let N;
  if (k[13] === MEMO_CACHE_SENTINEL) {
    B = jsxProd_default(Text, {
      children:
        "Hooks in your user and local settings, or a --settings file, don't run in cloud sessions. If you say yes, cloud sessions started from this machine ask Claude Code here to run them. What a hook returns becomes part of the session's transcript.",
    });
    N = jsxProd_default(Text, {
      children:
        "Hooks run here only while Claude Code stays connected and answers in time. Otherwise the session continues without them: a hook that blocks a command here won't block it there, and your allow rules still apply.",
    });
    k[13] = B;
    k[14] = N;
  } else {
    B = k[13];
    N = k[14];
  }
  let L;
  if (k[15] !== joined) {
    L =
      joined !== "" &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Right now: ", joined, "."],
      });
    k[15] = joined;
    k[16] = L;
  } else L = k[16];
  const x =
    d === "accepted"
      ? "Not now keeps your answer: yes."
      : d === "declined"
        ? "Not now keeps your answer: no."
        : "Not now: no hooks run until you say yes.";
  let Y;
  if (k[17] !== consentLocation || k[18] !== x) {
    Y = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Yes or No is saved for this machine in ",
        consentLocation,
        ". Change it in /hooks.",
        " ",
        x,
      ],
    });
    k[17] = consentLocation;
    k[18] = x;
    k[19] = Y;
  } else Y = k[19];
  let W;
  if (k[20] !== Y || k[21] !== L) {
    W = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [B, N, L, Y],
    });
    k[20] = Y;
    k[21] = L;
    k[22] = W;
  } else W = k[22];
  let options;
  if (k[23] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Yes, run hooks for cloud sessions",
        value: "accepted",
      },
      {
        label: "No, don't run hooks for cloud sessions",
        value: "declined",
      },
      {
        label: "Not now",
        value: "not_now",
      },
    ];
    k[23] = options;
  } else options = k[23];
  const isDisabled = !timeout;
  let onCancel_2;
  if (k[24] !== M) {
    onCancel_2 = () => M("not_now");
    k[24] = M;
    k[25] = onCancel_2;
  } else onCancel_2 = k[25];
  let ue;
  if (k[26] !== M || k[27] !== isDisabled || k[28] !== onCancel_2) {
    ue = jsxProd_default(ModelSelector, {
      selectedValue: NO_COMMITTED_ROW,
      options,
      defaultFocusValue: "not_now",
      hideIndexes: true,
      isDisabled,
      onChange: M,
      onCancel: onCancel_2,
    });
    k[26] = M;
    k[27] = isDisabled;
    k[28] = onCancel_2;
    k[29] = ue;
  } else ue = k[29];
  let de;
  if (k[30] !== W || k[31] !== ue || k[32] !== onCancel) {
    de = jsxProd_default_2(Dialog, {
      title: "Run this machine's hooks for cloud sessions?",
      onCancel,
      inputGuide,
      children: [W, ue],
    });
    k[30] = W;
    k[31] = ue;
    k[32] = onCancel;
    k[33] = de;
  } else de = k[33];
  return de;
}
//@ chunk-bajxb7bf.js:28737-28741 placement
init_react_production();
//@ chunk-bajxb7bf.js:28741-28893 placement
var PLUGIN_HOOKS_NOTE =
  "Plugin hooks are not listed above. A plugin's hooks run in this cloud session only if the session loaded that plugin (see the top of /plugin).";
//@ chunk-bajxb7bf.js:28893-28993 placement
function PluginHooksNote() {
  let m = w(1);
  let o;
  if (m[0] === MEMO_CACHE_SENTINEL) {
    o = jsxProd_default(Text, {
      dimColor: true,
      children: PLUGIN_HOOKS_NOTE,
    });
    m[0] = o;
  } else o = m[0];
  return o;
}
//@ chunk-bajxb7bf.js:28993-29037 placement
function dimSegment(text) {
  return {
    text,
    dimColor: true,
  };
}
//@ chunk-bajxb7bf.js:29037-29068 placement
function segmentText(Mo) {
  return Mo.text;
}
//@ chunk-bajxb7bf.js:29068-29190 placement
function renderStatusLine(m, Ce) {
  let { status, pieces } = m;
  return jsxProd_default_2(
    Text,
    {
      children: [
        jsxProd_default(StatusIcon, {
          status,
          withSpace: true,
        }),
        jsxProd_default(TextPieces, {
          pieces,
        }),
      ],
    },
    Ce,
  );
}
//@ chunk-bajxb7bf.js:29190-29279 placement
function renderSegment(je, co) {
  return jsxProd_default(
    Text,
    {
      dimColor: je.dimColor,
      color: je.color,
      children: je.text,
    },
    co,
  );
}
//@ chunk-bajxb7bf.js:29279-29444 placement
var CLOUD_HOOKS_INTRO =
  "Each row says where one of this machine's hooks runs for this cloud session. Hooks committed to the repository run in the cloud.";
var ROW_AGE_WIDTH = 40;
var ROW_COUNT_WIDTH = 7;
var ROW_NAME_WIDTH = 10;
var ROW_MATCHER_WIDTH = 8;
var ROW_COMMAND_WIDTH = 3;
//@ chunk-bajxb7bf.js:29444-30098 placement
function renderCloudSessionBadge(props) {
  let d = w(11);
  let { summaryPromise, savedLine, hasPluginHooks } = props;
  let u;
  if (d[0] === MEMO_CACHE_SENTINEL) {
    u = jsxProd_default_2(Text, {
      color: "suggestion",
      children: [figures_default.info, " Cloud session"],
    });
    d[0] = u;
  } else u = d[0];
  let t;
  if (d[1] !== savedLine) {
    t =
      savedLine !== undefined &&
      jsxProd_default(Text, {
        color: "success",
        children: savedLine,
      });
    d[1] = savedLine;
    d[2] = t;
  } else t = d[2];
  let fallback;
  if (d[3] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(Text, {
      dimColor: true,
      children: "Checking this machine's hooks\u2026",
    });
    d[3] = fallback;
  } else fallback = d[3];
  let k;
  if (d[4] !== hasPluginHooks || d[5] !== savedLine || d[6] !== summaryPromise) {
    k = jsxProd_default(fo, {
      fallback,
      children: jsxProd_default(renderRemoteHostNotice, {
        summaryPromise,
        savedLine,
        hasPluginHooks,
      }),
    });
    d[4] = hasPluginHooks;
    d[5] = savedLine;
    d[6] = summaryPromise;
    d[7] = k;
  } else k = d[7];
  let C;
  if (d[8] !== t || d[9] !== k) {
    C = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [u, t, k],
    });
    d[8] = t;
    d[9] = k;
    d[10] = C;
  } else C = d[10];
  return C;
}
//@ chunk-bajxb7bf.js:30098-30796 placement
function renderRemoteHostNotice(props) {
  let t = w(7);
  let { summaryPromise, savedLine, hasPluginHooks } = props;
  let d = Qr(summaryPromise);
  let consent = d.consent;
  if (consent === "off") {
    let f;
    if (t[0] === MEMO_CACHE_SENTINEL) {
      f = jsxProd_default(Text, {
        dimColor: true,
        children:
          "Hooks from this machine's settings are not forwarded to this cloud session (hooks committed to the repository still run from the cloud's own copy).",
      });
      t[0] = f;
    } else f = t[0];
    return f;
  }
  if (consent === "remote_host") {
    let f;
    if (t[1] === MEMO_CACHE_SENTINEL) {
      f = jsxProd_default(Text, {
        dimColor: true,
        children:
          "The hooks below are this machine's; this remote session runs the hooks configured on its own host.",
      });
      t[1] = f;
    } else f = t[1];
    return f;
  }
  let f;
  if (t[2] !== consent || t[3] !== hasPluginHooks || t[4] !== savedLine || t[5] !== d) {
    f = jsxProd_default(renderCloudHookOffers, {
      summary: d,
      consent,
      savedLine,
      hasPluginHooks,
    });
    t[2] = consent;
    t[3] = hasPluginHooks;
    t[4] = savedLine;
    t[5] = d;
    t[6] = f;
  } else f = t[6];
  return f;
}
//@ chunk-bajxb7bf.js:30796-33547 placement
function renderCloudHookOffers(props) {
  let k = w(52);
  let { summary, consent, savedLine, hasPluginHooks } = props;
  let terminalSize = useTerminalSize();
  let reserve = useScrollColumnContext()?.reserve ?? SCROLL_COLUMN_MIN_ROWS;
  const rows = terminalSize.rows - reserve - ROW_COUNT_WIDTH;
  let C;
  if (k[0] !== rows || k[1] !== terminalSize.columns) {
    C = {
      rows,
      columns: terminalSize.columns,
    };
    k[0] = rows;
    k[1] = terminalSize.columns;
    k[2] = C;
  } else C = k[2];
  let { rows: rows_2, columns } = useScrollViewportSize(C);
  let g = columns - 2 * (useHasScrollViewport() ? PANE_PADDING_X : PANE_PADDING);
  let v;
  if (k[3] !== summary.withheld) {
    v = summary.withheld ?? [];
    k[3] = summary.withheld;
    k[4] = v;
  } else v = k[4];
  let notes;
  let inForce;
  let standIn;
  let total;
  let isIntroShown;
  let rows_3;
  if (
    k[5] !== consent ||
    k[6] !== hasPluginHooks ||
    k[7] !== rows_2 ||
    k[8] !== savedLine ||
    k[9] !== summary ||
    k[10] !== v ||
    k[11] !== g
  ) {
    let L;
    if (k[18] !== summary.writableSources) {
      L = summary.writableSources ?? [];
      k[18] = summary.writableSources;
      k[19] = L;
    } else L = k[19];
    let mapped = v.concat(L).map(dimSegment);
    if (summary.keptFromLaunch !== undefined)
      mapped.push({
        text: summary.keptFromLaunch,
        color: "warning",
      });
    let Y = renderHookOriginSummary(summary, consent);
    const W = [
      ...(savedLine === undefined ? [] : [savedLine]),
      ...mapped.map(segmentText),
      ...(hasPluginHooks ? [PLUGIN_HOOKS_NOTE] : []),
      segmentsText(Y),
    ];
    let X;
    if (k[20] !== g) {
      X = (ne, ce) => ne - countWrappedLines(ce, g);
      k[20] = g;
      k[21] = X;
    } else X = k[21];
    let reduced = W.reduce(X, rows_2 - 1);
    let de = countWrappedLines(CLOUD_HOOKS_INTRO, g) + 1;
    let se =
      summary.unavailableReason !== undefined
        ? `None of this machine's hooks are offered (${summary.unavailableReason}).`
        : summary.rows.length === 0
          ? "This machine has no hooks a cloud session could use."
          : undefined;
    let ke = se === undefined ? summary.rows.length : 0;
    let me =
      se === undefined
        ? summary.rows.slice(0, ROW_AGE_WIDTH).map((le) => classifyHookLocation(le, consent, summary))
        : [];
    let ie;
    if (k[22] !== g) {
      ie = (V) => {
        let { status, pieces } = V;
        return countWrappedLines(`${STATUS_CONFIG[status].icon} ${segmentsText(pieces)}`, g);
      };
      k[22] = g;
      k[23] = ie;
    } else ie = k[23];
    let mapped_2 = me.map(ie);
    let U = fittingRowCount(mapped_2, ke, reduced - de);
    let ge = se === undefined ? U > 0 : reduced - de - countWrappedLines(se, g) >= ROW_NAME_WIDTH;
    notes = mapped;
    inForce = Y;
    standIn = se;
    total = ke;
    isIntroShown = ge;
    rows_3 = me.slice(0, ge ? U : fittingRowCount(mapped_2, ke, reduced));
    k[5] = consent;
    k[6] = hasPluginHooks;
    k[7] = rows_2;
    k[8] = savedLine;
    k[9] = summary;
    k[10] = v;
    k[11] = g;
    k[12] = notes;
    k[13] = inForce;
    k[14] = standIn;
    k[15] = total;
    k[16] = isIntroShown;
    k[17] = rows_3;
  } else {
    notes = k[12];
    inForce = k[13];
    standIn = k[14];
    total = k[15];
    isIntroShown = k[16];
    rows_3 = k[17];
  }
  let L;
  if (
    k[24] !== notes ||
    k[25] !== inForce ||
    k[26] !== standIn ||
    k[27] !== total ||
    k[28] !== isIntroShown ||
    k[29] !== rows_3
  ) {
    L = {
      notes,
      inForce,
      standIn,
      total,
      isIntroShown,
      rows: rows_3,
    };
    k[24] = notes;
    k[25] = inForce;
    k[26] = standIn;
    k[27] = total;
    k[28] = isIntroShown;
    k[29] = rows_3;
    k[30] = L;
  } else L = k[30];
  let I = L;
  let W;
  if (k[31] !== I.isIntroShown) {
    W =
      I.isIntroShown &&
      jsxProd_default(Text, {
        dimColor: true,
        children: CLOUD_HOOKS_INTRO,
      });
    k[31] = I.isIntroShown;
    k[32] = W;
  } else W = k[32];
  const marginTop = I.isIntroShown ? 1 : 0;
  let ie;
  if (k[33] !== I.rows || k[34] !== I.standIn || k[35] !== I.total) {
    ie =
      I.standIn !== undefined
        ? jsxProd_default(Text, {
            dimColor: true,
            children: I.standIn,
          })
        : jsxProd_default_2(Fragment, {
            children: [
              I.rows.map(renderStatusLine),
              jsxProd_default(OverflowHint, {
                count: I.total - I.rows.length,
                unit: "hook",
              }),
            ],
          });
    k[33] = I.rows;
    k[34] = I.standIn;
    k[35] = I.total;
    k[36] = ie;
  } else ie = k[36];
  let V;
  if (k[37] !== I.notes) {
    V = I.notes.map(renderSegment);
    k[37] = I.notes;
    k[38] = V;
  } else V = k[38];
  let pe;
  if (k[39] !== hasPluginHooks) {
    pe = hasPluginHooks && jsxProd_default(PluginHooksNote, {});
    k[39] = hasPluginHooks;
    k[40] = pe;
  } else pe = k[40];
  let Se;
  if (k[41] !== I.inForce) {
    Se = jsxProd_default(Text, {
      children: jsxProd_default(TextPieces, {
        pieces: I.inForce,
      }),
    });
    k[41] = I.inForce;
    k[42] = Se;
  } else Se = k[42];
  let He;
  if (k[43] !== marginTop || k[44] !== ie || k[45] !== V || k[46] !== pe || k[47] !== Se) {
    He = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [ie, V, pe, Se],
    });
    k[43] = marginTop;
    k[44] = ie;
    k[45] = V;
    k[46] = pe;
    k[47] = Se;
    k[48] = He;
  } else He = k[48];
  let he;
  if (k[49] !== W || k[50] !== He) {
    he = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [W, He],
    });
    k[49] = W;
    k[50] = He;
    k[51] = he;
  } else he = k[51];
  return he;
}
//@ chunk-bajxb7bf.js:33547-33663 placement
function TextPieces({ pieces }) {
  return pieces.map((piece, h) =>
    jsxProd_default(
      Text,
      {
        bold: piece.bold,
        dimColor: piece.dimColor,
        color: piece.color,
        children: piece.text,
      },
      h,
    ),
  );
}
//@ chunk-bajxb7bf.js:33663-33772 placement
function fittingRowCount(m, o, h) {
  let i = 0;
  let d = 0;
  for (let u of m) {
    i += u;
    let t = d < ROW_COMMAND_WIDTH ? ROW_MATCHER_WIDTH : ROW_NAME_WIDTH;
    if (i + (d + 1 < o ? 1 : 0) > h - t) break;
    d++;
  }
  return d;
}
//@ chunk-bajxb7bf.js:33772-33822 placement
function segmentsText(m) {
  return m.map((o) => o.text).join("");
}
//@ chunk-bajxb7bf.js:33822-33888 placement
function countWrappedLines(m, o) {
  return (
    1 +
    countCharInString(
      wrapText(expandTabsInText(m), Math.max(1, o), "wrap"),
      `
`,
    )
  );
}
//@ chunk-bajxb7bf.js:33888-34513 placement
function renderHookOriginSummary(summary, consent) {
  let h = {
    text: "Hooks from this machine: ",
  };
  switch (consent) {
    case "accepted":
      return [
        h,
        {
          text: "on",
          bold: true,
        },
        {
          text: " \xB7 change it below",
          dimColor: true,
        },
        ...(summary.standing === undefined
          ? []
          : [segmentStyle(` \xB7 for this session: ${summary.standing}`, summary.standingIsIdle)]),
      ];
    case "declined":
      return [
        h,
        {
          text: "off",
          bold: true,
        },
        {
          text: " \xB7 change it below",
          dimColor: true,
        },
      ];
    case "unset":
      return summary.storedAnswerNotUsed !== undefined
        ? [
            h,
            {
              text: "saved answer not used",
              bold: true,
            },
            {
              text: `. ${summary.storedAnswerNotUsed} Answer again below for this terminal.`,
              dimColor: true,
            },
          ]
        : [
            h,
            {
              text: "not decided",
              bold: true,
            },
            {
              text: " \xB7 none run for cloud sessions until you decide below",
              dimColor: true,
            },
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
function classifyHookLocation(m, consent, { notInForce, standingIsIdle }) {
  let d = m.where === "here" && consent === "accepted" && notInForce === true;
  let u = m.matcher !== undefined && m.matcher !== "" ? `${m.event}:${m.matcher}` : m.event;
  return {
    status: m.where === "local" || consent !== "accepted" || d ? "pending" : "success",
    pieces: [
      {
        text: m.label,
        bold: true,
      },
      {
        text: " ",
      },
      {
        text: `\xB7 ${u} \xB7 ${HOOK_SOURCE_LABELS[m.source].tag} \xB7`,
        dimColor: true,
      },
      {
        text: ` ${describeCloudAcceptance(m, consent)}`,
      },
      ...(consent !== "declined" && m.where === "here" && m.optedIn
        ? [
            {
              text: ', only because its entry is marked cloud: "device"',
              dimColor: true,
            },
          ]
        : []),
      ...(m.where === "local"
        ? [
            {
              text: `: ${m.why}`,
              dimColor: true,
            },
          ]
        : []),
      ...(m.where !== "local" && m.fromWritableFile
        ? [
            {
              text: " (its settings file can be written by the cloud session; what was registered when you attached is what runs)",
              dimColor: true,
            },
          ]
        : []),
      ...(d ? [segmentStyle(" \xB7 not running now", standingIsIdle)] : []),
    ],
  };
}
//@ chunk-bajxb7bf.js:35863-35935 placement
function segmentStyle(text, standingIsIdle) {
  return standingIsIdle
    ? {
        text,
        dimColor: true,
      }
    : {
        text,
        color: "warning",
      };
}
//@ chunk-bajxb7bf.js:35935-36254 placement
function useEnterEscape(props) {
  let d = w(8);
  let { enter, escape: h } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let u;
  if (d[0] !== enter || d[1] !== isScreenReaderEnabled) {
    u =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: enter,
      });
    d[0] = enter;
    d[1] = isScreenReaderEnabled;
    d[2] = u;
  } else u = d[2];
  let t;
  if (d[3] !== h) {
    t = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: h,
    });
    d[3] = h;
    d[4] = t;
  } else t = d[4];
  let f;
  if (d[5] !== u || d[6] !== t) {
    f = jsxProd_default_2(Byline, {
      children: [u, t],
    });
    d[5] = u;
    d[6] = t;
    d[7] = f;
  } else f = d[7];
  return f;
}
//@ chunk-bajxb7bf.js:36254-36286 placement
function hooksOf(co) {
  return co.hooks;
}
//@ chunk-bajxb7bf.js:36286-36326 placement
function lowercase(vt) {
  return vt.toLowerCase();
}
//@ chunk-bajxb7bf.js:36326-40626 placement
/**
 * /hooks 首页：列出事件及其钩子数量、托管钩子提示与云会话钩子状态。
 */
function HooksOverview(props) {
  let g = w(70);
  let {
    hookEventMetadata,
    hooksByEventAndMatcher,
    restrictedByPolicy,
    suspendedBySafeMode,
    cloudSessionPanel,
    onDecideCloudHooks,
    defaultFocusIndex,
    onFocusRow,
    onSelectHook,
    onOpenEvents,
    onCancel,
  } = props;
  let v;
  let P;
  let _;
  let b;
  let defaultFocusIndex_2;
  let B;
  let N;
  let title;
  let subtitle;
  let onCancel_2;
  let inputGuide;
  let onFocus;
  let onSelect;
  let ce;
  let ue;
  let flexDirection;
  let gap;
  let ke;
  let le;
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
    if (g[30] !== hooksByEventAndMatcher) {
      ie = (V) => {
        let [Le, p] = V;
        let event = Le;
        let U = hooksByEventAndMatcher[event] ?? {};
        let flattened = getSortedMatchersForEvent(hooksByEventAndMatcher, event).flatMap((ge) => U[ge] ?? []);
        return flattened.length > 0
          ? [
              {
                event,
                metadata: p,
                hooks: flattened,
              },
            ]
          : [];
      };
      g[30] = hooksByEventAndMatcher;
      g[31] = ie;
    } else ie = g[31];
    let flattened = entries.flatMap(ie);
    b = flattened.flatMap(hooksOf);
    let Se = onDecideCloudHooks ? 1 : 0;
    _ = Dialog;
    title = "Hooks";
    subtitle =
      b.length === 0
        ? restrictedByPolicy
          ? "managed hooks only"
          : "no hooks yet"
        : `${b.length} ${plural(b.length, "hook")} on ${flattened.length} ${plural(flattened.length, "event")}`;
    onCancel_2 = onCancel;
    if (g[32] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(useEnterEscape, {
        enter: "view",
        escape: "close",
      });
      g[32] = inputGuide;
    } else inputGuide = g[32];
    P = Box;
    flexDirection = "column";
    gap = 1;
    ke = cloudSessionPanel;
    if (g[33] !== suspendedBySafeMode) {
      le =
        suspendedBySafeMode &&
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(StatusRow, {
              status: "warning",
              children: "Safe mode: hooks from settings files won't run this session.",
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
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
        });
      g[33] = suspendedBySafeMode;
      g[34] = le;
    } else le = g[34];
    if (g[35] !== restrictedByPolicy) {
      B =
        restrictedByPolicy &&
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(StatusRow, {
              status: "info",
              children: "Only hooks from managed settings run here.",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children:
                "Hooks in your own settings files (user, project and local) are blocked and aren't listed. Managed hooks aren't shown here either.",
            }),
          ],
        });
      g[35] = restrictedByPolicy;
      g[36] = B;
    } else B = g[36];
    if (g[37] === MEMO_CACHE_SENTINEL) {
      N = jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "This menu is read-only. To add or change a hook, edit settings.json or ask Claude.",
          " ",
          jsxProd_default(Link, {
            url: "https://code.claude.com/docs/en/hooks",
            children: "Learn more",
          }),
        ],
      });
      g[37] = N;
    } else N = g[37];
    v = OrderedListWithItem;
    defaultFocusIndex_2 = defaultFocusIndex;
    onFocus = onFocusRow;
    onSelect = (He) => {
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
    if (g[38] !== onDecideCloudHooks) {
      ce =
        onDecideCloudHooks &&
        jsxProd_default(
          merged.Item,
          {
            lines: 2,
            children: jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default(Text, {
                  color: "suggestion",
                  wrap: "truncate-end",
                  children: "Decide whether cloud sessions run this machine's hooks\u2026",
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "truncate-end",
                  children: "Saved for this machine; change the answer here any time",
                }),
              ],
            }),
          },
          "decide-cloud-hooks",
        );
      g[38] = onDecideCloudHooks;
      g[39] = ce;
    } else ce = g[39];
    let V;
    if (g[40] !== onDecideCloudHooks) {
      V = (xe, Mo) => [
        ...(Mo > 0 || onDecideCloudHooks ? [jsxProd_default(merged.Heading, {}, `${xe.event}-gap`)] : []),
        jsxProd_default(
          merged.Heading,
          {
            children: jsxProd_default_2(Text, {
              wrap: "truncate-end",
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: xe.event,
                }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["  ", xe.metadata.summary.replace(/^\p{Lu}(?=\p{Ll}|\s)/u, lowercase)],
                }),
              ],
            }),
          },
          `${xe.event}-heading`,
        ),
        ...xe.hooks.map((hook, ao) =>
          jsxProd_default(
            OrderedListWithItem.Item,
            {
              icon: jsxProd_default_2(Text, {
                dimColor: true,
                children: ["[", hookSourceInlineDisplayString(hook.source), "]"],
              }),
              label: getHookProgressDisplay(hook.config).command,
              meta: [
                hook.source === "pluginHook" && hook.pluginName
                  ? escapeControlCharsForDisplay(hook.pluginName)
                  : "",
                hook.matcher ? escapeControlCharsForDisplay(hook.matcher) : "",
                hook.config.type,
              ],
            },
            `${xe.event}-${ao}`,
          ),
        ),
      ];
      g[40] = onDecideCloudHooks;
      g[41] = V;
    } else V = g[41];
    ue = flattened.flatMap(V);
    g[0] = cloudSessionPanel;
    g[1] = defaultFocusIndex;
    g[2] = hookEventMetadata;
    g[3] = hooksByEventAndMatcher;
    g[4] = onCancel;
    g[5] = onDecideCloudHooks;
    g[6] = onFocusRow;
    g[7] = onOpenEvents;
    g[8] = onSelectHook;
    g[9] = restrictedByPolicy;
    g[10] = suspendedBySafeMode;
    g[11] = v;
    g[12] = P;
    g[13] = _;
    g[14] = b;
    g[15] = defaultFocusIndex_2;
    g[16] = B;
    g[17] = N;
    g[18] = title;
    g[19] = subtitle;
    g[20] = onCancel_2;
    g[21] = inputGuide;
    g[22] = onFocus;
    g[23] = onSelect;
    g[24] = ce;
    g[25] = ue;
    g[26] = flexDirection;
    g[27] = gap;
    g[28] = ke;
    g[29] = le;
  } else {
    v = g[11];
    P = g[12];
    _ = g[13];
    b = g[14];
    defaultFocusIndex_2 = g[15];
    B = g[16];
    N = g[17];
    title = g[18];
    subtitle = g[19];
    onCancel_2 = g[20];
    inputGuide = g[21];
    onFocus = g[22];
    onSelect = g[23];
    ce = g[24];
    ue = g[25];
    flexDirection = g[26];
    gap = g[27];
    ke = g[28];
    le = g[29];
  }
  let me;
  if (g[42] !== b.length || g[43] !== onDecideCloudHooks) {
    me = (b.length > 0 || onDecideCloudHooks) && jsxProd_default(merged.Heading, {}, "events-gap");
    g[42] = b.length;
    g[43] = onDecideCloudHooks;
    g[44] = me;
  } else me = g[44];
  let ie;
  if (g[45] === MEMO_CACHE_SENTINEL) {
    ie = jsxProd_default(
      merged.Item,
      {
        children: jsxProd_default(AllEventsLabel, {}),
      },
      "events",
    );
    g[45] = ie;
  } else ie = g[45];
  let V;
  if (
    g[46] !== v ||
    g[47] !== defaultFocusIndex_2 ||
    g[48] !== me ||
    g[49] !== onFocus ||
    g[50] !== onSelect ||
    g[51] !== ce ||
    g[52] !== ue
  ) {
    V = jsxProd_default_2(v, {
      defaultFocusIndex: defaultFocusIndex_2,
      onFocus,
      onSelect,
      children: [ce, ue, me, ie],
    });
    g[46] = v;
    g[47] = defaultFocusIndex_2;
    g[48] = me;
    g[49] = onFocus;
    g[50] = onSelect;
    g[51] = ce;
    g[52] = ue;
    g[53] = V;
  } else V = g[53];
  let children;
  if (
    g[54] !== P ||
    g[55] !== B ||
    g[56] !== N ||
    g[57] !== V ||
    g[58] !== flexDirection ||
    g[59] !== gap ||
    g[60] !== ke ||
    g[61] !== le
  ) {
    children = jsxProd_default_2(P, {
      flexDirection,
      gap,
      children: [ke, le, B, N, V],
    });
    g[54] = P;
    g[55] = B;
    g[56] = N;
    g[57] = V;
    g[58] = flexDirection;
    g[59] = gap;
    g[60] = ke;
    g[61] = le;
    g[62] = children;
  } else children = g[62];
  let je;
  if (
    g[63] !== _ ||
    g[64] !== title ||
    g[65] !== subtitle ||
    g[66] !== onCancel_2 ||
    g[67] !== inputGuide ||
    g[68] !== children
  ) {
    je = jsxProd_default(_, {
      title,
      subtitle,
      onCancel: onCancel_2,
      inputGuide,
      children,
    });
    g[63] = _;
    g[64] = title;
    g[65] = subtitle;
    g[66] = onCancel_2;
    g[67] = inputGuide;
    g[68] = children;
    g[69] = je;
  } else je = g[69];
  return je;
}
//@ chunk-bajxb7bf.js:40626-40776 placement
function AllEventsLabel() {
  let h = w(2);
  const color = isMenuOpen() ? "suggestion" : undefined;
  let i;
  if (h[0] !== color) {
    i = jsxProd_default(Text, {
      color,
      children: "All events",
    });
    h[0] = color;
    h[1] = i;
  } else i = h[1];
  return i;
}
export { useEnterEscape, buildCloudHookRows, renderCloudSessionBadge, HooksOverview, describeWhereHookRuns };
