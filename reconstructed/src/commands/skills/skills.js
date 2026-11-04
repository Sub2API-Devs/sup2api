/**
 * commands/skills/skills.tsx
 *
 * /skills 实现：列出技能及其上下文开销
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/skills/skills.tsx
 * pieces: chunk-00qhwn8e.js (9), chunk-ygke3hz8.js (1)
 * attribution: sole-consumer 4, placement 2, layout 3, fingerprint 1
 */
import { init_react_production, useState, useRef } from "../../../vendor/react/cjs/react.production.js";
import { isNotProtoKey } from "../../utils/commandPredicates.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import {
  sortSkillsForListing,
  describeSyncedSkillConflicts,
  localSkillOverrides,
  buildSkillOverrideContext,
  getEffectiveSkillStates,
  claudeAiSkillDisplayName,
  getSkillSourceLabel,
  diffSkillOverrides,
} from "../../skills/claudeAiSkillConflicts.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useLatestState } from "../../components/CustomSelect/option-map.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useHasFocus } from "../../ink/components/Input.js";
import { getFocusManager } from "../../ink/focus.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useScrollViewportSize } from "../../components/ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { countCharInString, plural } from "../../utils/stringUtils.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { PANE_PADDING } from "../../components/design-system/Pane.js";
import { clamp } from "../../ink/screen.js";
import { updateSettingsForSource } from "../../utils/settings/settings.js";
import { clearCommandMemoizationCaches } from "../../commands.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { HintText } from "../../components/design-system/HintText.js";
import { isSafeMode, getSafeModeExitHint } from "../../utils/envUtils.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { uniq } from "../../utils/collections.js";
import { Box, Text } from "../../ink/components/Text.js";
import { SearchBox } from "../../components/SearchBox.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { formatTokenEstimate } from "../../utils/format.js";
import { estimateSkillListingTokens } from "../../skills/loadSkillsDir.js";
import { getRemoteCaps } from "../../remote/remoteMode.js";
import { SkillsMenu_2 } from "../../components/skills/SkillsMenu.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";

//@ chunk-ygke3hz8.js:528-583 placement
/**
 * 技能状态的四个取值（on/name-only/user-invocable-only/off），/skills 与插件页循环切换用。
 */
var SKILL_STATE_OPTIONS = ["on", "name-only", "user-invocable-only", "off"];
//@ chunk-00qhwn8e.js:19170-19174 sole-consumer
init_react_production();
//@ chunk-00qhwn8e.js:19174-19200 sole-consumer
function negateValue(value) {
  return !value;
}
//@ chunk-00qhwn8e.js:19200-19231 sole-consumer
function skillNameOf(command) {
  return command.name;
}
//@ chunk-00qhwn8e.js:19231-19262 sole-consumer
function isStorableSkillName(name) {
  return !isNotProtoKey(name);
}
//@ chunk-00qhwn8e.js:19262-19306 placement = _temp0 (1)
function isPluginSkill(a_5) {
  return a_5.source === "plugin";
}
//@ chunk-00qhwn8e.js:19306-19551 layout
var SKILL_STATE_DISPLAY = {
  on: {
    icon: jsxProd_default(StatusIcon, {
      status: "on",
    }),
  },
  "name-only": {
    icon: jsxProd_default(StatusIcon, {
      status: "on",
      "aria-label": "name only:",
    }),
    word: "name-only",
  },
  "user-invocable-only": {
    icon: jsxProd_default(StatusIcon, {
      status: "on",
      "aria-label": "user only:",
    }),
    word: "user-only",
  },
  off: {
    icon: jsxProd_default(StatusIcon, {
      status: "off",
    }),
  },
};
//@ chunk-00qhwn8e.js:19551-19655 layout
function lockReasonText(lock) {
  if (!lock) return "";
  return lock.source === "reserved-name" ? "reserved name" : `locked by ${lock.source}`;
}
//@ chunk-00qhwn8e.js:19655-27856 layout
/**
 * /skills 菜单：列出技能、上下文开销、排序、搜索与开关状态。
 */
