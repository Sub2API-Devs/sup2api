package ccgateway

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// The Worker's /admin/cli (CONTRACTS §53.21): the packaged CLI is never
// replaced in place, so the view only reports it (catalog: the version check,
// tool_count/variant_count 0, updating false) and the release channel seen.
// The managed install of an official CLI and the tool catalog are retired.

type cliCatalogState struct {
	InstalledVersion string `json:"installed_version"`
	CatalogVersion   string `json:"catalog_version"`
	State            string `json:"state"`
	ToolCount        int    `json:"tool_count"`
	VariantCount     int    `json:"variant_count"`
	CheckedAt        string `json:"checked_at"`
	SyncedAt         string `json:"synced_at"`
	Error            string `json:"error,omitempty"`
}

type cliManagementState struct {
	PinnedVersion    string          `json:"pinned_version,omitempty"`
	Catalog          cliCatalogState `json:"catalog"`
	AutoUpdate       *bool           `json:"auto_update"`
	AutoUpdateMode   string          `json:"auto_update_mode"`
	Channel          string          `json:"channel"`
	LatestVersion    string          `json:"latest_version"`
	ReleaseCheckedAt string          `json:"release_checked_at"`
	Updating         *bool           `json:"updating"`
	UpdateState      string          `json:"update_state"`
	UpdateError      string          `json:"update_error"`
}

// valid is the shape the console reads; older Workers that still counted
// tools stay within the same bounds.
func (s cliManagementState) valid() bool {
	return s.AutoUpdate != nil && s.Updating != nil && (s.Channel == "stable" || s.Channel == "latest") && s.AutoUpdateMode == "managed" &&
		s.Catalog.ToolCount >= 0 && s.Catalog.ToolCount <= 256 && s.Catalog.VariantCount >= 0 && s.Catalog.VariantCount <= 1024 &&
		len(s.Catalog.Error) <= 1024 && len(s.UpdateError) <= 1024
}

// cliManagementLimit bounds the Worker's /admin/cli answer.
const cliManagementLimit = 16384

// cliManagementBody checks a PUT (release channel settings) or POST (check:
// the channel's latest release; sync: read the installed version again) body.
// POST update is refused: nothing installs a CLI in place any more.
func cliManagementBody(method string, raw []byte) ([]byte, error) {
	var input struct {
		Action     string `json:"action,omitempty"`
		AutoUpdate *bool  `json:"auto_update,omitempty"`
		Channel    string `json:"channel,omitempty"`
	}
	if err := decodeStrictJSON(raw, &input); err != nil {
		return nil, fmt.Errorf("invalid CLI management input")
	}
	switch method {
	case http.MethodPut:
		if input.AutoUpdate == nil || input.Action != "" || (input.Channel != "stable" && input.Channel != "latest") {
			return nil, fmt.Errorf("invalid CLI update settings")
		}
	case http.MethodPost:
		if input.AutoUpdate != nil || input.Channel != "" || (input.Action != "check" && input.Action != "sync") {
			return nil, fmt.Errorf("invalid CLI action: check or sync (the packaged CLI is not updated in place)")
		}
	default:
		return nil, fmt.Errorf("invalid CLI management method")
	}
	return json.Marshal(input)
}

// cliManagement serves GET/POST/PUT /system/ccgateway/cli/:id through the
// account's Worker /admin/cli.
func (s *Service) cliManagement(c *gin.Context) {
	httpapi.NoStore(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 40*time.Second)
	defer cancel()
	d, err := s.desired(ctx, id, false)
	if err != nil {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if reason := d.unavailable(); reason != "" {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, reason))
		return
	}
	var body []byte
	if c.Request.Method != http.MethodGet {
		raw, readErr := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 4096))
		if readErr != nil {
			httpapi.Fail(c, core.ErrInvalidArgument)
			return
		}
		if body, err = cliManagementBody(c.Request.Method, raw); err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()))
			return
		}
	}
	raw, failure := s.cliManagementCall(ctx, d, c.Request.Method, body)
	if failure != nil {
		httpapi.Fail(c, failure)
		return
	}
	var out cliManagementState
	if json.Unmarshal(raw, &out) != nil || !out.valid() {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if c.Request.Method != http.MethodGet {
		s.record(c, "account."+strconv.FormatInt(id, 10)+".cli."+c.Request.Method)
	}
	httpapi.OK(c, out)
}

// cliManagementCall sends one /admin/cli request to the Worker of d.
func (s *Service) cliManagementCall(ctx context.Context, d accountDesired, method string, body []byte) ([]byte, *core.Error) {
	response, closeConn, err := s.runtimeRequest(ctx, d.Key, method, "admin/cli", body, d.Revision)
	if err != nil {
		return nil, transportError(err)
	}
	defer closeConn()
	defer response.Body.Close()
	raw, err := readBounded(response.Body, cliManagementLimit)
	if err != nil {
		return nil, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusAccepted {
		return nil, runtimeError(response.StatusCode, raw)
	}
	return raw, nil
}
