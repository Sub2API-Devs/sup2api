/**
 * @azure/identity/dist/esm/util/subscriptionUtils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { formatError } from "./logging.js";

//@ chunk-b5df2wx1.js:311732-312006 esm-fingerprint
function checkSubscription(logger, subscription) {
  if (!subscription.match(/^[0-9a-zA-Z-._ ]+$/)) {
    let error = Error(
      "Invalid subscription provided. You can locate your subscription by following the instructions listed here: https://learn.microsoft.com/azure/azure-portal/get-subscription-tenant-id.",
    );
    logger.info(formatError("", error));
    throw error;
  }
}
export { checkSubscription };
