/**
 * skills/bundled/claudeApiContent.ts
 *
 * 沿用旧版路径：claude-api skill 内容（SKILL_FILES 等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/claudeApiContent.ts
 * pieces: chunk-mjdtqz3w.js (2), chunk-twha5jmp.js (7), chunk-y1rdce29.js (174)
 * attribution: placement 165, layout 18
 */
import __cc_resource_0_7 from "../../../assets/plugin-eval-quickref-e95bcd1b.md.zst" with { type: "file" };
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
import __cc_resource_30 from "../../../assets/README-fee5091c.md.zst" with { type: "file" };
import __cc_resource_31 from "../../../assets/sdk-upgrade-177de4f0.md.zst" with { type: "file" };
import __cc_resource_32 from "../../../assets/streaming-ade1ca37.md.zst" with { type: "file" };
import __cc_resource_33 from "../../../assets/tool-use-4d326604.md.zst" with { type: "file" };
import __cc_resource_34 from "../../../assets/README-74802ac4.md.zst" with { type: "file" };
import __cc_resource_35 from "../../../assets/opentelemetry-y8cvd8yg.md" with { type: "text" };
import __cc_resource_36 from "../../../assets/README-qjqxhy5f.md" with { type: "text" };
import __cc_resource_37 from "../../../assets/streaming-pjtdae2j.md" with { type: "text" };
import __cc_resource_38 from "../../../assets/tool-use-4gvjkhwj.md" with { type: "text" };
import __cc_resource_39 from "../../../assets/README-9fa39165.md.zst" with { type: "file" };
import __cc_resource_40 from "../../../assets/SKILL-8ede598e.md.zst" with { type: "file" };
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
import __cc_resource_56 from "../../../assets/live-sources-402c4c07.md.zst" with { type: "file" };
import __cc_resource_57 from "../../../assets/managed-agents-api-reference-4f7ed5d8.md.zst" with { type: "file" };
import __cc_resource_58 from "../../../assets/managed-agents-client-patterns-05c93984.md.zst" with { type: "file" };
import __cc_resource_59 from "../../../assets/managed-agents-core-46842085.md.zst" with { type: "file" };
import __cc_resource_60 from "../../../assets/managed-agents-environments-c5b1b3cc.md.zst" with { type: "file" };
import __cc_resource_61 from "../../../assets/managed-agents-events-98177506.md.zst" with { type: "file" };
import __cc_resource_62 from "../../../assets/managed-agents-memory-3a172a12.md.zst" with { type: "file" };
import __cc_resource_63 from "../../../assets/managed-agents-multiagent-63f142d6.md.zst" with { type: "file" };
import __cc_resource_64 from "../../../assets/managed-agents-onboarding-0b38bb5f.md.zst" with { type: "file" };
import __cc_resource_65 from "../../../assets/managed-agents-onboarding-from-quickstart-a1bdfd07.md.zst" with { type: "file" };
import __cc_resource_66 from "../../../assets/managed-agents-onboarding-from-url-6a971c07.md.zst" with { type: "file" };
import __cc_resource_67 from "../../../assets/managed-agents-outcomes-bad5446f.md.zst" with { type: "file" };
import __cc_resource_68 from "../../../assets/managed-agents-overview-b29fb63b.md.zst" with { type: "file" };
import __cc_resource_69 from "../../../assets/managed-agents-scheduled-deployments-7c6a1a7e.md.zst" with { type: "file" };
import __cc_resource_70 from "../../../assets/managed-agents-secure-c68f6729.md.zst" with { type: "file" };
import __cc_resource_71 from "../../../assets/managed-agents-self-hosted-sandboxes-b2d3e09c.md.zst" with { type: "file" };
import __cc_resource_72 from "../../../assets/managed-agents-tools-7cc8a37b.md.zst" with { type: "file" };
import __cc_resource_73 from "../../../assets/managed-agents-webhooks-c9326ad3.md.zst" with { type: "file" };
import __cc_resource_74 from "../../../assets/message-threads-da289221.md.zst" with { type: "file" };
import __cc_resource_75 from "../../../assets/model-migration-01792ec1.md.zst" with { type: "file" };
import __cc_resource_76 from "../../../assets/models-98c76443.md.zst" with { type: "file" };
import __cc_resource_77 from "../../../assets/opentelemetry-b47b95fd.md.zst" with { type: "file" };
import __cc_resource_78 from "../../../assets/platform-availability-599e0672.md.zst" with { type: "file" };
import __cc_resource_79 from "../../../assets/preserved-thinking-migration-a3fbbf86.md.zst" with { type: "file" };
import __cc_resource_80 from "../../../assets/causes-b4ea8327.md.zst" with { type: "file" };
import __cc_resource_81 from "../../../assets/prefix_diff-69deb9d3.py.zst" with { type: "file" };
import __cc_resource_82 from "../../../assets/drop_block_probe-4e056aa7.py.zst" with { type: "file" };
import __cc_resource_83 from "../../../assets/prompt-audit-13fbfd4d.md.zst" with { type: "file" };
import __cc_resource_84 from "../../../assets/prompt-caching-d1170a77.md.zst" with { type: "file" };
import __cc_resource_85 from "../../../assets/token-counting-znjwtf00.md" with { type: "file" };
import __cc_resource_86 from "../../../assets/tool-use-concepts-a96dc911.md.zst" with { type: "file" };
import __cc_resource_87 from "../../../assets/batches-s5ra532b.md" with { type: "file" };
import __cc_resource_88 from "../../../assets/files-api-m5wzhchy.md" with { type: "file" };
import __cc_resource_89 from "../../../assets/opentelemetry-qf3594ft.md" with { type: "file" };
import __cc_resource_90 from "../../../assets/README-22740b0c.md.zst" with { type: "file" };
import __cc_resource_91 from "../../../assets/streaming-3abfaa5d.md.zst" with { type: "file" };
import __cc_resource_92 from "../../../assets/tool-use-5eeac3c5.md.zst" with { type: "file" };
import __cc_resource_93 from "../../../assets/README-c729f2c2.md.zst" with { type: "file" };
import __cc_resource_94 from "../../../assets/bug-hunter-t77r14b6.md" with { type: "file" };
import __cc_resource_95 from "../../../assets/contract-tracker-56hvtgvv.md" with { type: "file" };
import __cc_resource_96 from "../../../assets/data-analyst-mftdhs5h.md" with { type: "file" };
import __cc_resource_97 from "../../../assets/deep-researcher-kr59y5yh.md" with { type: "file" };
import __cc_resource_98 from "../../../assets/explainer-video-maker-sm29032a.md" with { type: "file" };
import __cc_resource_99 from "../../../assets/field-monitor-g66mv9dp.md" with { type: "file" };
import __cc_resource_100 from "../../../assets/incident-commander-ks44x788.md" with { type: "file" };
import __cc_resource_101 from "../../../assets/performance-tuner-6c866b59.md.zst" with { type: "file" };
import __cc_resource_102 from "../../../assets/sprint-retro-facilitator-tmga9swn.md" with { type: "file" };
import __cc_resource_103 from "../../../assets/structured-extractor-rec1wxww.md" with { type: "file" };
import __cc_resource_104 from "../../../assets/support-agent-drb7j85g.md" with { type: "file" };
import __cc_resource_105 from "../../../assets/support-to-eng-escalator-qqj4c1c7.md" with { type: "file" };
import __cc_resource_106 from "../../../assets/watchlist-scanner-kfkrzjrr.md" with { type: "file" };
import __cc_resource_0_8 from "../../../assets/claude-tag-dht2qzjm.md" with { type: "text" };
import __cc_resource_1_3 from "../../../assets/live-sources-pvws3ftv.md" with { type: "text" };
import __cc_resource_2_3 from "../../../assets/plugin-eval-8fcbd81e.md.zst" with { type: "file" };
import __cc_resource_3_2 from "../../../assets/recent-changes-g7ehqj27.md" with { type: "text" };
import __cc_resource_4 from "../../../assets/SKILL-0vb5xk0r.md" with { type: "text" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";

//@ chunk-mjdtqz3w.js:318-340 placement
var pluginEvalQuickrefPath = __cc_resource_0_7;
//@ chunk-mjdtqz3w.js:340-374 placement
/**
 * claude-api 技能附带的 plugin-eval 速查参考文本。
 */
var referencesPluginEvalQuickref = readEmbeddedTextSync(pluginEvalQuickrefPath, import.meta.dirname);
//@ chunk-y1rdce29.js:9406-9428 placement
var claudeApiBatches = __cc_resource_0;
//@ chunk-y1rdce29.js:9428-9450 placement
var claudeApiFilesApi = __cc_resource_1;
//@ chunk-y1rdce29.js:9450-9472 placement
var claudeApiOpentelemetry = __cc_resource_2;
//@ chunk-y1rdce29.js:9472-9494 placement
var readmePath = __cc_resource_3;
//@ chunk-y1rdce29.js:9494-9526 placement
var claudeApiReadme = readEmbeddedTextSync(readmePath, import.meta.dirname);
//@ chunk-y1rdce29.js:9526-9548 placement
var claudeApiStreaming = __cc_resource_4_2;
//@ chunk-y1rdce29.js:9548-9570 placement
var claudeApiToolUse = __cc_resource_5;
//@ chunk-y1rdce29.js:9570-9592 placement
var examplesPath = __cc_resource_6;
//@ chunk-y1rdce29.js:9592-9624 placement
var curlExamples = readEmbeddedTextSync(examplesPath, import.meta.dirname);
//@ chunk-y1rdce29.js:9624-9646 placement
var managedAgentsPath = __cc_resource_7;
//@ chunk-y1rdce29.js:9646-9678 placement
var curlManagedAgents = readEmbeddedTextSync(managedAgentsPath, import.meta.dirname);
//@ chunk-y1rdce29.js:9678-9700 placement
var claudeApiFilesApi2 = __cc_resource_8;
//@ chunk-y1rdce29.js:9700-9722 placement
var claudeApiOpentelemetry2 = __cc_resource_9;
//@ chunk-y1rdce29.js:9722-9745 placement
var readmePath2 = __cc_resource_10;
//@ chunk-y1rdce29.js:9745-9777 placement
var claudeApiReadme2 = readEmbeddedTextSync(readmePath2, import.meta.dirname);
//@ chunk-y1rdce29.js:9777-9800 placement
var claudeApiStreaming2 = __cc_resource_11;
//@ chunk-y1rdce29.js:9800-9823 placement
var toolUsePath = __cc_resource_12;
//@ chunk-y1rdce29.js:9823-9855 placement
var claudeApiToolUse2 = readEmbeddedTextSync(toolUsePath, import.meta.dirname);
//@ chunk-y1rdce29.js:9855-9878 placement
var readmePath3 = __cc_resource_13;
//@ chunk-y1rdce29.js:9878-9910 placement
var managedAgentsReadme = readEmbeddedTextSync(readmePath3, import.meta.dirname);
//@ chunk-y1rdce29.js:9910-9933 placement
var claudeApiFilesApi3 = __cc_resource_14;
//@ chunk-y1rdce29.js:9933-9956 placement
var claudeApiOpentelemetry3 = __cc_resource_15;
//@ chunk-y1rdce29.js:9956-9979 placement
var readmePath4 = __cc_resource_16;
//@ chunk-y1rdce29.js:9979-10011 placement
var claudeApiReadme3 = readEmbeddedTextSync(readmePath4, import.meta.dirname);
//@ chunk-y1rdce29.js:10011-10034 placement
var claudeApiStreaming3 = __cc_resource_17;
//@ chunk-y1rdce29.js:10034-10057 placement
var toolUsePath2 = __cc_resource_18;
//@ chunk-y1rdce29.js:10057-10089 placement
var claudeApiToolUse3 = readEmbeddedTextSync(toolUsePath2, import.meta.dirname);
//@ chunk-y1rdce29.js:10089-10112 placement
var readmePath5 = __cc_resource_19;
//@ chunk-y1rdce29.js:10112-10144 placement
var docText19 = readEmbeddedTextSync(readmePath5, import.meta.dirname);
//@ chunk-y1rdce29.js:10144-10167 placement
var claudeApiBatches2 = __cc_resource_20;
//@ chunk-y1rdce29.js:10167-10190 placement
var claudeApiFilesApi4 = __cc_resource_21;
//@ chunk-y1rdce29.js:10190-10213 placement
var claudeApiOpentelemetry4 = __cc_resource_22;
//@ chunk-y1rdce29.js:10213-10236 placement
var claudeApiReadme4 = __cc_resource_23;
//@ chunk-y1rdce29.js:10236-10259 placement
var claudeApiStreaming4 = __cc_resource_24;
//@ chunk-y1rdce29.js:10259-10282 placement
var toolUsePath3 = __cc_resource_25;
//@ chunk-y1rdce29.js:10282-10314 placement
var claudeApiToolUse4 = readEmbeddedTextSync(toolUsePath3, import.meta.dirname);
//@ chunk-y1rdce29.js:10314-10337 placement
var readmePath6 = __cc_resource_26;
//@ chunk-y1rdce29.js:10337-10369 placement
var managedAgentsReadme2 = readEmbeddedTextSync(readmePath6, import.meta.dirname);
//@ chunk-y1rdce29.js:10369-10392 placement
var claudeApiBatches3 = __cc_resource_27;
//@ chunk-y1rdce29.js:10392-10415 placement
var claudeApiFilesApi5 = __cc_resource_28;
//@ chunk-y1rdce29.js:10415-10438 placement
var claudeApiOpentelemetry5 = __cc_resource_29;
//@ chunk-y1rdce29.js:10438-10461 layout
var resource30 = __cc_resource_30;
//@ chunk-y1rdce29.js:10461-10493 layout
var docText30 = readEmbeddedTextSync(resource30, import.meta.dirname);
//@ chunk-y1rdce29.js:10493-10516 placement
var sdkUpgradePath = __cc_resource_31;
//@ chunk-y1rdce29.js:10516-10548 placement
var claudeApiSdkUpgrade = readEmbeddedTextSync(sdkUpgradePath, import.meta.dirname);
//@ chunk-y1rdce29.js:10548-10571 placement
var streamingPath = __cc_resource_32;
//@ chunk-y1rdce29.js:10571-10603 placement
var claudeApiStreaming5 = readEmbeddedTextSync(streamingPath, import.meta.dirname);
//@ chunk-y1rdce29.js:10603-10626 placement
var toolUsePath4 = __cc_resource_33;
//@ chunk-y1rdce29.js:10626-10658 placement
var claudeApiToolUse5 = readEmbeddedTextSync(toolUsePath4, import.meta.dirname);
//@ chunk-y1rdce29.js:10658-10681 placement
var readmePath8 = __cc_resource_34;
//@ chunk-y1rdce29.js:10681-10713 placement
var managedAgentsReadme3 = readEmbeddedTextSync(readmePath8, import.meta.dirname);
//@ chunk-y1rdce29.js:10713-10736 placement
var claudeApiOpentelemetry6 = __cc_resource_35;
//@ chunk-y1rdce29.js:10736-10759 placement
var claudeApiReadme6 = __cc_resource_36;
//@ chunk-y1rdce29.js:10759-10783 placement
var claudeApiStreaming6 = __cc_resource_37;
//@ chunk-y1rdce29.js:10783-10807 placement
var claudeApiToolUse6 = __cc_resource_38;
//@ chunk-y1rdce29.js:10807-10831 placement
var readmePath9 = __cc_resource_39;
//@ chunk-y1rdce29.js:10831-10865 placement
var managedAgentsReadme4 = readEmbeddedTextSync(readmePath9, import.meta.dirname);
//@ chunk-y1rdce29.js:10865-10889 layout
var resource40 = __cc_resource_40;
//@ chunk-y1rdce29.js:10889-10923 layout
var docText40 = readEmbeddedTextSync(resource40, import.meta.dirname);
//@ chunk-y1rdce29.js:10923-10947 placement
var adminApiPath = __cc_resource_41;
//@ chunk-y1rdce29.js:10947-10981 placement
var sharedAdminApi = readEmbeddedTextSync(adminApiPath, import.meta.dirname);
//@ chunk-y1rdce29.js:10981-11005 placement
var agentDesignPath = __cc_resource_42;
//@ chunk-y1rdce29.js:11005-11039 placement
var sharedAgentDesign = readEmbeddedTextSync(agentDesignPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11039-11063 placement
var anthropicCliPath = __cc_resource_43;
//@ chunk-y1rdce29.js:11063-11097 placement
var sharedAnthropicCli = readEmbeddedTextSync(anthropicCliPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11097-11121 placement
var apiVersionMigrationPath = __cc_resource_44;
//@ chunk-y1rdce29.js:11121-11155 placement
var sharedApiVersionMigration = readEmbeddedTextSync(apiVersionMigrationPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11155-11179 placement
var sharedClaudePlatformOnAws = __cc_resource_45;
//@ chunk-y1rdce29.js:11179-11203 placement
var costOptimizationPath = __cc_resource_46;
//@ chunk-y1rdce29.js:11203-11237 placement
var sharedCostOptimization = readEmbeddedTextSync(costOptimizationPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11237-11261 placement
var errorCodesPath = __cc_resource_47;
//@ chunk-y1rdce29.js:11261-11295 placement
var sharedErrorCodes = readEmbeddedTextSync(errorCodesPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11295-11319 placement
var buildEvalPath = __cc_resource_48;
//@ chunk-y1rdce29.js:11319-11353 placement
var evalsBuildEval = readEmbeddedTextSync(buildEvalPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11353-11377 placement
var evalAuditPath = __cc_resource_49;
//@ chunk-y1rdce29.js:11377-11411 placement
var evalsEvalAudit = readEmbeddedTextSync(evalAuditPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11411-11435 placement
var costHillclimbPath = __cc_resource_50;
//@ chunk-y1rdce29.js:11435-11469 placement
var evalsCostHillclimb = readEmbeddedTextSync(costHillclimbPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11469-11493 placement
var evalHillclimbPath = __cc_resource_51;
//@ chunk-y1rdce29.js:11493-11527 placement
var evalsEvalHillclimb = readEmbeddedTextSync(evalHillclimbPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11527-11551 layout
var resource52 = __cc_resource_52;
//@ chunk-y1rdce29.js:11551-11575 layout
var resource54 = __cc_resource_53;
//@ chunk-y1rdce29.js:11575-11599 placement
var schemaPath = __cc_resource_54;
//@ chunk-y1rdce29.js:11599-11633 placement
var reportSchema = readEmbeddedTextSync(schemaPath, import.meta.dirname);
//@ chunk-y1rdce29.js:11633-11657 placement
var googleCloudAnthropicManagedPath = __cc_resource_55;
//@ chunk-y1rdce29.js:11657-11691 placement
var sharedGoogleCloudAnthropicManaged = readEmbeddedTextSync(
  googleCloudAnthropicManagedPath,
  import.meta.dirname,
);
//@ chunk-y1rdce29.js:11691-11715 layout
var resource56 = __cc_resource_56;
//@ chunk-y1rdce29.js:11715-11749 layout
var docText56 = readEmbeddedTextSync(resource56, import.meta.dirname);
//@ chunk-y1rdce29.js:11749-11773 placement
var managedAgentsApiReferencePath = __cc_resource_57;
//@ chunk-y1rdce29.js:11773-11807 placement
var sharedManagedAgentsApiReference = readEmbeddedTextSync(
  managedAgentsApiReferencePath,
  import.meta.dirname,
);
//@ chunk-y1rdce29.js:11807-11831 placement
var managedAgentsClientPatternsPath = __cc_resource_58;
//@ chunk-y1rdce29.js:11831-11865 placement
var sharedManagedAgentsClientPatterns = readEmbeddedTextSync(
  managedAgentsClientPatternsPath,
  import.meta.dirname,
);
//@ chunk-y1rdce29.js:11865-11889 placement
var managedAgentsCorePath = __cc_resource_59;
//@ chunk-y1rdce29.js:11889-11923 placement
var sharedManagedAgentsCore = readEmbeddedTextSync(managedAgentsCorePath, import.meta.dirname);
//@ chunk-y1rdce29.js:11923-11947 placement
var managedAgentsEnvironmentsPath = __cc_resource_60;
//@ chunk-y1rdce29.js:11947-11981 placement
var sharedManagedAgentsEnvironments = readEmbeddedTextSync(
  managedAgentsEnvironmentsPath,
  import.meta.dirname,
);
//@ chunk-y1rdce29.js:11981-12005 placement
var managedAgentsEventsPath = __cc_resource_61;
//@ chunk-y1rdce29.js:12005-12039 placement
var sharedManagedAgentsEvents = readEmbeddedTextSync(managedAgentsEventsPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12039-12063 placement
var managedAgentsMemoryPath = __cc_resource_62;
//@ chunk-y1rdce29.js:12063-12097 placement
var sharedManagedAgentsMemory = readEmbeddedTextSync(managedAgentsMemoryPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12097-12121 placement
var managedAgentsMultiagentPath = __cc_resource_63;
//@ chunk-y1rdce29.js:12121-12155 placement
var sharedManagedAgentsMultiagent = readEmbeddedTextSync(managedAgentsMultiagentPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12155-12179 placement
var managedAgentsOnboardingPath = __cc_resource_64;
//@ chunk-y1rdce29.js:12179-12213 placement
var sharedManagedAgentsOnboarding = readEmbeddedTextSync(managedAgentsOnboardingPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12213-12237 layout
var resource65 = __cc_resource_65;
//@ chunk-y1rdce29.js:12237-12271 layout
var docText65 = readEmbeddedTextSync(resource65, import.meta.dirname);
//@ chunk-y1rdce29.js:12271-12295 layout
var resource66 = __cc_resource_66;
//@ chunk-y1rdce29.js:12295-12329 layout
var docText66 = readEmbeddedTextSync(resource66, import.meta.dirname);
//@ chunk-y1rdce29.js:12329-12353 placement
var managedAgentsOutcomesPath = __cc_resource_67;
//@ chunk-y1rdce29.js:12353-12387 placement
var sharedManagedAgentsOutcomes = readEmbeddedTextSync(managedAgentsOutcomesPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12387-12411 placement
var managedAgentsOverviewPath = __cc_resource_68;
//@ chunk-y1rdce29.js:12411-12445 placement
var sharedManagedAgentsOverview = readEmbeddedTextSync(managedAgentsOverviewPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12445-12469 placement
var managedAgentsScheduledDeploymentsPath = __cc_resource_69;
//@ chunk-y1rdce29.js:12469-12503 placement
var sharedManagedAgentsScheduledDeployments = readEmbeddedTextSync(
  managedAgentsScheduledDeploymentsPath,
  import.meta.dirname,
);
//@ chunk-y1rdce29.js:12503-12527 placement
var managedAgentsSecurePath = __cc_resource_70;
//@ chunk-y1rdce29.js:12527-12561 placement
var sharedManagedAgentsSecure = readEmbeddedTextSync(managedAgentsSecurePath, import.meta.dirname);
//@ chunk-y1rdce29.js:12561-12585 placement
var managedAgentsSelfHostedSandboxesPath = __cc_resource_71;
//@ chunk-y1rdce29.js:12585-12619 placement
var sharedManagedAgentsSelfHostedSandboxes = readEmbeddedTextSync(
  managedAgentsSelfHostedSandboxesPath,
  import.meta.dirname,
);
//@ chunk-y1rdce29.js:12619-12643 placement
var managedAgentsToolsPath = __cc_resource_72;
//@ chunk-y1rdce29.js:12643-12677 placement
var sharedManagedAgentsTools = readEmbeddedTextSync(managedAgentsToolsPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12677-12701 placement
var managedAgentsWebhooksPath = __cc_resource_73;
//@ chunk-y1rdce29.js:12701-12735 placement
var sharedManagedAgentsWebhooks = readEmbeddedTextSync(managedAgentsWebhooksPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12735-12759 layout
var resource74 = __cc_resource_74;
//@ chunk-y1rdce29.js:12759-12793 layout
var docText74 = readEmbeddedTextSync(resource74, import.meta.dirname);
//@ chunk-y1rdce29.js:12793-12817 placement
var modelMigrationPath = __cc_resource_75;
//@ chunk-y1rdce29.js:12817-12851 placement
var sharedModelMigration = readEmbeddedTextSync(modelMigrationPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12851-12875 placement
var modelsPath = __cc_resource_76;
//@ chunk-y1rdce29.js:12875-12909 placement
var sharedModels = readEmbeddedTextSync(modelsPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12909-12933 placement
var opentelemetryPath = __cc_resource_77;
//@ chunk-y1rdce29.js:12933-12967 placement
var sharedOpentelemetry = readEmbeddedTextSync(opentelemetryPath, import.meta.dirname);
//@ chunk-y1rdce29.js:12967-12991 layout
var resource78 = __cc_resource_78;
//@ chunk-y1rdce29.js:12991-13025 layout
var docText78 = readEmbeddedTextSync(resource78, import.meta.dirname);
//@ chunk-y1rdce29.js:13025-13049 placement
var preservedThinkingMigrationPath = __cc_resource_79;
//@ chunk-y1rdce29.js:13049-13083 placement
var sharedPreservedThinkingMigration = readEmbeddedTextSync(
  preservedThinkingMigrationPath,
  import.meta.dirname,
);
//@ chunk-y1rdce29.js:13083-13107 placement
var causesPath = __cc_resource_80;
//@ chunk-y1rdce29.js:13107-13141 placement
var preservedThinkingMigrationCauses = readEmbeddedTextSync(causesPath, import.meta.dirname);
//@ chunk-y1rdce29.js:13141-13165 placement
var prefixDiffPath = __cc_resource_81;
//@ chunk-y1rdce29.js:13165-13199 placement
var preservedThinkingMigrationPrefixDiff = readEmbeddedTextSync(prefixDiffPath, import.meta.dirname);
//@ chunk-y1rdce29.js:13199-13223 placement
var dropBlockProbePath = __cc_resource_82;
//@ chunk-y1rdce29.js:13223-13257 placement
var preservedThinkingMigrationDropBlockProbe = readEmbeddedTextSync(dropBlockProbePath, import.meta.dirname);
//@ chunk-y1rdce29.js:13257-13281 placement
var promptAuditPath = __cc_resource_83;
//@ chunk-y1rdce29.js:13281-13315 placement
var sharedPromptAudit = readEmbeddedTextSync(promptAuditPath, import.meta.dirname);
//@ chunk-y1rdce29.js:13315-13339 placement
var promptCachingPath = __cc_resource_84;
//@ chunk-y1rdce29.js:13339-13373 placement
var sharedPromptCaching = readEmbeddedTextSync(promptCachingPath, import.meta.dirname);
//@ chunk-y1rdce29.js:13373-13397 placement
var sharedTokenCounting = __cc_resource_85;
//@ chunk-y1rdce29.js:13397-13421 placement
var toolUseConceptsPath = __cc_resource_86;
//@ chunk-y1rdce29.js:13421-13455 placement
var sharedToolUseConcepts = readEmbeddedTextSync(toolUseConceptsPath, import.meta.dirname);
//@ chunk-y1rdce29.js:13455-13479 placement
var claudeApiBatches4 = __cc_resource_87;
//@ chunk-y1rdce29.js:13479-13503 placement
var claudeApiFilesApi6 = __cc_resource_88;
//@ chunk-y1rdce29.js:13503-13527 placement
var claudeApiOpentelemetry7 = __cc_resource_89;
//@ chunk-y1rdce29.js:13527-13551 layout
var resource90 = __cc_resource_90;
//@ chunk-y1rdce29.js:13551-13585 layout
var docText90 = readEmbeddedTextSync(resource90, import.meta.dirname);
//@ chunk-y1rdce29.js:13585-13609 placement
var streamingPath2 = __cc_resource_91;
//@ chunk-y1rdce29.js:13609-13643 placement
var claudeApiStreaming7 = readEmbeddedTextSync(streamingPath2, import.meta.dirname);
//@ chunk-y1rdce29.js:13643-13667 placement
var toolUsePath5 = __cc_resource_92;
//@ chunk-y1rdce29.js:13667-13701 placement
var claudeApiToolUse7 = readEmbeddedTextSync(toolUsePath5, import.meta.dirname);
//@ chunk-y1rdce29.js:13701-13725 placement
var readmePath11 = __cc_resource_93;
//@ chunk-y1rdce29.js:13725-13759 placement
var managedAgentsReadme5 = readEmbeddedTextSync(readmePath11, import.meta.dirname);
//@ chunk-y1rdce29.js:13759-13783 placement
var managedAgentsQuickstartsBugHunter = __cc_resource_94;
//@ chunk-y1rdce29.js:13783-13807 placement
var managedAgentsQuickstartsContractTracker = __cc_resource_95;
//@ chunk-y1rdce29.js:13807-13831 placement
var managedAgentsQuickstartsDataAnalyst = __cc_resource_96;
//@ chunk-y1rdce29.js:13831-13855 placement
var managedAgentsQuickstartsDeepResearcher = __cc_resource_97;
//@ chunk-y1rdce29.js:13855-13879 placement
var managedAgentsQuickstartsExplainerVideoMaker = __cc_resource_98;
//@ chunk-y1rdce29.js:13879-13903 placement
var managedAgentsQuickstartsFieldMonitor = __cc_resource_99;
//@ chunk-y1rdce29.js:13903-13928 placement
var managedAgentsQuickstartsIncidentCommander = __cc_resource_100;
//@ chunk-y1rdce29.js:13928-13953 placement
var performanceTunerPath = __cc_resource_101;
//@ chunk-y1rdce29.js:13953-13987 placement
var managedAgentsQuickstartsPerformanceTuner = readEmbeddedTextSync(
  performanceTunerPath,
  import.meta.dirname,
);
//@ chunk-y1rdce29.js:13987-14012 placement
var managedAgentsQuickstartsSprintRetroFacilitator = __cc_resource_102;
//@ chunk-y1rdce29.js:14012-14037 placement
var managedAgentsQuickstartsStructuredExtractor = __cc_resource_103;
//@ chunk-y1rdce29.js:14037-14062 placement
var managedAgentsQuickstartsSupportAgent = __cc_resource_104;
//@ chunk-y1rdce29.js:14062-14087 placement
var managedAgentsQuickstartsSupportToEngEscalator = __cc_resource_105;
//@ chunk-y1rdce29.js:14087-14112 placement
var managedAgentsQuickstartsWatchlistScanner = __cc_resource_106;
//@ chunk-y1rdce29.js:14112-14900 placement
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
//@ chunk-y1rdce29.js:14900-18836 placement
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
var SKILL_FILES_MAP = docText40;
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
  "java/managed-agents/README.md": docText19,
  "php/claude-api/README.md": claudeApiReadme4,
  "php/claude-api/batches.md": claudeApiBatches2,
  "php/claude-api/files-api.md": claudeApiFilesApi4,
  "php/claude-api/opentelemetry.md": claudeApiOpentelemetry4,
  "php/claude-api/streaming.md": claudeApiStreaming4,
  "php/claude-api/tool-use.md": claudeApiToolUse4,
  "php/managed-agents/README.md": managedAgentsReadme2,
  "python/claude-api/README.md": docText30,
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
  "shared/evals/report/runner-scaffold.mjs": resource52,
  "shared/evals/report/build-report-lite.mjs": resource54,
  "shared/evals/report/SCHEMA.md": reportSchema,
  "shared/google-cloud-anthropic-managed.md": sharedGoogleCloudAnthropicManaged,
  "shared/live-sources.md": docText56,
  "shared/managed-agents-api-reference.md": sharedManagedAgentsApiReference,
  "shared/managed-agents-client-patterns.md": sharedManagedAgentsClientPatterns,
  "shared/managed-agents-core.md": sharedManagedAgentsCore,
  "shared/managed-agents-environments.md": sharedManagedAgentsEnvironments,
  "shared/managed-agents-events.md": sharedManagedAgentsEvents,
  "shared/managed-agents-memory.md": sharedManagedAgentsMemory,
  "shared/managed-agents-multiagent.md": sharedManagedAgentsMultiagent,
  ...SKILL_FILES,
  "shared/managed-agents-onboarding.md": sharedManagedAgentsOnboarding,
  "shared/managed-agents-onboarding-from-quickstart.md": docText65,
  "shared/managed-agents-onboarding-from-url.md": docText66,
  "shared/managed-agents-outcomes.md": sharedManagedAgentsOutcomes,
  "shared/managed-agents-overview.md": sharedManagedAgentsOverview,
  "shared/managed-agents-scheduled-deployments.md": sharedManagedAgentsScheduledDeployments,
  "shared/managed-agents-secure.md": sharedManagedAgentsSecure,
  "shared/managed-agents-self-hosted-sandboxes.md": sharedManagedAgentsSelfHostedSandboxes,
  "shared/managed-agents-tools.md": sharedManagedAgentsTools,
  "shared/managed-agents-webhooks.md": sharedManagedAgentsWebhooks,
  "shared/message-threads.md": docText74,
  "shared/model-migration.md": sharedModelMigration,
  "shared/models.md": sharedModels,
  "shared/opentelemetry.md": sharedOpentelemetry,
  "shared/platform-availability.md": docText78,
  "shared/preserved-thinking-migration.md": sharedPreservedThinkingMigration,
  "shared/preserved-thinking-migration/causes.md": preservedThinkingMigrationCauses,
  "shared/preserved-thinking-migration/prefix_diff.py": preservedThinkingMigrationPrefixDiff,
  "shared/preserved-thinking-migration/drop_block_probe.py": preservedThinkingMigrationDropBlockProbe,
  "shared/prompt-audit.md": sharedPromptAudit,
  "shared/prompt-caching.md": sharedPromptCaching,
  "shared/token-counting.md": sharedTokenCounting,
  "shared/tool-use-concepts.md": sharedToolUseConcepts,
  "typescript/claude-api/README.md": docText90,
  "typescript/claude-api/batches.md": claudeApiBatches4,
  "typescript/claude-api/files-api.md": claudeApiFilesApi6,
  "typescript/claude-api/opentelemetry.md": claudeApiOpentelemetry7,
  "typescript/claude-api/streaming.md": claudeApiStreaming7,
  "typescript/claude-api/tool-use.md": claudeApiToolUse7,
  "typescript/managed-agents/README.md": managedAgentsReadme5,
};
//@ chunk-twha5jmp.js:695-717 placement
var referencesClaudeTag = __cc_resource_0_8;
//@ chunk-twha5jmp.js:717-739 placement
var referencesLiveSources = __cc_resource_1_3;
//@ chunk-twha5jmp.js:739-761 placement
var pluginEvalPath = __cc_resource_2_3;
//@ chunk-twha5jmp.js:761-793 placement
var referencesPluginEval = readEmbeddedTextSync(pluginEvalPath, import.meta.dirname);
//@ chunk-twha5jmp.js:793-815 placement
var referencesRecentChanges = __cc_resource_3_2;
//@ chunk-twha5jmp.js:815-837 placement
var skillText = __cc_resource_4;
//@ chunk-twha5jmp.js:837-1013 placement
var SKILL_PROMPT_CONTENT = skillText;
var CLAUDE_CODE_DOCS_REFERENCE_FILES = {
  "references/claude-tag.md": referencesClaudeTag,
  "references/live-sources.md": referencesLiveSources,
  "references/plugin-eval-quickref.md": referencesPluginEvalQuickref,
  "references/plugin-eval.md": referencesPluginEval,
  "references/recent-changes.md": referencesRecentChanges,
};
export {
  referencesPluginEvalQuickref,
  CLAUDE_CODE_DOCS_REFERENCE_FILES,
  SKILL_PROMPT_CONTENT,
  API_SKILL_FILES,
  SKILL_MODEL_VARS,
  SKILL_FILES_MAP,
};
