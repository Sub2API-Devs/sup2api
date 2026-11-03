/**
 * @modelcontextprotocol/sdk/dist/esm/shared/protocol.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (3)
 * attribution: esm-fingerprint 3
 */
import {
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  PingRequestSchema,
  GetTaskRequestSchema,
  McpError,
  ErrorCode,
  GetTaskPayloadRequestSchema,
  RELATED_TASK_META_KEY,
  ListTasksRequestSchema,
  CancelTaskRequestSchema,
  isJSONRPCResultResponse,
  isJSONRPCErrorResponse,
  isJSONRPCRequest,
  isJSONRPCNotification,
  isTaskAugmentedRequestParams,
  CreateTaskResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CancelTaskResultSchema,
  TaskStatusNotificationSchema,
} from "../types.js";
import { T } from "../../cjs/experimental/tasks/interfaces.js";
import { q7 } from "../server/zod-compat.js";
import { R, z } from "../server/zod-json-schema-compat.js";

//@ chunk-zykv69v4.js:11497-11510 esm-fingerprint
var ye = 60000;
//@ chunk-zykv69v4.js:11510-27504 esm-fingerprint
class Wsn {
  constructor(e) {
    if (
      ((this._options = e),
      (this._requestMessageId = 0),
      (this._requestHandlers = new Map()),
      (this._requestHandlerAbortControllers = new Map()),
      (this._notificationHandlers = new Map()),
      (this._responseHandlers = new Map()),
      (this._progressHandlers = new Map()),
      (this._timeoutInfo = new Map()),
      (this._pendingDebouncedNotifications = new Set()),
      (this._taskProgressTokens = new Map()),
      (this._requestResolvers = new Map()),
      this.setNotificationHandler(CancelledNotificationSchema, (t) => {
        this._oncancel(t);
      }),
      this.setNotificationHandler(ProgressNotificationSchema, (t) => {
        this._onprogress(t);
      }),
      this.setRequestHandler(PingRequestSchema, (t) => ({})),
      (this._taskStore = e?.taskStore),
      (this._taskMessageQueue = e?.taskMessageQueue),
      this._taskStore)
    )
      (this.setRequestHandler(GetTaskRequestSchema, async (t, r) => {
        let task = await this._taskStore.getTask(t.params.taskId, r.sessionId);
        if (!task) throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
        return { ...task };
      }),
        this.setRequestHandler(GetTaskPayloadRequestSchema, async (t, r) => {
          let a = async () => {
            let taskId = t.params.taskId;
            if (this._taskMessageQueue) {
              let o;
              while ((o = await this._taskMessageQueue.dequeue(taskId, r.sessionId))) {
                if (o.type === "response" || o.type === "error") {
                  let message = o.message,
                    id = message.id,
                    i = this._requestResolvers.get(id);
                  if (i)
                    if ((this._requestResolvers.delete(id), o.type === "response")) i(message);
                    else {
                      let c = message,
                        d = new McpError(c.error.code, c.error.message, c.error.data);
                      i(d);
                    }
                  else {
                    let c = o.type === "response" ? "Response" : "Error";
                    this._onerror(Error(`${c} handler missing for request ${id}`));
                  }
                  continue;
                }
                await this._transport?.send(o.message, { relatedRequestId: r.requestId });
              }
            }
            let task = await this._taskStore.getTask(taskId, r.sessionId);
            if (!task) throw new McpError(ErrorCode.InvalidParams, `Task not found: ${taskId}`);
            if (!T(task.status)) return (await this._waitForTaskUpdate(taskId, r.signal), await a());
            if (T(task.status)) {
              let taskResult = await this._taskStore.getTaskResult(taskId, r.sessionId);
              return (
                this._clearTaskQueue(taskId),
                { ...taskResult, _meta: { ...taskResult._meta, [RELATED_TASK_META_KEY]: { taskId: taskId } } }
              );
            }
            return await a();
          };
          return await a();
        }),
        this.setRequestHandler(ListTasksRequestSchema, async (t, r) => {
          try {
            let { tasks: tasks, nextCursor: nextCursor } = await this._taskStore.listTasks(
              t.params?.cursor,
              r.sessionId,
            );
            return { tasks: tasks, nextCursor: nextCursor, _meta: {} };
          } catch (error) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }),
        this.setRequestHandler(CancelTaskRequestSchema, async (t, r) => {
          try {
            let task = await this._taskStore.getTask(t.params.taskId, r.sessionId);
            if (!task) throw new McpError(ErrorCode.InvalidParams, `Task not found: ${t.params.taskId}`);
            if (T(task.status))
              throw new McpError(
                ErrorCode.InvalidParams,
                `Cannot cancel task in terminal status: ${task.status}`,
              );
            (await this._taskStore.updateTaskStatus(
              t.params.taskId,
              "cancelled",
              "Client cancelled task execution.",
              r.sessionId,
            ),
              this._clearTaskQueue(t.params.taskId));
            let task_2 = await this._taskStore.getTask(t.params.taskId, r.sessionId);
            if (!task_2)
              throw new McpError(
                ErrorCode.InvalidParams,
                `Task not found after cancellation: ${t.params.taskId}`,
              );
            return { _meta: {}, ...task_2 };
          } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }));
  }
  async _oncancel(e) {
    if (!e.params.requestId) return;
    this._requestHandlerAbortControllers.get(e.params.requestId)?.abort(e.params.reason);
  }
  _setupTimeout(e, t, r, a, n = !1) {
    this._timeoutInfo.set(e, {
      timeoutId: setTimeout(a, t),
      startTime: Date.now(),
      timeout: t,
      maxTotalTimeout: r,
      resetTimeoutOnProgress: n,
      onTimeout: a,
    });
  }
  _resetTimeout(e) {
    let t = this._timeoutInfo.get(e);
    if (!t) return !1;
    let r = Date.now() - t.startTime;
    if (t.maxTotalTimeout && r >= t.maxTotalTimeout)
      throw (
        this._timeoutInfo.delete(e),
        McpError.fromError(ErrorCode.RequestTimeout, "Maximum total timeout exceeded", {
          maxTotalTimeout: t.maxTotalTimeout,
          totalElapsed: r,
        })
      );
    return (clearTimeout(t.timeoutId), (t.timeoutId = setTimeout(t.onTimeout, t.timeout)), !0);
  }
  _cleanupTimeout(e) {
    let t = this._timeoutInfo.get(e);
    if (t) (clearTimeout(t.timeoutId), this._timeoutInfo.delete(e));
  }
  async connect(e) {
    if (this._transport)
      throw Error(
        "Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.",
      );
    this._transport = e;
    let t = this.transport?.onclose;
    this._transport.onclose = () => {
      (t?.(), this._onclose());
    };
    let r = this.transport?.onerror;
    this._transport.onerror = (n) => {
      (r?.(n), this._onerror(n));
    };
    let a = this._transport?.onmessage;
    ((this._transport.onmessage = (n, s) => {
      if ((a?.(n, s), isJSONRPCResultResponse(n) || isJSONRPCErrorResponse(n))) this._onresponse(n);
      else if (isJSONRPCRequest(n)) this._onrequest(n, s);
      else if (isJSONRPCNotification(n)) this._onnotification(n);
      else this._onerror(Error(`Unknown message type: ${JSON.stringify(n)}`));
    }),
      await this._transport.start());
  }
  _onclose() {
    let _responseHandlers = this._responseHandlers;
    ((this._responseHandlers = new Map()),
      this._progressHandlers.clear(),
      this._taskProgressTokens.clear(),
      this._pendingDebouncedNotifications.clear());
    for (let r of this._timeoutInfo.values()) clearTimeout(r.timeoutId);
    this._timeoutInfo.clear();
    for (let r of this._requestHandlerAbortControllers.values()) r.abort();
    this._requestHandlerAbortControllers.clear();
    let fromError = McpError.fromError(ErrorCode.ConnectionClosed, "Connection closed");
    ((this._transport = void 0), this.onclose?.());
    for (let r of _responseHandlers.values()) r(fromError);
  }
  _onerror(e) {
    this.onerror?.(e);
  }
  _onnotification(e) {
    let t = this._notificationHandlers.get(e.method) ?? this.fallbackNotificationHandler;
    if (t === void 0) return;
    Promise.resolve()
      .then(() => t(e))
      .catch((r) => this._onerror(Error(`Uncaught error in notification handler: ${r}`)));
  }
  _onrequest(e, t) {
    let r = this._requestHandlers.get(e.method) ?? this.fallbackRequestHandler,
      _transport = this._transport,
      n = e.params?._meta?.[RELATED_TASK_META_KEY]?.taskId;
    if (r === void 0) {
      let i = {
        jsonrpc: "2.0",
        id: e.id,
        error: { code: ErrorCode.MethodNotFound, message: "Method not found" },
      };
      if (n && this._taskMessageQueue)
        this._enqueueTaskMessage(
          n,
          { type: "error", message: i, timestamp: Date.now() },
          _transport?.sessionId,
        ).catch((c) => this._onerror(Error(`Failed to enqueue error response: ${c}`)));
      else _transport?.send(i).catch((c) => this._onerror(Error(`Failed to send an error response: ${c}`)));
      return;
    }
    let abortController = new AbortController();
    this._requestHandlerAbortControllers.set(e.id, abortController);
    let o = isTaskAugmentedRequestParams(e.params) ? e.params.task : void 0,
      u = this._taskStore ? this.requestTaskStore(e, _transport?.sessionId) : void 0,
      p = {
        signal: abortController.signal,
        sessionId: _transport?.sessionId,
        _meta: e.params?._meta,
        sendNotification: async (i) => {
          if (abortController.signal.aborted) return;
          let c = { relatedRequestId: e.id };
          if (n) c.relatedTask = { taskId: n };
          await this.notification(i, c);
        },
        sendRequest: async (i, c, d) => {
          if (abortController.signal.aborted)
            throw new McpError(ErrorCode.ConnectionClosed, "Request was cancelled");
          let f = { ...d, relatedRequestId: e.id };
          if (n && !f.relatedTask) f.relatedTask = { taskId: n };
          let m = f.relatedTask?.taskId ?? n;
          if (m && u) await u.updateTaskStatus(m, "input_required");
          return await this.request(i, c, f);
        },
        authInfo: t?.authInfo,
        requestId: e.id,
        requestInfo: t?.requestInfo,
        taskId: n,
        taskStore: u,
        taskRequestedTtl: o?.ttl,
        closeSSEStream: t?.closeSSEStream,
        closeStandaloneSSEStream: t?.closeStandaloneSSEStream,
      };
    Promise.resolve()
      .then(() => {
        if (o) this.assertTaskHandlerCapability(e.method);
      })
      .then(() => r(e, p))
      .then(
        async (i) => {
          if (abortController.signal.aborted) return;
          let c = { result: i, jsonrpc: "2.0", id: e.id };
          if (n && this._taskMessageQueue)
            await this._enqueueTaskMessage(
              n,
              { type: "response", message: c, timestamp: Date.now() },
              _transport?.sessionId,
            );
          else await _transport?.send(c);
        },
        async (i) => {
          if (abortController.signal.aborted) return;
          let c = {
            jsonrpc: "2.0",
            id: e.id,
            error: {
              code: Number.isSafeInteger(i.code) ? i.code : ErrorCode.InternalError,
              message: i.message ?? "Internal error",
              ...(i.data !== void 0 && { data: i.data }),
            },
          };
          if (n && this._taskMessageQueue)
            await this._enqueueTaskMessage(
              n,
              { type: "error", message: c, timestamp: Date.now() },
              _transport?.sessionId,
            );
          else await _transport?.send(c);
        },
      )
      .catch((i) => this._onerror(Error(`Failed to send response: ${i}`)))
      .finally(() => {
        if (this._requestHandlerAbortControllers.get(e.id) === abortController)
          this._requestHandlerAbortControllers.delete(e.id);
      });
  }
  _onprogress(e) {
    let { progressToken: progressToken, ...r } = e.params,
      a = Number(progressToken),
      n = this._progressHandlers.get(a);
    if (!n) {
      this._onerror(Error(`Received a progress notification for an unknown token: ${JSON.stringify(e)}`));
      return;
    }
    let s = this._responseHandlers.get(a),
      o = this._timeoutInfo.get(a);
    if (o && s && o.resetTimeoutOnProgress)
      try {
        this._resetTimeout(a);
      } catch (error) {
        (this._responseHandlers.delete(a),
          this._progressHandlers.delete(a),
          this._cleanupTimeout(a),
          s(error));
        return;
      }
    n(r);
  }
  _onresponse(e) {
    let t = Number(e.id),
      r = this._requestResolvers.get(t);
    if (r) {
      if ((this._requestResolvers.delete(t), isJSONRPCResultResponse(e))) r(e);
      else {
        let s = new McpError(e.error.code, e.error.message, e.error.data);
        r(s);
      }
      return;
    }
    let a = this._responseHandlers.get(t);
    if (a === void 0) {
      this._onerror(Error(`Received a response for an unknown message ID: ${JSON.stringify(e)}`));
      return;
    }
    (this._responseHandlers.delete(t), this._cleanupTimeout(t));
    let n = !1;
    if (isJSONRPCResultResponse(e) && e.result && typeof e.result === "object") {
      let s = e.result;
      if (s.task && typeof s.task === "object") {
        let task = s.task;
        if (typeof task.taskId === "string") ((n = !0), this._taskProgressTokens.set(task.taskId, t));
      }
    }
    if (!n) this._progressHandlers.delete(t);
    if (isJSONRPCResultResponse(e)) a(e);
    else {
      let fromError = McpError.fromError(e.error.code, e.error.message, e.error.data);
      a(fromError);
    }
  }
  get transport() {
    return this._transport;
  }
  async close() {
    await this._transport?.close();
  }
  async *requestStream(e, t, r) {
    let { task: task } = r ?? {};
    if (!task) {
      try {
        yield { type: "result", result: await this.request(e, t, r) };
      } catch (error) {
        yield {
          type: "error",
          error: error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error)),
        };
      }
      return;
    }
    let n;
    try {
      let request = await this.request(e, CreateTaskResultSchema, r);
      if (request.task) ((n = request.task.taskId), yield { type: "taskCreated", task: request.task });
      else throw new McpError(ErrorCode.InternalError, "Task creation did not return a task");
      while (!0) {
        let task = await this.getTask({ taskId: n }, r);
        if ((yield { type: "taskStatus", task: task }, T(task.status))) {
          if (task.status === "completed")
            yield { type: "result", result: await this.getTaskResult({ taskId: n }, t, r) };
          else if (task.status === "failed")
            yield { type: "error", error: new McpError(ErrorCode.InternalError, `Task ${n} failed`) };
          else if (task.status === "cancelled")
            yield { type: "error", error: new McpError(ErrorCode.InternalError, `Task ${n} was cancelled`) };
          return;
        }
        if (task.status === "input_required") {
          yield { type: "result", result: await this.getTaskResult({ taskId: n }, t, r) };
          return;
        }
        let u = task.pollInterval ?? this._options?.defaultTaskPollInterval ?? 1000;
        (await new Promise((p) => setTimeout(p, u)), r?.signal?.throwIfAborted());
      }
    } catch (error) {
      yield {
        type: "error",
        error: error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error)),
      };
    }
  }
  request(e, t, r) {
    let {
      relatedRequestId: relatedRequestId,
      resumptionToken: resumptionToken,
      onresumptiontoken: onresumptiontoken,
      task: task,
      relatedTask: relatedTask,
    } = r ?? {};
    return new Promise((p, i) => {
      let c = (g) => {
        i(g);
      };
      if (!this._transport) {
        c(Error("Not connected"));
        return;
      }
      if (this._options?.enforceStrictCapabilities === !0)
        try {
          if ((this.assertCapabilityForMethod(e.method), task)) this.assertTaskCapability(e.method);
        } catch (error) {
          c(error);
          return;
        }
      r?.signal?.throwIfAborted();
      let d = this._requestMessageId++,
        f = { ...e, jsonrpc: "2.0", id: d };
      if (r?.onprogress)
        (this._progressHandlers.set(d, r.onprogress),
          (f.params = { ...e.params, _meta: { ...(e.params?._meta || {}), progressToken: d } }));
      if (task) f.params = { ...f.params, task: task };
      if (relatedTask)
        f.params = {
          ...f.params,
          _meta: { ...(f.params?._meta || {}), [RELATED_TASK_META_KEY]: relatedTask },
        };
      let m = (g) => {
        (this._responseHandlers.delete(d),
          this._progressHandlers.delete(d),
          this._cleanupTimeout(d),
          this._transport
            ?.send(
              {
                jsonrpc: "2.0",
                method: "notifications/cancelled",
                params: { requestId: d, reason: String(g) },
              },
              {
                relatedRequestId: relatedRequestId,
                resumptionToken: resumptionToken,
                onresumptiontoken: onresumptiontoken,
              },
            )
            .catch((D) => this._onerror(Error(`Failed to send cancellation: ${D}`))));
        let _ = g instanceof McpError ? g : new McpError(ErrorCode.RequestTimeout, String(g));
        i(_);
      };
      (this._responseHandlers.set(d, (g) => {
        if (r?.signal?.aborted) return;
        if (g instanceof Error) return i(g);
        try {
          let _ = q7(t, g.result);
          if (!_.success) i(_.error);
          else p(_.data);
        } catch (error) {
          i(error);
        }
      }),
        r?.signal?.addEventListener("abort", () => {
          m(r?.signal?.reason);
        }));
      let A = r?.timeout ?? ye,
        ce = () => m(McpError.fromError(ErrorCode.RequestTimeout, "Request timed out", { timeout: A }));
      this._setupTimeout(d, A, r?.maxTotalTimeout, ce, r?.resetTimeoutOnProgress ?? !1);
      let F = relatedTask?.taskId;
      if (F) {
        let g = (_) => {
          let D = this._responseHandlers.get(d);
          if (D) D(_);
          else this._onerror(Error(`Response handler missing for side-channeled request ${d}`));
        };
        (this._requestResolvers.set(d, g),
          this._enqueueTaskMessage(F, { type: "request", message: f, timestamp: Date.now() }).catch((_) => {
            (this._cleanupTimeout(d), i(_));
          }));
      } else
        this._transport
          .send(f, {
            relatedRequestId: relatedRequestId,
            resumptionToken: resumptionToken,
            onresumptiontoken: onresumptiontoken,
          })
          .catch((g) => {
            (this._cleanupTimeout(d), i(g));
          });
    });
  }
  async getTask(e, t) {
    return this.request({ method: "tasks/get", params: e }, GetTaskResultSchema, t);
  }
  async getTaskResult(e, t, r) {
    return this.request({ method: "tasks/result", params: e }, t, r);
  }
  async listTasks(e, t) {
    return this.request({ method: "tasks/list", params: e }, ListTasksResultSchema, t);
  }
  async cancelTask(e, t) {
    return this.request({ method: "tasks/cancel", params: e }, CancelTaskResultSchema, t);
  }
  async notification(e, t) {
    if (!this._transport) throw Error("Not connected");
    this.assertNotificationCapability(e.method);
    let r = t?.relatedTask?.taskId;
    if (r) {
      let o = {
        ...e,
        jsonrpc: "2.0",
        params: {
          ...e.params,
          _meta: { ...(e.params?._meta || {}), [RELATED_TASK_META_KEY]: t.relatedTask },
        },
      };
      await this._enqueueTaskMessage(r, { type: "notification", message: o, timestamp: Date.now() });
      return;
    }
    if (
      (this._options?.debouncedNotificationMethods ?? []).includes(e.method) &&
      !e.params &&
      !t?.relatedRequestId &&
      !t?.relatedTask
    ) {
      if (this._pendingDebouncedNotifications.has(e.method)) return;
      (this._pendingDebouncedNotifications.add(e.method),
        Promise.resolve().then(() => {
          if ((this._pendingDebouncedNotifications.delete(e.method), !this._transport)) return;
          let o = { ...e, jsonrpc: "2.0" };
          if (t?.relatedTask)
            o = {
              ...o,
              params: {
                ...o.params,
                _meta: { ...(o.params?._meta || {}), [RELATED_TASK_META_KEY]: t.relatedTask },
              },
            };
          this._transport?.send(o, t).catch((u) => this._onerror(u));
        }));
      return;
    }
    let s = { ...e, jsonrpc: "2.0" };
    if (t?.relatedTask)
      s = {
        ...s,
        params: {
          ...s.params,
          _meta: { ...(s.params?._meta || {}), [RELATED_TASK_META_KEY]: t.relatedTask },
        },
      };
    await this._transport.send(s, t);
  }
  setRequestHandler(e, t) {
    let r = R(e);
    (this.assertRequestHandlerCapability(r),
      this._requestHandlers.set(r, (a, n) => {
        let s = z(e, a);
        return Promise.resolve(t(s, n));
      }));
  }
  removeRequestHandler(e) {
    this._requestHandlers.delete(e);
  }
  assertCanSetRequestHandler(e) {
    if (this._requestHandlers.has(e))
      throw Error(`A request handler for ${e} already exists, which would be overridden`);
  }
  setNotificationHandler(e, t) {
    let r = R(e);
    this._notificationHandlers.set(r, (a) => {
      let n = z(e, a);
      return Promise.resolve(t(n));
    });
  }
  removeNotificationHandler(e) {
    this._notificationHandlers.delete(e);
  }
  _cleanupTaskProgressHandler(e) {
    let t = this._taskProgressTokens.get(e);
    if (t !== void 0) (this._progressHandlers.delete(t), this._taskProgressTokens.delete(e));
  }
  async _enqueueTaskMessage(e, t, r) {
    if (!this._taskStore || !this._taskMessageQueue)
      throw Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");
    let a = this._options?.maxTaskQueueSize;
    await this._taskMessageQueue.enqueue(e, t, r, a);
  }
  async _clearTaskQueue(e, t) {
    if (this._taskMessageQueue) {
      let dequeueAll = await this._taskMessageQueue.dequeueAll(e, t);
      for (let a of dequeueAll)
        if (a.type === "request" && isJSONRPCRequest(a.message)) {
          let id = a.message.id,
            s = this._requestResolvers.get(id);
          if (s)
            (s(new McpError(ErrorCode.InternalError, "Task cancelled or completed")),
              this._requestResolvers.delete(id));
          else this._onerror(Error(`Resolver missing for request ${id} during task ${e} cleanup`));
        }
    }
  }
  async _waitForTaskUpdate(e, t) {
    let r = this._options?.defaultTaskPollInterval ?? 1000;
    try {
      let a = await this._taskStore?.getTask(e);
      if (a?.pollInterval) r = a.pollInterval;
    } catch {}
    return new Promise((a, n) => {
      if (t.aborted) {
        n(new McpError(ErrorCode.InvalidRequest, "Request cancelled"));
        return;
      }
      let s = setTimeout(a, r);
      t.addEventListener(
        "abort",
        () => {
          (clearTimeout(s), n(new McpError(ErrorCode.InvalidRequest, "Request cancelled")));
        },
        { once: !0 },
      );
    });
  }
  requestTaskStore(e, t) {
    let _taskStore = this._taskStore;
    if (!_taskStore) throw Error("No task store configured");
    return {
      createTask: async (a) => {
        if (!e) throw Error("No request provided");
        return await _taskStore.createTask(a, e.id, { method: e.method, params: e.params }, t);
      },
      getTask: async (a) => {
        let task = await _taskStore.getTask(a, t);
        if (!task) throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
        return task;
      },
      storeTaskResult: async (a, n, s) => {
        await _taskStore.storeTaskResult(a, n, s, t);
        let task = await _taskStore.getTask(a, t);
        if (task) {
          let parse = TaskStatusNotificationSchema.parse({
            method: "notifications/tasks/status",
            params: task,
          });
          if ((await this.notification(parse), T(task.status))) this._cleanupTaskProgressHandler(a);
        }
      },
      getTaskResult: (a) => _taskStore.getTaskResult(a, t),
      updateTaskStatus: async (a, n, s) => {
        let task = await _taskStore.getTask(a, t);
        if (!task)
          throw new McpError(ErrorCode.InvalidParams, `Task "${a}" not found - it may have been cleaned up`);
        if (T(task.status))
          throw new McpError(
            ErrorCode.InvalidParams,
            `Cannot update task "${a}" from terminal status "${task.status}" to "${n}". Terminal states (completed, failed, cancelled) cannot transition to other states.`,
          );
        await _taskStore.updateTaskStatus(a, n, s, t);
        let task_2 = await _taskStore.getTask(a, t);
        if (task_2) {
          let parse = TaskStatusNotificationSchema.parse({
            method: "notifications/tasks/status",
            params: task_2,
          });
          if ((await this.notification(parse), T(task_2.status))) this._cleanupTaskProgressHandler(a);
        }
      },
      listTasks: (a) => _taskStore.listTasks(a, t),
    };
  }
}
//@ chunk-zykv69v4.js:27504-27574 esm-fingerprint
function L(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}

export { Wsn, L };
