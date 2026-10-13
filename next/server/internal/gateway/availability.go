package gateway

import (
	"context"
	"log/slog"
	"math"
	"net/http"
	"regexp"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/protobuf/proto"
)

const availabilityTimeout = 200 * time.Millisecond
const availabilityBatchSize = 128
const errTypeModelAvailability = "model_availability"

type availabilityAdmission struct {
	quota  *pluginv1.AccountQuotaSnapshot
	models []string
	now    int64
}

type availabilityDecision struct {
	failure *gwError
	retryAt int64
}

type availabilityKey struct {
	id    int64
	model string
}

func (g *Gateway) quotaSource() core.AccountQuotaSource {
	if source, ok := g.d.Quota.(core.AccountQuotaSource); ok {
		return source
	}
	source, _ := g.d.Accounts.(core.AccountQuotaSource)
	return source
}

func availabilityFailure(denied bool) *gwError {
	if denied {
		return &gwError{Status: http.StatusTooManyRequests, Code: "model_quota_exhausted", Message: "the requested model is unavailable for these accounts, please retry later", RecordType: errTypeModelAvailability}
	}
	return &gwError{Status: http.StatusServiceUnavailable, Code: "model_availability_unavailable", Message: "model availability could not be verified, please retry later", RecordType: errTypeModelAvailability}
}

func (c *call) availabilityModels(ref *core.AccountRef) []*pluginv1.ModelAvailabilityCandidate {
	models := []string{c.model}
	for _, extra := range c.modelRefs {
		models = append(models, extra.model)
	}
	seen := map[string]bool{}
	var out []*pluginv1.ModelAvailabilityCandidate
	for _, model := range models {
		mapped := ref.MapModel(model)
		if seen[mapped] {
			continue
		}
		seen[mapped] = true
		out = append(out, &pluginv1.ModelAvailabilityCandidate{AccountId: ref.ID, AccountType: ref.Type, Model: mapped, ClientModel: model})
	}
	return out
}

func (c *call) filterAvailability(ctx context.Context, refs []core.AccountRef) ([]core.AccountRef, *gwError) {
	groups := map[string][]core.AccountRef{}
	var order []string
	var ids []int64
	for _, ref := range refs {
		rt := c.route(&ref)
		if rt == nil || !rt.binding.Type.ModelAvailability {
			continue
		}
		if _, ok := groups[ref.PluginKey]; !ok {
			order = append(order, ref.PluginKey)
		}
		groups[ref.PluginKey] = append(groups[ref.PluginKey], ref)
		ids = append(ids, ref.ID)
	}
	if len(ids) == 0 {
		return refs, nil
	}
	ctx, cancel := context.WithTimeout(ctx, availabilityTimeout)
	defer cancel()
	blocked := map[int64]availabilityDecision{}
	source := c.g.quotaSource()
	var snapshots map[int64]*pluginv1.AccountQuotaSnapshot
	var err error
	if source != nil {
		snapshots, err = source.AccountQuotaSnapshots(ctx, ids)
	}
	if source == nil || err != nil || ctx.Err() != nil {
		for _, id := range ids {
			blocked[id] = availabilityDecision{failure: availabilityFailure(false)}
		}
	} else {
		for _, key := range order {
			for id, decision := range c.checkAvailability(ctx, groups[key], snapshots) {
				blocked[id] = decision
			}
		}
	}
	out := make([]core.AccountRef, 0, len(refs))
	var failure *gwError
	var retryAt int64
	retryKnown := true
	for _, ref := range refs {
		if decision := blocked[ref.ID]; decision.failure != nil {
			if failure == nil || decision.failure.Status == http.StatusServiceUnavailable {
				failure = decision.failure
			}
			retryKnown = retryKnown && decision.retryAt > 0
			if retryAt == 0 || decision.retryAt < retryAt {
				retryAt = decision.retryAt
			}
			continue
		}
		out = append(out, ref)
	}
	if len(out) > 0 {
		return out, nil
	}
	now := c.g.now().Unix()
	if failure != nil && failure.Status == http.StatusTooManyRequests && retryKnown && retryAt > now {
		failure.Headers = http.Header{"Retry-After": {itoa(min(retryAt-now, 3600))}}
	}
	return out, failure
}

func (c *call) checkAvailability(ctx context.Context, refs []core.AccountRef, snapshots map[int64]*pluginv1.AccountQuotaSnapshot) map[int64]availabilityDecision {
	blocked := map[int64]availabilityDecision{}
	in := &pluginv1.CheckModelAvailabilityRequest{NowUnix: c.g.now().Unix()}
	for _, ref := range refs {
		blocked[ref.ID] = availabilityDecision{failure: availabilityFailure(false)}
		for _, candidate := range c.availabilityModels(&ref) {
			if q := snapshots[ref.ID]; q != nil {
				candidate.Quota = proto.Clone(q).(*pluginv1.AccountQuotaSnapshot)
			}
			in.Candidates = append(in.Candidates, candidate)
		}
	}
	checker, ok := c.route(&refs[0]).binding.Client.(core.AccountModelAvailabilityPlugin)
	if !ok {
		return blocked
	}
	pctx, cancel := context.WithTimeout(ctx, availabilityTimeout)
	defer cancel()
	seen, ok := availabilityResults(pctx, checker, in)
	if !ok {
		return blocked
	}
	if c.availability == nil {
		c.availability = map[int64]availabilityAdmission{}
	}
	for _, ref := range refs {
		decision := availabilityDecision{}
		retryKnown := true
		var models []string
		for _, candidate := range c.availabilityModels(&ref) {
			models = append(models, candidate.Model)
			result := seen[availabilityKey{ref.ID, candidate.Model}]
			if result.State == pluginv1.ModelAvailability_AVAILABLE {
				continue
			}
			e := availabilityFailure(result.State == pluginv1.ModelAvailability_UNAVAILABLE)
			if decision.failure == nil || e.Status == http.StatusServiceUnavailable {
				decision.failure = e
			}
			retryKnown = retryKnown && result.RetryAtUnix > in.NowUnix
			decision.retryAt = max(decision.retryAt, result.RetryAtUnix)
		}
		if decision.failure != nil {
			if !retryKnown || decision.failure.Status != http.StatusTooManyRequests {
				decision.retryAt = 0
			}
			blocked[ref.ID] = decision
			continue
		}
		admission := availabilityAdmission{models: models, now: in.NowUnix}
		if q := snapshots[ref.ID]; q != nil {
			admission.quota = proto.Clone(q).(*pluginv1.AccountQuotaSnapshot)
		}
		c.availability[ref.ID] = admission
		delete(blocked, ref.ID)
	}
	return blocked
}