function SkillsMenu(props) {
  let $ = useMemoCache(144);
  let { onExit, commands, bytesPerToken } = props;
  let { storageV5 } = useTheme_2();
  let [sortByTokens, setSortByTokens] = useState(false);
  let sortedCommands;
  if ($[0] !== commands || $[1] !== sortByTokens) {
    sortedCommands = sortSkillsForListing(commands, {
      sortByTokens,
    });
    $[0] = commands;
    $[1] = sortByTokens;
    $[2] = sortedCommands;
  } else sortedCommands = $[2];
  let commands_2 = sortedCommands;
  let conflictWarning;
  if ($[3] !== commands || $[4] !== commands_2) {
    conflictWarning = describeSyncedSkillConflicts(commands_2, commands);
    $[3] = commands;
    $[4] = commands_2;
    $[5] = conflictWarning;
  } else conflictWarning = $[5];
  let conflictText = conflictWarning;
  let localOverrides;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    localOverrides = localSkillOverrides();
    $[6] = localOverrides;
  } else localOverrides = $[6];
  let localOverrides_2 = localOverrides;
  let overrideContext;
  if ($[7] !== commands_2) {
    overrideContext = buildSkillOverrideContext(commands_2, localOverrides_2);
    $[7] = commands_2;
    $[8] = overrideContext;
  } else overrideContext = $[8];
  let context = overrideContext;
  let { locked } = context;
  let computeStates;
  if ($[9] !== commands_2 || $[10] !== context) {
    computeStates = () => getEffectiveSkillStates(commands_2, context);
    $[9] = commands_2;
    $[10] = context;
    $[11] = computeStates;
  } else computeStates = $[11];
  let [states, setStates, getStates] = useLatestState(computeStates);
  let [, setFocusedCommand, getFocusedCommand] = useLatestState(commands_2[0]);
  let isTerminalFocused = useTerminalFocus();
  let containerRef = useRef(null);
  let searchRef = useRef(null);
  let hasFocus = useHasFocus(searchRef);
  let isSearchFocused;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    isSearchFocused = () => {
      let searchNode = searchRef.current;
      return searchNode !== null && getFocusManager(searchNode).activeElement === searchNode;
    };
    $[12] = isSearchFocused;
  } else isSearchFocused = $[12];
  let searchHasFocus = isSearchFocused;
  let focusSearch;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    focusSearch = () => {
      let node = searchRef.current;
      if (node) getFocusManager(node).focus(node);
    };
    $[13] = focusSearch;
  } else focusSearch = $[13];
  let focusSearch_2 = focusSearch;
  let searchInputOptions;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    searchInputOptions = {
      isActive: true,
      onExit: () => {
        let containerNode = containerRef.current;
        if (containerNode) getFocusManager(containerNode).focus(containerNode);
      },
      passthroughCtrlKeys: ["c", "d"],
    };
    $[14] = searchInputOptions;
  } else searchInputOptions = $[14];
  let { query, queryRef, setQuery, cursorOffset, handleKeyDown, handlePaste } =
    useSearchInput(searchInputOptions);
  useGlobalExitKeybindings();
  let filteredCommands;
  Dr: {
    if (!query) {
      filteredCommands = commands_2;
      break Dr;
    }
    let searchMatches;
    if ($[15] !== query || $[16] !== commands_2) {
      let lower = query.toLowerCase();
      searchMatches = commands_2.filter(
        (command) =>
          command.name.toLowerCase().includes(lower) ||
          claudeAiSkillDisplayName(command).toLowerCase().includes(lower) ||
          (command.description ?? "").toLowerCase().includes(lower) ||
          getSkillSourceLabel(command).toLowerCase().includes(lower),
      );
      $[15] = query;
      $[16] = commands_2;
      $[17] = searchMatches;
    } else searchMatches = $[17];
    filteredCommands = searchMatches;
  }
  let visibleCommands = filteredCommands;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let conflictHeight;
  if ($[18] !== columns || $[19] !== conflictText) {
    conflictHeight =
      conflictText === undefined
        ? 0
        : 2 +
          countCharInString(
            wrapAnsi(conflictText, Math.max(1, columns - 2 * PANE_PADDING), {
              hard: true,
              trim: true,
            }),
            `
`,
          );
    $[18] = columns;
    $[19] = conflictText;
    $[20] = conflictHeight;
  } else conflictHeight = $[20];
  let conflictRows = conflictHeight;
  const listHeight = rows - 13 - conflictRows;
  let visibleCount;
  if ($[21] !== visibleCommands.length || $[22] !== listHeight) {
    visibleCount = clamp(listHeight, 4, visibleCommands.length);
    $[21] = visibleCommands.length;
    $[22] = listHeight;
    $[23] = visibleCount;
  } else visibleCount = $[23];
  let visibleCount_2 = visibleCount;
  let cycleState;
  if ($[24] !== visibleCommands || $[25] !== getFocusedCommand || $[26] !== locked || $[27] !== setStates) {
    cycleState = () => {
      let focused = getFocusedCommand();
      if (!focused || !visibleCommands.includes(focused)) {
        return;
      }
      if (locked.has(focused)) {
        return;
      }
      setStates((previousStates) => {
        let currentState = previousStates[focused.name] ?? "on";
        let nextState =
          SKILL_STATE_OPTIONS[(SKILL_STATE_OPTIONS.indexOf(currentState) + 1) % SKILL_STATE_OPTIONS.length];
        return Object.assign(Object.create(null), previousStates, {
          [focused.name]: nextState,
        });
      });
    };
    $[24] = visibleCommands;
    $[25] = getFocusedCommand;
    $[26] = locked;
    $[27] = setStates;
    $[28] = cycleState;
  } else cycleState = $[28];
  let cycleFocusedState = cycleState;
  let savingRef = useRef(false);
  let handleSave;
  if (
    $[29] !== getStates ||
    $[30] !== onExit ||
    $[31] !== commands_2 ||
    $[32] !== storageV5 ||
    $[33] !== context
  ) {
    handleSave = async () => {
      if (savingRef.current) {
        return;
      }
      savingRef.current = true;
      let { diff, writes, effectiveChanged } = diffSkillOverrides(commands_2, getStates(), context);
      if (writes > 0) {
        let { error } = await updateSettingsForSource(
          "localSettings",
          {
            skillOverrides: diff,
          },
          undefined,
          storageV5,
        );
        if (error) {
          onExit(`Failed to save skill overrides: ${error.message}`, {
            display: "system",
          });
          return;
        }
        clearCommandMemoizationCaches();
      }
      onExit(
        effectiveChanged > 0
          ? `Updated ${effectiveChanged} skill ${plural(effectiveChanged, "override")}`
          : "No changes",
        {
          display: "system",
        },
      );
    };
    $[29] = getStates;
    $[30] = onExit;
    $[31] = commands_2;
    $[32] = storageV5;
    $[33] = context;
    $[34] = handleSave;
  } else handleSave = $[34];
  let saveOverrides = handleSave;
  let shortcutDisplay = useShortcutDisplay("confirm:no", "Settings", "esc");
  let shortcutDisplay_2 = useShortcutDisplay("settings:sortByTokens", "Settings", "t");
  let onAccept;
  if ($[35] !== cycleFocusedState) {
    onAccept = () => {
      if (searchHasFocus()) {
        return false;
      }
      cycleFocusedState();
    };
    $[35] = cycleFocusedState;
    $[36] = onAccept;
  } else onAccept = $[36];
  let toggleSort;
  if ($[37] === MEMO_CACHE_SENTINEL) {
    toggleSort = () => {
      if (searchHasFocus()) {
        return false;
      }
      setSortByTokens(negateValue);
    };
    $[37] = toggleSort;
  } else toggleSort = $[37];
  let settingsKeymap;
  if ($[38] !== onAccept) {
    settingsKeymap = {
      "select:accept": onAccept,
      "settings:sortByTokens": toggleSort,
    };
    $[38] = onAccept;
    $[39] = settingsKeymap;
  } else settingsKeymap = $[39];
  const isActive = visibleCommands.length > 0;
  let settingsKeymapContext;
  if ($[40] !== isActive) {
    settingsKeymapContext = {
      context: "Settings",
      isActive,
    };
    $[40] = isActive;
    $[41] = settingsKeymapContext;
  } else settingsKeymapContext = $[41];
  MessageActionsKeybindings(settingsKeymap, settingsKeymapContext);
  let cancelKeymap;
  if ($[42] !== saveOverrides) {
    cancelKeymap = {
      "confirm:no": () => {
        if (searchHasFocus()) {
          return false;
        }
        saveOverrides();
      },
    };
    $[42] = saveOverrides;
    $[43] = cancelKeymap;
  } else cancelKeymap = $[43];
  let cancelKeymapContext;
  if ($[44] === MEMO_CACHE_SENTINEL) {
    cancelKeymapContext = {
      context: "Settings",
    };
    $[44] = cancelKeymapContext;
  } else cancelKeymapContext = $[44];
  MessageActionsKeybindings(cancelKeymap, cancelKeymapContext);
  let handleKeyInput;
  if ($[45] !== queryRef || $[46] !== setQuery) {
    handleKeyInput = (event) => {
      if (event.defaultPrevented || event.target === searchRef.current) {
        return;
      }
      if (event.name === "tab") {
        event.preventDefault();
        return;
      }
      if (event.ctrl || event.meta) {
        return;
      }
      if (event.name === "backspace") {
        if (queryRef.current) {
          event.preventDefault();
          focusSearch_2();
          setQuery(queryRef.current.slice(0, -1));
        }
        return;
      }
      if (event.name.length > 1 && event.name !== "number") {
        return;
      }
      if (event.key.length >= 1 && event.key !== " ") {
        event.preventDefault();
        focusSearch_2();
        let typedChar = event.key.startsWith("/") ? event.key.slice(1) : event.key;
        setQuery(queryRef.current + typedChar);
      }
    };
    $[45] = queryRef;
    $[46] = setQuery;
    $[47] = handleKeyInput;
  } else handleKeyInput = $[47];
  let onKeyInput = handleKeyInput;
  let onPasteInput;
  if ($[48] !== queryRef || $[49] !== setQuery) {
    onPasteInput = (event) => {
      if (event.defaultPrevented || event.target === searchRef.current) {
        return;
      }
      let pastedText = event.text.split(/\r\n|\r|\n/, 2)[0] ?? "";
      if (pastedText.length === 0) {
        return;
      }
      event.preventDefault();
      focusSearch_2();
      let pasteChar = pastedText.startsWith("/") ? pastedText.slice(1) : pastedText;
      setQuery(queryRef.current + pasteChar);
    };
    $[48] = queryRef;
    $[49] = setQuery;
    $[50] = onPasteInput;
  } else onPasteInput = $[50];
  let onPaste = onPasteInput;
  if (commands_2.length === 0) {
    let onCancel;
    if ($[51] !== onExit) {
      onCancel = () =>
        onExit("Skills dialog dismissed", {
          display: "system",
        });
      $[51] = onExit;
      $[52] = onCancel;
    } else onCancel = $[52];
    let inputGuide;
    if ($[53] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "close",
      });
      $[53] = inputGuide;
    } else inputGuide = $[53];
    let children;
    if ($[54] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(HintText, {
        hint: isSafeMode()
          ? `Custom skills are disabled in safe mode \u2014 ${getSafeModeExitHint()} to load them`
          : "Create skills in .claude/skills/ or ~/.claude/skills/",
        children: "No skills found",
      });
      $[54] = children;
    } else children = $[54];
    let emptyDialog;
    if ($[55] !== onCancel) {
      emptyDialog = jsxProd_default(Dialog, {
        title: "Skills",
        onCancel,
        inputGuide,
        children,
      });
      $[55] = onCancel;
      $[56] = emptyDialog;
    } else emptyDialog = $[56];
    return emptyDialog;
  }
  let Container;
  let DialogComponent;
  let ref;
  let flexDirection;
  let tabIndex;
  let autoFocus;
  let onKeyDown;
  let onPaste_2;
  let searchBox;
  let listOrEmpty;
  let pluginHint;
  let conflictTextNode;
  let unstorableNote;
  let title;
  let subtitle;
  let onCancel;
  let isCancelActive;
  let hideInputGuide;
  if (
    $[57] !== bytesPerToken ||
    $[58] !== shortcutDisplay ||
    $[59] !== states ||
    $[60] !== visibleCommands ||
    $[61] !== onKeyInput ||
    $[62] !== onPaste ||
    $[63] !== isScreenReaderEnabled ||
    $[64] !== hasFocus ||
    $[65] !== isTerminalFocused ||
    $[66] !== locked ||
    $[67] !== onExit ||
    $[68] !== cursorOffset ||
    $[69] !== handleKeyDown ||
    $[70] !== handlePaste ||
    $[71] !== query ||
    $[72] !== setFocusedCommand ||
    $[73] !== conflictText ||
    $[74] !== commands_2 ||
    $[75] !== sortByTokens ||
    $[76] !== shortcutDisplay_2 ||
    $[77] !== visibleCount_2
  ) {
    let unstorableNames = uniq(commands_2.map(skillNameOf).filter(isStorableSkillName));
    let countText;
    if ($[96] !== visibleCommands.length || $[97] !== query || $[98] !== commands_2.length) {
      countText = query
        ? `${visibleCommands.length}/${commands_2.length} ${plural(commands_2.length, "skill")}`
        : `${commands_2.length} ${plural(commands_2.length, "skill")}`;
      $[96] = visibleCommands.length;
      $[97] = query;
      $[98] = commands_2.length;
      $[99] = countText;
    } else countText = $[99];
    let countLabel = countText;
    let helpText = hasFocus
      ? "type to filter \xB7 \u2193/enter to select \xB7 esc to clear"
      : visibleCommands.length === 0
        ? `/ to search, ${shortcutDisplay} to close`
        : `enter/space to cycle, / to search, ${shortcutDisplay_2} to sort, ${shortcutDisplay} to close`;
    DialogComponent = Dialog;
    title = "Skills";
    subtitle = `${countLabel}${sortByTokens ? " \xB7 sorted by tokens" : ""} \xB7 ${helpText}`;
    if ($[100] !== onExit) {
      onCancel = () =>
        onExit("Skills dialog dismissed", {
          display: "system",
        });
      $[100] = onExit;
      $[101] = onCancel;
    } else onCancel = $[101];
    isCancelActive = false;
    hideInputGuide = true;
    Container = Box;
    ref = containerRef;
    flexDirection = "column";
    tabIndex = 0;
    autoFocus = true;
    onKeyDown = onKeyInput;
    onPaste_2 = onPaste;
    if (
      $[102] !== isTerminalFocused ||
      $[103] !== cursorOffset ||
      $[104] !== handleKeyDown ||
      $[105] !== handlePaste ||
      $[106] !== query
    ) {
      searchBox = jsxProd_default(SearchBox, {
        ref: searchRef,
        query,
        onKeyDown: handleKeyDown,
        onPaste: handlePaste,
        isTerminalFocused,
        cursorOffset,
        placeholder: "Search skills\u2026",
      });
      $[102] = isTerminalFocused;
      $[103] = cursorOffset;
      $[104] = handleKeyDown;
      $[105] = handlePaste;
      $[106] = query;
      $[107] = searchBox;
    } else searchBox = $[107];
    if (
      $[108] !== bytesPerToken ||
      $[109] !== states ||
      $[110] !== visibleCommands ||
      $[111] !== isScreenReaderEnabled ||
      $[112] !== locked ||
      $[113] !== query ||
      $[114] !== setFocusedCommand ||
      $[115] !== sortByTokens ||
      $[116] !== visibleCount_2
    ) {
      listOrEmpty =
        visibleCommands.length === 0
          ? jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(HintText, {
                children: `No skills match "${query}"`,
              }),
            })
          : jsxProd_default(
              OrderedListWithItem,
              {
                visibleCount: visibleCount_2,
                isDisabled: searchHasFocus,
                wrap: true,
                overflowHint: "count",
                onFocus: (focusIndex) => setFocusedCommand(visibleCommands[focusIndex]),
                children: visibleCommands.map((command) => {
                  let skillLock = locked.get(command);
                  let { icon, word } = SKILL_STATE_DISPLAY[skillLock?.value ?? states[command.name] ?? "on"];
                  let stateWord = word === undefined ? "" : word;
                  return jsxProd_default(
                    OrderedListWithItem.Item,
                    {
                      label: claudeAiSkillDisplayName(command),
                      icon,
                      meta: [
                        lockReasonText(skillLock),
                        isScreenReaderEnabled ? "" : stateWord,
                        getSkillSourceLabel(command),
                        `${formatTokenEstimate(estimateSkillListingTokens(command, bytesPerToken))} tok`,
                      ],
                    },
                    `${command.name}-${command.source}`,
                  );
                }),
              },
              sortByTokens ? "tok" : "name",
            );
      $[108] = bytesPerToken;
      $[109] = states;
      $[110] = visibleCommands;
      $[111] = isScreenReaderEnabled;
      $[112] = locked;
      $[113] = query;
      $[114] = setFocusedCommand;
      $[115] = sortByTokens;
      $[116] = visibleCount_2;
      $[117] = listOrEmpty;
    } else listOrEmpty = $[117];
    if ($[118] !== commands_2) {
      pluginHint =
        commands_2.some(isPluginSkill) &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "Plugin skills are managed via /plugin",
          }),
        });
      $[118] = commands_2;
      $[119] = pluginHint;
    } else pluginHint = $[119];
    if ($[120] !== conflictText) {
      conflictTextNode =
        conflictText !== undefined &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: conflictText,
          }),
        });
      $[120] = conflictText;
      $[121] = conflictTextNode;
    } else conflictTextNode = $[121];
    unstorableNote =
      unstorableNames.length > 0 &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: `Settings can't store an entry named ${unstorableNames.join(" or ")}, so a skill with that name can't be changed here. Rename its folder or command file to configure it.`,
        }),
      });
    $[57] = bytesPerToken;
    $[58] = shortcutDisplay;
    $[59] = states;
    $[60] = visibleCommands;
    $[61] = onKeyInput;
    $[62] = onPaste;
    $[63] = isScreenReaderEnabled;
    $[64] = hasFocus;
    $[65] = isTerminalFocused;
    $[66] = locked;
    $[67] = onExit;
    $[68] = cursorOffset;
    $[69] = handleKeyDown;
    $[70] = handlePaste;
    $[71] = query;
    $[72] = setFocusedCommand;
    $[73] = conflictText;
    $[74] = commands_2;
    $[75] = sortByTokens;
    $[76] = shortcutDisplay_2;
    $[77] = visibleCount_2;
    $[78] = Container;
    $[79] = DialogComponent;
    $[80] = ref;
    $[81] = flexDirection;
    $[82] = tabIndex;
    $[83] = autoFocus;
    $[84] = onKeyDown;
    $[85] = onPaste_2;
    $[86] = searchBox;
    $[87] = listOrEmpty;
    $[88] = pluginHint;
    $[89] = conflictTextNode;
    $[90] = unstorableNote;
    $[91] = title;
    $[92] = subtitle;
    $[93] = onCancel;
    $[94] = isCancelActive;
    $[95] = hideInputGuide;
  } else {
    Container = $[78];
    DialogComponent = $[79];
    ref = $[80];
    flexDirection = $[81];
    tabIndex = $[82];
    autoFocus = $[83];
    onKeyDown = $[84];
    onPaste_2 = $[85];
    searchBox = $[86];
    listOrEmpty = $[87];
    pluginHint = $[88];
    conflictTextNode = $[89];
    unstorableNote = $[90];
    title = $[91];
    subtitle = $[92];
    onCancel = $[93];
    isCancelActive = $[94];
    hideInputGuide = $[95];
  }
  let safeModeNote;
  if ($[122] === MEMO_CACHE_SENTINEL) {
    safeModeNote =
      isSafeMode() &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "Custom skills are disabled in safe mode \u2014",
            " ",
            `${getSafeModeExitHint()} to load them`,
          ],
        }),
      });
    $[122] = safeModeNote;
  } else safeModeNote = $[122];
  let children;
  if (
    $[123] !== Container ||
    $[124] !== ref ||
    $[125] !== flexDirection ||
    $[126] !== tabIndex ||
    $[127] !== autoFocus ||
    $[128] !== onKeyDown ||
    $[129] !== onPaste_2 ||
    $[130] !== searchBox ||
    $[131] !== listOrEmpty ||
    $[132] !== pluginHint ||
    $[133] !== conflictTextNode ||
    $[134] !== unstorableNote
  ) {
    children = jsxProd_default_2(Container, {
      ref,
      flexDirection,
      tabIndex,
      autoFocus,
      onKeyDown,
      onPaste: onPaste_2,
      children: [searchBox, listOrEmpty, pluginHint, conflictTextNode, unstorableNote, safeModeNote],
    });
    $[123] = Container;
    $[124] = ref;
    $[125] = flexDirection;
    $[126] = tabIndex;
    $[127] = autoFocus;
    $[128] = onKeyDown;
    $[129] = onPaste_2;
    $[130] = searchBox;
    $[131] = listOrEmpty;
    $[132] = pluginHint;
    $[133] = conflictTextNode;
    $[134] = unstorableNote;
    $[135] = children;
  } else children = $[135];
  let dialog;
  if (
    $[136] !== DialogComponent ||
    $[137] !== title ||
    $[138] !== subtitle ||
    $[139] !== onCancel ||
    $[140] !== isCancelActive ||
    $[141] !== hideInputGuide ||
    $[142] !== children
  ) {
    dialog = jsxProd_default(DialogComponent, {
      title,
      subtitle,
      onCancel,
      isCancelActive,
      hideInputGuide,
      children,
    });
    $[136] = DialogComponent;
    $[137] = title;
    $[138] = subtitle;
    $[139] = onCancel;
    $[140] = isCancelActive;
    $[141] = hideInputGuide;
    $[142] = children;
    $[143] = dialog;
  } else dialog = $[143];
  return dialog;
}
//@ chunk-00qhwn8e.js:27856-28005 fingerprint = call (0.637)
/**
 * /skills 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context) {
  if (getRemoteCaps())
    return jsxProd_default(SkillsMenu_2, {
      onExit: onDone,
    });
  return jsxProd_default(SkillsMenu, {
    onExit: onDone,
    commands: context.options.commands,
    bytesPerToken: bytesPerTokenForModel(context.options.mainLoopModel),
  });
}
export { call };
