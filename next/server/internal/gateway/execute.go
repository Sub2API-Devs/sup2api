package gateway

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/google/uuid"
	"google.golang.org/protobuf/proto"
)

type gatewayExecution struct {
	c                        *call
	rt                       *typeRoute
	account                  *core.Account
	acct                     *pluginv1.Account
	body                     []byte
	id                       string
	records                  core.ExecutionRecords
	network                  context.Context
	response                 *pluginv1.ForwardUpstreamResponse
	result                   attemptResult
	raw                      []byte
	header                   http.Header
	observed, recorded, sent bool
	base                     *core.UsageRecord
	spool                    *bufferedResponse
	pendingCommit            *core.ExecutionCommit
	pendingBody              []byte
}

func (c *call) canExecute(rt *typeRoute) bool {
	if _, ok := rt.binding.Client.(core.ExecutePlugin); !ok {
		return false
	}
	if _, ok := c.g.d.Settler.(core.ExecutionRecords); !ok {
		return false
	}
	// Cross-owner parsing stays on the compatibility path: a broker callback
	// must never reenter the active process's bounded RPC semaphore.
	if rt.pluginUsage || c.ep.TaskSubmit() {
		pb, ok := c.gen.Platform(rt.platform)
		if !ok || pb.Plugin.Key != rt.binding.Plugin.Key {
			return false
		}
	}
	if rt.binding.Plugin.Manifest == nil {
		return false
	}
	for _, cap := range rt.binding.Plugin.Manifest.Capabilities {
		if cap.ID == manifest.CapPlatformExecute {
			return true
		}
	}
	return false
}

func (c *call) executeAttempt(ctx context.Context, rt *typeRoute, acc *core.Account, acct *pluginv1.Account, body []byte, request *pluginv1.BuildUpstreamRequestRequest) attemptResult {
	x := &gatewayExecution{c: c, rt: rt, account: acc, acct: acct, body: body, id: uuid.NewString(), network: ctx, records: c.g.d.Settler.(core.ExecutionRecords)}
	defer func() {
		if x.spool != nil {
			x.spool.close()
		}
	}()
	// The RPC may finish accounting after client cancellation. The network
	// capability still uses the original client + account-lease context.
	ectx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 6*time.Hour)
	defer cancel()
	callbacks := core.ExecutionCallbacks{PrepareTimeout: c.gw.platformTimeout(), FinishTimeout: 15 * time.Second, Forward: x.forwardCallback, Record: x.record, Watch: x.watch}
	out, err := rt.binding.Client.(core.ExecutePlugin).Execute(ectx, &pluginv1.ExecuteRequest{Request: request}, callbacks)
	if x.response != nil && x.response.Error != nil {
		cls := out.GetClassification()
		if cls == nil {
			cls = defaultClassification(int(x.response.Error.Status))
		}
		result := c.applyClassification(ctx, rt, acct, int(x.response.Error.Status), x.raw, x.response.Error.TransportError, cls)
		if c.ep.TaskSubmit() {
			result.kind = attemptReturn
		}
		if result.err != nil && result.err.Raw != nil {
			result.err.ContentType = x.header.Get("Content-Type")
		}
		return result
	}
	if x.base != nil && !x.observed {
		bctx, bcancel := context.WithTimeout(context.WithoutCancel(ctx), 15*time.Second)
		if persistErr := x.persistObservation(bctx); persistErr != nil {
			err = persistErr
		}
		bcancel()
	}
	if x.observed && !x.recorded && (x.pendingCommit != nil || !c.ep.TaskSubmit()) {
		// Fallback runs after the runtime joined callbacks; it cannot race an
		// in-flight Record RPC, and uses the same durable idempotency boundary.
		bctx, bcancel := context.WithTimeout(context.WithoutCancel(ctx), 15*time.Second)
		var fallbackErr error
		if x.pendingCommit != nil {
			_, fallbackErr = x.records.CommitExecution(bctx, *x.pendingCommit)
			if fallbackErr == nil {
				x.acceptCommit(x.pendingCommit.Record, x.pendingBody)
			}
		} else {
			_, fallbackErr = x.record(bctx, &pluginv1.RecordUsageRequest{})
		}
		bcancel()
		if fallbackErr != nil {
			err = fallbackErr
		}
	}
	if x.recorded {
		if x.spool != nil {
			if x.spool.err != nil || !c.rec.Success {
				// The upstream usage already committed even though the full
				// buffered response cannot be delivered. This return path skips
				// dispatch's ordinary successful-attempt token accounting.
				c.countTokens(context.WithoutCancel(ctx), acc.ID)
				return attemptResult{kind: attemptReturn, err: fromCore(core.ErrUnavailable.WithMessage("upstream response incomplete"), errTypeUpstream)}
			}
			if err := x.spool.publish(); err != nil {
				slog.WarnContext(ctx, "gateway: committed response delivery failed", "request_id", c.rid, "err", err)
			}
		}
		return attemptResult{kind: attemptDone}
	}
	if x.sent || x.observed {
		c.usage = nil
		if c.ep.TaskSubmit() {
			return c.taskFailure(ctx, "task execution could not be confirmed", err)
		}
		// Observation is already durable; old Submit must not race recovery.
		c.taskPersisted = true
		if c.c.Writer.Written() {
			panic(http.ErrAbortHandler)
		}
		return attemptResult{kind: attemptReturn, err: fromCore(core.ErrUnavailable.WithMessage("usage recording could not be confirmed").WithCause(err), errTypeInternal)}
	}
	if x.response != nil {
		return x.result
	}
	return attemptResult{kind: attemptFailover, err: fromCore(core.ErrPluginUnavailable.WithCause(err), errTypePluginUnavailable)}
}

