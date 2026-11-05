/**
 * commands/plugin/AddMarketplace.tsx
 *
 * /plugin 添加市场界面（含策略拦截提示）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/AddMarketplace.tsx
 * pieces: chunk-wb51jffc.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useHasScrollViewport } from "../../components/ScrollViewportContext.js";
import { useRef, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../../ink/components/Input.js";
import {
  useRecentInputStamp,
  isWithinRecentInput,
  RECENT_INPUT_GUARD_MS,
} from "../../hooks/useRecentInputGuard.js";
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

//@ chunk-wb51jffc.js:37945-38029 affinity
var INVALID_MARKETPLACE_SOURCE_MESSAGE =
  "Invalid marketplace source format. Try: owner/repo, https://..., or ./path";
//@ chunk-wb51jffc.js:38029-44123 fingerprint (2.1.88 match: AddMarketplace, 0.44)
function AddMarketplace({
  inputValue,
  setInputValue,
  cursorOffset,
  setCursorOffset,
  error,
  setError,
  result,
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
  let hasAttemptedAutoAdd = useRef(false);
  let [busy, setBusy] = useState(false);
  let [draftInput, setDraftInput] = useState("");
  let [inputError, setInputError] = useState(null);
  let [pendingConfirm, setConfirmAdd] = useState(null);
  let plugin = confirmAdd?.plugin;
  let submitting = useRef(false);
  let refreshing = useRef(false);
  let inputClock = useInputClock();
  let refusedRef = useRef(null);
  let refusedTick = useRecentInputStamp(refusedRef.current ?? 0);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let processing = useRef(false);
  let handleAdd = async () => {
    {
      let pluginDirectoryState = await getPluginDirectoryState();
      if (pluginDirectoryState === "blocked" || pluginDirectoryState === "unavailable") {
        logMarketplaceAddFailed({
          reason: pluginDirectoryState === "blocked" ? "policy_blocked" : "reserved_name",
          sourceKind: undefined,
          surface: "ui",
        });
        let blockedHint =
          pluginDirectoryState === "blocked"
            ? `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()} It can't be turned on here.`
            : `The ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session.`;
        setError(blockedHint);
        if (cliMode) setResult(blockedHint);
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
          let errorText = printableName(errorMessage(error), 300);
          setError(errorText);
          if (cliMode) setResult(`Error: ${errorText}`);
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
      else setInputError(`${OFFICIAL_MARKETPLACE_DISPLAY} is already on.`);
    }
  };
  let refreshPreview = async () => {
    let input = inputValue.trim();
    if (!input) {
      setError("Please enter a marketplace source");
      return;
    }
    setInputError(null);
    if (isOfficialMarketplaceName_2(input)) {
      if (processing.current) return;
      processing.current = true;
      await handleAdd().finally(() => {
        processing.current = false;
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
    await resolveAdd(parsed);
  };
  let resolveAdd = async (resolved) => {
    setError(null);
    try {
      setBusy(true);
      setDraftInput("");
      let {
        name: marketplaceName,
        resolvedSource,
        replacedSource,
      } = await addMarketplaceSource(
        resolved,
        (message) => {
          setDraftInput(message);
        },
        storageV5,
        undefined,
        {
          refuseNameCollision: confirmAdd !== undefined,
        },
      );
      let { error } = await saveMarketplaceToSettings_2(
        marketplaceName,
        {
          source: resolvedSource,
        },
        "userSettings",
        storageV5,
      );
      if (error) throw error;
      refreshPluginCaches(storageV5, credentials);
      logEvent("tengu_marketplace_added", {
        _PROTO_marketplace_name: marketplaceName,
        source_type: fromEnum(resolved.source),
        repo_hash: resolved.source === "github" ? shortHash(resolved.repo) : undefined,
        is_official_marketplace: isOfficialMarketplaceName_3(marketplaceName),
      });
      let lines = [];
      if (confirmAdd === undefined)
        try {
          lines = (
            await resolveMissingDependencies((await loadAllPlugins(storageV5, credentials)).errors, storageV5)
          ).installed;
        } catch (error) {
          logForDebugging(`marketplace add: dep auto-resolve skipped: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      if (lines.length > 0) refreshPluginCaches(storageV5, credentials);
      await onAddComplete();
      setDraftInput("");
      setBusy(false);
      if (cliMode)
        setResult(
          [
            `Successfully added marketplace: ${marketplaceName}${formatDependencyCountSuffix(lines)}`,
            ...describeMarketplaceSourceReplaced({
              name: marketplaceName,
              replacedSource,
              resolvedSource,
              settingSource: "userSettings",
            }),
          ].join(`
`),
        );
      else if (!refreshing.current)
        setViewState({
          type: "browse-marketplace",
          targetMarketplace: marketplaceName,
          targetPlugin: plugin,
        });
    } catch (err) {
      let error = toError(err);
      logForDebugging(`marketplace add failed: ${errorMessage(error)}`, {
        level: "error",
      });
      setError(error.message);
      setDraftInput("");
      setBusy(false);
      if (cliMode) setResult(`Error: ${error.message}`);
      else setResult(null);
    }
  };
  async function resolveMarketplace(confirmAdd, input) {
    try {
      if (confirmAdd.linkOrigin) {
        parseDeepLinkMarketplace(inputValue);
        if (confirmAdd.plugin !== undefined) validateDeepLinkPlugin(confirmAdd.plugin);
      }
      let source = await parseMarketplaceInput(inputValue);
      if (input()) return;
      if (!source || "error" in source) {
        setError(source?.error ?? INVALID_MARKETPLACE_SOURCE_MESSAGE);
        return;
      }
      let marketplaces = await loadKnownMarketplacesWithDeclared(storageV5);
      let source_2 = confirmAdd.linkOrigin
        ? findMarketplaceBySourceLoose(marketplaces, source)
        : findMarketplaceBySource(marketplaces, source);
      if (input()) return;
      if (source_2 !== undefined) {
        setViewState({
          type: "browse-marketplace",
          targetMarketplace: source_2,
          targetPlugin: confirmAdd.plugin,
        });
        return;
      }
      refusedRef.current = Date.now();
      setConfirmAdd(source);
    } catch (error) {
      if (!input()) setError(errorMessage(error));
    }
  }
  useEffect(() => {
    if (confirmAdd === undefined) return;
    let failed = false;
    resolveMarketplace(confirmAdd, () => failed);
    return () => {
      failed = true;
    };
  }, []);
  function onConfirm() {
    if (submitting.current) return;
    refreshing.current = true;
    setViewState({
      type: "menu",
    });
  }
  function handleKeyDown(event) {
    if (event.ctrl || event.meta || busy) return;
    if ((event.key === "y" || event.key === "Y") && pendingConfirm) {
      event.preventDefault();
      let pending = refusedRef.current;
      if (
        pending === null ||
        isWithinRecentInput(inputClock, refusedTick(pending), RECENT_INPUT_GUARD_MS) ||
        refusedWithin(RECENT_INPUT_GUARD_MS)
      ) {
        noteRefused();
        return;
      }
      if (submitting.current || refreshing.current) return;
      submitting.current = true;
      resolveAdd(pendingConfirm).finally(() => {
        submitting.current = false;
      });
    } else if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      onConfirm();
    }
  }
  useEffect(() => {
    if (
      autoAdd &&
      confirmAdd === undefined &&
      inputValue &&
      !hasAttemptedAutoAdd.current &&
      !error &&
      !result
    ) {
      hasAttemptedAutoAdd.current = true;
      refreshPreview();
    }
  }, []);
  if (confirmAdd !== undefined) {
    let ref = pendingConfirm && "ref" in pendingConfirm ? pendingConfirm.ref : undefined;
    return jsxProd_default(Dialog, {
      title: "Add marketplace?",
      color: "suggestion",
      onCancel: onConfirm,
      isCancelActive: !busy,
      hideInputGuide: busy,
      inputGuide: pendingConfirm
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
        onKeyDown: handleKeyDown,
        gap: 1,
        children: [
          pendingConfirm
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
                    children: ["  ", stripInvisibleKeepEmoji(formatSourceForDisplay(pendingConfirm))],
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
          busy &&
            jsxProd_default_2(Box, {
              children: [
                jsxProd_default(Spinner, {}),
                jsxProd_default(Text, {
                  children:
                    stripInvisibleKeepEmoji(draftInput) || "Adding marketplace to configuration\u2026",
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
                  onSubmit: refreshPreview,
                  columns: 80,
                  cursorOffset,
                  onChangeCursorOffset: setCursorOffset,
                  focus: true,
                  showCursor: true,
                }),
              }),
            ],
          }),
          busy &&
            jsxProd_default_2(Box, {
              marginTop: 1,
              children: [
                jsxProd_default(Spinner, {}),
                jsxProd_default(Text, {
                  children:
                    stripInvisibleKeepEmoji(draftInput) || "Adding marketplace to configuration\u2026",
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
          inputError &&
            jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(Text, {
                children: inputError,
              }),
            }),
          result &&
            jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(Text, {
                children: stripInvisibleKeepNewlines(result),
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
