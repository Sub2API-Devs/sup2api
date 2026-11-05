/**
 * components/daemon/DaemonServicesView.tsx
 *
 * 2.1.316 新增：后台守护进程服务列表视图
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k82fyra0.js (10)
 * attribution: placement 10
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-k82fyra0.js:26785-30637 placement
/**
 * 后台守护进程服务列表视图：定时任务与常驻服务两类，可选择、新建、操作。
 */
function DaemonServicesView(props) {
  let $ = useMemoCache(72);
  let {
    kind,
    data,
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
  let items = kind === "scheduled" ? data.tasks : data.servers;
  let serviceActions = getServiceActions(data);
  let itemCount = items.length;
  let visible = kind === "remoteControl" && data.unattendedServing.visible;
  let consentRowIndex = visible ? itemCount + 1 : -1;
  let actionRowStart = itemCount + 1 + (visible ? 1 : 0);
  let rowCount = actionRowStart + serviceActions.length;
  let [focusedRow, setFocusedRow] = useState(0);
  let clampEffect;
  let clampDeps;
  if ($[0] !== focusedRow || $[1] !== rowCount) {
    clampEffect = () => {
      if (focusedRow >= rowCount) setFocusedRow(Math.max(0, rowCount - 1));
    };
    clampDeps = [rowCount, focusedRow];
    $[0] = focusedRow;
    $[1] = rowCount;
    $[2] = clampEffect;
    $[3] = clampDeps;
  } else {
    clampEffect = $[2];
    clampDeps = $[3];
  }
  useEffect(clampEffect, clampDeps);
  let focusPrevious;
  if ($[4] !== focusHeader || $[5] !== focusedRow) {
    focusPrevious = () => {
      if (focusedRow === 0) focusHeader();
      else setFocusedRow(focusedRow - 1);
    };
    $[4] = focusHeader;
    $[5] = focusedRow;
    $[6] = focusPrevious;
  } else focusPrevious = $[6];
  let focusNext;
  if ($[7] !== focusedRow || $[8] !== rowCount) {
    focusNext = () => setFocusedRow(Math.min(rowCount - 1, focusedRow + 1));
    $[7] = focusedRow;
    $[8] = rowCount;
    $[9] = focusNext;
  } else focusNext = $[9];
  const isActive = !headerFocused;
  let selectKeybindingOptions;
  if ($[10] !== isActive) {
    selectKeybindingOptions = {
      context: "Select",
      isActive,
    };
    $[10] = isActive;
    $[11] = selectKeybindingOptions;
  } else selectKeybindingOptions = $[11];
  MessageActionsKeybindings(
    {
      "select:previous": focusPrevious,
      "select:next": focusNext,
      "select:accept": () => {
        if (busy) {
          return;
        }
        if (focusedRow < items.length) onSelect(items[focusedRow]);
        else if (focusedRow === itemCount) onAddNew();
        else if (focusedRow === consentRowIndex) onUnattendedServing();
        else onService(serviceActions[focusedRow - actionRowStart]);
      },
      "select:cancel": onCancel,
    },
    selectKeybindingOptions,
  );
  let table;
  if ($[12] !== data || $[13] !== items || $[14] !== kind || $[15] !== now) {
    table = serviceTableColumns(kind, items, data, now);
    $[12] = data;
    $[13] = items;
    $[14] = kind;
    $[15] = now;
    $[16] = table;
  } else table = $[16];
  let tableData = table;
  let enterAction =
    !headerFocused && focusedRow === consentRowIndex
      ? consentSelectAction(data.unattendedServing) === "none"
        ? null
        : "change"
      : "select";
  const BodyBox = Box;
  const flexDirection = "column";
  const children = "  " + tableData.header;
  let headerElement;
  if ($[17] !== children) {
    headerElement = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[17] = children;
    $[18] = headerElement;
  } else headerElement = $[18];
  let emptyElement;
  if ($[19] !== items.length || $[20] !== kind) {
    emptyElement =
      items.length === 0 &&
      jsxProd_default(HintText, {
        children: `  (no ${SERVICE_KIND_LABELS[kind]}s)`,
      });
    $[19] = items.length;
    $[20] = kind;
    $[21] = emptyElement;
  } else emptyElement = $[21];
  let itemRows;
  if (
    $[22] !== items ||
    $[23] !== focusedRow ||
    $[24] !== headerFocused ||
    $[25] !== tableData.keys ||
    $[26] !== tableData.rows
  ) {
    let renderRow;
    if (
      $[28] !== focusedRow ||
      $[29] !== headerFocused ||
      $[30] !== tableData.keys ||
      $[31] !== tableData.rows
    ) {
      renderRow = (row, index) => {
        let isRowFocused = !headerFocused && focusedRow === index;
        return jsxProd_default_2(
          Box,
          {
            children: [
              jsxProd_default_2(Text, {
                color: isRowFocused ? "suggestion" : undefined,
                children: [isRowFocused ? figures_default.pointer : " ", " "],
              }),
              jsxProd_default(Text, {
                bold: isRowFocused,
                children: tableData.rows[index].text,
              }),
              tableData.rows[index].suffix,
            ],
          },
          tableData.keys[index],
        );
      };
      $[28] = focusedRow;
      $[29] = headerFocused;
      $[30] = tableData.keys;
      $[31] = tableData.rows;
      $[32] = renderRow;
    } else renderRow = $[32];
    itemRows = items.map(renderRow);
    $[22] = items;
    $[23] = focusedRow;
    $[24] = headerFocused;
    $[25] = tableData.keys;
    $[26] = tableData.rows;
    $[27] = itemRows;
  } else itemRows = $[27];
  const isFocused = !headerFocused && focusedRow === itemCount;
  const label = `+ Add new ${SERVICE_KIND_LABELS[kind]}\u2026`;
  let addNewElement;
  if ($[33] !== isFocused || $[34] !== label) {
    addNewElement = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TabLabel, {
        isFocused,
        label,
      }),
    });
    $[33] = isFocused;
    $[34] = label;
    $[35] = addNewElement;
  } else addNewElement = $[35];
  let consentElement;
  if (
    $[36] !== data.unattendedServing ||
    $[37] !== focusedRow ||
    $[38] !== headerFocused ||
    $[39] !== visible ||
    $[40] !== consentRowIndex ||
    $[41] !== unattendedNotice
  ) {
    consentElement =
      visible &&
      jsxProd_default(DevBar, {
        state: data.unattendedServing,
        isFocused: !headerFocused && focusedRow === consentRowIndex,
        notice: unattendedNotice,
      });
    $[36] = data.unattendedServing;
    $[37] = focusedRow;
    $[38] = headerFocused;
    $[39] = visible;
    $[40] = consentRowIndex;
    $[41] = unattendedNotice;
    $[42] = consentElement;
  } else consentElement = $[42];
  const DetailBox = Box;
  const marginTop = 1;
  const flexDirection_2 = "column";
  const borderStyle = "single";
  const borderBottom = false;
  const borderLeft = false;
  const borderRight = false;
  const borderDimColor = true;
  let detailTitle;
  let detailSeparator;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    detailTitle = jsxProd_default(Text, {
      bold: true,
      children: "Daemon service",
    });
    detailSeparator = jsxProd_default(Text, {
      dimColor: true,
      children: " \xB7 ",
    });
    $[43] = detailTitle;
    $[44] = detailSeparator;
  } else {
    detailTitle = $[43];
    detailSeparator = $[44];
  }
  const message_2 = busy ? "working\u2026" : message;
  let detailRow;
  if ($[45] !== data || $[46] !== message_2) {
    detailRow = jsxProd_default_2(Box, {
      children: [
        detailTitle,
        detailSeparator,
        jsxProd_default(DaemonServiceDetail, {
          data,
          message: message_2,
        }),
      ],
    });
    $[45] = data;
    $[46] = message_2;
    $[47] = detailRow;
  } else detailRow = $[47];
  let renderAction;
  if ($[48] !== focusedRow || $[49] !== headerFocused || $[50] !== actionRowStart) {
    renderAction = (action, index) =>
      jsxProd_default(
        TabLabel,
        {
          isFocused: !headerFocused && focusedRow === actionRowStart + index,
          label: SERVICE_ACTION_LABELS[action],
          color: action === "uninstall" ? "error" : undefined,
        },
        action,
      );
    $[48] = focusedRow;
    $[49] = headerFocused;
    $[50] = actionRowStart;
    $[51] = renderAction;
  } else renderAction = $[51];
  const mapped = serviceActions.map(renderAction);
  let detailSection;
  if ($[52] !== DetailBox || $[53] !== detailRow || $[54] !== mapped) {
    detailSection = jsxProd_default_2(DetailBox, {
      marginTop,
      flexDirection: flexDirection_2,
      borderStyle,
      borderBottom,
      borderLeft,
      borderRight,
      borderDimColor,
      children: [detailRow, mapped],
    });
    $[52] = DetailBox;
    $[53] = detailRow;
    $[54] = mapped;
    $[55] = detailSection;
  } else detailSection = $[55];
  let tabsHint;
  if ($[56] === MEMO_CACHE_SENTINEL) {
    tabsHint = jsxProd_default(KeyboardShortcutHint, {
      chord: ["left", "right"],
      action: "tabs",
    });
    $[56] = tabsHint;
  } else tabsHint = $[56];
  let moveHint;
  if ($[57] === MEMO_CACHE_SENTINEL) {
    moveHint = jsxProd_default(KeyboardShortcutHint, {
      chord: ["up", "down"],
      action: "move",
    });
    $[57] = moveHint;
  } else moveHint = $[57];
  let enterHint;
  if ($[58] !== enterAction) {
    enterHint =
      enterAction !== null &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: enterAction,
      });
    $[58] = enterAction;
    $[59] = enterHint;
  } else enterHint = $[59];
  let closeHint;
  if ($[60] === MEMO_CACHE_SENTINEL) {
    closeHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    $[60] = closeHint;
  } else closeHint = $[60];
  let hintsRow;
  if ($[61] !== enterHint) {
    hintsRow = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default_2(Byline, {
          children: [tabsHint, moveHint, enterHint, closeHint],
        }),
      }),
    });
    $[61] = enterHint;
    $[62] = hintsRow;
  } else hintsRow = $[62];
  let viewElement;
  if (
    $[63] !== BodyBox ||
    $[64] !== headerElement ||
    $[65] !== emptyElement ||
    $[66] !== itemRows ||
    $[67] !== addNewElement ||
    $[68] !== consentElement ||
    $[69] !== detailSection ||
    $[70] !== hintsRow
  ) {
    viewElement = jsxProd_default_2(BodyBox, {
      flexDirection,
      children: [
        headerElement,
        emptyElement,
        itemRows,
        addNewElement,
        consentElement,
        detailSection,
        hintsRow,
      ],
    });
    $[63] = BodyBox;
    $[64] = headerElement;
    $[65] = emptyElement;
    $[66] = itemRows;
    $[67] = addNewElement;
    $[68] = consentElement;
    $[69] = detailSection;
    $[70] = hintsRow;
    $[71] = viewElement;
  } else viewElement = $[71];
  return viewElement;
}
//@ chunk-k82fyra0.js:30637-30940 placement
function TabLabel(props) {
  let $ = useMemoCache(7);
  let { isFocused, label, color } = props;
  const color_2 = isFocused ? undefined : color;
  let children;
  if ($[0] !== isFocused || $[1] !== label || $[2] !== color_2) {
    children = jsxProd_default(Text, {
      bold: isFocused,
      color: color_2,
      children: label,
    });
    $[0] = isFocused;
    $[1] = label;
    $[2] = color_2;
    $[3] = children;
  } else children = $[3];
  let listItemElement;
  if ($[4] !== isFocused || $[5] !== children) {
    listItemElement = jsxProd_default(ListItem, {
      isFocused,
      styled: false,
      children,
    });
    $[4] = isFocused;
    $[5] = children;
    $[6] = listItemElement;
  } else listItemElement = $[6];
  return listItemElement;
}
//@ chunk-k82fyra0.js:30940-32051 placement
function serviceTableColumns(kind, items, data, now) {
  let date = new Date(now);
  let isRunning = data.lock !== null;
  let headers;
  let cells;
  let keys;
  let statusColumnIndex;
  if (kind === "scheduled") {
    headers = ["Name", "Schedule", "Next run", "Last run", "PID"];
    statusColumnIndex = 2;
    let taskList = items;
    let schedulerPid = data.scheduledStatus?.workerPid ?? data.status?.workers["scheduled:0"]?.pid;
    keys = taskList.map((task) => task.id);
    cells = taskList.map((task) => {
      let taskStatus = data.scheduledStatus?.tasks[task.id];
      let nextRunAt = task.enabled ? nextCronRunAt(task.cron, date) : null;
      return [
        task.id,
        cronToHuman(task.cron),
        !task.enabled
          ? "disabled"
          : !isRunning
            ? "daemon stopped"
            : taskStatus?.running
              ? "running"
              : nextRunAt
                ? formatRelativeTime(nextRunAt, {
                    now: date,
                  })
                : "\u2014",
        taskStatus?.lastFiredAt
          ? formatRelativeTime(new Date(taskStatus.lastFiredAt), {
              now: date,
            })
          : "\u2014",
        taskStatus?.running && schedulerPid !== undefined ? String(schedulerPid) : "\u2014",
      ];
    });
  } else {
    headers = ["Name", "Directory", "Status", "PID"];
    statusColumnIndex = 2;
    let serverList = items;
    keys = serverList.map((server) => server.dir);
    cells = serverList.map((server, index) => {
      let pid = data.status?.workers[`${kind}:${index}`]?.pid;
      let isActive = isRunning && (data.status === null || pid !== undefined);
      return [
        server.name,
        truncateDirName(server.dir),
        isActive ? "running" : "stopped",
        pid !== undefined ? String(pid) : isActive ? "\u2014" : "",
      ];
    });
  }
  let mapped = headers.map((header, columnIndex) =>
    Math.max(bunStringWidth(header), ...cells.map((row) => bunStringWidth(row[columnIndex] ?? ""))),
  );
  let padCell = (text, columnIndex) =>
    text + " ".repeat(Math.max(0, mapped[columnIndex] - bunStringWidth(text)));
  let header = headers.map(padCell).join("  ");
  let rows = cells.map((row) => ({
    text: row.slice(0, statusColumnIndex).map(padCell).join("  ") + "  ",
    suffix: jsxProd_default_2(Fragment, {
      children: [
        renderPaddedStatus(row[statusColumnIndex], mapped[statusColumnIndex]),
        jsxProd_default(Text, {
          children: row
            .slice(statusColumnIndex + 1)
            .map((cell, offset) => "  " + padCell(cell, statusColumnIndex + 1 + offset))
            .join(""),
        }),
      ],
    }),
  }));
  return {
    header,
    rows,
    keys,
  };
}
//@ chunk-k82fyra0.js:32051-32193 placement
/**
 * 补齐宽度的状态文本，running 显示为成功色。
 */
