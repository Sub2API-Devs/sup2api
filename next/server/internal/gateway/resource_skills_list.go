package gateway

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type skillCursor struct {
	Source  string `json:"source"`
	Builtin bool   `json:"builtin"`
	After   string `json:"after,omitempty"`
	Account int64  `json:"account,omitempty"`
	Issuer  string `json:"issuer,omitempty"`
}

func skillCursorString(c skillCursor) string {
	raw, _ := json.Marshal(c)
	return "skpage_" + base64.RawURLEncoding.EncodeToString(raw)
}
func skillBindingDigest(b core.ResourceBinding) string {
	raw, _ := json.Marshal(b)
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}
func parseSkillCursor(raw, source string) (skillCursor, error) {
	c := skillCursor{Source: source, Builtin: source == "anthropic"}
	if raw == "" {
		return c, nil
	}
	if len(raw) > 8192 || !strings.HasPrefix(raw, "skpage_") {
		return c, core.ErrInvalidArgument
	}
	data, e := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(raw, "skpage_"))
	if e != nil {
		return c, core.ErrInvalidArgument
	}
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	if d.Decode(&c) != nil || !json.Valid(data) || c.Source != source || source == "custom" && c.Builtin || source == "anthropic" && !c.Builtin || !c.Builtin && c.After != "" && !resourceID(c.After) {
		return c, core.ErrInvalidArgument
	}
	return c, nil
}
func (x *resourceCall) listSkills() {
	source := x.c.Query("source")
	if source != "" && source != "custom" && source != "anthropic" {
		x.fail(core.ErrInvalidArgument)
		return
	}
	q := x.c.Request.URL.Query()
	q.Del("page")
	limit, _, e := skillPage(q)
	if e != nil {
		x.fail(e)
		return
	}
	cursor, e := parseSkillCursor(x.c.Query("page"), source)
	if e != nil {
		x.fail(e)
		return
	}
	data := []map[string]any{}
	if !cursor.Builtin {
		accounts := []int64{}
		for _, ref := range x.accounts {
			if ref.PluginKey == "ccgateway" {
				accounts = append(accounts, ref.ID)
			}
		}
		page, e := x.g.d.Skills.ListSkills(x.c.Request.Context(), x.owner, accounts, cursor.After, limit)
		if e != nil {
			x.fail(e)
			return
		}
		for _, p := range page.Items {
			body, e := x.publicSkill(p)
			if e != nil {
				x.fail(e)
				return
			}
			data = append(data, body)
			cursor.After = p.PublicID
		}
		if page.HasMore {
			x.c.JSON(200, map[string]any{"data": data, "has_more": true, "next_page": skillCursorString(cursor)})
			return
		}
		if source == "custom" {
			x.c.JSON(200, map[string]any{"data": data, "has_more": false, "next_page": nil})
			return
		}
		cursor = skillCursor{Source: source, Builtin: true}
	}
	remaining := limit - len(data)
	fetch := remaining
	if fetch == 0 {
		fetch = 1
	}
	builtin, next, more, failure, e := x.readBuiltinSkills(cursor, fetch)
	if failure != nil {
		x.writeProviderFailure(failure)
		return
	}
	if e != nil {
		x.fail(e)
		return
	}
	if remaining == 0 {
		more = len(builtin) > 0
		// Probe confirms the second scope exists but does not consume its first row.
		next.After = ""
	} else {
		data = append(data, builtin...)
	}
	var page any
	if more {
		page = skillCursorString(next)
	}
	x.c.JSON(200, map[string]any{"data": data, "has_more": more, "next_page": page})
}

// Fixed source filtering is independent of the public cursor. A cursor can
// never turn a catalog read into a workspace-wide custom skill enumeration.
func (x *resourceCall) readBuiltinSkills(cursor skillCursor, limit int) ([]map[string]any, skillCursor, bool, *resourceFailure, error) {
	var pinned *core.ProviderResource
	if cursor.Account != 0 {
		if _, ok := x.account(cursor.Account); !ok {
			return nil, cursor, false, nil, core.ErrNotFound
		}
		b, e := x.g.d.ResourceTransport.Identity(x.c.Request.Context(), cursor.Account)
		if e != nil {
			return nil, cursor, false, nil, core.ErrUnavailable
		}
		if skillBindingDigest(b) != cursor.Issuer {
			return nil, cursor, false, nil, core.ErrConflict
		}
		pinned = &core.ProviderResource{Binding: b}
	}
	ctx, done, b, e := x.skillLease(pinned)
	if e != nil {
		return nil, cursor, false, nil, e
	}
	defer done()
	cursor.Account = b.AccountID
	cursor.Issuer = skillBindingDigest(b)
	q := url.Values{"source": {"anthropic"}, "limit": {strconv.Itoa(limit)}}
	if cursor.After != "" {
		q.Set("page", cursor.After)
	}
	req, _ := x.skillRequest(ctx, http.MethodGet, "/v1/skills?"+q.Encode(), nil)
	resp, e := x.g.d.ResourceTransport.RoundTrip(b.AccountID, b, req)
	if e != nil || resp == nil {
		return nil, cursor, false, nil, core.ErrUnavailable
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, cursor, false, readResourceFailure(resp, "", ""), nil
	}
	defer resp.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(resp.Body, (4<<20)+1))
	if e != nil || len(raw) > 4<<20 {
		return nil, cursor, false, nil, core.ErrUnavailable
	}
	var body map[string]any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if !json.Valid(raw) || dec.Decode(&body) != nil {
		return nil, cursor, false, nil, core.ErrUnavailable
	}
	rows, ok := body["data"].([]any)
	if !ok || len(rows) > limit {
		return nil, cursor, false, nil, core.ErrUnavailable
	}
	data := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		m, ok := row.(map[string]any)
		if !ok {
			return nil, cursor, false, nil, core.ErrUnavailable
		}
		s, obj := m["source"].(map[string]any)
		id, _ := m["id"].(string)
		if m["source"] != "anthropic" && (!obj || s["type"] != "anthropic") || !resourceID(id) || m["type"] != "skill" {
			return nil, cursor, false, nil, core.ErrUnavailable.WithMessage("provider returned an unrequested skill scope")
		}
		data = append(data, m)
	}
	more, ok := body["has_more"].(bool)
	if !ok {
		return nil, cursor, false, nil, core.ErrUnavailable
	}
	next, _ := body["next_page"].(string)
	if more && (next == "" || len(next) > 4096 || len(data) == 0) {
		return nil, cursor, false, nil, fmt.Errorf("invalid provider skill cursor")
	}
	cursor.After = next
	skillApplyFacts(x, resp)
	return data, cursor, more, nil, nil
}
