class $l0 {
  #e = /* @__PURE__ */ new Map();
  #t = /* @__PURE__ */ new Map();
  #n = null;
  #o = /* @__PURE__ */ new Map();
  #r = /* @__PURE__ */ new Set();
  #s = /* @__PURE__ */ new Set();
  #i = /* @__PURE__ */ new Set();
  #d = /* @__PURE__ */ new Set();
  #u = /* @__PURE__ */ new Set();
  #c = /* @__PURE__ */ new Set();
  #l = /* @__PURE__ */ new Set();
  #p = /* @__PURE__ */ new Set();
  #h = /* @__PURE__ */ new Set();
  #a = /* @__PURE__ */ new Set();
  #g = /* @__PURE__ */ new Map();
  #S = /* @__PURE__ */ new Map();
  #y = /* @__PURE__ */ new Map();
  #v;
  #f = { byFileUuid: /* @__PURE__ */ new Map(), recentPrefetchStarts: [] };
  #m = $m_qe();
  #b = /* @__PURE__ */ new Set();
  #k = void 0;
  #R = void 0;
  #x = void 0;
  #C = void 0;
  #P = void 0;
  planSlugCache() {
    return this.#e;
  }
  forgetPlanSlug($l1) {
    this.#e.delete($l1);
  }
  pendingBranchLinks() {
    return this.#t;
  }
  replacePendingBranchLinks() {
    this.#t = /* @__PURE__ */ new Map();
  }
  vimSharedState() {
    return this.#n;
  }
  replaceVimSharedState($l2) {
    this.#n = $l2;
  }
  agentColorMap() {
    return this.#o;
  }
  sessionCreatedTeams() {
    return this.#r;
  }
  sessionSpawnedTeammatePanes() {
    return this.#s;
  }
  surfacedHookSpawnFailures() {
    return this.#i;
  }
  bareMcpServerMatchersWarned() {
    return this.#d;
  }
  pendingConversationEditKinds() {
    return this.#u;
  }
  clientTruncatedAssistantIds() {
    return this.#c;
  }
  heldStatelessReplyIds() {
    return this.#l;
  }
  unsupportedThreadKeys() {
    return this.#p;
  }
  pendingPrLinks() {
    return this.#h;
  }
  policyPredicateTelemetryEmitted() {
    return this.#a;
  }
  humanAttachmentDigests() {
    return this.#g;
  }
  inboundAttachmentFiles() {
    return this.#S;
  }
  filesPlacedByName() {
    return this.#y;
  }
  filesPlacedByNameRead() {
    return this.#v;
  }
  setFilesPlacedByNameRead($l3) {
    this.#v = $l3;
  }
  inboundAttachmentDownloads() {
    return this.#f;
  }
  arrivingInboundFiles() {
    return this.#m;
  }
  chromeAvailabilityStagesLogged() {
    return this.#b;
  }
  replaceChromeAvailabilityStagesLogged($l4) {
    if (this.#b = /* @__PURE__ */ new Set(), $l4) this.#k = Date.now();
  }
  chromeAvailabilityAnchorMs() {
    return this.#k;
  }
  pendingGoalIdleCheckin() {
    return this.#R;
  }
  replacePendingGoalIdleCheckin($l5) {
    this.#R = $l5;
  }
  pendingGoalReprompt() {
    return this.#x;
  }
  replacePendingGoalReprompt($l6) {
    this.#x = $l6;
  }
  goalInterruptionStreak() {
    return this.#C;
  }
  replaceGoalInterruptionStreak($l7) {
    this.#C = $l7;
  }
  workerCheckin() {
    return this.#P;
  }
  replaceWorkerCheckin($l8) {
    this.#P = $l8;
  }
  reset() {
    this.#e = /* @__PURE__ */ new Map(), this.#t = /* @__PURE__ */ new Map(), this.#n = null, this.#o = /* @__PURE__ */ new Map(), this.#r = /* @__PURE__ */ new Set(), this.#s = /* @__PURE__ */ new Set(), this.#i = /* @__PURE__ */ new Set(), this.#d = /* @__PURE__ */ new Set(), this.#u = /* @__PURE__ */ new Set(), this.#c = /* @__PURE__ */ new Set(), this.#l = /* @__PURE__ */ new Set(), this.#p = /* @__PURE__ */ new Set(), this.#h = /* @__PURE__ */ new Set(), this.#a = /* @__PURE__ */ new Set(), this.#g = /* @__PURE__ */ new Map(), this.#S = /* @__PURE__ */ new Map(), this.#y = /* @__PURE__ */ new Map(), this.#v = void 0;
    for (let $l9 of this.#f.byFileUuid.values()) clearTimeout($l9.expiry), $l9.abort.abort();
    this.#f = { byFileUuid: /* @__PURE__ */ new Map(), recentPrefetchStarts: [] }, this.#m = $m_qe(), this.#b = /* @__PURE__ */ new Set(), this.#k = void 0, clearTimeout(this.#R), this.#R = void 0, clearTimeout(this.#x), this.#x = void 0, this.#C = void 0, clearInterval(this.#P?.timer), this.#P = void 0;
  }
}
;
