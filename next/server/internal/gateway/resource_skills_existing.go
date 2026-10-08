package gateway

import (
	"io"
	"net/http"
	"os"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func (x *resourceCall) existingSkill(id, selector string, content bool) {
	p, e := x.ownedSkill(id)
	if e != nil {
		x.fail(e)
		return
	}
	var version *core.SkillVersion
	path := "/v1/skills/" + p.RemoteID
	if selector != "" {
		if selector == "latest" && (content || x.c.Request.Method == http.MethodDelete) {
			x.fail(core.ErrInvalidArgument.WithMessage("this operation requires a specific version"))
			return
		}
		v, e := x.g.d.Skills.FindVersion(x.c.Request.Context(), x.owner, p.PublicID, selector)
		if e != nil {
			x.fail(e)
			return
		}
		version = &v
		remote := v.RemoteVersionID
		if legacySkills(x.c.Request.Header) {
			remote = v.LegacyEpoch
		}
		if !resourceID(remote) {
			x.fail(core.ErrConflict.WithMessage("version has no verified selector for this API"))
			return
		}
		path += "/versions/" + remote
	}
	if content {
		path += "/content"
	}
	ctx, done, binding, e := x.skillLease(&p)
	if e != nil {
		x.fail(e)
		return
	}
	defer done()
	var deletion core.SkillDeleteIntent
	if x.c.Request.Method == http.MethodDelete {
		deletion, e = x.g.d.Skills.BeginSkillDelete(ctx, x.owner, p.PublicID, selector)
		if e != nil {
			x.fail(e)
			return
		}
		if !deletion.Dispatch {
			x.fail(core.ErrConflict)
			return
		}
	}
	req, _ := x.skillRequest(ctx, x.c.Request.Method, path, nil)
	resp, e := x.g.d.ResourceTransport.RoundTrip(binding.AccountID, binding, req)
	if x.c.Request.Method == http.MethodDelete {
		x.finishSkillDelete(deletion, resp, e)
		return
	}
	if e != nil || resp == nil {
		x.fail(core.ErrUnavailable)
		return
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		x.writeProviderFailure(x.skillFailure(resp, p, version))
		return
	}
	if content {
		x.skillDownload(resp)
		return
	}
	body, e := readResourceJSON(resp)
	if e != nil {
		x.fail(core.ErrUnavailable)
		return
	}
	var result map[string]any
	if version == nil {
		p.Metadata, _, e = skillMetadata(body, p.RemoteID, false)
		if e == nil {
			result, e = x.publicSkill(p)
		}
	} else {
		version.Metadata, _, e = skillMetadata(body, version.RemoteVersionID, true)
		if body["skill_id"] != p.RemoteID {
			e = core.ErrUnavailable
		}
		if e == nil {
			result, e = publicSkillVersion(*version, legacySkills(x.c.Request.Header))
		}
	}
	if e != nil {
		x.fail(core.ErrUnavailable)
		return
	}
	skillApplyFacts(x, resp)
	x.c.JSON(resp.StatusCode, result)
}

func (x *resourceCall) finishSkillDelete(intent core.SkillDeleteIntent, resp *http.Response, requestErr error) {
	completion := core.SkillDeleteCompletion{Owner: x.owner, ParentID: intent.Parent.PublicID, OperationID: intent.OperationID, Outcome: "uncertain"}
	remote, public, kind := intent.Parent.RemoteID, intent.Parent.PublicID, "skill_deleted"
	if intent.Version != nil {
		v := intent.Version
		completion.PublicVersionID = v.PublicVersionID
		remote = v.RemoteVersionID
		public = v.PublicVersionID
		kind = "skill_version_deleted"
		if legacySkills(x.c.Request.Header) {
			remote = v.LegacyEpoch
			public = v.LegacyEpoch
		}
	}
	var failure *resourceFailure
	if requestErr == nil && resp != nil {
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			failure = x.skillFailure(resp, intent.Parent, intent.Version)
			if failure.Status == 404 && failure.Kind == "not_found_error" {
				completion.Outcome = "deleted"
			} else if failure.Status < 500 && (failure.Kind == "invalid_request_error" || failure.Kind == "authentication_error" || failure.Kind == "permission_error") {
				completion.Outcome = "rejected"
				completion.EvidenceCode = failure.Kind
			}
		} else {
			body, e := readResourceJSON(resp)
			if e == nil && body["id"] == remote && body["type"] == kind {
				completion.Outcome = "deleted"
			}
		}
	}
	cleanup, cancel := resourceCleanupContext()
	defer cancel()
	e := x.g.d.Skills.FinishSkillDelete(cleanup, completion)
	if failure != nil {
		x.writeProviderFailure(failure)
		return
	}
	if e != nil || completion.Outcome != "deleted" {
		x.fail(core.ErrUnavailable.WithMessage("skill deletion outcome requires reconciliation"))
		return
	}
	skillApplyFacts(x, resp)
	x.c.JSON(resp.StatusCode, map[string]any{"id": public, "type": kind})
}

// Measure a completed binary transfer before publishing success. Unlike Files,
// version metadata has no ZIP byte length we could promise to the HTTP client.
func (x *resourceCall) skillDownload(resp *http.Response) {
	defer resp.Body.Close()
	select {
	case x.g.resourceSpools <- struct{}{}:
		defer func() { <-x.g.resourceSpools }()
	default:
		x.fail(core.ErrRateLimited)
		return
	}
	if resp.ContentLength > skillMultipartLimit {
		x.fail(core.ErrUnavailable)
		return
	}
	f, e := os.CreateTemp("", "ccgateway-skill-download-*")
	if e != nil {
		x.fail(e)
		return
	}
	defer func() { _ = f.Close(); _ = os.Remove(f.Name()) }()
	if e = f.Chmod(0600); e != nil {
		x.fail(e)
		return
	}
	n, e := io.Copy(f, io.LimitReader(resp.Body, skillMultipartLimit+1))
	if e != nil || n > skillMultipartLimit || resp.ContentLength >= 0 && resp.ContentLength != n {
		x.fail(core.ErrUnavailable)
		return
	}
	if _, e = f.Seek(0, 0); e != nil {
		x.fail(e)
		return
	}
	skillApplyFacts(x, resp)
	x.c.Header("Content-Type", "application/zip")
	x.c.Header("Content-Length", strconv.FormatInt(n, 10))
	x.c.Status(resp.StatusCode)
	_, _ = io.CopyN(x.c.Writer, f, n)
}
