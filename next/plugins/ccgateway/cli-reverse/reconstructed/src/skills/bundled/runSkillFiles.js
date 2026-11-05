/**
 * skills/bundled/runSkillFiles.ts
 *
 * 2.1.316 新增：内置 run 技能的文件表
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-56ms4r6r.js (61)
 * attribution: placement 61
 */
import __cc_resource_0 from "../../../assets/plugin.json-yqejmsqd.txt" with { type: "text" };
import __cc_resource_1 from "../../../assets/onboarding-8fc5cece.md.zst" with { type: "file" };
import __cc_resource_2 from "../../../assets/ct-auth.mjs-12e61ad0.txt.zst" with { type: "file" };
import __cc_resource_3 from "../../../assets/ct.mjs-db1716e5.txt.zst" with { type: "file" };
import __cc_resource_4 from "../../../assets/ctbrowser.mjs-c343fa0d.txt.zst" with { type: "file" };
import __cc_resource_5 from "../../../assets/install-tools.mjs-mqgxnqdh.txt" with { type: "text" };
import __cc_resource_6 from "../../../assets/NOTICE-chm3rwx9.txt" with { type: "text" };
import __cc_resource_7 from "../../../assets/allow-tool.mjs-dec5a728.txt.zst" with { type: "file" };
import __cc_resource_8 from "../../../assets/config.mjs-7882be65.txt.zst" with { type: "file" };
import __cc_resource_9 from "../../../assets/discover.mjs-05fbb73b.txt.zst" with { type: "file" };
import __cc_resource_10 from "../../../assets/envreport.mjs-2a6a40b0.txt.zst" with { type: "file" };
import __cc_resource_11 from "../../../assets/fence-proxy.mjs-e706eaf6.txt.zst" with { type: "file" };
import __cc_resource_12 from "../../../assets/guard.mjs-167f6a6a.txt.zst" with { type: "file" };
import __cc_resource_13 from "../../../assets/hosts.mjs-724sr8hv.txt" with { type: "text" };
import __cc_resource_14 from "../../../assets/live-page.mjs-841e1124.txt.zst" with { type: "file" };
import __cc_resource_15 from "../../../assets/open-page.mjs-v558kpk1.txt" with { type: "text" };
import __cc_resource_16 from "../../../assets/psl-data.json-ffeefa5c.txt.zst" with { type: "file" };
import __cc_resource_17 from "../../../assets/run-tools.mjs-8a11282b.txt.zst" with { type: "file" };
import __cc_resource_18 from "../../../assets/runs.mjs-766956db.txt.zst" with { type: "file" };
import __cc_resource_19 from "../../../assets/signin.mjs-e32ba544.txt.zst" with { type: "file" };
import __cc_resource_20 from "../../../assets/tools-lock.json-2wbc4a0f.txt" with { type: "text" };
import __cc_resource_21 from "../../../assets/tools.mjs-6ad628aa.txt.zst" with { type: "file" };
import __cc_resource_22 from "../../../assets/vet.mjs-e320abbd.txt.zst" with { type: "file" };
import __cc_resource_23 from "../../../assets/playwright-mcp.mjs-4153e6ec.txt.zst" with { type: "file" };
import __cc_resource_24 from "../../../assets/stop-on-exit.mjs-da3fcb46.txt.zst" with { type: "file" };
import __cc_resource_25 from "../../../assets/tools-snapshot.json-517c5f68.txt.zst" with { type: "file" };
import __cc_resource_26 from "../../../assets/spec-format-dwmge0np.md" with { type: "text" };
import __cc_resource_27 from "../../../assets/SKILL-ecyx4ya1.md" with { type: "text" };
import __cc_resource_28 from "../../../assets/check.mjs-9esx2ea6.txt" with { type: "text" };
import __cc_resource_29 from "../../../assets/sign-in.mjs-e560d968.txt.zst" with { type: "file" };
import __cc_resource_30 from "../../../assets/SKILL-7a3ab2a6.md.zst" with { type: "file" };
import __cc_resource_31 from "../../../assets/SKILL-33067c78.md.zst" with { type: "file" };
import __cc_resource_32 from "../../../assets/SKILL-cc984d7e.md.zst" with { type: "file" };
import { __export } from "../../../runtime/bun-runtime.js";
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";

//@ chunk-56ms4r6r.js:3016-3025 placement
/**
 * run 技能模块的导出表。
 */
