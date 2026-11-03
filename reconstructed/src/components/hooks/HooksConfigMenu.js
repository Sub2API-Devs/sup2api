/**
 * components/hooks/HooksConfigMenu.tsx
 *
 * /hooks 菜单：按事件 → 匹配器 → hook 三级浏览已配置的 hooks（只读，提示编辑 settings.json），区分来源与远程会话可用性。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/hooks/HooksConfigMenu.tsx
 * pieces: chunk-bajxb7bf.js (10)
 * attribution: sole-consumer 5, callgraph-fingerprint 1, file-local 2, affinity 1, fingerprint 1
 */
import { getSettings_DEPRECATED, getSettingsForSource } from "../../utils/settings/settings.js";
import { Ei, SelectHookMode } from "./SelectHookMode.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { getCaps, getOriginalCwd } from "../../bootstrap/state.js";
import { deviceHooksProcessMemories } from "../../utils/hooks/deviceHooks/cloudRegistration.js";
import {
  buildCloudHookRows,
  renderCloudSessionBadge,
  HooksOverview,
  describeWhereHookRuns,
} from "./cloudHooks.js";
import { kJe, useAppState, useSessionHooksRegistry } from "../../state/AppState.js";
import {
  getHookEventMetadata,
  groupHooksByEventAndMatcher,
  getSortedMatchersForEvent,
  Dyo,
} from "../../utils/hooks/hooksConfigManager.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { count } from "../../utils/collections.js";
import { plural } from "../../utils/stringUtils.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Text, Box } from "../../ink/components/Text.js";
import { hasPolicySettings } from "../../utils/plugins/managedPluginSeating.js";
import { Dialog } from "../design-system/Dialog.js";
import { isSafeMode, getSafeModeExitHint } from "../../utils/envUtils.js";
import { SelectEventMode } from "./SelectEventMode.js";
import { hr } from "../../utils/invisibleChars.js";
import {
  $Ne,
  zVo,
  emitConsentChangedSafe,
  writeDeviceHooksConsent,
  readDeviceHooksConsent,
} from "../../utils/hooks/deviceHooks/consent.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { SelectMatcherMode } from "./SelectMatcherMode.js";
import { ViewHookMode } from "./ViewHookMode.js";

//@ chunk-bajxb7bf.js:48218-48310 sole-consumer = _temp (1)
function fi() {
  return (
    getSettings_DEPRECATED()?.disableAllHooks === !0 &&
    getSettingsForSource("policySettings")?.disableAllHooks === !0
  );
}
//@ chunk-bajxb7bf.js:48310-48380 sole-consumer = _temp2 (1)
function ki() {
  return getSettingsForSource("policySettings")?.allowManagedHooksOnly === !0;
}
//@ chunk-bajxb7bf.js:48380-48410 callgraph-fingerprint = _temp3 (1)
function selectMcp(s) {
  return s.mcp;
}
//@ chunk-bajxb7bf.js:48410-48441 file-local
function vi(tool) {
  return tool.name;
}
//@ chunk-bajxb7bf.js:48441-48480 file-local
function yi(sum, hooks) {
  return sum + hooks.length;
}
//@ chunk-bajxb7bf.js:48563-48613 sole-consumer
function wi(Wi) {
  return Object.values(Wi).some(Ei);
}
//@ chunk-bajxb7bf.js:48613-48654 sole-consumer
function Si(ji) {
  return ji.where === "here";
}
//@ chunk-bajxb7bf.js:48654-48696 sole-consumer
function Hi(Oi) {
  return Oi.where === "cloud";
}
//@ chunk-bajxb7bf.js:48696-48728 affinity
function Ci(Ui) {
  return Ui.label;
}
/**
 * /hooks 菜单：选择事件 → 匹配器 → hook → 详情；hooks 来自 user/project/local/policy/插件/会话，远程会话中标注哪些不会运行；只读，提示通过编辑 settings.json 或让 Claude 修改。
 */
