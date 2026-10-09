package ccgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
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

// Pushing the bundled runtime images to a connected controller (CONTRACTS
// §53.10): the core is the client of the controller's chunked uploads
// (§53.5) like the browser is for manual uploads (§53.6), in 16 MiB chunks.

var (
	// bundleChunk is the size of one upload chunk (§53.6: 16 MiB).
	bundleChunk = 16 << 20
	// bundleChunkTries: one chunk is sent at most this often (transport
	// errors, 408, 429, 5xx).
	bundleChunkTries = 4
	bundleChunkLimit = 5 * time.Minute
	bundleRetryDelay = 2 * time.Second
)

// pushRoles are the roles the panel takes, in the order they are switched:
// the controller first (the newest controller then updates the workers),
// the gateway never (§53.10).
var pushRoles = []string{"controller", "egress", "app"}

// pushBundled uploads the archive of role to the controller and loads it
// there (no switch). Failures carry details.reason.
func (s *Service) pushBundled(ctx context.Context, cfg Config, b *bundle, role string) *core.Error {
	rc, img, err := b.open(role)
	if err != nil {
		slog.WarnContext(ctx, "CCGateway: a bundled runtime image is unusable", "role", role, "err", err)
		return reasonError(core.ErrUnavailable, "bundle_invalid")
	}
	defer rc.Close()
	var created struct {
		UploadID string `json:"upload_id"`
	}
	if err := s.controllerJSON(ctx, cfg, "POST", "/images/uploads", map[string]any{"size": img.Size, "sha256": img.SHA256}, &created); err != nil {
		return err
	}
	if !uploadIDPattern.MatchString(created.UploadID) {
		return reasonError(core.ErrUnavailable, "controller_unhealthy")
	}
	id := created.UploadID
	loaded := false
	defer func() {
		if loaded {
			return // the controller removed the upload itself
		}
		dctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
		defer cancel()
		if res, close, e := s.controllerCall(dctx, cfg, "DELETE", "/images/uploads/"+id, nil, -1, nil); e == nil {
			res.Body.Close()
			close()
		}
	}()
	buf := make([]byte, bundleChunk)
	var offset int64
	for offset < img.Size {
		n := int64(bundleChunk)
		if img.Size-offset < n {
			n = img.Size - offset
		}
		if _, err := io.ReadFull(rc, buf[:n]); err != nil {
			return reasonError(core.ErrUnavailable, "bundle_invalid")
		}
		if err := s.putChunk(ctx, cfg, id, offset, buf[:n]); err != nil {
			return err
		}
		offset += n
	}
	// The archive must end here and match its sha256 (checked on EOF).
	var one [1]byte
	if _, err := io.ReadFull(rc, one[:]); err != io.EOF {
		return reasonError(core.ErrUnavailable, "bundle_invalid")
	}
	var out struct {
		Images []loadedImage `json:"images"`
	}
	loadErr := s.controllerJSON(ctx, cfg, "POST", "/images/uploads/"+id+"/load", nil, &out)
	if loadErr != nil {
		return loadErr
	}
	loaded = true
	ref := b.ref(role)
	for _, li := range out.Images {
		for _, tag := range li.Tags {
			if tag == ref {
				return nil
			}
		}
	}
	return reasonError(core.ErrUnavailable, "image_ref_missing")
}

