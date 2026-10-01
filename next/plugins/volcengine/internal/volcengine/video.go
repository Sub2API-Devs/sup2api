package volcengine

// Ark video (Seedance) uses the core's managed async tasks. The host durably
// binds owner/account/model and returns its own public task ID before success.
// A single claimed core poll supplies both billing and the shared query snapshot.
//
//	POST /ark/v3/contents/generations/tasks        video_submit (usageSource plugin)
//	GET  /ark/v3/contents/generations/tasks/:id    video_query  (core snapshot, billing free)
//
//	ParseTaskSubmission    parses the upstream ID, initial snapshot and estimate
//	ExtractUsage           computes that estimate without storing task identity
//	ResolveModel           retained only for old manifest compatibility
//	Monitor                observes once, then reports progress through the SDK
//	Poll                   one query through the core's scoped execution API,
//	                       shared with the legacy return-based poll interface
//
// The submit is gateway proxy traffic; client queries read the host's snapshot.
// The core schedules Monitor and binds its execution context to the original
// account, proxy and deadline. Its Poll helper requests exactly one HTTP exchange
// through that context and never opens its own socket or retries. Response
// parsing needs no plugin database; the old ledger is retained only as history.

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tidwall/gjson"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Protocol ids of the two video endpoints declared in manifest.json.
const (
	// ProtocolVideoSubmit is Seedance task submission, served to clients at
	// POST /ark/v3/contents/generations/tasks. Its usage is read by the
	// plugin (usageSource "plugin") because the submit response carries only
	// the task id: the real usage is not known until the task finishes, so
	// ExtractUsage returns a Reservation instead of a usage number.
	ProtocolVideoSubmit = "volcengine.video_submit"
	// ProtocolVideoQuery is the client's poll of one task, GET
	// /ark/v3/contents/generations/tasks/:task_id. The request has no model,
	// so the core looks it up from the managed task; the endpoint is
	// billing "free" because charging happens only in the reconcile loop, no
	// matter how many times a client polls.
	ProtocolVideoQuery = "volcengine.video_query"
)

// TaskIDParam is the path parameter of the query endpoint, and the key the
// core fills in RequestMeta.path_params (CONTRACTS §25.1).
const TaskIDParam = "task_id"

// videoTasksPath is Ark's own task collection, under the account's video
// prefix. Note the asymmetry with the client-facing path: clients call
// /ark/v3/... because "api" is a core-reserved first segment.
//
// A function rather than a constant because the prefix is per account: a relay
// may mount Ark's native video tasks under its own namespace
// ("/doubao/api/v3") while serving text at the root, and the first real
// upstream this plugin was verified against does exactly that.
func videoTasksPath(prefix string) string { return prefix + "/contents/generations/tasks" }

// Resolution tiers: the vocabulary of the "resolution" fact declared on the
// video_submit endpoint, and the tiers the token estimate understands.
const (
	Res480  = "480p"
	Res720  = "720p"
	Res1080 = "1080p"
	Res4K   = "4k"
)

// FactResolution is the metering fact key the endpoint declares.
const FactResolution = "resolution"

// VideoResolutions is the enum declared for the resolution fact, and the tiers
// the pixel table in videospec.go has areas for. Ark publishes no "2k", so
// there is none here.
var VideoResolutions = []string{Res480, Res720, Res1080, Res4K}

// DeadlineSec is how long a task can be reconciled at all: Ark keeps a video
// task queryable for 7 days, after which no answer exists to be had. The
// plugin states this upstream fact; the core clamps it with the
// max_reconcile_age_sec setting, whose default is also 7 days (604800) since
// CONTRACTS §25.6 - so this value passes through unchanged and a task running
// for days is reconciled rather than abandoned on its estimate.
const DeadlineSec = 7 * 24 * 60 * 60

// firstCheckSec / runningCheckSec pace the reconcile poll. Seedance tasks
// finish in tens of seconds to a few minutes, so there is no point asking in
// the first few seconds. The core clamps both into its own 5s..6h range and
// uses them instead of its backoff ladder, because the plugin is the only
// party that knows how long this upstream takes (CONTRACTS §25.4).
const (
	firstCheckSec   = 20
	runningCheckSec = 30
)

// The estimate itself lives in videospec.go. What used to be here - a
// tier-to-16:9-pixels switch, a fixed 10-second assumption and a
// ModelMaxResolution table - could not do better, because ExtractUsage was not
// shown the request (CONTRACTS §25.5 gap 1). It is now, so the estimate reads
// the requested resolution, ratio and duration instead of guessing them, and
// uses Ark's own per-generation pixel table rather than assuming 16:9.

