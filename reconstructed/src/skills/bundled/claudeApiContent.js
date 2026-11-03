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
import __cc_resource_0_2 from "../../../assets/claude-tag-dht2qzjm.md" with { type: "text" };
import __cc_resource_1_2 from "../../../assets/live-sources-pvws3ftv.md" with { type: "text" };
import __cc_resource_2_2 from "../../../assets/plugin-eval-8fcbd81e.md.zst" with { type: "file" };
import __cc_resource_3_2 from "../../../assets/recent-changes-g7ehqj27.md" with { type: "text" };
import __cc_resource_4 from "../../../assets/SKILL-0vb5xk0r.md" with { type: "text" };
import __cc_resource_0_3 from "../../../assets/plugin-eval-quickref-e95bcd1b.md.zst" with { type: "file" };
import { Et } from "../../utils/embeddedAssets.js";

//@ chunk-7wwf2tct.js:9317-9339 placement
var e_7wwf = __cc_resource_0;
//@ chunk-7wwf2tct.js:9339-9361 placement
var t_7wwf = __cc_resource_1;
//@ chunk-7wwf2tct.js:9361-9383 placement
var a_7wwf = __cc_resource_2;
//@ chunk-7wwf2tct.js:9383-9405 placement
var s_7wwf = __cc_resource_3;
//@ chunk-7wwf2tct.js:9405-9437 placement
var r = Et(s_7wwf, import.meta.dirname);
//@ chunk-7wwf2tct.js:9437-9459 placement
var o_7wwf = __cc_resource_4_2;
//@ chunk-7wwf2tct.js:9459-9481 placement
var n_7wwf = __cc_resource_5;
//@ chunk-7wwf2tct.js:9481-9503 placement
var i = __cc_resource_6;
//@ chunk-7wwf2tct.js:9503-9535 placement
var l = Et(i, import.meta.dirname);
//@ chunk-7wwf2tct.js:9535-9557 placement
var d = __cc_resource_7;
//@ chunk-7wwf2tct.js:9557-9589 placement
var c = Et(d, import.meta.dirname);
//@ chunk-7wwf2tct.js:9589-9611 placement
var p = __cc_resource_8;
//@ chunk-7wwf2tct.js:9611-9633 placement
var m = __cc_resource_9;
//@ chunk-7wwf2tct.js:9633-9656 placement
var h = __cc_resource_10;
//@ chunk-7wwf2tct.js:9656-9688 placement
var u = Et(h, import.meta.dirname);
//@ chunk-7wwf2tct.js:9688-9711 placement
var f = __cc_resource_11;
//@ chunk-7wwf2tct.js:9711-9734 placement
var g = __cc_resource_12;
//@ chunk-7wwf2tct.js:9734-9766 placement
var y = Et(g, import.meta.dirname);
//@ chunk-7wwf2tct.js:9766-9789 placement
var w = __cc_resource_13;
//@ chunk-7wwf2tct.js:9789-9821 placement
var b = Et(w, import.meta.dirname);
//@ chunk-7wwf2tct.js:9821-9844 placement
var v = __cc_resource_14;
//@ chunk-7wwf2tct.js:9844-9867 placement
var k = __cc_resource_15;
//@ chunk-7wwf2tct.js:9867-9890 placement
var S = __cc_resource_16;
//@ chunk-7wwf2tct.js:9890-9922 placement
var A = Et(S, import.meta.dirname);
//@ chunk-7wwf2tct.js:9922-9945 placement
var P = __cc_resource_17;
//@ chunk-7wwf2tct.js:9945-9968 placement
var T = __cc_resource_18;
//@ chunk-7wwf2tct.js:9968-10000 placement
var x = Et(T, import.meta.dirname);
//@ chunk-7wwf2tct.js:10000-10023 placement
var D = __cc_resource_19;
//@ chunk-7wwf2tct.js:10023-10055 placement
var _ = Et(D, import.meta.dirname);
//@ chunk-7wwf2tct.js:10055-10078 placement
var E = __cc_resource_20;
//@ chunk-7wwf2tct.js:10078-10101 placement
var I = __cc_resource_21;
//@ chunk-7wwf2tct.js:10101-10124 placement
var R = __cc_resource_22;
//@ chunk-7wwf2tct.js:10124-10147 placement
var F = __cc_resource_23;
//@ chunk-7wwf2tct.js:10147-10170 placement
var B = __cc_resource_24;
//@ chunk-7wwf2tct.js:10170-10193 placement
var H = __cc_resource_25;
//@ chunk-7wwf2tct.js:10193-10225 placement
var C = Et(H, import.meta.dirname);
//@ chunk-7wwf2tct.js:10225-10248 placement
var N = __cc_resource_26;
//@ chunk-7wwf2tct.js:10248-10280 placement
var O = Et(N, import.meta.dirname);
//@ chunk-7wwf2tct.js:10280-10303 placement
var j = __cc_resource_27;
//@ chunk-7wwf2tct.js:10303-10326 placement
var M = __cc_resource_28;
//@ chunk-7wwf2tct.js:10326-10349 placement
var q = __cc_resource_29;
//@ chunk-7wwf2tct.js:10349-10372 placement
var L = __cc_resource_30;
//@ chunk-7wwf2tct.js:10372-10404 placement
var J = Et(L, import.meta.dirname);
//@ chunk-7wwf2tct.js:10404-10427 placement
var Q = __cc_resource_31;
//@ chunk-7wwf2tct.js:10427-10459 placement
var V = Et(Q, import.meta.dirname);
//@ chunk-7wwf2tct.js:10459-10482 placement
var W = __cc_resource_32;
//@ chunk-7wwf2tct.js:10482-10514 placement
var Z = Et(W, import.meta.dirname);
//@ chunk-7wwf2tct.js:10514-10537 placement
var z = __cc_resource_33;
//@ chunk-7wwf2tct.js:10537-10569 placement
var K = Et(z, import.meta.dirname);
//@ chunk-7wwf2tct.js:10569-10592 placement
var U = __cc_resource_34;
//@ chunk-7wwf2tct.js:10592-10624 placement
var X = Et(U, import.meta.dirname);
//@ chunk-7wwf2tct.js:10624-10647 placement
var G = __cc_resource_35;
//@ chunk-7wwf2tct.js:10647-10670 placement
var Y = __cc_resource_36;
//@ chunk-7wwf2tct.js:10670-10694 placement
var ee = __cc_resource_37;
//@ chunk-7wwf2tct.js:10694-10718 placement
var te = __cc_resource_38;
//@ chunk-7wwf2tct.js:10718-10742 placement
var ae = __cc_resource_39;
//@ chunk-7wwf2tct.js:10742-10776 placement
var se = Et(ae, import.meta.dirname);
//@ chunk-7wwf2tct.js:10776-10800 placement
var re = __cc_resource_40;
//@ chunk-7wwf2tct.js:10800-10834 placement
var oe = Et(re, import.meta.dirname);
//@ chunk-7wwf2tct.js:10834-10858 placement
var ne = __cc_resource_41;
//@ chunk-7wwf2tct.js:10858-10892 placement
var ie = Et(ne, import.meta.dirname);
//@ chunk-7wwf2tct.js:10892-10916 placement
var le = __cc_resource_42;
//@ chunk-7wwf2tct.js:10916-10950 placement
var de = Et(le, import.meta.dirname);
//@ chunk-7wwf2tct.js:10950-10974 placement
var ce = __cc_resource_43;
//@ chunk-7wwf2tct.js:10974-11008 placement
var pe = Et(ce, import.meta.dirname);
//@ chunk-7wwf2tct.js:11008-11032 placement
var me = __cc_resource_44;
//@ chunk-7wwf2tct.js:11032-11066 placement
var he = Et(me, import.meta.dirname);
//@ chunk-7wwf2tct.js:11066-11090 placement
var ue = __cc_resource_45;
//@ chunk-7wwf2tct.js:11090-11114 placement
var fe = __cc_resource_46;
//@ chunk-7wwf2tct.js:11114-11148 placement
var ge = Et(fe, import.meta.dirname);
//@ chunk-7wwf2tct.js:11148-11172 placement
var ye = __cc_resource_47;
//@ chunk-7wwf2tct.js:11172-11206 placement
var we = Et(ye, import.meta.dirname);
//@ chunk-7wwf2tct.js:11206-11230 placement
var be = __cc_resource_48;
//@ chunk-7wwf2tct.js:11230-11264 placement
var ve = Et(be, import.meta.dirname);
//@ chunk-7wwf2tct.js:11264-11288 placement
var ke = __cc_resource_49;
//@ chunk-7wwf2tct.js:11288-11322 placement
var Se = Et(ke, import.meta.dirname);
//@ chunk-7wwf2tct.js:11322-11346 placement
var Ae = __cc_resource_50;
//@ chunk-7wwf2tct.js:11346-11380 placement
var Pe = Et(Ae, import.meta.dirname);
//@ chunk-7wwf2tct.js:11380-11404 placement
var Te = __cc_resource_51;
//@ chunk-7wwf2tct.js:11404-11438 placement
var xe = Et(Te, import.meta.dirname);
//@ chunk-7wwf2tct.js:11438-11462 placement
var De = __cc_resource_52;
//@ chunk-7wwf2tct.js:11462-11486 placement
var _e = __cc_resource_53;
//@ chunk-7wwf2tct.js:11486-11510 placement
var Ee = __cc_resource_54;
//@ chunk-7wwf2tct.js:11510-11544 placement
var Ie = Et(Ee, import.meta.dirname);
//@ chunk-7wwf2tct.js:11544-11568 placement
var $e = __cc_resource_55;
//@ chunk-7wwf2tct.js:11568-11602 placement
var Re = Et($e, import.meta.dirname);
//@ chunk-7wwf2tct.js:11602-11626 placement
var Fe = __cc_resource_56;
//@ chunk-7wwf2tct.js:11626-11660 placement
var He = Et(Fe, import.meta.dirname);
//@ chunk-7wwf2tct.js:11660-11684 placement
var Ce = __cc_resource_57;
//@ chunk-7wwf2tct.js:11684-11718 placement
var Ne = Et(Ce, import.meta.dirname);
//@ chunk-7wwf2tct.js:11718-11742 placement
var Oe = __cc_resource_58;
//@ chunk-7wwf2tct.js:11742-11776 placement
var je = Et(Oe, import.meta.dirname);
//@ chunk-7wwf2tct.js:11776-11800 placement
var Me = __cc_resource_59;
//@ chunk-7wwf2tct.js:11800-11834 placement
var qe = Et(Me, import.meta.dirname);
//@ chunk-7wwf2tct.js:11834-11858 placement
var Le = __cc_resource_60;
//@ chunk-7wwf2tct.js:11858-11892 placement
var Je = Et(Le, import.meta.dirname);
//@ chunk-7wwf2tct.js:11892-11916 placement
var Qe = __cc_resource_61;
//@ chunk-7wwf2tct.js:11916-11950 placement
var Ve = Et(Qe, import.meta.dirname);
//@ chunk-7wwf2tct.js:11950-11974 placement
var We = __cc_resource_62;
//@ chunk-7wwf2tct.js:11974-12008 placement
var Ze = Et(We, import.meta.dirname);
//@ chunk-7wwf2tct.js:12008-12032 placement
var ze = __cc_resource_63;
//@ chunk-7wwf2tct.js:12032-12066 placement
var Ke = Et(ze, import.meta.dirname);
//@ chunk-7wwf2tct.js:12066-12090 placement
var Ue = __cc_resource_64;
//@ chunk-7wwf2tct.js:12090-12124 placement
var Xe = Et(Ue, import.meta.dirname);
//@ chunk-7wwf2tct.js:12124-12148 placement
var Ge = __cc_resource_65;
//@ chunk-7wwf2tct.js:12148-12182 placement
var Ye = Et(Ge, import.meta.dirname);
//@ chunk-7wwf2tct.js:12182-12206 placement
var et = __cc_resource_66;
//@ chunk-7wwf2tct.js:12206-12240 placement
var tt = Et(et, import.meta.dirname);
//@ chunk-7wwf2tct.js:12240-12264 placement
var at = __cc_resource_67;
//@ chunk-7wwf2tct.js:12264-12298 placement
var st = Et(at, import.meta.dirname);
//@ chunk-7wwf2tct.js:12298-12322 placement
var rt = __cc_resource_68;
//@ chunk-7wwf2tct.js:12322-12356 placement
var ot = Et(rt, import.meta.dirname);
//@ chunk-7wwf2tct.js:12356-12380 placement
var nt = __cc_resource_69;
//@ chunk-7wwf2tct.js:12380-12414 placement
var it = Et(nt, import.meta.dirname);
//@ chunk-7wwf2tct.js:12414-12438 placement
var lt = __cc_resource_70;
//@ chunk-7wwf2tct.js:12438-12472 placement
var dt = Et(lt, import.meta.dirname);
//@ chunk-7wwf2tct.js:12472-12496 placement
var ct = __cc_resource_71;
//@ chunk-7wwf2tct.js:12496-12530 placement
var pt = Et(ct, import.meta.dirname);
//@ chunk-7wwf2tct.js:12530-12554 placement
var mt = __cc_resource_72;
//@ chunk-7wwf2tct.js:12554-12588 placement
var ht = Et(mt, import.meta.dirname);
//@ chunk-7wwf2tct.js:12588-12612 placement
var ut = __cc_resource_73;
//@ chunk-7wwf2tct.js:12612-12646 placement
var ft = Et(ut, import.meta.dirname);
//@ chunk-7wwf2tct.js:12646-12670 placement
var gt = __cc_resource_74;
//@ chunk-7wwf2tct.js:12670-12704 placement
var yt = Et(gt, import.meta.dirname);
//@ chunk-7wwf2tct.js:12704-12728 placement
var wt = __cc_resource_75;
//@ chunk-7wwf2tct.js:12728-12762 placement
var bt = Et(wt, import.meta.dirname);
//@ chunk-7wwf2tct.js:12762-12786 placement
var vt = __cc_resource_76;
//@ chunk-7wwf2tct.js:12786-12820 placement
var kt = Et(vt, import.meta.dirname);
//@ chunk-7wwf2tct.js:12820-12844 placement
var St = __cc_resource_77;
//@ chunk-7wwf2tct.js:12844-12878 placement
var At = Et(St, import.meta.dirname);
//@ chunk-7wwf2tct.js:12878-12902 placement
var Pt = __cc_resource_78;
//@ chunk-7wwf2tct.js:12902-12936 placement
var Tt = Et(Pt, import.meta.dirname);
//@ chunk-7wwf2tct.js:12936-12960 placement
var xt = __cc_resource_79;
//@ chunk-7wwf2tct.js:12960-12994 placement
var Dt = Et(xt, import.meta.dirname);
//@ chunk-7wwf2tct.js:12994-13018 placement
var _t = __cc_resource_80;
//@ chunk-7wwf2tct.js:13018-13052 placement
var It = Et(_t, import.meta.dirname);
//@ chunk-7wwf2tct.js:13052-13076 placement
var $t = __cc_resource_81;
//@ chunk-7wwf2tct.js:13076-13110 placement
var Rt = Et($t, import.meta.dirname);
//@ chunk-7wwf2tct.js:13110-13134 placement
var Ft = __cc_resource_82;
//@ chunk-7wwf2tct.js:13134-13168 placement
var Bt = Et(Ft, import.meta.dirname);
//@ chunk-7wwf2tct.js:13168-13192 placement
var Ht = __cc_resource_83;
//@ chunk-7wwf2tct.js:13192-13226 placement
var Ct = Et(Ht, import.meta.dirname);
//@ chunk-7wwf2tct.js:13226-13250 placement
var Nt = __cc_resource_84;
//@ chunk-7wwf2tct.js:13250-13274 placement
var Ot = __cc_resource_85;
//@ chunk-7wwf2tct.js:13274-13308 placement
var jt = Et(Ot, import.meta.dirname);
//@ chunk-7wwf2tct.js:13308-13332 placement
var Mt = __cc_resource_86;
//@ chunk-7wwf2tct.js:13332-13356 placement
var qt = __cc_resource_87;
//@ chunk-7wwf2tct.js:13356-13380 placement
var Lt = __cc_resource_88;
//@ chunk-7wwf2tct.js:13380-13404 placement
var Jt = __cc_resource_89;
//@ chunk-7wwf2tct.js:13404-13438 placement
var Qt = Et(Jt, import.meta.dirname);
//@ chunk-7wwf2tct.js:13438-13462 placement
var Vt = __cc_resource_90;
//@ chunk-7wwf2tct.js:13462-13496 placement
var Wt = Et(Vt, import.meta.dirname);
//@ chunk-7wwf2tct.js:13496-13520 placement
var Zt = __cc_resource_91;
//@ chunk-7wwf2tct.js:13520-13554 placement
var zt = Et(Zt, import.meta.dirname);
//@ chunk-7wwf2tct.js:13554-13578 placement
var Kt = __cc_resource_92;
//@ chunk-7wwf2tct.js:13578-13612 placement
var Ut = Et(Kt, import.meta.dirname);
//@ chunk-7wwf2tct.js:13612-13636 placement
var Xt = __cc_resource_93;
//@ chunk-7wwf2tct.js:13636-13660 placement
var Gt = __cc_resource_94;
//@ chunk-7wwf2tct.js:13660-13684 placement
var Yt = __cc_resource_95;
//@ chunk-7wwf2tct.js:13684-13708 placement
var ea = __cc_resource_96;
//@ chunk-7wwf2tct.js:13708-13732 placement
var ta = __cc_resource_97;
//@ chunk-7wwf2tct.js:13732-13756 placement
var aa = __cc_resource_98;
//@ chunk-7wwf2tct.js:13756-13780 placement
var sa = __cc_resource_99;
//@ chunk-7wwf2tct.js:13780-13805 placement
var ra = __cc_resource_100;
//@ chunk-7wwf2tct.js:13805-13839 placement
var oa = Et(ra, import.meta.dirname);
//@ chunk-7wwf2tct.js:13839-13864 placement
var na = __cc_resource_101;
//@ chunk-7wwf2tct.js:13864-13889 placement
var ia = __cc_resource_102;
//@ chunk-7wwf2tct.js:13889-13914 placement
var la = __cc_resource_103;
//@ chunk-7wwf2tct.js:13914-13939 placement
var da = __cc_resource_104;
//@ chunk-7wwf2tct.js:13939-13964 placement
var ca = __cc_resource_105;
//@ chunk-7wwf2tct.js:13964-14752 placement
var SKILL_FILES = {
  "shared/managed-agents-quickstarts/bug-hunter.md": Xt,
  "shared/managed-agents-quickstarts/contract-tracker.md": Gt,
  "shared/managed-agents-quickstarts/data-analyst.md": Yt,
  "shared/managed-agents-quickstarts/deep-researcher.md": ea,
  "shared/managed-agents-quickstarts/explainer-video-maker.md": ta,
  "shared/managed-agents-quickstarts/field-monitor.md": aa,
  "shared/managed-agents-quickstarts/incident-commander.md": sa,
  "shared/managed-agents-quickstarts/performance-tuner.md": oa,
  "shared/managed-agents-quickstarts/sprint-retro-facilitator.md": na,
  "shared/managed-agents-quickstarts/structured-extractor.md": ia,
  "shared/managed-agents-quickstarts/support-agent.md": la,
  "shared/managed-agents-quickstarts/support-to-eng-escalator.md": da,
  "shared/managed-agents-quickstarts/watchlist-scanner.md": ca,
};
//@ chunk-7wwf2tct.js:14752-18657 placement
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
  },
  qp = oe,
  Lp = {
    "csharp/claude-api/README.md": r,
    "csharp/claude-api/batches.md": e_7wwf,
    "csharp/claude-api/files-api.md": t_7wwf,
    "csharp/claude-api/opentelemetry.md": a_7wwf,
    "csharp/claude-api/streaming.md": o_7wwf,
    "csharp/claude-api/tool-use.md": n_7wwf,
    "curl/examples.md": l,
    "curl/managed-agents.md": c,
    "go/claude-api/README.md": u,
    "go/claude-api/files-api.md": p,
    "go/claude-api/opentelemetry.md": m,
    "go/claude-api/streaming.md": f,
    "go/claude-api/tool-use.md": y,
    "go/managed-agents/README.md": b,
    "java/claude-api/README.md": A,
    "java/claude-api/files-api.md": v,
    "java/claude-api/opentelemetry.md": k,
    "java/claude-api/streaming.md": P,
    "java/claude-api/tool-use.md": x,
    "java/managed-agents/README.md": _,
    "php/claude-api/README.md": F,
    "php/claude-api/batches.md": E,
    "php/claude-api/files-api.md": I,
    "php/claude-api/opentelemetry.md": R,
    "php/claude-api/streaming.md": B,
    "php/claude-api/tool-use.md": C,
    "php/managed-agents/README.md": O,
    "python/claude-api/README.md": J,
    "python/claude-api/batches.md": j,
    "python/claude-api/files-api.md": M,
    "python/claude-api/opentelemetry.md": q,
    "python/claude-api/sdk-upgrade.md": V,
    "python/claude-api/streaming.md": Z,
    "python/claude-api/tool-use.md": K,
    "python/managed-agents/README.md": X,
    "ruby/claude-api/README.md": Y,
    "ruby/claude-api/opentelemetry.md": G,
    "ruby/claude-api/streaming.md": ee,
    "ruby/claude-api/tool-use.md": te,
    "ruby/managed-agents/README.md": se,
    "shared/admin-api.md": ie,
    "shared/agent-design.md": de,
    "shared/anthropic-cli.md": pe,
    "shared/api-version-migration.md": he,
    "shared/claude-platform-on-aws.md": ue,
    "shared/cost-optimization.md": ge,
    "shared/error-codes.md": we,
    "shared/evals/build-eval.md": ve,
    "shared/evals/eval-audit.md": Se,
    "shared/evals/cost-hillclimb.md": Pe,
    "shared/evals/eval-hillclimb.md": xe,
    "shared/evals/report/runner-scaffold.mjs": De,
    "shared/evals/report/build-report-lite.mjs": _e,
    "shared/evals/report/SCHEMA.md": Ie,
    "shared/google-cloud-anthropic-managed.md": Re,
    "shared/live-sources.md": He,
    "shared/managed-agents-api-reference.md": Ne,
    "shared/managed-agents-client-patterns.md": je,
    "shared/managed-agents-core.md": qe,
    "shared/managed-agents-environments.md": Je,
    "shared/managed-agents-events.md": Ve,
    "shared/managed-agents-memory.md": Ze,
    "shared/managed-agents-multiagent.md": Ke,
    ...SKILL_FILES,
    "shared/managed-agents-onboarding.md": Xe,
    "shared/managed-agents-onboarding-from-quickstart.md": Ye,
    "shared/managed-agents-onboarding-from-url.md": tt,
    "shared/managed-agents-outcomes.md": st,
    "shared/managed-agents-overview.md": ot,
    "shared/managed-agents-scheduled-deployments.md": it,
    "shared/managed-agents-secure.md": dt,
    "shared/managed-agents-self-hosted-sandboxes.md": pt,
    "shared/managed-agents-tools.md": ht,
    "shared/managed-agents-webhooks.md": ft,
    "shared/model-migration.md": yt,
    "shared/models.md": bt,
    "shared/opentelemetry.md": kt,
    "shared/platform-availability.md": At,
    "shared/preserved-thinking-migration.md": Tt,
    "shared/preserved-thinking-migration/causes.md": Dt,
    "shared/preserved-thinking-migration/prefix_diff.py": It,
    "shared/preserved-thinking-migration/drop_block_probe.py": Rt,
    "shared/prompt-audit.md": Bt,
    "shared/prompt-caching.md": Ct,
    "shared/token-counting.md": Nt,
    "shared/tool-use-concepts.md": jt,
    "typescript/claude-api/README.md": Qt,
    "typescript/claude-api/batches.md": Mt,
    "typescript/claude-api/files-api.md": qt,
    "typescript/claude-api/opentelemetry.md": Lt,
    "typescript/claude-api/streaming.md": Wt,
    "typescript/claude-api/tool-use.md": zt,
    "typescript/managed-agents/README.md": Ut,
  };
//@ chunk-6z63wjt0.js:695-717 placement
var e = __cc_resource_0_2;
//@ chunk-6z63wjt0.js:717-739 placement
var t = __cc_resource_1_2;
//@ chunk-6z63wjt0.js:739-761 placement
var a = __cc_resource_2_2;
//@ chunk-6z63wjt0.js:761-793 placement
var n = Et(a, import.meta.dirname);
//@ chunk-6z63wjt0.js:793-815 placement
var o = __cc_resource_3_2;
//@ chunk-6z63wjt0.js:815-837 placement
var s = __cc_resource_4;
//@ chunk-6z63wjt0.js:837-1013 placement
var SKILL_PROMPT_CONTENT = s,
  CLAUDE_CODE_DOCS_REFERENCE_FILES = {
    "references/claude-tag.md": e,
    "references/live-sources.md": t,
    "references/plugin-eval-quickref.md": gMo,
    "references/plugin-eval.md": n,
    "references/recent-changes.md": o,
  };
//@ chunk-g13xw617.js:318-340 placement
var d_g13x = __cc_resource_0_3;
//@ chunk-g13xw617.js:340-374 placement
var gMo = Et(d_g13x, import.meta.dirname);
