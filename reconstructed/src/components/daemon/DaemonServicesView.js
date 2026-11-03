/**
 * components/daemon/DaemonServicesView.tsx
 *
 * 2.1.316 新增：后台守护进程服务列表视图
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b7gstm5r.js (10)
 * attribution: placement 10
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import {
  consentSelectAction,
  SERVICE_KIND_LABELS,
  loadDaemonOverview,
  DaemonSetupFlow,
  modelSelectOptions,
} from "./UnattendedConsentSelect.js";
import { Box, Text } from "../../ink/components/Text.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { HintText } from "../design-system/HintText.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { DevBar } from "../DevBar.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { ListItem } from "../design-system/ListItem.js";
import { cronToHuman, parseCronExpression, computeNextCronRun } from "../../utils/cron.js";
import { formatRelativeTime, truncateStartToWidth } from "../../utils/format.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { plural } from "../../utils/stringUtils.js";

/**
 * 后台守护进程服务列表视图：定时任务与常驻服务两类，可选择、新建、操作。
 */
//@ chunk-b7gstm5r.js:25608-29460 placement
function DaemonServicesView(a) {
  let g = w(72),
    {
      kind: kind,
      data: o,
      now: now,
      busy: busy,
      message: message,
      onSelect: onSelect,
      onAddNew: onAddNew,
      onService: onService,
      onUnattendedServing: onUnattendedServing,
      unattendedNotice: unattendedNotice,
      onCancel: onCancel,
    } = a,
    { headerFocused: headerFocused, focusHeader: focusHeader } = useTabHeaderFocus(),
    m = kind === "scheduled" ? o.tasks : o.servers,
    D = getServiceActions(o),
    C = m.length,
    F = kind === "remoteControl" && o.unattendedServing.visible,
    U = F ? C + 1 : -1,
    B = C + 1 + (F ? 1 : 0),
    A = B + D.length,
    [c, te] = y(0),
    L,
    W;
  if (g[0] !== c || g[1] !== A)
    ((L = () => {
      if (c >= A) te(Math.max(0, A - 1));
    }),
      (W = [A, c]),
      (g[0] = c),
      (g[1] = A),
      (g[2] = L),
      (g[3] = W));
  else ((L = g[2]), (W = g[3]));
  P(L, W);
  let z;
  if (g[4] !== focusHeader || g[5] !== c)
    ((z = () => {
      if (c === 0) focusHeader();
      else te(c - 1);
    }),
      (g[4] = focusHeader),
      (g[5] = c),
      (g[6] = z));
  else z = g[6];
  let J;
  if (g[7] !== c || g[8] !== A) ((J = () => te(Math.min(A - 1, c + 1))), (g[7] = c), (g[8] = A), (g[9] = J));
  else J = g[9];
  const Y = !headerFocused;
  let ce;
  if (g[10] !== Y) ((ce = { context: "Select", isActive: Y }), (g[10] = Y), (g[11] = ce));
  else ce = g[11];
  MessageActionsKeybindings(
    {
      "select:previous": z,
      "select:next": J,
      "select:accept": () => {
        if (busy) {
          return;
        }
        if (c < m.length) onSelect(m[c]);
        else if (c === C) onAddNew();
        else if (c === U) onUnattendedServing();
        else onService(D[c - B]);
      },
      "select:cancel": onCancel,
    },
    ce,
  );
  let h;
  if (g[12] !== o || g[13] !== m || g[14] !== kind || g[15] !== now)
    ((h = serviceTableColumns(kind, m, o, now)),
      (g[12] = o),
      (g[13] = m),
      (g[14] = kind),
      (g[15] = now),
      (g[16] = h));
  else h = g[16];
  let x = h,
    ge =
      !headerFocused && c === U
        ? consentSelectAction(o.unattendedServing) === "none"
          ? null
          : "change"
        : "select";
  const ke = Box,
    Vt = "column",
    Me = "  " + x.header;
  let ne;
  if (g[17] !== Me) ((ne = e(Text, { dimColor: !0, children: Me })), (g[17] = Me), (g[18] = ne));
  else ne = g[18];
  let Ce;
  if (g[19] !== m.length || g[20] !== kind)
    ((Ce = m.length === 0 && e(HintText, { children: `  (no ${SERVICE_KIND_LABELS[kind]}s)` })),
      (g[19] = m.length),
      (g[20] = kind),
      (g[21] = Ce));
  else Ce = g[21];
  let E;
  if (g[22] !== m || g[23] !== c || g[24] !== headerFocused || g[25] !== x.keys || g[26] !== x.rows) {
    let X;
    if (g[28] !== c || g[29] !== headerFocused || g[30] !== x.keys || g[31] !== x.rows)
      ((X = (In, K) => {
        let oe = !headerFocused && c === K;
        return r(
          Box,
          {
            children: [
              r(Text, { color: oe ? "suggestion" : void 0, children: [oe ? re.pointer : " ", " "] }),
              e(Text, { bold: oe, children: x.rows[K].text }),
              x.rows[K].suffix,
            ],
          },
          x.keys[K],
        );
      }),
        (g[28] = c),
        (g[29] = headerFocused),
        (g[30] = x.keys),
        (g[31] = x.rows),
        (g[32] = X));
    else X = g[32];
    E = m.map(X);
    ((g[22] = m), (g[23] = c), (g[24] = headerFocused), (g[25] = x.keys), (g[26] = x.rows), (g[27] = E));
  } else E = g[27];
  const X = !headerFocused && c === C,
    le = `+ Add new ${SERVICE_KIND_LABELS[kind]}\u2026`;
  let he;
  if (g[33] !== X || g[34] !== le)
    ((he = e(Box, { marginTop: 1, children: e(TabLabel, { isFocused: X, label: le }) })),
      (g[33] = X),
      (g[34] = le),
      (g[35] = he));
  else he = g[35];
  let ae;
  if (
    g[36] !== o.unattendedServing ||
    g[37] !== c ||
    g[38] !== headerFocused ||
    g[39] !== F ||
    g[40] !== U ||
    g[41] !== unattendedNotice
  )
    ((ae =
      F &&
      e(DevBar, {
        state: o.unattendedServing,
        isFocused: !headerFocused && c === U,
        notice: unattendedNotice,
      })),
      (g[36] = o.unattendedServing),
      (g[37] = c),
      (g[38] = headerFocused),
      (g[39] = F),
      (g[40] = U),
      (g[41] = unattendedNotice),
      (g[42] = ae));
  else ae = g[42];
  const Re = Box,
    Lt = 1,
    An = "column",
    Bn = "single",
    Pn = !1,
    On = !1,
    Mn = !1,
    Vn = !0;
  let Ht, $t;
  if (g[43] === MEMO_CACHE_SENTINEL)
    ((Ht = e(Text, { bold: !0, children: "Daemon service" })),
      ($t = e(Text, { dimColor: !0, children: " \xB7 " })),
      (g[43] = Ht),
      (g[44] = $t));
  else ((Ht = g[43]), ($t = g[44]));
  const st = busy ? "working\u2026" : message;
  let Ve;
  if (g[45] !== o || g[46] !== st)
    ((Ve = r(Box, { children: [Ht, $t, e(DaemonServiceDetail, { data: o, message: st })] })),
      (g[45] = o),
      (g[46] = st),
      (g[47] = Ve));
  else Ve = g[47];
  let Et;
  if (g[48] !== c || g[49] !== headerFocused || g[50] !== B)
    ((Et = (dt, Ln) =>
      e(
        TabLabel,
        {
          isFocused: !headerFocused && c === B + Ln,
          label: At[dt],
          color: dt === "uninstall" ? "error" : void 0,
        },
        dt,
      )),
      (g[48] = c),
      (g[49] = headerFocused),
      (g[50] = B),
      (g[51] = Et));
  else Et = g[51];
  const mapped = D.map(Et);
  let Le;
  if (g[52] !== Re || g[53] !== Ve || g[54] !== mapped)
    ((Le = r(Re, {
      marginTop: Lt,
      flexDirection: An,
      borderStyle: Bn,
      borderBottom: Pn,
      borderLeft: On,
      borderRight: Mn,
      borderDimColor: Vn,
      children: [Ve, mapped],
    })),
      (g[52] = Re),
      (g[53] = Ve),
      (g[54] = mapped),
      (g[55] = Le));
  else Le = g[55];
  let Kt;
  if (g[56] === MEMO_CACHE_SENTINEL)
    ((Kt = e(KeyboardShortcutHint, { chord: ["left", "right"], action: "tabs" })), (g[56] = Kt));
  else Kt = g[56];
  let Wt;
  if (g[57] === MEMO_CACHE_SENTINEL)
    ((Wt = e(KeyboardShortcutHint, { chord: ["up", "down"], action: "move" })), (g[57] = Wt));
  else Wt = g[57];
  let He;
  if (g[58] !== ge)
    ((He = ge !== null && e(KeyboardShortcutHint, { chord: "enter", action: ge })),
      (g[58] = ge),
      (g[59] = He));
  else He = g[59];
  let jt;
  if (g[60] === MEMO_CACHE_SENTINEL)
    ((jt = e(KeyboardShortcutHint, { chord: "escape", action: "close" })), (g[60] = jt));
  else jt = g[60];
  let $e;
  if (g[61] !== He)
    (($e = e(Box, {
      marginTop: 1,
      children: e(Text, { dimColor: !0, children: r(Byline, { children: [Kt, Wt, He, jt] }) }),
    })),
      (g[61] = He),
      (g[62] = $e));
  else $e = g[62];
  let Jt;
  if (
    g[63] !== ke ||
    g[64] !== ne ||
    g[65] !== Ce ||
    g[66] !== E ||
    g[67] !== he ||
    g[68] !== ae ||
    g[69] !== Le ||
    g[70] !== $e
  )
    ((Jt = r(ke, { flexDirection: Vt, children: [ne, Ce, E, he, ae, Le, $e] })),
      (g[63] = ke),
      (g[64] = ne),
      (g[65] = Ce),
      (g[66] = E),
      (g[67] = he),
      (g[68] = ae),
      (g[69] = Le),
      (g[70] = $e),
      (g[71] = Jt));
  else Jt = g[71];
  return Jt;
}
//@ chunk-b7gstm5r.js:29460-29763 placement
function TabLabel(a) {
  let v = w(7),
    { isFocused: isFocused, label: label, color: color } = a;
  const i = isFocused ? void 0 : color;
  let b;
  if (v[0] !== isFocused || v[1] !== label || v[2] !== i)
    ((b = e(Text, { bold: isFocused, color: i, children: label })),
      (v[0] = isFocused),
      (v[1] = label),
      (v[2] = i),
      (v[3] = b));
  else b = v[3];
  let N;
  if (v[4] !== isFocused || v[5] !== b)
    ((N = e(ListItem, { isFocused: isFocused, styled: !1, children: b })),
      (v[4] = isFocused),
      (v[5] = b),
      (v[6] = N));
  else N = v[6];
  return N;
}
//@ chunk-b7gstm5r.js:29763-30873 placement
function serviceTableColumns(a, t, o, f) {
  let date = new Date(f),
    v = o.lock !== null,
    b,
    N,
    k,
    I;
  if (a === "scheduled") {
    ((b = ["Name", "Schedule", "Next run", "Last run", "PID"]), (I = 2));
    let m = t,
      D = o.scheduledStatus?.workerPid ?? o.status?.workers["scheduled:0"]?.pid;
    ((k = m.map((C) => C.id)),
      (N = m.map((C) => {
        let F = o.scheduledStatus?.tasks[C.id],
          U = C.enabled ? Fn(C.cron, date) : null;
        return [
          C.id,
          cronToHuman(C.cron),
          !C.enabled
            ? "disabled"
            : !v
              ? "daemon stopped"
              : F?.running
                ? "running"
                : U
                  ? formatRelativeTime(U, { now: date })
                  : "\u2014",
          F?.lastFiredAt ? formatRelativeTime(new Date(F.lastFiredAt), { now: date }) : "\u2014",
          F?.running && D !== void 0 ? String(D) : "\u2014",
        ];
      })));
  } else {
    ((b = ["Name", "Directory", "Status", "PID"]), (I = 2));
    let m = t;
    ((k = m.map((D) => D.dir)),
      (N = m.map((D, C) => {
        let F = o.status?.workers[`${a}:${C}`]?.pid,
          U = v && (o.status === null || F !== void 0);
        return [D.name, Nn(D.dir), U ? "running" : "stopped", F !== void 0 ? String(F) : U ? "\u2014" : ""];
      })));
  }
  let mapped = b.map((m, D) => Math.max(bunStringWidth(m), ...N.map((C) => bunStringWidth(C[D] ?? "")))),
    T = (m, D) => m + " ".repeat(Math.max(0, mapped[D] - bunStringWidth(m))),
    joined = b.map(T).join("  "),
    mapped_2 = N.map((m) => ({
      text: m.slice(0, I).map(T).join("  ") + "  ",
      suffix: r(Fragment, {
        children: [
          renderPaddedStatus(m[I], mapped[I]),
          e(Text, {
            children: m
              .slice(I + 1)
              .map((D, C) => "  " + T(D, I + 1 + C))
              .join(""),
          }),
        ],
      }),
    }));
  return { header: joined, rows: mapped_2, keys: k };
}
/**
 * 补齐宽度的状态文本，running 显示为成功色。
 */