// ---------------------------------------------------------------- video_tasks store

// VideoTask reads historical plugin rows for old manifest compatibility.
// New tasks and reservations live exclusively in the host. This legacy table
// is not an authorization source for the host's managed or imported tasks.
type VideoTask struct {
	Model     string
	State     string
	UserID    int64
	AccountID int64
}

// lookupVideoTask reads one task by its upstream id. A missing row is
// (nil, nil): the caller decides what that means (ResolveModel turns it into
// an empty model, i.e. a 400).
func lookupVideoTask(ctx context.Context, db *pgxpool.Pool, taskID string) (*VideoTask, error) {
	var t VideoTask
	err := db.QueryRow(ctx, `SELECT model, state, user_id, account_id FROM video_tasks WHERE task_id = $1`, taskID).
		Scan(&t.Model, &t.State, &t.UserID, &t.AccountID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// ---------------------------------------------------------------- upstream path

// videoUpstream returns the method and Ark path of a video protocol. ok is
// false for every other protocol, which BuildUpstreamRequest then handles the
// way it always did.
//
// video_query takes the task id from the matched path parameter
// (RequestMeta.path_params, filled by the core since CONTRACTS §25.1) and
// escapes it into the URL: it is client input, and this is the one place on
// the video line where client input becomes part of an upstream address.
func videoUpstream(prefix string, meta *pluginv1.RequestMeta) (method, path string, ok bool, err error) {
	switch meta.GetProtocol() {
	case ProtocolVideoSubmit:
		return "POST", videoTasksPath(prefix), true, nil
	case ProtocolVideoQuery:
		id := taskIDOf(meta)
		if id == "" {
			return "", "", true, status.Error(codes.InvalidArgument, "task_id path parameter is required")
		}
		return "GET", videoTasksPath(prefix) + "/" + url.PathEscape(id), true, nil
	default:
		return "", "", false, nil
	}
}

// taskIDOf reads the task_id path parameter.
func taskIDOf(meta *pluginv1.RequestMeta) string {
	return strings.TrimSpace(meta.GetPathParams()[TaskIDParam])
}

// ---------------------------------------------------------------- ResolveModel

// ResolveModel remains for callers holding an old endpoint manifest. The
// current manifest routes queries through the host's task owner/account checks
// and never uses this method. Missing and foreign legacy rows are identical.
func (p *Plugin) ResolveModel(ctx context.Context, in *pluginv1.ResolveModelRequest) (*pluginv1.ResolveModelResponse, error) {
	if in.GetMeta().GetProtocol() != ProtocolVideoQuery {
		// Only historical video queries used plugin model resolution. Another
		// protocol here is a routing mismatch, never a model to invent.
		return &pluginv1.ResolveModelResponse{}, nil
	}
	id := taskIDOf(in.GetMeta())
	if id == "" {
		return &pluginv1.ResolveModelResponse{}, nil
	}
	db, err := p.pool(ctx)
	if err != nil {
		// A database blip must not be served as a free, unlimited request.
		p.log.Warn("volcengine: ResolveModel cannot reach the database", "task_id", id, "error", err.Error())
		return &pluginv1.ResolveModelResponse{}, nil
	}
	t, err := lookupVideoTask(ctx, db, id)
	if err != nil {
		p.log.Warn("volcengine: ResolveModel lookup failed", "task_id", id, "error", err.Error())
		return &pluginv1.ResolveModelResponse{}, nil
	}
	if t == nil || t.Model == "" || in.GetMeta().GetUserId() <= 0 || t.UserID != in.GetMeta().GetUserId() {
		return &pluginv1.ResolveModelResponse{}, nil
	}
	// The video poll is a plain JSON GET; it never streams.
	return &pluginv1.ResolveModelResponse{Model: t.Model}, nil
}

// ---------------------------------------------------------------- ExtractUsage

// taskIDPaths are the response fields a task id may arrive in, in order. Ark
// documents "id"; the others are cheap insurance against a relay that wraps
// the answer, and cost one gjson probe on a path that only runs once per
// submit.
var taskIDPaths = []string{"id", "task_id", "data.id", "result.id"}

var _ pluginsdk.TaskSubmissionParser = (*Plugin)(nil)

// ParseTaskSubmission is synchronous on the managed task path. It describes
// the upstream task and initial query response; only the host persists owner,
// original account, task ID and reservation before returning to the client.
func (p *Plugin) ParseTaskSubmission(ctx context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.TaskSubmission, error) {
	if in.GetMeta().GetProtocol() != ProtocolVideoSubmit {
		return nil, status.Error(codes.Unimplemented, "only video submissions create tasks")
	}
	if in.GetTruncated() || in.GetStatus() < 200 || in.GetStatus() >= 300 || !gjson.ValidBytes(in.GetBody()) || !gjson.ParseBytes(in.GetBody()).IsObject() {
		return nil, status.Error(codes.DataLoss, "video submission did not return a complete successful JSON object")
	}
	usage, err := p.ExtractUsage(ctx, in)
	if err != nil {
		return nil, err
	}
	ref := usage.GetReserve().GetRefId()
	if ref == "" {
		return nil, status.Error(codes.DataLoss, "video submission did not return a task id")
	}
	snapshot, err := videoSnapshot(in.GetBody(), ref, in.GetMeta().GetModel(), true)
	if err != nil {
		return nil, status.Error(codes.DataLoss, "invalid video submission snapshot")
	}
	return &pluginv1.TaskSubmission{UpstreamRefId: ref, SnapshotJson: snapshot, Usage: usage,
		NextCheckAfterSec: firstCheckSec, DeadlineSec: DeadlineSec}, nil
}

// Preserve the complete upstream payload (including result URLs and errors),
// adding only query fields absent from submit/relay responses. The core rewrites
// the upstream IDs to its opaque public task ID before serving the snapshot.
func videoSnapshot(body []byte, ref, model string, initial bool) (string, error) {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(body, &obj); err != nil {
		return "", err
	}
	if obj == nil {
		return "", errors.New("task response must be an object")
	}
	if len(obj["id"]) == 0 {
		obj["id"], _ = json.Marshal(ref)
	}
	if initial {
		if len(obj["status"]) == 0 {
			obj["status"] = json.RawMessage(`"queued"`)
		}
		if len(obj["model"]) == 0 && model != "" {
			obj["model"], _ = json.Marshal(model)
		}
	}
	out, err := json.Marshal(obj)
	return string(out), err
}

// ExtractUsage implements pluginsdk.UsageExtractor for the video_submit
// endpoint. The submit response is {"id": "..."} and carries nothing
// billable, so this reads the task id and returns a
// Reservation: the core pre-charges the estimate now and reconciles the real
// usage later.
//
// Any other protocol gets an error rather than an empty report, and that
// difference matters: an empty report would be APPLIED - zeroing the token
// counts the declarative rules had already extracted - while an error makes
// the core keep those rules' result and mark the record (CONTRACTS §25.3).
func (p *Plugin) ExtractUsage(ctx context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
	if in.GetMeta().GetProtocol() != ProtocolVideoSubmit {
		return nil, status.Errorf(codes.Unimplemented,
			"volcengine reads usage for %q only, not %q", ProtocolVideoSubmit, in.GetMeta().GetProtocol())
	}
	taskID := ""
	for _, path := range taskIDPaths {
		v := gjson.GetBytes(in.GetBody(), path)
		if v.Type == gjson.String && strings.TrimSpace(v.Str) != "" {
			taskID = strings.TrimSpace(v.Str)
			break
		}
	}
	if taskID == "" {
		// A submit that returned no id can never be polled or reconciled, so
		// pre-charging an estimate nothing will ever correct is worse than
		// billing nothing at all. No usage and no reservation: the request
		// falls back to the (empty) declarative rules and is not charged.
		p.log.Warn("volcengine: video submit response carried no task id, not reserving",
			"request_id", in.GetMeta().GetRequestId(), "status", in.GetStatus())
		return &pluginv1.UsageReport{}, nil
	}
	model := in.GetMeta().GetModel()
	spec := readVideoSpec(in.GetFields(), in.GetFieldsOmitted())
	est := estimateVideo(model, spec)
	if len(est.Assumed) > 0 {
		// The one line that explains an unexpectedly large pre-charge. An
		// estimate that had to bound something is not an error - a client may
		// legitimately leave duration to the model - but it is the difference
		// between "you were charged for what you asked for" and "you were
		// charged for the most this model could have done", and nobody should
		// have to guess which happened.
		p.log.Info("volcengine: video estimate had to assume part of the request",
			"request_id", in.GetMeta().GetRequestId(), "task_id", taskID, "model", model,
			"assumed", strings.Join(est.Assumed, ","), "resolution", est.Resolution,
			"est_output_tokens", est.Tokens, "fields_omitted", strings.Join(in.GetFieldsOmitted(), ","))
	}
	tokens := &pluginv1.UsageTokens{OutputTokens: est.Tokens}
	facts := map[string]string{FactResolution: est.Resolution}

	return &pluginv1.UsageReport{
		// The report carries the estimate TOO, not only the reservation, and
		// that is not redundancy. When the core cannot use a ref_id it drops
		// the reservation and bills the request "normally" - from these
		// fields. Leaving them empty would turn a submit the core refused to
		// track into a silently free one; with them, the estimate is charged
		// at once, which is the right end for work that really started
		// upstream and can never be reconciled. On the normal path the
		// reservation replaces them with the same numbers (CONTRACTS §25.4).
		Tokens: tokens,
		Facts:  facts,
		// Reservation.tokens is the single source of truth while the task
		// runs: the core prices, charges and records it as this request's
		// usage until a reconcile replaces it.
		Reserve: &pluginv1.Reservation{
			RefId:             taskID,
			Tokens:            tokens,
			Facts:             facts,
			NextCheckAfterSec: firstCheckSec,
			DeadlineSec:       DeadlineSec,
		},
	}, nil
}

// ---------------------------------------------------------------- reconcile

// Poll implements pluginsdk.Poller. The host owns scheduling and the scoped
// execution context; the plugin performs one query and interprets the result.
// An execution failure is returned to the host, never retried in this process.
func (p *Plugin) Poll(ctx context.Context, in *pluginv1.PollRequest) (*pluginv1.ReconcileResult, error) {
	req, err := p.BuildReconcileRequest(ctx, &pluginv1.BuildReconcileRequestRequest{
		Entry: in.GetEntry(), Account: in.GetAccount(),
	})
	if err != nil {
		return nil, err
	}
	resp, err := pluginsdk.ExecuteHTTP(ctx, &pluginv1.ExecutionHTTPRequest{
		Method: req.GetMethod(), Url: req.GetUrl(), Headers: req.GetHeaders(),
	})
	if err != nil {
		return nil, err
	}
	return p.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
		Entry: in.GetEntry(), Status: resp.GetStatus(), Headers: resp.GetHeaders(),
		Body: resp.GetBody(), TransportError: resp.GetTransportError(), Truncated: resp.GetTruncated(),
	})
}

