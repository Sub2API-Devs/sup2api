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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useDialogKeybindings } from "../keybindings/dialogKeyHints.js";
import { Dialog } from "./design-system/Dialog.js";
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import {
  isSelfHostedPoolEnv,
  isSelfHostedPool,
  getEnvironmentSelectionInfo,
} from "../utils/teleport/environmentSelection.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { fetchEnvironmentsAndPools } from "../utils/teleport/selfHostedPool.js";
import { toError } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { getSettingSourceName } from "../utils/settings/constants.js";
import { sequential } from "../utils/sequential.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";
import { plural } from "../utils/stringUtils.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { merged } from "./CustomSelect/select.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:589975-590211 fingerprint = _temp (0.491)
/**
 * 本地会话的计算机与目录是否一致。
 */
function isSameLocalFolder(computerFolder, target) {
  let last = computerFolder.path
    .split(/[\\/]+/)
    .filter(Boolean)
    .at(-1);
  return (
    typeof target.computer_name === "string" &&
    typeof target.folder === "string" &&
    typeof target.environment_id === "string" &&
    target.computer_name === computerFolder.computer_name &&
    last !== undefined &&
    last === target.folder
  );
}
//@ chunk-18hwfzwa.js:1100666-1100715 sole-consumer
function renderParagraph(children, key) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    key,
  );
}
//@ chunk-18hwfzwa.js:1100715-1101521 fingerprint = SingleEnvironmentContent (0.394)
function SingleEnvironmentContent(props) {
  let $ = useMemoCache(17);
  let { title, paragraphs, onDone } = props;
  let onCancel;
  let onInterrupt;
  if ($[0] !== onDone) {
    onCancel = () => onDone("interrupt");
    onInterrupt = () => {
      onDone("interrupt");
      return true;
    };
    $[0] = onDone;
    $[1] = onCancel;
    $[2] = onInterrupt;
  } else {
    onCancel = $[1];
    onInterrupt = $[2];
  }
  let bindings;
  if ($[3] !== onDone) {
    bindings = [
      {
        action: "confirm:yes",
        hint: "continue",
        run: () => onDone("continue"),
      },
    ];
    $[3] = onDone;
    $[4] = bindings;
  } else bindings = $[4];
  let children;
  if ($[5] !== paragraphs) {
    children = paragraphs.map(renderParagraph);
    $[5] = paragraphs;
    $[6] = children;
  } else children = $[6];
  let children_2;
  if ($[7] !== children) {
    children_2 = jsxProd_default(Box, {
      flexDirection: "column",
      gap: 1,
      children,
    });
    $[7] = children;
    $[8] = children_2;
  } else children_2 = $[8];
  let children_3;
  if ($[9] !== bindings || $[10] !== children_2) {
    children_3 = jsxProd_default(useDialogKeybindings, {
      scope: "Confirmation",
      claimFocus: true,
      bindings,
      children: children_2,
    });
    $[9] = bindings;
    $[10] = children_2;
    $[11] = children_3;
  } else children_3 = $[11];
  let dialogElement;
  if ($[12] !== onCancel || $[13] !== onInterrupt || $[14] !== children_3 || $[15] !== title) {
    dialogElement = jsxProd_default(Dialog, {
      title,
      onCancel,
      onInterrupt,
      children: children_3,
    });
    $[12] = onCancel;
    $[13] = onInterrupt;
    $[14] = children_3;
    $[15] = title;
    $[16] = dialogElement;
  } else dialogElement = $[16];
  return dialogElement;
}
//@ chunk-zj31az9x.js:14567-14571 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zj31az9x.js:14567", () => {
  init_react_production();
});
//@ chunk-zj31az9x.js:14571-14600 layout
function isKnownEnvironment(environment) {
  return !isSelfHostedPoolEnv(environment);
}
//@ chunk-zj31az9x.js:14600-14688 fingerprint = SETUP_HINT (0.667)
var SELECT_ENV_TITLE = "Select remote environment";
var CONFIGURE_ENV_HINT = "Configure environments at: https://claude.ai/code";
//@ chunk-zj31az9x.js:14688-17534 fingerprint = RemoteEnvironmentDialog (0.465)
/**
 * 远程环境选择：拉取环境列表，单个时确认、多个时选择并可设为默认（userSettings）。
 */
