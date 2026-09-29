package volcengine

// Ark video (Seedance): the async task line built on the A/B/C/D core
// extensions (docs/PLUGIN-VOLCENGINE-ARK.md §4.3/§5, CONTRACTS §25). Two
// gateway endpoints and three optional PlatformService methods:
//
//	POST /ark/v3/contents/generations/tasks        video_submit (usageSource plugin)
//	GET  /ark/v3/contents/generations/tasks/:id    video_query  (modelSource plugin, billing free)
//
//	ExtractUsage           reads the task id out of the submit response,
//	                       records it and PRE-CHARGES an estimate (Reservation)
//	ResolveModel           the query endpoint has no model in the request, so
//	                       it looks the task_id up here (hot path)
//	Build/ParseReconcile   the core-driven checking loop: the core sends the
//	                       request, the plugin only describes it and reads it
//
// WHO SENDS WHAT. Nothing on this line is a socket the plugin opens. The
// submit and the poll are ordinary gateway proxy traffic - the core forwards
// them, this plugin only rewrites the URL in BuildUpstreamRequest. The
// reconcile poll is also sent by the core (through the account's proxy and
// SSRF guard); BuildReconcileRequest only DESCRIBES it. So unlike the asset
// library (arkapi.go, which really dials out), the video line never needs the
// plugin's own network - only its database, for the task ledger.

import (
	"context"
	"errors"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tidwall/gjson"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
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
	// so ResolveModel looks it up (modelSource "plugin"); the endpoint is
	// billing "free" because charging happens only in the reconcile loop, no
	// matter how many times a client polls.
	ProtocolVideoQuery = "volcengine.video_query"
)

// TaskIDParam is the path parameter of the query endpoint, and the key the
// core fills in RequestMeta.path_params (CONTRACTS §25.1).
const TaskIDParam = "task_id"

// videoTasksPath is Ark's own task collection, under APIPrefix. Note the
// asymmetry with the client-facing path: clients call /ark/v3/... because
// "api" is a reserved first segment of the core.
const videoTasksPath = APIPrefix + "/contents/generations/tasks"

// Task states mirrored into video_tasks.state.
const (
	TaskRunning = "running"
	TaskDone    = "done"
	TaskFailed  = "failed"
)

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

// VideoResolutions is the enum declared for the resolution fact; a value
// upstream reports that is not one of these is not reported as a fact (the
// core would drop it anyway, with a warning).
var VideoResolutions = []string{Res480, Res720, Res1080, Res4K}

// EstimateDurationSec is the clip length the reservation estimate assumes.
//
// THE ESTIMATE CANNOT SEE THE REQUEST. ExtractUsage is given the response,
// the account and the meta - not the submit body - so the requested
// resolution and duration are not available to it (see the stage-five report:
// this is a real gap in ExtractUsageRequest). The estimate is therefore built
// from what IS known, the model, plus a conservative duration at or above
// Ark Seedance's common maximum. It is corrected in full at reconcile, so
// being a little high only over-reserves briefly.
const EstimateDurationSec = 10

// DeadlineSec is how long a task can be reconciled at all: Ark keeps a video
// task queryable for 7 days, after which no answer exists to be had. The
// plugin states this upstream fact; the core clamps it with the
// max_reconcile_age_sec setting - whose default is 24h, which must be raised
// before this endpoint goes live or every task running past a day is
// abandoned on its estimate (CONTRACTS §25.4).
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

// resolutionPixels is the frame size of a tier, for the token estimate.
func resolutionPixels(resolution string) (w, h int64) {
	switch resolution {
	case Res480:
		return 854, 480
	case Res1080:
		return 1920, 1080
	case Res4K:
		return 3840, 2160
	default: // 720p and anything unrecognised
		return 1280, 720
	}
}

// EstimateTokens is Ark's published rule of thumb for a Seedance clip's
// completion tokens: seconds x width x height x 24fps / 1024. Only ever an
// estimate here - the reconcile settles on the real usage.completion_tokens.
func EstimateTokens(seconds int64, resolution string) int64 {
	w, h := resolutionPixels(resolution)
	return seconds * w * h * 24 / 1024
}

