package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Image uploads and upgrades through the control panel (CONTRACTS §53.6).
// Every chunk is forwarded to the controller as it arrives, never stored on
// the core, so any core node can take any chunk.

const (
	maxUploadChunk = 64 << 20
	maxUploadSize  = 4 << 30
	uploadLimit    = 15 * time.Minute
	loadLimit      = 25 * time.Minute
)

var (
	uploadIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{22}$`)
	offsetPattern   = regexp.MustCompile(`^[0-9]{1,19}$`)
	sha256Pattern   = regexp.MustCompile(`^[0-9a-f]{64}$`)
)

type uploadState struct {
	Offset int64 `json:"offset"`
	Size   int64 `json:"size"`
}

// panelConfig loads the configuration and requires controller mode.
func (s *Service) panelConfig(c *gin.Context, ctx context.Context) (Config, bool) {
	cfg, e := s.Load(ctx)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "not_configured"))
		return cfg, false
	}
	if cfg.Mode != "controller" {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "controller_not_configured"))
		return cfg, false
	}
	return cfg, true
}

// uploadID is the :id path parameter, checked before it goes into a path.
func uploadID(c *gin.Context) (string, bool) {
	id := c.Param("id")
	if !uploadIDPattern.MatchString(id) {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_request"))
		return "", false
	}
	return id, true
}

// uploadCreate serves POST /system/ccgateway/runtime/uploads.
func (s *Service) uploadCreate(c *gin.Context) {
	httpapi.NoStore(c)
	var in struct {
		Size   int64  `json:"size"`
		SHA256 string `json:"sha256"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.Size < 1 || in.Size > maxUploadSize || (in.SHA256 != "" && !sha256Pattern.MatchString(in.SHA256)) {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_request"))
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()
	cfg, ok := s.panelConfig(c, ctx)
	if !ok {
		return
	}
	body := map[string]any{"size": in.Size}
	if in.SHA256 != "" {
		body["sha256"] = in.SHA256
	}
	var out struct {
		UploadID string `json:"upload_id"`
		uploadState
	}
	if err := s.controllerJSON(ctx, cfg, "POST", "/images/uploads", body, &out); err != nil {
		httpapi.Fail(c, err)
		return
	}
	if !uploadIDPattern.MatchString(out.UploadID) {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "controller_unhealthy"))
		return
	}
	httpapi.OK(c, gin.H{"upload_id": out.UploadID, "offset": out.Offset, "size": out.Size})
}

// trackedBody remembers a failure to read the caller's request body,
// including one that ends before its Content-Length.
type trackedBody struct {
	r         io.Reader
	remaining int64
	err       error
}

func (t *trackedBody) Read(p []byte) (int, error) {
	n, err := t.r.Read(p)
	t.remaining -= int64(n)
	if err == io.EOF && t.remaining > 0 {
		err = io.ErrUnexpectedEOF
	}
	if err != nil && err != io.EOF {
		t.err = err
	}
	return n, err
}

// uploadPut serves PUT /system/ccgateway/runtime/uploads/:id: one chunk,
// streamed to the controller with the caller's exact length.
func (s *Service) uploadPut(c *gin.Context) {
	httpapi.NoStore(c)
	id, ok := uploadID(c)
	if !ok {
		return
	}
	rawOffset := c.GetHeader("X-CCG-Offset")
	offset, e := strconv.ParseInt(rawOffset, 10, 64)
	length := c.Request.ContentLength
	if !offsetPattern.MatchString(rawOffset) || e != nil || length < 1 || length > maxUploadChunk {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_request"))
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), uploadLimit)
	defer cancel()
	cfg, ok := s.panelConfig(c, ctx)
	if !ok {
		return
	}
	body := &trackedBody{r: http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadChunk+1), remaining: length}
	header := http.Header{}
	header.Set("Content-Type", "application/octet-stream")
	header.Set("X-CCG-Offset", strconv.FormatInt(offset, 10))
	res, close, e := s.controllerCall(ctx, cfg, "PUT", "/images/uploads/"+id, body, length, header)
	if e != nil {
		if body.err != nil {
			httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_request"))
			return
		}
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "controller_unhealthy"))
		return
	}
	defer close()
	defer res.Body.Close()
	s.answerUpload(c, res, false)
}

// uploadGet serves GET and DELETE /system/ccgateway/runtime/uploads/:id.
func (s *Service) uploadGet(c *gin.Context) {
	httpapi.NoStore(c)
	id, ok := uploadID(c)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()
	cfg, ok := s.panelConfig(c, ctx)
	if !ok {
		return
	}
	res, close, e := s.controllerCall(ctx, cfg, c.Request.Method, "/images/uploads/"+id, nil, -1, nil)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "controller_unhealthy"))
		return
	}
	defer close()
	defer res.Body.Close()
	s.answerUpload(c, res, c.Request.Method == "DELETE")
}

// answerUpload relays the controller's upload state ({"offset","size"}, or
// {"deleted"} for a delete) or its error.
func (s *Service) answerUpload(c *gin.Context, res *http.Response, deleted bool) {
	raw, e := readBounded(res.Body, 65536)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "controller_unhealthy"))
		return
	}
	if res.StatusCode != 200 {
		httpapi.Fail(c, controllerAPIError(res.StatusCode, raw))
		return
	}
	if deleted {
		httpapi.OK(c, gin.H{"deleted": true})
		return
	}
	var state uploadState
	if json.Unmarshal(raw, &state) != nil || state.Offset < 0 || state.Size < 0 {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "controller_unhealthy"))
		return
	}
	httpapi.OK(c, state)
}