func (x *gatewayExecution) forwardCallback(ctx context.Context, in *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
	if in.GetRequest() == nil {
		return nil, errors.New("missing upstream request")
	}
	c := x.c
	nctx, cancel := context.WithCancel(x.network)
	defer cancel()
	stop := context.AfterFunc(ctx, cancel)
	defer stop()
	if ctx.Err() != nil {
		cancel()
	}
	bctx, bcancel := context.WithTimeout(nctx, 15*time.Second)
	err := x.records.BeginExecution(bctx, core.ExecutionIntent{TaskSubmit: c.ep.TaskSubmit(), Record: c.rec, ID: x.id, RequestID: c.rid, PluginKey: x.rt.binding.Plugin.Key, AccountID: x.account.ID, Attempt: c.rec.Attempts})
	bcancel()
	if err != nil {
		return nil, err
	}
	x.result = c.forwardBuilt(nctx, x.rt, x.account, x.acct, x.body, in.Request, x)
	if x.response == nil {
		x.response = &pluginv1.ForwardUpstreamResponse{}
		if x.result.err != nil {
			return nil, errors.New(x.result.err.Message)
		}
	}
	return x.response, nil
}
func (x *gatewayExecution) classify(_ context.Context, status int, header http.Header, raw []byte, transport string) attemptResult {
	x.raw = raw
	x.header = header
	prefix := raw
	if len(prefix) > classifyPrefix {
		prefix = prefix[:classifyPrefix]
	}
	headers := map[string]string{}
	for k, v := range header {
		if len(v) > 0 {
			headers[strings.ToLower(k)] = v[0]
		}
	}
	x.response = &pluginv1.ForwardUpstreamResponse{Error: &pluginv1.ClassifyErrorRequest{Meta: x.c.metaFor(x.rt), Account: x.acct, Status: int32(status), Headers: headers, BodyPrefix: prefix, TransportError: transport}}
	return attemptResult{kind: attemptReturn}
}