//@ chunk-b7gstm5r.js:30873-31015 placement
function renderPaddedStatus(a, t) {
  let o = a + " ".repeat(Math.max(0, t - bunStringWidth(a)));
  return a === "running"
    ? e(Text, { color: "success", children: o })
    : e(Text, { dimColor: !0, children: o });
}
//@ chunk-b7gstm5r.js:31015-31067 placement
function Fn(a, t) {
  let o = parseCronExpression(a);
  return o ? computeNextCronRun(o, t) : null;
}
//@ chunk-b7gstm5r.js:31067-31098 placement
function Nn(a) {
  return truncateStartToWidth(a, 40);
}
//@ chunk-b7gstm5r.js:31098-31149 placement
var At = { uninstall: "Uninstall service", stop: "Stop" };
/**
 * 服务可执行的操作：未安装/不支持为空，无锁只能卸载，否则停止和卸载。
 */
//@ chunk-b7gstm5r.js:31149-31281 placement
function getServiceActions(a) {
  if (!a.serviceSupported || !a.serviceInstalled) return [];
  if (a.lock === null) return ["uninstall"];
  return ["stop", "uninstall"];
}
//@ chunk-b7gstm5r.js:31281-33299 placement
function DaemonServiceDetail(a) {
  let f = w(25),
    { data: t, message: message } = a;
  if (message) {
    let i;
    if (f[0] !== message) ((i = e(Text, { dimColor: !0, children: message })), (f[0] = message), (f[1] = i));
    else i = f[1];
    return i;
  }
  if (!t.serviceSupported) {
    let i;
    if (f[2] === MEMO_CACHE_SENTINEL)
      ((i = e(Text, {
        dimColor: !0,
        children: "service install not available on this platform \u2014 runs on demand",
      })),
        (f[2] = i));
    else i = f[2];
    return i;
  }
  if (t.lock === null) {
    const i = t.serviceInstalled ? "installed \xB7 not running" : "not installed (runs on demand)";
    let v;
    if (f[3] !== i) ((v = e(Text, { dimColor: !0, children: i })), (f[3] = i), (f[4] = v));
    else v = f[4];
    return v;
  }
  let i;
  if (f[5] !== t.lock.version || f[6] !== t.status)
    ((i =
      t.status === null ||
      t.lock.version !==
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
        }.VERSION),
      (f[5] = t.lock.version),
      (f[6] = t.status),
      (f[7] = i));
  else i = f[7];
  let b = i,
    v;
  if (f[8] === MEMO_CACHE_SENTINEL) ((v = e(Text, { color: "success", children: "running" })), (f[8] = v));
  else v = f[8];
  let N;
  if (f[9] !== t.lock.pid)
    ((N = r(Fragment, { children: ["pid ", t.lock.pid] })), (f[9] = t.lock.pid), (f[10] = N));
  else N = f[10];
  let k;
  if (f[11] !== t.lock.version)
    ((k = r(Fragment, { children: ["v", t.lock.version] })), (f[11] = t.lock.version), (f[12] = k));
  else k = f[12];
  let I;
  if (f[13] !== t.bgCount)
    ((I =
      t.bgCount > 0 && r(Fragment, { children: [t.bgCount, " ", plural(t.bgCount, "background session")] })),
      (f[13] = t.bgCount),
      (f[14] = I));
  else I = f[14];
  let u;
  if (f[15] !== t.serviceInstalled)
    ((u = !t.serviceInstalled && e(Fragment, { children: "not installed as service" })),
      (f[15] = t.serviceInstalled),
      (f[16] = u));
  else u = f[16];
  let T;
  if (f[17] !== b)
    ((T = b && e(Text, { color: "warning", children: "restart to update" })), (f[17] = b), (f[18] = T));
  else T = f[18];
  let p;
  if (f[19] !== N || f[20] !== k || f[21] !== I || f[22] !== u || f[23] !== T)
    ((p = e(Text, { dimColor: !0, children: r(Byline, { children: [v, N, k, I, u, T] }) })),
      (f[19] = N),
      (f[20] = k),
      (f[21] = I),
      (f[22] = u),
      (f[23] = T),
      (f[24] = p));
  else p = f[24];
  return p;
}
//@ chunk-b7gstm5r.js:33299-33785 placement
async function renderDaemonServicesView(a) {
  let [{ createRoot: t }, { getBaseRenderOptions: o }] = await Promise.all([
      import("./chunk-1m6xc21j.js"),
      import("./chunk-92g44ry1.js"),
    ]),
    { AppRoot: AppRoot } = await import("./chunk-f6d8289b.js"),
    { getEraseScreenSequence: getEraseScreenSequence } = await import("./chunk-89vt2tgg.js"),
    v = await loadDaemonOverview(a);
  process.stdout.write(getEraseScreenSequence());
  let b = await t(o(!1));
  (await new Promise((N) => {
    b.render(
      e(AppRoot, {
        children: e(DaemonSetupFlow, {
          initialData: v,
          modelOptions: modelSelectOptions(),
          storageV5: a,
          onDone: (k) => {
            if (k)
              process.stdout.write(
                k +
                  `
`,
              );
            N();
          },
        }),
      }),
    );
  }),
    b.unmount());
}

export { DaemonServicesView };
