/**
 * components/RemoteEnvironmentDialog.tsx
 *
 * 远程（云）环境选择对话框：列出可用环境、设为默认。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/RemoteEnvironmentDialog.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-s61vbvea.js (1), chunk-zj31az9x.js (6)
 * attribution: sole-consumer 1, fingerprint 5, placement 1, layout 2
 */
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import {
  isSelfHostedPoolEnv,
  isSelfHostedPool,
  getEnvironmentSelectionInfo,
} from "../utils/teleport/environmentSelection.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { fetchEnvironmentsAndPools } from "../utils/teleport/selfHostedPool.js";
import { toError } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { getSettingSourceName } from "../utils/settings/constants.js";
import { sequential } from "../utils/sequential.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";
import { Dialog } from "./design-system/Dialog.js";
import { Text, Box } from "../ink/components/Text.js";
import { plural } from "../utils/stringUtils.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { merged } from "./CustomSelect/select.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { useDialogKeybindings } from "../keybindings/dialogKeyHints.js";

//@ chunk-zj31az9x.js:14567-14571 placement
j();
//@ chunk-zj31az9x.js:14571-14600 layout
function it(V) {
  return !isSelfHostedPoolEnv(V);
}
//@ chunk-zj31az9x.js:14600-14688 fingerprint = SETUP_HINT (0.667)
var p = "Select remote environment",
  G = "Configure environments at: https://claude.ai/code";
/**
 * 远程环境选择：拉取环境列表，单个时确认、多个时选择并可设为默认（userSettings）。
 */
