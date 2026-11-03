/**
 * entrypoints/sdk/uiControlSchemas.ts
 *
 * 2.1.316 新增：UI 控制协议 schema（ui_attach/ui_render/ui_press/ui_panes/ui_prompt_* 等），宿主据此驱动无头界面。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  E,
  M,
  U,
  o,
  T,
  A,
  aA,
  pe,
  oe,
  Ir,
  zodStrictObject,
  Ue,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  jxn,
  SDKButtonMessageSchema,
  SDKCanUseToolCanUseToolMessageSchema,
  SDKHookCallbackHookCallbackMessageSchema,
  SDKMcpMessageMcpMessageMessageSchema,
  SDKOauthTokenRefreshOauthTokenRefreshMessageSchema,
  SDKHostAuthTokenRefreshHostAuthTokenRefreshMessageSchema,
  SDKElicitationElicitationMessageSchema,
  SDKRequestUserDialogRequestUserDialogMessageSchema,
  SDKRemoteToolCallRemoteToolCallMessageSchema,
  SDKRemotePlumbingCallRemotePlumbingCallMessageSchema,
  SDKRemoteToolsProbeRemoteToolsProbeMessageSchema,
  SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema,
  SDKRemoteControlWorkSecretRemoteControlWorkSecretMessageSchema,
  SDKInterruptInterruptMessageSchema,
  SDKInitializeInitializeMessageSchema,
  SDKSetPermissionModeSetPermissionModeMessageSchema,
  SDKSetModelSetModelMessageSchema,
  SDKSetMaxThinkingTokensSetMaxThinkingTokensMessageSchema,
  SDKRenameSessionRenameSessionMessageSchema,
  SDKSetColorSetColorMessageSchema,
  SDKMcpStatusMcpStatusMessageSchema,
  SDKGetContextUsageGetContextUsageMessageSchema,
  SDKGetSessionCostGetSessionCostMessageSchema,
  SDKListModelsListModelsMessageSchema,
  SDKGetUsageGetUsageMessageSchema,
  SDKGetMemoryDialogGetMemoryDialogMessageSchema,
  SDKGetSkillsDialogGetSkillsDialogMessageSchema,
  SDKGetChromeDialogGetChromeDialogMessageSchema,
  SDKGetChromeBrowsersGetChromeBrowsersMessageSchema,
  SDKSelectChromeBrowserSelectChromeBrowserMessageSchema,
  SDKGetSandboxDialogGetSandboxDialogMessageSchema,
  SDKGetStatusGetStatusMessageSchema,
  SDKExportConversationExportConversationMessageSchema,
  SDKListCloudSessionsListCloudSessionsMessageSchema,
  SDKGetCloudSessionGetCloudSessionMessageSchema,
  SDKGetCloudSessionTranscriptGetCloudSessionTranscriptMessageSchema,
  SDKGetBinaryVersionGetBinaryVersionMessageSchema,
  SDKMcpCallMcpCallMessageSchema,
  SDKFileSuggestionsFileSuggestionsMessageSchema,
  SDKRewindFilesRewindFilesMessageSchema,
  SDKCancelAsyncMessageCancelAsyncMessageMessageSchema,
  SDKReadFileReadFileMessageSchema,
  SDKListDirectoryListDirectoryMessageSchema,
  SDKGetWorkspaceDiffGetWorkspaceDiffMessageSchema,
  SDKGetPlanGetPlanMessageSchema,
  SDKSeedReadStateSeedReadStateMessageSchema,
  SDKMcpSetServersMcpSetServersMessageSchema,
  SDKRegisterRepoRootRegisterRepoRootMessageSchema,
  SDKReloadPluginsReloadPluginsMessageSchema,
  SDKReloadSkillsReloadSkillsMessageSchema,
  SDKReloadOutputStylesReloadOutputStylesMessageSchema,
  SDKMcpReconnectMcpReconnectMessageSchema,
  SDKMcpToggleMcpToggleMessageSchema,
  SDKSetMcpPermissionModeOverrideSetMcpPermissionModeOverrideMessageSchema,
  SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema,
  SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema,
  SDKSetCwdSetCwdMessageSchema,
  SDKClaimSessionClaimSessionMessageSchema,
  SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema,
  SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema,
  SDKMessageRatedMessageRatedMessageSchema,
  SDKStopTaskStopTaskMessageSchema,
  SDKStartShellTaskStartShellTaskMessageSchema,
  SDKBackgroundTasksBackgroundTasksMessageSchema,
  SDKGetTaskOutputGetTaskOutputMessageSchema,
  SDKApplyFlagSettingsApplyFlagSettingsMessageSchema,
  SDKGetSettingsGetSettingsMessageSchema,
  SDKGetHooksListingGetHooksListingMessageSchema,
  SDKUpdateSettingsUpdateSettingsMessageSchema,
  SDKSubmitFeedbackSubmitFeedbackMessageSchema,
  SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema,
  SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema,
  SDKTurnHandoffTurnHandoffMessageSchema,
  SDKListPermissionRulesListPermissionRulesMessageSchema,
  SDKMcpReadResourceMcpReadResourceMessageSchema,
} from "./controlSchemas.js";
import { me } from "./coreSchemas.js";

/**
 * UI 控制协议 schema（一个 var 语句）：ui_attach/detach、ui_render、ui_press、客户端模块与故障、输入/选择、窗格 show/focus/close/scroll/focus、ui_copy 与 composer 读写/绘制/建议、选区读取，以及控制请求总联合（循环发起的请求、客户端驱动的请求、全部请求）。首个绑定是 ui_render 的基准计时标记。
 */
