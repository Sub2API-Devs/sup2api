package gateway

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

const resourceFileLimit int64 = 512 << 20
const resourceJSONLimit int64 = 16 << 10

func resourceLegacyFiles(headers http.Header) bool {
	for _, value := range headers.Values("Anthropic-Beta") {
		for _, beta := range strings.Split(value, ",") {
			if strings.TrimSpace(beta) == "files-api-2025-04-14" {
				return true
			}
		}
	}
	return false
}

type resourceCall struct {
	g        *Gateway
	c        *gin.Context
	owner    core.ResourceOwner
	rid      string
	accounts []core.AccountRef
}

func (g *Gateway) serveResourceHTTP(c *gin.Context) bool {
	path := c.Request.URL.Path
	skills := path == "/v1/skills" || strings.HasPrefix(path, "/v1/skills/")
	if !skills && path != "/v1/files" && !strings.HasPrefix(path, "/v1/files/") {
		return false
	}
	x := &resourceCall{g: g, c: c, rid: httpapi.NewRequestID()}
	c.Header("X-Request-Id", x.rid)
	if !g.healthy() || g.d.Resources == nil || g.d.ResourceTransport == nil || g.d.Auth == nil || g.d.Accounts == nil {
		x.fail(core.ErrUnavailable)
		return true
	}
	key := strings.TrimSpace(c.GetHeader("x-api-key"))
	if key == "" {
		value := strings.TrimSpace(c.GetHeader("Authorization"))
		if len(value) > 7 && strings.EqualFold(value[:7], "Bearer ") {
			key = strings.TrimSpace(value[7:])
		}
	}
	if key == "" {
		x.fail(core.ErrUnauthenticated)
		return true
	}
	p, err := g.d.Auth.Authenticate(c.Request.Context(), key)
	if err != nil {
		x.fail(err)
		return true
	}
	if p == nil || p.UserID <= 0 || p.Group.ID <= 0 {
		x.fail(core.ErrPermissionDenied)
		return true
	}
	x.owner = core.ResourceOwner{UserID: p.UserID, GroupID: p.Group.ID}
	ctx, release, admitted, err := core.AcquireSlot(c.Request.Context(), g.d.Slots, "user", p.UserID, p.UserMaxConcurrency, x.rid)
	if err != nil {
		x.fail(core.ErrUnavailable)
		return true
	}
	if !admitted {
		x.fail(core.ErrRateLimited)
		return true
	}
	defer release()
	c.Request = c.Request.WithContext(ctx)
	var keys []core.AccountTypeKey
	table := g.table.Load()
	if table != nil && table.gen != nil {
		for _, binding := range table.gen.AccountTypes() {
			if binding.Plugin.Key == "ccgateway" && binding.Client != nil {
				keys = append(keys, binding.Key())
			}
		}
	}
	if len(keys) == 0 {
		x.fail(core.ErrNotFound)
		return true
	}
	x.accounts, err = g.d.Accounts.Candidates(ctx, p.Group.ID, keys)
	if err != nil {
		x.fail(core.ErrUnavailable)
		return true
	}
	// Reject product scopes whose IDs are not mapped by this ownership store.
	if len(c.Request.Header.Values("Anthropic-Workspace-Id")) != 0 || strings.Contains(strings.Join(c.Request.Header.Values("Anthropic-Beta"), ","), "managed-agents-") {
		x.fail(core.ErrInvalidArgument.WithMessage("workspace and managed-agent scopes are not supported by this file route"))
		return true
	}
	if len(c.Request.Header.Values("Anthropic-Version")) > 1 {
		x.fail(core.ErrInvalidArgument.WithMessage("exactly one Anthropic-Version value is allowed"))
		return true
	}
	if skills {
		if g.d.Skills == nil {
			x.fail(core.ErrUnavailable)
		} else {
			x.skills()
		}
		return true
	}
	if path == "/v1/files" {
		switch c.Request.Method {
		case http.MethodPost:
			x.upload()
		case http.MethodGet:
			x.list()
		default:
			c.Status(http.StatusMethodNotAllowed)
		}
		return true
	}
	parts := strings.Split(strings.TrimPrefix(path, "/v1/files/"), "/")
	if len(c.Request.URL.Query()) != 0 {
		x.fail(core.ErrInvalidArgument)
		return true
	}
	if len(parts) > 2 || !resourceID(parts[0]) || len(parts) == 2 && parts[1] != "content" {
		x.fail(core.ErrNotFound)
		return true
	}
	if len(parts) == 2 && c.Request.Method != http.MethodGet || len(parts) == 1 && c.Request.Method != http.MethodGet && c.Request.Method != http.MethodDelete {
		c.Status(http.StatusMethodNotAllowed)
		return true
	}
	x.existing(parts[0], len(parts) == 2)
	return true
}

