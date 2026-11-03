/**
 * commands/plugin/AddMarketplace.tsx
 *
 * /plugin 添加市场界面（含策略拦截提示）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/AddMarketplace.tsx
 * pieces: chunk-vrb44rx7.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { Me } from "../../components/design-system/ThemeProvider.js";
import { Tl } from "../../components/ScrollViewportContext.js";
import { R, y, P } from "../../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusalTracker } from "../../components/CustomSelect/selectTypeahead.js";
import {
  getPluginDirectoryState,
  setPluginDirectoryEnabled,
  persistPluginDirectoryChoice,
  addMarketplaceSource,
  saveMarketplaceToSettings as saveMarketplaceToSettings_2,
  loadKnownMarketplacesWithDeclared,
  findMarketplaceBySourceLoose,
  findMarketplaceBySource,
} from "../../utils/plugins/marketplaceManager.js";
import { logMarketplaceAddFailed, logDirectoryToggle } from "../../utils/plugins/pluginDirectoryTelemetry.js";
import {
  OFFICIAL_MARKETPLACE_DISPLAY,
  OFFICIAL_MARKETPLACE_NAME,
  isOfficialMarketplaceName_2,
} from "../../utils/plugins/officialMarketplaceNames.js";
import { pluginDirectoryPolicyBlockHint } from "../../utils/plugins/marketplacePolicy.js";
import { printableName } from "../../utils/printableName.js";
import { errorMessage, toError } from "../../utils/errors.js";
import { ic } from "../../utils/plugins/cacheUtils.js";
import { parseMarketplaceInput } from "../../utils/plugins/parseMarketplaceInput.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { gn } from "../../utils/shortHash.js";
import { isOfficialMarketplaceName_3 } from "../../utils/plugins/pluginIdentifier.js";
import { resolveMissingDependencies } from "../../utils/plugins/dependencyInstall.js";
import { loadAllPlugins } from "../../utils/plugins/pluginLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatDependencyCountSuffix } from "../../utils/plugins/dependencyResolver.js";
import {
  describeMarketplaceSourceReplaced,
  formatSourceForDisplay,
} from "../../utils/plugins/marketplaceHelpers.js";
import { parseDeepLinkMarketplace, validateDeepLinkPlugin } from "../../utils/deepLink/parseDeepLink.js";
import { isWithinRecentInput, So } from "../../hooks/useRecentInputGuard.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { Text, Box } from "../../ink/components/Text.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import {
  stripInvisibleKeepEmoji,
  stripInvisibleKeepNewlines,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { Spinner } from "../../components/Spinner.js";
import { ErrorText } from "../../components/ErrorText.js";
import { displayMarketplaceName } from "../../utils/plugins/pluginDisplayMetadata.js";
import { TextInput } from "../../components/TextInput.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";

//@ chunk-vrb44rx7.js:37819-37903 affinity
var INVALID_MARKETPLACE_SOURCE_MESSAGE =
  "Invalid marketplace source format. Try: owner/repo, https://..., or ./path";
//@ chunk-vrb44rx7.js:37903-43972 fingerprint = AddMarketplace (0.44)
function AddMarketplace({
  inputValue: inputValue,
  setInputValue: setInputValue,
  cursorOffset: cursorOffset,
  setCursorOffset: setCursorOffset,
  error: error,
  setError: setError,
  result: D,
  setResult: setResult,
  setViewState: setViewState,
  onAddComplete: onAddComplete,
  cliMode: cliMode = !1,
  autoAdd: autoAdd,
  claudeAiListing: claudeAiListing,
  confirmAdd: confirmAdd,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    fe = Tl(),
    hasAttemptedAutoAdd = R(!1),
    [ne, he] = y(!1),
    [W, Oe] = y(""),
    [rt, et] = y(null),
    [je, ae] = y(null),
    Se = confirmAdd?.plugin,
    kt = R(!1),
    Tt = R(!1),
    Ke = useInputClock(),
    Et = R(null),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    Ct = R(!1),
    handleAdd = async () => {
      {
        let _e = await getPluginDirectoryState();
        if (_e === "blocked" || _e === "unavailable") {
          logMarketplaceAddFailed({
            reason: _e === "blocked" ? "policy_blocked" : "reserved_name",
            sourceKind: void 0,
            surface: "ui",
          });
          let qe =
            _e === "blocked"
              ? `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()} It can't be turned on here.`
              : `The ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session.`;
          if ((setError(qe), cliMode)) setResult(qe);
          return;
        }
        if (_e === "off") {
          try {
            await setPluginDirectoryEnabled(!0);
          } catch (error) {
            logDirectoryToggle({ enabled: !0, surface: "ui", failure: "settings_write_failed" });
            let vt = printableName(errorMessage(error), 300);
            if ((setError(vt), cliMode)) setResult(`Error: ${vt}`);
            return;
          }
          (logDirectoryToggle({ enabled: !0, surface: "ui" }),
            ic(storageV5, credentials),
            await onAddComplete());
        } else await persistPluginDirectoryChoice(!0);
        if ((setError(null), cliMode))
          setResult(
            _e === "off"
              ? `${OFFICIAL_MARKETPLACE_DISPLAY} is on. Its plugins are back in /plugin \u2192 Discover.`
              : `${OFFICIAL_MARKETPLACE_DISPLAY} is already on`,
          );
        else if (_e === "off")
          setViewState({ type: "browse-marketplace", targetMarketplace: OFFICIAL_MARKETPLACE_NAME });
        else et(`${OFFICIAL_MARKETPLACE_DISPLAY} is already on.`);
      }
    },
    ft = async () => {
      let input = inputValue.trim();
      if (!input) {
        setError("Please enter a marketplace source");
        return;
      }
      if ((et(null), isOfficialMarketplaceName_2(input))) {
        if (Ct.current) return;
        ((Ct.current = !0),
          await handleAdd().finally(() => {
            Ct.current = !1;
          }));
        return;
      }
      let parsed = await parseMarketplaceInput(input);
      if (!parsed) {
        setError(INVALID_MARKETPLACE_SOURCE_MESSAGE);
        return;
      }
      if ("error" in parsed) {
        setError(parsed.error);
        return;
      }
      await at(parsed);
    },
    at = async (_e) => {
      setError(null);
      try {
        (he(!0), Oe(""));
        let {
            name: qe,
            resolvedSource: resolvedSource,
            replacedSource: replacedSource,
          } = await addMarketplaceSource(
            _e,
            (message) => {
              Oe(message);
            },
            storageV5,
            void 0,
            { refuseNameCollision: confirmAdd !== void 0 },
          ),
          { error: error } = await saveMarketplaceToSettings_2(
            qe,
            { source: resolvedSource },
            "userSettings",
            storageV5,
          );
        if (error) throw error;
        (ic(storageV5, credentials),
          logEvent("tengu_marketplace_added", {
            _PROTO_marketplace_name: qe,
            source_type: fromEnum(_e.source),
            repo_hash: _e.source === "github" ? gn(_e.repo) : void 0,
            is_official_marketplace: isOfficialMarketplaceName_3(qe),
          }));
        let $t = [];
        if (confirmAdd === void 0)
          try {
            $t = (
              await resolveMissingDependencies(
                (await loadAllPlugins(storageV5, credentials)).errors,
                storageV5,
              )
            ).installed;
          } catch (error) {
            logForDebugging(`marketplace add: dep auto-resolve skipped: ${errorMessage(error)}`, {
              level: "warn",
            });
          }
        if ($t.length > 0) ic(storageV5, credentials);
        if ((await onAddComplete(), Oe(""), he(!1), cliMode))
          setResult(
            [
              `Successfully added marketplace: ${qe}${formatDependencyCountSuffix($t)}`,
              ...describeMarketplaceSourceReplaced({
                name: qe,
                replacedSource: replacedSource,
                resolvedSource: resolvedSource,
                settingSource: "userSettings",
              }),
            ].join(`
`),
          );
        else if (!Tt.current)
          setViewState({ type: "browse-marketplace", targetMarketplace: qe, targetPlugin: Se });
      } catch (err) {
        let error = toError(err);
        if (
          (logForDebugging(`marketplace add failed: ${errorMessage(error)}`, { level: "error" }),
          setError(error.message),
          Oe(""),
          he(!1),
          cliMode)
        )
          setResult(`Error: ${error.message}`);
        else setResult(null);
      }
    };
  async function Ot(_e, qe) {
    try {
      if (_e.linkOrigin) {
        if ((parseDeepLinkMarketplace(inputValue), _e.plugin !== void 0)) validateDeepLinkPlugin(_e.plugin);
      }
      let vt = await parseMarketplaceInput(inputValue);
      if (qe()) return;
      if (!vt || "error" in vt) {
        setError(vt?.error ?? INVALID_MARKETPLACE_SOURCE_MESSAGE);
        return;
      }
      let Lt = await loadKnownMarketplacesWithDeclared(storageV5),
        nn = _e.linkOrigin ? findMarketplaceBySourceLoose(Lt, vt) : findMarketplaceBySource(Lt, vt);
      if (qe()) return;
      if (nn !== void 0) {
        setViewState({ type: "browse-marketplace", targetMarketplace: nn, targetPlugin: _e.plugin });
        return;
      }
      ((Et.current = Date.now()), ae(vt));
    } catch (error) {
      if (!qe()) setError(errorMessage(error));
    }
  }
  P(() => {
    if (confirmAdd === void 0) return;
    let _e = !1;
    return (
      Ot(confirmAdd, () => _e),
      () => {
        _e = !0;
      }
    );
  }, []);
  function an() {
    if (kt.current) return;
    ((Tt.current = !0), setViewState({ type: "menu" }));
  }
  function Yt(_e) {
    if (_e.ctrl || _e.meta || ne) return;
    if ((_e.key === "y" || _e.key === "Y") && je) {
      _e.preventDefault();
      let qe = Et.current;
      if (qe === null || isWithinRecentInput(Ke, qe, So) || refusedWithin(So)) {
        noteRefused();
        return;
      }
      if (kt.current || Tt.current) return;
      ((kt.current = !0),
        at(je).finally(() => {
          kt.current = !1;
        }));
    } else if (_e.key === "n" || _e.key === "N") (_e.preventDefault(), an());
  }
  if (
    (P(() => {
      if (autoAdd && confirmAdd === void 0 && inputValue && !hasAttemptedAutoAdd.current && !error && !D)
        ((hasAttemptedAutoAdd.current = !0), ft());
    }, []),
    confirmAdd !== void 0)
  ) {
    let _e = je && "ref" in je ? je.ref : void 0;
    return e(Dialog, {
      title: "Add marketplace?",
      color: "suggestion",
      onCancel: an,
      isCancelActive: !ne,
      hideInputGuide: ne,
      inputGuide: je
        ? r(Text, {
            children: [
              "Press ",
              e(Text, { bold: !0, children: "y" }),
              " to add or ",
              e(Text, { bold: !0, children: "n" }),
              " to cancel",
            ],
          })
        : r(Text, { children: ["Press ", e(Text, { bold: !0, children: "n" }), " to cancel"] }),
      children: r(FocusColumn, {
        onKeyDown: Yt,
        gap: 1,
        children: [
          je
            ? r(Box, {
                flexDirection: "column",
                children: [
                  Se !== void 0
                    ? r(Text, {
                        children: [
                          "To install",
                          " ",
                          e(Text, { bold: !0, children: stripInvisibleKeepEmoji(Se) }),
                          ", add the marketplace that lists it:",
                        ],
                      })
                    : e(Text, { children: "Add this marketplace:" }),
                  r(Text, { children: ["  ", stripInvisibleKeepEmoji(formatSourceForDisplay(je))] }),
                  _e !== void 0 &&
                    r(Text, {
                      children: [
                        "  ",
                        "Pinned to ",
                        stripInvisibleKeepEmoji(_e),
                        "; it won't receive updates past it.",
                      ],
                    }),
                  e(Box, {
                    marginTop: 1,
                    children: e(Text, {
                      dimColor: !0,
                      children:
                        Se !== void 0
                          ? "Only add marketplaces you trust. You'll review the plugin and choose where to install it next."
                          : "Only add marketplaces you trust. You'll review its plugins before installing any.",
                    }),
                  }),
                ],
              })
            : !error &&
              r(Box, {
                children: [e(Spinner, {}), e(Text, { children: "Checking marketplace source\u2026" })],
              }),
          ne &&
            r(Box, {
              children: [
                e(Spinner, {}),
                e(Text, {
                  children: stripInvisibleKeepEmoji(W) || "Adding marketplace to configuration\u2026",
                }),
              ],
            }),
          error && e(ErrorText, { error: stripInvisibleKeepNewlines(error) }),
        ],
      }),
    });
  }
  return r(Box, {
    flexDirection: "column",
    children: [
      r(Box, {
        flexDirection: "column",
        paddingX: 1,
        borderStyle: fe ? void 0 : "round",
        children: [
          e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Add Marketplace" }) }),
          r(Box, {
            flexDirection: "column",
            children: [
              claudeAiListing &&
                r(Box, {
                  marginBottom: 1,
                  flexDirection: "column",
                  children: [
                    r(Text, {
                      children: [
                        "claude.ai lists",
                        " ",
                        e(Text, {
                          bold: !0,
                          children: stripInvisibleKeepEmoji(displayMarketplaceName(claudeAiListing.name)),
                        }),
                        " ",
                        "for your account:",
                      ],
                    }),
                    r(Text, { children: [" ", stripInvisibleKeepEmoji(claudeAiListing.source)] }),
                    e(Text, { dimColor: !0, children: "Type or paste its source below to add it." }),
                  ],
                }),
              e(Text, { children: "Enter marketplace source:" }),
              e(Text, { dimColor: !0, children: "Examples:" }),
              e(Text, { dimColor: !0, children: " \xB7 owner/repo (GitHub)" }),
              e(Text, { dimColor: !0, children: " \xB7 git@github.com:owner/repo.git (SSH)" }),
              e(Text, { dimColor: !0, children: " \xB7 https://example.com/marketplace.json" }),
              e(Text, { dimColor: !0, children: " \xB7 ./path/to/marketplace" }),
              e(Box, {
                marginTop: 1,
                children: e(TextInput, {
                  value: inputValue,
                  onChange: setInputValue,
                  onSubmit: ft,
                  columns: 80,
                  cursorOffset: cursorOffset,
                  onChangeCursorOffset: setCursorOffset,
                  focus: !0,
                  showCursor: !0,
                }),
              }),
            ],
          }),
          ne &&
            r(Box, {
              marginTop: 1,
              children: [
                e(Spinner, {}),
                e(Text, {
                  children: stripInvisibleKeepEmoji(W) || "Adding marketplace to configuration\u2026",
                }),
              ],
            }),
          error &&
            e(Box, { marginTop: 1, children: e(ErrorText, { error: stripInvisibleKeepNewlines(error) }) }),
          rt && e(Box, { marginTop: 1, children: e(Text, { children: rt }) }),
          D && e(Box, { marginTop: 1, children: e(Text, { children: stripInvisibleKeepNewlines(D) }) }),
        ],
      }),
      e(Box, {
        marginLeft: fe ? 1 : 3,
        marginTop: fe ? 1 : 0,
        children: e(Text, {
          dimColor: !0,
          italic: !0,
          children: r(Byline, {
            children: [
              e(KeyboardShortcutHint, { chord: "enter", action: "add" }),
              e(ConfigurableShortcutHint, {
                action: "confirm:no",
                context: "Settings",
                fallback: "Esc",
                description: "cancel",
              }),
            ],
          }),
        }),
      }),
    ],
  });
}

export { AddMarketplace };