// BuildReconcileRequest retains the legacy pluginsdk.Reconciler interface and
// is the request builder for Poll. It describes GET
// {base}{video_api_prefix}/contents/generations/tasks/{ref_id} using the original
// account credentials supplied by the host. New hosts invoke Poll once instead
// of splitting request construction and response parsing into separate RPCs.
//
// It must use the SAME prefix as submission; a wrong path can report not found.
func (p *Plugin) BuildReconcileRequest(_ context.Context, in *pluginv1.BuildReconcileRequestRequest) (*pluginv1.BuildReconcileRequestResponse, error) {
	ref := strings.TrimSpace(in.GetEntry().GetRefId())
	if ref == "" {
		return nil, status.Error(codes.InvalidArgument, "reconcile entry has no ref_id")
	}
	cfg, px, err := accountConfig(in.GetAccount())
	if err != nil {
		// Credentials are withheld when the account type belongs to another
		// plugin - impossible for video, where both are this plugin, but
		// without a key there is no poll to build.
		return nil, status.Errorf(codes.FailedPrecondition, "reconcile needs the account credentials: %v", err)
	}
	u, err := upstreamURL(cfg.BaseURL, videoTasksPath(px.video)+"/"+url.PathEscape(ref))
	if err != nil {
		return nil, err
	}
	return &pluginv1.BuildReconcileRequestResponse{
		Method:  "GET",
		Url:     u,
		Headers: map[string]string{"authorization": "Bearer " + cfg.APIKey},
	}, nil
}