// ModelMaxResolution is the tier the estimate assumes for a model. Since the
// requested tier is not visible to ExtractUsage, the estimate uses the
// model's HIGHEST supported one: over-reserving briefly is safe, under-
// reserving would let a $0 balance queue an expensive 4k task for the price
// of a 1080p one, and the pre-charge exists precisely to stop that.
//
// Unknown models get 1080p, the common Seedance maximum; the 4k-capable
// families are recognised so they are not under-reserved. The table is coarse
// on purpose - it only shifts a pre-charge that the reconcile then corrects
// exactly - and it must never grow into a model registry (Ark has no
// API-key-callable model list; models are entered by an administrator).
func ModelMaxResolution(model string) string {
	m := strings.ToLower(model)
	if strings.Contains(m, "seedance-2-0") && !strings.Contains(m, "fast") && !strings.Contains(m, "mini") {
		return Res4K
	}
	return Res1080
}

// ---------------------------------------------------------------- video_tasks store

// VideoTask is the part of a video_tasks row the plugin reads back.
type VideoTask struct {
	Model     string
	EstTokens int64
	State     string
}

// insertVideoTask records a submitted task. task_id is the upstream id and
// the primary key; a resubmit that somehow yields the same id updates the row
// instead of duplicating it, so there is exactly one row per upstream task.
func insertVideoTask(ctx context.Context, db *pgxpool.Pool, taskID string, accountID, userID int64, model string, est int64) error {
	_, err := db.Exec(ctx, `
		INSERT INTO video_tasks (task_id, account_id, model, user_id, state, est_tokens)
		VALUES ($1, $2, $3, $4, 'running', $5)
		ON CONFLICT (task_id) DO UPDATE
		   SET account_id = excluded.account_id, model = excluded.model,
		       user_id = excluded.user_id, est_tokens = excluded.est_tokens, updated_at = now()`,
		taskID, accountID, model, userID, est)
	return err
}

