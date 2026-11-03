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
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useHasScrollViewport } from "../../components/ScrollViewportContext.js";
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
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import { parseMarketplaceInput } from "../../utils/plugins/parseMarketplaceInput.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { shortHash } from "../../utils/shortHash.js";
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
import { isWithinRecentInput, RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
  inputValue,
  setInputValue,
  cursorOffset,
  setCursorOffset,
  error,
  setError,
  result: D,
  setResult,
  setViewState,
  onAddComplete,
  cliMode = false,
  autoAdd,
  claudeAiListing,
  confirmAdd,
}) {
  let { storageV5, credentials } = useTheme_2();
  let hasScrollViewport = useHasScrollViewport();
  let hasAttemptedAutoAdd = R(false);
  let [ne, he] = y(false);
  let [W, Oe] = y("");
  let [rt, et] = y(null);
  let [je, ae] = y(null);
  let plugin = confirmAdd?.plugin;
  let kt = R(false);
  let Tt = R(false);
  let inputClock = useInputClock();
  let Et = R(null);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let Ct = R(false);
  let handleAdd = async () => {
    {
      let pluginDirectoryState = await getPluginDirectoryState();
      if (pluginDirectoryState === "blocked" || pluginDirectoryState === "unavailable") {
        logMarketplaceAddFailed({
          reason: pluginDirectoryState === "blocked" ? "policy_blocked" : "reserved_name",
          sourceKind: undefined,
          surface: "ui",
        });
        let qe =
          pluginDirectoryState === "blocked"
            ? `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()} It can't be turned on here.`
            : `The ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session.`;
        setError(qe);
        if (cliMode) setResult(qe);
        return;
      }
      if (pluginDirectoryState === "off") {
        try {
          await setPluginDirectoryEnabled(true);
        } catch (error) {
          logDirectoryToggle({
            enabled: true,
            surface: "ui",
            failure: "settings_write_failed",
          });
          let vt = printableName(errorMessage(error), 300);
          setError(vt);
          if (cliMode) setResult(`Error: ${vt}`);
          return;
        }
        logDirectoryToggle({
          enabled: true,
          surface: "ui",
        });
        refreshPluginCaches(storageV5, credentials);
        await onAddComplete();
      } else await persistPluginDirectoryChoice(true);
      setError(null);
      if (cliMode)
        setResult(
          pluginDirectoryState === "off"
            ? `${OFFICIAL_MARKETPLACE_DISPLAY} is on. Its plugins are back in /plugin \u2192 Discover.`
            : `${OFFICIAL_MARKETPLACE_DISPLAY} is already on`,
        );
      else if (pluginDirectoryState === "off")
        setViewState({
          type: "browse-marketplace",
          targetMarketplace: OFFICIAL_MARKETPLACE_NAME,
        });
      else et(`${OFFICIAL_MARKETPLACE_DISPLAY} is already on.`);
    }
  };
  let ft = async () => {
    let input = inputValue.trim();
    if (!input) {
      setError("Please enter a marketplace source");
      return;
    }
    et(null);
    if (isOfficialMarketplaceName_2(input)) {
      if (Ct.current) return;
      Ct.current = true;
      await handleAdd().finally(() => {
        Ct.current = false;
      });
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
  };
  let at = async (_e) => {
    setError(null);
    try {
      he(true);
      Oe("");
      let {
        name: qe,
        resolvedSource,
        replacedSource,
      } = await addMarketplaceSource(
        _e,
        (message) => {
          Oe(message);
        },
        storageV5,
        undefined,
        {
          refuseNameCollision: confirmAdd !== undefined,
        },
      );
      let { error } = await saveMarketplaceToSettings_2(
        qe,
        {
          source: resolvedSource,
        },
        "userSettings",
        storageV5,
      );
      if (error) throw error;
      refreshPluginCaches(storageV5, credentials);
      logEvent("tengu_marketplace_added", {
        _PROTO_marketplace_name: qe,
        source_type: fromEnum(_e.source),
        repo_hash: _e.source === "github" ? shortHash(_e.repo) : undefined,
        is_official_marketplace: isOfficialMarketplaceName_3(qe),
      });
      let $t = [];
      if (confirmAdd === undefined)
        try {
          $t = (
            await resolveMissingDependencies((await loadAllPlugins(storageV5, credentials)).errors, storageV5)
          ).installed;
        } catch (error) {
          logForDebugging(`marketplace add: dep auto-resolve skipped: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      if ($t.length > 0) refreshPluginCaches(storageV5, credentials);
      await onAddComplete();
      Oe("");
      he(false);
      if (cliMode)
        setResult(
          [
            `Successfully added marketplace: ${qe}${formatDependencyCountSuffix($t)}`,
            ...describeMarketplaceSourceReplaced({
              name: qe,
              replacedSource,
              resolvedSource,
              settingSource: "userSettings",
            }),
          ].join(`
`),
        );
      else if (!Tt.current)
        setViewState({
          type: "browse-marketplace",
          targetMarketplace: qe,
          targetPlugin: plugin,
        });
    } catch (err) {
      let error = toError(err);
      logForDebugging(`marketplace add failed: ${errorMessage(error)}`, {
        level: "error",
      });
      setError(error.message);
      Oe("");
      he(false);
      if (cliMode) setResult(`Error: ${error.message}`);
      else setResult(null);
    }
  };
  async function Ot(confirmAdd, qe) {
    try {
      if (confirmAdd.linkOrigin) {
        parseDeepLinkMarketplace(inputValue);
        if (confirmAdd.plugin !== undefined) validateDeepLinkPlugin(confirmAdd.plugin);
      }
      let marketplaceInput = await parseMarketplaceInput(inputValue);
      if (qe()) return;
      if (!marketplaceInput || "error" in marketplaceInput) {
        setError(marketplaceInput?.error ?? INVALID_MARKETPLACE_SOURCE_MESSAGE);
        return;
      }
      let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
      let nn = confirmAdd.linkOrigin
        ? findMarketplaceBySourceLoose(knownMarketplacesWithDeclared, marketplaceInput)
        : findMarketplaceBySource(knownMarketplacesWithDeclared, marketplaceInput);
      if (qe()) return;
      if (nn !== undefined) {
        setViewState({
          type: "browse-marketplace",
          targetMarketplace: nn,
          targetPlugin: confirmAdd.plugin,
        });
        return;
      }
      Et.current = Date.now();
      ae(marketplaceInput);
    } catch (error) {
      if (!qe()) setError(errorMessage(error));
    }
  }
  P(() => {
    if (confirmAdd === undefined) return;
    let _e = false;
    Ot(confirmAdd, () => _e);
    return () => {
      _e = true;
    };
  }, []);
  function an() {
    if (kt.current) return;
    Tt.current = true;
    setViewState({
      type: "menu",
    });
  }
  function Yt(event) {
    if (event.ctrl || event.meta || ne) return;
    if ((event.key === "y" || event.key === "Y") && je) {
      event.preventDefault();
      let qe = Et.current;
      if (
        qe === null ||
        isWithinRecentInput(inputClock, qe, RECENT_INPUT_GUARD_MS) ||
        refusedWithin(RECENT_INPUT_GUARD_MS)
      ) {
        noteRefused();
        return;
      }
      if (kt.current || Tt.current) return;
      kt.current = true;
      at(je).finally(() => {
        kt.current = false;
      });
    } else if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      an();
    }
  }
  P(() => {
    if (autoAdd && confirmAdd === undefined && inputValue && !hasAttemptedAutoAdd.current && !error && !D) {
      hasAttemptedAutoAdd.current = true;
      ft();
    }
  }, []);
  if (confirmAdd !== undefined) {
    let ref = je && "ref" in je ? je.ref : undefined;
    return jsxProd_default(Dialog, {
      title: "Add marketplace?",
      color: "suggestion",
      onCancel: an,
      isCancelActive: !ne,
      hideInputGuide: ne,
      inputGuide: je
        ? jsxProd_default_2(Text, {
            children: [
              "Press ",
              jsxProd_default(Text, {
                bold: true,
                children: "y",
              }),
              " to add or ",
              jsxProd_default(Text, {
                bold: true,
                children: "n",
              }),
              " to cancel",
            ],
          })
        : jsxProd_default_2(Text, {
            children: [
              "Press ",
              jsxProd_default(Text, {
                bold: true,
                children: "n",
              }),
              " to cancel",
            ],
          }),
      children: jsxProd_default_2(FocusColumn, {
        onKeyDown: Yt,
        gap: 1,
        children: [
          je
            ? jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  plugin !== undefined
                    ? jsxProd_default_2(Text, {
                        children: [
                          "To install",
                          " ",
                          jsxProd_default(Text, {
                            bold: true,
                            children: stripInvisibleKeepEmoji(plugin),
                          }),
                          ", add the marketplace that lists it:",
                        ],
                      })
                    : jsxProd_default(Text, {
                        children: "Add this marketplace:",
                      }),
                  jsxProd_default_2(Text, {
                    children: ["  ", stripInvisibleKeepEmoji(formatSourceForDisplay(je))],
                  }),
                  ref !== undefined &&
                    jsxProd_default_2(Text, {
                      children: [
                        "  ",
                        "Pinned to ",
                        stripInvisibleKeepEmoji(ref),
                        "; it won't receive updates past it.",
                      ],
                    }),
                  jsxProd_default(Box, {
                    marginTop: 1,
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      children:
                        plugin !== undefined
                          ? "Only add marketplaces you trust. You'll review the plugin and choose where to install it next."
                          : "Only add marketplaces you trust. You'll review its plugins before installing any.",
                    }),
                  }),
                ],
              })
            : !error &&
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(Spinner, {}),
                  jsxProd_default(Text, {
                    children: "Checking marketplace source\u2026",
                  }),
                ],
              }),
          ne &&
            jsxProd_default_2(Box, {
              children: [
                jsxProd_default(Spinner, {}),
                jsxProd_default(Text, {
                  children: stripInvisibleKeepEmoji(W) || "Adding marketplace to configuration\u2026",
                }),
              ],
            }),
          error &&
            jsxProd_default(ErrorText, {
              error: stripInvisibleKeepNewlines(error),
            }),
        ],
      }),
    });
  }
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: 1,
        borderStyle: hasScrollViewport ? undefined : "round",
        children: [
          jsxProd_default(Box, {
            marginBottom: 1,
            children: jsxProd_default(Text, {
              bold: true,
              children: "Add Marketplace",
            }),
          }),
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              claudeAiListing &&
                jsxProd_default_2(Box, {
                  marginBottom: 1,
                  flexDirection: "column",
                  children: [
                    jsxProd_default_2(Text, {
                      children: [
                        "claude.ai lists",
                        " ",
                        jsxProd_default(Text, {
                          bold: true,
                          children: stripInvisibleKeepEmoji(displayMarketplaceName(claudeAiListing.name)),
                        }),
                        " ",
                        "for your account:",
                      ],
                    }),
                    jsxProd_default_2(Text, {
                      children: [" ", stripInvisibleKeepEmoji(claudeAiListing.source)],
                    }),
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "Type or paste its source below to add it.",
                    }),
                  ],
                }),
              jsxProd_default(Text, {
                children: "Enter marketplace source:",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: "Examples:",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 owner/repo (GitHub)",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 git@github.com:owner/repo.git (SSH)",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 https://example.com/marketplace.json",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ./path/to/marketplace",
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(TextInput, {
                  value: inputValue,
                  onChange: setInputValue,
                  onSubmit: ft,
                  columns: 80,
                  cursorOffset,
                  onChangeCursorOffset: setCursorOffset,
                  focus: true,
                  showCursor: true,
                }),
              }),
            ],
          }),
          ne &&
            jsxProd_default_2(Box, {
              marginTop: 1,
              children: [
                jsxProd_default(Spinner, {}),
                jsxProd_default(Text, {
                  children: stripInvisibleKeepEmoji(W) || "Adding marketplace to configuration\u2026",
                }),
              ],
            }),
          error &&
            jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(ErrorText, {
                error: stripInvisibleKeepNewlines(error),
              }),
            }),
          rt &&
            jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(Text, {
                children: rt,
              }),
            }),
          D &&
            jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(Text, {
                children: stripInvisibleKeepNewlines(D),
              }),
            }),
        ],
      }),
      jsxProd_default(Box, {
        marginLeft: hasScrollViewport ? 1 : 3,
        marginTop: hasScrollViewport ? 1 : 0,
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: "add",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
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
