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

// videoTasksPath is Ark's own task collection, under the account's video
// prefix. Note the asymmetry with the client-facing path: clients call
// /ark/v3/... because "api" is a core-reserved first segment.
//
// A function rather than a constant because the prefix is per account: a relay
// may mount Ark's native video tasks under its own namespace
// ("/doubao/api/v3") while serving text at the root, and the first real
// upstream this plugin was verified against does exactly that.
func videoTasksPath(prefix string) string { return prefix + "/contents/generations/tasks" }

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

// VideoTask is the part of a video_tasks row the plugin reads back.
//
// est_tokens is NOT in here, and that is the point of the SETTLED_ESTIMATE
// change: the column is still written (see insertVideoTask) as the record of
// what a task was pre-charged, but nothing in the plugin reads it any more.
// The core holds the reservation and answers for it.
type VideoTask struct {
	Model string
	State string
}

// insertVideoTask records a submitted task. task_id is the upstream id and
// the primary key; a resubmit that somehow yields the same id updates the row
// instead of duplicating it, so there is exactly one row per upstream task.
//
// est_tokens is still written even though nothing reads it. It used to be the
// plugin's own fallback for "succeeded with no usage", which the core now
// answers itself (SETTLED_ESTIMATE); what is left is a record of the figure
// this task was pre-charged with, which is the first thing anyone asks for
// when a charge is questioned - and after usageRequestFields that figure is
// derived from what the client really requested, so it is worth keeping.
// Leaving the column in place but writing nothing would be worse than either
// option: it is NOT NULL DEFAULT 0, so an unwritten row claims a zero
// estimate rather than an unknown one.
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
	err := db.QueryRow(ctx, `SELECT model, state FROM video_tasks WHERE task_id = $1`, taskID).
		Scan(&t.Model, &t.State)
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

	// Record the task so the poll can resolve its model. A write failure does
	// NOT stop the reservation: the core reconciles from pending_settlements
	// and the account, never from this table, so revenue is protected either
	// way and only the client's own polling would degrade to a 400.
	if db, err := p.pool(ctx); err != nil {
		p.log.Error("volcengine: cannot record a video task (reserving anyway)",
			"task_id", taskID, "error", err.Error())
	} else if err := insertVideoTask(ctx, db, taskID, in.GetAccount().GetId(), in.GetMeta().GetUserId(), model, est.Tokens); err != nil {
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
// poll, GET {base}{video_api_prefix}/contents/generations/tasks/{ref_id}. The
// core sends it, through the account's proxy and behind its SSRF guard, with
// the account's credentials - present here because the video platform and the
// apikey account type belong to the same plugin (CONTRACTS §25.4).
//
// It must use the SAME prefix the submit did. A poll built against a different
// path answers 404 for every entry, which the core reads as "still pending"
// until the deadline and then keeps the estimate - an account charged at its
// pre-charge for work that really finished.
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
	px, err := prefixesOf(cfg.BaseURL, in.GetAccount().GetSettingsJson())
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account settings: %v", err)
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

// ParseReconcileResponse implements pluginsdk.Reconciler: it reads Ark's task
// status out of the poll answer and states what the core should do with the
// pre-charged row.
//
//	queued / running           -> PENDING, ask again
//	succeeded + a usage figure  -> SETTLED, tokens = usage.completion_tokens
//	succeeded, no usage figure  -> SETTLED_ESTIMATE, the estimate is the charge
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
				State:  pluginv1.ReconcileResult_SETTLED_ESTIMATE,
				Reason: "Ark reported the task as succeeded without a usage object",
			}, nil
		}
		return &pluginv1.ReconcileResult{
			State:  pluginv1.ReconcileResult_SETTLED,
			Tokens: &pluginv1.UsageTokens{OutputTokens: tokens},
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
// usage.completion_tokens, falling back to usage.total_tokens. It returns 0
// when Ark reports a succeeded task with NO usage at all, which the caller
// turns into SETTLED_ESTIMATE rather than into a settle at zero.
//
// It no longer reads the plugin's own est_tokens column: that column was this
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
