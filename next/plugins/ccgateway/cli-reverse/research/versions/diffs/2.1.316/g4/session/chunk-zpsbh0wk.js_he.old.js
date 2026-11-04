class $l0 {
  exchanges = [];
  replace($l1) {
    this.exchanges = $l1;
  }
  append($l2, $l3, $l4) {
    this.exchanges = [...this.exchanges, { question: $l2, response: $l3, ...$l4 && { fallbackNotice: $l4 } }].slice(-20);
  }
  pendingReopen = null;
  reopenAway = false;
  get reopenPending() {
    return this.pendingReopen !== null;
  }
  armReopen($l5, $l6) {
    if (this.pendingReopen) {
      this.pendingReopen.owners.add($l5);
      return;
    }
    this.pendingReopen = { owners: /* @__PURE__ */ new Set([$l5]), cancel: $l6() };
  }
  clearPendingReopen($l7) {
    let $l8 = this.pendingReopen;
    if (!$l8) {
      this.reopenAway = false;
      return;
    }
    if ($l7 !== void 0) {
      if ($l8.owners.delete($l7), $l8.owners.size > 0) return;
    }
    $l8.cancel(), this.pendingReopen = null, this.reopenAway = false;
  }
  reopener = null;
  setReopener($l9) {
    this.reopener = $l9;
  }
  get hasReopener() {
    return this.reopener !== null;
  }
  reopenNow() {
    return this.reopener?.() ?? false;
  }
  inFlightQuestions = [];
  get inFlight() {
    return this.inFlightQuestions.at(-1) ?? null;
  }
  pendingBesidesTop() {
    return this.inFlightQuestions.slice(0, -1);
  }
  setInFlight($l10) {
    if (!this.inFlightQuestions.includes($l10)) this.inFlightQuestions = [...this.inFlightQuestions, $l10];
  }
  clearInFlight($l11) {
    if (this.inFlightQuestions.includes($l11)) this.inFlightQuestions = this.inFlightQuestions.filter(($l12) => $l12 !== $l11);
  }
}
;