//@ chunk-zj31az9x.js:14688-17534 fingerprint = RemoteEnvironmentDialog (0.465)
function RemoteEnvironmentDialog(t0) {
  let $ = w(35),
    { onDone: onDone } = t0,
    { storageV5: storageV5, credentials: credentials } = Me(),
    [v, g] = y("loading"),
    X;
  if ($[0] === MEMO_CACHE_SENTINEL) ((X = []), ($[0] = X));
  else X = $[0];
  let [f, h] = y(X),
    [x, H] = y(null),
    [B, M] = y(null),
    [a, F] = y(null),
    [c, z] = y(null),
    [E, K] = y(null),
    U,
    L;
  if ($[1] !== credentials || $[2] !== storageV5)
    ((U = () => {
      let C = !1;
      let fetchInfo = async function ue() {
        try {
          let T = await fetchEnvironmentsAndPools(storageV5, credentials);
          if (C) {
            return;
          }
          (h(T.availableTargets),
            H(T.selectedTarget),
            M(T.selectedTargetSource),
            F(T.environmentsError),
            z(T.ignoredUntrustedPool),
            g(null));
        } catch (t4) {
          let ae = t4;
          if (C) {
            return;
          }
          let fetchError = toError(ae);
          (logForDebugging(`Failed to fetch remote environments: ${fetchError.message}`, { level: "error" }),
            K(fetchError.message),
            g(null));
        }
      };
      return (
        fetchInfo(),
        () => {
          C = !0;
        }
      );
    }),
      (L = [credentials, storageV5]),
      ($[1] = credentials),
      ($[2] = storageV5),
      ($[3] = U),
      ($[4] = L));
  else ((U = $[3]), (L = $[4]));
  P(U, L);
  let k;
  if ($[5] !== onDone || $[6] !== storageV5 || $[7] !== f)
    ((k = function A(value) {
      if (value === "cancel") {
        onDone();
        return;
      }
      g("updating");
      let selectedEnv = f.find((env) => isSelfHostedPool(env) === value);
      if (!selectedEnv) {
        onDone("Error: Selected environment not found");
        return;
      }
      let xe =
        getSettingsForSourceForUpkeep("localSettings")?.remote?.defaultEnvironmentId !== void 0
          ? updateSettingsForSource(
              "localSettings",
              { remote: { defaultEnvironmentId: void 0 } },
              void 0,
              storageV5,
            )
          : Promise.resolve({ error: null });
      let fe = updateSettingsForSource(
        "userSettings",
        { remote: { defaultEnvironmentId: isSelfHostedPool(selectedEnv) } },
        void 0,
        storageV5,
      );
      let pe = isSelfHostedPoolEnv(selectedEnv) ? "self-hosted environment" : "remote environment";
      Promise.all([xe, fe]).then(() => {
        let V = getEnvironmentSelectionInfo();
        let st =
          V.id !== void 0 && V.id !== isSelfHostedPool(selectedEnv) && V.source !== void 0
            ? ` \u2014 note: ${getSettingSourceName(V.source)} settings pin ${V.id}, which takes precedence here`
            : "";
        onDone(
          `Set default ${pe} to ${sequential.bold(selectedEnv.name)} (${isSelfHostedPool(selectedEnv)})${st}`,
        );
      });
    }),
      ($[5] = onDone),
      ($[6] = storageV5),
      ($[7] = f),
      ($[8] = k));
  else k = $[8];
  let A = k;
  if (v === "loading") {
    let d;
    if ($[9] === MEMO_CACHE_SENTINEL)
      ((d = e(WorkerBadge, { message: "Loading environments\u2026" })), ($[9] = d));
    else d = $[9];
    let m;
    if ($[10] !== onDone)
      ((m = e(Dialog, { title: p, onCancel: onDone, hideInputGuide: !0, children: d })),
        ($[10] = onDone),
        ($[11] = m));
    else m = $[11];
    return m;
  }
  if (E) {
    let d;
    if ($[12] !== E) ((d = r(Text, { color: "error", children: ["Error: ", E] })), ($[12] = E), ($[13] = d));
    else d = $[13];
    let m;
    if ($[14] !== onDone || $[15] !== d)
      ((m = e(Dialog, { title: p, onCancel: onDone, children: d })),
        ($[14] = onDone),
        ($[15] = d),
        ($[16] = m));
    else m = $[16];
    return m;
  }
  if (!x) {
    let d;
    if ($[17] === MEMO_CACHE_SENTINEL)
      ((d = e(Text, { children: "No remote environments available." })), ($[17] = d));
    else d = $[17];
    let m;
    if ($[18] !== a)
      ((m = a && r(Text, { dimColor: !0, children: ["(couldn't list environments: ", a, ")"] })),
        ($[18] = a),
        ($[19] = m));
    else m = $[19];
    let ee;
    if ($[20] !== c)
      ((ee =
        c &&
        r(Text, {
          dimColor: !0,
          children: [
            "(ignoring self-hosted environment default ",
            c.id,
            " ",
            "from ",
            getSettingSourceName(c.source),
            " settings \u2014 self-hosted placement is only honoured from user/policy/flag settings)",
          ],
        })),
        ($[20] = c),
        ($[21] = ee));
    else ee = $[21];
    let Le;
    if ($[22] !== onDone || $[23] !== m || $[24] !== ee)
      ((Le = r(Dialog, { title: p, subtitle: G, onCancel: onDone, children: [d, m, ee] })),
        ($[22] = onDone),
        ($[23] = m),
        ($[24] = ee),
        ($[25] = Le));
    else Le = $[25];
    return Le;
  }
  let d;
  if (
    $[26] !== a ||
    $[27] !== A ||
    $[28] !== c ||
    $[29] !== v ||
    $[30] !== onDone ||
    $[31] !== x ||
    $[32] !== B ||
    $[33] !== f
  )
    ((d = e(MultipleEnvironmentsContent, {
      targets: f,
      selectedTarget: x,
      selectedTargetSource: B,
      environmentsError: a,
      ignoredUntrustedPool: c,
      loadingState: v,
      onSelect: A,
      onCancel: onDone,
    })),
      ($[26] = a),
      ($[27] = A),
      ($[28] = c),
      ($[29] = v),
      ($[30] = onDone),
      ($[31] = x),
      ($[32] = B),
      ($[33] = f),
      ($[34] = d));
  else d = $[34];
  return d;
}
//@ chunk-zj31az9x.js:17534-17749 layout
function renderEnvironmentItem(u, o) {
  let i = isSelfHostedPool(u),
    s = isSelfHostedPoolEnv(u) ? `${u.alive_runner_count} ${plural(u.alive_runner_count, "runner")}` : "";
  return e(
    OrderedListWithItem.Item,
    {
      label: u.name,
      icon: i === o ? e(StatusIcon, { status: "success", "aria-label": "current:" }) : void 0,
      meta: [s, i],
    },
    i,
  );
}
//@ chunk-zj31az9x.js:17749-19855 fingerprint = MultipleEnvironmentsContent (0.508)
function MultipleEnvironmentsContent(t0) {
  let $ = w(38),
    {
      targets: targets,
      selectedTarget: selectedTarget,
      selectedTargetSource: selectedTargetSource,
      environmentsError: environmentsError,
      ignoredUntrustedPool: ignoredUntrustedPool,
      loadingState: loadingState,
      onSelect: onSelect,
      onCancel: onCancel,
    } = t0,
    x;
  if ($[0] !== selectedTargetSource)
    ((x =
      selectedTargetSource && selectedTargetSource !== "userSettings"
        ? ` (from ${getSettingSourceName(selectedTargetSource)} settings)`
        : ""),
      ($[0] = selectedTargetSource),
      ($[1] = x));
  else x = $[1];
  let H = x,
    B;
  if ($[2] !== selectedTarget || $[3] !== selectedTargetSource || $[4] !== H)
    ((B = selectedTargetSource
      ? r(Text, { children: ["Currently using: ", e(Text, { bold: !0, children: selectedTarget.name }), H] })
      : "None of these is your default"),
      ($[2] = selectedTarget),
      ($[3] = selectedTargetSource),
      ($[4] = H),
      ($[5] = B));
  else B = $[5];
  let M = B,
    a,
    F,
    c,
    z,
    E,
    K,
    U,
    L,
    C;
  if (
    $[6] !== environmentsError ||
    $[7] !== ignoredUntrustedPool ||
    $[8] !== loadingState ||
    $[9] !== onCancel ||
    $[10] !== onSelect ||
    $[11] !== selectedTarget ||
    $[12] !== selectedTargetSource ||
    $[13] !== M ||
    $[14] !== targets
  ) {
    let filtered = targets.filter(it);
    let filtered_2 = targets.filter(isSelfHostedPoolEnv);
    let ae = [...filtered, ...filtered_2];
    let Q = selectedTargetSource ? isSelfHostedPool(selectedTarget) : void 0;
    a = Dialog;
    c = p;
    z = M;
    E = onCancel;
    K = !0;
    if ($[24] === MEMO_CACHE_SENTINEL) ((U = e(Text, { dimColor: !0, children: G })), ($[24] = U));
    else U = $[24];
    L =
      environmentsError &&
      filtered.length === 0 &&
      r(Text, { dimColor: !0, children: ["(couldn't list environments: ", environmentsError, ")"] });
    if ($[25] !== ignoredUntrustedPool)
      ((C =
        ignoredUntrustedPool &&
        r(Text, {
          dimColor: !0,
          children: [
            "(ignoring self-hosted environment default ",
            ignoredUntrustedPool.id,
            " ",
            "from ",
            getSettingSourceName(ignoredUntrustedPool.source),
            " settings \u2014 self-hosted placement is only honoured from user/policy/flag settings)",
          ],
        })),
        ($[25] = ignoredUntrustedPool),
        ($[26] = C));
    else C = $[26];
    F =
      loadingState === "updating"
        ? e(WorkerBadge, { message: "Updating\u2026" })
        : r(OrderedListWithItem, {
            defaultFocusIndex: ae.findIndex((ue) => isSelfHostedPool(ue) === Q),
            onSelect: (ge) => {
              let me = ae[ge];
              if (me) onSelect(isSelfHostedPool(me));
            },
            children: [
              filtered.map((D) => renderEnvironmentItem(D, Q)),
              filtered_2.length > 0
                ? e(merged.Heading, {
                    children: e(Text, { dimColor: !0, children: "\u2014 Self-hosted environments \u2014" }),
                  })
                : null,
              filtered_2.map((xe) => renderEnvironmentItem(xe, Q)),
            ],
          });
    (($[6] = environmentsError),
      ($[7] = ignoredUntrustedPool),
      ($[8] = loadingState),
      ($[9] = onCancel),
      ($[10] = onSelect),
      ($[11] = selectedTarget),
      ($[12] = selectedTargetSource),
      ($[13] = M),
      ($[14] = targets),
      ($[15] = a),
      ($[16] = F),
      ($[17] = c),
      ($[18] = z),
      ($[19] = E),
      ($[20] = K),
      ($[21] = U),
      ($[22] = L),
      ($[23] = C));
  } else
    ((a = $[15]),
      (F = $[16]),
      (c = $[17]),
      (z = $[18]),
      (E = $[19]),
      (K = $[20]),
      (U = $[21]),
      (L = $[22]),
      (C = $[23]));
  let fe;
  if ($[27] === MEMO_CACHE_SENTINEL)
    ((fe = e(Text, {
      dimColor: !0,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
          e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "cancel",
          }),
        ],
      }),
    })),
      ($[27] = fe));
  else fe = $[27];
  let pe;
  if (
    $[28] !== a ||
    $[29] !== F ||
    $[30] !== c ||
    $[31] !== z ||
    $[32] !== E ||
    $[33] !== K ||
    $[34] !== U ||
    $[35] !== L ||
    $[36] !== C
  )
    ((pe = r(a, { title: c, subtitle: z, onCancel: E, hideInputGuide: K, children: [U, L, C, F, fe] })),
      ($[28] = a),
      ($[29] = F),
      ($[30] = c),
      ($[31] = z),
      ($[32] = E),
      ($[33] = K),
      ($[34] = U),
      ($[35] = L),
      ($[36] = C),
      ($[37] = pe));
  else pe = $[37];
  return pe;
}
//@ chunk-18hwfzwa.js:1100666-1100715 sole-consumer
function Rwo(rt, kt) {
  return e(Text, { children: rt }, kt);
}
//@ chunk-18hwfzwa.js:1100715-1101521 fingerprint = SingleEnvironmentContent (0.394)
function SingleEnvironmentContent(t0) {
  let $ = w(17),
    { title: title, paragraphs: paragraphs, onDone: onDone } = t0,
    ke,
    Re;
  if ($[0] !== onDone)
    ((ke = () => onDone("interrupt")),
      (Re = () => (onDone("interrupt"), !0)),
      ($[0] = onDone),
      ($[1] = ke),
      ($[2] = Re));
  else ((ke = $[1]), (Re = $[2]));
  let Be;
  if ($[3] !== onDone)
    ((Be = [{ action: "confirm:yes", hint: "continue", run: () => onDone("continue") }]),
      ($[3] = onDone),
      ($[4] = Be));
  else Be = $[4];
  let He;
  if ($[5] !== paragraphs) ((He = paragraphs.map(Rwo)), ($[5] = paragraphs), ($[6] = He));
  else He = $[6];
  let We;
  if ($[7] !== He)
    ((We = e(Box, { flexDirection: "column", gap: 1, children: He })), ($[7] = He), ($[8] = We));
  else We = $[8];
  let ze;
  if ($[9] !== Be || $[10] !== We)
    ((ze = e(useDialogKeybindings, { scope: "Confirmation", claimFocus: !0, bindings: Be, children: We })),
      ($[9] = Be),
      ($[10] = We),
      ($[11] = ze));
  else ze = $[11];
  let Xe;
  if ($[12] !== ke || $[13] !== Re || $[14] !== ze || $[15] !== title)
    ((Xe = e(Dialog, { title: title, onCancel: ke, onInterrupt: Re, children: ze })),
      ($[12] = ke),
      ($[13] = Re),
      ($[14] = ze),
      ($[15] = title),
      ($[16] = Xe));
  else Xe = $[16];
  return Xe;
}
/**
 * 本地会话的计算机与目录是否一致。
 */
//@ chunk-s61vbvea.js:589975-590211 fingerprint = _temp (0.491)
function isSameLocalFolder(e, n) {
  let at = e.path
    .split(/[\\/]+/)
    .filter(Boolean)
    .at(-1);
  return (
    typeof n.computer_name === "string" &&
    typeof n.folder === "string" &&
    typeof n.environment_id === "string" &&
    n.computer_name === e.computer_name &&
    at !== void 0 &&
    at === n.folder
  );
}

export { isSameLocalFolder, SingleEnvironmentContent, RemoteEnvironmentDialog };
