/**
 * components/MCPServerDesktopImportDialog.tsx
 *
 * 从 Claude Desktop 导入 MCP 服务器配置的多选对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MCPServerDesktopImportDialog.tsx
 * pieces: chunk-pvz3y4bf.js (5)
 * attribution: sole-consumer 3, affinity 1, fingerprint 1
 */
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-pvz3y4bf.js:17428-17432 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pvz3y4bf.js:17428", () => {
  init_react_production();
});
//@ chunk-pvz3y4bf.js:17432-17436 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pvz3y4bf.js:17432", () => {
  init_react_production();
});
//@ chunk-pvz3y4bf.js:17436-17538 sole-consumer
function logImportReadFailure(error) {
  logForDebugging(`Failed to read existing MCP configs for Desktop import: ${errorMessage(error)}`, {
    level: "error",
  });
}
//@ chunk-pvz3y4bf.js:17538-17571 affinity
function isNotNull_2(value) {
  return value !== null;
}
//@ chunk-pvz3y4bf.js:17571-21331 fingerprint (2.1.88 match: MCPServerDesktopImportDialog, 0.518)
function MCPServerDesktopImportDialog(props) {
  let $ = useMemoCache(40);
  let { servers, scope, onDone } = props;
  let keys = Object.keys(servers);
  let initialConfigs;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialConfigs = {};
    $[0] = initialConfigs;
  } else initialConfigs = $[0];
  let [existingServers, setExistingServers] = useState(initialConfigs);
  let [theme] = useTheme();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { storageV5 } = useTheme_2();
  let loadConfigsEffect;
  let loadConfigsDeps;
  if ($[1] !== storageV5) {
    loadConfigsEffect = () => {
      getAllMcpConfigs({
        storageV5,
      })
        .then((t5) => {
          let { servers } = t5;
          return setExistingServers(servers);
        })
        .catch(logImportReadFailure);
    };
    loadConfigsDeps = [storageV5];
    $[1] = storageV5;
    $[2] = loadConfigsEffect;
    $[3] = loadConfigsDeps;
  } else {
    loadConfigsEffect = $[2];
    loadConfigsDeps = $[3];
  }
  useEffect(loadConfigsEffect, loadConfigsDeps);
  let isServerExisting;
  if ($[4] !== existingServers) {
    isServerExisting = (name) => existingServers[name] !== undefined;
    $[4] = existingServers;
    $[5] = isServerExisting;
  } else isServerExisting = $[5];
  let filtered = keys.filter(isServerExisting);
  let joined = filtered.join(`
`);
  let [collisionSelection, setCollisionSelection] = useState(null);
  let selectedNames =
    collisionSelection?.collisionsKey === joined
      ? collisionSelection.names
      : keys.filter((serverName) => !filtered.includes(serverName));
  let [isImporting, setIsImporting] = useState(false);
  let onSubmit = function toggleSelection(selectedServers) {
    setCollisionSelection({
      collisionsKey: joined,
      names: selectedNames.includes(selectedServers)
        ? selectedNames.filter((selectedName) => selectedName !== selectedServers)
        : [...selectedNames, selectedServers],
    });
  };
  let dedupeName;
  if ($[6] !== existingServers) {
    dedupeName = function dedupeName(importedCount_0) {
      if (existingServers[importedCount_0] === undefined) {
        return importedCount_0;
      }
      let counter = 1;
      while (existingServers[`${importedCount_0}_${counter}`] !== undefined) counter++;
      return `${importedCount_0}_${counter}`;
    };
    $[6] = existingServers;
    $[7] = dedupeName;
  } else dedupeName = $[7];
  let makeUniqueName = dedupeName;
  let importOne;
  if ($[8] !== makeUniqueName || $[9] !== scope || $[10] !== storageV5) {
    importOne = async function importOne(serverName, serverConfig) {
      try {
        await addMcpConfig(makeUniqueName(serverName), serverConfig, scope, storageV5);
        return null;
      } catch (error) {
        let caughtError = error;
        return {
          serverName,
          reason: errorMessage(caughtError),
        };
      }
    };
    $[8] = makeUniqueName;
    $[9] = scope;
    $[10] = storageV5;
    $[11] = importOne;
  } else importOne = $[11];
  let importOneStable = importOne;
  let importServers = async function serverNames(serverNames) {
    let reduced = await serverNames
      .flatMap((serverName) => {
        let serverConfig = servers[serverName];
        return serverConfig
          ? [
              {
                serverName,
                serverConfig,
              },
            ]
          : [];
      })
      .reduce(async (acc, entry) => {
        let { serverName, serverConfig } = entry;
        return [...(await acc), await importOneStable(serverName, serverConfig)];
      }, Promise.resolve([]));
    let filtered = reduced.filter(isNotNull_2);
    finishImport({
      importedCount: reduced.length - filtered.length,
      failures: filtered,
    });
  };
  let startImport = function serverNames(serverNames) {
    importServers(serverNames).catch((error) => {
      writeToStdout(`
${color("error", theme)(errorMessage(error))}
`);
      onDone();
      gracefulShutdown(1);
    });
  };
  let finishImport = (result) => {
    let { importedCount, failures } = result;
    if (importedCount > 0)
      writeToStdout(`
${color("success", theme)(`Successfully imported ${importedCount} MCP ${plural(importedCount, "server")} to ${scope} config.`)}
`);
    else
      writeToStdout(`
No servers were imported.`);
    failures.forEach((failure) => {
      let { serverName, reason } = failure;
      writeToStdout(`
${color("error", theme)(`Could not import ${serverName}: ${reason}`)}
`);
    });
    onDone();
    gracefulShutdown(failures.length > 0 ? 1 : 0);
  };
  let onCancel = () => {
    finishImport({
      importedCount: 0,
      failures: [],
    });
  };
  const DialogComponent = Dialog;
  const title = "Import MCP Servers from Claude Desktop";
  const t8 = keys.length;
  let serverWord;
  if ($[12] !== keys) {
    serverWord = plural(keys.length, "server");
    $[12] = keys;
    $[13] = serverWord;
  } else serverWord = $[13];
  const subtitle = `Found ${t8} MCP ${serverWord} in Claude Desktop.`;
  const color_2 = "success";
  const isCancelActive = !isImporting;
  const hideInputGuide = true;
  const serversNoun =
    filtered.length > 0 &&
    jsxProd_default(Text, {
      color: "warning",
      children:
        "Note: Some servers already exist with the same name. If selected, they will be imported with a numbered suffix.",
    });
  let promptText;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    promptText = jsxProd_default(Text, {
      children: "Please select the servers you want to import:",
    });
    $[14] = promptText;
  } else promptText = $[14];
  const ListComponent = OrderedListWithItem;
  const onSelect = (index) => {
    if (isImporting) {
      return;
    }
    let selectedServers = keys[index];
    if (selectedServers === undefined) {
      setIsImporting(true);
      startImport(keys.filter((serverName) => selectedNames.includes(serverName)));
      return;
    }
    onSubmit(selectedServers);
  };
  const onRowKeyDown = (event, index) => {
    if (event.key !== " ") {
      return;
    }
    event.preventDefault();
    let selectedServers = keys[index];
    if (selectedServers !== undefined && !isImporting) onSubmit(selectedServers);
  };
  const mapped = keys.map((serverName) => {
    let included = selectedNames.includes(serverName);
    return jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: serverName,
        icon: jsxProd_default(StatusIcon, {
          status: included ? "on" : "off",
          "aria-label": included ? "checked:" : "unchecked:",
        }),
        meta: filtered.includes(serverName) ? ["already exists"] : [],
      },
      serverName,
    );
  });
  let importItem;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    importItem = jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: "Import selected",
      },
      "import",
    );
    $[15] = importItem;
  } else importItem = $[15];
  let importRow;
  if ($[16] !== ListComponent || $[17] !== onSelect || $[18] !== onRowKeyDown || $[19] !== mapped) {
    importRow = jsxProd_default_2(ListComponent, {
      onSelect,
      onRowKeyDown,
      children: [mapped, importItem],
    });
    $[16] = ListComponent;
    $[17] = onSelect;
    $[18] = onRowKeyDown;
    $[19] = mapped;
    $[20] = importRow;
  } else importRow = $[20];
  let dialogElement;
  if (
    $[21] !== DialogComponent ||
    $[22] !== onCancel ||
    $[23] !== subtitle ||
    $[24] !== isCancelActive ||
    $[25] !== serversNoun ||
    $[26] !== promptText ||
    $[27] !== importRow
  ) {
    dialogElement = jsxProd_default_2(DialogComponent, {
      title,
      subtitle,
      color: color_2,
      onCancel,
      isCancelActive,
      hideInputGuide,
      children: [serversNoun, promptText, importRow],
    });
    $[21] = DialogComponent;
    $[22] = onCancel;
    $[23] = subtitle;
    $[24] = isCancelActive;
    $[25] = serversNoun;
    $[26] = promptText;
    $[27] = importRow;
    $[28] = dialogElement;
  } else dialogElement = $[28];
  let spaceHint;
  if ($[29] !== isScreenReaderEnabled) {
    spaceHint =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "space",
        action: "toggle",
      });
    $[29] = isScreenReaderEnabled;
    $[30] = spaceHint;
  } else spaceHint = $[30];
  let enterHint;
  if ($[31] !== isScreenReaderEnabled) {
    enterHint =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "select",
      });
    $[31] = isScreenReaderEnabled;
    $[32] = enterHint;
  } else enterHint = $[32];
  let cancelHint;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    cancelHint = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    });
    $[33] = cancelHint;
  } else cancelHint = $[33];
  let hintBar;
  if ($[34] !== spaceHint || $[35] !== enterHint) {
    hintBar = jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: jsxProd_default_2(Byline, {
          children: [spaceHint, enterHint, cancelHint],
        }),
      }),
    });
    $[34] = spaceHint;
    $[35] = enterHint;
    $[36] = hintBar;
  } else hintBar = $[36];
  let content;
  if ($[37] !== dialogElement || $[38] !== hintBar) {
    content = jsxProd_default_2(Fragment, {
      children: [dialogElement, hintBar],
    });
    $[37] = dialogElement;
    $[38] = hintBar;
    $[39] = content;
  } else content = $[39];
  return content;
}
export { MCPServerDesktopImportDialog };