func resourceID(id string) bool {
	if id == "" || len(id) > 256 {
		return false
	}
	for _, r := range id {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '_' || r == '-') {
			return false
		}
	}
	return true
}
func (x *resourceCall) fail(err error) { writeError(x.c, "anthropic", fromCore(core.AsError(err), "")) }
func (x *resourceCall) account(id int64) (core.AccountRef, bool) {
	for _, ref := range x.accounts {
		if ref.ID == id && ref.PluginKey == "ccgateway" {
			return ref, true
		}
	}
	return core.AccountRef{}, false
}
func (x *resourceCall) lease(ref core.AccountRef) (context.Context, func(), error) {
	ctx, release, ok, err := core.AcquireSlot(x.c.Request.Context(), x.g.d.Slots, "account", ref.ID, ref.MaxConcurrency, x.rid)
	if err != nil {
		return nil, nil, core.ErrUnavailable
	}
	if !ok {
		return nil, nil, core.ErrRateLimited
	}
	if lim := x.g.d.Limiter; lim != nil {
		ok, err = lim.TryHit(ctx, ref, x.rid)
		if err != nil || !ok {
			release()
			return nil, nil, core.ErrRateLimited
		}
	}
	return ctx, release, nil
}
func (x *resourceCall) request(ctx context.Context, method, path string, body io.Reader) (*http.Request, error) {
	r, err := http.NewRequestWithContext(ctx, method, path, body)
	if err != nil {
		return nil, err
	}
	// Account transport injects issuer credentials. No client credential crosses.
	version := x.c.GetHeader("Anthropic-Version")
	if version == "" {
		version = "2023-06-01"
	}
	r.Header.Set("Anthropic-Version", version)
	for _, beta := range x.c.Request.Header.Values("Anthropic-Beta") {
		r.Header.Add("Anthropic-Beta", beta)
	}
	return r, nil
}
func resourceCleanupContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}
func readResourceJSON(resp *http.Response) (map[string]any, error) {
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, resourceJSONLimit+1))
	if err != nil || int64(len(raw)) > resourceJSONLimit {
		return nil, fmt.Errorf("invalid bounded resource response")
	}
	var body map[string]any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if !json.Valid(raw) || dec.Decode(&body) != nil || body == nil {
		return nil, fmt.Errorf("invalid resource JSON")
	}
	return body, nil
}
func resourceMetadata(body map[string]any, remote string, size int64) (json.RawMessage, error) {
	id, _ := body["id"].(string)
	kind, _ := body["type"].(string)
	n, ok := body["size_bytes"].(json.Number)
	actual, err := n.Int64()
	if !resourceID(id) || remote != "" && id != remote || kind != "file" || !ok || err != nil || actual < 0 || actual > resourceFileLimit || size >= 0 && actual != size {
		return nil, fmt.Errorf("invalid resource identity or size")
	}
	for field, max := range map[string]int{"filename": 500, "mime_type": 255, "created_at": 128} {
		v, ok := body[field].(string)
		if !ok || v == "" || !utf8.ValidString(v) || utf8.RuneCountInString(v) > max {
			return nil, fmt.Errorf("invalid resource metadata")
		}
	}
	if _, err = time.Parse(time.RFC3339, body["created_at"].(string)); err != nil {
		return nil, err
	}
	out := map[string]any{}
	for _, k := range []string{"type", "filename", "mime_type", "size_bytes", "created_at", "downloadable", "expires_at"} {
		if v, ok := body[k]; ok {
			out[k] = v
		}
	}
	if v, ok := out["downloadable"]; ok {
		if _, ok = v.(bool); !ok {
			return nil, fmt.Errorf("invalid downloadable")
		}
	}
	if v := out["expires_at"]; v != nil {
		s, ok := v.(string)
		if !ok {
			return nil, fmt.Errorf("invalid expiry")
		}
		if _, err = time.Parse(time.RFC3339, s); err != nil {
			return nil, err
		}
	}
	return json.Marshal(out)
}
func (x *resourceCall) publicMetadata(r core.ProviderResource) map[string]any {
	var stored map[string]any
	dec := json.NewDecoder(bytes.NewReader(r.Metadata))
	dec.UseNumber()
	_ = dec.Decode(&stored)
	out := map[string]any{}
	for _, key := range []string{"type", "filename", "mime_type", "size_bytes", "created_at", "downloadable", "expires_at"} {
		if value, ok := stored[key]; ok {
			out[key] = value
		}
	}
	out["id"] = r.PublicID
	if resourceLegacyFiles(x.c.Request.Header) {
		delete(out, "expires_at")
	} else if _, ok := out["expires_at"]; !ok {
		out["expires_at"] = nil
	}
	return out
}

