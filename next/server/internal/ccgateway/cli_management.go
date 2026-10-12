package ccgateway

import (
	"bytes"
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

type cliManagementState struct {
	Catalog struct {
		InstalledVersion string `json:"installed_version"`
		CatalogVersion   string `json:"catalog_version"`
		State            string `json:"state"`
		ToolCount        int    `json:"tool_count"`
		VariantCount     int    `json:"variant_count"`
		CheckedAt        string `json:"checked_at"`
		SyncedAt         string `json:"synced_at"`
		Error            string `json:"error,omitempty"`
	} `json:"catalog"`
	AutoUpdate       *bool  `json:"auto_update"`
	AutoUpdateMode   string `json:"auto_update_mode"`
	Channel          string `json:"channel"`
	LatestVersion    string `json:"latest_version"`
	ReleaseCheckedAt string `json:"release_checked_at"`
	Updating         *bool  `json:"updating"`
	UpdateState      string `json:"update_state"`
	UpdateError      string `json:"update_error"`
}

func cliManagementBody(method string, raw []byte) ([]byte, error) {
	var input struct {
		Action     string `json:"action,omitempty"`
		AutoUpdate *bool  `json:"auto_update,omitempty"`
		Channel    string `json:"channel,omitempty"`
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&input) != nil || decoder.Decode(new(any)) != io.EOF {
		return nil, fmt.Errorf("invalid CLI management input")
	}
	switch method {
	case http.MethodPut:
		if input.AutoUpdate == nil || input.Action != "" || (input.Channel != "stable" && input.Channel != "latest") {
			return nil, fmt.Errorf("invalid CLI update settings")
		}
	case http.MethodPost:
		if input.AutoUpdate != nil || input.Channel != "" || (input.Action != "check" && input.Action != "sync" && input.Action != "update") {
			return nil, fmt.Errorf("invalid CLI update action")
		}
	default:
		return nil, fmt.Errorf("invalid CLI management method")
	}
	return json.Marshal(input)
}

func (s *Service) cliManagement(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
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
	if !d.Enabled {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, d.Blocked))
		return
	}
	var body []byte
	if c.Request.Method != http.MethodGet {
		raw, readErr := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 4096))
		if readErr != nil {
			httpapi.Fail(c, core.ErrInvalidArgument)
			return
		}
		body, err = cliManagementBody(c.Request.Method, raw)
		if err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()))
			return
		}
	}
	response, closeConn, err := s.runtimeRequest(ctx, d.Key, c.Request.Method, "admin/cli", body, d.Revision)
	if err != nil {
		httpapi.Fail(c, transportError(err))
		return
	}
	defer closeConn()
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 16385))
	if err != nil || len(raw) > 16384 {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusAccepted {
		httpapi.Fail(c, runtimeError(response.StatusCode, raw))
		return
	}
	var out cliManagementState
	if json.Unmarshal(raw, &out) != nil || out.AutoUpdate == nil || out.Updating == nil || (out.Channel != "stable" && out.Channel != "latest") || out.AutoUpdateMode != "managed" || out.Catalog.ToolCount < 0 || out.Catalog.ToolCount > 256 || out.Catalog.VariantCount < 0 || out.Catalog.VariantCount > 1024 || len(out.Catalog.Error) > 1024 || len(out.UpdateError) > 1024 {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if c.Request.Method != http.MethodGet {
		s.record(c, "account."+strconv.FormatInt(id, 10)+".cli."+c.Request.Method)
	}
	httpapi.OK(c, out)
}
