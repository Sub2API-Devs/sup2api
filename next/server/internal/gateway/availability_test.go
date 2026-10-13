package gateway

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

type availabilityPlugin struct {
	core.PlatformPlugin
	mu    sync.Mutex
	calls []*pluginv1.CheckModelAvailabilityRequest
	fn    func(context.Context, *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error)
}

func (p *availabilityPlugin) CheckModelAvailability(ctx context.Context, in *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
	p.mu.Lock()
	p.calls = append(p.calls, proto.Clone(in).(*pluginv1.CheckModelAvailabilityRequest))
	fn := p.fn
	p.mu.Unlock()
	if fn != nil {
		return fn(ctx, in)
	}
	out := &pluginv1.CheckModelAvailabilityResponse{}
	for _, v := range in.Candidates {
		state := pluginv1.ModelAvailability_AVAILABLE
		for _, w := range v.GetQuota().GetWindows() {
			if w.Status == manifest.QuotaRejected {
				state = pluginv1.ModelAvailability_UNAVAILABLE
			}
		}
		out.Results = append(out.Results, &pluginv1.ModelAvailability{AccountId: v.AccountId, Model: v.Model, State: state})
	}
	return out, nil
}

type availabilitySource struct {
	mu           sync.Mutex
	snapshots    map[int64]*pluginv1.AccountQuotaSnapshot
	reads        [][]int64
	observations []*pluginv1.QuotaResult
	generations  []int64
	err          error
}

func (s *availabilitySource) ObserveQuotaHeaders(int64, []manifest.QuotaHeader, int, http.Header) {}
func (s *availabilitySource) AccountQuotaSnapshots(_ context.Context, ids []int64) (map[int64]*pluginv1.AccountQuotaSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reads = append(s.reads, append([]int64(nil), ids...))
	out := map[int64]*pluginv1.AccountQuotaSnapshot{}
	for _, id := range ids {
		if q := s.snapshots[id]; q != nil {
			out[id] = proto.Clone(q).(*pluginv1.AccountQuotaSnapshot)
		}
	}
	return out, s.err
}
func (s *availabilitySource) ApplyAccountQuotaObservation(_ context.Context, id, generation int64, q *pluginv1.QuotaResult) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.generations = append(s.generations, generation)
	if generation <= 0 || s.snapshots[id].GetGeneration() != generation {
		return core.ErrConflict
	}
	s.observations = append(s.observations, q)
	s.snapshots[id] = &pluginv1.AccountQuotaSnapshot{Windows: q.Windows, Revision: s.snapshots[id].GetRevision() + 1, Generation: generation}
	return nil
}
func (s *availabilitySource) deny(ids ...int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, id := range ids {
		s.snapshots[id] = &pluginv1.AccountQuotaSnapshot{Revision: s.snapshots[id].GetRevision() + 1, Generation: s.snapshots[id].GetGeneration(), Windows: []*pluginv1.QuotaWindow{{Key: "scoped", Status: manifest.QuotaRejected}}}
	}
}
func enableAvailability(e *env, index int) (*availabilityPlugin, *availabilitySource) {
	b := &e.gen.accountTypes[index]
	b.Type.ModelAvailability = true
	p := &availabilityPlugin{PlatformPlugin: b.Client}
	b.Client = p
	s := &availabilitySource{snapshots: map[int64]*pluginv1.AccountQuotaSnapshot{}}
	e.gw.d.Quota = s
	return p, s
}

func TestAvailabilityHardFilterBeforeStickyAndRank(t *testing.T) {
	e := newEnv(t)
	e.enableSticky(onFailureFailover)
	_, source := enableAvailability(e, 0)
	sess := withSession(body(testModel, false), "availability")
	if r := e.messages(sess); r.status != 200 {
		t.Fatalf("initial %d %s", r.status, r.body)
	}
	e.record()
	source.deny(1)
	ranker := e.addRanker("zero", manifest.SchedulerRank{}, &fakeRanker{fn: func(_ context.Context, in *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
		var out []*pluginv1.RankedAccount
		for _, a := range in.Candidates {
			if a.AccountId == 1 {
				t.Error("denied sticky reached ranker")
			}
			out = append(out, rank(a.AccountId, 1, 0))
		}
		return out, nil
	}})
	if r := e.messages(sess); r.status != 200 {
		t.Fatalf("filtered %d %s", r.status, r.body)
	}
	if rec := e.record(); rec.AccountID == nil || *rec.AccountID != 2 || rec.StickyHit {
		t.Fatalf("record %+v", rec)
	}
	if ranker.count() != 1 || strings.Join(e.up.keys(), ",") != "acc-1,acc-2" {
		t.Fatalf("calls %v", e.up.keys())
	}
}

