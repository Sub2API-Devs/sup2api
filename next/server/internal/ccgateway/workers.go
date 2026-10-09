package ccgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Worker updates in place (CONTRACTS §53.7): the controller copies the
// worker program of an image into each existing account container and
// restarts only that container. Account containers are never recreated.

var (
	workersLimit = 25 * time.Minute
	workerLimit  = 5 * time.Minute
)

// workerStatuses are the controller's 200 answers of POST
// /accounts/<key>/worker; anything else is "failed".
var workerStatuses = map[string]bool{"updated": true, "unchanged": true, "busy": true, "not_running": true, "rolled_back": true}

type workerResult struct {
	Key            string `json:"key"`
	AccountID      *int64 `json:"account_id,omitempty"`
	Status         string `json:"status"`
	SHA256         string `json:"sha256,omitempty"`
	PreviousSHA256 string `json:"previous_sha256,omitempty"`
	Reason         string `json:"reason,omitempty"`
}

// workersReport is the answer of POST /system/ccgateway/runtime/workers and
// the workers field of an applied app upload. reason is set (and results
// empty) when the runtimes could not be listed.
type workersReport struct {
	Image   string         `json:"image"`
	Results []workerResult `json:"results"`
	Reason  string         `json:"reason,omitempty"`
}

// updateWorkers updates the worker of every runtime the controller lists,
// one after the other. A failure of one runtime never stops the others; only
// failing to list them is an error. The caller holds the install lock.
func (s *Service) updateWorkers(ctx context.Context, cfg Config, image string) (workersReport, *core.Error) {
	report := workersReport{Image: image, Results: []workerResult{}}
	// An older controller answers the unknown route 404 not_found, the same
	// as a missing container: ask what it supports first.
	healthCtx, cancelHealth := context.WithTimeout(ctx, 30*time.Second)
	h, herr := s.health(healthCtx, cfg)
	cancelHealth()
	if herr != nil {
		return report, reasonError(core.ErrUnavailable, "controller_unhealthy")
	}
	if !h.has("worker-update") {
		return report, reasonError(core.ErrUnavailable, "controller_outdated")
	}
	var list struct {
		Runtimes []remoteRuntime `json:"runtimes"`
	}
	listCtx, cancel := context.WithTimeout(ctx, time.Minute)
	err := s.controllerJSON(listCtx, cfg, "GET", "/accounts", nil, &list)
	cancel()
	if err != nil {
		return report, reasonError(core.ErrUnavailable, "controller_unhealthy")
	}
	seen := map[string]bool{}
	var keys []string
	for _, r := range list.Runtimes {
		// The key goes into a path: only runtime keys the core creates.
		if seen[r.Key] || (!accountKeyPattern.MatchString(r.Key) && !isDraftKey(r.Key)) {
			continue
		}
		seen[r.Key] = true
		keys = append(keys, r.Key)
	}
	accounts := s.runtimeAccounts(ctx, keys)
	for _, key := range keys {
		var r workerResult
		if ctx.Err() != nil {
			r = workerResult{Key: key, Status: "failed", Reason: "timeout"}
		} else {
			r = s.updateWorker(ctx, cfg, key, image)
		}
		if id, ok := accounts[key]; ok {
			r.AccountID = &id
		}
		if r.Status == "updated" || r.Status == "rolled_back" {
			// The restart rebuilt the container's network namespace; the
			// controller restores it, a reconcile makes sure.
			s.Kick(key)
		}
		report.Results = append(report.Results, r)
	}
	return report, nil
}

// runtimeAccounts maps runtime keys to their account: an account id key is
// the id, a draft key the account that adopted it (none while unadopted).
func (s *Service) runtimeAccounts(ctx context.Context, keys []string) map[string]int64 {
	out := map[string]int64{}
	var drafts []string
	for _, key := range keys {
		if isDraftKey(key) {
			drafts = append(drafts, key)
		} else if id, e := strconv.ParseInt(key, 10, 64); e == nil {
			out[key] = id
		}
	}
	if len(drafts) == 0 {
		return out
	}
	rows, e := s.DB.Pool.Query(ctx, `SELECT key, account_id FROM ccgateway_runtimes WHERE key = ANY($1) AND account_id IS NOT NULL`, drafts)
	if e != nil {
		slog.WarnContext(ctx, "CCGateway: reading the accounts of draft runtimes failed", "err", e)
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		var id int64
		if rows.Scan(&key, &id) == nil {
			out[key] = id
		}
	}
	return out
}