//@ chunk-bwbq4xvm.js:709920-760324 placement
var UiRenderTimingSchema = DoctorLazy(() =>
    u({ seq: E().int(), t0: E() }).describe(
      "@internal Timing marks a benchmarking client attaches to a ui_render request; the response echoes them unchanged so the client can join its own marks to the CLI debug log lines keyed `instance_id#seq`.",
    ),
  ),
  UiViewportSchema = DoctorLazy(() =>
    u({
      columns: E().int().positive(),
      rows: E().int().positive(),
      isFullscreen: M()
        .optional()
        .describe(
          "@internal Whether this surface docks a pane beside the transcript, so a pane a plugin opens unasked is a sidebar and not a takeover; the hooks read it as `e.viewport.isFullscreen`. Leave it out until the surface can say (absent is unknown, not false); a surface with no dock at all says false. A change re-runs the hooked sites as a change of columns does.",
        ),
    }).describe(
      "@internal The size of the pane the surface draws the component in, in character cells of the surface's monospace font (its width and height over the code font's advance and line height), and whether its layout docks a pane; the hooks reached see it as `e.viewport` (src/plugins/functionHooks/types/render/render-viewport).",
    ),
  ),
  UiOnScreenRangeSchema = DoctorLazy(() =>
    u({ first: E().int().nonnegative(), last: E().int().nonnegative(), of: E().int().positive() })
      .refine((e) => e.first <= e.last && e.last < e.of)
      .describe(
        "@internal The part of a transcript message the asking surface has in its viewport: units `first` to `last` (inclusive, `first <= last < of`) of the message's whole extent `of`, in whatever the surface lays out with (lines, pixels), counted from the message's start. The hooks reached see it as `e.props.onScreen`.",
      ),
  ),
  UiRemoteSurfaceSchema = DoctorLazy(() =>
    U(["desktop", "mobile", "vscode"]).describe(
      "@internal A surface that draws over the wire: `desktop` (Claude Code Desktop), `mobile` (the Claude mobile app) or `vscode` (Claude Code for VS Code). What the client declared, a rendering fact and not a trust signal.",
    ),
  ),
  UiSurfaceSchema = DoctorLazy(() =>
    U(["terminal", "desktop", "mobile", "vscode"]).describe(
      "@internal Where the engine draws: the terminal (Ink) or a remote surface (src/plugins/functionHooks/types/render/render-surface).",
    ),
  ),
  UI_CLIENT_ID_RE = /^[A-Za-z0-9._-]{1,64}$/,
  UiClientIdSchema = DoctorLazy(() =>
    o()
      .regex(UI_CLIENT_ID_RE)
      .describe(
        "@internal The asking client's id on the session's roster of attached surfaces: 1 to 64 of letters, digits, `.`, `_`, `-`. Two phones are two ids on one surface; a client that never attaches is the engine's `<surface>:default`, which no wire id can spell.",
      ),
  ),
  SDKUiAttachUiAttachMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_attach"),
      surface: UiRemoteSurfaceSchema(),
      client_id: UiClientIdSchema(),
      viewport: UiViewportSchema().optional(),
      answers: A(aA(() => UiClientAnswerableRequestSchema()))
        .max(UI_CLIENT_ANSWERABLE_REQUEST_COUNT)
        .optional()
        .describe(
          "@internal The engine's requests this client answers on a plugin's behalf: `ui_copy` (its clipboard), `ui_prompt_read` / `ui_prompt_fill` / `ui_prompt_paint` / `ui_prompt_suggest` (its composer), `ui_read_selection` (what the person has selected in its page). The engine sends each only to a client that named it; a client that never names any (or names `[]`) is never asked, so `$.ui.copy` to its surface answers `no-clipboard`, the prompt calls the empty box / false and `$.ui.selection` nothing, as before. On a repeated ui_attach a given list (including `[]`) replaces the earlier one and an absent field keeps it: send `[]` to stop answering.",
        ),
    }).describe(
      "@internal A remote surface joins the session: the engine adds the client to its roster of attached surfaces and raises `session.attach` for it (`$.session.surfaces()` then lists the surface). Idempotent per client_id. A client that never sends it is attached by its first ui_render, under `<surface>:default`; every client still attached detaches when the session ends.",
    ),
  ),
  UiAttachResponseSchema = DoctorLazy(() =>
    u({
      surfaces: A(UiSurfaceSchema()).describe(
        "@internal The surfaces the session draws on after the attach, each once: `terminal` first when bound, then the remote surfaces in attach order.",
      ),
    }).describe("@internal The roster of surfaces after a ui_attach."),
  ),
  SDKUiDetachUiDetachMessageSchema = DoctorLazy(() =>
    u({ subtype: T("ui_detach"), client_id: UiClientIdSchema() }).describe(
      "@internal A remote surface leaves the session: the engine drops the client from its roster and raises `session.detach` with reason `detach`. A client_id not on the roster changes nothing.",
    ),
  ),
  UiDetachResponseSchema = DoctorLazy(() =>
    u({
      detached: M().describe("@internal Whether the client_id was on the roster."),
      surfaces: A(UiSurfaceSchema()).describe(
        "@internal The surfaces the session draws on after the detach.",
      ),
    }).describe("@internal The roster of surfaces after a ui_detach."),
  ),
  SDKUiRenderUiRenderMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_render"),
      surface: UiRemoteSurfaceSchema().describe(
        "@internal The surface asking: `desktop` (Claude Code Desktop), `mobile` (the Claude mobile app) or `vscode` (Claude Code for VS Code); the hooks reached see it as `e.surface` and answer from that surface's element table.",
      ),
      client_id: UiClientIdSchema()
        .optional()
        .describe(
          "@internal The asking client, as its ui_attach named it. The ask puts it on the roster when it is not there: the id given, else `<surface>:default`.",
        ),
      component: jxn(),
      instance_id: o().describe(
        "@internal The engine's requestId for this instance: the tool_use_id of a tool row or dialog, the message id of a message, the uuid of a command's output row (its twin's), 'session-mode' for the session chip. Two drawings of one component are two instances.",
      ),
      props: pe(o(), oe()).describe(
        "@internal The component's plain-data props as the asking surface holds them; the `ui.render` site rule validates their shape per component. `output` on a ToolUse is capped at 64 KB before the chain sees it.",
      ),
      viewport: UiViewportSchema().optional(),
      on_screen: UiOnScreenRangeSchema()
        .nullable()
        .optional()
        .describe(
          "@internal What of this instance the asking surface's viewport shows now, for a transcript message (UserMessage, AssistantMessage, ToolUse, ToolResult, ToolGroup, CommandOutput, TurnDuration, InfoNotice): the extent, or null while the surface draws it outside its viewport. The engine hands it to the hooks as `e.props.onScreen` for this surface's ask alone (a rewrite of it is refused) and never carries one surface's report to another; leave it out when the surface does not track visibility, and ask again, coalesced to the surface's frame, when it changes, so the hooks re-run for the messages crossing the viewport's edges.",
        ),
      content_rows: E()
        .int()
        .nonnegative()
        .optional()
        .describe(
          "@internal For a `Pane` or `AbovePrompt` ask: the rows the instance's whole tree lays out to as the surface last drew it (the window itself rides `props.scroll`), so a plugin's `$.ui.scroll` to `end` knows the last offset. Leave it out before the first layout.",
        ),
      keyed: A(aA(() => UiElementBoundsSchema()))
        .max(UI_KEYED_ELEMENTS_MAX)
        .optional()
        .describe(
          "@internal For a `Pane` or `AbovePrompt` ask: where the keyed elements of the tree last drawn sit, so a plugin's `$.ui.scroll({ to: { key } })` lands; without it that call is denied.",
        ),
      bench: UiRenderTimingSchema().optional(),
    }).describe(
      '@internal Ask the hooks engine to draw one component instance for a remote surface: runs the `ui.render` chain (every plugin hooked on it, then core) with the surface asked and answers the tree plus the props core was handed. A session with no hooks module loaded answers `{tree: {type: "engine", ref: 0}, hooked: false}` without running anything. Re-ask every mounted instance on each `ui_invalidate` system message, and an instance whose `on_screen` changed.',
    ),
  ),
  UiRenderResponseSchema = DoctorLazy(() =>
    u({
      tree: SDKButtonMessageSchema(),
      props: pe(o(), oe()).describe(
        "@internal What to draw the first engine node with: the chain's rewrite of the props, or the input's own. Props under any later engine node do not cross (the ledger holding them is process-local).",
      ),
      rewritten: M().describe("@internal True when `props` is not the object the request carried."),
      hooked: M().describe(
        "@internal Whether any loaded plugin hooks `ui.render` for this component; false means the surface may stop asking for it until the next ui_invalidate.",
      ),
      client_modules: pe(o(), o())
        .optional()
        .describe(
          "@internal For each plugin whose `Client` nodes the tree carries, the hash of its surface modules as ui_client_module serves them; the surface loads a plugin's modules once per hash and remounts its Clients when it changes. A plugin absent here has no surface module loaded: its Clients draw a fault line.",
        ),
      drawn_by: A(o())
        .optional()
        .describe(
          "@internal The plugins something of `tree` or `props` may be owed to, by the name each is loaded under, in chain order: those whose `ui.render` hook ran for this ask and did more than hand on (told one by one for the vscode surface; elsewhere neighbours that share the sandbox are told together), or every plugin hooked on the instance where that is not known. Plugins the binary carries are left out, so an empty list says the drawing is Claude Code's own. The engine's word, which no hook can set: what a surface marks a drawing with. Absent from a CLI that predates the field: whose the drawing is, is then not known.",
        ),
      bench: UiRenderTimingSchema().optional(),
    }).describe(
      "@internal What one remote-surface evaluation of `ui.render` produced, plus whether a plugin is hooked on the component at all.",
    ),
  ),
  SDKUiPressUiPressMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_press"),
      plugin: o().describe(
        "@internal The plugin whose hook drew the pressed element, as the tree carried it.",
      ),
      handle: E()
        .int()
        .describe(
          "@internal The handle the element carried (`press.handle`), naming the onPress closure held in that plugin's environment.",
        ),
      key: o()
        .optional()
        .describe(
          "@internal The element's own key as the tree carried it. When sent and not empty, a handle held under another key answers `{handled: false}` and nothing runs: the page's tree is not this process's.",
        ),
      surface: UiRemoteSurfaceSchema()
        .default("desktop")
        .describe(
          "@internal The surface the press came from, as the ui_render that drew the element named it; absent means `desktop`. The `ui.press` hooks reached see it as `e.surface`.",
        ),
      href: o()
        .max(2048)
        .optional()
        .describe(
          "@internal For a press on a link inside a `Markdown` element that carries a `press` (its plugin answers its links): the link's target as the tree's text wrote it, one `pressableLinks` names when that list is present. The `ui.press` hooks reached see it as `e.link.href`. Absent for a Button; a Markdown handle without it runs nothing.",
        ),
      client_id: UiClientIdSchema()
        .optional()
        .describe(
          "@internal The pressing client, as its ui_attach named it; optional, and the press runs the same with or without it.",
        ),
      press_id: o()
        .regex(/^[A-Za-z0-9._-]{1,64}$/)
        .optional()
        .catch(void 0)
        .describe(
          "@internal The host's own id for this one press: 1 to 64 ASCII letters, digits, '.', '_' and '-'. A `$.prompt.fill` that the pressed element's own handler makes names it back as `answers_press` on the ui_prompt_fill. A value of any other shape is dropped as if absent and the press runs the same. Send `client_id` with it: the id is named back to that client alone, and the id of a press that carries no `client_id` is named back to no client. No hook and no handler is shown it. A CLI that predates the field ignores it.",
        ),
      render: SDKUiRenderUiRenderMessageSchema()
        .omit({ subtype: !0 })
        .optional()
        .catch(void 0)
        .describe(
          "@internal The body of a ui_render request, without `subtype`, for the site that holds the pressed element: the answer carries that drawing as `drawn`, so the page need not ask for it. One object, bounded as a ui_render request is. A value that does not read as one is dropped as if absent and the press runs the same. A CLI that predates the field ignores it.",
        ),
    }).describe(
      "@internal A press on an element a plugin drew for a remote surface: a Button, or a link inside a Markdown whose plugin answers its links (with `href`). Runs the `ui.press` chain with the element's closure at the bottom. A CLI whose engine has no press site answers `{handled: false}`.",
    ),
  ),
  UiPressResponseSchema = DoctorLazy(() =>
    u({
      handled: M().describe(
        "@internal False when the engine has no press site, the handle named no held element, or it named one held under another key than the request sent; nothing ran, and the tree the surface holds is stale: it asks ui_render again.",
      ),
      element: o()
        .optional()
        .describe("@internal The element whose handler the press reached, when one did."),
      drawn: UiRenderResponseSchema()
        .optional()
        .describe(
          "@internal What a ui_render request with the press's `render` would have answered as the handler settled, through the same `ui.render` chain and with fresh handles. Absent when the press carried no `render` or one that does not read, when it was not handled, when the client it names is no longer attached, when a redraw of that instance was pushed during each of three draws, and when the draw was refused or failed: the page asks ui_render as before. The pushes do not change: a write the engine holds back to pace redraws, or made after this answer, is told by its ui_invalidate, and the page asks again.",
        ),
    }).describe("@internal Whether a ui_press reached a handler, and which."),
  ),
  UI_NAME_MAX_CHARS = 256,
  UI_VALUE_MAX_CHARS = 16384,
  UiClientRefSchema = DoctorLazy(() =>
    u({
      plugin: o()
        .max(UI_NAME_MAX_CHARS)
        .describe(
          "@internal Whose surface module the Client runs, as the node carried it (`client.plugin`).",
        ),
      component: jxn(),
      instance_id: o()
        .max(UI_NAME_MAX_CHARS)
        .describe(
          "@internal The engine's requestId of the instance the Client was drawn in: what the ui_render that carried it named.",
        ),
      client: o().max(UI_NAME_MAX_CHARS).describe("@internal The Client node's own `key`."),
      module: o()
        .max(UI_NAME_MAX_CHARS)
        .describe(
          "@internal The Client node's `module`: which of the plugin's surface modules runs there, its path under the plugin's folder.",
        ),
    }).describe(
      "@internal Where a Client node a remote surface drew sits: what a ui_client_press, ui_message or ui_client_fault names before anything runs.",
    ),
  ),
  SDKUiClientModuleUiClientModuleMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_client_module"),
      plugin: o().describe(
        "@internal The plugin whose surface modules the surface wants, as a Client node and `client_modules` named it.",
      ),
    }).describe(
      "@internal Ask for a plugin's surface modules as a desktop `Client` frame loads them: every file the host read when the hooks module loaded (only those: the paths its `Client`s name by literal), compiled to JavaScript, its own imports rewritten to import-map keys, each module's entry and component, and the hash ui_render announced. Errors when the plugin is not loaded or loaded no surface module.",
    ),
  ),
  UiClientModuleResponseSchema = DoctorLazy(() =>
    u({
      plugin: o(),
      hash: o().describe(
        "@internal sha256 over the keyed files and limits, hex: what `client_modules` carries for the plugin while this text and these bounds are served.",
      ),
      modules: A(
        u({
          module: o().describe(
            "@internal The module's path under the plugin's folder, POSIX-separated (`hooks/board.tsx`): what a Client node's `module` carries.",
          ),
          entry: o().describe(
            "@internal The entry file's import-map key (`surface:///<path under the plugin>`): what the frame imports for a Client naming this module, once the runtime is in.",
          ),
          component: o().describe(
            "@internal Which export of the entry draws: `default` when it has one, else its one PascalCase export; settled by the host at load.",
          ),
        }),
      ).describe(
        "@internal One per surface module the plugin's Clients name, in the order the host read them.",
      ),
      runtime: o().describe(
        "@internal The runtime module's key (`claude:surface-runtime`): exports `h` and `Fragment`, the JSX factory the plugin's files are compiled against, and `install(host, limits)`, the surface driver the terminal runs the same modules with. The frame sets `globalThis.h`/`Fragment` from it and installs before importing an entry.",
      ),
      limits: u({
        nodes: E().int(),
        depth: E().int(),
        chars: E().int(),
        values: E().int(),
        dataDepth: E().int(),
      }).describe(
        "@internal The bounds `install` takes: a tree of at most `nodes` elements `depth` deep serializing to `chars` characters, each props payload at most `values` values `dataDepth` deep; the terminal's own.",
      ),
      files: A(u({ key: o(), source: o() })).describe(
        "@internal Every file of every module, each once: the runtime first, then each entry and what it links: its key and its JavaScript, own imports keyed. Each module's files are bounded by the hooks-module limits (1 MiB a file, 8 MiB in all, 512 files) before they loaded.",
      ),
    }).describe("@internal A plugin's surface modules as the desktop frame links them."),
  ),
  SDKUiClientPressUiClientPressMessageSchema = DoctorLazy(() =>
    UiClientRefSchema()
      .extend({
        subtype: T("ui_client_press"),
        element: o()
          .max(UI_NAME_MAX_CHARS)
          .describe(
            "@internal The pressed element's own `key` inside the Client's tree; the hooks reached see `e.element`.",
          ),
        event: Ir("type", [
          u({ type: T("press") }),
          u({ type: T("input"), kind: U(["change", "submit"]), value: o().max(UI_VALUE_MAX_CHARS) }),
          u({ type: T("select"), value: o().max(UI_VALUE_MAX_CHARS) }),
        ]).describe(
          "@internal What happened: a Button pressed, an Input changed or submitted with its text, a Select picked with its value.",
        ),
      })
      .describe(
        "@internal A press, input or pick on a Button, Input or Select a surface module drew inside a `Client` the desktop drew: runs the `ui.press`, `ui.input` or `ui.select` chain over every hooked plugin with `surface: \"desktop\"`. The element's closure lives in the surface's frame, so the answer says whether the chain reached it and with what argument, and the surface runs it. One naming a Client the latest ui_render of that instance did not carry answers `{handled: false}`.",
      ),
  ),
  UiClientPressResponseSchema = DoctorLazy(() =>
    u({
      handled: M().describe("@internal False when the engine has no such Client drawn; nothing ran."),
      reached: pe(o(), oe())
        .optional()
        .describe(
          "@internal The chain's argument as it reached the element's own handler (`plugin`, `element`, `component`, `requestId`, `surface`, and `kind`/`value` for an input or pick, as hooks above left them): the surface runs the frame's closure with it. Absent when a hook withheld the press; the closure does not run.",
        ),
    }).describe(
      "@internal Whether a ui_client_press found its Client, and what reached the bottom of the chain.",
    ),
  ),
  SDKUiMessageUiMessageMessageSchema = DoctorLazy(() =>
    UiClientRefSchema()
      .extend({
        subtype: T("ui_message"),
        data: oe().describe(
          "@internal What the instance posted (`surface.post(data)`): plain JSON, bounded as a Client post is (2000 values, depth 32, 100 000 characters); the hooks reached see `e.data`.",
        ),
      })
      .describe(
        '@internal A post from a `Client` instance the desktop drew: runs the owning plugin\'s `ui.message` chain alone (origin `client`) with `surface: "desktop"`. One naming a Client the latest ui_render of that instance did not carry answers `{handled: false}`; data past the bounds errors.',
      ),
  ),
  UiMessageResponseSchema = DoctorLazy(() =>
    u({
      handled: M().describe("@internal False when the engine has no such Client drawn; nothing ran."),
      props: oe()
        .optional()
        .describe(
          "@internal The instance's next props when a hook answered `{ props }`: the surface hands them to the frame, local state kept; absent leaves them.",
        ),
    }).describe("@internal What the owning plugin's ui.message hooks answered a Client's post."),
  ),
  UI_FAULT_FIELD_MAX_CHARS = 200,
  SDKUiClientFaultUiClientFaultMessageSchema = DoctorLazy(() =>
    UiClientRefSchema()
      .extend({
        subtype: T("ui_client_fault"),
        phase: U(["load", "render", "run"]).describe(
          "@internal When the Client failed: `load` is before the module ran (its frame refused, the module not fetched, a throw at mount); `render` is a throw while drawing, an undrawable tree, or a render that never answered; `run` is a listener, timer or held closure, a loop, a flood. The hooks reached see it as `e.phase`.",
        ),
        reason: o()
          .max(UI_FAULT_FIELD_MAX_CHARS)
          .describe(
            "@internal Why, in the surface's words: one line of at most 200 characters, control characters and line separators sent as spaces; empty for a failure that gave no message. Untrusted text (it may quote what the plugin's module threw): to show or log, never to act on. The hooks reached see it as `e.reason`, scrubbed again and with the plugin's name and the module's taken off its front, and never empty: one with nothing in it reads `the module failed without a message`.",
          ),
      })
      .describe(
        '@internal A `Client` the desktop drew failed in its frame: runs the owning plugin\'s `ui.fault` chain alone with `surface: "desktop"`, so the plugin can draw another view. The address is the five flat fields ui_client_press and ui_message carry, and no `surface`. One request per fault line the surface draws; an instance started again that fails again is told again. One naming a Client the latest ui_render of that instance did not carry answers `{handled: false}`. A CLI that predates the request answers the error "Unsupported control request subtype: ui_client_fault".',
      ),
  ),
  UiClientFaultResponseSchema = DoctorLazy(() =>
    u({
      handled: M().describe(
        "@internal False when the engine has no such Client drawn; nothing ran. True once the owning plugin's hooks have run, whether or not it has any.",
      ),
    }).describe(
      "@internal Whether a ui_client_fault found its Client and reached the owning plugin's ui.fault hooks.",
    ),
  ),
  SDKUiInputUiInputMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_input"),
      plugin: o()
        .max(UI_NAME_MAX_CHARS)
        .describe("@internal The plugin whose hook drew the Input, as its `press.plugin` carried it."),
      handle: E()
        .int()
        .describe(
          "@internal The handle the Input carried (`press.handle`), naming the onInput and onSubmit closures held in that plugin's environment.",
        ),
      kind: U(["change", "submit"]).describe(
        "@internal Which of the two: `change` on an edit of the field, `submit` on Enter. The `ui.input` hooks reached see it as `e.kind`.",
      ),
      value: o()
        .max(UI_VALUE_MAX_CHARS)
        .describe(
          "@internal The field's whole text as the surface holds it now; the hooks reached see it as `e.value` and may rewrite it before the closure.",
        ),
      key: o()
        .optional()
        .describe(
          "@internal The Input's own `key`, as the tree carried it (the engine puts no length on a key): with `component` and `instance_id`, a handle a redraw just retired, or one held under another key (a tree another process drew), is re-resolved to the one Input that plugin holds under this key there, so typing across a re-render is not lost.",
        ),
      component: jxn()
        .optional()
        .describe(
          "@internal The render site the Input was drawn in, as the ui_render that drew it named it; pairs with `key` for the re-resolve.",
        ),
      instance_id: o()
        .max(UI_NAME_MAX_CHARS)
        .optional()
        .describe(
          "@internal The instance the Input was drawn in (the ui_render's `instance_id`): with `key` and `component`, names the one field among several instances that draw the same key (one per transcript row). Without it a retired handle re-resolves only when a single instance holds the key.",
        ),
      surface: UiRemoteSurfaceSchema()
        .default("desktop")
        .describe(
          "@internal The surface the field is on, as the ui_render that drew it named it; absent means `desktop`. The `ui.input` hooks reached see it as `e.surface`.",
        ),
      client_id: UiClientIdSchema()
        .optional()
        .describe(
          "@internal The typing client, as its ui_attach named it; optional, and the input runs the same with or without it.",
        ),
    }).describe(
      "@internal A change of, or Enter in, an `Input` a plugin drew for a remote surface: runs the `ui.input` chain over every hooked plugin with the element's own onInput (kind `change`) or onSubmit (kind `submit`) closure at the bottom, one at a time per plugin so typing arrives in order. A handle no Input is held under answers `{handled: false}` and nothing runs. No model turn unless the plugin asks for one.",
    ),
  ),
  UiInputResponseSchema = DoctorLazy(() =>
    u({
      handled: M().describe(
        "@internal False when no Input is held under that plugin and handle (a redraw retired it and `key`/`component`/`instance_id` did not re-resolve it, or the plugin unloaded); nothing ran.",
      ),
      element: o()
        .optional()
        .describe("@internal The `key` of the Input whose handler the input reached, when one did."),
      value: o()
        .optional()
        .describe("@internal The text the handler received: the value as the hooks above left it."),
    }).describe("@internal Whether a ui_input reached a handler, which, and with what text."),
  ),
  SDKUiSelectUiSelectMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_select"),
      plugin: o()
        .max(UI_NAME_MAX_CHARS)
        .describe("@internal The plugin whose hook drew the Select, as its `press.plugin` carried it."),
      handle: E()
        .int()
        .describe(
          "@internal The handle the Select carried (`press.handle`), naming the onSelect closure held in that plugin's environment.",
        ),
      value: o()
        .max(UI_VALUE_MAX_CHARS)
        .describe(
          "@internal The picked option's `value`, one of the Select's `options` as the tree last drew them (any other value answers `handled: false` and runs nothing); the hooks reached see it as `e.value` and may rewrite it before the closure.",
        ),
      key: o()
        .optional()
        .describe(
          "@internal The Select's own `key`, as the tree carried it: with `component` and `instance_id`, a handle a redraw just retired, or one held under another key (a tree another process drew), is re-resolved to the one Select that plugin holds under this key there.",
        ),
      component: jxn()
        .optional()
        .describe(
          "@internal The render site the Select was drawn in, as the ui_render that drew it named it; pairs with `key` for the re-resolve.",
        ),
      instance_id: o()
        .max(UI_NAME_MAX_CHARS)
        .optional()
        .describe(
          "@internal The instance the Select was drawn in (the ui_render's `instance_id`): with `key` and `component`, names the one picker among several instances that draw the same key.",
        ),
      surface: UiRemoteSurfaceSchema()
        .default("desktop")
        .describe(
          "@internal The surface the picker is on, as the ui_render that drew it named it; absent means `desktop`. The `ui.select` hooks reached see it as `e.surface`.",
        ),
      client_id: UiClientIdSchema()
        .optional()
        .describe(
          "@internal The picking client, as its ui_attach named it; optional, and the pick runs the same with or without it.",
        ),
    }).describe(
      "@internal A pick in a `Select` a plugin drew for a remote surface: runs the `ui.select` chain over every hooked plugin with the element's own onSelect closure at the bottom, one at a time per plugin. A handle no Select is held under answers `{handled: false}` and nothing runs. No model turn unless the plugin asks for one.",
    ),
  ),
  UiSelectResponseSchema = DoctorLazy(() =>
    u({
      handled: M().describe(
        "@internal False when no Select is held under that plugin and handle (a redraw retired it and `key`/`component`/`instance_id` did not re-resolve it, or the plugin unloaded), or `value` is none of its options as drawn; nothing ran.",
      ),
      element: o()
        .optional()
        .describe("@internal The `key` of the Select whose handler the pick reached, when one did."),
      value: o()
        .optional()
        .describe("@internal What the handler received: the option's value as the hooks above left it."),
    }).describe("@internal Whether a ui_select reached a handler, which, and with what value."),
  ),
  UiPaneSiteSchema = DoctorLazy(() =>
    U(["Pane", "AbovePrompt"]).describe(
      "@internal A scrolling, focusable site a remote surface draws for the hooks engine: a pane's body (`instance_id` the pane's id) or the band above the composer (`instance_id` `above-prompt`).",
    ),
  ),
  UiElementBoundsSchema = DoctorLazy(() =>
    u({
      plugin: o().max(UI_NAME_MAX_CHARS),
      key: o().max(UI_NAME_MAX_CHARS),
      top: E().int().nonnegative(),
      bottom: E().int().nonnegative(),
    }).describe(
      "@internal Where an element a plugin drew under `key` (a keyed Box, a Button, Input or Select) sits in the site's content as the surface laid it out: its first row and the row past its last, in the rows `offset` counts. What lets that plugin's `$.ui.scroll({ to: { key } })` land.",
    ),
  ),
  UI_KEYED_ELEMENTS_MAX = 512,
  SDKUiPanesUiPanesMessageSchema = DoctorLazy(() =>
    u({ subtype: T("ui_panes"), client_id: UiClientIdSchema().optional() }).describe(
      "@internal Ask for the pane roster as the engine holds it now: what a surface that places panes reads on mount, before any ui_panes push (a pane opened before the stream armed pushes nothing).",
    ),
  ),
  SDKUiPaneShowUiPaneShowMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_pane_show"),
      id: me().describe(
        "@internal The pane the person picked (a click on its tab): shown at once, the keyboard following if a pane held it. An id not open changes nothing.",
      ),
      surface: UiRemoteSurfaceSchema()
        .default("desktop")
        .describe(
          "@internal The surface the panes are on; absent means `desktop`. Names the default client when `client_id` is not given.",
        ),
      client_id: UiClientIdSchema().optional(),
    }).describe(
      "@internal The person chose which open pane the surface shows; answers the roster's `shown_id` afterwards. A ui_panes push follows when it changed.",
    ),
  ),
  UiPaneShowResponseSchema = DoctorLazy(() =>
    u({ shown_id: me().nullable() }).describe("@internal The pane shown after a ui_pane_show."),
  ),
  SDKUiPaneFocusUiPaneFocusMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_pane_focus"),
      id: me()
        .nullable()
        .describe(
          "@internal The pane the person gave the keyboard (a click into its body, honouring a focus request), or null when the keyboard went back to the composer (Escape, a click there, a refused focus request). Settles a standing focus request either way.",
        ),
      surface: UiRemoteSurfaceSchema()
        .default("desktop")
        .describe(
          "@internal The surface the panes are on; absent means `desktop`. Names the default client when `client_id` is not given.",
        ),
      client_id: UiClientIdSchema().optional(),
    }).describe(
      "@internal The keyboard moved between the composer and a pane on a remote surface; answers the roster's `focused_id` afterwards, and the pane's Pane site then holds the keyboard for `$.ui.focus`. A ui_panes push follows when it changed.",
    ),
  ),
  UiPaneFocusResponseSchema = DoctorLazy(() =>
    u({ focused_id: me().nullable() }).describe(
      "@internal The pane holding the keyboard after a ui_pane_focus.",
    ),
  ),
  SDKUiCloseUiCloseMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_close"),
      id: me().describe(
        "@internal The pane the person closed (its close control, or Escape under `close_on_escape`).",
      ),
      client_id: UiClientIdSchema().optional(),
    }).describe(
      "@internal The person's close of a pane on a remote surface: runs the `ui.close` chain with origin `person` (a hook may keep the pane open) and answers whether it closed. The surface removes the pane only on `closed: true`; the ui_panes push that follows drops it too.",
    ),
  ),
  UiCloseResponseSchema = DoctorLazy(() =>
    u({
      closed: M().describe(
        "@internal True when no pane has that id after the call: it closed, or none had it (no chain ran). False when a `ui.close` hook kept it open, or a close of it was already being decided (the ui_panes push says how that one ended).",
      ),
    }).describe("@internal Whether a ui_close closed the pane."),
  ),
  SDKUiScrollUiScrollMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_scroll"),
      component: UiPaneSiteSchema(),
      instance_id: o().max(UI_NAME_MAX_CHARS),
      offset: E()
        .int()
        .nonnegative()
        .describe(
          "@internal The first content row the window shows after the move, 0 at the top, in rows of the surface's monospace line height.",
        ),
      by: E()
        .int()
        .describe(
          "@internal The rows the move covered, signed, negative toward the top; what the `ui.scroll` hooks see as `e.by`.",
        ),
      body_rows: E().int().nonnegative().describe("@internal The rows the window shows at once."),
      content_rows: E()
        .int()
        .nonnegative()
        .describe(
          "@internal The rows the site's whole tree lays out to; the last offset is `content_rows - body_rows`.",
        ),
      pointer: u({ column: E().int(), row: E().int() })
        .optional()
        .describe(
          "@internal The body cell the wheel or trackpad was over, 0/0 at the body's top left; absent for scroll keys and the scrollbar.",
        ),
      keyed: A(UiElementBoundsSchema()).max(UI_KEYED_ELEMENTS_MAX).optional(),
      surface: UiRemoteSurfaceSchema()
        .default("desktop")
        .describe(
          "@internal The surface the site is on; absent means `desktop`. Names the default client when `client_id` is not given, so the site is that client's.",
        ),
      client_id: UiClientIdSchema().optional(),
    }).describe(
      "@internal The person scrolled a site a remote surface draws (a pane's body, the band): the engine records the layout reported and raises `ui.scroll` with origin `person` for a move of `by` rows onto `offset` (clamped to the layout; while the site follows its end, a move down is `by` rows from that end instead; and `by` rows over the engine's own window when `offset` is the last report's offset moved by `by` and the engine did not land that last report where it said); a hook may rewrite or deny it, and the answer carries the offset the surface should show. Send it throttled to the surface's frame; reports arriving while one is in flight for the instance are folded (`by` summed) into one that follows and answered alike, in order.",
    ),
  ),
  UiScrollResponseSchema = DoctorLazy(() =>
    u({
      moved: M().describe(
        "@internal False when the chain denied the move (a plugin's own scroll landed meanwhile and stays), or the instance is no open pane nor the band (`deny: 'no such site'`; nothing recorded).",
      ),
      offset: E()
        .int()
        .describe(
          "@internal The offset the engine holds for the window now, which the surface should show: when allowed, the reported offset clamped to the layout (`by` rows over the engine's own window for a move down from a followed end or a move from the row of a report it had not landed, or a hook's rewrite); the offset the engine held before the move when denied; a plugin's offset when its move landed meanwhile; the reported offset as sent for `no such site`.",
        ),
      deny: o().optional().describe("@internal Why the move was denied, when it was."),
      follow_end: M()
        .optional()
        .describe(
          "@internal Present when the site still follows its end after this report (a plugin's followed `end` move that no move took the window off: a wheel landing on the end, a denied wheel): keep the body pinned to the bottom as it grows, as after a ui_scroll push with follow_end.",
        ),
    }).describe("@internal Where a ui_scroll left the window."),
  ),
  UiElementRefSchema = DoctorLazy(() =>
    u({ plugin: o().max(UI_NAME_MAX_CHARS), key: o().max(UI_NAME_MAX_CHARS) }).describe(
      "@internal A Button, Input or Select a plugin drew, by its `press.plugin` and `props.key`.",
    ),
  ),
  SDKUiFocusUiFocusMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_focus"),
      component: UiPaneSiteSchema(),
      instance_id: o().max(UI_NAME_MAX_CHARS),
      is_held: M().describe(
        "@internal Whether the site holds the keyboard now (DOM focus is inside its container).",
      ),
      element: UiElementRefSchema()
        .nullable()
        .optional()
        .describe(
          "@internal The element that took the focus ring: one the site draws, or null for the container itself; absent reports `is_held` alone and moves nothing.",
        ),
      by: U(["person", "auto"])
        .default("person")
        .describe(
          "@internal Who moved it: the person (Tab, a click), or an `autoFocus` element taking the ring as the site mounted (`auto`, raised as that plugin's move).",
        ),
      surface: UiRemoteSurfaceSchema()
        .default("desktop")
        .describe(
          "@internal The surface the site is on; absent means `desktop`. Names the default client when `client_id` is not given.",
        ),
      client_id: UiClientIdSchema().optional(),
    }).describe(
      "@internal The keyboard moved in a site a remote surface draws: the engine records the hold and raises `ui.focus` for the element (origin `person`, or the element's plugin under `auto`); a hook may redirect it, which the answer then carries for the surface to follow.",
    ),
  ),
  UiFocusResponseSchema = DoctorLazy(() =>
    u({
      moved: M().describe("@internal False when the chain denied the move."),
      element: UiElementRefSchema()
        .nullable()
        .describe(
          "@internal The element holding the ring as the engine records it now: the reported one, a hook's redirect the surface should focus, or null on the container.",
        ),
      deny: o().optional().describe("@internal Why the move was denied, when it was."),
    }).describe("@internal Where a ui_focus left the ring."),
  ),
  UI_CLIENT_ANSWERABLE_REQUESTS = [
    "ui_copy",
    "ui_prompt_read",
    "ui_prompt_fill",
    "ui_prompt_paint",
    "ui_prompt_suggest",
    "ui_read_selection",
  ],
  UI_CLIENT_ANSWERABLE_REQUEST_COUNT = UI_CLIENT_ANSWERABLE_REQUESTS.length,
  UiClientAnswerableRequestSchema = DoctorLazy(() =>
    U(UI_CLIENT_ANSWERABLE_REQUESTS).describe(
      "@internal A request the engine may send a remote client on a plugin's behalf, which the client says it answers when it attaches.",
    ),
  ),
  UI_TEXT_MAX_CHARS = 1e6,
  SDKUiCopyUiCopyMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_copy"),
      surface: UiRemoteSurfaceSchema(),
      client_id: UiClientIdSchema(),
      plugin: o().describe("@internal Whose `$.ui.copy` it is, for the app to show or log."),
      text: o()
        .max(UI_TEXT_MAX_CHARS)
        .describe("@internal What the person pastes afterwards, verbatim, as the `ui.copy` hooks left it."),
    }).describe(
      "@internal Agent-originated: a plugin's `$.ui.copy({ text, surface })` naming a remote surface reached the bottom of the `ui.copy` chain; the app writes `text` to its clipboard and answers `{copied}`. `client_id` is the first client attached on that surface that answers `ui_copy`. Sent only to a client whose ui_attach named `ui_copy` under `answers`; unanswered within 5 s, or an unparsable answer, resolves the plugin `{isCopied: false, reason: 'no-clipboard'}`; an error-shaped reply is another client's refusal and does not settle it. Over a remote session transport it is sent only while the session service states that the owner's account alone writes to the session, an answer is taken only as a client's own write, at the floor the session's policy enforces, in the owner's own session, and a client that gives no answer in 5 s hands the request to the next attached client that named it.",
    ),
  ),
  UiCopyResponseSchema = DoctorLazy(() =>
    u({ copied: M().describe("@internal Whether the app wrote the text to its clipboard.") }).describe(
      "@internal The answer to ui_copy.",
    ),
  ),
  SDKUiPromptReadUiPromptReadMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_prompt_read"),
      surface: UiRemoteSurfaceSchema(),
      client_id: UiClientIdSchema(),
    }).describe(
      "@internal Agent-originated: `prompt.read` reached its core in a headless session (a plugin's `$.prompt.read`, or the read that completes a `$.prompt.fill`); the app answers its composer's draft and cursor. Sent only to a client whose ui_attach named `ui_prompt_read`; unanswered within 5 s, or unparsable, resolves the empty box; an error-shaped reply does not settle it. Over a remote session transport it is sent only while the session service states that the owner's account alone writes to the session, an answer is taken only as a client's own write, at the floor the session's policy enforces, in the owner's own session, and a client that gives no answer in 5 s hands the request to the next attached client that named it.",
    ),
  ),
  UiPromptReadResponseSchema = DoctorLazy(() =>
    u({
      text: o().describe("@internal The composer's whole draft."),
      cursor: E()
        .int()
        .nonnegative()
        .describe(
          "@internal The caret as a code-unit offset into `text` (0..text.length); the end when the app does not track one.",
        ),
    }).describe("@internal The answer to ui_prompt_read: the composer as it stands."),
  ),
  UiPaintRunSchema = DoctorLazy(() =>
    zodStrictObject({
      start: E()
        .int()
        .nonnegative()
        .describe("@internal Where the run starts, in UTF-16 code units into this frame's `text`."),
      end: E()
        .int()
        .describe("@internal Where the run ends, exclusive: past `start`, at most `text.length`."),
      color: o().optional().describe("@internal The text color."),
      backgroundColor: o().optional().describe("@internal The color behind the text."),
      dimColor: M().optional().describe("@internal Drawn dim."),
      bold: M().optional().describe("@internal Drawn bold."),
      italic: M().optional().describe("@internal Drawn italic."),
      underline: M().optional().describe("@internal Underlined."),
      strikethrough: M().optional().describe("@internal Struck through."),
    }).describe(
      "@internal One painted run over the text a ui_prompt_fill carries, normalized by the engine: clamped to the text, grapheme-aligned, never empty.",
    ),
  ),
  SDKUiPromptFillUiPromptFillMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_prompt_fill"),
      surface: UiRemoteSurfaceSchema(),
      client_id: UiClientIdSchema(),
      text: o()
        .max(UI_TEXT_MAX_CHARS)
        .describe("@internal The text to place, as the `prompt.fill` hooks left it."),
      mode: U(["replace", "append", "insert"]).describe(
        "@internal Where it goes: `replace` the whole draft, `append` after it, `insert` at the caret. The caret ends after the placed text unless `cursor` names where.",
      ),
      decorations: A(UiPaintRunSchema())
        .optional()
        .describe(
          "@internal Runs to paint over `text`, disjoint and ascending by `start`; the app paints them as given, with no range logic of its own. Omitted when there are none, never empty.",
        ),
      cursor: E()
        .int()
        .nonnegative()
        .optional()
        .describe(
          "@internal Where the caret stands after the write instead of after the placed text: a UTF-16 offset into the whole draft the composer then holds, whatever `mode` placed the text. The app clamps it to the end of its draft, and moves one inside a character to the start of that character. Omitted when the fill names none.",
        ),
      answers_press: o()
        .optional()
        .describe(
          "@internal The `press_id` of the press whose own handler's call made this `$.prompt.fill`, awaited by that handler or not: the engine's word, which no plugin's argument and no `prompt.fill` hook can set, change or remove. Sent only to the client whose `client_id` the press carried. Absent in every other case: a fill from a hook, a timer no press's handler set, a field or a pick; a fill from code another plugin's call reached; a fill whose text or placement a `prompt.fill` hook changed; a press whose argument a hook changed before its handler ran; a press that carried no `press_id`, or one and no `client_id`; and an answered press, once a newer press of the same plugin that carried an id is answered too. It speaks for this one write, not for the draft the text lands in. The engine checks neither the age of the id nor how often it is named: that is the host's.",
        ),
    }).describe(
      "@internal Agent-originated: `prompt.fill` reached its core in a headless session (a plugin's `$.prompt.fill`); the app places the text in its composer as the person's draft and answers `{filled}` (false while a dialog holds the keys or the composer is unavailable). Sent only to a client whose ui_attach named `ui_prompt_fill`; unanswered within 5 s, or unparsable, resolves `{isFilled: false}`; an error-shaped reply does not settle it. Over a remote session transport it is sent only while the session service states that the owner's account alone writes to the session, an answer is taken only as a client's own write, at the floor the session's policy enforces, in the owner's own session, and a client that gives no answer in 5 s hands the request to the next attached client that named it.",
    ),
  ),
  UiPromptFillResponseSchema = DoctorLazy(() =>
    u({ filled: M().describe("@internal Whether the composer now holds the text.") }).describe(
      "@internal The answer to ui_prompt_fill.",
    ),
  ),
  SDKUiPromptPaintUiPromptPaintMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_prompt_paint"),
      surface: UiRemoteSurfaceSchema(),
      client_id: UiClientIdSchema(),
      layer: o().describe(
        "@internal Whose runs these are: an opaque name, the same for every paint of one plugin. The app keeps one list of runs per layer, apart from the runs a fill or an edit answer paints, and draws those first, then the layers in the order each first painted, a later one winning per style key.",
      ),
      text: o()
        .max(UI_TEXT_MAX_CHARS)
        .optional()
        .describe(
          "@internal The draft `decorations` were computed for. The app paints only when its composer reads exactly this, and answers `{painted: false}` otherwise. Omitted, the request clears the layer whatever the composer reads.",
        ),
      decorations: A(UiPaintRunSchema())
        .optional()
        .describe(
          "@internal The layer's runs over `text`, disjoint and ascending by `start`, replacing the ones it had; the app paints them as given. Omitted when there are none, never empty.",
        ),
    }).describe(
      "@internal Agent-originated: `prompt.paint` reached its core in a headless session (a plugin's `$.prompt.paint`), or a plugin that painted was unloaded (no `text`). The app sets one layer's runs over its composer and changes nothing else: not the draft, the caret or its undo history. A change of the draft drops every layer. Answers `{painted}`. Sent only to a client whose ui_attach named `ui_prompt_paint`; unanswered within 5 s, or unparsable, resolves `{isPainted: false}`; an error-shaped reply does not settle it. Over a remote session transport it is sent only while the session service states that the owner's account alone writes to the session, an answer is taken only as a client's own write, at the floor the session's policy enforces, in the owner's own session, and a client that gives no answer in 5 s hands the request to the next attached client that named it.",
    ),
  ),
  UiPromptPaintResponseSchema = DoctorLazy(() =>
    u({
      painted: M().describe("@internal Whether the runs now stand over the draft, or the layer was cleared."),
    }).describe("@internal The answer to ui_prompt_paint."),
  ),
  SDKUiPromptSuggestUiPromptSuggestMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_prompt_suggest"),
      surface: UiRemoteSurfaceSchema(),
      client_id: UiClientIdSchema(),
      text: o()
        .max(UI_TEXT_MAX_CHARS)
        .describe(
          "@internal The suggestion to show dim in the empty composer for Tab to take, as the `prompt.suggest` hooks left it.",
        ),
    }).describe(
      "@internal Agent-originated: `prompt.suggest` reached its core in a headless session (a plugin's `$.prompt.suggest`, or the engine's own guess after a turn); the app shows the text as a placeholder the person accepts with Tab and answers `{shown}` (false while the composer holds text or a turn runs). Sent only to a client whose ui_attach named `ui_prompt_suggest`; unanswered within 5 s, or unparsable, resolves `{isShown: false}`; an error-shaped reply does not settle it. Over a remote session transport it is sent only while the session service states that the owner's account alone writes to the session, an answer is taken only as a client's own write, at the floor the session's policy enforces, in the owner's own session, and a client that gives no answer in 5 s hands the request to the next attached client that named it.",
    ),
  ),
  UiPromptSuggestResponseSchema = DoctorLazy(() =>
    u({ shown: M().describe("@internal Whether the composer now shows the suggestion.") }).describe(
      "@internal The answer to ui_prompt_suggest.",
    ),
  ),
  SDKUiReadSelectionUiReadSelectionMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_read_selection"),
      surface: UiRemoteSurfaceSchema(),
      client_id: UiClientIdSchema(),
    }).describe(
      "@internal Agent-originated: `ui.selection` reached its core in a headless session (a plugin's `$.ui.selection`); the app answers what the person has selected in its page, and keeps answering a selection its own click or key took down for as long as it sees fit (the terminal keeps one until the person's next prompt or command has run). A selection lies in one page, so every attached client whose ui_attach named `ui_read_selection` under `answers` is sent the ask at once, each under its own `client_id` and request id: the first selection to arrive that is not empty is what the plugin reads (of two windows that both hold one, the first to answer wins), an answer that arrives after that is dropped, and when every client answers nothing or stays silent the plugin reads nothing at the one bound. Sent only over the pipes of the host that spawned the process, never over the remote transport nor on a lane whose frames a service persists: the selection is the person's own text. Unanswered by all within 5 s, or unparsable, resolves the plugin `undefined`, as nothing selected does; an error-shaped reply does not settle it.",
    ),
  ),
  UiReadSelectionResponseSchema = DoctorLazy(() =>
    u({
      text: o()
        .optional()
        .describe(
          "@internal The selected text as the person sees it: what a copy would put on the clipboard. Left out, or empty, when nothing is selected.",
        ),
      instance_id: o()
        .optional()
        .describe(
          "@internal The transcript row the whole selection lies in, by the `instance_id` that row was drawn under (the engine's requestId for it). Left out when the selection spans several rows or lies outside the transcript; ignored without `text`.",
        ),
    }).describe(
      "@internal The answer to ui_read_selection: the selection, or an empty object for nothing selected.",
    ),
  ),
  UI_KEY_NAME_MAX = 32,
  UiEditKeySchema = DoctorLazy(() =>
    u({
      key: o().min(1).max(UI_KEY_NAME_MAX),
      ctrl: T(!0).optional(),
      shift: T(!0).optional(),
      meta: T(!0).optional(),
    }).describe(
      "@internal The one key that made an edit, in a `Client`'s `onKey` spelling: a special key's name (`backspace`, `left`, `return`) or the character typed (`space` for a space), each modifier present only when held. The `prompt.edit` hooks reached see it as `e.key`, as for the same key in the terminal.",
    ),
  ),
  SDKUiPromptEditUiPromptEditMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_prompt_edit"),
      text: o()
        .max(UI_TEXT_MAX_CHARS)
        .describe("@internal The Composer's whole draft after the edit, as the surface holds it."),
      cursor: E()
        .int()
        .nonnegative()
        .describe(
          "@internal The caret after the edit, in UTF-16 code units into `text`; one past the end is clamped to it.",
        ),
      key: UiEditKeySchema()
        .optional()
        .describe(
          "@internal The one key that made the edit; absent for a paste, a drop, or text that came with no single key.",
        ),
      by: U(["person", "app"])
        .default("person")
        .describe(
          "@internal Who changed the box: the person's own edit (`person`, raised as `prompt.edit`), or the app itself when it was not the person typing (`app`: a submit emptied it, a fill landed, a history recall, a draft restore), which the engine adopts as the box before the next edit without raising anything, answering the box with no runs. `app` carries no key.",
        ),
      surface: UiRemoteSurfaceSchema()
        .default("desktop")
        .describe("@internal The surface the Composer is on; absent means `desktop`."),
      client_id: UiClientIdSchema()
        .optional()
        .describe(
          "@internal The editing client, as its ui_attach named it; absent names the surface's default client.",
        ),
    }).describe(
      "@internal An edit in a remote surface's own Composer: the engine raises `prompt.edit` (origin `composer`) over the box before it (the box this client sent last, or the rewrite answered to it when the edit follows from that), as the terminal's editor does for a key, and answers what the Composer is to show. One dispatch per client at a time; of the edits that arrive meanwhile only the newest is raised, the older ones answering `superseded`, and an edit folded that way carries no key. A chain that fails answers the request's own box.",
    ),
  ),
  UiPromptEditResponseSchema = DoctorLazy(() =>
    u({
      text: o().describe(
        "@internal The draft the Composer is to show: the request's own, or a hook's rewrite of it.",
      ),
      cursor: E().int().describe("@internal The caret in `text`, clamped into it."),
      decorations: A(UiPaintRunSchema())
        .optional()
        .describe("@internal The runs to paint over `text`, disjoint and ascending; absent when none paint."),
      superseded: T(!0)
        .optional()
        .describe(
          "@internal Present when a newer edit from the same client came in first: this one was never raised, and its own box is echoed with no runs.",
        ),
    }).describe("@internal What a ui_prompt_edit's `prompt.edit` chain answered for the Composer."),
  ),
  SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema = DoctorLazy(() =>
    u({
      subtype: T("ui_prompt_autocomplete"),
      text: o()
        .max(UI_TEXT_MAX_CHARS)
        .describe("@internal The Composer's whole draft, as the surface holds it."),
      cursor: E()
        .int()
        .nonnegative()
        .describe(
          "@internal The caret, in UTF-16 code units into `text`; one past the end is clamped to it.",
        ),
      surface: UiRemoteSurfaceSchema()
        .default("desktop")
        .describe("@internal The surface the Composer is on; absent means `desktop`."),
      client_id: UiClientIdSchema()
        .optional()
        .describe(
          "@internal The asking client, as its ui_attach named it; absent names the surface's default client.",
        ),
    }).describe(
      "@internal A remote surface's own Composer asks what the plugins add to its autocomplete list: the engine raises `prompt.autocomplete` for the token that ends at the caret (the run of characters that are not whitespace), as the terminal's composer does while the person types, and answers the rows for the surface to draw beneath its own. With no token at the caret nothing is raised and no row is answered. One dispatch per client at a time; of the asks that arrive meanwhile only the newest is raised next, and every ask a newer one overtook answers `superseded` with no row. A chain that fails answers no row.",
    ),
  ),
  UiPromptAutocompleteResponseSchema = DoctorLazy(() =>
    u({
      suggestions: A(
        u({
          text: o().describe(
            "@internal What taking the row writes over the token, the caret after it; never empty.",
          ),
          label: o().optional().describe("@internal What the row shows; absent, the `text`."),
          description: o().optional().describe("@internal The dim line beside the label."),
        }),
      ).describe(
        "@internal The rows the `prompt.autocomplete` hooks answered, in the order to draw them beneath the surface's own.",
      ),
      start: E()
        .int()
        .optional()
        .describe(
          "@internal Where the token begins in `text`: a taken row replaces `text` from here to the caret. Absent when no token ends at the caret.",
        ),
      superseded: T(!0)
        .optional()
        .describe(
          "@internal Present when a newer ask from the same client overtook this one: it carries no row.",
        ),
    }).describe("@internal What a ui_prompt_autocomplete answers the Composer."),
  ),
  SDKLoopControlRequestSchema = DoctorLazy(() =>
    Ue([
      SDKCanUseToolCanUseToolMessageSchema(),
      SDKHookCallbackHookCallbackMessageSchema(),
      SDKMcpMessageMcpMessageMessageSchema(),
      SDKOauthTokenRefreshOauthTokenRefreshMessageSchema(),
      SDKHostAuthTokenRefreshHostAuthTokenRefreshMessageSchema(),
      SDKElicitationElicitationMessageSchema(),
      SDKRequestUserDialogRequestUserDialogMessageSchema(),
      SDKRemoteToolCallRemoteToolCallMessageSchema(),
      SDKRemotePlumbingCallRemotePlumbingCallMessageSchema(),
      SDKRemoteToolsProbeRemoteToolsProbeMessageSchema(),
      SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema(),
      SDKRemoteControlWorkSecretRemoteControlWorkSecretMessageSchema(),
      SDKUiCopyUiCopyMessageSchema(),
      SDKUiPromptReadUiPromptReadMessageSchema(),
      SDKUiPromptFillUiPromptFillMessageSchema(),
      SDKUiPromptPaintUiPromptPaintMessageSchema(),
      SDKUiPromptSuggestUiPromptSuggestMessageSchema(),
      SDKUiReadSelectionUiReadSelectionMessageSchema(),
    ]).describe(
      "Control requests the agent loop originates and needs a reply to \u2014 the loop\u2192client RPC slice of SDKControlRequestInner. The remaining members are client\u2192loop commands (set/get/mcp/auth/etc).",
    ),
  ),
  SDKClientControlRequestSchema = DoctorLazy(() =>
    Ue([
      SDKInterruptInterruptMessageSchema(),
      SDKInitializeInitializeMessageSchema(),
      SDKSetPermissionModeSetPermissionModeMessageSchema(),
      SDKSetModelSetModelMessageSchema(),
      SDKSetMaxThinkingTokensSetMaxThinkingTokensMessageSchema(),
      SDKRenameSessionRenameSessionMessageSchema(),
      SDKSetColorSetColorMessageSchema(),
      SDKMcpStatusMcpStatusMessageSchema(),
      SDKGetContextUsageGetContextUsageMessageSchema(),
      SDKGetSessionCostGetSessionCostMessageSchema(),
      SDKListModelsListModelsMessageSchema(),
      SDKGetUsageGetUsageMessageSchema(),
      SDKGetMemoryDialogGetMemoryDialogMessageSchema(),
      SDKGetSkillsDialogGetSkillsDialogMessageSchema(),
      SDKGetChromeDialogGetChromeDialogMessageSchema(),
      SDKGetChromeBrowsersGetChromeBrowsersMessageSchema(),
      SDKSelectChromeBrowserSelectChromeBrowserMessageSchema(),
      SDKGetSandboxDialogGetSandboxDialogMessageSchema(),
      SDKGetStatusGetStatusMessageSchema(),
      SDKExportConversationExportConversationMessageSchema(),
      SDKListCloudSessionsListCloudSessionsMessageSchema(),
      SDKGetCloudSessionGetCloudSessionMessageSchema(),
      SDKGetCloudSessionTranscriptGetCloudSessionTranscriptMessageSchema(),
      SDKGetBinaryVersionGetBinaryVersionMessageSchema(),
      SDKMcpCallMcpCallMessageSchema(),
      SDKFileSuggestionsFileSuggestionsMessageSchema(),
      SDKRewindFilesRewindFilesMessageSchema(),
      SDKCancelAsyncMessageCancelAsyncMessageMessageSchema(),
      SDKReadFileReadFileMessageSchema(),
      SDKListDirectoryListDirectoryMessageSchema(),
      SDKGetWorkspaceDiffGetWorkspaceDiffMessageSchema(),
      SDKGetPlanGetPlanMessageSchema(),
      SDKSeedReadStateSeedReadStateMessageSchema(),
      SDKMcpSetServersMcpSetServersMessageSchema(),
      SDKRegisterRepoRootRegisterRepoRootMessageSchema(),
      SDKReloadPluginsReloadPluginsMessageSchema(),
      SDKReloadSkillsReloadSkillsMessageSchema(),
      SDKReloadOutputStylesReloadOutputStylesMessageSchema(),
      SDKMcpReconnectMcpReconnectMessageSchema(),
      SDKMcpToggleMcpToggleMessageSchema(),
      SDKSetMcpPermissionModeOverrideSetMcpPermissionModeOverrideMessageSchema(),
      SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema(),
      SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema(),
      SDKSetCwdSetCwdMessageSchema(),
      SDKClaimSessionClaimSessionMessageSchema(),
      SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema(),
      SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema(),
      SDKMessageRatedMessageRatedMessageSchema(),
      SDKStopTaskStopTaskMessageSchema(),
      SDKStartShellTaskStartShellTaskMessageSchema(),
      SDKBackgroundTasksBackgroundTasksMessageSchema(),
      SDKGetTaskOutputGetTaskOutputMessageSchema(),
      SDKApplyFlagSettingsApplyFlagSettingsMessageSchema(),
      SDKGetSettingsGetSettingsMessageSchema(),
      SDKGetHooksListingGetHooksListingMessageSchema(),
      SDKUpdateSettingsUpdateSettingsMessageSchema(),
      SDKSubmitFeedbackSubmitFeedbackMessageSchema(),
      SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema(),
      SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema(),
      SDKTurnHandoffTurnHandoffMessageSchema(),
      SDKUiAttachUiAttachMessageSchema(),
      SDKUiDetachUiDetachMessageSchema(),
      SDKUiRenderUiRenderMessageSchema(),
      SDKUiPressUiPressMessageSchema(),
      SDKUiClientModuleUiClientModuleMessageSchema(),
      SDKUiClientPressUiClientPressMessageSchema(),
      SDKUiMessageUiMessageMessageSchema(),
      SDKUiClientFaultUiClientFaultMessageSchema(),
      SDKListPermissionRulesListPermissionRulesMessageSchema(),
      SDKMcpReadResourceMcpReadResourceMessageSchema(),
      SDKUiInputUiInputMessageSchema(),
      SDKUiSelectUiSelectMessageSchema(),
      SDKUiPanesUiPanesMessageSchema(),
      SDKUiPaneShowUiPaneShowMessageSchema(),
      SDKUiPaneFocusUiPaneFocusMessageSchema(),
      SDKUiCloseUiCloseMessageSchema(),
      SDKUiScrollUiScrollMessageSchema(),
      SDKUiFocusUiFocusMessageSchema(),
      SDKUiPromptEditUiPromptEditMessageSchema(),
      SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema(),
    ]).describe(
      "Control requests a client sends to drive the loop \u2014 the client\u2192loop command slice of SDKControlRequestInner. The remaining members are loop\u2192client RPCs that block on a reply (see AgentOriginatedControlRequest).",
    ),
  ),
  SDKControlRequestInnerSchema = DoctorLazy(() =>
    Ue([
      SDKInterruptInterruptMessageSchema(),
      SDKCanUseToolCanUseToolMessageSchema(),
      SDKInitializeInitializeMessageSchema(),
      SDKSetPermissionModeSetPermissionModeMessageSchema(),
      SDKSetModelSetModelMessageSchema(),
      SDKSetMaxThinkingTokensSetMaxThinkingTokensMessageSchema(),
      SDKRenameSessionRenameSessionMessageSchema(),
      SDKSetColorSetColorMessageSchema(),
      SDKMcpStatusMcpStatusMessageSchema(),
      SDKGetContextUsageGetContextUsageMessageSchema(),
      SDKGetSessionCostGetSessionCostMessageSchema(),
      SDKListModelsListModelsMessageSchema(),
      SDKGetUsageGetUsageMessageSchema(),
      SDKGetMemoryDialogGetMemoryDialogMessageSchema(),
      SDKGetSkillsDialogGetSkillsDialogMessageSchema(),
      SDKGetChromeDialogGetChromeDialogMessageSchema(),
      SDKGetChromeBrowsersGetChromeBrowsersMessageSchema(),
      SDKSelectChromeBrowserSelectChromeBrowserMessageSchema(),
      SDKGetSandboxDialogGetSandboxDialogMessageSchema(),
      SDKGetStatusGetStatusMessageSchema(),
      SDKExportConversationExportConversationMessageSchema(),
      SDKListCloudSessionsListCloudSessionsMessageSchema(),
      SDKGetCloudSessionGetCloudSessionMessageSchema(),
      SDKGetCloudSessionTranscriptGetCloudSessionTranscriptMessageSchema(),
      SDKGetBinaryVersionGetBinaryVersionMessageSchema(),
      SDKMcpCallMcpCallMessageSchema(),
      SDKFileSuggestionsFileSuggestionsMessageSchema(),
      SDKHookCallbackHookCallbackMessageSchema(),
      SDKMcpMessageMcpMessageMessageSchema(),
      SDKRewindFilesRewindFilesMessageSchema(),
      SDKCancelAsyncMessageCancelAsyncMessageMessageSchema(),
      SDKReadFileReadFileMessageSchema(),
      SDKListDirectoryListDirectoryMessageSchema(),
      SDKGetWorkspaceDiffGetWorkspaceDiffMessageSchema(),
      SDKGetPlanGetPlanMessageSchema(),
      SDKSeedReadStateSeedReadStateMessageSchema(),
      SDKMcpSetServersMcpSetServersMessageSchema(),
      SDKRegisterRepoRootRegisterRepoRootMessageSchema(),
      SDKReloadPluginsReloadPluginsMessageSchema(),
      SDKReloadSkillsReloadSkillsMessageSchema(),
      SDKReloadOutputStylesReloadOutputStylesMessageSchema(),
      SDKMcpReconnectMcpReconnectMessageSchema(),
      SDKMcpToggleMcpToggleMessageSchema(),
      SDKSetMcpPermissionModeOverrideSetMcpPermissionModeOverrideMessageSchema(),
      SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema(),
      SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema(),
      SDKSetCwdSetCwdMessageSchema(),
      SDKClaimSessionClaimSessionMessageSchema(),
      SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema(),
      SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema(),
      SDKMessageRatedMessageRatedMessageSchema(),
      SDKOauthTokenRefreshOauthTokenRefreshMessageSchema(),
      SDKHostAuthTokenRefreshHostAuthTokenRefreshMessageSchema(),
      SDKStopTaskStopTaskMessageSchema(),
      SDKStartShellTaskStartShellTaskMessageSchema(),
      SDKBackgroundTasksBackgroundTasksMessageSchema(),
      SDKGetTaskOutputGetTaskOutputMessageSchema(),
      SDKApplyFlagSettingsApplyFlagSettingsMessageSchema(),
      SDKGetSettingsGetSettingsMessageSchema(),
      SDKGetHooksListingGetHooksListingMessageSchema(),
      SDKUpdateSettingsUpdateSettingsMessageSchema(),
      SDKElicitationElicitationMessageSchema(),
      SDKRequestUserDialogRequestUserDialogMessageSchema(),
      SDKSubmitFeedbackSubmitFeedbackMessageSchema(),
      SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema(),
      SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema(),
      SDKRemoteToolCallRemoteToolCallMessageSchema(),
      SDKRemotePlumbingCallRemotePlumbingCallMessageSchema(),
      SDKRemoteToolsProbeRemoteToolsProbeMessageSchema(),
      SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema(),
      SDKUiAttachUiAttachMessageSchema(),
      SDKUiDetachUiDetachMessageSchema(),
      SDKUiRenderUiRenderMessageSchema(),
      SDKUiPressUiPressMessageSchema(),
      SDKUiClientModuleUiClientModuleMessageSchema(),
      SDKUiClientPressUiClientPressMessageSchema(),
      SDKUiMessageUiMessageMessageSchema(),
      SDKUiClientFaultUiClientFaultMessageSchema(),
      SDKRemoteControlWorkSecretRemoteControlWorkSecretMessageSchema(),
      SDKTurnHandoffTurnHandoffMessageSchema(),
      SDKListPermissionRulesListPermissionRulesMessageSchema(),
      SDKMcpReadResourceMcpReadResourceMessageSchema(),
      SDKUiInputUiInputMessageSchema(),
      SDKUiSelectUiSelectMessageSchema(),
      SDKUiPanesUiPanesMessageSchema(),
      SDKUiPaneShowUiPaneShowMessageSchema(),
      SDKUiPaneFocusUiPaneFocusMessageSchema(),
      SDKUiCloseUiCloseMessageSchema(),
      SDKUiScrollUiScrollMessageSchema(),
      SDKUiFocusUiFocusMessageSchema(),
      SDKUiPromptEditUiPromptEditMessageSchema(),
      SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema(),
      SDKUiCopyUiCopyMessageSchema(),
      SDKUiPromptReadUiPromptReadMessageSchema(),
      SDKUiPromptFillUiPromptFillMessageSchema(),
      SDKUiPromptPaintUiPromptPaintMessageSchema(),
      SDKUiPromptSuggestUiPromptSuggestMessageSchema(),
      SDKUiReadSelectionUiReadSelectionMessageSchema(),
    ]),
  );

