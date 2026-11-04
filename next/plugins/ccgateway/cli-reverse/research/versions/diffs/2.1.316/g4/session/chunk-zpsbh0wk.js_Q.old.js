class $l0 {
  #e = null;
  #t = null;
  #n = null;
  #o = null;
  #r = null;
  #s = 0;
  #i = null;
  #d = void 0;
  #u = 0;
  #l = null;
  #c = null;
  #p = null;
  #a = null;
  #h = null;
  #g = false;
  #m = null;
  #y = null;
  #S = false;
  lastAPIRequest() {
    return this.#e;
  }
  replaceLastAPIRequest($l1) {
    this.#e = $l1;
  }
  lastCancelledAPIMessageId() {
    return this.#t;
  }
  replaceLastCancelledAPIMessageId($l2) {
    this.#t = $l2;
  }
  lastAPIRequestMessages() {
    return this.#n;
  }
  replaceLastAPIRequestMessages($l3) {
    this.#n = $l3;
  }
  lastClassifierRequests() {
    return this.#o;
  }
  replaceLastClassifierRequests($l4) {
    this.#o = $l4;
  }
  promptId() {
    return this.#r;
  }
  replacePromptId($l5) {
    this.#r = $l5;
  }
  promptIndex() {
    return this.#s;
  }
  replacePromptIndex($l6) {
    this.#s = $l6;
  }
  incrementPromptIndex() {
    return this.#s++, this.#s;
  }
  lastPersonPrompt() {
    return this.#i;
  }
  replaceLastPersonPrompt($l7) {
    this.#i = $l7;
  }
  lastMainRequestId() {
    return this.#d;
  }
  replaceLastMainRequestId($l8) {
    if (this.#d = $l8, $l8 === void 0) this.#u += 1;
  }
  mainChainReleaseCount() {
    return this.#u;
  }
  lastMainThreadCacheTtlMs() {
    return this.#l;
  }
  replaceLastMainThreadCacheTtlMs($l9, $l10, $l11 = false) {
    this.#l = $l9, this.#a = Date.now(), this.#p = { ttlMs: $l9, model: $l10, requestAt: this.#a, askedAt: $l11 ? this.#p?.askedAt ?? this.#a : this.#a }, this.#h = this.#a, this.#g = true;
  }
  isLastMainThreadAskLive($l12, $l13) {
    let $l14 = this.#p;
    return $l14 !== null && $l14.requestAt === this.#a && $l14.ttlMs === $l12 && $l14.model === $l13 && Date.now() - $l14.askedAt < $l12;
  }
  adjustLastMainThreadCacheTtlMs($l15) {
    this.#l = $l15;
  }
  recordLastMainThreadCacheRenewal($l16) {
    if (this.#a !== null) this.#c = { requestAt: this.#a, at: Math.max($l16, this.lastMainThreadCacheRenewedAt() ?? -1 / 0) };
  }
  lastMainThreadCacheRenewedAt() {
    let $l17 = this.#c;
    return $l17 !== null && $l17.requestAt === this.#a ? $l17.at : null;
  }
  lastLiveMainThreadRequestAt() {
    return this.#h;
  }
  lastMainThreadRequestAt() {
    return this.#a;
  }
  mainThreadRequestedInProcess() {
    return this.#g;
  }
  recordMainThreadTurnStart() {
    this.#g = true;
  }
  replaceLastMainThreadRequest($l18, $l19) {
    this.#a = $l18, this.#l = $l19;
  }
  lastMainThreadContextTokens() {
    return this.#m;
  }
  replaceLastMainThreadContextTokens($l20) {
    this.#m = $l20;
  }
  stageResumeSeed($l21) {
    this.#f = $l21;
  }
  applyResumeSeed($l22) {
    this.#f = null, this.#l = $l22.ttlMs, this.#a = $l22.requestAt, this.#m = $l22.contextTokens;
  }
  #f = null;
  clearLastMainThreadRequest($l23) {
    let $l24 = $l23 !== void 0 && this.#f?.sessionId === $l23 ? this.#f : null;
    this.#f = null, this.#l = $l24?.ttlMs ?? null, this.#a = $l24?.requestAt ?? null, this.#m = $l24?.contextTokens ?? null, this.#h = null, this.#g = false;
  }
  lastApiCompletionTimestamp() {
    return this.#y;
  }
  replaceLastApiCompletionTimestamp($l25) {
    this.#y = $l25;
  }
  pendingPostCompaction() {
    return this.#S;
  }
  replacePendingPostCompaction($l26) {
    this.#S = $l26;
  }
  reset() {
    this.#e = null, this.#t = null, this.#n = null, this.#o = null, this.#r = null, this.#s = 0, this.#i = null, this.#d = void 0, this.#u += 1, this.#l = null, this.#a = null, this.#h = null, this.#g = false, this.#m = null, this.#f = null, this.#y = null, this.#S = false;
  }
}
;