// ParseReconcileResponse retains the legacy pluginsdk.Reconciler interface and
// is Poll's pure response parser. It reads Ark's task status and states what
// the core should do with the pre-charged row.
//
//	queued / running           -> PENDING, ask again
//	succeeded + a usage figure  -> SETTLED, tokens = usage.completion_tokens
//	succeeded, no usage figure  -> SETTLED_ESTIMATE, the estimate is the charge
//	failed / expired/cancelled -> FAILED, reason from error.message
//	404 / 410                 -> NOT_FOUND
//	query / parse error       -> POLL_FAILED; host owns retries and the cutoff
func (p *Plugin) ParseReconcileResponse(ctx context.Context, in *pluginv1.ParseReconcileResponseRequest) (*pluginv1.ReconcileResult, error) {
	ref := strings.TrimSpace(in.GetEntry().GetRefId())
	pending := &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_PENDING, NextCheckAfterSec: runningCheckSec}
	if result := pluginsdk.ClassifyPollResponse(in.GetStatus(), in.GetTransportError(), in.GetTruncated()); result != nil {
		return result, nil
	}
	body := in.GetBody()
	if !gjson.ValidBytes(body) || !gjson.ParseBytes(body).IsObject() {
		return pluginsdk.PollFailure("invalid task query JSON"), nil
	}
	snapshot, err := videoSnapshot(body, ref, in.GetEntry().GetModel(), false)
	if err != nil {
		return pluginsdk.PollFailure("invalid task query snapshot"), nil
	}
	pending.TaskSnapshotJson = snapshot
	switch st := strings.ToLower(strings.TrimSpace(gjson.GetBytes(body, "status").String())); st {
	case "queued", "pending", "running", "processing":
		return pending, nil
	case "succeeded":
		tokens := succeededTokens(body)
		if tokens <= 0 {
			// Ark confirmed the work and reported no usage for it. Answering
			// SETTLED with the zero we can read would reprice the row at zero
			// and REFUND the whole reservation: the video was delivered, so
			// that is one given away, and nothing in the record would say so.
			//
			// SETTLED_ESTIMATE is the core's answer for exactly this (CONTRACTS
			// §25.6): the reservation stands as the final usage and the final
			// charge, no money moves, and the row is marked reconcile=estimated
			// so an operator - and /usage/summary's estimated_cost column - can
			// tell it from a row whose usage was confirmed. tokens and facts
			// are ignored in this state, so none are sent.
			p.log.Warn("volcengine: succeeded video task reported no usage, settling on the reserved estimate",
				"task_id", ref)
			return &pluginv1.ReconcileResult{
				State:            pluginv1.ReconcileResult_SETTLED_ESTIMATE,
				Reason:           "Ark reported the task as succeeded without a usage object",
				TaskSnapshotJson: snapshot,
			}, nil
		}
		return &pluginv1.ReconcileResult{
			State:            pluginv1.ReconcileResult_SETTLED,
			Tokens:           &pluginv1.UsageTokens{OutputTokens: tokens},
			Facts:            succeededFacts(body),
			TaskSnapshotJson: snapshot,
		}, nil
	case "failed", "expired", "cancelled", "canceled":
		reason := strings.TrimSpace(gjson.GetBytes(body, "error.message").String())
		if reason == "" {
			reason = st
		}
		return &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_FAILED, Reason: reason, TaskSnapshotJson: snapshot}, nil
	default:
		// An unrecognised status is not guessed into "done" (which settles)
		// or "failed" (which refunds). The host counts this query failure.
		p.log.Warn("volcengine: unrecognised video task status", "task_id", ref, "status", st)
		return pluginsdk.PollFailure("unrecognized task status"), nil
	}
}