func TestAvailabilityFailuresDoNotFailOpen(t *testing.T) {
	for _, kind := range []string{"denied", "missing", "duplicate", "outside", "unknown", "invalid", "nil", "timeout", "unavailable", "unimplemented", "source", "no_source", "absent_checker"} {
		t.Run(kind, func(t *testing.T) {
			e := newEnv(t)
			p, s := enableAvailability(e, 0)
			want := 503
			switch kind {
			case "denied":
				s.deny(1, 2, 3)
				want = 429
			case "source":
				s.err = errors.New("snapshot failure")
			case "no_source":
				e.gw.d.Quota = nil
			case "absent_checker":
				e.gen.accountTypes[0].Client = e.plat
			default:
				p.fn = func(ctx context.Context, in *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
					switch kind {
					case "timeout":
						<-ctx.Done()
						return nil, ctx.Err()
					case "unavailable":
						return nil, core.ErrPluginUnavailable
					case "unimplemented":
						return nil, status.Error(codes.Unimplemented, "old")
					case "nil":
						return nil, nil
					}
					out := &pluginv1.CheckModelAvailabilityResponse{}
					for _, v := range in.Candidates {
						out.Results = append(out.Results, &pluginv1.ModelAvailability{AccountId: v.AccountId, Model: v.Model, State: pluginv1.ModelAvailability_AVAILABLE})
					}
					switch kind {
					case "missing":
						out.Results = out.Results[1:]
					case "duplicate":
						out.Results[1] = out.Results[0]
					case "outside":
						out.Results[0].AccountId = 999
					case "unknown":
						out.Results[0].State = pluginv1.ModelAvailability_UNKNOWN
						out.Results[1].State = pluginv1.ModelAvailability_UNKNOWN
						out.Results[2].State = pluginv1.ModelAvailability_UNKNOWN
					case "invalid":
						out.Results[0].State = 99
					}
					return out, nil
				}
			}
			r := e.messages(body(testModel, false))
			if r.status != want || e.plat.buildCount() != 0 || len(e.up.keys()) != 0 {
				t.Fatalf("%d %s builds=%d", r.status, r.body, e.plat.buildCount())
			}
			e.record()
		})
	}
}

func TestAvailabilityOptionalCompatibility(t *testing.T) {
	e := newEnv(t)
	p, s := enableAvailability(e, 0)
	e.gen.accountTypes[0].Type.ModelAvailability = false
	s.err = errors.New("must not read")
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("%d %s", r.status, r.body)
	}
	e.record()
	if len(p.calls) != 0 || len(s.reads) != 0 {
		t.Fatal("old declaration invoked availability")
	}
}

func TestAvailabilityMappedModelsAndBatch(t *testing.T) {
	e := newEnv(t)
	p, s := enableAvailability(e, 0)
	e.accounts.set(1, func(a *core.Account) {
		a.ModelMapping = map[string]string{testModel: "up-primary", "client-extra": "up-extra"}
	})
	refs, _ := e.accounts.Candidates(context.Background(), testGroup, []core.AccountTypeKey{{PluginKey: "anthropic", Type: "apikey"}})
	cl := &call{g: e.gw, gen: e.gen, platform: "anthropic", ep: endpointOf(t, builtinPlatform(t, "anthropic"), "anthropic.messages"), model: testModel, modelRefs: []modelReference{{model: "client-extra"}, {model: "client-extra"}}}
	cl.planRoutes()
	out, failure := cl.filterAvailability(context.Background(), refs)
	if failure != nil || len(out) != 3 || len(p.calls) != 1 || len(s.reads) != 1 {
		t.Fatalf("out=%v failure=%v", out, failure)
	}
	in := p.calls[0]
	if len(in.Candidates) != 6 || in.Candidates[0].Model != "up-primary" || in.Candidates[0].ClientModel != testModel || in.Candidates[1].Model != "up-extra" {
		t.Fatalf("request %v", in)
	}
	s.deny(1)
	if failure := cl.guardAvailability(context.Background(), &refs[0]); failure == nil || failure.Status != 429 {
		t.Fatalf("changed revision guard: %v", failure)
	}
}

