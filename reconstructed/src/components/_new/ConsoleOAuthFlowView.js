/**
 * components/_new/ConsoleOAuthFlowView.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s5p7fp0c.js (3)
 * attribution: sole-consumer-new 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getConfiguredAwsAuthRefresh, getOauthAccountInfo } from "../../utils/auth.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { checkAllowedProvider } from "../../utils/model/allowedProviders.js";
import { mn, providerOption, hn, ManagedSettingsLoginNotice } from "./_new/ManagedSettingsLoginNotice.js";
import { logEvent } from "../../services/analytics/index.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { GatewayLogin } from "../GatewayLogin.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { fi } from "../../utils/browser.js";
import { call } from "../AwsAuthRefresh.js";
import { CreateAgentWizard } from "../agents/new-agent-creation/CreateAgentWizard.js";
import { VertexSetupWizard } from "../vertexSetup/VertexSetupWizard.js";
import { RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT } from "../ConsoleOAuthFlow.js";
import { Spinner } from "../Spinner.js";
import { TextInput } from "../TextInput.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { trimTrailingPunctuation } from "../../services/oauth/oauthErrors.js";
import { safeVerificationUrl } from "../../services/api/verificationRequired.js";

/**
 * 第三方提供方登录选项。
 */
//@ chunk-s5p7fp0c.js:25025-25420 sole-consumer-new
var THIRD_PARTY_PROVIDER_OPTIONS = [
  { value: "bedrock", providers: ["bedrock"], title: "Amazon Bedrock", hint: "interactive setup" },
  {
    value: "aws_refresh",
    providers: ["anthropicAws", "bedrock", "mantle"],
    title: "Claude Platform on AWS",
    hint: "refresh credentials",
  },
  { value: "foundry", providers: ["foundry"], title: "Microsoft Foundry", hint: "opens docs" },
  { value: "vertex", providers: ["vertex"], title: "Google Vertex AI", hint: "interactive setup" },
];
/**
 * 登录流程主视图：选择方式、OAuth 状态、粘贴授权码、网关与第三方提供方。
 */