// succeededTokens is the real output-token usage of a finished task:
// usage.completion_tokens, falling back to usage.total_tokens. It returns 0
// when Ark reports a succeeded task with NO usage at all, which the caller
// turns into SETTLED_ESTIMATE rather than into a settle at zero.
//
// It does not read the historical plugin est_tokens column: that column was this
// plugin's workaround for a core that could not express "keep the estimate",
// and reading it here meant the plugin restating a figure the core already
// held on the reserved row - two copies of one number, with the plugin's copy
// the one that could be missing (a ledger write that failed at submit, a task
// from before the table existed) and silently settle the row at zero.
func succeededTokens(body []byte) int64 {
	if n := gjson.GetBytes(body, "usage.completion_tokens").Int(); n > 0 {
		return n
	}
	return gjson.GetBytes(body, "usage.total_tokens").Int()
}

// succeededFacts reports the REAL resolution as the resolution fact when Ark
// names one the manifest declares - replacing the estimate's guess.
// content.resolution first (where a finished task carries it), then a
// top-level resolution.
func succeededFacts(body []byte) map[string]string {
	r := strings.ToLower(strings.TrimSpace(gjson.GetBytes(body, "content.resolution").String()))
	if r == "" {
		r = strings.ToLower(strings.TrimSpace(gjson.GetBytes(body, "resolution").String()))
	}
	for _, known := range VideoResolutions {
		if r == known {
			return map[string]string{FactResolution: r}
		}
	}
	return nil
}

// pool returns the plugin's database pool.
func (p *Plugin) pool(ctx context.Context) (*pgxpool.Pool, error) {
	if p.host == nil {
		return nil, errors.New("plugin not initialised")
	}
	return p.host.DB(ctx)
}
