class $l0 {
  reader;
  holdMs;
  clock;
  held = [];
  heldBytes = 0;
  isBetweenEvents = false;
  holdsNothing = false;
  isReading = false;
  isDue = false;
  ending;
  isCancelled = false;
  cancelHold;
  lastHandOverAt = Number.NEGATIVE_INFINITY;
  lastHandOverWallAt = Number.NEGATIVE_INFINITY;
  pulling;
  constructor($l1, $l2, $l3) {
    this.reader = $l1;
    this.holdMs = $l2;
    this.clock = $l3;
  }
  pull($l4) {
    return new Promise(($l5) => {
      if (this.pulling = { controller: $l4, done: $l5 }, this.isDue) this.handOver();
      else if (!this.isReading) this.read();
    });
  }
  cancel($l6) {
    return this.isCancelled = true, this.held = [], this.cancelHold?.(), this.cancelHold = void 0, this.pulling?.done(), this.pulling = void 0, this.reader.cancel($l6);
  }
  read() {
    this.isReading = true;
    try {
      this.reader.read().then(this.onRead, this.onReadFailed);
    } catch ($l7) {
      this.onReadFailed($l7);
    }
  }
  onRead = ($l8) => {
    if (this.isReading = false, this.isCancelled) return;
    try {
      if ($l8.done) {
        this.ending = { failed: false }, this.handOver();
        return;
      }
      let $l9 = $l8.value;
      if ($l9.byteLength > 0) {
        this.held.push($l9), this.heldBytes += $l9.byteLength;
        let $l10 = Buffer.from($l9.buffer, $l9.byteOffset, $l9.byteLength), $l11 = this.isBetweenEvents && !this.holdsNothing;
        this.isBetweenEvents = $l10.at(-1) === $m_Jp && $l10.at(-2) === $m_Jp, $l11 &&= this.isBetweenEvents && !$l10.includes($m_Jy) && !$l10.includes($m_Qy);
        for (let $l12 = !$l11 ? -1 : $m_Ol($l10, 0, $m_Vy) ? 0 : $m_Zp($l10, 0); $l11 && $l12 !== -1; $l12 = $m_Zp($l10, $l12)) $l11 = $m_Ol($l10, $l12, $m_Ky) || $m_Ol($l10, $l12, $m_jy);
        if (!$l11 || (this.cancelHold === void 0 ? this.clock.monotonicNow() - this.lastHandOverAt > this.holdMs || this.clock.now() - this.lastHandOverWallAt > this.holdMs : this.hasStoodStillSinceHandOver(2)) || this.heldBytes >= $m_Zy) {
          this.handOver();
          return;
        }
        this.cancelHold ??= this.clock.setTimeout(this.onHoldOver, this.holdMs);
      }
      if (this.pulling !== void 0) this.read();
    } catch ($l13) {
      if (this.noteOwnThrow($l13, "chunk_handling_threw"), this.held.length > 0) this.handOver();
      else this.letGoOfBody($l13), this.onReadFailed($l13);
    }
  };
  onReadFailed = ($l14) => {
    this.isReading = false, this.ending = { failed: true, error: $l14 }, this.handOver();
  };
  onHoldOver = () => {
    try {
      if (this.hasStoodStillSinceHandOver(3)) {
        this.cancelHold = void 0;
        return;
      }
    } catch ($l15) {
      this.noteOwnThrow($l15, "hold_timer_threw");
    }
    this.handOver();
  };
  hasStoodStillSinceHandOver($l16) {
    let $l17 = this.clock.monotonicNow() - this.lastHandOverAt;
    return this.clock.now() - this.lastHandOverWallAt - $l17 > this.holdMs || $l17 > $l16 * this.holdMs;
  }
  noteOwnThrow($l18, $l19) {
    if (!this.holdsNothing) {
      this.holdsNothing = true;
      try {
        $m_l($m_N($l18)), $m_f("api_unwatched_reply_hold", $l19);
      } catch {
      }
    }
  }
  handOver() {
    let $l20 = this.cancelHold;
    if (this.cancelHold = void 0, $l20?.(), this.isDue = true, this.pulling === void 0) return;
    let { controller: $l21, done: $l22 } = this.pulling;
    this.pulling = void 0;
    try {
      if (this.held.length > 0) {
        let [$l23, ...$l24] = this.held, $l25 = $l23 !== void 0 && $l24.length === 0 ? $l23 : Buffer.concat(this.held);
        this.held = [], this.heldBytes = 0, this.isDue = this.ending !== void 0, $l21.enqueue($l25), this.lastHandOverAt = this.clock.monotonicNow(), this.lastHandOverWallAt = this.clock.now();
      } else if (this.ending?.failed) $l21.error(this.ending.error);
      else if (this.ending !== void 0) $l21.close();
    } catch ($l26) {
      try {
        $l21.error($l26);
      } catch {
      }
      $l22(), this.letGoOfBody($l26), this.noteOwnThrow($l26, "hand_over_threw");
      return;
    }
    $l22();
  }
  letGoOfBody($l27) {
    try {
      this.reader.cancel($l27).catch(() => {
      });
    } catch {
    }
  }
}
;