// putChunk sends one chunk at offset, retrying transport errors, 408, 429
// and 5xx. A 409 whose offset already includes the chunk (an earlier try
// arrived but its answer was lost) is success.
func (s *Service) putChunk(ctx context.Context, cfg Config, id string, offset int64, chunk []byte) *core.Error {
	end := offset + int64(len(chunk))
	var last *core.Error
	for try := 0; try < bundleChunkTries; try++ {
		if try > 0 {
			select {
			case <-ctx.Done():
				return reasonError(core.ErrUnavailable, "upload_failed")
			case <-time.After(bundleRetryDelay):
			}
		}
		status, raw, err := s.sendChunk(ctx, cfg, id, offset, chunk)
		if err != nil {
			last = reasonError(core.ErrUnavailable, "upload_failed")
			continue
		}
		var state uploadState
		switch {
		case status == http.StatusOK:
			if json.Unmarshal(raw, &state) != nil || state.Offset != end {
				return reasonError(core.ErrUnavailable, "upload_failed")
			}
			return nil
		case status == http.StatusConflict:
			apiErr := controllerAPIError(status, raw)
			if o, ok := apiErr.Details["offset"].(int64); ok && o == end {
				return nil
			}
			return apiErr
		case status == http.StatusRequestTimeout || status == http.StatusTooManyRequests || status >= 500:
			last = controllerAPIError(status, raw)
			continue
		default:
			return controllerAPIError(status, raw)
		}
	}
	if last == nil {
		last = reasonError(core.ErrUnavailable, "upload_failed")
	}
	return last
}

func (s *Service) sendChunk(ctx context.Context, cfg Config, id string, offset int64, chunk []byte) (int, []byte, error) {
	ctx, cancel := context.WithTimeout(ctx, bundleChunkLimit)
	defer cancel()
	header := http.Header{}
	header.Set("Content-Type", "application/octet-stream")
	header.Set("X-CCG-Offset", strconv.FormatInt(offset, 10))
	res, close, err := s.controllerCall(ctx, cfg, "PUT", "/images/uploads/"+id, bytes.NewReader(chunk), int64(len(chunk)), header)
	if err != nil {
		return 0, nil, err
	}
	defer close()
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 65537))
	if err != nil || len(raw) > 65536 {
		return 0, nil, errors.New("unreadable controller answer")
	}
	return res.StatusCode, raw, nil
}

// switchImage makes ref the controller's image of role (the apply of
// §53.6): app / egress through PUT /runtime/images, the controller by its
// self-upgrade (waiting for it). For app the workers of the existing
// runtimes are then replaced in place (§53.7); a failure to list them is
// the report's reason, not an error. The caller holds the install lock.
func (s *Service) switchImage(ctx context.Context, cfg Config, role, ref string) (*workersReport, *core.Error) {
	var err *core.Error
	if role == "controller" {
		err = s.upgradeController(ctx, cfg, ref)
	} else {
		err = s.controllerJSON(ctx, cfg, "PUT", "/runtime/images", map[string]string{role: ref}, nil)
	}
	if err != nil || role != "app" {
		return nil, err
	}
	report, werr := s.updateWorkers(ctx, cfg, ref)
	if werr != nil {
		report.Reason = reasonOf(werr)
	} else {
		s.auditWorkers(ctx, report)
	}
	return &report, nil
}

type bundledResult struct {
	Role   string `json:"role"`
	Ref    string `json:"ref"`
	Status string `json:"status"`
	Reason string `json:"reason,omitempty"`
}

