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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { HintText } from "../design-system/HintText.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { DevBar } from "../DevBar.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { ListItem } from "../design-system/ListItem.js";
import { cronToHuman, parseCronExpression, computeNextCronRun } from "../../utils/cron.js";
import { formatRelativeTime, truncateStartToWidth } from "../../utils/format.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-b7gstm5r.js:25608-29460 placement
/**
 * 后台守护进程服务列表视图：定时任务与常驻服务两类，可选择、新建、操作。
 */
function DaemonServicesView(props) {
  let g = w(72);
  let {
    kind,
    data: o,
    now,
    busy,
    message,
    onSelect,
    onAddNew,
    onService,
    onUnattendedServing,
    unattendedNotice,
    onCancel,
  } = props;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let m = kind === "scheduled" ? o.tasks : o.servers;
  let serviceActions = getServiceActions(o);
  let C = m.length;
  let visible = kind === "remoteControl" && o.unattendedServing.visible;
  let U = visible ? C + 1 : -1;
  let B = C + 1 + (visible ? 1 : 0);
  let A = B + serviceActions.length;
  let [c, te] = y(0);
  let L;
  let W;
  if (g[0] !== c || g[1] !== A) {
    L = () => {
      if (c >= A) te(Math.max(0, A - 1));
    };
    W = [A, c];
    g[0] = c;
    g[1] = A;
    g[2] = L;
    g[3] = W;
  } else {
    L = g[2];
    W = g[3];
  }
  P(L, W);
  let z;
  if (g[4] !== focusHeader || g[5] !== c) {
    z = () => {
      if (c === 0) focusHeader();
      else te(c - 1);
    };
    g[4] = focusHeader;
    g[5] = c;
    g[6] = z;
  } else z = g[6];
  let J;
  if (g[7] !== c || g[8] !== A) {
    J = () => te(Math.min(A - 1, c + 1));
    g[7] = c;
    g[8] = A;
    g[9] = J;
  } else J = g[9];
  const isActive = !headerFocused;
  let ce;
  if (g[10] !== isActive) {
    ce = {
      context: "Select",
      isActive,
    };
    g[10] = isActive;
    g[11] = ce;
  } else ce = g[11];
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
        else onService(serviceActions[c - B]);
      },
      "select:cancel": onCancel,
    },
    ce,
  );
  let h;
  if (g[12] !== o || g[13] !== m || g[14] !== kind || g[15] !== now) {
    h = serviceTableColumns(kind, m, o, now);
    g[12] = o;
    g[13] = m;
    g[14] = kind;
    g[15] = now;
    g[16] = h;
  } else h = g[16];
  let x = h;
  let ge =
    !headerFocused && c === U
      ? consentSelectAction(o.unattendedServing) === "none"
        ? null
        : "change"
      : "select";
  const ke = Box;
  const flexDirection = "column";
  const children = "  " + x.header;
  let ne;
  if (g[17] !== children) {
    ne = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    g[17] = children;
    g[18] = ne;
  } else ne = g[18];
  let Ce;
  if (g[19] !== m.length || g[20] !== kind) {
    Ce =
      m.length === 0 &&
      jsxProd_default(HintText, {
        children: `  (no ${SERVICE_KIND_LABELS[kind]}s)`,
      });
    g[19] = m.length;
    g[20] = kind;
    g[21] = Ce;
  } else Ce = g[21];
  let E;
  if (g[22] !== m || g[23] !== c || g[24] !== headerFocused || g[25] !== x.keys || g[26] !== x.rows) {
    let X;
    if (g[28] !== c || g[29] !== headerFocused || g[30] !== x.keys || g[31] !== x.rows) {
      X = (In, K) => {
        let oe = !headerFocused && c === K;
        return jsxProd_default_2(
          Box,
          {
            children: [
              jsxProd_default_2(Text, {
                color: oe ? "suggestion" : undefined,
                children: [oe ? figures_default.pointer : " ", " "],
              }),
              jsxProd_default(Text, {
                bold: oe,
                children: x.rows[K].text,
              }),
              x.rows[K].suffix,
            ],
          },
          x.keys[K],
        );
      };
      g[28] = c;
      g[29] = headerFocused;
      g[30] = x.keys;
      g[31] = x.rows;
      g[32] = X;
    } else X = g[32];
    E = m.map(X);
    g[22] = m;
    g[23] = c;
    g[24] = headerFocused;
    g[25] = x.keys;
    g[26] = x.rows;
    g[27] = E;
  } else E = g[27];
  const isFocused = !headerFocused && c === C;
  const label = `+ Add new ${SERVICE_KIND_LABELS[kind]}\u2026`;
  let he;
  if (g[33] !== isFocused || g[34] !== label) {
    he = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TabLabel, {
        isFocused,
        label,
      }),
    });
    g[33] = isFocused;
    g[34] = label;
    g[35] = he;
  } else he = g[35];
  let ae;
  if (
    g[36] !== o.unattendedServing ||
    g[37] !== c ||
    g[38] !== headerFocused ||
    g[39] !== visible ||
    g[40] !== U ||
    g[41] !== unattendedNotice
  ) {
    ae =
      visible &&
      jsxProd_default(DevBar, {
        state: o.unattendedServing,
        isFocused: !headerFocused && c === U,
        notice: unattendedNotice,
      });
    g[36] = o.unattendedServing;
    g[37] = c;
    g[38] = headerFocused;
    g[39] = visible;
    g[40] = U;
    g[41] = unattendedNotice;
    g[42] = ae;
  } else ae = g[42];
  const Re = Box;
  const marginTop = 1;
  const flexDirection_2 = "column";
  const borderStyle = "single";
  const borderBottom = false;
  const borderLeft = false;
  const borderRight = false;
  const borderDimColor = true;
  let Ht;
  let $t;
  if (g[43] === MEMO_CACHE_SENTINEL) {
    Ht = jsxProd_default(Text, {
      bold: true,
      children: "Daemon service",
    });
    $t = jsxProd_default(Text, {
      dimColor: true,
      children: " \xB7 ",
    });
    g[43] = Ht;
    g[44] = $t;
  } else {
    Ht = g[43];
    $t = g[44];
  }
  const message_2 = busy ? "working\u2026" : message;
  let Ve;
  if (g[45] !== o || g[46] !== message_2) {
    Ve = jsxProd_default_2(Box, {
      children: [
        Ht,
        $t,
        jsxProd_default(DaemonServiceDetail, {
          data: o,
          message: message_2,
        }),
      ],
    });
    g[45] = o;
    g[46] = message_2;
    g[47] = Ve;
  } else Ve = g[47];
  let Et;
  if (g[48] !== c || g[49] !== headerFocused || g[50] !== B) {
    Et = (dt, Ln) =>
      jsxProd_default(
        TabLabel,
        {
          isFocused: !headerFocused && c === B + Ln,
          label: SERVICE_ACTION_LABELS[dt],
          color: dt === "uninstall" ? "error" : undefined,
        },
        dt,
      );
    g[48] = c;
    g[49] = headerFocused;
    g[50] = B;
    g[51] = Et;
  } else Et = g[51];
  const mapped = serviceActions.map(Et);
  let Le;
  if (g[52] !== Re || g[53] !== Ve || g[54] !== mapped) {
    Le = jsxProd_default_2(Re, {
      marginTop,
      flexDirection: flexDirection_2,
      borderStyle,
      borderBottom,
      borderLeft,
      borderRight,
      borderDimColor,
      children: [Ve, mapped],
    });
    g[52] = Re;
    g[53] = Ve;
    g[54] = mapped;
    g[55] = Le;
  } else Le = g[55];
  let Kt;
  if (g[56] === MEMO_CACHE_SENTINEL) {
    Kt = jsxProd_default(KeyboardShortcutHint, {
      chord: ["left", "right"],
      action: "tabs",
    });
    g[56] = Kt;
  } else Kt = g[56];
  let Wt;
  if (g[57] === MEMO_CACHE_SENTINEL) {
    Wt = jsxProd_default(KeyboardShortcutHint, {
      chord: ["up", "down"],
      action: "move",
    });
    g[57] = Wt;
  } else Wt = g[57];
  let He;
  if (g[58] !== ge) {
    He =
      ge !== null &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: ge,
      });
    g[58] = ge;
    g[59] = He;
  } else He = g[59];
  let jt;
  if (g[60] === MEMO_CACHE_SENTINEL) {
    jt = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    g[60] = jt;
  } else jt = g[60];
  let $e;
  if (g[61] !== He) {
    $e = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default_2(Byline, {
          children: [Kt, Wt, He, jt],
        }),
      }),
    });
    g[61] = He;
    g[62] = $e;
  } else $e = g[62];
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
  ) {
    Jt = jsxProd_default_2(ke, {
      flexDirection,
      children: [ne, Ce, E, he, ae, Le, $e],
    });
    g[63] = ke;
    g[64] = ne;
    g[65] = Ce;
    g[66] = E;
    g[67] = he;
    g[68] = ae;
    g[69] = Le;
    g[70] = $e;
    g[71] = Jt;
  } else Jt = g[71];
  return Jt;
}
//@ chunk-b7gstm5r.js:29460-29763 placement
function TabLabel(props) {
  let v = w(7);
  let { isFocused, label, color } = props;
  const color_2 = isFocused ? undefined : color;
  let children;
  if (v[0] !== isFocused || v[1] !== label || v[2] !== color_2) {
    children = jsxProd_default(Text, {
      bold: isFocused,
      color: color_2,
      children: label,
    });
    v[0] = isFocused;
    v[1] = label;
    v[2] = color_2;
    v[3] = children;
  } else children = v[3];
  let N;
  if (v[4] !== isFocused || v[5] !== children) {
    N = jsxProd_default(ListItem, {
      isFocused,
      styled: false,
      children,
    });
    v[4] = isFocused;
    v[5] = children;
    v[6] = N;
  } else N = v[6];
  return N;
}
//@ chunk-b7gstm5r.js:29763-30873 placement
function serviceTableColumns(kind, t, o, now) {
  let date = new Date(now);
  let v = o.lock !== null;
  let b;
  let N;
  let k;
  let I;
  if (kind === "scheduled") {
    b = ["Name", "Schedule", "Next run", "Last run", "PID"];
    I = 2;
    let m = t;
    let D = o.scheduledStatus?.workerPid ?? o.status?.workers["scheduled:0"]?.pid;
    k = m.map((C) => C.id);
    N = m.map((C) => {
      let F = o.scheduledStatus?.tasks[C.id];
      let U = C.enabled ? nextCronRunAt(C.cron, date) : null;
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
                ? formatRelativeTime(U, {
                    now: date,
                  })
                : "\u2014",
        F?.lastFiredAt
          ? formatRelativeTime(new Date(F.lastFiredAt), {
              now: date,
            })
          : "\u2014",
        F?.running && D !== undefined ? String(D) : "\u2014",
      ];
    });
  } else {
    b = ["Name", "Directory", "Status", "PID"];
    I = 2;
    let m = t;
    k = m.map((D) => D.dir);
    N = m.map((D, C) => {
      let pid = o.status?.workers[`${kind}:${C}`]?.pid;
      let U = v && (o.status === null || pid !== undefined);
      return [
        D.name,
        truncateDirName(D.dir),
        U ? "running" : "stopped",
        pid !== undefined ? String(pid) : U ? "\u2014" : "",
      ];
    });
  }
  let mapped = b.map((m, D) => Math.max(bunStringWidth(m), ...N.map((C) => bunStringWidth(C[D] ?? ""))));
  let T = (m, D) => m + " ".repeat(Math.max(0, mapped[D] - bunStringWidth(m)));
  let header = b.map(T).join("  ");
  let rows = N.map((m) => ({
    text: m.slice(0, I).map(T).join("  ") + "  ",
    suffix: jsxProd_default_2(Fragment, {
      children: [
        renderPaddedStatus(m[I], mapped[I]),
        jsxProd_default(Text, {
          children: m
            .slice(I + 1)
            .map((D, C) => "  " + T(D, I + 1 + C))
            .join(""),
        }),
      ],
    }),
  }));
  return {
    header,
    rows,
    keys: k,
  };
}
//@ chunk-b7gstm5r.js:30873-31015 placement
/**
 * 补齐宽度的状态文本，running 显示为成功色。
 */
