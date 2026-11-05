
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{De}from"./chunk-ndkzc8d3.js";import{Ds}from"./chunk-8zzj4j31.js";import{ge}from"./chunk-77hsvag5.js";var t={notice:null,shownLoggedForDraftId:null,promptedCount:0,sessionDraftCount:0,seededFromDisk:!1,seedStarted:!1,toolCallCount:0};class n{autoDenyPresence=De();mainLoopBusy=Ds({busy:!1});blockingToolProgress=Ds({active:!1});dialogHostUnmounted=Ds({unmounted:!1});onScreenBlockingDialog=Ds({surfaceMounted:!1,kind:null});headerGauge=Ds({mounts:0});pendingSurveyFeedbackSource=null;terminalFocus="unknown";terminalFocusGainedAt=Number.NEGATIVE_INFINITY;terminalFocusChanged=De();feedbackNotice=Ds(t);promptDigitCaptures=Ds({count:0});clawdEntranceTaken=!1;startupUpdateSummary=void 0;experimentEnrollmentsUnseen=void 0;orgMemoryWritesRowSeen=!1;orgMemoryReadRowSeen=!1;remoteHomeSettingsRowSeen=!1;configRowsSeen=new Set;configRowNotices=new Map}var Fa=ge(new n,(o)=>{o.configRowsSeen.clear(),o.configRowNotices.clear(),o.mainLoopBusy.setState((e)=>e.busy?{busy:!1}:e),o.headerGauge.setState((e)=>e.mounts===0?e:{mounts:0})});
export{Fa};
