/**
 * services/mcp/listPagination.ts
 *
 * 2.1.316 新增：MCP 列表分页。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t8n4kdh.js (3)
 * attribution: placement 3
 */
import {
  getConnectionTimeoutMs,
  hasNoTransport,
  isTimeoutError,
  MAX_LIST_PAGES,
  LIST_PAGE_DELAYS_MS,
  isRetryableListError,
} from "./client.js";
import { logMCPDebug } from "../../utils/log.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { describeConnectError } from "./auth.js";
import { sleep } from "../../utils/sleep.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { SdkError, SdkErrorCode } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";

//@ chunk-8t8n4kdh.js:48365-49332 placement
async function listAllPages_2(e, name, config, s, h, y, S, w) {
  let P = false;
  for (let idx = 0; ; idx++) {
    let j = [];
    let R = new Set();
    let ce;
    let pageCount = 0;
    let ie;
    try {
      do {
        let ge = () =>
          e.request(
            {
              method: s,
              ...(ce && {
                params: {
                  cursor: ce,
                },
              }),
            },
            h,
            {
              timeout: getConnectionTimeoutMs(),
            },
          );
        let Ie =
          S?.catch((error) => {
            if (hasNoTransport(e) || isTimeoutError(error)) throw error;
            logMCPDebug(
              name,
              `first ${s} page, sent during the connect, failed (${truncateToLength(describeConnectError(error, config), 200)}); sending it again`,
            );
            return ge();
          }) ?? ge();
        S = undefined;
        let G = await Ie;
        pageCount++;
        if (pageCount === 1) w?.(G);
        let Pe = y(G);
        if (Pe) j.push(...Pe);
        if (ce) R.add(ce);
        ce = G.nextCursor;
        if (ce && R.has(ce)) {
          ie = "repeated_cursor";
          break;
        }
        if (ce && pageCount >= MAX_LIST_PAGES) {
          ie = "capped";
          break;
        }
      } while (ce);
      if (ie === "repeated_cursor")
        logMCPDebug(
          name,
          `${s} returned a nextCursor already sent in this walk (page ${pageCount}); stopping`,
        );
      if (ie === "capped")
        logMCPDebug(name, `${s} still returning nextCursor after ${MAX_LIST_PAGES} pages; stopping`);
      if (pageCount > 1) logListPaginated(s, pageCount, j.length, ie ?? "complete");
      return j;
    } catch (error) {
      if (pageCount > 0 && !P) {
        P = true;
        logListPaginated(s, pageCount, j.length, "error");
      }
      let Ie = LIST_PAGE_DELAYS_MS[idx];
      if (Ie === undefined || !isRetryableListError(error) || hasNoTransport(e)) throw error;
      logMCPDebug(name, `${s} failed (${describeConnectError(error, config)}); retrying in ${Ie}ms`);
      await sleep(Ie);
      if (hasNoTransport(e)) throw error;
    }
  }
}
//@ chunk-8t8n4kdh.js:49332-49456 placement
function logListPaginated(e, pageCount, itemCount, s, h = "pages") {
  logEvent("tengu_mcp_list_paginated", {
    method: fromEnum(e),
    pageCount,
    itemCount,
    outcome: fromEnum(s),
    source: fromEnum(h),
  });
}
//@ chunk-8t8n4kdh.js:49456-49905 placement
async function listToolsModern(e, name, config) {
  for (let j = 0; ; j++)
    try {
      let h = await e.listTools(undefined, {
        timeout: getConnectionTimeoutMs(),
        cacheMode: "refresh",
      });
      logListPaginated("tools/list", undefined, h.tools.length, "complete", "aggregate");
      return h.tools;
    } catch (error) {
      let y = LIST_PAGE_DELAYS_MS[j];
      if (y === undefined || !isRetryableListError(error)) {
        if (error instanceof SdkError && error.code === SdkErrorCode.ListPaginationExceeded)
          logListPaginated("tools/list", undefined, 0, "capped", "aggregate");
        throw error;
      }
      if (hasNoTransport(e)) throw error;
      logMCPDebug(name, `tools/list failed (${describeConnectError(error, config)}); retrying in ${y}ms`);
      await sleep(y);
      if (hasNoTransport(e)) throw error;
    }
}
export { listAllPages_2, listToolsModern };