function renderPaddedStatus(a, t) {
  let children = a + " ".repeat(Math.max(0, t - bunStringWidth(a)));
  return a === "running"
    ? jsxProd_default(Text, {
        color: "success",
        children,
      })
    : jsxProd_default(Text, {
        dimColor: true,
        children,
      });
}
//@ chunk-b7gstm5r.js:31015-31067 placement
function nextCronRunAt(cron, from) {
  let fields = parseCronExpression(cron);
  return fields ? computeNextCronRun(fields, from) : null;
}
//@ chunk-b7gstm5r.js:31067-31098 placement
function truncateDirName(dir) {
  return truncateStartToWidth(dir, 40);
}
//@ chunk-b7gstm5r.js:31098-31149 placement
var SERVICE_ACTION_LABELS = {
  uninstall: "Uninstall service",
  stop: "Stop",
};
//@ chunk-b7gstm5r.js:31149-31281 placement
/**
 * 服务可执行的操作：未安装/不支持为空，无锁只能卸载，否则停止和卸载。
 */
function getServiceActions(a) {
  if (!a.serviceSupported || !a.serviceInstalled) return [];
  if (a.lock === null) return ["uninstall"];
  return ["stop", "uninstall"];
}
//@ chunk-b7gstm5r.js:31281-33299 placement
function DaemonServiceDetail(props) {
  let f = w(25);
  let { data: t, message } = props;
  if (message) {
    let i;
    if (f[0] !== message) {
      i = jsxProd_default(Text, {
        dimColor: true,
        children: message,
      });
      f[0] = message;
      f[1] = i;
    } else i = f[1];
    return i;
  }
  if (!t.serviceSupported) {
    let i;
    if (f[2] === MEMO_CACHE_SENTINEL) {
      i = jsxProd_default(Text, {
        dimColor: true,
        children: "service install not available on this platform \u2014 runs on demand",
      });
      f[2] = i;
    } else i = f[2];
    return i;
  }
  if (t.lock === null) {
    const children = t.serviceInstalled ? "installed \xB7 not running" : "not installed (runs on demand)";
    let v;
    if (f[3] !== children) {
      v = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      f[3] = children;
      f[4] = v;
    } else v = f[4];
    return v;
  }
  let i;
  if (f[5] !== t.lock.version || f[6] !== t.status) {
    i =
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
        }.VERSION;
    f[5] = t.lock.version;
    f[6] = t.status;
    f[7] = i;
  } else i = f[7];
  let b = i;
  let v;
  if (f[8] === MEMO_CACHE_SENTINEL) {
    v = jsxProd_default(Text, {
      color: "success",
      children: "running",
    });
    f[8] = v;
  } else v = f[8];
  let N;
  if (f[9] !== t.lock.pid) {
    N = jsxProd_default_2(Fragment, {
      children: ["pid ", t.lock.pid],
    });
    f[9] = t.lock.pid;
    f[10] = N;
  } else N = f[10];
  let k;
  if (f[11] !== t.lock.version) {
    k = jsxProd_default_2(Fragment, {
      children: ["v", t.lock.version],
    });
    f[11] = t.lock.version;
    f[12] = k;
  } else k = f[12];
  let I;
  if (f[13] !== t.bgCount) {
    I =
      t.bgCount > 0 &&
      jsxProd_default_2(Fragment, {
        children: [t.bgCount, " ", plural(t.bgCount, "background session")],
      });
    f[13] = t.bgCount;
    f[14] = I;
  } else I = f[14];
  let u;
  if (f[15] !== t.serviceInstalled) {
    u =
      !t.serviceInstalled &&
      jsxProd_default(Fragment, {
        children: "not installed as service",
      });
    f[15] = t.serviceInstalled;
    f[16] = u;
  } else u = f[16];
  let T;
  if (f[17] !== b) {
    T =
      b &&
      jsxProd_default(Text, {
        color: "warning",
        children: "restart to update",
      });
    f[17] = b;
    f[18] = T;
  } else T = f[18];
  let p;
  if (f[19] !== N || f[20] !== k || f[21] !== I || f[22] !== u || f[23] !== T) {
    p = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [v, N, k, I, u, T],
      }),
    });
    f[19] = N;
    f[20] = k;
    f[21] = I;
    f[22] = u;
    f[23] = T;
    f[24] = p;
  } else p = f[24];
  return p;
}
//@ chunk-b7gstm5r.js:33299-33785 placement
async function renderDaemonServicesView(a) {
  let [{ createRoot: t }, { getBaseRenderOptions: o }] = await Promise.all([
    import("./chunk-1m6xc21j.js"),
    import("./chunk-92g44ry1.js"),
  ]);
  let { AppRoot } = await import("./chunk-f6d8289b.js");
  let { getEraseScreenSequence } = await import("./chunk-89vt2tgg.js");
  let initialData = await loadDaemonOverview(a);
  process.stdout.write(getEraseScreenSequence());
  let b = await t(o(false));
  await new Promise((resolve) => {
    b.render(
      jsxProd_default(AppRoot, {
        children: jsxProd_default(DaemonSetupFlow, {
          initialData,
          modelOptions: modelSelectOptions(),
          storageV5: a,
          onDone: (k) => {
            if (k)
              process.stdout.write(
                k +
                  `
`,
              );
            resolve();
          },
        }),
      }),
    );
  });
  b.unmount();
}
export { DaemonServicesView };
