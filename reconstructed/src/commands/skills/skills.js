/**
 * commands/skills/skills.tsx
 *
 * /skills 实现：列出技能及其上下文开销
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/skills/skills.tsx
 * pieces: chunk-00qhwn8e.js (9)
 * attribution: sole-consumer 4, placement 1, layout 3, fingerprint 1
 */
import { j, y, R } from "../../../vendor/react/cjs/react.production.js";
import { DCe } from "../../utils/commandPredicates.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import {
  sortSkillsForListing,
  describeSyncedSkillConflicts,
  rxr,
  buildSkillOverrideContext,
  getEffectiveSkillStates,
  DJe,
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
import { q0t } from "./_new/skills.helpers-ygke.js";
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
import { Jn } from "../../remote/remoteMode.js";
import { SkillsMenu_2 } from "../../components/skills/SkillsMenu.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";

//@ chunk-00qhwn8e.js:19170-19174 sole-consumer
j();
//@ chunk-00qhwn8e.js:19174-19200 sole-consumer
function As(fo) {
  return !fo;
}
//@ chunk-00qhwn8e.js:19200-19231 sole-consumer
function Hs(uo) {
  return uo.name;
}
//@ chunk-00qhwn8e.js:19231-19262 sole-consumer
function Zs(po) {
  return !DCe(po);
}
//@ chunk-00qhwn8e.js:19262-19306 placement = _temp0 (1)
function zs(a_5) {
  return a_5.source === "plugin";
}
//@ chunk-00qhwn8e.js:19306-19551 layout
var SKILL_STATE_DISPLAY = {
  on: { icon: e(StatusIcon, { status: "on" }) },
  "name-only": { icon: e(StatusIcon, { status: "on", "aria-label": "name only:" }), word: "name-only" },
  "user-invocable-only": {
    icon: e(StatusIcon, { status: "on", "aria-label": "user only:" }),
    word: "user-only",
  },
  off: { icon: e(StatusIcon, { status: "off" }) },
};
//@ chunk-00qhwn8e.js:19551-19655 layout
function lockReasonText(C) {
  if (!C) return "";
  return C.source === "reserved-name" ? "reserved name" : `locked by ${C.source}`;
}
/**
 * /skills 菜单：列出技能、上下文开销、排序、搜索与开关状态。
 */
