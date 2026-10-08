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

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func legacySkills(h http.Header) bool {
	for _, line := range h.Values("Anthropic-Beta") {
		for _, v := range strings.Split(line, ",") {
			if strings.TrimSpace(v) == "skills-2025-10-02" {
				return true
			}
		}
	}
	return false
}

func (x *resourceCall) skills() {
	parts := strings.Split(strings.Trim(x.c.Request.URL.Path, "/"), "/")
	if len(parts) < 2 || len(parts) > 6 {
		x.fail(core.ErrNotFound)
		return
	}
	for _, s := range parts {
		if !resourceID(s) {
			x.fail(core.ErrNotFound)
			return
		}
	}
	listing := x.c.Request.Method == http.MethodGet && (len(parts) == 2 || len(parts) == 4 && parts[3] == "versions")
	q := x.c.Request.URL.Query()
	for key, values := range q {
		allowed := key == "beta" && len(values) == 1 && values[0] == "true"
		allowed = allowed || listing && (key == "limit" || key == "page" || len(parts) == 2 && key == "source")
		if !allowed || len(values) != 1 {
			x.fail(core.ErrInvalidArgument)
			return
		}
	}
	if len(parts) == 2 {
		switch x.c.Request.Method {
		case http.MethodPost:
			x.skillUpload("")
		case http.MethodGet:
			x.listSkills()
		default:
			x.c.Status(405)
		}
		return
	}
	if len(parts) >= 4 && parts[3] != "versions" || len(parts) == 6 && parts[5] != "content" {
		x.fail(core.ErrNotFound)
		return
	}
	if len(parts) == 4 {
		switch x.c.Request.Method {
		case http.MethodPost:
			x.skillUpload(parts[2])
		case http.MethodGet:
			x.listSkillVersions(parts[2])
		default:
			x.c.Status(405)
		}
		return
	}
	if x.c.Request.Method != http.MethodGet && x.c.Request.Method != http.MethodDelete || len(parts) == 6 && x.c.Request.Method != http.MethodGet {
		x.c.Status(405)
		return
	}
	selector := ""
	if len(parts) >= 5 {
		selector = parts[4]
	}
	x.existingSkill(parts[2], selector, len(parts) == 6)
}

func (x *resourceCall) skillLease(parent *core.ProviderResource) (context.Context, func(), core.ResourceBinding, error) {
	var last error = core.ErrNoAvailableAccount
	for _, ref := range x.accounts {
		if ref.PluginKey != "ccgateway" || parent != nil && parent.Binding.AccountID != ref.ID {
			continue
		}
		b, err := x.g.d.ResourceTransport.Identity(x.c.Request.Context(), ref.ID)
		if err != nil {
			last = core.ErrUnavailable
			continue
		}
		if b.AccountID != ref.ID || b.PrincipalID == "" || b.Generation == "" || parent != nil && b != parent.Binding {
			return nil, nil, b, core.ErrConflict.WithMessage("skill issuer changed")
		}
		ctx, done, err := x.lease(ref)
		if err != nil {
			last = err
			continue
		}
		return ctx, done, b, nil
	}
	return nil, nil, core.ResourceBinding{}, last
}
func (x *resourceCall) ownedSkill(id string) (core.ProviderResource, error) {
	p, e := x.g.d.Resources.Get(x.c.Request.Context(), x.owner, id)
	if e != nil {
		return p, e
	}
	_, available := x.account(p.Binding.AccountID)
	if p.PluginKey != "ccgateway" || p.Kind != "skill" || p.State != "ready" || !available || !p.ExpiresAt.IsZero() && !p.ExpiresAt.After(time.Now()) {
		return core.ProviderResource{}, core.ErrNotFound
	}
	return p, nil
}
func skillPage(q url.Values) (int, string, error) {
	limit := 20
	if q.Has("limit") {
		n, e := strconv.Atoi(q.Get("limit"))
		if e != nil || n < 1 || n > 1000 {
			return 0, "", core.ErrInvalidArgument
		}
		limit = n
	}
	after := ""
	if raw := q.Get("page"); raw != "" {
		if !strings.HasPrefix(raw, "page_") {
			return 0, "", core.ErrInvalidArgument
		}
		id, e := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(raw, "page_"))
		if e != nil || !resourceID(string(id)) {
			return 0, "", core.ErrInvalidArgument
		}
		after = string(id)
	}
	return limit, after, nil
}
func skillPageResponse(data []map[string]any, more bool, last string) map[string]any {
	var next any
	if more {
		next = "page_" + base64.RawURLEncoding.EncodeToString([]byte(last))
	}
	return map[string]any{"data": data, "has_more": more, "next_page": next}
}