type availabilityAccounts struct {
	*fakeAccounts
	*availabilitySource
}

func TestAvailabilityBatchesByOwnerAndOptionalAccountSource(t *testing.T) {
	e := newEnv(t)
	first, source := enableAvailability(e, 0)
	second := &availabilityPlugin{PlatformPlugin: e.plat}
	var deadline time.Time
	check := func(ctx context.Context, in *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
		got, ok := ctx.Deadline()
		if !ok || !deadline.IsZero() && !got.Equal(deadline) {
			t.Error("plugin owner reset the availability deadline")
		}
		deadline = got
		out := &pluginv1.CheckModelAvailabilityResponse{}
		for _, candidate := range in.Candidates {
			out.Results = append(out.Results, &pluginv1.ModelAvailability{AccountId: candidate.AccountId, Model: candidate.Model, State: pluginv1.ModelAvailability_AVAILABLE})
		}
		return out, nil
	}
	first.fn, second.fn = check, check
	b := e.gen.accountTypes[0]
	b.Plugin.Key, b.Client = "second", second
	e.gen.accountTypes = append(e.gen.accountTypes, b)
	e.accounts.addTyped(testGroup, 4, 2, "second-key", "second", "apikey")
	e.gw.d.Quota = nil
	e.gw.d.Accounts = &availabilityAccounts{fakeAccounts: e.accounts, availabilitySource: source}
	cl := &call{g: e.gw, gen: e.gen, platform: "anthropic", ep: endpointOf(t, builtinPlatform(t, "anthropic"), "anthropic.messages"), model: testModel}
	cl.planRoutes()
	refs, _ := e.accounts.Candidates(context.Background(), testGroup, cl.routeKeys)
	out, failure := cl.filterAvailability(context.Background(), refs)
	if failure != nil || len(out) != 4 || len(first.calls) != 1 || len(second.calls) != 1 || len(source.reads) != 1 || len(source.reads[0]) != 4 {
		t.Fatalf("batch: %v %v", out, failure)
	}
	if len(first.calls[0].Candidates) != 3 || len(second.calls[0].Candidates) != 1 || second.calls[0].Candidates[0].AccountId != 4 {
		t.Fatal("candidates crossed plugin ownership")
	}
}

func TestAvailabilityExecutionGuardAndFailover(t *testing.T) {
	for _, mode := range []string{"failover", "all"} {
		t.Run(mode, func(t *testing.T) {
			all := mode == "all"
			e := newEnv(t)
			_, source := enableAvailability(e, 0)
			e.plat.route = func(in *pluginv1.BuildUpstreamRequestRequest) string {
				if all || in.Account.Id == 1 {
					source.deny(in.Account.Id)
				}
				return e.up.srv.URL + "/v1/messages"
			}
			r := e.messages(body(testModel, false))
			want := 200
			if all {
				want = 429
			}
			if r.status != want {
				t.Fatalf("guard %d %s", r.status, r.body)
			}
			e.record()
			keys := strings.Join(e.up.keys(), ",")
			if all && keys != "" || !all && keys != "acc-2" {
				t.Fatalf("sent stale admission: %s", keys)
			}
		})
	}
}

