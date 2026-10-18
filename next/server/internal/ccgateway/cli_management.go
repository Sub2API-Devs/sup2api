package ccgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

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

type cliToolCatalog struct {
	Catalog cliCatalogState `json:"catalog"`
	Tools   []struct {
		Name     string `json:"name"`
		Variants []struct {
			Description *string         `json:"description"`
			Schema      json.RawMessage `json:"input_schema"`
		} `json:"variants"`
	} `json:"tools"`
}

var cliCatalogToolName = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)

func decodeCLIToolCatalog(raw []byte) (cliToolCatalog, error) {
	var out cliToolCatalog
	if json.Unmarshal(raw, &out) != nil || out.Catalog.State != "ready" || out.Catalog.InstalledVersion == "" || len(out.Catalog.InstalledVersion) > 64 || out.Catalog.InstalledVersion != out.Catalog.CatalogVersion || len(out.Tools) == 0 || len(out.Tools) > 256 || len(out.Tools) != out.Catalog.ToolCount || out.Catalog.VariantCount < 1 || out.Catalog.VariantCount > 1024 || out.Catalog.Error != "" {
		return out, fmt.Errorf("invalid CLI tool catalog")
	}
	names, count := map[string]bool{}, 0
	for _, tool := range out.Tools {
		if !cliCatalogToolName.MatchString(tool.Name) || strings.HasPrefix(tool.Name, "mcp__") || names[tool.Name] || len(tool.Variants) == 0 {
			return out, fmt.Errorf("invalid CLI tool group")
		}
		names[tool.Name] = true
		count += len(tool.Variants)
		if count > out.Catalog.VariantCount {
			return out, fmt.Errorf("invalid CLI tool variant count")
		}
		for _, variant := range tool.Variants {
			var schema map[string]json.RawMessage
			if variant.Description == nil || json.Unmarshal(variant.Schema, &schema) != nil || schema == nil {
				return out, fmt.Errorf("invalid CLI tool definition")
			}
			if rawType, exists := schema["type"]; exists {
				var kind string
				if json.Unmarshal(rawType, &kind) != nil || kind != "object" {
					return out, fmt.Errorf("invalid CLI tool schema type")
				}
			}
		}
	}
	if count != out.Catalog.VariantCount {
		return out, fmt.Errorf("invalid CLI tool variant count")
	}
	return out, nil
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

func (s *Service) cliManagementResponse(c *gin.Context, path string, limit int64) ([]byte, int64, bool) {
	c.Header("Cache-Control", "no-store")
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return nil, 0, false
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 40*time.Second)
	defer cancel()
	d, err := s.desired(ctx, id, false)
	if err != nil {
		httpapi.Fail(c, core.ErrNotFound)
		return nil, 0, false
	}
	if !d.Enabled {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, d.Blocked))
		return nil, 0, false
	}
	var body []byte
	if c.Request.Method != http.MethodGet {
		raw, readErr := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 4096))
		if readErr != nil {
			httpapi.Fail(c, core.ErrInvalidArgument)
			return nil, 0, false
		}
		body, err = cliManagementBody(c.Request.Method, raw)
		if err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()))
			return nil, 0, false
		}
	}
	response, closeConn, err := s.runtimeRequest(ctx, d.Key, c.Request.Method, path, body, d.Revision)
	if err != nil {
		httpapi.Fail(c, transportError(err))
		return nil, 0, false
	}
	defer closeConn()
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, limit+1))
	if err != nil || int64(len(raw)) > limit {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return nil, 0, false
	}
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusAccepted {
		httpapi.Fail(c, runtimeError(response.StatusCode, raw))
		return nil, 0, false
	}
	return raw, id, true
}

func (s *Service) cliManagement(c *gin.Context) {
	raw, id, ok := s.cliManagementResponse(c, "admin/cli", 16384)
	if !ok {
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

func (s *Service) cliCatalogGet(c *gin.Context) {
	raw, _, ok := s.cliManagementResponse(c, "admin/cli/catalog", 8<<20)
	if !ok {
		return
	}
	out, err := decodeCLIToolCatalog(raw)
	if err != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	httpapi.OK(c, out)
}
