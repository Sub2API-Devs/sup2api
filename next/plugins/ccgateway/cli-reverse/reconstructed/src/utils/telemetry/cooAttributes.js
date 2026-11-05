/**
 * utils/telemetry/cooAttributes.ts
 *
 * 2.1.316 新增：遥测属性。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9d8yry3m.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { emptyGkeCluster } from "../envUtils.js";
import { noopProbe } from "../errorStackSanitize.js";

//@ chunk-9d8yry3m.js:265-375 placement
/**
 * COO 命名空间与集群属性。
 */
function cooAttributes() {
  let { namespace, cluster } = emptyGkeCluster();
  return {
    ...(namespace && {
      cooNamespace: noopProbe(namespace),
    }),
    ...(cluster && {
      cooCluster: noopProbe(cluster),
    }),
  };
}
export { cooAttributes };