var runSkillExports = {};
//@ chunk-56ms4r6r.js:3025-3086 placement
__export(runSkillExports, {
  INSTALLED_FILES: () => RUN_SKILL_FILES,
  SKILL_MD: () => SKILL_KINDS,
  default: () => runSkillExports,
});
//@ chunk-56ms4r6r.js:3086-3108 placement
var claudePluginPlugin = __cc_resource_0;
//@ chunk-56ms4r6r.js:3108-3130 placement
var onboardingPath = __cc_resource_1;
//@ chunk-56ms4r6r.js:3130-3162 placement
var runOnboarding = readEmbeddedTextSync(onboardingPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3162-3184 placement
var ctAuthPath = __cc_resource_2;
//@ chunk-56ms4r6r.js:3184-3216 placement
var scriptsCtAuth = readEmbeddedTextSync(ctAuthPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3216-3238 placement
var ctPath = __cc_resource_3;
//@ chunk-56ms4r6r.js:3238-3270 placement
var scriptsCt = readEmbeddedTextSync(ctPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3270-3292 placement
var ctbrowserPath = __cc_resource_4;
//@ chunk-56ms4r6r.js:3292-3324 placement
var scriptsCtbrowser = readEmbeddedTextSync(ctbrowserPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3324-3346 placement
var scriptsInstallTools = __cc_resource_5;
//@ chunk-56ms4r6r.js:3346-3368 placement
var libNotice = __cc_resource_6;
//@ chunk-56ms4r6r.js:3368-3390 placement
var allowToolPath = __cc_resource_7;
//@ chunk-56ms4r6r.js:3390-3422 placement
var libAllowTool = readEmbeddedTextSync(allowToolPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3422-3444 placement
var configPath = __cc_resource_8;
//@ chunk-56ms4r6r.js:3444-3476 placement
var libConfig = readEmbeddedTextSync(configPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3476-3498 placement
var discoverPath = __cc_resource_9;
//@ chunk-56ms4r6r.js:3498-3530 placement
var libDiscover = readEmbeddedTextSync(discoverPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3530-3553 placement
var envreportPath = __cc_resource_10;
//@ chunk-56ms4r6r.js:3553-3585 placement
var libEnvreport = readEmbeddedTextSync(envreportPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3585-3608 placement
var fenceProxyPath = __cc_resource_11;
//@ chunk-56ms4r6r.js:3608-3640 placement
var libFenceProxy = readEmbeddedTextSync(fenceProxyPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3640-3663 placement
var guardPath = __cc_resource_12;
//@ chunk-56ms4r6r.js:3663-3695 placement
var libGuard = readEmbeddedTextSync(guardPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3695-3718 placement
var libHosts = __cc_resource_13;
//@ chunk-56ms4r6r.js:3718-3741 placement
var livePagePath = __cc_resource_14;
//@ chunk-56ms4r6r.js:3741-3773 placement
var libLivePage = readEmbeddedTextSync(livePagePath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3773-3796 placement
var libOpenPage = __cc_resource_15;
//@ chunk-56ms4r6r.js:3796-3819 placement
var pslDataPath = __cc_resource_16;
//@ chunk-56ms4r6r.js:3819-3851 placement
var libPslData = readEmbeddedTextSync(pslDataPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3851-3874 placement
var runToolsPath = __cc_resource_17;
//@ chunk-56ms4r6r.js:3874-3906 placement
var libRunTools = readEmbeddedTextSync(runToolsPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3906-3929 placement
var runsPath = __cc_resource_18;
//@ chunk-56ms4r6r.js:3929-3961 placement
var libRuns = readEmbeddedTextSync(runsPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:3961-3984 placement
var signinPath = __cc_resource_19;
//@ chunk-56ms4r6r.js:3984-4016 placement
var libSignin = readEmbeddedTextSync(signinPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:4016-4039 placement
var libToolsLock = __cc_resource_20;
//@ chunk-56ms4r6r.js:4039-4062 placement
var toolsPath = __cc_resource_21;
//@ chunk-56ms4r6r.js:4062-4094 placement
var libTools = readEmbeddedTextSync(toolsPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:4094-4117 placement
var vetPath = __cc_resource_22;
//@ chunk-56ms4r6r.js:4117-4149 placement
var libVet = readEmbeddedTextSync(vetPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:4149-4172 placement
var playwrightMcpPath = __cc_resource_23;
//@ chunk-56ms4r6r.js:4172-4204 placement
var scriptsPlaywrightMcp = readEmbeddedTextSync(playwrightMcpPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:4204-4227 placement
var stopOnExitPath = __cc_resource_24;
//@ chunk-56ms4r6r.js:4227-4259 placement
var scriptsStopOnExit = readEmbeddedTextSync(stopOnExitPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:4259-4282 placement
var toolsJson517c5f68Path = __cc_resource_25;
//@ chunk-56ms4r6r.js:4282-4314 placement
var scriptsToolsSnapshot = readEmbeddedTextSync(toolsJson517c5f68Path, import.meta.dirname);
//@ chunk-56ms4r6r.js:4314-4337 placement
var runSpecFormat = __cc_resource_26;
//@ chunk-56ms4r6r.js:4337-4360 placement
var signInSkill = __cc_resource_27;
//@ chunk-56ms4r6r.js:4360-4383 placement
var scriptsCheck = __cc_resource_28;
//@ chunk-56ms4r6r.js:4383-4406 placement
var signInPath = __cc_resource_29;
//@ chunk-56ms4r6r.js:4406-4438 placement
var scriptsSignIn = readEmbeddedTextSync(signInPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:4438-5631 placement
var RUN_SKILL_FILES = Object.freeze({
  ".claude-plugin/plugin.json": claudePluginPlugin,
  "skills/run/onboarding.md": runOnboarding,
  "skills/run/scripts/ct-auth.mjs": scriptsCtAuth,
  "skills/run/scripts/ct.mjs": scriptsCt,
  "skills/run/scripts/ctbrowser.mjs": scriptsCtbrowser,
  "skills/run/scripts/install-tools.mjs": scriptsInstallTools,
  "skills/run/scripts/lib/NOTICE": libNotice,
  "skills/run/scripts/lib/allow-tool.mjs": libAllowTool,
  "skills/run/scripts/lib/config.mjs": libConfig,
  "skills/run/scripts/lib/discover.mjs": libDiscover,
  "skills/run/scripts/lib/envreport.mjs": libEnvreport,
  "skills/run/scripts/lib/fence-proxy.mjs": libFenceProxy,
  "skills/run/scripts/lib/guard.mjs": libGuard,
  "skills/run/scripts/lib/hosts.mjs": libHosts,
  "skills/run/scripts/lib/live-page.mjs": libLivePage,
  "skills/run/scripts/lib/open-page.mjs": libOpenPage,
  "skills/run/scripts/lib/psl-data.json": libPslData,
  "skills/run/scripts/lib/run-tools.mjs": libRunTools,
  "skills/run/scripts/lib/runs.mjs": libRuns,
  "skills/run/scripts/lib/signin.mjs": libSignin,
  "skills/run/scripts/lib/tools-lock.json": libToolsLock,
  "skills/run/scripts/lib/tools.mjs": libTools,
  "skills/run/scripts/lib/vet.mjs": libVet,
  "skills/run/scripts/playwright-mcp.mjs": scriptsPlaywrightMcp,
  "skills/run/scripts/stop-on-exit.mjs": scriptsStopOnExit,
  "skills/run/scripts/tools-snapshot.json": scriptsToolsSnapshot,
  "skills/run/spec-format.md": runSpecFormat,
  "skills/run/templates/sign-in/SKILL.md": signInSkill,
  "skills/run/templates/sign-in/scripts/check.mjs": scriptsCheck,
  "skills/run/templates/sign-in/scripts/sign-in.mjs": scriptsSignIn,
});
//@ chunk-56ms4r6r.js:5631-5654 placement
var _ = __cc_resource_30;
//@ chunk-56ms4r6r.js:5654-5687 placement
var skill = readEmbeddedTextSync(_, import.meta.dirname);
//@ chunk-56ms4r6r.js:5687-5711 placement
var skillPath = __cc_resource_31;
//@ chunk-56ms4r6r.js:5711-5745 placement
var skill2 = readEmbeddedTextSync(skillPath, import.meta.dirname);
//@ chunk-56ms4r6r.js:5745-5769 placement
var skillPath2 = __cc_resource_32;
//@ chunk-56ms4r6r.js:5769-5803 placement
var skill3 = readEmbeddedTextSync(skillPath2, import.meta.dirname);
//@ chunk-56ms4r6r.js:5803-5854 placement
var SKILL_KINDS = Object.freeze({
  run: skill3,
  execute: skill2,
  draft: skill,
});
export { RUN_SKILL_FILES, SKILL_KINDS, runSkillExports };
