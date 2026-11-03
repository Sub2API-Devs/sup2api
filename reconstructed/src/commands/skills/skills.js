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
import { init_react_production, y, R } from "../../../vendor/react/cjs/react.production.js";
import { isNotProtoKey } from "../../utils/commandPredicates.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-00qhwn8e.js:19170-19174 sole-consumer
init_react_production();
//@ chunk-00qhwn8e.js:19174-19200 sole-consumer
function negateValue(fo) {
  return !fo;
}
//@ chunk-00qhwn8e.js:19200-19231 sole-consumer
function skillNameOf(uo) {
  return uo.name;
}
//@ chunk-00qhwn8e.js:19231-19262 sole-consumer
function isStorableSkillName(po) {
  return !isNotProtoKey(po);
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
function lockReasonText(C) {
  if (!C) return "";
  return C.source === "reserved-name" ? "reserved name" : `locked by ${C.source}`;
}
//@ chunk-00qhwn8e.js:19655-27856 layout
/**
 * /skills 菜单：列出技能、上下文开销、排序、搜索与开关状态。
 */
function SkillsMenu(props) {
  let t = w(144);
  let { onExit, commands, bytesPerToken } = props;
  let { storageV5 } = useTheme_2();
  let [k, ve] = y(false);
  let J;
  if (t[0] !== commands || t[1] !== k) {
    J = sortSkillsForListing(commands, {
      sortByTokens: k,
    });
    t[0] = commands;
    t[1] = k;
    t[2] = J;
  } else J = t[2];
  let commands_2 = J;
  let X;
  if (t[3] !== commands || t[4] !== commands_2) {
    X = describeSyncedSkillConflicts(commands_2, commands);
    t[3] = commands;
    t[4] = commands_2;
    t[5] = X;
  } else X = t[5];
  let u = X;
  let Ce;
  if (t[6] === MEMO_CACHE_SENTINEL) {
    Ce = localSkillOverrides();
    t[6] = Ce;
  } else Ce = t[6];
  let localOverrides = Ce;
  let Ye;
  if (t[7] !== commands_2) {
    Ye = buildSkillOverrideContext(commands_2, localOverrides);
    t[7] = commands_2;
    t[8] = Ye;
  } else Ye = t[8];
  let context = Ye;
  let { locked } = context;
  let Qt;
  if (t[9] !== commands_2 || t[10] !== context) {
    Qt = () => getEffectiveSkillStates(commands_2, context);
    t[9] = commands_2;
    t[10] = context;
    t[11] = Qt;
  } else Qt = t[11];
  let [W, _e, et] = useLatestState(Qt);
  let [, A, tt] = useLatestState(commands_2[0]);
  let isTerminalFocused = useTerminalFocus();
  let It = R(null);
  let V = R(null);
  let hasFocus = useHasFocus(V);
  let Kt;
  if (t[12] === MEMO_CACHE_SENTINEL) {
    Kt = () => {
      let ot = V.current;
      return ot !== null && getFocusManager(ot).activeElement === ot;
    };
    t[12] = Kt;
  } else Kt = t[12];
  let Re = Kt;
  let Bt;
  if (t[13] === MEMO_CACHE_SENTINEL) {
    Bt = () => {
      let rt = V.current;
      if (rt) getFocusManager(rt).focus(rt);
    };
    t[13] = Bt;
  } else Bt = t[13];
  let it = Bt;
  let Lt;
  if (t[14] === MEMO_CACHE_SENTINEL) {
    Lt = {
      isActive: true,
      onExit: () => {
        let lt = It.current;
        if (lt) getFocusManager(lt).focus(lt);
      },
      passthroughCtrlKeys: ["c", "d"],
    };
    t[14] = Lt;
  } else Lt = t[14];
  let { query, queryRef, setQuery, cursorOffset, handleKeyDown, handlePaste } = useSearchInput(Lt);
  useGlobalExitKeybindings();
  let at;
  Dr: {
    if (!query) {
      at = commands_2;
      break Dr;
    }
    let ee;
    if (t[15] !== query || t[16] !== commands_2) {
      let lower = query.toLowerCase();
      ee = commands_2.filter(
        (xe) =>
          xe.name.toLowerCase().includes(lower) ||
          claudeAiSkillDisplayName(xe).toLowerCase().includes(lower) ||
          (xe.description ?? "").toLowerCase().includes(lower) ||
          getSkillSourceLabel(xe).toLowerCase().includes(lower),
      );
      t[15] = query;
      t[16] = commands_2;
      t[17] = ee;
    } else ee = t[17];
    at = ee;
  }
  let a = at;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let ee;
  if (t[18] !== columns || t[19] !== u) {
    ee =
      u === undefined
        ? 0
        : 2 +
          countCharInString(
            wrapAnsi(u, Math.max(1, columns - 2 * PANE_PADDING), {
              hard: true,
              trim: true,
            }),
            `
`,
          );
    t[18] = columns;
    t[19] = u;
    t[20] = ee;
  } else ee = t[20];
  let _s = ee;
  const mt = rows - 13 - _s;
  let jt;
  if (t[21] !== a.length || t[22] !== mt) {
    jt = clamp(mt, 4, a.length);
    t[21] = a.length;
    t[22] = mt;
    t[23] = jt;
  } else jt = t[23];
  let visibleCount = jt;
  let qt;
  if (t[24] !== a || t[25] !== tt || t[26] !== locked || t[27] !== _e) {
    qt = () => {
      let oe = tt();
      if (!oe || !a.includes(oe)) {
        return;
      }
      if (locked.has(oe)) {
        return;
      }
      _e((Gt) => {
        let eo = Gt[oe.name] ?? "on";
        let to = SKILL_STATE_OPTIONS[(SKILL_STATE_OPTIONS.indexOf(eo) + 1) % SKILL_STATE_OPTIONS.length];
        return Object.assign(Object.create(null), Gt, {
          [oe.name]: to,
        });
      });
    };
    t[24] = a;
    t[25] = tt;
    t[26] = locked;
    t[27] = _e;
    t[28] = qt;
  } else qt = t[28];
  let dt = qt;
  let Jt = R(false);
  let Xt;
  if (t[29] !== et || t[30] !== onExit || t[31] !== commands_2 || t[32] !== storageV5 || t[33] !== context) {
    Xt = async () => {
      if (Jt.current) {
        return;
      }
      Jt.current = true;
      let { diff, writes, effectiveChanged } = diffSkillOverrides(commands_2, et(), context);
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
    t[29] = et;
    t[30] = onExit;
    t[31] = commands_2;
    t[32] = storageV5;
    t[33] = context;
    t[34] = Xt;
  } else Xt = t[34];
  let ut = Xt;
  let shortcutDisplay = useShortcutDisplay("confirm:no", "Settings", "esc");
  let shortcutDisplay_2 = useShortcutDisplay("settings:sortByTokens", "Settings", "t");
  let Pe;
  if (t[35] !== dt) {
    Pe = () => {
      if (Re()) {
        return false;
      }
      dt();
    };
    t[35] = dt;
    t[36] = Pe;
  } else Pe = t[36];
  let Ut;
  if (t[37] === MEMO_CACHE_SENTINEL) {
    Ut = () => {
      if (Re()) {
        return false;
      }
      ve(negateValue);
    };
    t[37] = Ut;
  } else Ut = t[37];
  let Wt;
  if (t[38] !== Pe) {
    Wt = {
      "select:accept": Pe,
      "settings:sortByTokens": Ut,
    };
    t[38] = Pe;
    t[39] = Wt;
  } else Wt = t[39];
  const isActive = a.length > 0;
  let At;
  if (t[40] !== isActive) {
    At = {
      context: "Settings",
      isActive,
    };
    t[40] = isActive;
    t[41] = At;
  } else At = t[41];
  MessageActionsKeybindings(Wt, At);
  let Ht;
  if (t[42] !== ut) {
    Ht = {
      "confirm:no": () => {
        if (Re()) {
          return false;
        }
        ut();
      },
    };
    t[42] = ut;
    t[43] = Ht;
  } else Ht = t[43];
  let Zt;
  if (t[44] === MEMO_CACHE_SENTINEL) {
    Zt = {
      context: "Settings",
    };
    t[44] = Zt;
  } else Zt = t[44];
  MessageActionsKeybindings(Ht, Zt);
  let zt;
  if (t[45] !== queryRef || t[46] !== setQuery) {
    zt = (event) => {
      if (event.defaultPrevented || event.target === V.current) {
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
          it();
          setQuery(queryRef.current.slice(0, -1));
        }
        return;
      }
      if (event.name.length > 1 && event.name !== "number") {
        return;
      }
      if (event.key.length >= 1 && event.key !== " ") {
        event.preventDefault();
        it();
        let ro = event.key.startsWith("/") ? event.key.slice(1) : event.key;
        setQuery(queryRef.current + ro);
      }
    };
    t[45] = queryRef;
    t[46] = setQuery;
    t[47] = zt;
  } else zt = t[47];
  let yt = zt;
  let Yt;
  if (t[48] !== queryRef || t[49] !== setQuery) {
    Yt = (event) => {
      if (event.defaultPrevented || event.target === V.current) {
        return;
      }
      let $e = event.text.split(/\r\n|\r|\n/, 2)[0] ?? "";
      if ($e.length === 0) {
        return;
      }
      event.preventDefault();
      it();
      let io = $e.startsWith("/") ? $e.slice(1) : $e;
      setQuery(queryRef.current + io);
    };
    t[48] = queryRef;
    t[49] = setQuery;
    t[50] = Yt;
  } else Yt = t[50];
  let St = Yt;
  if (commands_2.length === 0) {
    let onCancel;
    if (t[51] !== onExit) {
      onCancel = () =>
        onExit("Skills dialog dismissed", {
          display: "system",
        });
      t[51] = onExit;
      t[52] = onCancel;
    } else onCancel = t[52];
    let inputGuide;
    if (t[53] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "close",
      });
      t[53] = inputGuide;
    } else inputGuide = t[53];
    let children;
    if (t[54] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(HintText, {
        hint: isSafeMode()
          ? `Custom skills are disabled in safe mode \u2014 ${getSafeModeExitHint()} to load them`
          : "Create skills in .claude/skills/ or ~/.claude/skills/",
        children: "No skills found",
      });
      t[54] = children;
    } else children = t[54];
    let M;
    if (t[55] !== onCancel) {
      M = jsxProd_default(Dialog, {
        title: "Skills",
        onCancel,
        inputGuide,
        children,
      });
      t[55] = onCancel;
      t[56] = M;
    } else M = t[56];
    return M;
  }
  let Oe;
  let Te;
  let ref;
  let flexDirection;
  let tabIndex;
  let autoFocus;
  let onKeyDown;
  let onPaste;
  let re;
  let ie;
  let ne;
  let le;
  let Ie;
  let title;
  let subtitle;
  let onCancel;
  let isCancelActive;
  let hideInputGuide;
  if (
    t[57] !== bytesPerToken ||
    t[58] !== shortcutDisplay ||
    t[59] !== W ||
    t[60] !== a ||
    t[61] !== yt ||
    t[62] !== St ||
    t[63] !== isScreenReaderEnabled ||
    t[64] !== hasFocus ||
    t[65] !== isTerminalFocused ||
    t[66] !== locked ||
    t[67] !== onExit ||
    t[68] !== cursorOffset ||
    t[69] !== handleKeyDown ||
    t[70] !== handlePaste ||
    t[71] !== query ||
    t[72] !== A ||
    t[73] !== u ||
    t[74] !== commands_2 ||
    t[75] !== k ||
    t[76] !== shortcutDisplay_2 ||
    t[77] !== visibleCount
  ) {
    let _t = uniq(commands_2.map(skillNameOf).filter(isStorableSkillName));
    let ce;
    if (t[96] !== a.length || t[97] !== query || t[98] !== commands_2.length) {
      ce = query
        ? `${a.length}/${commands_2.length} ${plural(commands_2.length, "skill")}`
        : `${commands_2.length} ${plural(commands_2.length, "skill")}`;
      t[96] = a.length;
      t[97] = query;
      t[98] = commands_2.length;
      t[99] = ce;
    } else ce = t[99];
    let no = ce;
    let lo = hasFocus
      ? "type to filter \xB7 \u2193/enter to select \xB7 esc to clear"
      : a.length === 0
        ? `/ to search, ${shortcutDisplay} to close`
        : `enter/space to cycle, / to search, ${shortcutDisplay_2} to sort, ${shortcutDisplay} to close`;
    Te = Dialog;
    title = "Skills";
    subtitle = `${no}${k ? " \xB7 sorted by tokens" : ""} \xB7 ${lo}`;
    if (t[100] !== onExit) {
      onCancel = () =>
        onExit("Skills dialog dismissed", {
          display: "system",
        });
      t[100] = onExit;
      t[101] = onCancel;
    } else onCancel = t[101];
    isCancelActive = false;
    hideInputGuide = true;
    Oe = Box;
    ref = It;
    flexDirection = "column";
    tabIndex = 0;
    autoFocus = true;
    onKeyDown = yt;
    onPaste = St;
    if (
      t[102] !== isTerminalFocused ||
      t[103] !== cursorOffset ||
      t[104] !== handleKeyDown ||
      t[105] !== handlePaste ||
      t[106] !== query
    ) {
      re = jsxProd_default(SearchBox, {
        ref: V,
        query,
        onKeyDown: handleKeyDown,
        onPaste: handlePaste,
        isTerminalFocused,
        cursorOffset,
        placeholder: "Search skills\u2026",
      });
      t[102] = isTerminalFocused;
      t[103] = cursorOffset;
      t[104] = handleKeyDown;
      t[105] = handlePaste;
      t[106] = query;
      t[107] = re;
    } else re = t[107];
    if (
      t[108] !== bytesPerToken ||
      t[109] !== W ||
      t[110] !== a ||
      t[111] !== isScreenReaderEnabled ||
      t[112] !== locked ||
      t[113] !== query ||
      t[114] !== A ||
      t[115] !== k ||
      t[116] !== visibleCount
    ) {
      ie =
        a.length === 0
          ? jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(HintText, {
                children: `No skills match "${query}"`,
              }),
            })
          : jsxProd_default(
              OrderedListWithItem,
              {
                visibleCount,
                isDisabled: Re,
                wrap: true,
                overflowHint: "count",
                onFocus: (ao) => A(a[ao]),
                children: a.map((I) => {
                  let es = locked.get(I);
                  let { icon, word } = SKILL_STATE_DISPLAY[es?.value ?? W[I.name] ?? "on"];
                  let mo = word === undefined ? "" : word;
                  return jsxProd_default(
                    OrderedListWithItem.Item,
                    {
                      label: claudeAiSkillDisplayName(I),
                      icon,
                      meta: [
                        lockReasonText(es),
                        isScreenReaderEnabled ? "" : mo,
                        getSkillSourceLabel(I),
                        `${formatTokenEstimate(estimateSkillListingTokens(I, bytesPerToken))} tok`,
                      ],
                    },
                    `${I.name}-${I.source}`,
                  );
                }),
              },
              k ? "tok" : "name",
            );
      t[108] = bytesPerToken;
      t[109] = W;
      t[110] = a;
      t[111] = isScreenReaderEnabled;
      t[112] = locked;
      t[113] = query;
      t[114] = A;
      t[115] = k;
      t[116] = visibleCount;
      t[117] = ie;
    } else ie = t[117];
    if (t[118] !== commands_2) {
      ne =
        commands_2.some(isPluginSkill) &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "Plugin skills are managed via /plugin",
          }),
        });
      t[118] = commands_2;
      t[119] = ne;
    } else ne = t[119];
    if (t[120] !== u) {
      le =
        u !== undefined &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: u,
          }),
        });
      t[120] = u;
      t[121] = le;
    } else le = t[121];
    Ie =
      _t.length > 0 &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: `Settings can't store an entry named ${_t.join(" or ")}, so a skill with that name can't be changed here. Rename its folder or command file to configure it.`,
        }),
      });
    t[57] = bytesPerToken;
    t[58] = shortcutDisplay;
    t[59] = W;
    t[60] = a;
    t[61] = yt;
    t[62] = St;
    t[63] = isScreenReaderEnabled;
    t[64] = hasFocus;
    t[65] = isTerminalFocused;
    t[66] = locked;
    t[67] = onExit;
    t[68] = cursorOffset;
    t[69] = handleKeyDown;
    t[70] = handlePaste;
    t[71] = query;
    t[72] = A;
    t[73] = u;
    t[74] = commands_2;
    t[75] = k;
    t[76] = shortcutDisplay_2;
    t[77] = visibleCount;
    t[78] = Oe;
    t[79] = Te;
    t[80] = ref;
    t[81] = flexDirection;
    t[82] = tabIndex;
    t[83] = autoFocus;
    t[84] = onKeyDown;
    t[85] = onPaste;
    t[86] = re;
    t[87] = ie;
    t[88] = ne;
    t[89] = le;
    t[90] = Ie;
    t[91] = title;
    t[92] = subtitle;
    t[93] = onCancel;
    t[94] = isCancelActive;
    t[95] = hideInputGuide;
  } else {
    Oe = t[78];
    Te = t[79];
    ref = t[80];
    flexDirection = t[81];
    tabIndex = t[82];
    autoFocus = t[83];
    onKeyDown = t[84];
    onPaste = t[85];
    re = t[86];
    ie = t[87];
    ne = t[88];
    le = t[89];
    Ie = t[90];
    title = t[91];
    subtitle = t[92];
    onCancel = t[93];
    isCancelActive = t[94];
    hideInputGuide = t[95];
  }
  let ce;
  if (t[122] === MEMO_CACHE_SENTINEL) {
    ce =
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
    t[122] = ce;
  } else ce = t[122];
  let children;
  if (
    t[123] !== Oe ||
    t[124] !== ref ||
    t[125] !== flexDirection ||
    t[126] !== tabIndex ||
    t[127] !== autoFocus ||
    t[128] !== onKeyDown ||
    t[129] !== onPaste ||
    t[130] !== re ||
    t[131] !== ie ||
    t[132] !== ne ||
    t[133] !== le ||
    t[134] !== Ie
  ) {
    children = jsxProd_default_2(Oe, {
      ref,
      flexDirection,
      tabIndex,
      autoFocus,
      onKeyDown,
      onPaste,
      children: [re, ie, ne, le, Ie, ce],
    });
    t[123] = Oe;
    t[124] = ref;
    t[125] = flexDirection;
    t[126] = tabIndex;
    t[127] = autoFocus;
    t[128] = onKeyDown;
    t[129] = onPaste;
    t[130] = re;
    t[131] = ie;
    t[132] = ne;
    t[133] = le;
    t[134] = Ie;
    t[135] = children;
  } else children = t[135];
  let ts;
  if (
    t[136] !== Te ||
    t[137] !== title ||
    t[138] !== subtitle ||
    t[139] !== onCancel ||
    t[140] !== isCancelActive ||
    t[141] !== hideInputGuide ||
    t[142] !== children
  ) {
    ts = jsxProd_default(Te, {
      title,
      subtitle,
      onCancel,
      isCancelActive,
      hideInputGuide,
      children,
    });
    t[136] = Te;
    t[137] = title;
    t[138] = subtitle;
    t[139] = onCancel;
    t[140] = isCancelActive;
    t[141] = hideInputGuide;
    t[142] = children;
    t[143] = ts;
  } else ts = t[143];
  return ts;
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
//@ chunk-ygke3hz8.js:528-583 placement
/**
 * 技能状态的四个取值（on/name-only/user-invocable-only/off），/skills 与插件页循环切换用。
 */
var SKILL_STATE_OPTIONS = ["on", "name-only", "user-invocable-only", "off"];
