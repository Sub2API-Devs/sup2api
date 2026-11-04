/**
 * utils/telemetry/cooAttributes.ts
 *
 * 2.1.316 新增：遥测属性。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v2w606r1.js (1)
 * attribution: placement 1
 */
import { emptyGkeCluster } from "../envUtils.js";
import { noopProbe } from "../errorStackSanitize.js";

//@ chunk-v2w606r1.js:265-375 placement
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