// lookupVideoTask reads one task by its upstream id. A missing row is
// (nil, nil): the caller decides what that means (ResolveModel turns it into
// an empty model, i.e. a 400).
func lookupVideoTask(ctx context.Context, db *pgxpool.Pool, taskID string) (*VideoTask, error) {
	var t VideoTask
	err := db.QueryRow(ctx, `SELECT model, est_tokens, state FROM video_tasks WHERE task_id = $1`, taskID).
		Scan(&t.Model, &t.EstTokens, &t.State)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// setVideoTaskState records the last reconciliation result. Best-effort: the
// core settles money against usage_logs, not this column.
func setVideoTaskState(ctx context.Context, db *pgxpool.Pool, taskID, state string) error {
	_, err := db.Exec(ctx, `UPDATE video_tasks SET state = $2, updated_at = now() WHERE task_id = $1`, taskID, state)
	return err
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
func videoUpstream(meta *pluginv1.RequestMeta) (method, path string, ok bool, err error) {
	switch meta.GetProtocol() {
	case ProtocolVideoSubmit:
		return "POST", videoTasksPath, true, nil
	case ProtocolVideoQuery:
		id := taskIDOf(meta)
		if id == "" {
			return "", "", true, status.Error(codes.InvalidArgument, "task_id path parameter is required")
		}
		return "GET", videoTasksPath + "/" + url.PathEscape(id), true, nil
	default:
		return "", "", false, nil
	}
}

// taskIDOf reads the task_id path parameter.
func taskIDOf(meta *pluginv1.RequestMeta) string {
	return strings.TrimSpace(meta.GetPathParams()[TaskIDParam])
}

// ---------------------------------------------------------------- ResolveModel

// ResolveModel implements pluginsdk.ModelResolver for the video_query
// endpoint, whose request carries no model at all. The task id in the URL is
// looked up in video_tasks and the model the submit billed as is returned, so
// the core evaluates the poll against the same model as the submit.
//
// A task_id that is not in the ledger returns an EMPTY model, which the core
// turns into 400 "model is required". That is deliberate, and the alternative
// - falling back to ordinary scheduling and letting Ark answer - was
// rejected: a poll the plugin cannot attribute to a model cannot be checked
// against the client's group allowlist, and an unknown task 404s upstream
// anyway. A clean 400 beats a scheduled request that dies upstream. The row
// is written at submit and never deleted, so the ways to miss are: a task
// from another installation, a submit whose ledger write failed, or a
// database that is down - each a 400, none a silent pass.
func (p *Plugin) ResolveModel(ctx context.Context, in *pluginv1.ResolveModelRequest) (*pluginv1.ResolveModelResponse, error) {
	if in.GetMeta().GetProtocol() != ProtocolVideoQuery {
		// video_query is the only endpoint declaring modelSource "plugin";
		// another protocol here is a routing mismatch, not a model the plugin
		// may invent. Empty model -> 400.
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
	if t == nil || t.Model == "" {
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

// ExtractUsage implements pluginsdk.UsageExtractor for the video_submit
// endpoint. The submit response is {"id": "..."} and carries nothing
// billable, so this reads the task id, records the task and returns a
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
		if v := strings.TrimSpace(gjson.GetBytes(in.GetBody(), path).String()); v != "" {
			taskID = v
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
	resolution := ModelMaxResolution(model)
	est := EstimateTokens(EstimateDurationSec, resolution)
	tokens := &pluginv1.UsageTokens{OutputTokens: est}
	facts := map[string]string{FactResolution: resolution}

	// Record the task so the poll can resolve its model and a succeeded-but-
	// usage-less task can settle on its estimate. A write failure does NOT
	// stop the reservation: the core reconciles from pending_settlements and
	// the account, never from this table, so revenue is protected either way
	// and only the client's own polling would degrade to a 400.
	if db, err := p.pool(ctx); err != nil {
		p.log.Error("volcengine: cannot record a video task (reserving anyway)",
			"task_id", taskID, "error", err.Error())
	} else if err := insertVideoTask(ctx, db, taskID, in.GetAccount().GetId(), in.GetMeta().GetUserId(), model, est); err != nil {
		p.log.Error("volcengine: cannot record a video task (reserving anyway)",
			"task_id", taskID, "error", err.Error())
	}

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

// BuildReconcileRequest implements pluginsdk.Reconciler: it DESCRIBES the
// poll, GET {base}/api/v3/contents/generations/tasks/{ref_id}. The core sends
// it, through the account's proxy and behind its SSRF guard, with the
// account's credentials - present here because the video platform and the
// apikey account type belong to the same plugin (CONTRACTS §25.4).
func (p *Plugin) BuildReconcileRequest(_ context.Context, in *pluginv1.BuildReconcileRequestRequest) (*pluginv1.BuildReconcileRequestResponse, error) {
	ref := strings.TrimSpace(in.GetEntry().GetRefId())
	if ref == "" {
		return nil, status.Error(codes.InvalidArgument, "reconcile entry has no ref_id")
	}
	cfg, err := spec.FromAccount(in.GetAccount())
	if err != nil {
		// Credentials are withheld when the account type belongs to another
		// plugin - impossible for video, where both are this plugin, but
		// without a key there is no poll to build.
		return nil, status.Errorf(codes.FailedPrecondition, "reconcile needs the account credentials: %v", err)
	}
	return &pluginv1.BuildReconcileRequestResponse{
		Method:  "GET",
		Url:     cfg.BaseURL + videoTasksPath + "/" + url.PathEscape(ref),
		Headers: map[string]string{"authorization": "Bearer " + cfg.APIKey},
	}, nil
}

// ParseReconcileResponse implements pluginsdk.Reconciler: it reads Ark's task
// status out of the poll answer and states what the core should do with the
// pre-charged row.
//
//	queued / running           -> PENDING, ask again
//	succeeded                  -> SETTLED, tokens = usage.completion_tokens
//	failed / expired/cancelled -> FAILED, reason from error.message
//	transport error / non-2xx  -> PENDING (a blip is not a verdict; the
//	                              deadline then keeps the estimate, which is
//	                              the right end for work the upstream ran)
//	unknown / empty            -> PENDING (the zero value: ask again, never
//	                              settle for nothing)
func (p *Plugin) ParseReconcileResponse(ctx context.Context, in *pluginv1.ParseReconcileResponseRequest) (*pluginv1.ReconcileResult, error) {
	ref := strings.TrimSpace(in.GetEntry().GetRefId())
	pending := &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_PENDING, NextCheckAfterSec: runningCheckSec}
	// Neither a transport error nor a non-2xx answer is a verdict on the
	// task: keep asking until the deadline, which keeps the estimate rather
	// than refunding a task the upstream really ran.
	if in.GetTransportError() != "" || in.GetStatus() < 200 || in.GetStatus() >= 300 {
		return pending, nil
	}
	body := in.GetBody()
	switch st := strings.ToLower(strings.TrimSpace(gjson.GetBytes(body, "status").String())); st {
	case "queued", "pending", "running", "processing", "":
		// Empty included: a body this plugin cannot read yet means "ask
		// again", never "settle for nothing".
		return pending, nil
	case "succeeded":
		p.markState(ctx, ref, TaskDone)
		return &pluginv1.ReconcileResult{
			State:  pluginv1.ReconcileResult_SETTLED,
			Tokens: &pluginv1.UsageTokens{OutputTokens: p.succeededTokens(ctx, ref, body)},
			Facts:  succeededFacts(body),
		}, nil
	case "failed", "expired", "cancelled", "canceled":
		p.markState(ctx, ref, TaskFailed)
		reason := strings.TrimSpace(gjson.GetBytes(body, "error.message").String())
		if reason == "" {
			reason = st
		}
		return &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_FAILED, Reason: reason}, nil
	default:
		// An unrecognised status is not guessed into "done" (which settles)
		// or "failed" (which refunds). Ask again; the deadline decides.
		p.log.Warn("volcengine: unrecognised video task status", "task_id", ref, "status", st)
		return pending, nil
	}
}

// succeededTokens is the real output-token usage of a finished task:
// usage.completion_tokens, falling back to usage.total_tokens and - only when
// Ark reports a succeeded task with NO usage at all - to the estimate the
// task was reserved with. Settling such a task on 0 would refund the whole
// reservation and give the video away: the work was really done, and the
// estimate is the only measure of it anyone has.
func (p *Plugin) succeededTokens(ctx context.Context, ref string, body []byte) int64 {
	if n := gjson.GetBytes(body, "usage.completion_tokens").Int(); n > 0 {
		return n
	}
	if n := gjson.GetBytes(body, "usage.total_tokens").Int(); n > 0 {
		return n
	}
	if db, err := p.pool(ctx); err == nil {
		if t, err := lookupVideoTask(ctx, db, ref); err == nil && t != nil && t.EstTokens > 0 {
			p.log.Warn("volcengine: succeeded video task reported no usage, settling on the estimate",
				"task_id", ref, "est_tokens", t.EstTokens)
			return t.EstTokens
		}
	}
	p.log.Warn("volcengine: succeeded video task has neither usage nor a stored estimate, settling on 0", "task_id", ref)
	return 0
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

// markState records the last reconciliation result in the task ledger,
// best-effort and outside the caller's cancellation: the core settles against
// usage_logs, so a failed write here is logged, never returned.
func (p *Plugin) markState(ctx context.Context, taskID, state string) {
	ctx = context.WithoutCancel(ctx)
	db, err := p.pool(ctx)
	if err != nil {
		return
	}
	if err := setVideoTaskState(ctx, db, taskID, state); err != nil {
		p.log.Warn("volcengine: cannot update a video task state", "task_id", taskID, "state", state, "error", err.Error())
	}
}

// pool returns the plugin's database pool.
func (p *Plugin) pool(ctx context.Context) (*pgxpool.Pool, error) {
	if p.host == nil {
		return nil, errors.New("plugin not initialised")
	}
	return p.host.DB(ctx)
}
