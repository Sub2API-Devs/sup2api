package gateway

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func (c *call) taskPair(query bool) (manifest.Endpoint, bool) {
	for _, b := range c.gen.Endpoints() {
		e := b.Endpoint
		if b.Plugin.Key == c.plugin.Key && e.Task != nil && e.Task.Kind == c.ep.Task.Kind && e.TaskQuery() == query {
			return e, true
		}
	}
	return manifest.Endpoint{}, false
}

func (c *call) resolveTask(ctx context.Context) *gwError {
	if c.task != nil {
		c.model = c.task.Model
		return nil
	}
	if c.g.d.Tasks == nil {
		return fromCore(core.ErrUnavailable.WithMessage("task service unavailable"), errTypeInternal)
	}
	submit, ok := c.taskPair(false)
	if !ok {
		return fromCore(core.ErrUnavailable.WithMessage("task submit endpoint unavailable"), errTypeInternal)
	}
	t, err := c.g.d.Tasks.FindTask(ctx, core.TaskQuery{ID: c.params[c.ep.Task.IDParam], PluginKey: c.plugin.Key, Kind: c.ep.Task.Kind,
		UserID: c.principal.UserID, GroupID: c.principal.Group.ID, SubmitProtocol: submit.Protocol, IDPaths: c.ep.Task.IDPaths})
	if err != nil {
		return fromCore(core.AsError(err), errTypeInvalidRequest)
	}
	c.task = t
	c.model = t.Model
	return nil
}

func (c *call) serveTaskSnapshot() {
	t := c.task
	if t.State == "failed" && t.FailureCode != "" {
		status := http.StatusBadGateway
		if t.FailureCode == "task_not_found" {
			status = http.StatusNotFound
		}
		if t.FailureCode == "task_timeout" {
			status = http.StatusGatewayTimeout
		}
		c.fail(&gwError{Status: status, Code: t.FailureCode, Message: "task observation failed", RecordType: errTypeUpstream})
		return
	}
	if t.ObservationStatus == "abandoned" && t.State == "pending" {
		c.fail(&gwError{Status: http.StatusGone, Code: "task_observation_expired", Message: "task observation expired", RecordType: errTypeUpstream})
		return
	}
	if len(t.Body) == 0 {
		c.fail(&gwError{Status: http.StatusServiceUnavailable, Code: "task_snapshot_pending", Message: "task snapshot is being recovered", RecordType: errTypeUpstream})
		return
	}
	body, err := protocol.RewriteTaskID(t.Body, t.IDPaths, t.UpstreamID, t.PublicID)
	if err != nil {
		c.fail(fromCore(core.ErrUnavailable.WithMessage("invalid stored task snapshot").WithCause(err), errTypeInternal))
		return
	}
	c.rec.StatusCode = http.StatusOK
	c.rec.Success = true
	c.c.Data(http.StatusOK, "application/json", body)
}

func (c *call) beginTask(ctx context.Context) error {
	if c.g.d.Tasks == nil {
		return errors.New("task service unavailable")
	}
	r := c.rec
	if r.AccountID == nil {
		return errors.New("task has no submitting account")
	}
	id, err := c.g.d.Tasks.BeginTask(ctx, core.TaskIntent{RequestID: c.rid, PluginKey: c.plugin.Key, Kind: c.ep.Task.Kind,
		UserID: r.UserID, APIKeyID: r.APIKeyID, GroupID: r.GroupID, AccountID: *r.AccountID, Model: c.model, Protocol: c.ep.Protocol})
	if err == nil {
		c.taskPublicID = id
	}
	return err
}

func (c *call) recordTaskFailure(ctx context.Context, status int, body []byte, reason string) {
	if c.taskPublicID == "" || c.g.d.Tasks == nil {
		return
	}
	bctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
	defer cancel()
	if err := c.g.d.Tasks.ReceiveTask(bctx, c.rid, status, body, reason); err != nil {
		slog.ErrorContext(bctx, "task receipt update failed", "request_id", c.rid, "err", err)
	}
}