function renderPaddedStatus(status, width) {
  let children = status + " ".repeat(Math.max(0, width - bunStringWidth(status)));
  return status === "running"
    ? jsxProd_default(Text, {
        color: "success",
        children,
      })
    : jsxProd_default(Text, {
        dimColor: true,
        children,
      });
}
//@ chunk-k82fyra0.js:32193-32245 placement
function nextCronRunAt(cron, from) {
  let fields = parseCronExpression(cron);
  return fields ? computeNextCronRun(fields, from) : null;
}
//@ chunk-k82fyra0.js:32245-32276 placement
function truncateDirName(dir) {
  return truncateStartToWidth(dir, 40);
}
//@ chunk-k82fyra0.js:32276-32327 placement
var SERVICE_ACTION_LABELS = {
  uninstall: "Uninstall service",
  stop: "Stop",
};
//@ chunk-k82fyra0.js:32327-32459 placement
/**
 * 服务可执行的操作：未安装/不支持为空，无锁只能卸载，否则停止和卸载。
 */
function getServiceActions(service) {
  if (!service.serviceSupported || !service.serviceInstalled) return [];
  if (service.lock === null) return ["uninstall"];
  return ["stop", "uninstall"];
}
//@ chunk-k82fyra0.js:32459-34481 placement
function DaemonServiceDetail(props) {
  let $ = useMemoCache(25);
  let { data, message } = props;
  if (message) {
    let messageElement;
    if ($[0] !== message) {
      messageElement = jsxProd_default(Text, {
        dimColor: true,
        children: message,
      });
      $[0] = message;
      $[1] = messageElement;
    } else messageElement = $[1];
    return messageElement;
  }
  if (!data.serviceSupported) {
    let unsupportedElement;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      unsupportedElement = jsxProd_default(Text, {
        dimColor: true,
        children: "service install not available on this platform \u2014 runs on demand",
      });
      $[2] = unsupportedElement;
    } else unsupportedElement = $[2];
    return unsupportedElement;
  }
  if (data.lock === null) {
    const children = data.serviceInstalled ? "installed \xB7 not running" : "not installed (runs on demand)";
    let notRunningElement;
    if ($[3] !== children) {
      notRunningElement = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      $[3] = children;
      $[4] = notRunningElement;
    } else notRunningElement = $[4];
    return notRunningElement;
  }
  let isVersionMismatch;
  if ($[5] !== data.lock.version || $[6] !== data.status) {
    isVersionMismatch =
      data.status === null ||
      data.lock.version !==
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION;
    $[5] = data.lock.version;
    $[6] = data.status;
    $[7] = isVersionMismatch;
  } else isVersionMismatch = $[7];
  let versionMismatch = isVersionMismatch;
  let runningText;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    runningText = jsxProd_default(Text, {
      color: "success",
      children: "running",
    });
    $[8] = runningText;
  } else runningText = $[8];
  let pidFragment;
  if ($[9] !== data.lock.pid) {
    pidFragment = jsxProd_default_2(Fragment, {
      children: ["pid ", data.lock.pid],
    });
    $[9] = data.lock.pid;
    $[10] = pidFragment;
  } else pidFragment = $[10];
  let versionFragment;
  if ($[11] !== data.lock.version) {
    versionFragment = jsxProd_default_2(Fragment, {
      children: ["v", data.lock.version],
    });
    $[11] = data.lock.version;
    $[12] = versionFragment;
  } else versionFragment = $[12];
  let bgCountFragment;
  if ($[13] !== data.bgCount) {
    bgCountFragment =
      data.bgCount > 0 &&
      jsxProd_default_2(Fragment, {
        children: [data.bgCount, " ", plural(data.bgCount, "background session")],
      });
    $[13] = data.bgCount;
    $[14] = bgCountFragment;
  } else bgCountFragment = $[14];
  let notInstalledFragment;
  if ($[15] !== data.serviceInstalled) {
    notInstalledFragment =
      !data.serviceInstalled &&
      jsxProd_default(Fragment, {
        children: "not installed as service",
      });
    $[15] = data.serviceInstalled;
    $[16] = notInstalledFragment;
  } else notInstalledFragment = $[16];
  let updateWarning;
  if ($[17] !== versionMismatch) {
    updateWarning =
      versionMismatch &&
      jsxProd_default(Text, {
        color: "warning",
        children: "restart to update",
      });
    $[17] = versionMismatch;
    $[18] = updateWarning;
  } else updateWarning = $[18];
  let detailElement;
  if (
    $[19] !== pidFragment ||
    $[20] !== versionFragment ||
    $[21] !== bgCountFragment ||
    $[22] !== notInstalledFragment ||
    $[23] !== updateWarning
  ) {
    detailElement = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [
          runningText,
          pidFragment,
          versionFragment,
          bgCountFragment,
          notInstalledFragment,
          updateWarning,
        ],
      }),
    });
    $[19] = pidFragment;
    $[20] = versionFragment;
    $[21] = bgCountFragment;
    $[22] = notInstalledFragment;
    $[23] = updateWarning;
    $[24] = detailElement;
  } else detailElement = $[24];
  return detailElement;
}
//@ chunk-k82fyra0.js:34481-34967 placement
async function renderDaemonServicesView(storageV5) {
  let [{ createRoot }, { getBaseRenderOptions }] = await Promise.all([
    import("../../ink/components/Ansi.lazy.js"),
    import("../../utils/renderOptions.js"),
  ]);
  let { AppRoot } = await import("../AppRoot.js");
  let { getEraseScreenSequence } = await import("../../ink/clearTerminal.js");
  let initialData = await loadDaemonOverview(storageV5);
  process.stdout.write(getEraseScreenSequence());
  let root = await createRoot(getBaseRenderOptions(false));
  await new Promise((resolve) => {
    root.render(
      jsxProd_default(AppRoot, {
        children: jsxProd_default(DaemonSetupFlow, {
          initialData,
          modelOptions: modelSelectOptions(),
          storageV5,
          onDone: (message) => {
            if (message)
              process.stdout.write(
                message +
                  `
`,
              );
            resolve();
          },
        }),
      }),
    );
  });
  root.unmount();
}
export { DaemonServicesView, renderDaemonServicesView };