func (x *resourceCall) listSkillVersions(id string) {
	p, e := x.ownedSkill(id)
	if e != nil {
		x.fail(e)
		return
	}
	limit, after, e := skillPage(x.c.Request.URL.Query())
	if e != nil {
		x.fail(e)
		return
	}
	page, e := x.g.d.Skills.ListSkillVersions(x.c.Request.Context(), x.owner, p.PublicID, after, limit)
	if e != nil {
		x.fail(e)
		return
	}
	data := []map[string]any{}
	last := ""
	for _, v := range page.Items {
		body, e := publicSkillVersion(v, legacySkills(x.c.Request.Header))
		if e != nil {
			x.fail(e)
			return
		}
		data = append(data, body)
		last = v.PublicVersionID
	}
	x.c.JSON(200, skillPageResponse(data, page.HasMore, last))
}
func skillObject(raw json.RawMessage) (map[string]any, error) {
	var m map[string]any
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	e := decoder.Decode(&m)
	if e != nil || m == nil {
		return nil, core.ErrUnavailable
	}
	return m, nil
}
func (x *resourceCall) publicSkill(p core.ProviderResource) (map[string]any, error) {
	m, e := skillObject(p.Metadata)
	if e != nil {
		return nil, e
	}
	v, e := x.g.d.Skills.FindVersion(x.c.Request.Context(), x.owner, p.PublicID, "latest")
	if e != nil {
		return nil, e
	}
	m["id"] = p.PublicID
	delete(m, "latest_version")
	delete(m, "latest_version_id")
	if legacySkills(x.c.Request.Header) {
		if v.LegacyEpoch == "" {
			return nil, core.ErrConflict.WithMessage("this skill has no verified legacy version selector")
		}
		m["latest_version"] = v.LegacyEpoch
		if name, ok := m["display_name"]; ok {
			m["display_title"] = name
			delete(m, "display_name")
		}
		m["source"] = "custom"
	} else {
		m["latest_version_id"] = v.PublicVersionID
		if name, ok := m["display_title"]; ok {
			m["display_name"] = name
			delete(m, "display_title")
		}
		m["source"] = map[string]any{"type": "custom"}
	}
	return m, nil
}
func publicSkillVersion(v core.SkillVersion, legacy bool) (map[string]any, error) {
	m, e := skillObject(v.Metadata)
	if e != nil {
		return nil, e
	}
	m["skill_id"] = v.Parent.PublicID
	delete(m, "version")
	if legacy {
		if v.LegacyEpoch == "" {
			return nil, core.ErrConflict.WithMessage("version has no verified legacy selector")
		}
		m["version"] = v.LegacyEpoch
		m["id"] = v.PublicVersionID
	} else {
		m["id"] = v.PublicVersionID
	}
	return m, nil
}
func skillMetadata(body map[string]any, remote string, version bool) (json.RawMessage, time.Time, error) {
	id, _ := body["id"].(string)
	typ, _ := body["type"].(string)
	if !resourceID(id) || remote != "" && remote != id || !version && typ != "skill" || version && typ != "skill_version" {
		return nil, time.Time{}, fmt.Errorf("invalid skill identity")
	}
	created, _ := body["created_at"].(string)
	at, e := time.Parse(time.RFC3339Nano, created)
	if e != nil {
		return nil, time.Time{}, e
	}
	if !version {
		source, ok := body["source"].(map[string]any)
		if (!ok || source["type"] != "custom") && body["source"] != "custom" {
			return nil, time.Time{}, fmt.Errorf("expected custom skill")
		}
	}
	raw, e := json.Marshal(body)
	if len(raw) > int(resourceJSONLimit) {
		return nil, time.Time{}, fmt.Errorf("oversized skill metadata")
	}
	return raw, at, e
}

// A remote failure can mention either identifier; neither provider ID is public.
func (x *resourceCall) skillFailure(resp *http.Response, p core.ProviderResource, v *core.SkillVersion) *resourceFailure {
	f := readResourceFailure(resp, p.RemoteID, p.PublicID)
	if v != nil {
		f.Body = replaceResourceErrorID(f.Body, v.RemoteVersionID, v.PublicVersionID).(map[string]any)
	}
	return f
}
func skillApplyFacts(x *resourceCall, resp *http.Response) {
	httpfacts.Apply(x.c.Writer.Header(), resp.Header)
}

func (x *resourceCall) skillRequest(ctx context.Context, method, path string, body io.Reader) (*http.Request, error) {
	u, e := url.Parse(path)
	if e != nil {
		return nil, e
	}
	if x.c.Query("beta") == "true" {
		q := u.Query()
		q.Set("beta", "true")
		u.RawQuery = q.Encode()
	}
	return x.request(ctx, method, u.String(), body)
}
