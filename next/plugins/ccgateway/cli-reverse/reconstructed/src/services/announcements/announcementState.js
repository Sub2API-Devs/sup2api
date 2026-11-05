/**
 * services/announcements/announcementState.ts
 *
 * 2.1.316 新增：公告槽位状态（按宿主）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e2dcenkt.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e2dcenkt.js:262-921 placement
class AnnouncementState {
  announcementSlotWinner = null;
  announcementSlotGovernance = null;
  announcementSlotReleased = false;
  countedNoticeImpressions = new Set();
  startupAnnouncementPick = undefined;
  companyAnnouncement = null;
  fotwContent = null;
  ccCeMigrateGroup = undefined;
  savedModelSuccessorDrawnAt = null;
  emergencyTipShown = null;
  voiceFooterHintCounted = false;
  voiceFooterHintUnderCap = undefined;
  isLogoRetired = false;
  reset() {
    this.announcementSlotWinner = null;
    this.announcementSlotGovernance = null;
    this.announcementSlotReleased = false;
    this.countedNoticeImpressions.clear();
    this.startupAnnouncementPick = undefined;
    this.companyAnnouncement = null;
    this.fotwContent = null;
    this.ccCeMigrateGroup = undefined;
    this.savedModelSuccessorDrawnAt = null;
  }
}
//@ chunk-e2dcenkt.js:921-947 placement
var announcementStateByHost; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e2dcenkt.js:921", () => {
  announcementStateByHost = new SessionRootSlot(() => new AnnouncementState());
});
//@ chunk-e2dcenkt.js:947-980 placement
function announcementState() {
  return announcementStateByHost.of(getRootSession());
}
export { announcementState, announcementStateByHost };