func TestQuotaObservationUnknownUtilization(t *testing.T) {
	for _, test := range []struct {
		name   string
		window *pluginv1.QuotaWindow
		valid  bool
	}{
		{"unknown", &pluginv1.QuotaWindow{UtilizationUnknown: true}, true},
		{"legacy zero", &pluginv1.QuotaWindow{}, true},
		{"legacy numbers", &pluginv1.QuotaWindow{Utilization: 50, Used: 5, Limit: 10}, true},
		{"unknown utilization", &pluginv1.QuotaWindow{UtilizationUnknown: true, Utilization: 1}, false},
		{"unknown used", &pluginv1.QuotaWindow{UtilizationUnknown: true, Used: 1}, false},
		{"unknown limit", &pluginv1.QuotaWindow{UtilizationUnknown: true, Limit: 1}, false},
	} {
		t.Run(test.name, func(t *testing.T) {
			test.window.Key, test.window.Status = "scoped", manifest.QuotaRejected
			if got := validQuotaObservation(&pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{test.window}}); got != test.valid {
				t.Fatalf("valid=%v want %v: %v", got, test.valid, test.window)
			}
		})
	}
}

func TestAvailabilityQuotaObservationPreservesAdminPolicy(t *testing.T) {
	for _, mode := range []string{"facts", "admin", "plugin", "invalid"} {
		t.Run(mode, func(t *testing.T) {
			e := newEnv(t)
			_, source := enableAvailability(e, 0)
			source.snapshots[1] = &pluginv1.AccountQuotaSnapshot{Generation: 7}
			cl := &call{g: e.gw, rec: &core.UsageRecord{}, autoDisable: defaultAutoDisableSettings(), availability: map[int64]availabilityAdmission{1: {quota: &pluginv1.AccountQuotaSnapshot{Generation: 7}}}}
			q := &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "scoped", Status: manifest.QuotaRejected, Utilization: 100}}}
			cls := &pluginv1.ClassifyErrorResponse{Quota: q, Action: pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT}
			switch mode {
			case "admin":
				cl.autoDisable = AutoDisableSettings{Enabled: true, StatusCodes: "429"}.compiled()
			case "plugin":
				cls.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
			case "invalid":
				q.Windows[0].Key = "bad key"
			}
			cl.applyClassification(context.Background(), &typeRoute{binding: e.gen.accountTypes[0]}, &pluginv1.Account{Id: 1}, 429, nil, "", cls)
			if mode == "invalid" && len(source.observations) != 0 || mode != "invalid" && len(source.observations) != 1 {
				t.Fatalf("observations: %v", source.observations)
			}
			if mode == "admin" {
				if _, ok := e.accounts.disabled[1]; !ok {
					t.Fatal("admin disable ignored")
				}
				return
			}
			if len(e.accounts.disabled) != 0 {
				t.Fatal("quota facts disabled account")
			}
			if (len(e.accounts.cooldowns) > 0) != (mode == "plugin") {
				t.Fatalf("quota facts caused global cooldown: %v", e.accounts.cooldowns)
			}
		})
	}
}

func TestAvailabilityBoundedBatches(t *testing.T) {
	for _, mode := range []string{"valid", "missing", "duplicate", "outside", "timeout"} {
		t.Run(mode, func(t *testing.T) {
			e := newEnv(t)
			p, source := enableAvailability(e, 0)
			cl := &call{g: e.gw, gen: e.gen, platform: "anthropic", ep: endpointOf(t, builtinPlatform(t, "anthropic"), "anthropic.messages"), model: testModel, modelRefs: []modelReference{{model: "client-extra"}, {model: "client-other"}}}
			cl.planRoutes()
			refs := make([]core.AccountRef, 140)
			for i := range refs {
				refs[i] = core.AccountRef{ID: int64(i + 1), PluginKey: "anthropic", Type: "apikey", ModelMapping: map[string]string{"client-extra": "up-extra"}}
			}
			var deadline time.Time
			calls := 0
			p.fn = func(ctx context.Context, in *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
				calls++
				if len(in.Candidates) > 128 {
					t.Errorf("unbounded batch: %d", len(in.Candidates))
				}
				got, ok := ctx.Deadline()
				if !ok || calls > 1 && !got.Equal(deadline) {
					t.Error("batch reset the shared deadline")
				}
				deadline = got
				if mode == "timeout" {
					if calls == 1 {
						time.Sleep(availabilityTimeout / 2)
					} else {
						<-ctx.Done()
						return nil, ctx.Err()
					}
				}
				out := &pluginv1.CheckModelAvailabilityResponse{}
				for _, candidate := range in.Candidates {
					if candidate.ClientModel == "client-extra" && candidate.Model != "up-extra" {
						t.Error("mapped reference lost")
					}
					out.Results = append(out.Results, &pluginv1.ModelAvailability{AccountId: candidate.AccountId, Model: candidate.Model, State: pluginv1.ModelAvailability_AVAILABLE})
				}
				if calls == 2 {
					switch mode {
					case "missing":
						out.Results = out.Results[1:]
					case "duplicate":
						out.Results[1] = out.Results[0]
					case "outside":
						out.Results[0].AccountId = 1
					}
				}
				return out, nil
			}
			started := time.Now()
			out, failure := cl.filterAvailability(context.Background(), refs)
			if len(source.reads) != 1 {
				t.Fatalf("snapshot batches: %v", source.reads)
			}
			if mode == "valid" {
				if failure != nil || len(out) != len(refs) || calls != 4 {
					t.Fatalf("valid: %d %d %v", len(out), calls, failure)
				}
				return
			}
			if len(out) != 0 || failure == nil || failure.Status != 503 || calls != 2 {
				t.Fatalf("invalid batch admitted: %d %d %v", len(out), calls, failure)
			}
			if mode == "timeout" && time.Since(started) > availabilityTimeout*2 {
				t.Fatal("batch timeout was multiplied")
			}
		})
	}
}