//@ chunk-s5p7fp0c.js:25420-40330 sole-consumer-new
function ConsoleOAuthFlowView(A) {
  let u = w(191),
    {
      oauthStatus: oauthStatus,
      mode: mode,
      startingMessage: startingMessage,
      forcedMethodMessage: forcedMethodMessage,
      gatewayUnsupportedWarning: gatewayUnsupportedWarning,
      forceLoginGatewayUrl: forceLoginGatewayUrl,
      gatewayNamedBy: gatewayNamedBy,
      gatewayInternalNetworks: gatewayInternalNetworks,
      gatewayScreenLocked: gatewayScreenLocked,
      keyMintFallbackReason: keyMintFallbackReason,
      showPastePrompt: showPastePrompt,
      pasteCodePrompt: pasteCodePrompt,
      pastedCode: pastedCode,
      setPastedCode: setPastedCode,
      cursorOffset: cursorOffset,
      setCursorOffset: setCursorOffset,
      textInputColumns: textInputColumns,
      handleSubmitCode: handleSubmitCode,
      setOAuthStatus: setOAuthStatus,
      setLoginWithClaudeAi: setLoginWithClaudeAi,
      setConsoleProfileLogin: setConsoleProfileLogin,
      consoleProfileLoginAllowed: consoleProfileLoginAllowed,
      allowedProviders: allowedProviders,
      firstPartyLoginAllowed: firstPartyLoginAllowed,
      setHybridRowPicked: setHybridRowPicked,
      onAuthSuccess: onAuthSuccess,
      reloadClearedOrgDocuments: reloadClearedOrgDocuments,
      allowContinueWithoutLogin: allowContinueWithoutLogin,
    } = A,
    B = useIsScreenReaderEnabled(),
    p;
  if (u[0] === MEMO_CACHE_SENTINEL) ((p = getConfiguredAwsAuthRefresh()), (u[0] = p));
  else p = u[0];
  let H = p,
    N;
  if (
    u[1] !== allowContinueWithoutLogin ||
    u[2] !== allowedProviders ||
    u[3] !== consoleProfileLoginAllowed ||
    u[4] !== cursorOffset ||
    u[5] !== firstPartyLoginAllowed ||
    u[6] !== forceLoginGatewayUrl ||
    u[7] !== forcedMethodMessage ||
    u[8] !== gatewayInternalNetworks ||
    u[9] !== gatewayNamedBy ||
    u[10] !== gatewayScreenLocked ||
    u[11] !== gatewayUnsupportedWarning ||
    u[12] !== handleSubmitCode ||
    u[13] !== B ||
    u[14] !== keyMintFallbackReason ||
    u[15] !== mode ||
    u[16] !== oauthStatus.backendName ||
    u[17] !== oauthStatus.message ||
    u[18] !== oauthStatus.notice ||
    u[19] !== oauthStatus.ok ||
    u[20] !== oauthStatus.sessionAuth ||
    u[21] !== oauthStatus.state ||
    u[22] !== oauthStatus.toRetry ||
    u[23] !== oauthStatus.token ||
    u[24] !== oauthStatus.transient ||
    u[25] !== oauthStatus.url ||
    u[26] !== oauthStatus.verbatim ||
    u[27] !== onAuthSuccess ||
    u[28] !== pasteCodePrompt ||
    u[29] !== pastedCode ||
    u[30] !== reloadClearedOrgDocuments ||
    u[31] !== setConsoleProfileLogin ||
    u[32] !== setCursorOffset ||
    u[33] !== setHybridRowPicked ||
    u[34] !== setLoginWithClaudeAi ||
    u[35] !== setOAuthStatus ||
    u[36] !== setPastedCode ||
    u[37] !== showPastePrompt ||
    u[38] !== startingMessage ||
    u[39] !== textInputColumns
  ) {
    N = EARLY_RETURN_SENTINEL;
    mo: {
      let Se;
      if (u[41] !== allowedProviders)
        ((Se = (xe) =>
          (allowedProviders === void 0 ||
            xe.providers.some((provider) => allowedProviders.includes(provider))) &&
          (xe.value !== "aws_refresh" || !!H)),
          (u[41] = allowedProviders),
          (u[42] = Se));
      else Se = u[42];
      let filtered = THIRD_PARTY_PROVIDER_OPTIONS.filter(Se);
      let Le;
      switch (oauthStatus.state) {
        case "idle": {
          const h = startingMessage
            ? startingMessage
            : "Claude Code can be used with your Claude subscription or billed based on API usage through your Console account.";
          let k;
          if (u[43] !== h) ((k = e(Text, { bold: !0, children: h })), (u[43] = h), (u[44] = k));
          else k = u[44];
          let I;
          if (u[45] !== gatewayUnsupportedWarning)
            ((I =
              gatewayUnsupportedWarning &&
              e(Text, { color: "warning", children: gatewayUnsupportedWarning })),
              (u[45] = gatewayUnsupportedWarning),
              (u[46] = I));
          else I = u[46];
          const G =
            !firstPartyLoginAllowed &&
            Le === void 0 &&
            filtered.length === 0 &&
            e(Text, {
              color: "error",
              children:
                checkAllowedProvider("firstParty")?.message ??
                "Your organization's managed settings (allowedProviders) admit no sign-in this screen can offer; ask your administrator.",
            });
          let re;
          if (u[47] === MEMO_CACHE_SENTINEL)
            ((re = e(Text, { children: "Select login method:" })), (u[47] = re));
          else re = u[47];
          let ee;
          if (u[48] !== firstPartyLoginAllowed)
            ((ee = firstPartyLoginAllowed
              ? [
                  {
                    label: r(Text, {
                      children: [
                        "Claude account with subscription \xB7",
                        " ",
                        e(Text, { dimColor: !0, children: "Pro, Max, Team, or Enterprise" }),
                        !1,
                      ],
                    }),
                    value: "claudeai",
                  },
                  {
                    label: r(Text, {
                      children: [
                        "Anthropic Console account \xB7",
                        " ",
                        e(Text, { dimColor: !0, children: "API usage billing" }),
                      ],
                    }),
                    value: "console",
                  },
                ]
              : []),
              (u[48] = firstPartyLoginAllowed),
              (u[49] = ee));
          else ee = u[49];
          let fe;
          if (u[50] === MEMO_CACHE_SENTINEL)
            ((fe = Le !== void 0 ? [{ label: Le, value: "hybrid" }] : []), (u[50] = fe));
          else fe = u[50];
          const me =
            filtered.length > 0
              ? [
                  {
                    label: r(Text, {
                      children: [
                        "3rd-party platform \xB7",
                        " ",
                        e(Text, { dimColor: !0, children: filtered.map(mn).join(", ") }),
                      ],
                    }),
                    value: "platform",
                  },
                ]
              : [];
          let We;
          if (u[51] !== me || u[52] !== ee)
            ((We = [...ee, ...fe, ...me]), (u[51] = me), (u[52] = ee), (u[53] = We));
          else We = u[53];
          let Ye;
          if (
            u[54] !== consoleProfileLoginAllowed ||
            u[55] !== setConsoleProfileLogin ||
            u[56] !== setHybridRowPicked ||
            u[57] !== setLoginWithClaudeAi ||
            u[58] !== setOAuthStatus
          )
            ((Ye = ($e) => {
              if ($e === "platform")
                (logEvent("tengu_oauth_platform_selected", {}), setOAuthStatus({ state: "platform_setup" }));
              else if ($e === "claudeai" || $e === "hybrid")
                (logEvent("tengu_oauth_claudeai_selected", {}),
                  setHybridRowPicked($e === "hybrid"),
                  setLoginWithClaudeAi(!0),
                  setConsoleProfileLogin(!1),
                  setOAuthStatus({ state: "ready_to_start" }));
              else if (consoleProfileLoginAllowed)
                (logEvent("tengu_oauth_console_selected", {}), setOAuthStatus({ state: "console_method" }));
              else
                (logEvent("tengu_oauth_console_selected", {}),
                  setLoginWithClaudeAi(!1),
                  setConsoleProfileLogin(!1),
                  setOAuthStatus({ state: "ready_to_start" }));
            }),
              (u[54] = consoleProfileLoginAllowed),
              (u[55] = setConsoleProfileLogin),
              (u[56] = setHybridRowPicked),
              (u[57] = setLoginWithClaudeAi),
              (u[58] = setOAuthStatus),
              (u[59] = Ye));
          else Ye = u[59];
          let Ve;
          if (u[60] !== We || u[61] !== Ye)
            ((Ve = e(Box, { children: e(ModelSelector, { options: We, onChange: Ye }) })),
              (u[60] = We),
              (u[61] = Ye),
              (u[62] = Ve));
          else Ve = u[62];
          let bt;
          if (u[63] !== Ve || u[64] !== k || u[65] !== I || u[66] !== G)
            ((bt = r(Box, { flexDirection: "column", gap: 1, children: [k, I, G, re, Ve] })),
              (u[63] = Ve),
              (u[64] = k),
              (u[65] = I),
              (u[66] = G),
              (u[67] = bt));
          else bt = u[67];
          N = bt;
          break mo;
        }
        case "gateway_setup": {
          let h;
          if (u[68] !== onAuthSuccess || u[69] !== reloadClearedOrgDocuments || u[70] !== setOAuthStatus)
            ((h = () => {
              (onAuthSuccess?.(),
                reloadClearedOrgDocuments("new"),
                setOAuthStatus({ state: "gateway_done" }));
            }),
              (u[68] = onAuthSuccess),
              (u[69] = reloadClearedOrgDocuments),
              (u[70] = setOAuthStatus),
              (u[71] = h));
          else h = u[71];
          let k;
          if (u[72] !== setOAuthStatus)
            ((k = () => setOAuthStatus({ state: "idle" })), (u[72] = setOAuthStatus), (u[73] = k));
          else k = u[73];
          let I;
          if (
            u[74] !== forceLoginGatewayUrl ||
            u[75] !== gatewayInternalNetworks ||
            u[76] !== gatewayNamedBy ||
            u[77] !== gatewayScreenLocked ||
            u[78] !== h ||
            u[79] !== k
          )
            ((I = e(GatewayLogin, {
              initialUrl: forceLoginGatewayUrl,
              namedBy: gatewayNamedBy,
              internalNetworks: gatewayInternalNetworks,
              screenLocked: gatewayScreenLocked,
              onDone: h,
              onCancel: k,
            })),
              (u[74] = forceLoginGatewayUrl),
              (u[75] = gatewayInternalNetworks),
              (u[76] = gatewayNamedBy),
              (u[77] = gatewayScreenLocked),
              (u[78] = h),
              (u[79] = k),
              (u[80] = I));
          else I = u[80];
          N = I;
          break mo;
        }
        case "gateway_done": {
          let h;
          if (u[81] === MEMO_CACHE_SENTINEL)
            ((h = e(Text, { color: "success", children: "Connected to Cloud gateway." })), (u[81] = h));
          else h = u[81];
          let k;
          if (u[82] === MEMO_CACHE_SENTINEL)
            ((k = r(Box, {
              flexDirection: "column",
              gap: 1,
              marginTop: 1,
              children: [
                h,
                r(Text, {
                  dimColor: !0,
                  children: ["Press ", e(Text, { bold: !0, children: "Enter" }), " to continue."],
                }),
              ],
            })),
              (u[82] = k));
          else k = u[82];
          N = k;
          break mo;
        }
        case "console_method": {
          let h, k;
          if (u[83] === MEMO_CACHE_SENTINEL)
            ((h = e(Text, { bold: !0, children: "Anthropic Console account" })),
              (k = e(Text, { children: "How do you want to sign in?" })),
              (u[83] = h),
              (u[84] = k));
          else ((h = u[83]), (k = u[84]));
          let I;
          if (u[85] === MEMO_CACHE_SENTINEL)
            ((I = {
              label: r(Text, {
                children: [
                  "Sign in with your Console account",
                  " ",
                  e(Text, { dimColor: !0, children: "(recommended)" }),
                ],
              }),
              value: "wif",
            }),
              (u[85] = I));
          else I = u[85];
          let G;
          if (u[86] === MEMO_CACHE_SENTINEL)
            ((G = e(Text, { dimColor: !0, children: "(legacy)" })), (u[86] = G));
          else G = u[86];
          let re;
          if (u[87] === MEMO_CACHE_SENTINEL)
            ((re = [
              I,
              {
                label: r(Text, {
                  children: [
                    "Create an API key ",
                    G,
                    " \xB7",
                    " ",
                    e(Text, { dimColor: !0, children: "adds a key to your Console workspace" }),
                  ],
                }),
                value: "api-key",
              },
              { label: "Go back", value: "back" },
            ]),
              (u[87] = re));
          else re = u[87];
          let ee;
          if (u[88] !== setOAuthStatus)
            ((ee = () => setOAuthStatus({ state: "idle" })), (u[88] = setOAuthStatus), (u[89] = ee));
          else ee = u[89];
          let fe;
          if (u[90] !== setConsoleProfileLogin || u[91] !== setLoginWithClaudeAi || u[92] !== setOAuthStatus)
            ((fe = (je) => {
              if (je === "back") {
                setOAuthStatus({ state: "idle" });
                return;
              }
              if ((setLoginWithClaudeAi(!1), je === "wif"))
                (logEvent("tengu_oauth_console_token_selected", {}), setConsoleProfileLogin(!0));
              else (logEvent("tengu_oauth_console_api_key_selected", {}), setConsoleProfileLogin(!1));
              setOAuthStatus({ state: "ready_to_start" });
            }),
              (u[90] = setConsoleProfileLogin),
              (u[91] = setLoginWithClaudeAi),
              (u[92] = setOAuthStatus),
              (u[93] = fe));
          else fe = u[93];
          let me;
          if (u[94] !== fe || u[95] !== ee)
            ((me = r(Box, {
              flexDirection: "column",
              gap: 1,
              children: [
                h,
                k,
                e(Box, { children: e(ModelSelector, { options: re, onCancel: ee, onChange: fe }) }),
              ],
            })),
              (u[94] = fe),
              (u[95] = ee),
              (u[96] = me));
          else me = u[96];
          N = me;
          break mo;
        }
        case "platform_setup": {
          let h;
          if (u[97] === MEMO_CACHE_SENTINEL)
            ((h = e(Text, { bold: !0, children: "Using 3rd-party platforms" })), (u[97] = h));
          else h = u[97];
          const k = [...filtered.map(providerOption), { label: "Go back", value: "back" }];
          let I, G;
          if (u[98] !== setOAuthStatus)
            ((I = (Xe) => {
              _t: switch (Xe) {
                case "bedrock": {
                  (logEvent("tengu_oauth_bedrock_wizard_launched", {}),
                    setOAuthStatus({ state: "bedrock_wizard" }));
                  break _t;
                }
                case "aws_refresh": {
                  (logEvent("tengu_oauth_aws_refresh_launched", {}),
                    setOAuthStatus({ state: "aws_refresh_running" }));
                  break _t;
                }
                case "foundry": {
                  (logEvent("tengu_oauth_platform_docs_opened", { platform: lit("foundry") }),
                    fi("https://code.claude.com/docs/en/microsoft-foundry"),
                    setOAuthStatus({ state: "idle" }));
                  break _t;
                }
                case "vertex": {
                  (logEvent("tengu_oauth_vertex_wizard_launched", {}),
                    setOAuthStatus({ state: "vertex_wizard" }));
                  break _t;
                }
                default: {
                  setOAuthStatus({ state: "idle" });
                }
              }
            }),
              (G = () => setOAuthStatus({ state: "idle" })),
              (u[98] = setOAuthStatus),
              (u[99] = I),
              (u[100] = G));
          else ((I = u[99]), (G = u[100]));
          N = r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              h,
              e(ModelSelector, { options: k, onChange: I, onCancel: G }),
              filtered.some(hn) &&
                r(Text, {
                  dimColor: !0,
                  children: [
                    "Foundry: ",
                    e(Link, {
                      url: "https://code.claude.com/docs/en/microsoft-foundry",
                      children: "https://code.claude.com/docs/en/microsoft-foundry",
                    }),
                  ],
                }),
            ],
          });
          break mo;
        }
        case "aws_refresh_running": {
          let h;
          if (u[101] !== setOAuthStatus)
            ((h = e(call, { onComplete: (ot) => setOAuthStatus({ state: "aws_refresh_done", ok: ot }) })),
              (u[101] = setOAuthStatus),
              (u[102] = h));
          else h = u[102];
          N = h;
          break mo;
        }
        case "aws_refresh_done": {
          let h;
          if (u[103] !== oauthStatus.ok)
            ((h = oauthStatus.ok
              ? e(Text, { color: "success", children: "AWS credentials refreshed." })
              : e(Text, {
                  color: "error",
                  children:
                    "awsAuthRefresh failed. Check the command in your settings and try running it in a separate terminal.",
                })),
              (u[103] = oauthStatus.ok),
              (u[104] = h));
          else h = u[104];
          let k;
          if (u[105] === MEMO_CACHE_SENTINEL)
            ((k = r(Text, {
              dimColor: !0,
              children: ["Press ", e(Text, { bold: !0, children: "Enter" }), " to continue."],
            })),
              (u[105] = k));
          else k = u[105];
          let I;
          if (u[106] !== h)
            ((I = r(Box, { flexDirection: "column", gap: 1, children: [h, k] })), (u[106] = h), (u[107] = I));
          else I = u[107];
          N = I;
          break mo;
        }
        case "bedrock_wizard": {
          let h;
          if (u[108] !== setOAuthStatus)
            ((h = e(CreateAgentWizard, {
              onComplete: (kt) => setOAuthStatus({ state: "bedrock_done", message: kt }),
              onCancel: () => setOAuthStatus({ state: "platform_setup" }),
              exitOnCtrlCD: !0,
            })),
              (u[108] = setOAuthStatus),
              (u[109] = h));
          else h = u[109];
          N = h;
          break mo;
        }
        case "bedrock_done":
        case "vertex_done": {
          let h;
          if (u[110] !== oauthStatus.message)
            ((h = e(Text, { color: "success", children: oauthStatus.message })),
              (u[110] = oauthStatus.message),
              (u[111] = h));
          else h = u[111];
          let k;
          if (u[112] === MEMO_CACHE_SENTINEL)
            ((k = r(Text, {
              dimColor: !0,
              children: ["Press ", e(Text, { bold: !0, children: "Enter" }), " to restart Claude Code."],
            })),
              (u[112] = k));
          else k = u[112];
          let I;
          if (u[113] !== h)
            ((I = r(Box, { flexDirection: "column", gap: 1, children: [h, k] })), (u[113] = h), (u[114] = I));
          else I = u[114];
          N = I;
          break mo;
        }
        case "vertex_wizard": {
          let h;
          if (u[115] !== setOAuthStatus)
            ((h = e(VertexSetupWizard, {
              onComplete: (vt) => setOAuthStatus({ state: "vertex_done", message: vt }),
              onCancel: () => setOAuthStatus({ state: "platform_setup" }),
              exitOnCtrlCD: !0,
            })),
              (u[115] = setOAuthStatus),
              (u[116] = h));
          else h = u[116];
          N = h;
          break mo;
        }
        case "waiting_for_login": {
          let h;
          if (u[117] !== forcedMethodMessage)
            ((h =
              forcedMethodMessage &&
              e(Box, { children: e(Text, { dimColor: !0, children: forcedMethodMessage }) })),
              (u[117] = forcedMethodMessage),
              (u[118] = h));
          else h = u[118];
          let k;
          if (u[119] !== keyMintFallbackReason)
            ((k =
              keyMintFallbackReason &&
              e(Box, {
                children: e(Text, {
                  dimColor: !0,
                  children: `${RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT} (${keyMintFallbackReason.cause}), so this sign-in will create an API key.`,
                }),
              })),
              (u[119] = keyMintFallbackReason),
              (u[120] = k));
          else k = u[120];
          let I;
          if (u[121] !== showPastePrompt)
            ((I =
              !showPastePrompt &&
              r(Box, {
                children: [e(Spinner, {}), e(Text, { children: "Opening browser to sign in\u2026" })],
              })),
              (u[121] = showPastePrompt),
              (u[122] = I));
          else I = u[122];
          let G;
          if (
            u[123] !== cursorOffset ||
            u[124] !== handleSubmitCode ||
            u[125] !== B ||
            u[126] !== oauthStatus.url ||
            u[127] !== pasteCodePrompt ||
            u[128] !== pastedCode ||
            u[129] !== setCursorOffset ||
            u[130] !== setPastedCode ||
            u[131] !== showPastePrompt ||
            u[132] !== textInputColumns
          )
            ((G =
              showPastePrompt &&
              r(Box, {
                children: [
                  e(Text, { children: pasteCodePrompt }),
                  e(TextInput, {
                    value: pastedCode,
                    onChange: setPastedCode,
                    onSubmit: (Ot) => handleSubmitCode(Ot, oauthStatus.url),
                    cursorOffset: cursorOffset,
                    onChangeCursorOffset: setCursorOffset,
                    columns: textInputColumns,
                    mask: "*",
                    focus: !0,
                    showCursor: B,
                  }),
                ],
              })),
              (u[123] = cursorOffset),
              (u[124] = handleSubmitCode),
              (u[125] = B),
              (u[126] = oauthStatus.url),
              (u[127] = pasteCodePrompt),
              (u[128] = pastedCode),
              (u[129] = setCursorOffset),
              (u[130] = setPastedCode),
              (u[131] = showPastePrompt),
              (u[132] = textInputColumns),
              (u[133] = G));
          else G = u[133];
          let re;
          if (u[134] !== h || u[135] !== k || u[136] !== I || u[137] !== G)
            ((re = r(Box, { flexDirection: "column", gap: 1, children: [h, k, I, G] })),
              (u[134] = h),
              (u[135] = k),
              (u[136] = I),
              (u[137] = G),
              (u[138] = re));
          else re = u[138];
          N = re;
          break mo;
        }
        case "creating_api_key": {
          let h;
          if (u[139] === MEMO_CACHE_SENTINEL)
            ((h = e(Box, {
              flexDirection: "column",
              gap: 1,
              children: r(Box, {
                children: [e(Spinner, {}), e(Text, { children: "Creating API key for Claude Code\u2026" })],
              }),
            })),
              (u[139] = h));
          else h = u[139];
          N = h;
          break mo;
        }
        case "about_to_retry": {
          let h;
          if (u[140] === MEMO_CACHE_SENTINEL)
            ((h = e(Box, {
              flexDirection: "column",
              gap: 1,
              children: e(Text, { color: "permission", children: "Retrying\u2026" }),
            })),
              (u[140] = h));
          else h = u[140];
          N = h;
          break mo;
        }
        case "success": {
          let h;
          if (u[141] !== mode || u[142] !== oauthStatus.notice || u[143] !== oauthStatus.token)
            ((h =
              mode === "setup-token" && oauthStatus.token
                ? null
                : r(Fragment, {
                    children: [
                      getOauthAccountInfo()?.emailAddress
                        ? r(Text, {
                            dimColor: !0,
                            children: [
                              "Logged in as",
                              " ",
                              e(Text, { children: getOauthAccountInfo()?.emailAddress }),
                            ],
                          })
                        : null,
                      e(ManagedSettingsLoginNotice, {}),
                      r(Text, {
                        color: "success",
                        children: [
                          "Login successful. Press ",
                          e(Text, { bold: !0, children: "Enter" }),
                          " to continue\u2026",
                        ],
                      }),
                      oauthStatus.notice ? e(Text, { color: "warning", children: oauthStatus.notice }) : null,
                    ],
                  })),
              (u[141] = mode),
              (u[142] = oauthStatus.notice),
              (u[143] = oauthStatus.token),
              (u[144] = h));
          else h = u[144];
          let k;
          if (u[145] !== h)
            ((k = e(Box, { flexDirection: "column", children: h })), (u[145] = h), (u[146] = k));
          else k = u[146];
          N = k;
          break mo;
        }
        case "storage_failed": {
          let h;
          if (u[147] !== oauthStatus.backendName)
            ((h = secureStorageLabel(oauthStatus.backendName)),
              (u[147] = oauthStatus.backendName),
              (u[148] = h));
          else h = u[148];
          let he = h;
          let k;
          if (u[149] !== he || u[150] !== oauthStatus.sessionAuth || u[151] !== oauthStatus.transient)
            ((k = e(Box, {
              flexDirection: "column",
              children:
                oauthStatus.sessionAuth === "fresh"
                  ? r(Fragment, {
                      children: [
                        e(Text, {
                          color: "warning",
                          children: oauthStatus.transient
                            ? `Logged in for now, but Claude Code couldn't confirm your new credentials were saved to ${he}.`
                            : `Logged in for now, but your new credentials could not be saved to ${he}.`,
                        }),
                        e(Text, {
                          color: "warning",
                          children: oauthStatus.transient
                            ? "This login may expire mid-session and may not persist after you exit Claude Code."
                            : "This login may expire mid-session and will not persist after you exit Claude Code.",
                        }),
                      ],
                    })
                  : oauthStatus.sessionAuth === "previous"
                    ? r(Fragment, {
                        children: [
                          r(Text, {
                            color: "error",
                            children: [
                              "Sign-in completed in the browser, but your new credentials could not be saved to ",
                              he,
                              " \u2014 a previous login's credentials are still in place and will be used instead.",
                            ],
                          }),
                          e(Text, {
                            dimColor: !0,
                            children: "(Your new sign-in did not replace the existing credentials.)",
                          }),
                        ],
                      })
                    : r(Fragment, {
                        children: [
                          r(Text, {
                            color: "error",
                            children: [
                              "Sign-in completed in the browser, but your credentials could not be saved to ",
                              he,
                              " \u2014 you are not logged in.",
                            ],
                          }),
                          e(Text, {
                            dimColor: !0,
                            children: "(No previous login on this machine is usable right now either.)",
                          }),
                        ],
                      }),
            })),
              (u[149] = he),
              (u[150] = oauthStatus.sessionAuth),
              (u[151] = oauthStatus.transient),
              (u[152] = k));
          else k = u[152];
          let I;
          if (u[153] === MEMO_CACHE_SENTINEL)
            ((I = e(Text, { dimColor: !0, children: "To avoid having to log in again each session:" })),
              (u[153] = I));
          else I = u[153];
          let G;
          if (u[154] !== he)
            ((G = r(Text, {
              dimColor: !0,
              children: ["  ", "\u2022 fix access to ", he, ", then run /login again"],
            })),
              (u[154] = he),
              (u[155] = G));
          else G = u[155];
          let re;
          if (u[156] === MEMO_CACHE_SENTINEL)
            ((re = r(Text, {
              dimColor: !0,
              children: ["  ", "\u2022 or run claude setup-token and set CLAUDE_CODE_OAUTH_TOKEN"],
            })),
              (u[156] = re));
          else re = u[156];
          let ee;
          if (u[157] !== G)
            ((ee = r(Box, { flexDirection: "column", children: [I, G, re] })), (u[157] = G), (u[158] = ee));
          else ee = u[158];
          let fe;
          if (u[159] !== allowContinueWithoutLogin || u[160] !== oauthStatus.sessionAuth)
            ((fe =
              oauthStatus.sessionAuth === "fresh"
                ? r(Text, {
                    color: "permission",
                    children: ["Press ", e(Text, { bold: !0, children: "Enter" }), " to continue\u2026"],
                  })
                : r(Text, {
                    color: "permission",
                    children: [
                      "Press ",
                      e(Text, { bold: !0, children: "Enter" }),
                      " to retry.",
                      " ",
                      allowContinueWithoutLogin
                        ? e(Text, {
                            dimColor: !0,
                            children: e(KeyboardShortcutHint, {
                              chord: "escape",
                              action: "continue without logging in",
                              parens: !0,
                            }),
                          })
                        : null,
                    ],
                  })),
              (u[159] = allowContinueWithoutLogin),
              (u[160] = oauthStatus.sessionAuth),
              (u[161] = fe));
          else fe = u[161];
          let me;
          if (u[162] !== fe || u[163] !== k || u[164] !== ee)
            ((me = r(Box, { flexDirection: "column", gap: 1, children: [k, ee, fe] })),
              (u[162] = fe),
              (u[163] = k),
              (u[164] = ee),
              (u[165] = me));
          else me = u[165];
          N = me;
          break mo;
        }
        case "account_on_hold": {
          let h;
          if (u[166] !== oauthStatus.message)
            ((h = e(Text, { color: "warning", children: oauthStatus.message })),
              (u[166] = oauthStatus.message),
              (u[167] = h));
          else h = u[167];
          let k;
          if (u[168] !== mode)
            ((k =
              mode !== "setup-token" &&
              r(Text, {
                dimColor: !0,
                children: [
                  "Press ",
                  e(Text, { bold: !0, children: "Enter" }),
                  " to go back to login options.",
                ],
              })),
              (u[168] = mode),
              (u[169] = k));
          else k = u[169];
          let I;
          if (u[170] !== h || u[171] !== k)
            ((I = r(Box, { flexDirection: "column", gap: 1, children: [h, k] })),
              (u[170] = h),
              (u[171] = k),
              (u[172] = I));
          else I = u[172];
          N = I;
          break mo;
        }
        case "error": {
          let ze, h, k, I;
          if (u[173] !== oauthStatus.message || u[174] !== oauthStatus.verbatim) {
            let rt = oauthStatus.verbatim ? /\s(https:\/\/\S+)$/.exec(oauthStatus.message) : null;
            let Ke = rt?.[1];
            let Ne = Ke && trimTrailingPunctuation(Ke);
            let St = Ke && Ne ? Ke.slice(Ne.length) : "";
            let it = Ne ? safeVerificationUrl(Ne) : void 0;
            ze = Box;
            h = "column";
            k = 1;
            I =
              rt && Ne
                ? r(Box, {
                    flexDirection: "column",
                    children: [
                      e(Text, { color: "error", children: oauthStatus.message.slice(0, rt.index) }),
                      r(Text, {
                        color: "error",
                        children: [
                          it
                            ? e(Link, {
                                url: it,
                                assumeSupport: !0,
                                children: e(Text, { color: "error", children: it }),
                              })
                            : Ne,
                          St,
                        ],
                      }),
                    ],
                  })
                : e(Text, {
                    color: "error",
                    children: oauthStatus.verbatim
                      ? oauthStatus.message
                      : `OAuth error: ${oauthStatus.message}`,
                  });
            ((u[173] = oauthStatus.message),
              (u[174] = oauthStatus.verbatim),
              (u[175] = ze),
              (u[176] = h),
              (u[177] = k),
              (u[178] = I));
          } else ((ze = u[175]), (h = u[176]), (k = u[177]), (I = u[178]));
          let G;
          if (u[179] !== keyMintFallbackReason)
            ((G =
              keyMintFallbackReason &&
              e(Text, {
                dimColor: !0,
                children: `${RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT}: ${keyMintFallbackReason.message}`,
              })),
              (u[179] = keyMintFallbackReason),
              (u[180] = G));
          else G = u[180];
          let re;
          if (u[181] !== allowContinueWithoutLogin || u[182] !== oauthStatus.toRetry)
            ((re =
              (oauthStatus.toRetry || allowContinueWithoutLogin) &&
              e(Box, {
                marginTop: 1,
                children: r(Text, {
                  color: "permission",
                  children: [
                    oauthStatus.toRetry &&
                      r(Fragment, {
                        children: ["Press ", e(Text, { bold: !0, children: "Enter" }), " to retry.", " "],
                      }),
                    allowContinueWithoutLogin
                      ? e(Text, {
                          dimColor: !0,
                          children: e(KeyboardShortcutHint, {
                            chord: "escape",
                            action: "continue without logging in",
                            parens: !0,
                          }),
                        })
                      : null,
                  ],
                }),
              })),
              (u[181] = allowContinueWithoutLogin),
              (u[182] = oauthStatus.toRetry),
              (u[183] = re));
          else re = u[183];
          let ee;
          if (u[184] !== ze || u[185] !== h || u[186] !== k || u[187] !== I || u[188] !== G || u[189] !== re)
            ((ee = r(ze, { flexDirection: h, gap: k, children: [I, G, re] })),
              (u[184] = ze),
              (u[185] = h),
              (u[186] = k),
              (u[187] = I),
              (u[188] = G),
              (u[189] = re),
              (u[190] = ee));
          else ee = u[190];
          N = ee;
          break mo;
        }
        default: {
          N = null;
          break mo;
        }
      }
    }
    ((u[1] = allowContinueWithoutLogin),
      (u[2] = allowedProviders),
      (u[3] = consoleProfileLoginAllowed),
      (u[4] = cursorOffset),
      (u[5] = firstPartyLoginAllowed),
      (u[6] = forceLoginGatewayUrl),
      (u[7] = forcedMethodMessage),
      (u[8] = gatewayInternalNetworks),
      (u[9] = gatewayNamedBy),
      (u[10] = gatewayScreenLocked),
      (u[11] = gatewayUnsupportedWarning),
      (u[12] = handleSubmitCode),
      (u[13] = B),
      (u[14] = keyMintFallbackReason),
      (u[15] = mode),
      (u[16] = oauthStatus.backendName),
      (u[17] = oauthStatus.message),
      (u[18] = oauthStatus.notice),
      (u[19] = oauthStatus.ok),
      (u[20] = oauthStatus.sessionAuth),
      (u[21] = oauthStatus.state),
      (u[22] = oauthStatus.toRetry),
      (u[23] = oauthStatus.token),
      (u[24] = oauthStatus.transient),
      (u[25] = oauthStatus.url),
      (u[26] = oauthStatus.verbatim),
      (u[27] = onAuthSuccess),
      (u[28] = pasteCodePrompt),
      (u[29] = pastedCode),
      (u[30] = reloadClearedOrgDocuments),
      (u[31] = setConsoleProfileLogin),
      (u[32] = setCursorOffset),
      (u[33] = setHybridRowPicked),
      (u[34] = setLoginWithClaudeAi),
      (u[35] = setOAuthStatus),
      (u[36] = setPastedCode),
      (u[37] = showPastePrompt),
      (u[38] = startingMessage),
      (u[39] = textInputColumns),
      (u[40] = N));
  } else N = u[40];
  if (N !== EARLY_RETURN_SENTINEL) return N;
}
/**
 * 安全存储类型的显示名。
 */
//@ chunk-s5p7fp0c.js:40330-40726 sole-consumer-new
function secureStorageLabel(A) {
  switch (A) {
    case "keychain":
      return "the macOS Keychain";
    case "keychain-with-plaintext-fallback":
      return "the macOS Keychain or the credentials file";
    case "windows-credman":
      return "Windows Credential Manager";
    case "windows-credman-with-plaintext-fallback":
      return "Windows Credential Manager or the credentials file";
    case "plaintext":
      return "the credentials file";
    default:
      return "secure storage";
  }
}

export { ConsoleOAuthFlowView };