//@ chunk-bajxb7bf.js:48728-57815 fingerprint = HooksConfigMenu (0.495)
function HooksConfigMenu(t0) {
  let $ = w(133),
    { toolNames: toolNames, onExit: onExit } = t0,
    d;
  if ($[0] === MEMO_CACHE_SENTINEL) ((d = { mode: "list" }), ($[0] = d));
  else d = $[0];
  let [u, t] = y(d),
    [f, k] = y(0),
    { storageV5: storageV5 } = Me(),
    D = useHost(),
    M;
  if ($[1] !== D)
    ((M = () => {
      let g = getCaps();
      if (g.workspace !== "remote") {
        return null;
      }
      return g.transcriptSource !== "ccr-api"
        ? "remote_host"
        : deviceHooksProcessMemories.of(D).isAttached(getOriginalCwd())
          ? "cloud"
          : "off";
    }),
      ($[1] = D),
      ($[2] = M));
  else M = $[2];
  let [v] = y(M),
    P;
  if ($[3] !== v || $[4] !== D || $[5] !== storageV5)
    ((P = () => {
      if (v === null) {
        return null;
      }
      let of = deviceHooksProcessMemories.of(D);
      return buildCloudHookRows({
        launchDir: getOriginalCwd(),
        storageV5: storageV5,
        consentPin: of.consentPin,
        senderMemory: of.senderFor(getOriginalCwd()),
        processMemory: of,
        forwarding: v,
      });
    }),
      ($[3] = v),
      ($[4] = D),
      ($[5] = storageV5),
      ($[6] = P));
  else P = $[6];
  let b = P,
    [E, B] = y(b),
    [N, L] = y(null),
    [x, Y] = y(fi),
    [W, X] = y(ki),
    ne;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((ne = (source) => {
      if (source === "policySettings") {
        let ue = getSettings_DEPRECATED()?.disableAllHooks === !0;
        (Y(ue && getSettingsForSource("policySettings")?.disableAllHooks === !0),
          X(getSettingsForSource("policySettings")?.allowManagedHooksOnly === !0));
      }
    }),
      ($[7] = ne));
  else ne = $[7];
  kJe(ne);
  let mode = u.mode,
    se = "event" in u ? u.event : "PreToolUse",
    ke = "matcher" in u ? u.matcher : null,
    mcp = useAppState(selectMcp),
    appStateStore = useSessionHooksRegistry(),
    ie;
  if ($[8] !== mcp.tools || $[9] !== toolNames)
    ((ie = [...toolNames, ...mcp.tools.map(vi)]), ($[8] = mcp.tools), ($[9] = toolNames), ($[10] = ie));
  else ie = $[10];
  let V = ie,
    Le;
  if ($[11] !== V) ((Le = getHookEventMetadata(V)), ($[11] = V), ($[12] = Le));
  else Le = $[12];
  let p = Le,
    J;
  if ($[13] !== V || $[14] !== appStateStore)
    ((J = groupHooksByEventAndMatcher(appStateStore, V)), ($[13] = V), ($[14] = appStateStore), ($[15] = J));
  else J = $[15];
  let U = J,
    ge;
  if ($[16] !== U || $[17] !== se)
    ((ge = getSortedMatchersForEvent(U, se)), ($[16] = U), ($[17] = se), ($[18] = ge));
  else ge = $[18];
  let I = ge,
    pe;
  if ($[19] !== U || $[20] !== se || $[21] !== ke)
    ((pe = Dyo(U, se, ke)), ($[19] = U), ($[20] = se), ($[21] = ke), ($[22] = pe));
  else pe = $[22];
  let Se = pe,
    He;
  if ($[23] !== onExit)
    ((He = () => {
      onExit("Hooks dialog dismissed", { display: "system" });
    }),
      ($[23] = onExit),
      ($[24] = He));
  else He = $[24];
  let he = He;
  const xe = mode === "list";
  let Mo;
  if ($[25] !== xe) ((Mo = { context: "Confirmation", isActive: xe }), ($[25] = xe), ($[26] = Mo));
  else Mo = $[26];
  useKeybinding("confirm:no", he, Mo);
  let Ce;
  if ($[27] === MEMO_CACHE_SENTINEL)
    ((Ce = () => {
      t({ mode: "list" });
    }),
      ($[27] = Ce));
  else Ce = $[27];
  const ao = mode === "select-event";
  let We;
  if ($[28] !== ao) ((We = { context: "Confirmation", isActive: ao }), ($[28] = ao), ($[29] = We));
  else We = $[29];
  useKeybinding("confirm:no", Ce, We);
  let je;
  if ($[30] === MEMO_CACHE_SENTINEL)
    ((je = () => {
      t({ mode: "select-event" });
    }),
      ($[30] = je));
  else je = $[30];
  const co = mode === "select-matcher";
  let vt;
  if ($[31] !== co) ((vt = { context: "Confirmation", isActive: co }), ($[31] = co), ($[32] = vt));
  else vt = $[32];
  useKeybinding("confirm:no", je, vt);
  let Wn;
  if ($[33] !== p || $[34] !== u)
    ((Wn = () => {
      if ("event" in u) {
        if (p[u.event].matcherMetadata !== void 0) t({ mode: "select-matcher", event: u.event });
        else t({ mode: "select-event" });
      }
    }),
      ($[33] = p),
      ($[34] = u),
      ($[35] = Wn));
  else Wn = $[35];
  const yt = mode === "select-hook";
  let jn;
  if ($[36] !== yt) ((jn = { context: "Confirmation", isActive: yt }), ($[36] = yt), ($[37] = jn));
  else jn = $[37];
  useKeybinding("confirm:no", Wn, jn);
  let On;
  if ($[38] !== p || $[39] !== u)
    ((On = () => {
      if (u.mode !== "view-hook") {
        return;
      }
      let { event: event, hook: hook, from: from } = u;
      if (from === "list") {
        t({ mode: "list" });
        return;
      }
      let Mi = p[event].matcherMetadata !== void 0;
      t({ mode: "select-hook", event: event, matcher: Mi ? hook.matcher || "" : "" });
    }),
      ($[38] = p),
      ($[39] = u),
      ($[40] = On));
  else On = $[40];
  let Po = On;
  const wt = mode === "view-hook";
  let Gn;
  if ($[41] !== wt) ((Gn = { context: "Confirmation", isActive: wt }), ($[41] = wt), ($[42] = Gn));
  else Gn = $[42];
  useKeybinding("confirm:no", Po, Gn);
  let zn;
  if ($[43] === MEMO_CACHE_SENTINEL) ((zn = getSettings_DEPRECATED()), ($[43] = zn));
  else zn = $[43];
  let Yn = zn?.disableAllHooks === !0,
    Vn;
  if ($[44] !== U) {
    let byEvent = {};
    let total = 0;
    for (const [Pi, _i] of Object.entries(U)) {
      let eventCount = Object.values(_i).reduce(yi, 0);
      ((byEvent[Pi] = eventCount), (total = total + eventCount));
    }
    Vn = { hooksByEvent: byEvent, totalHooksCount: total };
    (($[44] = U), ($[45] = Vn));
  } else Vn = $[45];
  let { hooksByEvent: hooksByEvent, totalHooksCount: totalHooksCount } = Vn,
    any = Object.values(U).some(wi),
    Jn;
  if ($[46] !== v || $[47] !== E)
    ((Jn =
      E === null || v !== "cloud"
        ? void 0
        : () => {
            E.then((Oe) => {
              if (Oe.consent === "off" || Oe.consent === "remote_host") {
                return;
              }
              t((Ct) =>
                Ct.mode === "cloud-consent" || (Ct.mode !== "list" && !Yn)
                  ? Ct
                  : {
                      mode: "cloud-consent",
                      offer: { forwarded: count(Oe.rows, Si), templateNames: Oe.rows.filter(Hi).map(Ci) },
                      ...((Oe.consent === "accepted" || Oe.consent === "declined") && {
                        current: Oe.consent,
                      }),
                    },
              );
            });
          }),
      ($[46] = v),
      ($[47] = E),
      ($[48] = Jn));
  else Jn = $[48];
  let Ue = Jn;
  if (Yn && u.mode !== "cloud-consent") {
    let _o = x ? "disabled by your organization" : "disabled";
    let A;
    if ($[49] !== _o || $[50] !== totalHooksCount)
      ((A =
        totalHooksCount > 0
          ? `${_o} \xB7 ${totalHooksCount} ${plural(totalHooksCount, "hook")} not running`
          : _o),
        ($[49] = _o),
        ($[50] = totalHooksCount),
        ($[51] = A));
    else A = $[51];
    let z;
    if ($[52] === MEMO_CACHE_SENTINEL)
      ((z = e(KeyboardShortcutHint, { chord: "escape", action: "close" })), ($[52] = z));
    else z = $[52];
    let K;
    if ($[53] !== N || $[54] !== E || $[55] !== any)
      ((K =
        E !== null &&
        e(renderCloudSessionBadge, { summaryPromise: E, savedLine: N ?? void 0, hasPluginHooks: any })),
        ($[53] = N),
        ($[54] = E),
        ($[55] = any),
        ($[56] = K));
    else K = $[56];
    let oe;
    if ($[57] !== Ue || $[58] !== he)
      ((oe =
        Ue !== void 0 &&
        e(ModelSelector, {
          options: [
            {
              label: e(Text, {
                color: "suggestion",
                children: "Decide whether cloud sessions run this machine's hooks\u2026",
              }),
              value: "decide",
              description: "Saved for this machine; change the answer here any time",
            },
          ],
          hideIndexes: !0,
          onChange: () => Ue(),
          onCancel: he,
        })),
        ($[57] = Ue),
        ($[58] = he),
        ($[59] = oe));
    else oe = $[59];
    let ye;
    if ($[60] !== x)
      ((ye = !x && hasPolicySettings() && " Hooks set by your organization still run."),
        ($[60] = x),
        ($[61] = ye));
    else ye = $[61];
    let Ge;
    if ($[62] !== ye)
      ((Ge = r(Text, {
        children: [
          "While hooks are disabled no hook command runs, the status line isn't shown, and tools run without hook checks.",
          ye,
        ],
      })),
        ($[62] = ye),
        ($[63] = Ge));
    else Ge = $[63];
    let Io;
    if ($[64] !== x)
      ((Io =
        !x &&
        e(Text, {
          dimColor: !0,
          children: 'To turn hooks back on, remove "disableAllHooks" from settings.json or ask Claude.',
        })),
        ($[64] = x),
        ($[65] = Io));
    else Io = $[65];
    let Do;
    if ($[66] !== K || $[67] !== oe || $[68] !== Ge || $[69] !== Io)
      ((Do = r(Box, { flexDirection: "column", gap: 1, children: [K, oe, Ge, Io] })),
        ($[66] = K),
        ($[67] = oe),
        ($[68] = Ge),
        ($[69] = Io),
        ($[70] = Do));
    else Do = $[70];
    let Qn;
    if ($[71] !== he || $[72] !== A || $[73] !== Do)
      ((Qn = e(Dialog, { title: "Hooks", subtitle: A, onCancel: he, inputGuide: z, children: Do })),
        ($[71] = he),
        ($[72] = A),
        ($[73] = Do),
        ($[74] = Qn));
    else Qn = $[74];
    return Qn;
  }
  switch (u.mode) {
    case "list": {
      let A;
      if ($[75] === MEMO_CACHE_SENTINEL)
        ((A = isSafeMode()
          ? { exitHint: getSafeModeExitHint(), managedHooksStillApply: hasPolicySettings() }
          : void 0),
          ($[75] = A));
      else A = $[75];
      let z;
      if ($[76] !== N || $[77] !== E || $[78] !== any)
        ((z =
          E === null
            ? void 0
            : e(renderCloudSessionBadge, { summaryPromise: E, savedLine: N ?? void 0, hasPluginHooks: any })),
          ($[76] = N),
          ($[77] = E),
          ($[78] = any),
          ($[79] = z));
      else z = $[79];
      let K, oe;
      if ($[80] === MEMO_CACHE_SENTINEL)
        ((K = (Zn) => {
          t({ mode: "view-hook", event: Zn.event, hook: Zn, from: "list" });
        }),
          (oe = () => {
            t({ mode: "select-event" });
          }),
          ($[80] = K),
          ($[81] = oe));
      else ((K = $[80]), (oe = $[81]));
      let ye;
      if (
        $[82] !== Ue ||
        $[83] !== he ||
        $[84] !== p ||
        $[85] !== U ||
        $[86] !== f ||
        $[87] !== W ||
        $[88] !== z
      )
        ((ye = e(HooksOverview, {
          hookEventMetadata: p,
          hooksByEventAndMatcher: U,
          restrictedByPolicy: W,
          suspendedBySafeMode: A,
          cloudSessionPanel: z,
          onDecideCloudHooks: Ue,
          defaultFocusIndex: f,
          onFocusRow: k,
          onSelectHook: K,
          onOpenEvents: oe,
          onCancel: he,
        })),
          ($[82] = Ue),
          ($[83] = he),
          ($[84] = p),
          ($[85] = U),
          ($[86] = f),
          ($[87] = W),
          ($[88] = z),
          ($[89] = ye));
      else ye = $[89];
      return ye;
    }
    case "select-event": {
      let A;
      if ($[90] !== p)
        ((A = (bt) => {
          if (p[bt].matcherMetadata !== void 0) t({ mode: "select-matcher", event: bt });
          else t({ mode: "select-hook", event: bt, matcher: "" });
        }),
          ($[90] = p),
          ($[91] = A));
      else A = $[91];
      let z;
      if ($[92] === MEMO_CACHE_SENTINEL)
        ((z = () => {
          t({ mode: "list" });
        }),
          ($[92] = z));
      else z = $[92];
      let K;
      if ($[93] !== p || $[94] !== hooksByEvent || $[95] !== A)
        ((K = e(SelectEventMode, {
          hookEventMetadata: p,
          hooksByEvent: hooksByEvent,
          onSelectEvent: A,
          onCancel: z,
        })),
          ($[93] = p),
          ($[94] = hooksByEvent),
          ($[95] = A),
          ($[96] = K));
      else K = $[96];
      return K;
    }
    case "cloud-consent": {
      const forwarded = u.offer.forwarded;
      const templateNames = u.offer.templateNames;
      const K = u.current;
      let oe;
      if ($[97] === MEMO_CACHE_SENTINEL) ((oe = hr($Ne())), ($[97] = oe));
      else oe = $[97];
      let ye;
      if ($[98] !== D || $[99] !== b || $[100] !== storageV5)
        ((ye = (event_2) => {
          if (
            (t({ mode: "list" }),
            logEvent("tengu_device_hooks_consent", { choice: fromEnum(event_2) }),
            event_2 === "not_now")
          ) {
            return;
          }
          let of = deviceHooksProcessMemories.of(D);
          (zVo(of.consentPin, event_2),
            emitConsentChangedSafe(of.consentAnnounced, event_2),
            writeDeviceHooksConsent(event_2, readDeviceHooksConsent(storageV5)).then((Ii) => {
              (L(
                `${Ii ? "Saved" : "For this session only (the answer could not be written to disk)"}: ${event_2 === "accepted" ? "cloud sessions started from this machine may run its hooks" : "this machine's hooks stay on this machine"}.`,
              ),
                B(b()));
            }));
        }),
          ($[98] = D),
          ($[99] = b),
          ($[100] = storageV5),
          ($[101] = ye));
      else ye = $[101];
      let Ge;
      if (
        $[102] !== u.current ||
        $[103] !== u.offer.forwarded ||
        $[104] !== u.offer.templateNames ||
        $[105] !== oe ||
        $[106] !== ye
      )
        ((Ge = e(describeWhereHookRuns, {
          forwarded: forwarded,
          templateNames: templateNames,
          current: K,
          consentLocation: oe,
          onDone: ye,
        })),
          ($[102] = u.current),
          ($[103] = u.offer.forwarded),
          ($[104] = u.offer.templateNames),
          ($[105] = oe),
          ($[106] = ye),
          ($[107] = Ge));
      else Ge = $[107];
      return Ge;
    }
    case "select-matcher": {
      const A = p[u.event];
      let z;
      if ($[108] !== u.event)
        ((z = (matcher) => {
          t({ mode: "select-hook", event: u.event, matcher: matcher });
        }),
          ($[108] = u.event),
          ($[109] = z));
      else z = $[109];
      let K;
      if ($[110] === MEMO_CACHE_SENTINEL)
        ((K = () => {
          t({ mode: "select-event" });
        }),
          ($[110] = K));
      else K = $[110];
      let oe;
      if ($[111] !== U || $[112] !== u.event || $[113] !== I || $[114] !== A.description || $[115] !== z)
        ((oe = e(SelectMatcherMode, {
          selectedEvent: u.event,
          matchersForSelectedEvent: I,
          hooksByEventAndMatcher: U,
          eventDescription: A.description,
          onSelect: z,
          onCancel: K,
        })),
          ($[111] = U),
          ($[112] = u.event),
          ($[113] = I),
          ($[114] = A.description),
          ($[115] = z),
          ($[116] = oe));
      else oe = $[116];
      return oe;
    }
    case "select-hook": {
      const A = p[u.event];
      let z;
      if ($[117] !== u.event)
        ((z = (hook_1) => {
          t({ mode: "view-hook", event: u.event, hook: hook_1, from: "events" });
        }),
          ($[117] = u.event),
          ($[118] = z));
      else z = $[118];
      let K;
      if ($[119] !== p || $[120] !== u.event)
        ((K = () => {
          if (p[u.event].matcherMetadata !== void 0) t({ mode: "select-matcher", event: u.event });
          else t({ mode: "select-event" });
        }),
          ($[119] = p),
          ($[120] = u.event),
          ($[121] = K));
      else K = $[121];
      let oe;
      if (
        $[122] !== Se ||
        $[123] !== u.event ||
        $[124] !== u.matcher ||
        $[125] !== A ||
        $[126] !== z ||
        $[127] !== K
      )
        ((oe = e(SelectHookMode, {
          selectedEvent: u.event,
          selectedMatcher: u.matcher,
          hooksForSelectedMatcher: Se,
          hookEventMetadata: A,
          onSelect: z,
          onCancel: K,
        })),
          ($[122] = Se),
          ($[123] = u.event),
          ($[124] = u.matcher),
          ($[125] = A),
          ($[126] = z),
          ($[127] = K),
          ($[128] = oe));
      else oe = $[128];
      return oe;
    }
    case "view-hook": {
      const A = p[u.event].matcherMetadata !== void 0;
      let z;
      if ($[129] !== Po || $[130] !== u.hook || $[131] !== A)
        ((z = e(ViewHookMode, { selectedHook: u.hook, eventSupportsMatcher: A, onCancel: Po })),
          ($[129] = Po),
          ($[130] = u.hook),
          ($[131] = A),
          ($[132] = z));
      else z = $[132];
      return z;
    }
  }
}

export { HooksConfigMenu };
