/**
 * utils/subscriptionNoticeIds.ts
 *
 * 2.1.316 新增：订阅提示 id
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s90mkqt7.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-s90mkqt7.js:191-332 placement
/**
 * 订阅切换与 cc-ce 迁移提示各自的展示次数上限（都是 3）。
 */
var SUBSCRIPTION_SWITCH = "subscription-switch";
var CC_CE_MIGRATE_MAX_IMPRESSIONS = 3;
var CC_CE_MIGRATE = "cc-ce-migrate";
var CC_CE_MIGRATE_MAX_IMPRESSIONS_LIMIT = 3;
var PROMO_CREDIT = "promo-credit";
var PROMO_CREDIT_USED_UP = "promo-credit-used-up:";
var PROMO_CREDIT_APPROACHING = "promo-credit-approaching:";
export {
  CC_CE_MIGRATE_MAX_IMPRESSIONS_LIMIT,
  CC_CE_MIGRATE_MAX_IMPRESSIONS,
  SUBSCRIPTION_SWITCH,
  PROMO_CREDIT,
  PROMO_CREDIT_USED_UP,
  PROMO_CREDIT_APPROACHING,
  CC_CE_MIGRATE,
};