type loadedImage struct {
	ID   string   `json:"id"`
	Tags []string `json:"tags"`
}

// uploadLoad serves POST /system/ccgateway/runtime/uploads/:id/load: the
// controller loads the upload; with apply the image becomes the role's
// image (configuration first, then the controller).
func (s *Service) uploadLoad(c *gin.Context) {
	httpapi.NoStore(c)
	id, ok := uploadID(c)
	if !ok {
		return
	}
	in, ok := decodeLoadRequest(c)
	if !ok {
		return
	}
	// Loading and switching images must not stop halfway when the caller (or
	// a proxy in front of the core) gives up.
	ctx, cancel := detached(c, loadLimit)
	defer cancel()
	cfg, ok := s.panelConfig(c, ctx)
	if !ok {
		return
	}
	if in.Apply {
		lockCtx, release, locked := s.installLock(c, ctx)
		if !locked {
			return
		}
		defer release()
		ctx = lockCtx
	}
	var loaded struct {
		SHA256 string        `json:"sha256"`
		Images []loadedImage `json:"images"`
	}
	if err := s.controllerJSON(ctx, cfg, "POST", "/images/uploads/"+id+"/load", nil, &loaded); err != nil {
		httpapi.Fail(c, err)
		return
	}
	images, ok := sanitizeLoadedImages(c, loaded.SHA256, loaded.Images)
	if !ok {
		return
	}
	ref := images[0].ID
	if len(images[0].Tags) > 0 {
		ref = images[0].Tags[0]
	}
	uid, _ := core.UserID(ctx)
	var workers *workersReport
	if in.Apply {
		var cancelTail context.CancelFunc
		if cfg, workers, ctx, cancelTail, ok = s.applyLoadedImage(c, ctx, uid, in.Role, ref); !ok {
			return
		}
		if cancelTail != nil {
			defer cancelTail()
		}
	}
	if e := audit.Audit(ctx, s.DB.Pool, uid, "ccgateway.runtime.upload", "system", "ccgateway", map[string]any{"role": in.Role, "apply": in.Apply, "ref": ref}); e != nil {
		slog.Error("CCGateway audit failed", "action", "runtime.upload")
	}
	out := gin.H{"sha256": loaded.SHA256, "images": images, "ref": ref, "runtime": s.runtimeState(ctx, cfg)}
	if workers != nil {
		out["workers"] = workers
	}
	httpapi.OK(c, out)
}

// decodeLoadRequest reads the small load body and validates the role.
func decodeLoadRequest(c *gin.Context) (struct {
	Role  string `json:"role"`
	Apply bool   `json:"apply"`
}, bool) {
	var in struct {
		Role  string `json:"role"`
		Apply bool   `json:"apply"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	if !httpapi.BindJSON(c, &in) {
		return in, false
	}
	if in.Role != "app" && in.Role != "egress" && in.Role != "controller" {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_request"))
		return in, false
	}
	return in, true
}

// sanitizeLoadedImages keeps images and tags that pass the format limits and
// writes the failure response when the answer cannot be used.
func sanitizeLoadedImages(c *gin.Context, sha string, loaded []loadedImage) ([]loadedImage, bool) {
	images := make([]loadedImage, 0, len(loaded))
	for _, img := range loaded {
		if !imageIDPattern.MatchString(img.ID) || len(images) == 64 {
			continue
		}
		tags := []string{}
		for _, tag := range img.Tags {
			if validImage(tag) && len(tags) < 64 {
				tags = append(tags, tag)
			}
		}
		images = append(images, loadedImage{ID: img.ID, Tags: tags})
	}
	if !sha256Pattern.MatchString(sha) || len(images) == 0 {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "load_failed"))
		return nil, false
	}
	return images, true
}

// applyLoadedImage makes ref the role's image: configuration first, then the
// controller switch. ok=false means the response was already written. The
// returned context (and its cancel, which the caller defers) carries the 2
// minute tail budget the switch may need, so the audit and the runtime read
// after it still run.
func (s *Service) applyLoadedImage(c *gin.Context, ctx context.Context, uid int64, role, ref string) (Config, *workersReport, context.Context, context.CancelFunc, bool) {
	saved, e := s.updateConfig(ctx, uid, []string{"images"}, func(cur *Config) error {
		if cur.Mode != "controller" {
			return errConfigChanged
		}
		img := RuntimeImages{}
		if cur.Images != nil {
			img = *cur.Images
		}
		switch role {
		case "app":
			img.App = ref
		case "egress":
			img.Egress = ref
		default:
			img.Controller = ref
		}
		cur.Images = &img
		return nil
	})
	if errors.Is(e, errConfigChanged) {
		httpapi.Fail(c, reasonError(core.ErrConflict, "config_changed"))
		return Config{}, nil, ctx, nil, false
	}
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "install_failed"))
		return Config{}, nil, ctx, nil, false
	}
	report, err := s.switchImage(ctx, saved, role, ref)
	if err != nil {
		httpapi.Fail(c, err)
		return Config{}, nil, ctx, nil, false
	}
	var cancelTail context.CancelFunc
	if report != nil {
		// The worker updates may have used up the load's time: what follows
		// still runs (bounded on its own).
		ctx, cancelTail = context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)
	}
	s.kickAll(ctx)
	return saved, report, ctx, cancelTail, true
}