func (c *call) taskFailure(ctx context.Context, reason string, err error) attemptResult {
	c.recordTaskFailure(ctx, c.rec.StatusCode, nil, reason)
	c.usage = nil
	c.rec.Reservation = nil
	c.rec.Price = nil
	c.rec.Tokens = core.UsageTokens{}
	c.rec.Metrics = nil
	slog.WarnContext(ctx, "task submission could not be registered", "request_id", c.rid, "reason", reason, "err", err)
	return attemptResult{kind: attemptReturn, err: fromCore(core.ErrUnavailable.WithMessage(reason).WithCause(err), errTypeUpstream)}
}

func (c *call) forwardTask(ctx context.Context, rt *typeRoute, acct *pluginv1.Account, resp *http.Response, upBody []byte) attemptResult {
	c.rec.StatusCode = resp.StatusCode
	raw, err := io.ReadAll(io.LimitReader(resp.Body, protocol.MaxTaskSnapshotBytes+1))
	if err != nil || len(raw) > protocol.MaxTaskSnapshotBytes {
		return c.taskFailure(ctx, "task submission response is incomplete or too large", err)
	}
	// Persist the bounded response before parsing. The receipt remains if the
	// plugin cannot parse it, or if the final transaction cannot commit.
	bctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 15*time.Second)
	defer cancel()
	if err = c.g.d.Tasks.ReceiveTask(bctx, c.rid, resp.StatusCode, raw, ""); err != nil {
		return c.taskFailure(ctx, "task response could not be recorded", err)
	}
	query, ok := c.taskPair(true)
	if !ok {
		return c.taskFailure(ctx, "task query endpoint unavailable", nil)
	}
	c.armUsageExtraction(rt, acct, resp, &usageCapture{body: raw}, upBody)
	p := c.usage
	c.usage = nil
	pb, ok := c.gen.Platform(c.platform)
	if !ok || pb.Client == nil {
		return c.taskFailure(ctx, "task parser unavailable", nil)
	}
	pctx, pcancel := context.WithTimeout(bctx, c.gw.hotpathTimeout())
	parsed, err := pb.Client.ParseTaskSubmission(pctx, &pluginv1.ExtractUsageRequest{Meta: p.meta, Account: p.account,
		Status: int32(p.status), Headers: p.headers, Body: raw, Fields: p.fields, FieldsOmitted: p.fieldsOmitted})
	pcancel()
	if err != nil || parsed == nil {
		return c.taskFailure(ctx, "task response could not be parsed", err)
	}
	ref := parsed.GetUpstreamRefId()
	if !refIDRe.MatchString(ref) {
		return c.taskFailure(ctx, "invalid upstream task identity", nil)
	}
	returned, err := protocol.RewriteTaskID(raw, c.ep.Task.IDPaths, ref, c.taskPublicID)
	if err != nil {
		return c.taskFailure(ctx, "task submission identity mismatch", err)
	}
	snapshot := []byte(parsed.GetSnapshotJson())
	if _, err = protocol.RewriteTaskID(snapshot, query.Task.IDPaths, ref, c.taskPublicID); err != nil {
		return c.taskFailure(ctx, "invalid initial task snapshot", err)
	}
	if rv := parsed.GetUsage().GetReserve(); rv != nil && rv.GetRefId() != ref {
		return c.taskFailure(ctx, "reservation identity mismatch", nil)
	}
	c.rec.Success = true
	c.rec.ErrorType = ""
	c.rec.ErrorMessage = ""
	if rep := parsed.GetUsage(); rep != nil {
		c.applyUsageReport(bctx, rt, c.plugin.Key, rep)
	}
	c.finalizeBillability(bctx, c.rec, c.ep.Billing)
	c.rec.LatencyMs = int(c.g.now().Sub(c.start) / time.Millisecond)
	err = c.g.d.Tasks.RegisterTask(bctx, core.TaskRegistration{PublicID: c.taskPublicID, UpstreamID: ref, Kind: c.ep.Task.Kind,
		Snapshot: snapshot, IDPaths: query.Task.IDPaths, NextCheckAfter: time.Duration(parsed.GetNextCheckAfterSec()) * time.Second,
		Deadline: time.Duration(parsed.GetDeadlineSec()) * time.Second, Record: c.rec})
	if err != nil {
		return c.taskFailure(ctx, "task registration could not be committed", err)
	}
	c.taskPersisted = true
	c.c.Data(resp.StatusCode, "application/json", returned)
	return attemptResult{kind: attemptDone}
}
