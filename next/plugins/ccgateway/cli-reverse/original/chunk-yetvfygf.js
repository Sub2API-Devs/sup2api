
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Le}from"./chunk-0777tkjc.js";import{hs}from"./chunk-2mbp91tg.js";import{ge}from"./chunk-886baxky.js";var t={notice:null,shownLoggedForDraftId:null,promptedCount:0,sessionDraftCount:0,seededFromDisk:!1,seedStarted:!1,toolCallCount:0};class n{autoDenyPresence=Le();mainLoopBusy=hs({busy:!1});blockingToolProgress=hs({active:!1});dialogHostUnmounted=hs({unmounted:!1});onScreenBlockingDialog=hs({surfaceMounted:!1,kind:null});headerGauge=hs({mounts:0});pendingSurveyFeedbackSource=null;terminalFocus="unknown";terminalFocusGainedAt=Number.NEGATIVE_INFINITY;terminalFocusChanged=Le();feedbackNotice=hs(t);promptDigitCaptures=hs({count:0});clawdEntranceTaken=!1;startupUpdateSummary=void 0;experimentEnrollmentsUnseen=void 0;orgMemoryWritesRowSeen=!1;orgMemoryReadRowSeen=!1;remoteHomeSettingsRowSeen=!1;configRowsSeen=new Set;configRowNotices=new Map}var wa=ge(new n,(o)=>{o.configRowsSeen.clear(),o.configRowNotices.clear(),o.mainLoopBusy.setState((e)=>e.busy?{busy:!1}:e),o.headerGauge.setState((e)=>e.mounts===0?e:{mounts:0})});
export{wa};