func TestAvailabilityRetryAfterOnlyForCompleteDenial(t *testing.T) {
	for _, mode := range []string{"denied", "unknown_retry", "unknown_state", "bounded", "partial"} {
		t.Run(mode, func(t *testing.T) {
			e := newEnv(t)
			p, _ := enableAvailability(e, 0)
			e.gw.now = func() time.Time { return time.Unix(1000, 0) }
			p.fn = func(_ context.Context, in *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
				out := &pluginv1.CheckModelAvailabilityResponse{}
				for _, candidate := range in.Candidates {
					result := &pluginv1.ModelAvailability{AccountId: candidate.AccountId, Model: candidate.Model, State: pluginv1.ModelAvailability_UNAVAILABLE, RetryAtUnix: 1000 + 60*candidate.AccountId}
					if mode == "bounded" {
						result.RetryAtUnix = 1 << 62
					}
					if candidate.AccountId == 1 {
						switch mode {
						case "unknown_retry":
							result.RetryAtUnix = 0
						case "unknown_state":
							result.State = pluginv1.ModelAvailability_UNKNOWN
						case "partial":
							result.State = pluginv1.ModelAvailability_AVAILABLE
						}
					}
					out.Results = append(out.Results, result)
				}
				return out, nil
			}
			r := e.messages(body(testModel, false))
			e.record()
			want := ""
			if mode == "denied" {
				want = "60"
			}
			if mode == "bounded" {
				want = "3600"
			}
			if r.header.Get("Retry-After") != want {
				t.Fatalf("retry hint %q want %q (status %d)", r.header.Get("Retry-After"), want, r.status)
			}
		})
	}
}

