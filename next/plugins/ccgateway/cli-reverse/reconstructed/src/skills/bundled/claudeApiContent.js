/**
 * skills/bundled/claudeApiContent.ts
 *
 * 沿用旧版路径：claude-api skill 内容（SKILL_FILES 等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/claudeApiContent.ts
 * pieces: chunk-6z63wjt0.js (7), chunk-7wwf2tct.js (172), chunk-g13xw617.js (2)
 * attribution: placement 181
 */
import __cc_resource_0_2 from "../../../assets/plugin-eval-quickref-e95bcd1b.md.zst" with { type: "file" };
import __cc_resource_0 from "../../../assets/batches-azab338a.md" with { type: "text" };
import __cc_resource_1 from "../../../assets/files-api-h174sj6q.md" with { type: "text" };
import __cc_resource_2 from "../../../assets/opentelemetry-a5cc3j2q.md" with { type: "text" };
import __cc_resource_3 from "../../../assets/README-953f3461.md.zst" with { type: "file" };
import __cc_resource_4_2 from "../../../assets/streaming-sjbqqr45.md" with { type: "text" };
import __cc_resource_5 from "../../../assets/tool-use-2vgv80jh.md" with { type: "text" };
import __cc_resource_6 from "../../../assets/examples-edce50f1.md.zst" with { type: "file" };
import __cc_resource_7 from "../../../assets/managed-agents-ffd8c358.md.zst" with { type: "file" };
import __cc_resource_8 from "../../../assets/files-api-9r91z451.md" with { type: "text" };
import __cc_resource_9 from "../../../assets/opentelemetry-26ah6r5h.md" with { type: "text" };
import __cc_resource_10 from "../../../assets/README-97a573bf.md.zst" with { type: "file" };
import __cc_resource_11 from "../../../assets/streaming-z3xabcf3.md" with { type: "text" };
import __cc_resource_12 from "../../../assets/tool-use-e3278a9d.md.zst" with { type: "file" };
import __cc_resource_13 from "../../../assets/README-3e67ddbd.md.zst" with { type: "file" };
import __cc_resource_14 from "../../../assets/files-api-74k6gb9y.md" with { type: "text" };
import __cc_resource_15 from "../../../assets/opentelemetry-n5e363c1.md" with { type: "text" };
import __cc_resource_16 from "../../../assets/README-7f1026fd.md.zst" with { type: "file" };
import __cc_resource_17 from "../../../assets/streaming-jhkcqra8.md" with { type: "text" };
import __cc_resource_18 from "../../../assets/tool-use-aa5934a4.md.zst" with { type: "file" };
import __cc_resource_19 from "../../../assets/README-0a1b121e.md.zst" with { type: "file" };
import __cc_resource_20 from "../../../assets/batches-fqqffaw8.md" with { type: "text" };
import __cc_resource_21 from "../../../assets/files-api-cbspt4rc.md" with { type: "text" };
import __cc_resource_22 from "../../../assets/opentelemetry-z2ncngqw.md" with { type: "text" };
import __cc_resource_23 from "../../../assets/README-54b776b1.md" with { type: "text" };
import __cc_resource_24 from "../../../assets/streaming-s9vtwv2q.md" with { type: "text" };
import __cc_resource_25 from "../../../assets/tool-use-49b89f92.md.zst" with { type: "file" };
import __cc_resource_26 from "../../../assets/README-18458fac.md.zst" with { type: "file" };
import __cc_resource_27 from "../../../assets/batches-tmdzz8fs.md" with { type: "text" };
import __cc_resource_28 from "../../../assets/files-api-0t33d0q1.md" with { type: "text" };
import __cc_resource_29 from "../../../assets/opentelemetry-kahdw2zn.md" with { type: "text" };
import __cc_resource_30 from "../../../assets/README-9ed2461c.md.zst" with { type: "file" };
import __cc_resource_31 from "../../../assets/sdk-upgrade-177de4f0.md.zst" with { type: "file" };
import __cc_resource_32 from "../../../assets/streaming-ade1ca37.md.zst" with { type: "file" };
import __cc_resource_33 from "../../../assets/tool-use-4d326604.md.zst" with { type: "file" };
import __cc_resource_34 from "../../../assets/README-74802ac4.md.zst" with { type: "file" };
import __cc_resource_35 from "../../../assets/opentelemetry-y8cvd8yg.md" with { type: "text" };
import __cc_resource_36 from "../../../assets/README-qjqxhy5f.md" with { type: "text" };
import __cc_resource_37 from "../../../assets/streaming-pjtdae2j.md" with { type: "text" };
import __cc_resource_38 from "../../../assets/tool-use-4gvjkhwj.md" with { type: "text" };
import __cc_resource_39 from "../../../assets/README-9fa39165.md.zst" with { type: "file" };
import __cc_resource_40 from "../../../assets/SKILL-881c3ad3.md.zst" with { type: "file" };
import __cc_resource_41 from "../../../assets/admin-api-5bcdca12.md.zst" with { type: "file" };
import __cc_resource_42 from "../../../assets/agent-design-fa62971c.md.zst" with { type: "file" };
import __cc_resource_43 from "../../../assets/anthropic-cli-926ef37b.md.zst" with { type: "file" };
import __cc_resource_44 from "../../../assets/api-version-migration-bb01764e.md.zst" with { type: "file" };
import __cc_resource_45 from "../../../assets/claude-platform-on-aws-j618x3y8.md" with { type: "text" };
import __cc_resource_46 from "../../../assets/cost-optimization-8713d7eb.md.zst" with { type: "file" };
import __cc_resource_47 from "../../../assets/error-codes-1459f94b.md.zst" with { type: "file" };
import __cc_resource_48 from "../../../assets/build-eval-e9acb85b.md.zst" with { type: "file" };
import __cc_resource_49 from "../../../assets/eval-audit-d52687b9.md.zst" with { type: "file" };
import __cc_resource_50 from "../../../assets/cost-hillclimb-be195324.md.zst" with { type: "file" };
import __cc_resource_51 from "../../../assets/eval-hillclimb-643520d6.md.zst" with { type: "file" };
import __cc_resource_52 from "../../../assets/runner-scaffold-q2rf9gg9.mjs" with { type: "file" };
import __cc_resource_53 from "../../../assets/build-report-lite-jwtbvm49.mjs" with { type: "file" };
import __cc_resource_54 from "../../../assets/SCHEMA-7cf439b0.md.zst" with { type: "file" };
import __cc_resource_55 from "../../../assets/google-cloud-anthropic-managed-690a44d5.md.zst" with { type: "file" };
import __cc_resource_56 from "../../../assets/live-sources-8b84b6eb.md.zst" with { type: "file" };
import __cc_resource_57 from "../../../assets/managed-agents-api-reference-4f7ed5d8.md.zst" with { type: "file" };
import __cc_resource_58 from "../../../assets/managed-agents-client-patterns-05c93984.md.zst" with { type: "file" };
import __cc_resource_59 from "../../../assets/managed-agents-core-46842085.md.zst" with { type: "file" };
import __cc_resource_60 from "../../../assets/managed-agents-environments-c5b1b3cc.md.zst" with { type: "file" };
import __cc_resource_61 from "../../../assets/managed-agents-events-98177506.md.zst" with { type: "file" };
import __cc_resource_62 from "../../../assets/managed-agents-memory-3a172a12.md.zst" with { type: "file" };
import __cc_resource_63 from "../../../assets/managed-agents-multiagent-63f142d6.md.zst" with { type: "file" };
import __cc_resource_64 from "../../../assets/managed-agents-onboarding-0b38bb5f.md.zst" with { type: "file" };
import __cc_resource_65 from "../../../assets/managed-agents-onboarding-from-quickstart-4995fc19.md.zst" with { type: "file" };
import __cc_resource_66 from "../../../assets/managed-agents-onboarding-from-url-7fa0ab6b.md.zst" with { type: "file" };
import __cc_resource_67 from "../../../assets/managed-agents-outcomes-bad5446f.md.zst" with { type: "file" };
import __cc_resource_68 from "../../../assets/managed-agents-overview-b29fb63b.md.zst" with { type: "file" };
import __cc_resource_69 from "../../../assets/managed-agents-scheduled-deployments-7c6a1a7e.md.zst" with { type: "file" };
import __cc_resource_70 from "../../../assets/managed-agents-secure-c68f6729.md.zst" with { type: "file" };
import __cc_resource_71 from "../../../assets/managed-agents-self-hosted-sandboxes-b2d3e09c.md.zst" with { type: "file" };
import __cc_resource_72 from "../../../assets/managed-agents-tools-7cc8a37b.md.zst" with { type: "file" };
import __cc_resource_73 from "../../../assets/managed-agents-webhooks-c9326ad3.md.zst" with { type: "file" };
import __cc_resource_74 from "../../../assets/model-migration-01792ec1.md.zst" with { type: "file" };
import __cc_resource_75 from "../../../assets/models-98c76443.md.zst" with { type: "file" };
import __cc_resource_76 from "../../../assets/opentelemetry-b47b95fd.md.zst" with { type: "file" };
import __cc_resource_77 from "../../../assets/platform-availability-32040337.md.zst" with { type: "file" };
import __cc_resource_78 from "../../../assets/preserved-thinking-migration-a3fbbf86.md.zst" with { type: "file" };
import __cc_resource_79 from "../../../assets/causes-b4ea8327.md.zst" with { type: "file" };
import __cc_resource_80 from "../../../assets/prefix_diff-69deb9d3.py.zst" with { type: "file" };
import __cc_resource_81 from "../../../assets/drop_block_probe-4e056aa7.py.zst" with { type: "file" };
import __cc_resource_82 from "../../../assets/prompt-audit-13fbfd4d.md.zst" with { type: "file" };
import __cc_resource_83 from "../../../assets/prompt-caching-d1170a77.md.zst" with { type: "file" };
import __cc_resource_84 from "../../../assets/token-counting-znjwtf00.md" with { type: "file" };
import __cc_resource_85 from "../../../assets/tool-use-concepts-a96dc911.md.zst" with { type: "file" };
import __cc_resource_86 from "../../../assets/batches-s5ra532b.md" with { type: "file" };
import __cc_resource_87 from "../../../assets/files-api-m5wzhchy.md" with { type: "file" };
import __cc_resource_88 from "../../../assets/opentelemetry-qf3594ft.md" with { type: "file" };
import __cc_resource_89 from "../../../assets/README-4f0b5262.md.zst" with { type: "file" };
import __cc_resource_90 from "../../../assets/streaming-3abfaa5d.md.zst" with { type: "file" };
import __cc_resource_91 from "../../../assets/tool-use-5eeac3c5.md.zst" with { type: "file" };
import __cc_resource_92 from "../../../assets/README-c729f2c2.md.zst" with { type: "file" };
import __cc_resource_93 from "../../../assets/bug-hunter-t77r14b6.md" with { type: "file" };
import __cc_resource_94 from "../../../assets/contract-tracker-56hvtgvv.md" with { type: "file" };
import __cc_resource_95 from "../../../assets/data-analyst-mftdhs5h.md" with { type: "file" };
import __cc_resource_96 from "../../../assets/deep-researcher-kr59y5yh.md" with { type: "file" };
import __cc_resource_97 from "../../../assets/explainer-video-maker-sm29032a.md" with { type: "file" };
import __cc_resource_98 from "../../../assets/field-monitor-g66mv9dp.md" with { type: "file" };
import __cc_resource_99 from "../../../assets/incident-commander-ks44x788.md" with { type: "file" };
import __cc_resource_100 from "../../../assets/performance-tuner-6c866b59.md.zst" with { type: "file" };
import __cc_resource_101 from "../../../assets/sprint-retro-facilitator-tmga9swn.md" with { type: "file" };
import __cc_resource_102 from "../../../assets/structured-extractor-rec1wxww.md" with { type: "file" };
import __cc_resource_103 from "../../../assets/support-agent-drb7j85g.md" with { type: "file" };
import __cc_resource_104 from "../../../assets/support-to-eng-escalator-qqj4c1c7.md" with { type: "file" };
import __cc_resource_105 from "../../../assets/watchlist-scanner-kfkrzjrr.md" with { type: "file" };
import __cc_resource_0_3 from "../../../assets/claude-tag-dht2qzjm.md" with { type: "text" };
import __cc_resource_1_2 from "../../../assets/live-sources-pvws3ftv.md" with { type: "text" };
import __cc_resource_2_2 from "../../../assets/plugin-eval-8fcbd81e.md.zst" with { type: "file" };
import __cc_resource_3_2 from "../../../assets/recent-changes-g7ehqj27.md" with { type: "text" };
import __cc_resource_4 from "../../../assets/SKILL-0vb5xk0r.md" with { type: "text" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";

//@ chunk-g13xw617.js:318-340 placement
var pluginEvalQuickrefPath = __cc_resource_0_2;
//@ chunk-g13xw617.js:340-374 placement
/**
 * claude-api 技能附带的 plugin-eval 速查参考文本。
 */
var referencesPluginEvalQuickref = readEmbeddedTextSync(pluginEvalQuickrefPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:9317-9339 placement
var claudeApiBatches = __cc_resource_0;
//@ chunk-7wwf2tct.js:9339-9361 placement
var claudeApiFilesApi = __cc_resource_1;
//@ chunk-7wwf2tct.js:9361-9383 placement
var claudeApiOpentelemetry = __cc_resource_2;
//@ chunk-7wwf2tct.js:9383-9405 placement
var readmePath = __cc_resource_3;
//@ chunk-7wwf2tct.js:9405-9437 placement
var claudeApiReadme = readEmbeddedTextSync(readmePath, import.meta.dirname);
//@ chunk-7wwf2tct.js:9437-9459 placement
var claudeApiStreaming = __cc_resource_4_2;
//@ chunk-7wwf2tct.js:9459-9481 placement
var claudeApiToolUse = __cc_resource_5;
//@ chunk-7wwf2tct.js:9481-9503 placement
var examplesPath = __cc_resource_6;
//@ chunk-7wwf2tct.js:9503-9535 placement
var curlExamples = readEmbeddedTextSync(examplesPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:9535-9557 placement
var managedAgentsPath = __cc_resource_7;
//@ chunk-7wwf2tct.js:9557-9589 placement
var curlManagedAgents = readEmbeddedTextSync(managedAgentsPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:9589-9611 placement
var claudeApiFilesApi2 = __cc_resource_8;
//@ chunk-7wwf2tct.js:9611-9633 placement
var claudeApiOpentelemetry2 = __cc_resource_9;
//@ chunk-7wwf2tct.js:9633-9656 placement
var readmePath2 = __cc_resource_10;
//@ chunk-7wwf2tct.js:9656-9688 placement
var claudeApiReadme2 = readEmbeddedTextSync(readmePath2, import.meta.dirname);
//@ chunk-7wwf2tct.js:9688-9711 placement
var claudeApiStreaming2 = __cc_resource_11;
//@ chunk-7wwf2tct.js:9711-9734 placement
var toolUsePath = __cc_resource_12;
//@ chunk-7wwf2tct.js:9734-9766 placement
var claudeApiToolUse2 = readEmbeddedTextSync(toolUsePath, import.meta.dirname);
//@ chunk-7wwf2tct.js:9766-9789 placement
var readmePath3 = __cc_resource_13;
//@ chunk-7wwf2tct.js:9789-9821 placement
var managedAgentsReadme = readEmbeddedTextSync(readmePath3, import.meta.dirname);
//@ chunk-7wwf2tct.js:9821-9844 placement
var claudeApiFilesApi3 = __cc_resource_14;
//@ chunk-7wwf2tct.js:9844-9867 placement
var claudeApiOpentelemetry3 = __cc_resource_15;
//@ chunk-7wwf2tct.js:9867-9890 placement
var readmePath4 = __cc_resource_16;
//@ chunk-7wwf2tct.js:9890-9922 placement
var claudeApiReadme3 = readEmbeddedTextSync(readmePath4, import.meta.dirname);
//@ chunk-7wwf2tct.js:9922-9945 placement
var claudeApiStreaming3 = __cc_resource_17;
//@ chunk-7wwf2tct.js:9945-9968 placement
var toolUsePath2 = __cc_resource_18;
//@ chunk-7wwf2tct.js:9968-10000 placement
var claudeApiToolUse3 = readEmbeddedTextSync(toolUsePath2, import.meta.dirname);
//@ chunk-7wwf2tct.js:10000-10023 placement
var readmePath5 = __cc_resource_19;
//@ chunk-7wwf2tct.js:10023-10055 placement
var _ = readEmbeddedTextSync(readmePath5, import.meta.dirname);
//@ chunk-7wwf2tct.js:10055-10078 placement
var claudeApiBatches2 = __cc_resource_20;
//@ chunk-7wwf2tct.js:10078-10101 placement
var claudeApiFilesApi4 = __cc_resource_21;
//@ chunk-7wwf2tct.js:10101-10124 placement
var claudeApiOpentelemetry4 = __cc_resource_22;
//@ chunk-7wwf2tct.js:10124-10147 placement
var claudeApiReadme4 = __cc_resource_23;
//@ chunk-7wwf2tct.js:10147-10170 placement
var claudeApiStreaming4 = __cc_resource_24;
//@ chunk-7wwf2tct.js:10170-10193 placement
var toolUsePath3 = __cc_resource_25;
//@ chunk-7wwf2tct.js:10193-10225 placement
var claudeApiToolUse4 = readEmbeddedTextSync(toolUsePath3, import.meta.dirname);
//@ chunk-7wwf2tct.js:10225-10248 placement
var readmePath6 = __cc_resource_26;
//@ chunk-7wwf2tct.js:10248-10280 placement
var managedAgentsReadme2 = readEmbeddedTextSync(readmePath6, import.meta.dirname);
//@ chunk-7wwf2tct.js:10280-10303 placement
var claudeApiBatches3 = __cc_resource_27;
//@ chunk-7wwf2tct.js:10303-10326 placement
var claudeApiFilesApi5 = __cc_resource_28;
//@ chunk-7wwf2tct.js:10326-10349 placement
var claudeApiOpentelemetry5 = __cc_resource_29;
//@ chunk-7wwf2tct.js:10349-10372 placement
var readmePath7 = __cc_resource_30;
//@ chunk-7wwf2tct.js:10372-10404 placement
var claudeApiReadme5 = readEmbeddedTextSync(readmePath7, import.meta.dirname);
//@ chunk-7wwf2tct.js:10404-10427 placement
var sdkUpgradePath = __cc_resource_31;
//@ chunk-7wwf2tct.js:10427-10459 placement
var claudeApiSdkUpgrade = readEmbeddedTextSync(sdkUpgradePath, import.meta.dirname);
//@ chunk-7wwf2tct.js:10459-10482 placement
var streamingPath = __cc_resource_32;
//@ chunk-7wwf2tct.js:10482-10514 placement
var claudeApiStreaming5 = readEmbeddedTextSync(streamingPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:10514-10537 placement
var toolUsePath4 = __cc_resource_33;
//@ chunk-7wwf2tct.js:10537-10569 placement
var claudeApiToolUse5 = readEmbeddedTextSync(toolUsePath4, import.meta.dirname);
//@ chunk-7wwf2tct.js:10569-10592 placement
var readmePath8 = __cc_resource_34;
//@ chunk-7wwf2tct.js:10592-10624 placement
var managedAgentsReadme3 = readEmbeddedTextSync(readmePath8, import.meta.dirname);
//@ chunk-7wwf2tct.js:10624-10647 placement
var claudeApiOpentelemetry6 = __cc_resource_35;
//@ chunk-7wwf2tct.js:10647-10670 placement
var claudeApiReadme6 = __cc_resource_36;
//@ chunk-7wwf2tct.js:10670-10694 placement
var claudeApiStreaming6 = __cc_resource_37;
//@ chunk-7wwf2tct.js:10694-10718 placement
var claudeApiToolUse6 = __cc_resource_38;
//@ chunk-7wwf2tct.js:10718-10742 placement
var readmePath9 = __cc_resource_39;
//@ chunk-7wwf2tct.js:10742-10776 placement
var managedAgentsReadme4 = readEmbeddedTextSync(readmePath9, import.meta.dirname);
//@ chunk-7wwf2tct.js:10776-10800 placement
var skillPath = __cc_resource_40;
//@ chunk-7wwf2tct.js:10800-10834 placement
var skill = readEmbeddedTextSync(skillPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:10834-10858 placement
var adminApiPath = __cc_resource_41;
//@ chunk-7wwf2tct.js:10858-10892 placement
var sharedAdminApi = readEmbeddedTextSync(adminApiPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:10892-10916 placement
var agentDesignPath = __cc_resource_42;
//@ chunk-7wwf2tct.js:10916-10950 placement
var sharedAgentDesign = readEmbeddedTextSync(agentDesignPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:10950-10974 placement
var anthropicCliPath = __cc_resource_43;
//@ chunk-7wwf2tct.js:10974-11008 placement
var sharedAnthropicCli = readEmbeddedTextSync(anthropicCliPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11008-11032 placement
var apiVersionMigrationPath = __cc_resource_44;
//@ chunk-7wwf2tct.js:11032-11066 placement
var sharedApiVersionMigration = readEmbeddedTextSync(apiVersionMigrationPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11066-11090 placement
var sharedClaudePlatformOnAws = __cc_resource_45;
//@ chunk-7wwf2tct.js:11090-11114 placement
var costOptimizationPath = __cc_resource_46;
//@ chunk-7wwf2tct.js:11114-11148 placement
var sharedCostOptimization = readEmbeddedTextSync(costOptimizationPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11148-11172 placement
var errorCodesPath = __cc_resource_47;
//@ chunk-7wwf2tct.js:11172-11206 placement
var sharedErrorCodes = readEmbeddedTextSync(errorCodesPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11206-11230 placement
var buildEvalPath = __cc_resource_48;
//@ chunk-7wwf2tct.js:11230-11264 placement
var evalsBuildEval = readEmbeddedTextSync(buildEvalPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11264-11288 placement
var evalAuditPath = __cc_resource_49;
//@ chunk-7wwf2tct.js:11288-11322 placement
var evalsEvalAudit = readEmbeddedTextSync(evalAuditPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11322-11346 placement
var costHillclimbPath = __cc_resource_50;
//@ chunk-7wwf2tct.js:11346-11380 placement
var evalsCostHillclimb = readEmbeddedTextSync(costHillclimbPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11380-11404 placement
var evalHillclimbPath = __cc_resource_51;
//@ chunk-7wwf2tct.js:11404-11438 placement
var evalsEvalHillclimb = readEmbeddedTextSync(evalHillclimbPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11438-11462 placement
var reportRunnerScaffold = __cc_resource_52;
//@ chunk-7wwf2tct.js:11462-11486 placement
var reportBuildReportLite = __cc_resource_53;
//@ chunk-7wwf2tct.js:11486-11510 placement
var schemaPath = __cc_resource_54;
//@ chunk-7wwf2tct.js:11510-11544 placement
var reportSchema = readEmbeddedTextSync(schemaPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11544-11568 placement
var googleCloudAnthropicManagedPath = __cc_resource_55;
//@ chunk-7wwf2tct.js:11568-11602 placement
var sharedGoogleCloudAnthropicManaged = readEmbeddedTextSync(
  googleCloudAnthropicManagedPath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:11602-11626 placement
var liveSourcesPath = __cc_resource_56;
//@ chunk-7wwf2tct.js:11626-11660 placement
var sharedLiveSources = readEmbeddedTextSync(liveSourcesPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11660-11684 placement
var managedAgentsApiReferencePath = __cc_resource_57;
//@ chunk-7wwf2tct.js:11684-11718 placement
var sharedManagedAgentsApiReference = readEmbeddedTextSync(
  managedAgentsApiReferencePath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:11718-11742 placement
var managedAgentsClientPatternsPath = __cc_resource_58;
//@ chunk-7wwf2tct.js:11742-11776 placement
var sharedManagedAgentsClientPatterns = readEmbeddedTextSync(
  managedAgentsClientPatternsPath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:11776-11800 placement
var managedAgentsCorePath = __cc_resource_59;
//@ chunk-7wwf2tct.js:11800-11834 placement
var sharedManagedAgentsCore = readEmbeddedTextSync(managedAgentsCorePath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11834-11858 placement
var managedAgentsEnvironmentsPath = __cc_resource_60;
//@ chunk-7wwf2tct.js:11858-11892 placement
var sharedManagedAgentsEnvironments = readEmbeddedTextSync(
  managedAgentsEnvironmentsPath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:11892-11916 placement
var managedAgentsEventsPath = __cc_resource_61;
//@ chunk-7wwf2tct.js:11916-11950 placement
var sharedManagedAgentsEvents = readEmbeddedTextSync(managedAgentsEventsPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:11950-11974 placement
var managedAgentsMemoryPath = __cc_resource_62;
//@ chunk-7wwf2tct.js:11974-12008 placement
var sharedManagedAgentsMemory = readEmbeddedTextSync(managedAgentsMemoryPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12008-12032 placement
var managedAgentsMultiagentPath = __cc_resource_63;
//@ chunk-7wwf2tct.js:12032-12066 placement
var sharedManagedAgentsMultiagent = readEmbeddedTextSync(managedAgentsMultiagentPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12066-12090 placement
var managedAgentsOnboardingPath = __cc_resource_64;
//@ chunk-7wwf2tct.js:12090-12124 placement
var sharedManagedAgentsOnboarding = readEmbeddedTextSync(managedAgentsOnboardingPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12124-12148 placement
var managedAgentsOnboardingFromQuickstartPath = __cc_resource_65;
//@ chunk-7wwf2tct.js:12148-12182 placement
var sharedManagedAgentsOnboardingFromQuickstart = readEmbeddedTextSync(
  managedAgentsOnboardingFromQuickstartPath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:12182-12206 placement
var managedAgentsOnboardingFromUrlPath = __cc_resource_66;
//@ chunk-7wwf2tct.js:12206-12240 placement
var sharedManagedAgentsOnboardingFromUrl = readEmbeddedTextSync(
  managedAgentsOnboardingFromUrlPath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:12240-12264 placement
var managedAgentsOutcomesPath = __cc_resource_67;
//@ chunk-7wwf2tct.js:12264-12298 placement
var sharedManagedAgentsOutcomes = readEmbeddedTextSync(managedAgentsOutcomesPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12298-12322 placement
var managedAgentsOverviewPath = __cc_resource_68;
//@ chunk-7wwf2tct.js:12322-12356 placement
var sharedManagedAgentsOverview = readEmbeddedTextSync(managedAgentsOverviewPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12356-12380 placement
var managedAgentsScheduledDeploymentsPath = __cc_resource_69;
//@ chunk-7wwf2tct.js:12380-12414 placement
var sharedManagedAgentsScheduledDeployments = readEmbeddedTextSync(
  managedAgentsScheduledDeploymentsPath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:12414-12438 placement
var managedAgentsSecurePath = __cc_resource_70;
//@ chunk-7wwf2tct.js:12438-12472 placement
var sharedManagedAgentsSecure = readEmbeddedTextSync(managedAgentsSecurePath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12472-12496 placement
var managedAgentsSelfHostedSandboxesPath = __cc_resource_71;
//@ chunk-7wwf2tct.js:12496-12530 placement
var sharedManagedAgentsSelfHostedSandboxes = readEmbeddedTextSync(
  managedAgentsSelfHostedSandboxesPath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:12530-12554 placement
var managedAgentsToolsPath = __cc_resource_72;
//@ chunk-7wwf2tct.js:12554-12588 placement
var sharedManagedAgentsTools = readEmbeddedTextSync(managedAgentsToolsPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12588-12612 placement
var managedAgentsWebhooksPath = __cc_resource_73;
//@ chunk-7wwf2tct.js:12612-12646 placement
var sharedManagedAgentsWebhooks = readEmbeddedTextSync(managedAgentsWebhooksPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12646-12670 placement
var modelMigrationPath = __cc_resource_74;
//@ chunk-7wwf2tct.js:12670-12704 placement
var sharedModelMigration = readEmbeddedTextSync(modelMigrationPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12704-12728 placement
var modelsPath = __cc_resource_75;
//@ chunk-7wwf2tct.js:12728-12762 placement
var sharedModels = readEmbeddedTextSync(modelsPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12762-12786 placement
var opentelemetryPath = __cc_resource_76;
//@ chunk-7wwf2tct.js:12786-12820 placement
var sharedOpentelemetry = readEmbeddedTextSync(opentelemetryPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12820-12844 placement
var platformAvailabilityPath = __cc_resource_77;
//@ chunk-7wwf2tct.js:12844-12878 placement
var sharedPlatformAvailability = readEmbeddedTextSync(platformAvailabilityPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12878-12902 placement
var preservedThinkingMigrationPath = __cc_resource_78;
//@ chunk-7wwf2tct.js:12902-12936 placement
var sharedPreservedThinkingMigration = readEmbeddedTextSync(
  preservedThinkingMigrationPath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:12936-12960 placement
var causesPath = __cc_resource_79;
//@ chunk-7wwf2tct.js:12960-12994 placement
var preservedThinkingMigrationCauses = readEmbeddedTextSync(causesPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:12994-13018 placement
var prefixDiffPath = __cc_resource_80;
//@ chunk-7wwf2tct.js:13018-13052 placement
var preservedThinkingMigrationPrefixDiff = readEmbeddedTextSync(prefixDiffPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:13052-13076 placement
var dropBlockProbePath = __cc_resource_81;
//@ chunk-7wwf2tct.js:13076-13110 placement
var preservedThinkingMigrationDropBlockProbe = readEmbeddedTextSync(dropBlockProbePath, import.meta.dirname);
//@ chunk-7wwf2tct.js:13110-13134 placement
var promptAuditPath = __cc_resource_82;
//@ chunk-7wwf2tct.js:13134-13168 placement
var sharedPromptAudit = readEmbeddedTextSync(promptAuditPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:13168-13192 placement
var promptCachingPath = __cc_resource_83;
//@ chunk-7wwf2tct.js:13192-13226 placement
var sharedPromptCaching = readEmbeddedTextSync(promptCachingPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:13226-13250 placement
var sharedTokenCounting = __cc_resource_84;
//@ chunk-7wwf2tct.js:13250-13274 placement
var toolUseConceptsPath = __cc_resource_85;
//@ chunk-7wwf2tct.js:13274-13308 placement
var sharedToolUseConcepts = readEmbeddedTextSync(toolUseConceptsPath, import.meta.dirname);
//@ chunk-7wwf2tct.js:13308-13332 placement
var claudeApiBatches4 = __cc_resource_86;
//@ chunk-7wwf2tct.js:13332-13356 placement
var claudeApiFilesApi6 = __cc_resource_87;
//@ chunk-7wwf2tct.js:13356-13380 placement
var claudeApiOpentelemetry7 = __cc_resource_88;
//@ chunk-7wwf2tct.js:13380-13404 placement
var readmePath10 = __cc_resource_89;
//@ chunk-7wwf2tct.js:13404-13438 placement
var claudeApiReadme7 = readEmbeddedTextSync(readmePath10, import.meta.dirname);
//@ chunk-7wwf2tct.js:13438-13462 placement
var streamingPath2 = __cc_resource_90;
//@ chunk-7wwf2tct.js:13462-13496 placement
var claudeApiStreaming7 = readEmbeddedTextSync(streamingPath2, import.meta.dirname);
//@ chunk-7wwf2tct.js:13496-13520 placement
var toolUsePath5 = __cc_resource_91;
//@ chunk-7wwf2tct.js:13520-13554 placement
var claudeApiToolUse7 = readEmbeddedTextSync(toolUsePath5, import.meta.dirname);
//@ chunk-7wwf2tct.js:13554-13578 placement
var readmePath11 = __cc_resource_92;
//@ chunk-7wwf2tct.js:13578-13612 placement
var managedAgentsReadme5 = readEmbeddedTextSync(readmePath11, import.meta.dirname);
//@ chunk-7wwf2tct.js:13612-13636 placement
var managedAgentsQuickstartsBugHunter = __cc_resource_93;
//@ chunk-7wwf2tct.js:13636-13660 placement
var managedAgentsQuickstartsContractTracker = __cc_resource_94;
//@ chunk-7wwf2tct.js:13660-13684 placement
var managedAgentsQuickstartsDataAnalyst = __cc_resource_95;
//@ chunk-7wwf2tct.js:13684-13708 placement
var managedAgentsQuickstartsDeepResearcher = __cc_resource_96;
//@ chunk-7wwf2tct.js:13708-13732 placement
var managedAgentsQuickstartsExplainerVideoMaker = __cc_resource_97;
//@ chunk-7wwf2tct.js:13732-13756 placement
var managedAgentsQuickstartsFieldMonitor = __cc_resource_98;
//@ chunk-7wwf2tct.js:13756-13780 placement
var managedAgentsQuickstartsIncidentCommander = __cc_resource_99;
//@ chunk-7wwf2tct.js:13780-13805 placement
var performanceTunerPath = __cc_resource_100;
//@ chunk-7wwf2tct.js:13805-13839 placement
var managedAgentsQuickstartsPerformanceTuner = readEmbeddedTextSync(
  performanceTunerPath,
  import.meta.dirname,
);
//@ chunk-7wwf2tct.js:13839-13864 placement
var managedAgentsQuickstartsSprintRetroFacilitator = __cc_resource_101;
//@ chunk-7wwf2tct.js:13864-13889 placement
var managedAgentsQuickstartsStructuredExtractor = __cc_resource_102;
//@ chunk-7wwf2tct.js:13889-13914 placement
var managedAgentsQuickstartsSupportAgent = __cc_resource_103;
//@ chunk-7wwf2tct.js:13914-13939 placement
var managedAgentsQuickstartsSupportToEngEscalator = __cc_resource_104;
//@ chunk-7wwf2tct.js:13939-13964 placement
var managedAgentsQuickstartsWatchlistScanner = __cc_resource_105;
//@ chunk-7wwf2tct.js:13964-14752 placement
var SKILL_FILES = {
  "shared/managed-agents-quickstarts/bug-hunter.md": managedAgentsQuickstartsBugHunter,
  "shared/managed-agents-quickstarts/contract-tracker.md": managedAgentsQuickstartsContractTracker,
  "shared/managed-agents-quickstarts/data-analyst.md": managedAgentsQuickstartsDataAnalyst,
  "shared/managed-agents-quickstarts/deep-researcher.md": managedAgentsQuickstartsDeepResearcher,
  "shared/managed-agents-quickstarts/explainer-video-maker.md": managedAgentsQuickstartsExplainerVideoMaker,
  "shared/managed-agents-quickstarts/field-monitor.md": managedAgentsQuickstartsFieldMonitor,
  "shared/managed-agents-quickstarts/incident-commander.md": managedAgentsQuickstartsIncidentCommander,
  "shared/managed-agents-quickstarts/performance-tuner.md": managedAgentsQuickstartsPerformanceTuner,
  "shared/managed-agents-quickstarts/sprint-retro-facilitator.md":
    managedAgentsQuickstartsSprintRetroFacilitator,
  "shared/managed-agents-quickstarts/structured-extractor.md": managedAgentsQuickstartsStructuredExtractor,
  "shared/managed-agents-quickstarts/support-agent.md": managedAgentsQuickstartsSupportAgent,
  "shared/managed-agents-quickstarts/support-to-eng-escalator.md":
    managedAgentsQuickstartsSupportToEngEscalator,
  "shared/managed-agents-quickstarts/watchlist-scanner.md": managedAgentsQuickstartsWatchlistScanner,
};
//@ chunk-7wwf2tct.js:14752-18657 placement
/**
 * claude-api 技能：正文文本与「路径 → 参考文件」路由表。
 */
var SKILL_MODEL_VARS = {
  FABLE_ID: "claude-fable-5-1",
  FABLE_NAME: "Claude Fable 5.1",
  MYTHOS_ID: "claude-mythos-5-1",
  MYTHOS_NAME: "Claude Mythos 5.1",
  PREV_FABLE_ID: "claude-fable-5",
  PREV_FABLE_NAME: "Claude Fable 5",
  PREV_MYTHOS_ID: "claude-mythos-5",
  PREV_MYTHOS_NAME: "Claude Mythos 5",
  OPUS_ID: "claude-opus-5-5",
  OPUS_NAME: "Claude Opus 5.5",
  PREV_OPUS_ID: "claude-opus-5",
  PREV_OPUS_NAME: "Claude Opus 5",
  SONNET_ID: "claude-sonnet-5-5",
  SONNET_NAME: "Claude Sonnet 5.5",
  HAIKU_ID: "claude-haiku-5-5",
  HAIKU_NAME: "Claude Haiku 5.5",
  PREV_SONNET_ID: "claude-sonnet-5",
  PREV_SONNET_NAME: "Claude Sonnet 5",
};
var API_SKILL_PROMPT_TEXT = skill;
var API_SKILL_FILES = {
  "csharp/claude-api/README.md": claudeApiReadme,
  "csharp/claude-api/batches.md": claudeApiBatches,
  "csharp/claude-api/files-api.md": claudeApiFilesApi,
  "csharp/claude-api/opentelemetry.md": claudeApiOpentelemetry,
  "csharp/claude-api/streaming.md": claudeApiStreaming,
  "csharp/claude-api/tool-use.md": claudeApiToolUse,
  "curl/examples.md": curlExamples,
  "curl/managed-agents.md": curlManagedAgents,
  "go/claude-api/README.md": claudeApiReadme2,
  "go/claude-api/files-api.md": claudeApiFilesApi2,
  "go/claude-api/opentelemetry.md": claudeApiOpentelemetry2,
  "go/claude-api/streaming.md": claudeApiStreaming2,
  "go/claude-api/tool-use.md": claudeApiToolUse2,
  "go/managed-agents/README.md": managedAgentsReadme,
  "java/claude-api/README.md": claudeApiReadme3,
  "java/claude-api/files-api.md": claudeApiFilesApi3,
  "java/claude-api/opentelemetry.md": claudeApiOpentelemetry3,
  "java/claude-api/streaming.md": claudeApiStreaming3,
  "java/claude-api/tool-use.md": claudeApiToolUse3,
  "java/managed-agents/README.md": _,
  "php/claude-api/README.md": claudeApiReadme4,
  "php/claude-api/batches.md": claudeApiBatches2,
  "php/claude-api/files-api.md": claudeApiFilesApi4,
  "php/claude-api/opentelemetry.md": claudeApiOpentelemetry4,
  "php/claude-api/streaming.md": claudeApiStreaming4,
  "php/claude-api/tool-use.md": claudeApiToolUse4,
  "php/managed-agents/README.md": managedAgentsReadme2,
  "python/claude-api/README.md": claudeApiReadme5,
  "python/claude-api/batches.md": claudeApiBatches3,
  "python/claude-api/files-api.md": claudeApiFilesApi5,
  "python/claude-api/opentelemetry.md": claudeApiOpentelemetry5,
  "python/claude-api/sdk-upgrade.md": claudeApiSdkUpgrade,
  "python/claude-api/streaming.md": claudeApiStreaming5,
  "python/claude-api/tool-use.md": claudeApiToolUse5,
  "python/managed-agents/README.md": managedAgentsReadme3,
  "ruby/claude-api/README.md": claudeApiReadme6,
  "ruby/claude-api/opentelemetry.md": claudeApiOpentelemetry6,
  "ruby/claude-api/streaming.md": claudeApiStreaming6,
  "ruby/claude-api/tool-use.md": claudeApiToolUse6,
  "ruby/managed-agents/README.md": managedAgentsReadme4,
  "shared/admin-api.md": sharedAdminApi,
  "shared/agent-design.md": sharedAgentDesign,
  "shared/anthropic-cli.md": sharedAnthropicCli,
  "shared/api-version-migration.md": sharedApiVersionMigration,
  "shared/claude-platform-on-aws.md": sharedClaudePlatformOnAws,
  "shared/cost-optimization.md": sharedCostOptimization,
  "shared/error-codes.md": sharedErrorCodes,
  "shared/evals/build-eval.md": evalsBuildEval,
  "shared/evals/eval-audit.md": evalsEvalAudit,
  "shared/evals/cost-hillclimb.md": evalsCostHillclimb,
  "shared/evals/eval-hillclimb.md": evalsEvalHillclimb,
  "shared/evals/report/runner-scaffold.mjs": reportRunnerScaffold,
  "shared/evals/report/build-report-lite.mjs": reportBuildReportLite,
  "shared/evals/report/SCHEMA.md": reportSchema,
  "shared/google-cloud-anthropic-managed.md": sharedGoogleCloudAnthropicManaged,
  "shared/live-sources.md": sharedLiveSources,
  "shared/managed-agents-api-reference.md": sharedManagedAgentsApiReference,
  "shared/managed-agents-client-patterns.md": sharedManagedAgentsClientPatterns,
  "shared/managed-agents-core.md": sharedManagedAgentsCore,
  "shared/managed-agents-environments.md": sharedManagedAgentsEnvironments,
  "shared/managed-agents-events.md": sharedManagedAgentsEvents,
  "shared/managed-agents-memory.md": sharedManagedAgentsMemory,
  "shared/managed-agents-multiagent.md": sharedManagedAgentsMultiagent,
  ...SKILL_FILES,
  "shared/managed-agents-onboarding.md": sharedManagedAgentsOnboarding,
  "shared/managed-agents-onboarding-from-quickstart.md": sharedManagedAgentsOnboardingFromQuickstart,
  "shared/managed-agents-onboarding-from-url.md": sharedManagedAgentsOnboardingFromUrl,
  "shared/managed-agents-outcomes.md": sharedManagedAgentsOutcomes,
  "shared/managed-agents-overview.md": sharedManagedAgentsOverview,
  "shared/managed-agents-scheduled-deployments.md": sharedManagedAgentsScheduledDeployments,
  "shared/managed-agents-secure.md": sharedManagedAgentsSecure,
  "shared/managed-agents-self-hosted-sandboxes.md": sharedManagedAgentsSelfHostedSandboxes,
  "shared/managed-agents-tools.md": sharedManagedAgentsTools,
  "shared/managed-agents-webhooks.md": sharedManagedAgentsWebhooks,
  "shared/model-migration.md": sharedModelMigration,
  "shared/models.md": sharedModels,
  "shared/opentelemetry.md": sharedOpentelemetry,
  "shared/platform-availability.md": sharedPlatformAvailability,
  "shared/preserved-thinking-migration.md": sharedPreservedThinkingMigration,
  "shared/preserved-thinking-migration/causes.md": preservedThinkingMigrationCauses,
  "shared/preserved-thinking-migration/prefix_diff.py": preservedThinkingMigrationPrefixDiff,
  "shared/preserved-thinking-migration/drop_block_probe.py": preservedThinkingMigrationDropBlockProbe,
  "shared/prompt-audit.md": sharedPromptAudit,
  "shared/prompt-caching.md": sharedPromptCaching,
  "shared/token-counting.md": sharedTokenCounting,
  "shared/tool-use-concepts.md": sharedToolUseConcepts,
  "typescript/claude-api/README.md": claudeApiReadme7,
  "typescript/claude-api/batches.md": claudeApiBatches4,
  "typescript/claude-api/files-api.md": claudeApiFilesApi6,
  "typescript/claude-api/opentelemetry.md": claudeApiOpentelemetry7,
  "typescript/claude-api/streaming.md": claudeApiStreaming7,
  "typescript/claude-api/tool-use.md": claudeApiToolUse7,
  "typescript/managed-agents/README.md": managedAgentsReadme5,
};
//@ chunk-6z63wjt0.js:695-717 placement
var referencesClaudeTag = __cc_resource_0_3;
//@ chunk-6z63wjt0.js:717-739 placement
var referencesLiveSources = __cc_resource_1_2;
//@ chunk-6z63wjt0.js:739-761 placement
var pluginEvalPath = __cc_resource_2_2;
//@ chunk-6z63wjt0.js:761-793 placement
var referencesPluginEval = readEmbeddedTextSync(pluginEvalPath, import.meta.dirname);
//@ chunk-6z63wjt0.js:793-815 placement
var referencesRecentChanges = __cc_resource_3_2;
//@ chunk-6z63wjt0.js:815-837 placement
var skillText = __cc_resource_4;
//@ chunk-6z63wjt0.js:837-1013 placement
var SKILL_PROMPT_CONTENT = skillText;
var CLAUDE_CODE_DOCS_REFERENCE_FILES = {
  "references/claude-tag.md": referencesClaudeTag,
  "references/live-sources.md": referencesLiveSources,
  "references/plugin-eval-quickref.md": referencesPluginEvalQuickref,
  "references/plugin-eval.md": referencesPluginEval,
  "references/recent-changes.md": referencesRecentChanges,
};
export {
  API_SKILL_FILES,
  SKILL_MODEL_VARS,
  API_SKILL_PROMPT_TEXT,
  referencesPluginEvalQuickref,
  CLAUDE_CODE_DOCS_REFERENCE_FILES,
  SKILL_PROMPT_CONTENT,
};