// runtimeBundled serves POST /system/ccgateway/runtime/bundled
// {"roles"?: [...]}: every role the controller does not run yet is uploaded
// from the plugin package, loaded and switched to. It runs to its end when
// the caller disconnects.
func (s *Service) runtimeBundled(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	raw, e := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 4096))
	var in struct {
		Roles *[]string `json:"roles"`
	}
	if e != nil || (len(bytes.TrimSpace(raw)) > 0 && json.Unmarshal(raw, &in) != nil) {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_request"))
		return
	}
	wanted := map[string]bool{"app": true, "egress": true, "controller": true}
	if in.Roles != nil {
		wanted = map[string]bool{}
		for _, r := range *in.Roles {
			if r != "app" && r != "egress" && r != "controller" {
				httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_request"))
				return
			}
			wanted[r] = true
		}
		if len(wanted) == 0 {
			httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_request"))
			return
		}
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(audit.Context(c)), loadLimit)
	defer cancel()
	cfg, ok := s.panelConfig(c, ctx)
	if !ok {
		return
	}
	b := s.bundle()
	if b == nil {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "no_bundled_images"))
		return
	}
	ctx, release, locked, e := s.lockInstall(ctx)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "install_failed"))
		return
	}
	if !locked {
		httpapi.Fail(c, reasonError(core.ErrConflict, "install_in_progress"))
		return
	}
	defer release()
	h, herr := s.health(ctx, cfg)
	if herr != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "controller_unhealthy"))
		return
	}
	current := map[string]string{"app": h.AppImage, "egress": h.EgressImage, "controller": h.ControllerImage}
	uid, _ := core.UserID(ctx)
	results := []bundledResult{}
	var workers *workersReport
	switched := false
	for _, role := range pushRoles {
		if !wanted[role] {
			continue
		}
		ref := b.ref(role)
		r := bundledResult{Role: role, Ref: ref, Status: "loaded"}
		fail := func(err *core.Error) {
			r.Status, r.Reason = "failed", reasonOf(err)
			if r.Reason == "" {
				r.Reason = "install_failed"
			}
		}
		if current[role] == ref {
			// The controller runs it already: nothing to send or switch.
			r.Status = "present"
		} else if ctx.Err() != nil {
			r.Status, r.Reason = "failed", "timeout"
		} else if err := s.pushBundled(ctx, cfg, b, role); err != nil {
			fail(err)
		} else if saved, err := s.useBundled(ctx, uid, role); err != nil {
			fail(err)
		} else {
			cfg = saved
			report, err := s.switchImage(ctx, cfg, role, ref)
			if err != nil {
				fail(err)
			} else {
				switched = true
				if report != nil {
					workers = report
				}
			}
		}
		results = append(results, r)
	}
	// The worker updates may have used up the time: what follows still runs
	// (bounded on its own).
	tail, cancelTail := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)
	defer cancelTail()
	if switched {
		s.kickAll(tail)
	}
	if e := audit.Audit(tail, s.DB.Pool, uid, "ccgateway.runtime.bundled", "system", "ccgateway", map[string]any{"version": b.version, "results": results}); e != nil {
		slog.Error("CCGateway audit failed", "action", "runtime.bundled")
	}
	out := gin.H{"results": results, "runtime": s.runtimeState(tail, cfg)}
	if workers != nil {
		out["workers"] = workers
	}
	httpapi.OK(c, out)
}

// useBundled removes the configured override of role, so that the bundled
// reference becomes the effective image (an override would hide every
// later plugin version's image). Without an override nothing is written.
func (s *Service) useBundled(ctx context.Context, uid int64, role string) (Config, *core.Error) {
	cfg, e := s.Load(ctx)
	if e != nil {
		return cfg, reasonError(core.ErrUnavailable, "install_failed")
	}
	if cfg.Mode != "controller" {
		return cfg, reasonError(core.ErrConflict, "config_changed")
	}
	if overrideOf(cfg.Images, role) == "" {
		return cfg, nil
	}
	saved, e := s.updateConfig(ctx, uid, []string{"images"}, func(cur *Config) error {
		if cur.Mode != "controller" {
			return errConfigChanged
		}
		if cur.Images == nil {
			return nil
		}
		img := *cur.Images
		switch role {
		case "app":
			img.App = ""
		case "egress":
			img.Egress = ""
		case "controller":
			img.Controller = ""
		}
		cur.Images = &img
		if img == (RuntimeImages{}) {
			cur.Images = nil
		}
		return nil
	})
	if errors.Is(e, errConfigChanged) {
		return cfg, reasonError(core.ErrConflict, "config_changed")
	}
	if e != nil {
		return cfg, reasonError(core.ErrUnavailable, "install_failed")
	}
	return saved, nil
}

func overrideOf(img *RuntimeImages, role string) string {
	if img == nil {
		return ""
	}
	switch role {
	case "app":
		return img.App
	case "egress":
		return img.Egress
	case "controller":
		return img.Controller
	case "gateway":
		return img.Gateway
	}
	return ""
}