func (x *resourceCall) list() {
	q := x.c.Request.URL.Query()
	legacy := resourceLegacyFiles(x.c.Request.Header)
	for key := range q {
		if key != "limit" && key != "page" && key != "ids" && key != "ids[]" && !(legacy && (key == "before_id" || key == "after_id")) {
			x.fail(core.ErrInvalidArgument.WithMessage("unsupported file list parameter"))
			return
		}
		if key != "ids" && key != "ids[]" && len(q[key]) != 1 {
			x.fail(core.ErrInvalidArgument)
			return
		}
	}
	query := core.ResourceQuery{PluginKey: "ccgateway", Kind: "file", ReadyOnly: true, ExpiredWithin: 30 * 24 * time.Hour, Limit: 20}
	for _, ref := range x.accounts {
		if ref.PluginKey == "ccgateway" {
			query.AccountIDs = append(query.AccountIDs, ref.ID)
		}
	}
	if value := q.Get("limit"); value != "" {
		n, err := strconv.Atoi(value)
		if err != nil || n < 1 || n > 1000 {
			x.fail(core.ErrInvalidArgument)
			return
		}
		query.Limit = n
	}
	seenIDs := map[string]bool{}
	for _, id := range append(q["ids"], q["ids[]"]...) {
		if !resourceID(id) {
			x.fail(core.ErrInvalidArgument)
			return
		}
		if !seenIDs[id] {
			query.IDs = append(query.IDs, id)
			seenIDs[id] = true
		}
	}
	if len(query.IDs) > 0 {
		if len(query.IDs) > 100 || q.Has("page") || q.Has("limit") || legacy {
			x.fail(core.ErrInvalidArgument)
			return
		}
		query.Limit = 100
	}
	if legacy {
		if q.Has("page") {
			x.fail(core.ErrInvalidArgument)
			return
		}
		query.BeforeID = q.Get("before_id")
		query.AfterID = q.Get("after_id")
	} else if cursor := q.Get("page"); cursor != "" {
		if !strings.HasPrefix(cursor, "page_") {
			x.fail(core.ErrInvalidArgument)
			return
		}
		id, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(cursor, "page_"))
		if err != nil || !resourceID(string(id)) {
			x.fail(core.ErrInvalidArgument)
			return
		}
		query.AfterID = string(id)
	}
	if query.BeforeID != "" && query.AfterID != "" {
		x.fail(core.ErrInvalidArgument)
		return
	}
	page, err := x.g.d.Resources.Query(x.c.Request.Context(), x.owner, query)
	if err != nil {
		x.fail(err)
		return
	}
	data := make([]map[string]any, 0, len(page.Items))
	for _, r := range page.Items {
		data = append(data, x.publicMetadata(r))
	}
	if legacy {
		var first, last any
		if len(page.Items) > 0 {
			first = page.Items[0].PublicID
			last = page.Items[len(page.Items)-1].PublicID
		}
		x.c.JSON(200, gin.H{"data": data, "has_more": page.HasMore, "first_id": first, "last_id": last})
		return
	}
	var next any
	if page.HasMore && len(page.Items) > 0 {
		next = "page_" + base64.RawURLEncoding.EncodeToString([]byte(page.Items[len(page.Items)-1].PublicID))
	}
	x.c.JSON(200, gin.H{"data": data, "next_page": next})
}

