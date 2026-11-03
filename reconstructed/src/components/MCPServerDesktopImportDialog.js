/**
 * components/MCPServerDesktopImportDialog.tsx
 *
 * 从 Claude Desktop 导入 MCP 服务器配置的多选对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MCPServerDesktopImportDialog.tsx
 * pieces: chunk-h2rjy0z4.js (5)
 * attribution: sole-consumer 3, affinity 1, fingerprint 1
 */
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useTheme, Me } from "./design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { getAllMcpConfigs, addMcpConfig } from "../services/mcp/config.js";
import { writeToStdout } from "../utils/process.js";
import { color } from "./design-system/color.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { plural } from "../utils/stringUtils.js";
import { Dialog } from "./design-system/Dialog.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Byline } from "./design-system/Byline.js";

//@ chunk-h2rjy0z4.js:16185-16189 sole-consumer
j();
//@ chunk-h2rjy0z4.js:16189-16193 sole-consumer
j();
//@ chunk-h2rjy0z4.js:16193-16295 sole-consumer
function logImportReadFailure(Ut) {
  logForDebugging(`Failed to read existing MCP configs for Desktop import: ${errorMessage(Ut)}`, {
    level: "error",
  });
}
//@ chunk-h2rjy0z4.js:16295-16328 affinity
function ct(Gt) {
  return Gt !== null;
}
//@ chunk-h2rjy0z4.js:16328-20032 fingerprint = MCPServerDesktopImportDialog (0.523)
function MCPServerDesktopImportDialog(t0) {
  let $ = w(39),
    { servers: servers, scope: scope, onDone: onDone } = t0,
    keys = Object.keys(servers),
    f;
  if ($[0] === MEMO_CACHE_SENTINEL) ((f = {}), ($[0] = f));
  else f = $[0];
  let [i, _] = y(f),
    [g] = useTheme(),
    v = useIsScreenReaderEnabled(),
    { storageV5: storageV5 } = Me(),
    x,
    R;
  if ($[1] !== storageV5)
    ((x = () => {
      getAllMcpConfigs({ storageV5: storageV5 })
        .then((t5) => {
          let { servers: servers_0 } = t5;
          return _(servers_0);
        })
        .catch(logImportReadFailure);
    }),
      (R = [storageV5]),
      ($[1] = storageV5),
      ($[2] = x),
      ($[3] = R));
  else ((x = $[2]), (R = $[3]));
  P(x, R);
  let M;
  if ($[4] !== i) ((M = (name) => i[name] !== void 0), ($[4] = i), ($[5] = M));
  else M = $[5];
  let filtered = keys.filter(M),
    joined = filtered.join(`
`),
    [sr, yt] = y(null),
    L = sr?.collisionsKey === joined ? sr.names : keys.filter((Ct) => !filtered.includes(Ct)),
    [nr, wt] = y(!1),
    onSubmit = function Se(selectedServers) {
      yt({
        collisionsKey: joined,
        names: L.includes(selectedServers)
          ? L.filter((_t) => _t !== selectedServers)
          : [...L, selectedServers],
      });
    },
    ir;
  if ($[6] !== i)
    ((ir = function V(importedCount_0) {
      if (i[importedCount_0] === void 0) {
        return importedCount_0;
      }
      let he = 1;
      while (i[`${importedCount_0}_${he}`] !== void 0) he++;
      return `${importedCount_0}_${he}`;
    }),
      ($[6] = i),
      ($[7] = ir));
  else ir = $[7];
  let V = ir,
    cr;
  if ($[8] !== V || $[9] !== scope || $[10] !== storageV5)
    ((cr = async function lr(ar, Mt) {
      try {
        return (await addMcpConfig(V(ar), Mt, scope, storageV5), null);
      } catch (error) {
        let jt = error;
        return { serverName: ar, reason: errorMessage(jt) };
      }
    }),
      ($[8] = V),
      ($[9] = scope),
      ($[10] = storageV5),
      ($[11] = cr));
  else cr = $[11];
  let lr = cr,
    gr = async function gr(kt) {
      let reduced = await kt
        .flatMap((pr) => {
          let dr = servers[pr];
          return dr ? [{ serverName: pr, serverConfig: dr }] : [];
        })
        .reduce(async (bt, ye) => {
          let { serverName: serverName, serverConfig: serverConfig } = ye;
          return [...(await bt), await lr(serverName, serverConfig)];
        }, Promise.resolve([]));
      let filtered = reduced.filter(ct);
      fr({ importedCount: reduced.length - filtered.length, failures: filtered });
    },
    vr = function vr(Pt) {
      gr(Pt).catch((Et) => {
        (writeToStdout(`
${color("error", g)(errorMessage(Et))}
`),
          onDone(),
          gracefulShutdown());
      });
    },
    fr = (xt) => {
      let { importedCount: importedCount, failures: failures } = xt;
      if (importedCount > 0)
        writeToStdout(`
${color("success", g)(`Successfully imported ${importedCount} MCP ${plural(importedCount, "server")} to ${scope} config.`)}
`);
      else
        writeToStdout(`
No servers were imported.`);
      (failures.forEach((At) => {
        let { serverName: serverName, reason: reason } = At;
        writeToStdout(`
${color("error", g)(`Could not import ${serverName}: ${reason}`)}
`);
      }),
        onDone(),
        gracefulShutdown());
    },
    _e = () => {
      fr({ importedCount: 0, failures: [] });
    };
  const je = Dialog,
    It = "Import MCP Servers from Claude Desktop",
    t8 = keys.length;
  let Sr;
  if ($[12] !== keys) ((Sr = plural(keys.length, "server")), ($[12] = keys), ($[13] = Sr));
  else Sr = $[13];
  const t10 = `Found ${t8} MCP ${Sr} in Claude Desktop.`,
    Ot = "success",
    Bt = !0,
    be =
      filtered.length > 0 &&
      e(Text, {
        color: "warning",
        children:
          "Note: Some servers already exist with the same name. If selected, they will be imported with a numbered suffix.",
      });
  let W;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((W = e(Text, { children: "Please select the servers you want to import:" })), ($[14] = W));
  else W = $[14];
  const $e = OrderedListWithItem,
    Ne = (Lt) => {
      if (nr) {
        return;
      }
      let hr = keys[Lt];
      if (hr === void 0) {
        (wt(!0), vr(keys.filter((Ht) => L.includes(Ht))));
        return;
      }
      onSubmit(hr);
    },
    Pe = (yr, zt) => {
      if (yr.key !== " ") {
        return;
      }
      yr.preventDefault();
      let Cr = keys[zt];
      if (Cr !== void 0 && !nr) onSubmit(Cr);
    },
    mapped = keys.map((X) => {
      let included = L.includes(X);
      return e(
        OrderedListWithItem.Item,
        {
          label: X,
          icon: e(StatusIcon, {
            status: included ? "on" : "off",
            "aria-label": included ? "checked:" : "unchecked:",
          }),
          meta: filtered.includes(X) ? ["already exists"] : [],
        },
        X,
      );
    });
  let _r;
  if ($[15] === MEMO_CACHE_SENTINEL)
    ((_r = e(OrderedListWithItem.Item, { label: "Import selected" }, "import")), ($[15] = _r));
  else _r = $[15];
  let Y;
  if ($[16] !== $e || $[17] !== Ne || $[18] !== Pe || $[19] !== mapped)
    ((Y = r($e, { onSelect: Ne, onRowKeyDown: Pe, children: [mapped, _r] })),
      ($[16] = $e),
      ($[17] = Ne),
      ($[18] = Pe),
      ($[19] = mapped),
      ($[20] = Y));
  else Y = $[20];
  let Q;
  if ($[21] !== je || $[22] !== _e || $[23] !== t10 || $[24] !== be || $[25] !== W || $[26] !== Y)
    ((Q = r(je, {
      title: It,
      subtitle: t10,
      color: Ot,
      onCancel: _e,
      hideInputGuide: Bt,
      children: [be, W, Y],
    })),
      ($[21] = je),
      ($[22] = _e),
      ($[23] = t10),
      ($[24] = be),
      ($[25] = W),
      ($[26] = Y),
      ($[27] = Q));
  else Q = $[27];
  let ee;
  if ($[28] !== v)
    ((ee = !v && e(KeyboardShortcutHint, { chord: "space", action: "toggle" })), ($[28] = v), ($[29] = ee));
  else ee = $[29];
  let te;
  if ($[30] !== v)
    ((te = !v && e(KeyboardShortcutHint, { chord: "enter", action: "select" })), ($[30] = v), ($[31] = te));
  else te = $[31];
  let Mr;
  if ($[32] === MEMO_CACHE_SENTINEL)
    ((Mr = e(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    })),
      ($[32] = Mr));
  else Mr = $[32];
  let oe;
  if ($[33] !== ee || $[34] !== te)
    ((oe = e(Box, {
      paddingX: 1,
      children: e(Text, { dimColor: !0, italic: !0, children: r(Byline, { children: [ee, te, Mr] }) }),
    })),
      ($[33] = ee),
      ($[34] = te),
      ($[35] = oe));
  else oe = $[35];
  let kr;
  if ($[36] !== Q || $[37] !== oe)
    ((kr = r(Fragment, { children: [Q, oe] })), ($[36] = Q), ($[37] = oe), ($[38] = kr));
  else kr = $[38];
  return kr;
}

export { MCPServerDesktopImportDialog };