func (x *gatewayExecution) forward(ctx context.Context, resp *http.Response) attemptResult {
	c := x.c
	if c.ep.TaskSubmit() {
		c.rec.StatusCode = resp.StatusCode
		raw, err := io.ReadAll(io.LimitReader(resp.Body, protocol.MaxTaskSnapshotBytes+1))
		if err != nil || len(raw) > protocol.MaxTaskSnapshotBytes {
			return c.taskFailure(ctx, "task response incomplete", err)
		}
		x.raw = raw
		bctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 15*time.Second)
		defer cancel()
		if err = x.c.g.d.Tasks.ReceiveTask(bctx, c.rid, resp.StatusCode, raw, ""); err != nil {
			return c.taskFailure(ctx, "task response receipt failed", err)
		}
		c.armUsageExtraction(x.rt, x.acct, resp, &usageCapture{body: raw}, x.body)
		c.rec.Success = true
	} else {
		original := c.c.Writer
		if !isSSE(resp.Header.Get("Content-Type")) {
			x.spool = newBufferedResponse(original)
			c.c.Writer = x.spool
		}
		func() {
			defer func() { c.c.Writer = original }()
			x.result = c.forward(ctx, x.rt, x.acct, resp, x.body)
		}()
	}
	x.response = &pluginv1.ForwardUpstreamResponse{TaskSubmission: c.ep.TaskSubmit()}
	if p := c.usage; p != nil {
		x.response.Observation = &pluginv1.ExtractUsageRequest{Meta: p.meta, Account: p.account, Status: int32(p.status), Headers: p.headers, Body: p.cap.body, Events: p.cap.events, Truncated: p.cap.stopped, Fields: p.fields, FieldsOmitted: p.fieldsOmitted}
		x.response.ExtractUsage = x.rt.pluginUsage && !p.cap.tooLarge && !c.ep.TaskSubmit()
	}
	c.usage = nil
	c.rec.LatencyMs = int(c.g.now().Sub(c.start) / time.Millisecond)
	x.base = cloneUsage(c.rec)
	bctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 15*time.Second)
	defer cancel()
	if err := x.persistObservation(bctx); err != nil {
		return attemptResult{kind: attemptReturn, err: fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal)}
	}
	return attemptResult{kind: attemptDone}
}