// updateWorker calls the controller's POST /accounts/<key>/worker, at most
// workerLimit.
func (s *Service) updateWorker(ctx context.Context, cfg Config, key, image string) workerResult {
	failed := func(reason string) workerResult { return workerResult{Key: key, Status: "failed", Reason: reason} }
	raw, _ := json.Marshal(map[string]string{"image": image})
	header := http.Header{}
	header.Set("Content-Type", "application/json")
	callCtx, cancel := context.WithTimeout(ctx, workerLimit)
	defer cancel()
	// lost: the call failed because the core stopped waiting (the controller
	// may still finish the update).
	lost := func() workerResult {
		if callCtx.Err() != nil {
			return failed("timeout")
		}
		return failed("unreachable")
	}
	res, close, e := s.controllerCall(callCtx, cfg, "POST", "/accounts/"+key+"/worker", bytes.NewReader(raw), int64(len(raw)), header)
	if e != nil {
		return lost()
	}
	defer close()
	defer res.Body.Close()
	body, e := io.ReadAll(io.LimitReader(res.Body, 65537))
	if e != nil || len(body) > 65536 {
		return lost()
	}
	if res.StatusCode != http.StatusOK {
		code, _ := parseRuntimeError(body)
		if code == "" {
			code = "unreachable"
		}
		return failed(code)
	}
	var answer struct {
		Status         string `json:"status"`
		SHA256         string `json:"sha256"`
		PreviousSHA256 string `json:"previous_sha256"`
		Reason         string `json:"reason"`
	}
	if json.Unmarshal(body, &answer) != nil || !workerStatuses[answer.Status] {
		return failed("invalid_response")
	}
	r := workerResult{Key: key, Status: answer.Status}
	if sha256Pattern.MatchString(answer.SHA256) {
		r.SHA256 = answer.SHA256
	}
	if sha256Pattern.MatchString(answer.PreviousSHA256) {
		r.PreviousSHA256 = answer.PreviousSHA256
	}
	if codePattern.MatchString(answer.Reason) {
		r.Reason = answer.Reason
	}
	return r
}

// runtimeWorkers serves POST /system/ccgateway/runtime/workers {"image"?}:
// the in-place worker update of every existing runtime (default image: the
// effective app image). It runs to its end when the caller disconnects.
func (s *Service) runtimeWorkers(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	raw, e := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 4096))
	var in struct {
		Image string `json:"image"`
	}
	if e != nil || (len(bytes.TrimSpace(raw)) > 0 && json.Unmarshal(raw, &in) != nil) {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_request"))
		return
	}
	if in.Image != "" && !validImage(in.Image) {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_image"))
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(audit.Context(c)), workersLimit)
	defer cancel()
	cfg, e := s.Load(ctx)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "not_configured"))
		return
	}
	if cfg.Mode != "ssh" && cfg.Mode != "controller" && cfg.Mode != "local" {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "ssh_not_configured"))
		return
	}
	if !cfg.AccountRuntimes {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "runtimes_disabled"))
		return
	}
	image := in.Image
	if image == "" {
		image = cfg.EffectiveImages().App
	}
	if !validImage(image) {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_image"))
		return
	}
	ctx, release, ok, e := s.lockInstall(ctx)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "install_failed"))
		return
	}
	if !ok {
		httpapi.Fail(c, reasonError(core.ErrConflict, "install_in_progress"))
		return
	}
	defer release()
	report, err := s.updateWorkers(ctx, cfg, image)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.auditWorkers(ctx, report)
	httpapi.OK(c, report)
}

// auditWorkers records ccgateway.runtime.workers with the image and the
// number of runtimes per status, also after the run used up its time.
func (s *Service) auditWorkers(ctx context.Context, report workersReport) {
	counts := map[string]int{}
	for _, r := range report.Results {
		counts[r.Status]++
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	uid, _ := core.UserID(ctx)
	if e := audit.Audit(ctx, s.DB.Pool, uid, "ccgateway.runtime.workers", "system", "ccgateway", map[string]any{"image": report.Image, "statuses": counts}); e != nil {
		slog.Error("CCGateway audit failed", "action", "runtime.workers")
	}
}