function RemoteEnvironmentDialog(props) {
  let $ = useMemoCache(35);
  let { onDone } = props;
  let { storageV5, credentials } = useTheme_2();
  let [loadingState, setLoadingState] = useState("loading");
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = [];
    $[0] = t1;
  } else t1 = $[0];
  let [environments, setEnvironments] = useState(t1);
  let [selectedTarget, setSelectedTarget] = useState(null);
  let [selectedTargetSource, setSelectedTargetSource] = useState(null);
  let [selectedEnvironment, setSelectedEnvironment] = useState(null);
  let [selectedEnvironmentSource, setSelectedEnvironmentSource] = useState(null);
  let [error, setError] = useState(null);
  let loadEnvironments;
  let loadEnvironmentsDeps;
  if ($[1] !== credentials || $[2] !== storageV5) {
    loadEnvironments = () => {
      let cancelled = false;
      let fetchInfo = async function fetchInfo() {
        try {
          let result = await fetchEnvironmentsAndPools(storageV5, credentials);
          if (cancelled) {
            return;
          }
          setEnvironments(result.availableTargets);
          setSelectedTarget(result.selectedTarget);
          setSelectedTargetSource(result.selectedTargetSource);
          setSelectedEnvironment(result.environmentsError);
          setSelectedEnvironmentSource(result.ignoredUntrustedPool);
          setLoadingState(null);
        } catch (error) {
          let err = error;
          if (cancelled) {
            return;
          }
          let fetchError = toError(err);
          logForDebugging(`Failed to fetch remote environments: ${fetchError.message}`, {
            level: "error",
          });
          setError(fetchError.message);
          setLoadingState(null);
        }
      };
      fetchInfo();
      return () => {
        cancelled = true;
      };
    };
    loadEnvironmentsDeps = [credentials, storageV5];
    $[1] = credentials;
    $[2] = storageV5;
    $[3] = loadEnvironments;
    $[4] = loadEnvironmentsDeps;
  } else {
    loadEnvironments = $[3];
    loadEnvironmentsDeps = $[4];
  }
  useEffect(loadEnvironments, loadEnvironmentsDeps);
  let t4;
  if ($[5] !== onDone || $[6] !== storageV5 || $[7] !== environments) {
    t4 = function handleSelect(value) {
      if (value === "cancel") {
        onDone();
        return;
      }
      setLoadingState("updating");
      let selectedEnv = environments.find((env) => isSelfHostedPool(env) === value);
      if (!selectedEnv) {
        onDone("Error: Selected environment not found");
        return;
      }
      let clearLocalDefaultPromise =
        getSettingsForSourceForUpkeep("localSettings")?.remote?.defaultEnvironmentId !== undefined
          ? updateSettingsForSource(
              "localSettings",
              {
                remote: {
                  defaultEnvironmentId: undefined,
                },
              },
              undefined,
              storageV5,
            )
          : Promise.resolve({
              error: null,
            });
      let saveUserDefaultPromise = updateSettingsForSource(
        "userSettings",
        {
          remote: {
            defaultEnvironmentId: isSelfHostedPool(selectedEnv),
          },
        },
        undefined,
        storageV5,
      );
      let environmentKindLabel = isSelfHostedPoolEnv(selectedEnv)
        ? "self-hosted environment"
        : "remote environment";
      Promise.all([clearLocalDefaultPromise, saveUserDefaultPromise]).then(() => {
        let environmentSelectionInfo = getEnvironmentSelectionInfo();
        let pinnedSettingsNote =
          environmentSelectionInfo.id !== undefined &&
          environmentSelectionInfo.id !== isSelfHostedPool(selectedEnv) &&
          environmentSelectionInfo.source !== undefined
            ? ` \u2014 note: ${getSettingSourceName(environmentSelectionInfo.source)} settings pin ${environmentSelectionInfo.id}, which takes precedence here`
            : "";
        onDone(
          `Set default ${environmentKindLabel} to ${sequential.bold(selectedEnv.name)} (${isSelfHostedPool(selectedEnv)})${pinnedSettingsNote}`,
        );
      });
    };
    $[5] = onDone;
    $[6] = storageV5;
    $[7] = environments;
    $[8] = t4;
  } else t4 = $[8];
  let onSelect = t4;
  if (loadingState === "loading") {
    let children;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(WorkerBadge, {
        message: "Loading environments\u2026",
      });
      $[9] = children;
    } else children = $[9];
    let t6;
    if ($[10] !== onDone) {
      t6 = jsxProd_default(Dialog, {
        title: SELECT_ENV_TITLE,
        onCancel: onDone,
        hideInputGuide: true,
        children,
      });
      $[10] = onDone;
      $[11] = t6;
    } else t6 = $[11];
    return t6;
  }
  if (error) {
    let children;
    if ($[12] !== error) {
      children = jsxProd_default_2(Text, {
        color: "error",
        children: ["Error: ", error],
      });
      $[12] = error;
      $[13] = children;
    } else children = $[13];
    let t6;
    if ($[14] !== onDone || $[15] !== children) {
      t6 = jsxProd_default(Dialog, {
        title: SELECT_ENV_TITLE,
        onCancel: onDone,
        children,
      });
      $[14] = onDone;
      $[15] = children;
      $[16] = t6;
    } else t6 = $[16];
    return t6;
  }
  if (!selectedTarget) {
    let textElement;
    if ($[17] === MEMO_CACHE_SENTINEL) {
      textElement = jsxProd_default(Text, {
        children: "No remote environments available.",
      });
      $[17] = textElement;
    } else textElement = $[17];
    let environmentsErrorNotice;
    if ($[18] !== selectedEnvironment) {
      environmentsErrorNotice =
        selectedEnvironment &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["(couldn't list environments: ", selectedEnvironment, ")"],
        });
      $[18] = selectedEnvironment;
      $[19] = environmentsErrorNotice;
    } else environmentsErrorNotice = $[19];
    let ignoredSourceNotice;
    if ($[20] !== selectedEnvironmentSource) {
      ignoredSourceNotice =
        selectedEnvironmentSource &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "(ignoring self-hosted environment default ",
            selectedEnvironmentSource.id,
            " ",
            "from ",
            getSettingSourceName(selectedEnvironmentSource.source),
            " settings \u2014 self-hosted placement is only honoured from user/policy/flag settings)",
          ],
        });
      $[20] = selectedEnvironmentSource;
      $[21] = ignoredSourceNotice;
    } else ignoredSourceNotice = $[21];
    let dialogElement;
    if ($[22] !== onDone || $[23] !== environmentsErrorNotice || $[24] !== ignoredSourceNotice) {
      dialogElement = jsxProd_default_2(Dialog, {
        title: SELECT_ENV_TITLE,
        subtitle: CONFIGURE_ENV_HINT,
        onCancel: onDone,
        children: [textElement, environmentsErrorNotice, ignoredSourceNotice],
      });
      $[22] = onDone;
      $[23] = environmentsErrorNotice;
      $[24] = ignoredSourceNotice;
      $[25] = dialogElement;
    } else dialogElement = $[25];
    return dialogElement;
  }
  let t5;
  if (
    $[26] !== selectedEnvironment ||
    $[27] !== onSelect ||
    $[28] !== selectedEnvironmentSource ||
    $[29] !== loadingState ||
    $[30] !== onDone ||
    $[31] !== selectedTarget ||
    $[32] !== selectedTargetSource ||
    $[33] !== environments
  ) {
    t5 = jsxProd_default(MultipleEnvironmentsContent, {
      targets: environments,
      selectedTarget,
      selectedTargetSource,
      environmentsError: selectedEnvironment,
      ignoredUntrustedPool: selectedEnvironmentSource,
      loadingState,
      onSelect,
      onCancel: onDone,
    });
    $[26] = selectedEnvironment;
    $[27] = onSelect;
    $[28] = selectedEnvironmentSource;
    $[29] = loadingState;
    $[30] = onDone;
    $[31] = selectedTarget;
    $[32] = selectedTargetSource;
    $[33] = environments;
    $[34] = t5;
  } else t5 = $[34];
  return t5;
}
//@ chunk-zj31az9x.js:17534-17749 layout
function renderEnvironmentItem(environment, key) {
  let isPool = isSelfHostedPool(environment);
  let runnerLabel = isSelfHostedPoolEnv(environment)
    ? `${environment.alive_runner_count} ${plural(environment.alive_runner_count, "runner")}`
    : "";
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: environment.name,
      icon:
        isPool === key
          ? jsxProd_default(StatusIcon, {
              status: "success",
              "aria-label": "current:",
            })
          : undefined,
      meta: [runnerLabel, isPool],
    },
    isPool,
  );
}
//@ chunk-zj31az9x.js:17749-19855 fingerprint = MultipleEnvironmentsContent (0.508)
function MultipleEnvironmentsContent(props) {
  let $ = useMemoCache(38);
  let {
    targets,
    selectedTarget,
    selectedTargetSource,
    environmentsError,
    ignoredUntrustedPool,
    loadingState,
    onSelect,
    onCancel,
  } = props;
  let sourceSuffix;
  if ($[0] !== selectedTargetSource) {
    sourceSuffix =
      selectedTargetSource && selectedTargetSource !== "userSettings"
        ? ` (from ${getSettingSourceName(selectedTargetSource)} settings)`
        : "";
    $[0] = selectedTargetSource;
    $[1] = sourceSuffix;
  } else sourceSuffix = $[1];
  let sourceSuffixText = sourceSuffix;
  let currentSelectionElement;
  if ($[2] !== selectedTarget || $[3] !== selectedTargetSource || $[4] !== sourceSuffixText) {
    currentSelectionElement = selectedTargetSource
      ? jsxProd_default_2(Text, {
          children: [
            "Currently using: ",
            jsxProd_default(Text, {
              bold: true,
              children: selectedTarget.name,
            }),
            sourceSuffixText,
          ],
        })
      : "None of these is your default";
    $[2] = selectedTarget;
    $[3] = selectedTargetSource;
    $[4] = sourceSuffixText;
    $[5] = currentSelectionElement;
  } else currentSelectionElement = $[5];
  let subtitleContent = currentSelectionElement;
  let dialogComponent;
  let listElement;
  let title;
  let subtitle;
  let onCancel_2;
  let hideInputGuide;
  let configHintElement;
  let environmentsErrorElement;
  let ignoredPoolElement;
  if (
    $[6] !== environmentsError ||
    $[7] !== ignoredUntrustedPool ||
    $[8] !== loadingState ||
    $[9] !== onCancel ||
    $[10] !== onSelect ||
    $[11] !== selectedTarget ||
    $[12] !== selectedTargetSource ||
    $[13] !== subtitleContent ||
    $[14] !== targets
  ) {
    let filtered = targets.filter(isKnownEnvironment);
    let filtered_2 = targets.filter(isSelfHostedPoolEnv);
    let orderedTargets = [...filtered, ...filtered_2];
    let selectedPoolId = selectedTargetSource ? isSelfHostedPool(selectedTarget) : undefined;
    dialogComponent = Dialog;
    title = SELECT_ENV_TITLE;
    subtitle = subtitleContent;
    onCancel_2 = onCancel;
    hideInputGuide = true;
    if ($[24] === MEMO_CACHE_SENTINEL) {
      configHintElement = jsxProd_default(Text, {
        dimColor: true,
        children: CONFIGURE_ENV_HINT,
      });
      $[24] = configHintElement;
    } else configHintElement = $[24];
    environmentsErrorElement =
      environmentsError &&
      filtered.length === 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["(couldn't list environments: ", environmentsError, ")"],
      });
    if ($[25] !== ignoredUntrustedPool) {
      ignoredPoolElement =
        ignoredUntrustedPool &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "(ignoring self-hosted environment default ",
            ignoredUntrustedPool.id,
            " ",
            "from ",
            getSettingSourceName(ignoredUntrustedPool.source),
            " settings \u2014 self-hosted placement is only honoured from user/policy/flag settings)",
          ],
        });
      $[25] = ignoredUntrustedPool;
      $[26] = ignoredPoolElement;
    } else ignoredPoolElement = $[26];
    listElement =
      loadingState === "updating"
        ? jsxProd_default(WorkerBadge, {
            message: "Updating\u2026",
          })
        : jsxProd_default_2(OrderedListWithItem, {
            defaultFocusIndex: orderedTargets.findIndex(
              (target) => isSelfHostedPool(target) === selectedPoolId,
            ),
            onSelect: (index) => {
              let chosenTarget = orderedTargets[index];
              if (chosenTarget) onSelect(isSelfHostedPool(chosenTarget));
            },
            children: [
              filtered.map((knownTarget) => renderEnvironmentItem(knownTarget, selectedPoolId)),
              filtered_2.length > 0
                ? jsxProd_default(merged.Heading, {
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      children: "\u2014 Self-hosted environments \u2014",
                    }),
                  })
                : null,
              filtered_2.map((selfHostedTarget) => renderEnvironmentItem(selfHostedTarget, selectedPoolId)),
            ],
          });
    $[6] = environmentsError;
    $[7] = ignoredUntrustedPool;
    $[8] = loadingState;
    $[9] = onCancel;
    $[10] = onSelect;
    $[11] = selectedTarget;
    $[12] = selectedTargetSource;
    $[13] = subtitleContent;
    $[14] = targets;
    $[15] = dialogComponent;
    $[16] = listElement;
    $[17] = title;
    $[18] = subtitle;
    $[19] = onCancel_2;
    $[20] = hideInputGuide;
    $[21] = configHintElement;
    $[22] = environmentsErrorElement;
    $[23] = ignoredPoolElement;
  } else {
    dialogComponent = $[15];
    listElement = $[16];
    title = $[17];
    subtitle = $[18];
    onCancel_2 = $[19];
    hideInputGuide = $[20];
    configHintElement = $[21];
    environmentsErrorElement = $[22];
    ignoredPoolElement = $[23];
  }
  let shortcutHintElement;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    shortcutHintElement = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "select",
          }),
          jsxProd_default(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "cancel",
          }),
        ],
      }),
    });
    $[27] = shortcutHintElement;
  } else shortcutHintElement = $[27];
  let dialogComponentElement;
  if (
    $[28] !== dialogComponent ||
    $[29] !== listElement ||
    $[30] !== title ||
    $[31] !== subtitle ||
    $[32] !== onCancel_2 ||
    $[33] !== hideInputGuide ||
    $[34] !== configHintElement ||
    $[35] !== environmentsErrorElement ||
    $[36] !== ignoredPoolElement
  ) {
    dialogComponentElement = jsxProd_default_2(dialogComponent, {
      title,
      subtitle,
      onCancel: onCancel_2,
      hideInputGuide,
      children: [
        configHintElement,
        environmentsErrorElement,
        ignoredPoolElement,
        listElement,
        shortcutHintElement,
      ],
    });
    $[28] = dialogComponent;
    $[29] = listElement;
    $[30] = title;
    $[31] = subtitle;
    $[32] = onCancel_2;
    $[33] = hideInputGuide;
    $[34] = configHintElement;
    $[35] = environmentsErrorElement;
    $[36] = ignoredPoolElement;
    $[37] = dialogComponentElement;
  } else dialogComponentElement = $[37];
  return dialogComponentElement;
}
export { isSameLocalFolder, SingleEnvironmentContent, RemoteEnvironmentDialog };