func (x *gatewayExecution) persistObservation(ctx context.Context) error {
	fallback := cloneUsage(x.base)
	if x.rt.pluginUsage {
		fallback.UsageExtract = core.UsageExtractFallback
	}
	x.c.finalizeBillability(ctx, fallback, x.c.ep.Billing)
	observation, _ := json.Marshal(map[string]any{"status": x.c.rec.StatusCode, "body_bytes": len(x.response.GetObservation().GetBody()), "event_count": len(x.response.GetObservation().GetEvents()), "truncated": x.response.GetObservation().GetTruncated(), "task_submission": x.response.TaskSubmission})
	if err := x.records.ObserveExecution(ctx, x.id, fallback, observation); err != nil {
		return err
	}
	x.observed = true
	return nil
}
func cloneUsage(r *core.UsageRecord) *core.UsageRecord {
	raw, _ := json.Marshal(r)
	var out core.UsageRecord
	_ = json.Unmarshal(raw, &out)
	out.Metrics = preserveHostCacheEvidence(r.Metrics, out.Metrics)
	for i := range out.Additional {
		out.Additional[i].Metrics = preserveHostCacheEvidence(r.Additional[i].Metrics, out.Additional[i].Metrics)
	}
	for i := range out.Replacement {
		out.Replacement[i].Metrics = preserveHostCacheEvidence(r.Replacement[i].Metrics, out.Replacement[i].Metrics)
	}
	return &out
}
func factDigest(m proto.Message) string {
	var raw []byte
	if m != nil && m.ProtoReflect().IsValid() {
		raw, _ = (proto.MarshalOptions{Deterministic: true}).Marshal(m)
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}
func (x *gatewayExecution) record(ctx context.Context, in *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
	if !x.observed || x.c.ep.TaskSubmit() {
		return nil, errors.New("no synchronous observation to record")
	}
	if in.Report != nil && !x.response.ExtractUsage {
		return nil, errors.New("plugin does not own usage extraction")
	}
	c := x.c
	previous := c.rec
	accepted := false
	defer func() {
		if !accepted {
			c.rec = previous
		}
	}()
	c.rec = cloneUsage(x.base)
	if in.Report != nil {
		c.applyUsageReport(ctx, x.rt, x.rt.binding.Plugin.Key, in.Report)
	} else if x.rt.pluginUsage {
		c.usageFallback(ctx, x.rt, "plugin accepted host fallback", nil)
	}
	c.finalizeBillability(ctx, c.rec, c.ep.Billing)
	x.pendingCommit = &core.ExecutionCommit{ID: x.id, Operation: "usage", Digest: factDigest(in.Report), Record: c.rec}
	out, err := x.records.CommitExecution(ctx, *x.pendingCommit)
	if err == nil {
		accepted = true
		x.acceptCommit(c.rec, nil)
	}
	return out, err
}
func (x *gatewayExecution) watch(ctx context.Context, in *pluginv1.ReserveAndWatchRequest) (*pluginv1.ExecutionReceipt, error) {
	if !x.observed || !x.c.ep.TaskSubmit() || in.Task == nil {
		return nil, errors.New("no task observation to record")
	}
	c := x.c
	previous := c.rec
	accepted := false
	defer func() {
		if !accepted {
			c.rec = previous
		}
	}()
	c.rec = cloneUsage(x.base)
	parsed := in.Task
	ref := parsed.GetUpstreamRefId()
	if !refIDRe.MatchString(ref) {
		return nil, errors.New("invalid task identity")
	}
	returned, err := protocol.RewriteTaskID(x.raw, c.ep.Task.IDPaths, ref, c.taskPublicID)
	if err != nil {
		return nil, err
	}
	query, ok := c.taskPair(true)
	if !ok {
		return nil, errors.New("missing task query contract")
	}
	snapshot := []byte(parsed.SnapshotJson)
	if _, err = protocol.RewriteTaskID(snapshot, query.Task.IDPaths, ref, c.taskPublicID); err != nil {
		return nil, err
	}
	if rv := parsed.GetUsage().GetReserve(); rv != nil && rv.RefId != ref {
		return nil, errors.New("reservation identity mismatch")
	}
	if parsed.Usage != nil {
		c.applyUsageReport(ctx, x.rt, c.plugin.Key, parsed.Usage)
	}
	c.finalizeBillability(ctx, c.rec, c.ep.Billing)
	task := &core.TaskRegistration{PublicID: c.taskPublicID, UpstreamID: ref, Kind: c.ep.Task.Kind, Snapshot: snapshot, IDPaths: query.Task.IDPaths, NextCheckAfter: time.Duration(parsed.NextCheckAfterSec) * time.Second, Deadline: time.Duration(parsed.DeadlineSec) * time.Second, Record: c.rec}
	x.pendingCommit = &core.ExecutionCommit{ID: x.id, Operation: "watch", Digest: factDigest(parsed), Record: c.rec, Task: task}
	x.pendingBody = returned
	out, err := x.records.CommitExecution(ctx, *x.pendingCommit)
	if err == nil {
		accepted = true
		x.acceptCommit(c.rec, returned)
	}
	return out, err
}

func (x *gatewayExecution) acceptCommit(rec *core.UsageRecord, body []byte) {
	x.recorded = true
	x.c.taskPersisted = true
	x.c.rec = rec
	if body != nil && x.spool == nil {
		x.spool = newBufferedResponse(x.c.c.Writer)
		x.spool.Header().Set("Content-Type", "application/json")
		x.spool.WriteHeader(rec.StatusCode)
		_, _ = x.spool.Write(body)
	}
}