//@ chunk-00qhwn8e.js:19655-27856 layout
function SkillsMenu(C) {
  let t = w(144),
    { onExit: onExit, commands: commands, bytesPerToken: bytesPerToken } = C,
    { storageV5: storageV5 } = Me(),
    [k, ve] = y(!1),
    J;
  if (t[0] !== commands || t[1] !== k)
    ((J = sortSkillsForListing(commands, { sortByTokens: k })), (t[0] = commands), (t[1] = k), (t[2] = J));
  else J = t[2];
  let o = J,
    X;
  if (t[3] !== commands || t[4] !== o)
    ((X = describeSyncedSkillConflicts(o, commands)), (t[3] = commands), (t[4] = o), (t[5] = X));
  else X = t[5];
  let u = X,
    Ce;
  if (t[6] === MEMO_CACHE_SENTINEL) ((Ce = rxr()), (t[6] = Ce));
  else Ce = t[6];
  let ze = Ce,
    Ye;
  if (t[7] !== o) ((Ye = buildSkillOverrideContext(o, ze)), (t[7] = o), (t[8] = Ye));
  else Ye = t[8];
  let b = Ye,
    { locked: locked } = b,
    Qt;
  if (t[9] !== o || t[10] !== b)
    ((Qt = () => getEffectiveSkillStates(o, b)), (t[9] = o), (t[10] = b), (t[11] = Qt));
  else Qt = t[11];
  let [W, _e, et] = useLatestState(Qt),
    [, A, tt] = useLatestState(o[0]),
    Z = useTerminalFocus(),
    It = R(null),
    V = R(null),
    st = useHasFocus(V),
    Kt;
  if (t[12] === MEMO_CACHE_SENTINEL)
    ((Kt = () => {
      let ot = V.current;
      return ot !== null && getFocusManager(ot).activeElement === ot;
    }),
      (t[12] = Kt));
  else Kt = t[12];
  let Re = Kt,
    Bt;
  if (t[13] === MEMO_CACHE_SENTINEL)
    ((Bt = () => {
      let rt = V.current;
      if (rt) getFocusManager(rt).focus(rt);
    }),
      (t[13] = Bt));
  else Bt = t[13];
  let it = Bt,
    Lt;
  if (t[14] === MEMO_CACHE_SENTINEL)
    ((Lt = {
      isActive: !0,
      onExit: () => {
        let lt = It.current;
        if (lt) getFocusManager(lt).focus(lt);
      },
      passthroughCtrlKeys: ["c", "d"],
    }),
      (t[14] = Lt));
  else Lt = t[14];
  let {
    query: query,
    queryRef: queryRef,
    setQuery: setQuery,
    cursorOffset: cursorOffset,
    handleKeyDown: handleKeyDown,
    handlePaste: handlePaste,
  } = useSearchInput(Lt);
  useGlobalExitKeybindings();
  let at;
  Dr: {
    if (!query) {
      at = o;
      break Dr;
    }
    let ee;
    if (t[15] !== query || t[16] !== o) {
      let lower = query.toLowerCase();
      ee = o.filter(
        (xe) =>
          xe.name.toLowerCase().includes(lower) ||
          DJe(xe).toLowerCase().includes(lower) ||
          (xe.description ?? "").toLowerCase().includes(lower) ||
          getSkillSourceLabel(xe).toLowerCase().includes(lower),
      );
      ((t[15] = query), (t[16] = o), (t[17] = ee));
    } else ee = t[17];
    at = ee;
  }
  let a = at,
    te = useIsScreenReaderEnabled(),
    { rows: rows, columns: columns } = useScrollViewportSize(useTerminalSize()),
    ee;
  if (t[18] !== columns || t[19] !== u)
    ((ee =
      u === void 0
        ? 0
        : 2 +
          countCharInString(
            wrapAnsi(u, Math.max(1, columns - 2 * PANE_PADDING), { hard: !0, trim: !0 }),
            `
`,
          )),
      (t[18] = columns),
      (t[19] = u),
      (t[20] = ee));
  else ee = t[20];
  let _s = ee;
  const mt = rows - 13 - _s;
  let jt;
  if (t[21] !== a.length || t[22] !== mt)
    ((jt = clamp(mt, 4, a.length)), (t[21] = a.length), (t[22] = mt), (t[23] = jt));
  else jt = t[23];
  let se = jt,
    qt;
  if (t[24] !== a || t[25] !== tt || t[26] !== locked || t[27] !== _e)
    ((qt = () => {
      let oe = tt();
      if (!oe || !a.includes(oe)) {
        return;
      }
      if (locked.has(oe)) {
        return;
      }
      _e((Gt) => {
        let eo = Gt[oe.name] ?? "on";
        let to = q0t[(q0t.indexOf(eo) + 1) % q0t.length];
        return Object.assign(Object.create(null), Gt, { [oe.name]: to });
      });
    }),
      (t[24] = a),
      (t[25] = tt),
      (t[26] = locked),
      (t[27] = _e),
      (t[28] = qt));
  else qt = t[28];
  let dt = qt,
    Jt = R(!1),
    Xt;
  if (t[29] !== et || t[30] !== onExit || t[31] !== o || t[32] !== storageV5 || t[33] !== b)
    ((Xt = async () => {
      if (Jt.current) {
        return;
      }
      Jt.current = !0;
      let { diff: diff, writes: writes, effectiveChanged: effectiveChanged } = diffSkillOverrides(o, et(), b);
      if (writes > 0) {
        let { error: error } = await updateSettingsForSource(
          "localSettings",
          { skillOverrides: diff },
          void 0,
          storageV5,
        );
        if (error) {
          onExit(`Failed to save skill overrides: ${error.message}`, { display: "system" });
          return;
        }
        clearCommandMemoizationCaches();
      }
      onExit(
        effectiveChanged > 0
          ? `Updated ${effectiveChanged} skill ${plural(effectiveChanged, "override")}`
          : "No changes",
        { display: "system" },
      );
    }),
      (t[29] = et),
      (t[30] = onExit),
      (t[31] = o),
      (t[32] = storageV5),
      (t[33] = b),
      (t[34] = Xt));
  else Xt = t[34];
  let ut = Xt,
    De = useShortcutDisplay("confirm:no", "Settings", "esc"),
    ht = useShortcutDisplay("settings:sortByTokens", "Settings", "t"),
    Pe;
  if (t[35] !== dt)
    ((Pe = () => {
      if (Re()) {
        return !1;
      }
      dt();
    }),
      (t[35] = dt),
      (t[36] = Pe));
  else Pe = t[36];
  let Ut;
  if (t[37] === MEMO_CACHE_SENTINEL)
    ((Ut = () => {
      if (Re()) {
        return !1;
      }
      ve(As);
    }),
      (t[37] = Ut));
  else Ut = t[37];
  let Wt;
  if (t[38] !== Pe) ((Wt = { "select:accept": Pe, "settings:sortByTokens": Ut }), (t[38] = Pe), (t[39] = Wt));
  else Wt = t[39];
  const kt = a.length > 0;
  let At;
  if (t[40] !== kt) ((At = { context: "Settings", isActive: kt }), (t[40] = kt), (t[41] = At));
  else At = t[41];
  MessageActionsKeybindings(Wt, At);
  let Ht;
  if (t[42] !== ut)
    ((Ht = {
      "confirm:no": () => {
        if (Re()) {
          return !1;
        }
        ut();
      },
    }),
      (t[42] = ut),
      (t[43] = Ht));
  else Ht = t[43];
  let Zt;
  if (t[44] === MEMO_CACHE_SENTINEL) ((Zt = { context: "Settings" }), (t[44] = Zt));
  else Zt = t[44];
  MessageActionsKeybindings(Ht, Zt);
  let zt;
  if (t[45] !== queryRef || t[46] !== setQuery)
    ((zt = (d) => {
      if (d.defaultPrevented || d.target === V.current) {
        return;
      }
      if (d.name === "tab") {
        d.preventDefault();
        return;
      }
      if (d.ctrl || d.meta) {
        return;
      }
      if (d.name === "backspace") {
        if (queryRef.current) (d.preventDefault(), it(), setQuery(queryRef.current.slice(0, -1)));
        return;
      }
      if (d.name.length > 1 && d.name !== "number") {
        return;
      }
      if (d.key.length >= 1 && d.key !== " ") {
        (d.preventDefault(), it());
        let ro = d.key.startsWith("/") ? d.key.slice(1) : d.key;
        setQuery(queryRef.current + ro);
      }
    }),
      (t[45] = queryRef),
      (t[46] = setQuery),
      (t[47] = zt));
  else zt = t[47];
  let yt = zt,
    Yt;
  if (t[48] !== queryRef || t[49] !== setQuery)
    ((Yt = (Ne) => {
      if (Ne.defaultPrevented || Ne.target === V.current) {
        return;
      }
      let $e = Ne.text.split(/\r\n|\r|\n/, 2)[0] ?? "";
      if ($e.length === 0) {
        return;
      }
      (Ne.preventDefault(), it());
      let io = $e.startsWith("/") ? $e.slice(1) : $e;
      setQuery(queryRef.current + io);
    }),
      (t[48] = queryRef),
      (t[49] = setQuery),
      (t[50] = Yt));
  else Yt = t[50];
  let St = Yt;
  if (o.length === 0) {
    let x;
    if (t[51] !== onExit)
      ((x = () => onExit("Skills dialog dismissed", { display: "system" })), (t[51] = onExit), (t[52] = x));
    else x = t[52];
    let E;
    if (t[53] === MEMO_CACHE_SENTINEL)
      ((E = e(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "close",
      })),
        (t[53] = E));
    else E = t[53];
    let F;
    if (t[54] === MEMO_CACHE_SENTINEL)
      ((F = e(HintText, {
        hint: isSafeMode()
          ? `Custom skills are disabled in safe mode \u2014 ${getSafeModeExitHint()} to load them`
          : "Create skills in .claude/skills/ or ~/.claude/skills/",
        children: "No skills found",
      })),
        (t[54] = F));
    else F = t[54];
    let M;
    if (t[55] !== x)
      ((M = e(Dialog, { title: "Skills", onCancel: x, inputGuide: E, children: F })),
        (t[55] = x),
        (t[56] = M));
    else M = t[56];
    return M;
  }
  let Oe, Te, x, E, F, M, Fe, Qe, re, ie, ne, le, Ie, Ke, Be, ae, Le, je;
  if (
    t[57] !== bytesPerToken ||
    t[58] !== De ||
    t[59] !== W ||
    t[60] !== a ||
    t[61] !== yt ||
    t[62] !== St ||
    t[63] !== te ||
    t[64] !== st ||
    t[65] !== Z ||
    t[66] !== locked ||
    t[67] !== onExit ||
    t[68] !== cursorOffset ||
    t[69] !== handleKeyDown ||
    t[70] !== handlePaste ||
    t[71] !== query ||
    t[72] !== A ||
    t[73] !== u ||
    t[74] !== o ||
    t[75] !== k ||
    t[76] !== ht ||
    t[77] !== se
  ) {
    let _t = uniq(o.map(Hs).filter(Zs));
    let ce;
    if (t[96] !== a.length || t[97] !== query || t[98] !== o.length)
      ((ce = query
        ? `${a.length}/${o.length} ${plural(o.length, "skill")}`
        : `${o.length} ${plural(o.length, "skill")}`),
        (t[96] = a.length),
        (t[97] = query),
        (t[98] = o.length),
        (t[99] = ce));
    else ce = t[99];
    let no = ce;
    let lo = st
      ? "type to filter \xB7 \u2193/enter to select \xB7 esc to clear"
      : a.length === 0
        ? `/ to search, ${De} to close`
        : `enter/space to cycle, / to search, ${ht} to sort, ${De} to close`;
    Te = Dialog;
    Ke = "Skills";
    Be = `${no}${k ? " \xB7 sorted by tokens" : ""} \xB7 ${lo}`;
    if (t[100] !== onExit)
      ((ae = () => onExit("Skills dialog dismissed", { display: "system" })),
        (t[100] = onExit),
        (t[101] = ae));
    else ae = t[101];
    Le = !1;
    je = !0;
    Oe = Box;
    x = It;
    E = "column";
    F = 0;
    M = !0;
    Fe = yt;
    Qe = St;
    if (
      t[102] !== Z ||
      t[103] !== cursorOffset ||
      t[104] !== handleKeyDown ||
      t[105] !== handlePaste ||
      t[106] !== query
    )
      ((re = e(SearchBox, {
        ref: V,
        query: query,
        onKeyDown: handleKeyDown,
        onPaste: handlePaste,
        isTerminalFocused: Z,
        cursorOffset: cursorOffset,
        placeholder: "Search skills\u2026",
      })),
        (t[102] = Z),
        (t[103] = cursorOffset),
        (t[104] = handleKeyDown),
        (t[105] = handlePaste),
        (t[106] = query),
        (t[107] = re));
    else re = t[107];
    if (
      t[108] !== bytesPerToken ||
      t[109] !== W ||
      t[110] !== a ||
      t[111] !== te ||
      t[112] !== locked ||
      t[113] !== query ||
      t[114] !== A ||
      t[115] !== k ||
      t[116] !== se
    )
      ((ie =
        a.length === 0
          ? e(Box, { marginTop: 1, children: e(HintText, { children: `No skills match "${query}"` }) })
          : e(
              OrderedListWithItem,
              {
                visibleCount: se,
                isDisabled: Re,
                wrap: !0,
                overflowHint: "count",
                onFocus: (ao) => A(a[ao]),
                children: a.map((I) => {
                  let es = locked.get(I);
                  let { icon: icon, word: word } = SKILL_STATE_DISPLAY[es?.value ?? W[I.name] ?? "on"];
                  let mo = word === void 0 ? "" : word;
                  return e(
                    OrderedListWithItem.Item,
                    {
                      label: DJe(I),
                      icon: icon,
                      meta: [
                        lockReasonText(es),
                        te ? "" : mo,
                        getSkillSourceLabel(I),
                        `${formatTokenEstimate(estimateSkillListingTokens(I, bytesPerToken))} tok`,
                      ],
                    },
                    `${I.name}-${I.source}`,
                  );
                }),
              },
              k ? "tok" : "name",
            )),
        (t[108] = bytesPerToken),
        (t[109] = W),
        (t[110] = a),
        (t[111] = te),
        (t[112] = locked),
        (t[113] = query),
        (t[114] = A),
        (t[115] = k),
        (t[116] = se),
        (t[117] = ie));
    else ie = t[117];
    if (t[118] !== o)
      ((ne =
        o.some(zs) &&
        e(Box, {
          marginTop: 1,
          children: e(Text, { dimColor: !0, children: "Plugin skills are managed via /plugin" }),
        })),
        (t[118] = o),
        (t[119] = ne));
    else ne = t[119];
    if (t[120] !== u)
      ((le = u !== void 0 && e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: u }) })),
        (t[120] = u),
        (t[121] = le));
    else le = t[121];
    Ie =
      _t.length > 0 &&
      e(Box, {
        marginTop: 1,
        children: e(Text, {
          dimColor: !0,
          children: `Settings can't store an entry named ${_t.join(" or ")}, so a skill with that name can't be changed here. Rename its folder or command file to configure it.`,
        }),
      });
    ((t[57] = bytesPerToken),
      (t[58] = De),
      (t[59] = W),
      (t[60] = a),
      (t[61] = yt),
      (t[62] = St),
      (t[63] = te),
      (t[64] = st),
      (t[65] = Z),
      (t[66] = locked),
      (t[67] = onExit),
      (t[68] = cursorOffset),
      (t[69] = handleKeyDown),
      (t[70] = handlePaste),
      (t[71] = query),
      (t[72] = A),
      (t[73] = u),
      (t[74] = o),
      (t[75] = k),
      (t[76] = ht),
      (t[77] = se),
      (t[78] = Oe),
      (t[79] = Te),
      (t[80] = x),
      (t[81] = E),
      (t[82] = F),
      (t[83] = M),
      (t[84] = Fe),
      (t[85] = Qe),
      (t[86] = re),
      (t[87] = ie),
      (t[88] = ne),
      (t[89] = le),
      (t[90] = Ie),
      (t[91] = Ke),
      (t[92] = Be),
      (t[93] = ae),
      (t[94] = Le),
      (t[95] = je));
  } else
    ((Oe = t[78]),
      (Te = t[79]),
      (x = t[80]),
      (E = t[81]),
      (F = t[82]),
      (M = t[83]),
      (Fe = t[84]),
      (Qe = t[85]),
      (re = t[86]),
      (ie = t[87]),
      (ne = t[88]),
      (le = t[89]),
      (Ie = t[90]),
      (Ke = t[91]),
      (Be = t[92]),
      (ae = t[93]),
      (Le = t[94]),
      (je = t[95]));
  let ce;
  if (t[122] === MEMO_CACHE_SENTINEL)
    ((ce =
      isSafeMode() &&
      e(Box, {
        marginTop: 1,
        children: r(Text, {
          dimColor: !0,
          children: [
            "Custom skills are disabled in safe mode \u2014",
            " ",
            `${getSafeModeExitHint()} to load them`,
          ],
        }),
      })),
      (t[122] = ce));
  else ce = t[122];
  let K;
  if (
    t[123] !== Oe ||
    t[124] !== x ||
    t[125] !== E ||
    t[126] !== F ||
    t[127] !== M ||
    t[128] !== Fe ||
    t[129] !== Qe ||
    t[130] !== re ||
    t[131] !== ie ||
    t[132] !== ne ||
    t[133] !== le ||
    t[134] !== Ie
  )
    ((K = r(Oe, {
      ref: x,
      flexDirection: E,
      tabIndex: F,
      autoFocus: M,
      onKeyDown: Fe,
      onPaste: Qe,
      children: [re, ie, ne, le, Ie, ce],
    })),
      (t[123] = Oe),
      (t[124] = x),
      (t[125] = E),
      (t[126] = F),
      (t[127] = M),
      (t[128] = Fe),
      (t[129] = Qe),
      (t[130] = re),
      (t[131] = ie),
      (t[132] = ne),
      (t[133] = le),
      (t[134] = Ie),
      (t[135] = K));
  else K = t[135];
  let ts;
  if (
    t[136] !== Te ||
    t[137] !== Ke ||
    t[138] !== Be ||
    t[139] !== ae ||
    t[140] !== Le ||
    t[141] !== je ||
    t[142] !== K
  )
    ((ts = e(Te, {
      title: Ke,
      subtitle: Be,
      onCancel: ae,
      isCancelActive: Le,
      hideInputGuide: je,
      children: K,
    })),
      (t[136] = Te),
      (t[137] = Ke),
      (t[138] = Be),
      (t[139] = ae),
      (t[140] = Le),
      (t[141] = je),
      (t[142] = K),
      (t[143] = ts));
  else ts = t[143];
  return ts;
}
/**
 * /skills 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-00qhwn8e.js:27856-28005 fingerprint = call (0.637)
async function call(onDone, context) {
  if (Jn()) return e(SkillsMenu_2, { onExit: onDone });
  return e(SkillsMenu, {
    onExit: onDone,
    commands: context.options.commands,
    bytesPerToken: bytesPerTokenForModel(context.options.mainLoopModel),
  });
}
