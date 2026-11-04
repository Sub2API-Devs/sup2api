class $l0 {
  promptCacheBreak = { previousStateBySource: /* @__PURE__ */ new Map(), hydrationAttempted: false, pendingPersist: Promise.resolve(), latestQueuedPersist: null, hashSalt: null, summaryForks: /* @__PURE__ */ new Map(), parkedAgentBaselines: /* @__PURE__ */ new Map(), parkedBy: null, classifierLines: /* @__PURE__ */ new Map(), classifierCompactions: /* @__PURE__ */ new Map() };
  threadDecisionTracker = void 0;
  threadInheritedFields = { storedToolsHashByThread: /* @__PURE__ */ new Map(), breakerTripped: false };
  threadDropRecreate = /* @__PURE__ */ new Map();
  threadRequestEnds = /* @__PURE__ */ new Map();
  dumpPrompts = { recentRequests: [], stateByAgent: /* @__PURE__ */ new Map(), retiredInitHashes: new $m_zc({ max: 1e3 }), appendQueue: $m_xh() };
  requestReplay = { chains: /* @__PURE__ */ new Map(), chainClears: 0, hashMemos: /* @__PURE__ */ new WeakMap(), unrecordableShapes: /* @__PURE__ */ new Set() };
  lastIngressUuidBySession = /* @__PURE__ */ new Map();
  cacheCoverage = $m_G();
  ccsSenderAddr = { asking: /* @__PURE__ */ new Map(), held: /* @__PURE__ */ new Map(), waits: { firstMs: void 0, unsignedCalls: 0, asks: 0 } };
  gzipRequestBody = { latchedOff: false, rejectedThisProcess: false, persistedLatchChecked: false, persistedLatchInEffect: false, telemetryByClientRequestId: new $m_zc({ max: $m_L }), dispatchAtByClientRequestId: new $m_zc({ max: $m_L }), ccrWorkerSkipReasonsLogged: /* @__PURE__ */ new Set(), blockStore: $m_N(), blocksSwitchedOff: false, bodyBytesSwitchedOff: false, reusingBodiesChecked: 0, firstReusingBodiesDraw: void 0, serialisedBodies: /* @__PURE__ */ new WeakMap(), blocksBuildGeneration: void 0, blockGzippedResponses: /* @__PURE__ */ new WeakMap() };
  sentPrefix = { ledger: void 0, mode: void 0, persist: Promise.resolve(), persisted: void 0, pendingSeed: void 0, lastReport: /* @__PURE__ */ new WeakMap(), lastVerdict: /* @__PURE__ */ new WeakMap(), renderEpochs: /* @__PURE__ */ new WeakMap(), memoryEpochs: /* @__PURE__ */ new WeakMap(), announced: /* @__PURE__ */ new WeakMap(), excuse: /* @__PURE__ */ new WeakMap(), staged: /* @__PURE__ */ new WeakMap(), boundVerdict: /* @__PURE__ */ new WeakMap() };
  bindingDrops = { seenBlocks: void 0, threadsRead: new $m_zc({ max: 512 }) };
  foreignThinkingKeep = void 0;
  streamFirstByteArmedRequestIds = new $m_zc({ max: 64 });
  skillHealthMap = void 0;
  headerMemberDropsNoted = /* @__PURE__ */ new Set();
  firedOnceKeys = /* @__PURE__ */ new Set();
  hasFired($l1) {
    return this.firedOnceKeys.has($l1);
  }
  markFired($l2) {
    this.firedOnceKeys.add($l2);
  }
  once($l3) {
    if (this.firedOnceKeys.has($l3)) return false;
    return this.firedOnceKeys.add($l3), true;
  }
  resetStreamNoEventsWarningLatch() {
    this.firedOnceKeys.delete("stream_no_events_fallback_warning");
  }
}
;
