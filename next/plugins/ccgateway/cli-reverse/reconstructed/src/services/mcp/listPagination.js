/**
 * services/mcp/listPagination.ts
 *
 * 2.1.316 新增：MCP 列表分页。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sywnjtqb.js (3)
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

//@ chunk-sywnjtqb.js:48384-49344 placement
async function listAllPages_2(
  connection,
  name,
  config,
  method,
  resultSchema,
  extractItems,
  firstPagePromise,
  onFirstPage,
) {
  let hasLoggedError = false;
  for (let idx = 0; ; idx++) {
    let items = [];
    let seenCursors = new Set();
    let cursor;
    let pageCount = 0;
    let stopReason;
    try {
      do {
        let sendPage = () =>
          connection.request(
            {
              method,
              ...(cursor && {
                params: {
                  cursor,
                },
              }),
            },
            resultSchema,
            {
              timeout: getConnectionTimeoutMs(),
            },
          );
        let pagePromise =
          firstPagePromise?.catch((error) => {
            if (hasNoTransport(connection) || isTimeoutError(error)) throw error;
            logMCPDebug(
              name,
              `first ${method} page, sent during the connect, failed (${truncateToLength(describeConnectError(error, config), 200)}); sending it again`,
            );
            return sendPage();
          }) ?? sendPage();
        firstPagePromise = undefined;
        let page = await pagePromise;
        pageCount++;
        if (pageCount === 1) onFirstPage?.(page);
        let pageItems = extractItems(page);
        if (pageItems) items.push(...pageItems);
        if (cursor) seenCursors.add(cursor);
        cursor = page.nextCursor;
        if (cursor && seenCursors.has(cursor)) {
          stopReason = "repeated_cursor";
          break;
        }
        if (cursor && pageCount >= MAX_LIST_PAGES) {
          stopReason = "capped";
          break;
        }
      } while (cursor);
      if (stopReason === "repeated_cursor")
        logMCPDebug(
          name,
          `${method} returned a nextCursor already sent in this walk (page ${pageCount}); stopping`,
        );
      if (stopReason === "capped")
        logMCPDebug(name, `${method} still returning nextCursor after ${MAX_LIST_PAGES} pages; stopping`);
      if (pageCount > 1) logListPaginated(method, pageCount, items.length, stopReason ?? "complete");
      return items;
    } catch (error) {
      if (pageCount > 0 && !hasLoggedError) {
        hasLoggedError = true;
        logListPaginated(method, pageCount, items.length, "error");
      }
      let retryDelayMs = LIST_PAGE_DELAYS_MS[idx];
      if (retryDelayMs === undefined || !isRetryableListError(error) || hasNoTransport(connection))
        throw error;
      logMCPDebug(
        name,
        `${method} failed (${describeConnectError(error, config)}); retrying in ${retryDelayMs}ms`,
      );
      await sleep(retryDelayMs);
      if (hasNoTransport(connection)) throw error;
    }
  }
}
//@ chunk-sywnjtqb.js:49344-49468 placement
function logListPaginated(method, pageCount, itemCount, outcome, source = "pages") {
  logEvent("tengu_mcp_list_paginated", {
    method: fromEnum(method),
    pageCount,
    itemCount,
    outcome: fromEnum(outcome),
    source: fromEnum(source),
  });
}
//@ chunk-sywnjtqb.js:49468-49917 placement
async function listToolsModern(connection, name, config) {
  for (let j = 0; ; j++)
    try {
      let result = await connection.listTools(undefined, {
        timeout: getConnectionTimeoutMs(),
        cacheMode: "refresh",
      });
      logListPaginated("tools/list", undefined, result.tools.length, "complete", "aggregate");
      return result.tools;
    } catch (error) {
      let retryDelayMs = LIST_PAGE_DELAYS_MS[j];
      if (retryDelayMs === undefined || !isRetryableListError(error)) {
        if (error instanceof SdkError && error.code === SdkErrorCode.ListPaginationExceeded)
          logListPaginated("tools/list", undefined, 0, "capped", "aggregate");
        throw error;
      }
      if (hasNoTransport(connection)) throw error;
      logMCPDebug(
        name,
        `tools/list failed (${describeConnectError(error, config)}); retrying in ${retryDelayMs}ms`,
      );
      await sleep(retryDelayMs);
      if (hasNoTransport(connection)) throw error;
    }
}
export { listAllPages_2, listToolsModern };
