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
import { init_react_production, y, P } from "../../vendor/react/cjs/react.production.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useTheme, useTheme_2 } from "./design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { getAllMcpConfigs, addMcpConfig } from "../services/mcp/config.js";
import { writeToStdout } from "../utils/process.js";
import { color } from "./design-system/color.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { plural } from "../utils/stringUtils.js";
import { Dialog } from "./design-system/Dialog.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Byline } from "./design-system/Byline.js";

//@ chunk-h2rjy0z4.js:16185-16189 sole-consumer
init_react_production();
//@ chunk-h2rjy0z4.js:16189-16193 sole-consumer
init_react_production();
//@ chunk-h2rjy0z4.js:16193-16295 sole-consumer
function logImportReadFailure(Ut) {
  logForDebugging(`Failed to read existing MCP configs for Desktop import: ${errorMessage(Ut)}`, {
    level: "error",
  });
}
//@ chunk-h2rjy0z4.js:16295-16328 affinity
function isNotNull_2(Gt) {
  return Gt !== null;
}
//@ chunk-h2rjy0z4.js:16328-20032 fingerprint = MCPServerDesktopImportDialog (0.523)
function MCPServerDesktopImportDialog(props) {
  let $ = w(39);
  let { servers, scope, onDone } = props;
  let keys = Object.keys(servers);
  let f;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    f = {};
    $[0] = f;
  } else f = $[0];
  let [i, _] = y(f);
  let [g] = useTheme();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { storageV5 } = useTheme_2();
  let x;
  let R;
  if ($[1] !== storageV5) {
    x = () => {
      getAllMcpConfigs({
        storageV5,
      })
        .then((t5) => {
          let { servers } = t5;
          return _(servers);
        })
        .catch(logImportReadFailure);
    };
    R = [storageV5];
    $[1] = storageV5;
    $[2] = x;
    $[3] = R;
  } else {
    x = $[2];
    R = $[3];
  }
  P(x, R);
  let M;
  if ($[4] !== i) {
    M = (name) => i[name] !== undefined;
    $[4] = i;
    $[5] = M;
  } else M = $[5];
  let filtered = keys.filter(M);
  let joined = filtered.join(`
`);
  let [sr, yt] = y(null);
  let L = sr?.collisionsKey === joined ? sr.names : keys.filter((Ct) => !filtered.includes(Ct));
  let [nr, wt] = y(false);
  let onSubmit = function Se(selectedServers) {
    yt({
      collisionsKey: joined,
      names: L.includes(selectedServers) ? L.filter((_t) => _t !== selectedServers) : [...L, selectedServers],
    });
  };
  let ir;
  if ($[6] !== i) {
    ir = function V(importedCount_0) {
      if (i[importedCount_0] === undefined) {
        return importedCount_0;
      }
      let counter = 1;
      while (i[`${importedCount_0}_${counter}`] !== undefined) counter++;
      return `${importedCount_0}_${counter}`;
    };
    $[6] = i;
    $[7] = ir;
  } else ir = $[7];
  let V = ir;
  let cr;
  if ($[8] !== V || $[9] !== scope || $[10] !== storageV5) {
    cr = async function lr(ar, Mt) {
      try {
        await addMcpConfig(V(ar), Mt, scope, storageV5);
        return null;
      } catch (error) {
        let jt = error;
        return {
          serverName: ar,
          reason: errorMessage(jt),
        };
      }
    };
    $[8] = V;
    $[9] = scope;
    $[10] = storageV5;
    $[11] = cr;
  } else cr = $[11];
  let lr = cr;
  let gr = async function gr(kt) {
    let reduced = await kt
      .flatMap((pr) => {
        let dr = servers[pr];
        return dr
          ? [
              {
                serverName: pr,
                serverConfig: dr,
              },
            ]
          : [];
      })
      .reduce(async (acc, ye) => {
        let { serverName, serverConfig } = ye;
        return [...(await acc), await lr(serverName, serverConfig)];
      }, Promise.resolve([]));
    let filtered = reduced.filter(isNotNull_2);
    fr({
      importedCount: reduced.length - filtered.length,
      failures: filtered,
    });
  };
  let vr = function vr(Pt) {
    gr(Pt).catch((error) => {
      writeToStdout(`
${color("error", g)(errorMessage(error))}
`);
      onDone();
      gracefulShutdown();
    });
  };
  let fr = (xt) => {
    let { importedCount, failures } = xt;
    if (importedCount > 0)
      writeToStdout(`
${color("success", g)(`Successfully imported ${importedCount} MCP ${plural(importedCount, "server")} to ${scope} config.`)}
`);
    else
      writeToStdout(`
No servers were imported.`);
    failures.forEach((failure) => {
      let { serverName, reason } = failure;
      writeToStdout(`
${color("error", g)(`Could not import ${serverName}: ${reason}`)}
`);
    });
    onDone();
    gracefulShutdown();
  };
  let onCancel = () => {
    fr({
      importedCount: 0,
      failures: [],
    });
  };
  const je = Dialog;
  const title = "Import MCP Servers from Claude Desktop";
  const t8 = keys.length;
  let Sr;
  if ($[12] !== keys) {
    Sr = plural(keys.length, "server");
    $[12] = keys;
    $[13] = Sr;
  } else Sr = $[13];
  const subtitle = `Found ${t8} MCP ${Sr} in Claude Desktop.`;
  const color_2 = "success";
  const hideInputGuide = true;
  const be =
    filtered.length > 0 &&
    jsxProd_default(Text, {
      color: "warning",
      children:
        "Note: Some servers already exist with the same name. If selected, they will be imported with a numbered suffix.",
    });
  let W;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    W = jsxProd_default(Text, {
      children: "Please select the servers you want to import:",
    });
    $[14] = W;
  } else W = $[14];
  const $e = OrderedListWithItem;
  const onSelect = (Lt) => {
    if (nr) {
      return;
    }
    let selectedServers = keys[Lt];
    if (selectedServers === undefined) {
      wt(true);
      vr(keys.filter((Ht) => L.includes(Ht)));
      return;
    }
    onSubmit(selectedServers);
  };
  const onRowKeyDown = (event, zt) => {
    if (event.key !== " ") {
      return;
    }
    event.preventDefault();
    let selectedServers = keys[zt];
    if (selectedServers !== undefined && !nr) onSubmit(selectedServers);
  };
  const mapped = keys.map((X) => {
    let included = L.includes(X);
    return jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: X,
        icon: jsxProd_default(StatusIcon, {
          status: included ? "on" : "off",
          "aria-label": included ? "checked:" : "unchecked:",
        }),
        meta: filtered.includes(X) ? ["already exists"] : [],
      },
      X,
    );
  });
  let _r;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    _r = jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: "Import selected",
      },
      "import",
    );
    $[15] = _r;
  } else _r = $[15];
  let Y;
  if ($[16] !== $e || $[17] !== onSelect || $[18] !== onRowKeyDown || $[19] !== mapped) {
    Y = jsxProd_default_2($e, {
      onSelect,
      onRowKeyDown,
      children: [mapped, _r],
    });
    $[16] = $e;
    $[17] = onSelect;
    $[18] = onRowKeyDown;
    $[19] = mapped;
    $[20] = Y;
  } else Y = $[20];
  let Q;
  if (
    $[21] !== je ||
    $[22] !== onCancel ||
    $[23] !== subtitle ||
    $[24] !== be ||
    $[25] !== W ||
    $[26] !== Y
  ) {
    Q = jsxProd_default_2(je, {
      title,
      subtitle,
      color: color_2,
      onCancel,
      hideInputGuide,
      children: [be, W, Y],
    });
    $[21] = je;
    $[22] = onCancel;
    $[23] = subtitle;
    $[24] = be;
    $[25] = W;
    $[26] = Y;
    $[27] = Q;
  } else Q = $[27];
  let ee;
  if ($[28] !== isScreenReaderEnabled) {
    ee =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "space",
        action: "toggle",
      });
    $[28] = isScreenReaderEnabled;
    $[29] = ee;
  } else ee = $[29];
  let te;
  if ($[30] !== isScreenReaderEnabled) {
    te =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "select",
      });
    $[30] = isScreenReaderEnabled;
    $[31] = te;
  } else te = $[31];
  let Mr;
  if ($[32] === MEMO_CACHE_SENTINEL) {
    Mr = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    });
    $[32] = Mr;
  } else Mr = $[32];
  let oe;
  if ($[33] !== ee || $[34] !== te) {
    oe = jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: jsxProd_default_2(Byline, {
          children: [ee, te, Mr],
        }),
      }),
    });
    $[33] = ee;
    $[34] = te;
    $[35] = oe;
  } else oe = $[35];
  let kr;
  if ($[36] !== Q || $[37] !== oe) {
    kr = jsxProd_default_2(Fragment, {
      children: [Q, oe],
    });
    $[36] = Q;
    $[37] = oe;
    $[38] = kr;
  } else kr = $[38];
  return kr;
}
export { MCPServerDesktopImportDialog };