func availabilityResults(ctx context.Context, checker core.AccountModelAvailabilityPlugin, in *pluginv1.CheckModelAvailabilityRequest) (map[availabilityKey]*pluginv1.ModelAvailability, bool) {
	seen := map[availabilityKey]*pluginv1.ModelAvailability{}
	for offset := 0; offset < len(in.Candidates); offset += availabilityBatchSize {
		if ctx.Err() != nil {
			return nil, false
		}
		batch := &pluginv1.CheckModelAvailabilityRequest{NowUnix: in.NowUnix, Candidates: in.Candidates[offset:min(offset+availabilityBatchSize, len(in.Candidates))]}
		want := map[availabilityKey]bool{}
		for _, candidate := range batch.Candidates {
			want[availabilityKey{candidate.AccountId, candidate.Model}] = true
		}
		out, err := checker.CheckModelAvailability(ctx, batch)
		if err != nil || ctx.Err() != nil || out == nil || len(out.Results) != len(want) {
			return nil, false
		}
		for _, result := range out.Results {
			key := availabilityKey{result.GetAccountId(), result.GetModel()}
			if result == nil || !want[key] || seen[key] != nil || result.State < pluginv1.ModelAvailability_UNKNOWN || result.State > pluginv1.ModelAvailability_UNAVAILABLE || result.RetryAtUnix < 0 {
				return nil, false
			}
			seen[key] = result
		}
	}
	return seen, true
}

func (c *call) guardAvailability(ctx context.Context, ref *core.AccountRef) *gwError {
	rt := c.route(ref)
	if rt == nil || !rt.binding.Type.ModelAvailability {
		return nil
	}
	source := c.g.quotaSource()
	if source == nil {
		return availabilityFailure(false)
	}
	ctx, cancel := context.WithTimeout(ctx, availabilityTimeout)
	defer cancel()
	snapshots, err := source.AccountQuotaSnapshots(ctx, []int64{ref.ID})
	if err != nil || ctx.Err() != nil {
		return availabilityFailure(false)
	}
	old, admitted := c.availability[ref.ID]
	models := c.availabilityModels(ref)
	if admitted {
		if old.quota.GetGeneration() != snapshots[ref.ID].GetGeneration() {
			return availabilityFailure(false)
		}
		if len(old.models) != len(models) {
			return availabilityFailure(false)
		}
		for i, model := range models {
			if old.models[i] != model.Model {
				return availabilityFailure(false)
			}
		}
		if old.now == c.g.now().Unix() && proto.Equal(old.quota, snapshots[ref.ID]) {
			return nil
		}
	}
	return c.checkAvailability(ctx, []core.AccountRef{*ref}, snapshots)[ref.ID].failure
}

var observationQuotaKey = regexp.MustCompile(`^[a-z0-9][a-z0-9_]{0,31}$`)

func validQuotaObservation(q *pluginv1.QuotaResult) bool {
	if q == nil || len(q.Windows) > manifest.MaxQuotaHeaders || q.NextCheckAtUnix < 0 || q.ErrorType < pluginv1.QuotaResult_ERROR_TYPE_UNSPECIFIED || q.ErrorType > pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT {
		return false
	}
	seen := map[string]bool{}
	for _, w := range q.Windows {
		if w == nil || !observationQuotaKey.MatchString(w.Key) || seen[w.Key] || math.IsNaN(w.Utilization) || math.IsInf(w.Utilization, 0) || w.Utilization < 0 || w.Used < 0 || w.Limit < 0 || w.ResetsAtUnix < 0 || w.Status != manifest.NormalizeQuotaStatus(w.Status) {
			return false
		}
		if w.UtilizationUnknown && (w.Utilization != 0 || w.Used != 0 || w.Limit != 0) {
			return false
		}
		seen[w.Key] = true
	}
	return true
}

func (c *call) applyQuotaObservation(ctx context.Context, id int64, q *pluginv1.QuotaResult) {
	generation := c.availability[id].quota.GetGeneration()
	if q == nil || generation <= 0 {
		return
	}
	if !validQuotaObservation(q) {
		slog.WarnContext(ctx, "gateway: invalid quota observation", "account", id)
		return
	}
	if source := c.g.quotaSource(); source != nil {
		qctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), availabilityTimeout)
		defer cancel()
		if err := source.ApplyAccountQuotaObservation(qctx, id, generation, q); err != nil {
			slog.WarnContext(ctx, "gateway: apply quota observation", "account", id, "err", err)
		}
	}
}