export {
  SDKUiAttachUiAttachMessageSchema,
  UiAttachResponseSchema,
  SDKUiDetachUiDetachMessageSchema,
  UiDetachResponseSchema,
  SDKUiRenderUiRenderMessageSchema,
  UiRenderResponseSchema,
  SDKUiPressUiPressMessageSchema,
  UiPressResponseSchema,
  SDKUiClientModuleUiClientModuleMessageSchema,
  UiClientModuleResponseSchema,
  SDKUiClientPressUiClientPressMessageSchema,
  UiClientPressResponseSchema,
  SDKUiMessageUiMessageMessageSchema,
  UiMessageResponseSchema,
  SDKUiClientFaultUiClientFaultMessageSchema,
  UiClientFaultResponseSchema,
  SDKUiInputUiInputMessageSchema,
  UiInputResponseSchema,
  SDKUiSelectUiSelectMessageSchema,
  UiSelectResponseSchema,
  SDKUiPanesUiPanesMessageSchema,
  SDKUiPaneShowUiPaneShowMessageSchema,
  UiPaneShowResponseSchema,
  SDKUiPaneFocusUiPaneFocusMessageSchema,
  UiPaneFocusResponseSchema,
  SDKUiCloseUiCloseMessageSchema,
  UiCloseResponseSchema,
  SDKUiScrollUiScrollMessageSchema,
  UiScrollResponseSchema,
  SDKUiFocusUiFocusMessageSchema,
  UiFocusResponseSchema,
  SDKUiPromptEditUiPromptEditMessageSchema,
  UiPromptEditResponseSchema,
  SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema,
  UiPromptAutocompleteResponseSchema,
  SDKUiCopyUiCopyMessageSchema,
  UiCopyResponseSchema,
  SDKUiPromptReadUiPromptReadMessageSchema,
  UiPromptReadResponseSchema,
  SDKUiPromptFillUiPromptFillMessageSchema,
  UiPromptFillResponseSchema,
  SDKUiPromptPaintUiPromptPaintMessageSchema,
  UiPromptPaintResponseSchema,
  SDKUiPromptSuggestUiPromptSuggestMessageSchema,
  UiPromptSuggestResponseSchema,
  SDKUiReadSelectionUiReadSelectionMessageSchema,
  UiReadSelectionResponseSchema,
  SDKControlRequestInnerSchema,
  UiClientAnswerableRequestSchema,
};