func TestAvailabilityFeedbackUsesAdmissionGeneration(t *testing.T) {
	for _, mode := range []string{"current", "late_denial", "late_clear"} {
		t.Run(mode, func(t *testing.T) {
			e := newEnv(t)
			p, source := enableAvailability(e, 0)
			source.snapshots[1] = &pluginv1.AccountQuotaSnapshot{Generation: 7, Revision: 2}
			p.fn = func(_ context.Context, in *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
				in.Candidates[0].Quota.Generation = 999
				return &pluginv1.CheckModelAvailabilityResponse{Results: []*pluginv1.ModelAvailability{{AccountId: 1, Model: testModel, State: pluginv1.ModelAvailability_AVAILABLE}}}, nil
			}
			cl := &call{g: e.gw, gen: e.gen, platform: "anthropic", ep: endpointOf(t, builtinPlatform(t, "anthropic"), "anthropic.messages"), model: testModel}
			cl.planRoutes()
			ref := core.AccountRef{ID: 1, PluginKey: "anthropic", Type: "apikey"}
			if _, failure := cl.filterAvailability(context.Background(), []core.AccountRef{ref}); failure != nil {
				t.Fatal(failure)
			}
			if cl.availability[1].quota.Generation != 7 {
				t.Fatal("plugin mutated trusted admission generation")
			}
			status := manifest.QuotaRejected
			if mode != "current" {
				source.snapshots[1] = &pluginv1.AccountQuotaSnapshot{Generation: 8, Revision: 4, Windows: []*pluginv1.QuotaWindow{{Key: "scoped", Status: manifest.QuotaAllowed}}}
			}
			if mode == "late_clear" {
				status = manifest.QuotaAllowed
				source.snapshots[1].Windows[0].Status = manifest.QuotaRejected
			}
			before := proto.Clone(source.snapshots[1])
			cl.applyQuotaObservation(context.Background(), 1, &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "scoped", Status: status}}})
			if len(source.reads) != 1 {
				t.Fatal("feedback fetched a new generation instead of using admission")
			}
			if len(source.generations) != 1 || source.generations[0] != 7 {
				t.Fatalf("feedback generation: %v", source.generations)
			}
			if mode == "current" {
				if len(source.observations) != 1 || source.snapshots[1].Windows[0].Status != status {
					t.Fatal("current feedback rejected")
				}
				return
			}
			if len(source.observations) != 0 || !proto.Equal(before, source.snapshots[1]) {
				t.Fatal("late feedback poisoned new identity")
			}
			if failure := cl.guardAvailability(context.Background(), &ref); failure == nil || failure.Status != 503 {
				t.Fatalf("execution rebound to new identity: %v", failure)
			}
			if cl.availability[1].quota.Generation != 7 {
				t.Fatal("guard replaced the admitted identity")
			}
		})
	}
}

func TestAvailabilityFeedbackWithoutAdmissionIgnored(t *testing.T) {
	e := newEnv(t)
	_, source := enableAvailability(e, 0)
	for _, snapshot := range []*pluginv1.AccountQuotaSnapshot{nil, {}, {Generation: -1}} {
		cl := &call{g: e.gw, availability: map[int64]availabilityAdmission{1: {quota: snapshot}}}
		cl.applyQuotaObservation(context.Background(), 1, &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "scoped", Status: manifest.QuotaRejected}}})
	}
	if len(source.observations) != 0 || len(source.generations) != 0 {
		t.Fatal("unadmitted quota feedback persisted")
	}
}

func TestAvailabilityWebSocketGenerationCannotRebind(t *testing.T) {
	e := newWSEnv(t)
	_, source := enableAvailability(e.env, 1)
	source.snapshots[11] = &pluginv1.AccountQuotaSnapshot{Generation: 7}
	c := e.mustDial()
	c.send(create(wsModel, "first"))
	c.until("response.completed")
	e.record()
	source.mu.Lock()
	source.snapshots[11] = &pluginv1.AccountQuotaSnapshot{Generation: 8}
	source.mu.Unlock()
	c.send(create(wsModel, "second"))
	ev, err := c.next()
	if err != nil || ev.Get("type").String() != "error" || ev.Get("status").Int() != 503 {
		t.Fatalf("reauthorized turn: %s %v", ev.Raw, err)
	}
	e.record()
	keys, messages := e.wsUp.snapshot()
	if len(keys) != 1 || keys[0] != "oa-11" || len(messages) != 1 {
		t.Fatalf("session rebound after reauthorization: %v %v", keys, messages)
	}
}

func TestAvailabilityWebSocketReuseKeepsContext(t *testing.T) {
	e := newWSEnv(t)
	_, source := enableAvailability(e.env, 1)
	source.deny(11)
	c := e.mustDial()
	c.send(create(wsModel, "first"))
	c.until("response.completed")
	if r := e.record(); r.AccountID == nil || *r.AccountID != 12 {
		t.Fatalf("account: %+v", r)
	}
	source.deny(12)
	c.send(create(wsModel, "second"))
	ev, err := c.next()
	if err != nil || ev.Get("type").String() != "error" || ev.Get("status").Int() != 429 {
		t.Fatalf("reuse event %s %v", ev.Raw, err)
	}
	e.record()
	keys, messages := e.wsUp.snapshot()
	if len(keys) != 1 || keys[0] != "oa-12" || len(messages) != 1 {
		t.Fatalf("silently moved/forwarded: %v %v", keys, messages)
	}
}