func (x *resourceCall) existing(id string, content bool) {
	r, err := x.g.d.Resources.Get(x.c.Request.Context(), x.owner, id)
	if err != nil {
		x.fail(core.ErrNotFound)
		return
	}
	expired := !r.ExpiresAt.IsZero() && !r.ExpiresAt.After(x.g.now())
	metadataGone := expired && !r.ExpiresAt.Add(30*24*time.Hour).After(x.g.now())
	if r.PluginKey != "ccgateway" || r.Kind != "file" || r.State != "ready" || content && expired || metadataGone {
		x.fail(core.ErrNotFound)
		return
	}
	ref, ok := x.account(r.Binding.AccountID)
	if !ok {
		x.fail(core.ErrNotFound)
		return
	}
	binding, err := x.g.d.ResourceTransport.Identity(x.c.Request.Context(), ref.ID)
	if err != nil || binding != r.Binding {
		x.fail(core.ErrConflict.WithMessage("file issuer identity is no longer available"))
		return
	}
	ctx, release, err := x.lease(ref)
	if err != nil {
		x.fail(err)
		return
	}
	defer release()
	method := x.c.Request.Method
	operation := r.OperationID
	if method == http.MethodDelete {
		reservation, err := x.g.d.Resources.BeginDelete(ctx, x.owner, id, binding)
		if err != nil {
			x.fail(err)
			return
		}
		if !reservation.Dispatch {
			x.fail(core.ErrConflict)
			return
		}
		operation = reservation.Resource.OperationID
	}
	path := "/v1/files/" + url.PathEscape(r.RemoteID)
	if content {
		path += "/content"
	}
	req, _ := x.request(ctx, method, path, nil)
	resp, err := x.g.d.ResourceTransport.RoundTrip(ref.ID, binding, req)
	if method == http.MethodDelete {
		confirmed := false
		var failure *resourceFailure
		if err == nil && resp != nil {
			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				failure = readResourceFailure(resp, r.RemoteID, id)
				confirmed = failure.Status == 404 && failure.Kind == "not_found_error"
			} else {
				body, readErr := readResourceJSON(resp)
				confirmed = readErr == nil && body["id"] == r.RemoteID && body["type"] == "file_deleted"
			}
		}
		cleanup, cancel := resourceCleanupContext()
		defer cancel()
		storeErr := x.g.d.Resources.FinishDelete(cleanup, x.owner, id, operation, confirmed)
		if failure != nil {
			x.writeProviderFailure(failure)
			return
		}
		if !confirmed || storeErr != nil {
			x.fail(core.ErrUnavailable.WithMessage("file deletion outcome requires reconciliation"))
			return
		}
		httpfacts.Apply(x.c.Writer.Header(), resp.Header)
		x.c.JSON(200, gin.H{"id": id, "type": "file_deleted"})
		return
	}
	if err != nil || resp == nil {
		x.fail(core.ErrUnavailable)
		return
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		x.writeProviderFailure(readResourceFailure(resp, r.RemoteID, id))
		return
	}
	if content {
		defer resp.Body.Close()
		if resp.ContentLength > resourceFileLimit || resp.ContentLength >= 0 && resp.ContentLength != r.Bytes {
			x.fail(core.ErrUnavailable)
			return
		}
		httpfacts.Apply(x.c.Writer.Header(), resp.Header)
		x.c.Header("Content-Type", resp.Header.Get("Content-Type"))
		x.c.Header("Content-Length", strconv.FormatInt(r.Bytes, 10))
		x.c.Status(resp.StatusCode)
		// A short read remains detectable by the HTTP client's Content-Length
		// contract; never return a silently successful shorter chunked file.
		_, _ = io.CopyN(x.c.Writer, resp.Body, r.Bytes)
		return
	}
	body, err := readResourceJSON(resp)
	if err != nil {
		x.fail(core.ErrUnavailable)
		return
	}
	metadata, err := resourceMetadata(body, r.RemoteID, r.Bytes)
	if err != nil {
		x.fail(core.ErrUnavailable)
		return
	}
	r.Metadata = metadata
	httpfacts.Apply(x.c.Writer.Header(), resp.Header)
	x.c.JSON(200, x.publicMetadata(r))
}

type resourceFailure struct {
	Status  int
	Kind    string
	Body    map[string]any
	Headers http.Header
}

func readResourceFailure(resp *http.Response, remoteID, publicID string) *resourceFailure {
	body, err := readResourceJSON(resp)
	kind := "api_error"
	detail, _ := body["error"].(map[string]any)
	message, messageOK := detail["message"].(string)
	reported, typeOK := detail["type"].(string)
	if err == nil && messageOK && typeOK && message != "" && reported != "" {
		kind = reported
		if remoteID != "" {
			body = replaceResourceErrorID(body, remoteID, publicID).(map[string]any)
		}
	} else {
		body = map[string]any{"type": "error", "error": map[string]any{"type": kind, "message": "invalid provider error response"}}
	}
	status := resp.StatusCode
	if status < 400 || status > 599 {
		status = 502
	}
	return &resourceFailure{Status: status, Kind: kind, Body: body, Headers: resp.Header.Clone()}
}
func replaceResourceErrorID(value any, remoteID, publicID string) any {
	switch v := value.(type) {
	case string:
		return strings.ReplaceAll(v, remoteID, publicID)
	case map[string]any:
		out := make(map[string]any, len(v))
		for key, item := range v {
			out[key] = replaceResourceErrorID(item, remoteID, publicID)
		}
		return out
	case []any:
		out := make([]any, len(v))
		for i, item := range v {
			out[i] = replaceResourceErrorID(item, remoteID, publicID)
		}
		return out
	default:
		return value
	}
}
func (x *resourceCall) writeProviderFailure(f *resourceFailure) {
	httpfacts.Apply(x.c.Writer.Header(), f.Headers)
	x.c.JSON(f.Status, f.Body)
}
