# 理解小组 state 过程记录（2026-11-04）

负责：`docs/handbook/state.md`（设置、全局配置、会话存储、记忆、认证、遥测）。
方法：以 `reconstructed/src/` 为准逐函数阅读，核对手册每一节的说法；必要时用 `node tools/q.mjs callers|show` 查调用关系，用 `reconstructed/symbols.jsonl` 查声明 id。2.1.88 对照只用于理解意图。

（进行中，分段写盘）

## 1. 核对方法与范围

| 模块 | 读了什么 | 对应手册章节 |
|---|---|---|
| `utils/settings/settings.js` | `buildSettingsContext`、`loadSettingsFromDisk`、`settingsMergeCustomizer`、`cacheToObject`、`getSettingsWithErrors(_2)`、`getInitialSettings(_2)`、`updateSettingsForSourceWithTransform`、`updateSettingsForSource_2`、`revokeFromLegacyLocalSettings` 入口 | 2.2、2.5 |
| `utils/settings/constants.js` | `SETTING_SOURCES`、`getEnabledSettingSources`、`parseSettingSourcesFlag`、`SETTING_SOURCES_BY_PRIORITY` | 2.1 |
| `utils/settings/settingsFileParsing.js` | `getSettingsFilePathForSource_3`、`getSettingsRootPathForSource`、`resolveLocalSettingsStoreRoot` | 2.1 |
| `utils/settings/policyTiers.js`、`policySettings.js`、`settingsSources.js` | `loadPolicySettings`、`resolvePolicySettings`、`mergeAdminPolicies`、`policyRank`、`trimmedPolicyTier`、`filterCredentialHelperKeys`、`withholdLaunchFolderKeys`、`getSettingsForSourceUncached` | 2.3 |
| `bootstrap/stateSlices.js` | `SettingsCacheStore` | 2.2 |
| `utils/plugins/pluginLoader.js` | `cachePluginSettings`（插件设置底层） | 2.2 |
| `utils/sessionStorage.js` | `ENTRY_APPEND_POLICY`、`getProject`、`Project`（`insertMessageChain`、`appendEntry`、`enqueueWrite`、`scheduleDrain`、`drainQueuesOnce`、`appendToFile`、`materializeSessionFile`）、`recordTranscript`、`recordSidechainTranscript`、`appendToTranscriptFile`、`loadSessionTranscript`、`loadSessionFile`、`getErrorsPath`、`loadTranscriptFile` | 4.2、4.3、4.4 |
| `utils/conversationRecovery.js` | `getLastSessionLog`、`findLatestResumableLog`、`loadConversationForResume` | 4.4 |
| `utils/sessionRestore.js` | `processResumedConversation` | 4.4 |
| `bootstrap/state.js` | `createRootSession`、`currentSession`、`getRootSession`、`getSessionId`、`switchSession`、`getSessionProjectDir` | 0、4 |
