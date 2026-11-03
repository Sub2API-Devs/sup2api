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
import { isTerminal } from "../../cjs/experimental/tasks/interfaces.js";
import { objectFromShape } from "../server/zod-compat.js";
import { R, parseWithCompat } from "../server/zod-json-schema-compat.js";

//@ chunk-zykv69v4.js:11497-11510 esm-fingerprint
var DEFAULT_REQUEST_TIMEOUT_MSEC = 60000;
//@ chunk-zykv69v4.js:11510-27504 esm-fingerprint
class Protocol {
  constructor(_options) {
    this._options = _options;
    this._requestMessageId = 0;
    this._requestHandlers = new Map();
    this._requestHandlerAbortControllers = new Map();
    this._notificationHandlers = new Map();
    this._responseHandlers = new Map();
    this._progressHandlers = new Map();
    this._timeoutInfo = new Map();
    this._pendingDebouncedNotifications = new Set();
    this._taskProgressTokens = new Map();
    this._requestResolvers = new Map();
    this.setNotificationHandler(CancelledNotificationSchema, (notification) => {
      this._oncancel(notification);
    });
    this.setNotificationHandler(ProgressNotificationSchema, (notification) => {
      this._onprogress(notification);
    });
    this.setRequestHandler(PingRequestSchema, (_request) => ({}));
    this._taskStore = _options?.taskStore;
    this._taskMessageQueue = _options?.taskMessageQueue;
    if (this._taskStore) {
      this.setRequestHandler(GetTaskRequestSchema, async (request, extra) => {
        let task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
        if (!task) throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
        return {
          ...task,
        };
      });
      this.setRequestHandler(GetTaskPayloadRequestSchema, async (request, extra) => {
        let handleTaskResult = async () => {
          let taskId = request.params.taskId;
          if (this._taskMessageQueue) {
            let queuedMessage;
            while ((queuedMessage = await this._taskMessageQueue.dequeue(taskId, extra.sessionId))) {
              if (queuedMessage.type === "response" || queuedMessage.type === "error") {
                let message = queuedMessage.message;
                let requestId = message.id;
                let resolver = this._requestResolvers.get(requestId);
                if (resolver) {
                  this._requestResolvers.delete(requestId);
                  if (queuedMessage.type === "response") resolver(message);
                  else {
                    let errorMessage = message;
                    let error = new McpError(
                      errorMessage.error.code,
                      errorMessage.error.message,
                      errorMessage.error.data,
                    );
                    resolver(error);
                  }
                } else {
                  let messageType = queuedMessage.type === "response" ? "Response" : "Error";
                  this._onerror(Error(`${messageType} handler missing for request ${requestId}`));
                }
                continue;
              }
              await this._transport?.send(queuedMessage.message, {
                relatedRequestId: extra.requestId,
              });
            }
          }
          let task = await this._taskStore.getTask(taskId, extra.sessionId);
          if (!task) throw new McpError(ErrorCode.InvalidParams, `Task not found: ${taskId}`);
          if (!isTerminal(task.status)) {
            await this._waitForTaskUpdate(taskId, extra.signal);
            return await handleTaskResult();
          }
          if (isTerminal(task.status)) {
            let result = await this._taskStore.getTaskResult(taskId, extra.sessionId);
            this._clearTaskQueue(taskId);
            return {
              ...result,
              _meta: {
                ...result._meta,
                [RELATED_TASK_META_KEY]: {
                  taskId,
                },
              },
            };
          }
          return await handleTaskResult();
        };
        return await handleTaskResult();
      });
      this.setRequestHandler(ListTasksRequestSchema, async (request, extra) => {
        try {
          let { tasks, nextCursor } = await this._taskStore.listTasks(
            request.params?.cursor,
            extra.sessionId,
          );
          return {
            tasks,
            nextCursor,
            _meta: {},
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });
      this.setRequestHandler(CancelTaskRequestSchema, async (request, extra) => {
        try {
          let task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
          if (!task) throw new McpError(ErrorCode.InvalidParams, `Task not found: ${request.params.taskId}`);
          if (isTerminal(task.status))
            throw new McpError(
              ErrorCode.InvalidParams,
              `Cannot cancel task in terminal status: ${task.status}`,
            );
          await this._taskStore.updateTaskStatus(
            request.params.taskId,
            "cancelled",
            "Client cancelled task execution.",
            extra.sessionId,
          );
          this._clearTaskQueue(request.params.taskId);
          let cancelledTask = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
          if (!cancelledTask)
            throw new McpError(
              ErrorCode.InvalidParams,
              `Task not found after cancellation: ${request.params.taskId}`,
            );
          return {
            _meta: {},
            ...cancelledTask,
          };
        } catch (error) {
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });
    }
  }
  async _oncancel(notification) {
    if (!notification.params.requestId) return;
    this._requestHandlerAbortControllers
      .get(notification.params.requestId)
      ?.abort(notification.params.reason);
  }
  _setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
    this._timeoutInfo.set(messageId, {
      timeoutId: setTimeout(onTimeout, timeout),
      startTime: Date.now(),
      timeout,
      maxTotalTimeout,
      resetTimeoutOnProgress,
      onTimeout,
    });
  }
  _resetTimeout(messageId) {
    let info = this._timeoutInfo.get(messageId);
    if (!info) return false;
    let totalElapsed = Date.now() - info.startTime;
    if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
      this._timeoutInfo.delete(messageId);
      throw McpError.fromError(ErrorCode.RequestTimeout, "Maximum total timeout exceeded", {
        maxTotalTimeout: info.maxTotalTimeout,
        totalElapsed,
      });
    }
    clearTimeout(info.timeoutId);
    info.timeoutId = setTimeout(info.onTimeout, info.timeout);
    return true;
  }
  _cleanupTimeout(messageId) {
    let info = this._timeoutInfo.get(messageId);
    if (info) {
      clearTimeout(info.timeoutId);
      this._timeoutInfo.delete(messageId);
    }
  }
  async connect(transport) {
    if (this._transport)
      throw Error(
        "Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.",
      );
    this._transport = transport;
    let _onclose = this.transport?.onclose;
    this._transport.onclose = () => {
      _onclose?.();
      this._onclose();
    };
    let _onerror = this.transport?.onerror;
    this._transport.onerror = (error) => {
      _onerror?.(error);
      this._onerror(error);
    };
    let _onmessage = this._transport?.onmessage;
    this._transport.onmessage = (message, extra) => {
      _onmessage?.(message, extra);
      if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) this._onresponse(message);
      else if (isJSONRPCRequest(message)) this._onrequest(message, extra);
      else if (isJSONRPCNotification(message)) this._onnotification(message);
      else this._onerror(Error(`Unknown message type: ${JSON.stringify(message)}`));
    };
    await this._transport.start();
  }
  _onclose() {
    let responseHandlers = this._responseHandlers;
    this._responseHandlers = new Map();
    this._progressHandlers.clear();
    this._taskProgressTokens.clear();
    this._pendingDebouncedNotifications.clear();
    for (let info of this._timeoutInfo.values()) clearTimeout(info.timeoutId);
    this._timeoutInfo.clear();
    for (let controller of this._requestHandlerAbortControllers.values()) controller.abort();
    this._requestHandlerAbortControllers.clear();
    let error = McpError.fromError(ErrorCode.ConnectionClosed, "Connection closed");
    this._transport = undefined;
    this.onclose?.();
    for (let handler of responseHandlers.values()) handler(error);
  }
  _onerror(error) {
    this.onerror?.(error);
  }
  _onnotification(notification) {
    let handler = this._notificationHandlers.get(notification.method) ?? this.fallbackNotificationHandler;
    if (handler === undefined) return;
    Promise.resolve()
      .then(() => handler(notification))
      .catch((error) => this._onerror(Error(`Uncaught error in notification handler: ${error}`)));
  }
  _onrequest(request, extra) {
    let handler = this._requestHandlers.get(request.method) ?? this.fallbackRequestHandler;
    let capturedTransport = this._transport;
    let relatedTaskId = request.params?._meta?.[RELATED_TASK_META_KEY]?.taskId;
    if (handler === undefined) {
      let errorResponse = {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: ErrorCode.MethodNotFound,
          message: "Method not found",
        },
      };
      if (relatedTaskId && this._taskMessageQueue)
        this._enqueueTaskMessage(
          relatedTaskId,
          {
            type: "error",
            message: errorResponse,
            timestamp: Date.now(),
          },
          capturedTransport?.sessionId,
        ).catch((error) => this._onerror(Error(`Failed to enqueue error response: ${error}`)));
      else
        capturedTransport
          ?.send(errorResponse)
          .catch((error) => this._onerror(Error(`Failed to send an error response: ${error}`)));
      return;
    }
    let abortController = new AbortController();
    this._requestHandlerAbortControllers.set(request.id, abortController);
    let taskCreationParams = isTaskAugmentedRequestParams(request.params) ? request.params.task : undefined;
    let taskStore = this._taskStore
      ? this.requestTaskStore(request, capturedTransport?.sessionId)
      : undefined;
    let fullExtra = {
      signal: abortController.signal,
      sessionId: capturedTransport?.sessionId,
      _meta: request.params?._meta,
      sendNotification: async (notification) => {
        if (abortController.signal.aborted) return;
        let notificationOptions = {
          relatedRequestId: request.id,
        };
        if (relatedTaskId)
          notificationOptions.relatedTask = {
            taskId: relatedTaskId,
          };
        await this.notification(notification, notificationOptions);
      },
      sendRequest: async (r, resultSchema, options) => {
        if (abortController.signal.aborted)
          throw new McpError(ErrorCode.ConnectionClosed, "Request was cancelled");
        let requestOptions = {
          ...options,
          relatedRequestId: request.id,
        };
        if (relatedTaskId && !requestOptions.relatedTask)
          requestOptions.relatedTask = {
            taskId: relatedTaskId,
          };
        let effectiveTaskId = requestOptions.relatedTask?.taskId ?? relatedTaskId;
        if (effectiveTaskId && taskStore) await taskStore.updateTaskStatus(effectiveTaskId, "input_required");
        return await this.request(r, resultSchema, requestOptions);
      },
      authInfo: extra?.authInfo,
      requestId: request.id,
      requestInfo: extra?.requestInfo,
      taskId: relatedTaskId,
      taskStore,
      taskRequestedTtl: taskCreationParams?.ttl,
      closeSSEStream: extra?.closeSSEStream,
      closeStandaloneSSEStream: extra?.closeStandaloneSSEStream,
    };
    Promise.resolve()
      .then(() => {
        if (taskCreationParams) this.assertTaskHandlerCapability(request.method);
      })
      .then(() => handler(request, fullExtra))
      .then(
        async (result) => {
          if (abortController.signal.aborted) return;
          let response = {
            result,
            jsonrpc: "2.0",
            id: request.id,
          };
          if (relatedTaskId && this._taskMessageQueue)
            await this._enqueueTaskMessage(
              relatedTaskId,
              {
                type: "response",
                message: response,
                timestamp: Date.now(),
              },
              capturedTransport?.sessionId,
            );
          else await capturedTransport?.send(response);
        },
        async (error) => {
          if (abortController.signal.aborted) return;
          let errorResponse = {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: Number.isSafeInteger(error.code) ? error.code : ErrorCode.InternalError,
              message: error.message ?? "Internal error",
              ...(error.data !== undefined && {
                data: error.data,
              }),
            },
          };
          if (relatedTaskId && this._taskMessageQueue)
            await this._enqueueTaskMessage(
              relatedTaskId,
              {
                type: "error",
                message: errorResponse,
                timestamp: Date.now(),
              },
              capturedTransport?.sessionId,
            );
          else await capturedTransport?.send(errorResponse);
        },
      )
      .catch((error) => this._onerror(Error(`Failed to send response: ${error}`)))
      .finally(() => {
        if (this._requestHandlerAbortControllers.get(request.id) === abortController)
          this._requestHandlerAbortControllers.delete(request.id);
      });
  }
  _onprogress(notification) {
    let { progressToken, ...params } = notification.params;
    let messageId = Number(progressToken);
    let handler = this._progressHandlers.get(messageId);
    if (!handler) {
      this._onerror(
        Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`),
      );
      return;
    }
    let responseHandler = this._responseHandlers.get(messageId);
    let timeoutInfo = this._timeoutInfo.get(messageId);
    if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress)
      try {
        this._resetTimeout(messageId);
      } catch (error) {
        this._responseHandlers.delete(messageId);
        this._progressHandlers.delete(messageId);
        this._cleanupTimeout(messageId);
        responseHandler(error);
        return;
      }
    handler(params);
  }
  _onresponse(response) {
    let messageId = Number(response.id);
    let resolver = this._requestResolvers.get(messageId);
    if (resolver) {
      this._requestResolvers.delete(messageId);
      if (isJSONRPCResultResponse(response)) resolver(response);
      else {
        let error = new McpError(response.error.code, response.error.message, response.error.data);
        resolver(error);
      }
      return;
    }
    let handler = this._responseHandlers.get(messageId);
    if (handler === undefined) {
      this._onerror(Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
      return;
    }
    this._responseHandlers.delete(messageId);
    this._cleanupTimeout(messageId);
    let isTaskResponse = false;
    if (isJSONRPCResultResponse(response) && response.result && typeof response.result === "object") {
      let result = response.result;
      if (result.task && typeof result.task === "object") {
        let task = result.task;
        if (typeof task.taskId === "string") {
          isTaskResponse = true;
          this._taskProgressTokens.set(task.taskId, messageId);
        }
      }
    }
    if (!isTaskResponse) this._progressHandlers.delete(messageId);
    if (isJSONRPCResultResponse(response)) handler(response);
    else {
      let error = McpError.fromError(response.error.code, response.error.message, response.error.data);
      handler(error);
    }
  }
  get transport() {
    return this._transport;
  }
  async close() {
    await this._transport?.close();
  }
  async *requestStream(request, resultSchema, options) {
    let { task } = options ?? {};
    if (!task) {
      try {
        yield {
          type: "result",
          result: await this.request(request, resultSchema, options),
        };
      } catch (error) {
        yield {
          type: "error",
          error: error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error)),
        };
      }
      return;
    }
    let taskId;
    try {
      let createResult = await this.request(request, CreateTaskResultSchema, options);
      if (createResult.task) {
        taskId = createResult.task.taskId;
        yield {
          type: "taskCreated",
          task: createResult.task,
        };
      } else throw new McpError(ErrorCode.InternalError, "Task creation did not return a task");
      while (true) {
        let task = await this.getTask(
          {
            taskId,
          },
          options,
        );
        yield {
          type: "taskStatus",
          task,
        };
        if (isTerminal(task.status)) {
          if (task.status === "completed")
            yield {
              type: "result",
              result: await this.getTaskResult(
                {
                  taskId,
                },
                resultSchema,
                options,
              ),
            };
          else if (task.status === "failed")
            yield {
              type: "error",
              error: new McpError(ErrorCode.InternalError, `Task ${taskId} failed`),
            };
          else if (task.status === "cancelled")
            yield {
              type: "error",
              error: new McpError(ErrorCode.InternalError, `Task ${taskId} was cancelled`),
            };
          return;
        }
        if (task.status === "input_required") {
          yield {
            type: "result",
            result: await this.getTaskResult(
              {
                taskId,
              },
              resultSchema,
              options,
            ),
          };
          return;
        }
        let pollInterval = task.pollInterval ?? this._options?.defaultTaskPollInterval ?? 1000;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        options?.signal?.throwIfAborted();
      }
    } catch (error) {
      yield {
        type: "error",
        error: error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error)),
      };
    }
  }
  request(request, resultSchema, options) {
    let { relatedRequestId, resumptionToken, onresumptiontoken, task, relatedTask } = options ?? {};
    return new Promise((resolve, reject) => {
      let earlyReject = (error) => {
        reject(error);
      };
      if (!this._transport) {
        earlyReject(Error("Not connected"));
        return;
      }
      if (this._options?.enforceStrictCapabilities === true)
        try {
          this.assertCapabilityForMethod(request.method);
          if (task) this.assertTaskCapability(request.method);
        } catch (e) {
          earlyReject(e);
          return;
        }
      options?.signal?.throwIfAborted();
      let messageId = this._requestMessageId++;
      let jsonrpcRequest = {
        ...request,
        jsonrpc: "2.0",
        id: messageId,
      };
      if (options?.onprogress) {
        this._progressHandlers.set(messageId, options.onprogress);
        jsonrpcRequest.params = {
          ...request.params,
          _meta: {
            ...(request.params?._meta || {}),
            progressToken: messageId,
          },
        };
      }
      if (task)
        jsonrpcRequest.params = {
          ...jsonrpcRequest.params,
          task,
        };
      if (relatedTask)
        jsonrpcRequest.params = {
          ...jsonrpcRequest.params,
          _meta: {
            ...(jsonrpcRequest.params?._meta || {}),
            [RELATED_TASK_META_KEY]: relatedTask,
          },
        };
      let cancel = (reason) => {
        this._responseHandlers.delete(messageId);
        this._progressHandlers.delete(messageId);
        this._cleanupTimeout(messageId);
        this._transport
          ?.send(
            {
              jsonrpc: "2.0",
              method: "notifications/cancelled",
              params: {
                requestId: messageId,
                reason: String(reason),
              },
            },
            {
              relatedRequestId,
              resumptionToken,
              onresumptiontoken,
            },
          )
          .catch((error) => this._onerror(Error(`Failed to send cancellation: ${error}`)));
        let error =
          reason instanceof McpError ? reason : new McpError(ErrorCode.RequestTimeout, String(reason));
        reject(error);
      };
      this._responseHandlers.set(messageId, (response) => {
        if (options?.signal?.aborted) return;
        if (response instanceof Error) return reject(response);
        try {
          let parseResult = objectFromShape(resultSchema, response.result);
          if (!parseResult.success) reject(parseResult.error);
          else resolve(parseResult.data);
        } catch (error) {
          reject(error);
        }
      });
      options?.signal?.addEventListener("abort", () => {
        cancel(options?.signal?.reason);
      });
      let timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MSEC;
      let timeoutHandler = () =>
        cancel(
          McpError.fromError(ErrorCode.RequestTimeout, "Request timed out", {
            timeout,
          }),
        );
      this._setupTimeout(
        messageId,
        timeout,
        options?.maxTotalTimeout,
        timeoutHandler,
        options?.resetTimeoutOnProgress ?? false,
      );
      let relatedTaskId = relatedTask?.taskId;
      if (relatedTaskId) {
        let responseResolver = (response) => {
          let handler = this._responseHandlers.get(messageId);
          if (handler) handler(response);
          else this._onerror(Error(`Response handler missing for side-channeled request ${messageId}`));
        };
        this._requestResolvers.set(messageId, responseResolver);
        this._enqueueTaskMessage(relatedTaskId, {
          type: "request",
          message: jsonrpcRequest,
          timestamp: Date.now(),
        }).catch((error) => {
          this._cleanupTimeout(messageId);
          reject(error);
        });
      } else
        this._transport
          .send(jsonrpcRequest, {
            relatedRequestId,
            resumptionToken,
            onresumptiontoken,
          })
          .catch((error) => {
            this._cleanupTimeout(messageId);
            reject(error);
          });
    });
  }
  async getTask(params, options) {
    return this.request(
      {
        method: "tasks/get",
        params,
      },
      GetTaskResultSchema,
      options,
    );
  }
  async getTaskResult(params, resultSchema, options) {
    return this.request(
      {
        method: "tasks/result",
        params,
      },
      resultSchema,
      options,
    );
  }
  async listTasks(params, options) {
    return this.request(
      {
        method: "tasks/list",
        params,
      },
      ListTasksResultSchema,
      options,
    );
  }
  async cancelTask(params, options) {
    return this.request(
      {
        method: "tasks/cancel",
        params,
      },
      CancelTaskResultSchema,
      options,
    );
  }
  async notification(notification, options) {
    if (!this._transport) throw Error("Not connected");
    this.assertNotificationCapability(notification.method);
    let relatedTaskId = options?.relatedTask?.taskId;
    if (relatedTaskId) {
      let jsonrpcNotification = {
        ...notification,
        jsonrpc: "2.0",
        params: {
          ...notification.params,
          _meta: {
            ...(notification.params?._meta || {}),
            [RELATED_TASK_META_KEY]: options.relatedTask,
          },
        },
      };
      await this._enqueueTaskMessage(relatedTaskId, {
        type: "notification",
        message: jsonrpcNotification,
        timestamp: Date.now(),
      });
      return;
    }
    if (
      (this._options?.debouncedNotificationMethods ?? []).includes(notification.method) &&
      !notification.params &&
      !options?.relatedRequestId &&
      !options?.relatedTask
    ) {
      if (this._pendingDebouncedNotifications.has(notification.method)) return;
      this._pendingDebouncedNotifications.add(notification.method);
      Promise.resolve().then(() => {
        this._pendingDebouncedNotifications.delete(notification.method);
        if (!this._transport) return;
        let jsonrpcNotification = {
          ...notification,
          jsonrpc: "2.0",
        };
        if (options?.relatedTask)
          jsonrpcNotification = {
            ...jsonrpcNotification,
            params: {
              ...jsonrpcNotification.params,
              _meta: {
                ...(jsonrpcNotification.params?._meta || {}),
                [RELATED_TASK_META_KEY]: options.relatedTask,
              },
            },
          };
        this._transport?.send(jsonrpcNotification, options).catch((error) => this._onerror(error));
      });
      return;
    }
    let jsonrpcNotification = {
      ...notification,
      jsonrpc: "2.0",
    };
    if (options?.relatedTask)
      jsonrpcNotification = {
        ...jsonrpcNotification,
        params: {
          ...jsonrpcNotification.params,
          _meta: {
            ...(jsonrpcNotification.params?._meta || {}),
            [RELATED_TASK_META_KEY]: options.relatedTask,
          },
        },
      };
    await this._transport.send(jsonrpcNotification, options);
  }
  setRequestHandler(requestSchema, handler) {
    let method = R(requestSchema);
    this.assertRequestHandlerCapability(method);
    this._requestHandlers.set(method, (request, extra) => {
      let parsed = parseWithCompat(requestSchema, request);
      return Promise.resolve(handler(parsed, extra));
    });
  }
  removeRequestHandler(method) {
    this._requestHandlers.delete(method);
  }
  assertCanSetRequestHandler(method) {
    if (this._requestHandlers.has(method))
      throw Error(`A request handler for ${method} already exists, which would be overridden`);
  }
  setNotificationHandler(notificationSchema, handler) {
    let method = R(notificationSchema);
    this._notificationHandlers.set(method, (notification) => {
      let parsed = parseWithCompat(notificationSchema, notification);
      return Promise.resolve(handler(parsed));
    });
  }
  removeNotificationHandler(method) {
    this._notificationHandlers.delete(method);
  }
  _cleanupTaskProgressHandler(taskId) {
    let progressToken = this._taskProgressTokens.get(taskId);
    if (progressToken !== undefined) {
      this._progressHandlers.delete(progressToken);
      this._taskProgressTokens.delete(taskId);
    }
  }
  async _enqueueTaskMessage(taskId, message, sessionId) {
    if (!this._taskStore || !this._taskMessageQueue)
      throw Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");
    let maxQueueSize = this._options?.maxTaskQueueSize;
    await this._taskMessageQueue.enqueue(taskId, message, sessionId, maxQueueSize);
  }
  async _clearTaskQueue(taskId, sessionId) {
    if (this._taskMessageQueue) {
      let messages = await this._taskMessageQueue.dequeueAll(taskId, sessionId);
      for (let message of messages)
        if (message.type === "request" && isJSONRPCRequest(message.message)) {
          let requestId = message.message.id;
          let resolver = this._requestResolvers.get(requestId);
          if (resolver) {
            resolver(new McpError(ErrorCode.InternalError, "Task cancelled or completed"));
            this._requestResolvers.delete(requestId);
          } else
            this._onerror(Error(`Resolver missing for request ${requestId} during task ${taskId} cleanup`));
        }
    }
  }
  async _waitForTaskUpdate(taskId, signal) {
    let interval = this._options?.defaultTaskPollInterval ?? 1000;
    try {
      let task = await this._taskStore?.getTask(taskId);
      if (task?.pollInterval) interval = task.pollInterval;
    } catch {}
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new McpError(ErrorCode.InvalidRequest, "Request cancelled"));
        return;
      }
      let timeoutId = setTimeout(resolve, interval);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timeoutId);
          reject(new McpError(ErrorCode.InvalidRequest, "Request cancelled"));
        },
        {
          once: true,
        },
      );
    });
  }
  requestTaskStore(request, sessionId) {
    let taskStore = this._taskStore;
    if (!taskStore) throw Error("No task store configured");
    return {
      createTask: async (taskParams) => {
        if (!request) throw Error("No request provided");
        return await taskStore.createTask(
          taskParams,
          request.id,
          {
            method: request.method,
            params: request.params,
          },
          sessionId,
        );
      },
      getTask: async (taskId) => {
        let task = await taskStore.getTask(taskId, sessionId);
        if (!task) throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
        return task;
      },
      storeTaskResult: async (taskId, status, result) => {
        await taskStore.storeTaskResult(taskId, status, result, sessionId);
        let task = await taskStore.getTask(taskId, sessionId);
        if (task) {
          let notification = TaskStatusNotificationSchema.parse({
            method: "notifications/tasks/status",
            params: task,
          });
          await this.notification(notification);
          if (isTerminal(task.status)) this._cleanupTaskProgressHandler(taskId);
        }
      },
      getTaskResult: (taskId) => taskStore.getTaskResult(taskId, sessionId),
      updateTaskStatus: async (taskId, status, statusMessage) => {
        let task = await taskStore.getTask(taskId, sessionId);
        if (!task)
          throw new McpError(
            ErrorCode.InvalidParams,
            `Task "${taskId}" not found - it may have been cleaned up`,
          );
        if (isTerminal(task.status))
          throw new McpError(
            ErrorCode.InvalidParams,
            `Cannot update task "${taskId}" from terminal status "${task.status}" to "${status}". Terminal states (completed, failed, cancelled) cannot transition to other states.`,
          );
        await taskStore.updateTaskStatus(taskId, status, statusMessage, sessionId);
        let updatedTask = await taskStore.getTask(taskId, sessionId);
        if (updatedTask) {
          let notification = TaskStatusNotificationSchema.parse({
            method: "notifications/tasks/status",
            params: updatedTask,
          });
          await this.notification(notification);
          if (isTerminal(updatedTask.status)) this._cleanupTaskProgressHandler(taskId);
        }
      },
      listTasks: (cursor) => taskStore.listTasks(cursor, sessionId),
    };
  }
}
//@ chunk-zykv69v4.js:27504-27574 esm-fingerprint
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export { Protocol, isPlainObject };
