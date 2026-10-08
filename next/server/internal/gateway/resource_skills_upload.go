package gateway

import (
	"archive/zip"
	"bufio"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"os"
	"strings"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

const skillPackageLimit int64 = 30 << 20
const skillMultipartLimit int64 = skillPackageLimit + (2 << 20)

type skillSpool struct {
	file           *os.File
	size, expanded int64
	digest         string
}

func (s *skillSpool) close() {
	if s.file != nil {
		name := s.file.Name()
		_ = s.file.Close()
		_ = os.Remove(name)
	}
}

// Preserve the exact multipart body. Validation never extracts or executes an
// uploaded script; both compressed bytes and expanded archive data are bounded.
func spoolSkillUpload(r *http.Request, version bool) (_ *skillSpool, err error) {
	s := &skillSpool{}
	defer func() {
		if err != nil {
			s.close()
		}
	}()
	media, params, e := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if e != nil || media != "multipart/form-data" || params["boundary"] == "" {
		return nil, core.ErrInvalidArgument
	}
	s.file, e = os.CreateTemp("", "ccgateway-skill-*")
	if e != nil {
		return nil, e
	}
	if e = s.file.Chmod(0600); e != nil {
		return nil, e
	}
	defer r.Body.Close()
	stop := context.AfterFunc(r.Context(), func() { _ = r.Body.Close() })
	defer stop()
	hash := sha256.New()
	s.size, e = io.Copy(io.MultiWriter(s.file, hash), io.LimitReader(r.Body, skillMultipartLimit+1))
	if e != nil {
		return nil, e
	}
	if s.size > skillMultipartLimit {
		return nil, core.NewError(413, "request_too_large", "skill multipart exceeds the bounded upload limit")
	}
	s.digest = hex.EncodeToString(hash.Sum(nil))
	if _, e = s.file.Seek(0, 0); e != nil {
		return nil, e
	}
	mr := multipart.NewReader(s.file, params["boundary"])
	files, named := 0, false
	for {
		part, e := mr.NextPart()
		if e == io.EOF {
			break
		}
		if e != nil {
			return nil, core.ErrInvalidArgument
		}
		field := part.FormName()
		if field == "display_name" || field == "display_title" {
			if named || version || (legacySkills(r.Header) != (field == "display_title")) {
				return nil, core.ErrInvalidArgument
			}
			named = true
			raw, e := io.ReadAll(io.LimitReader(part, 2049))
			if e != nil || len(raw) > 2048 || !utf8.Valid(raw) {
				return nil, core.ErrInvalidArgument
			}
			max := 255
			if legacySkills(r.Header) {
				max = 64
			}
			if utf8.RuneCount(raw) > max {
				return nil, core.ErrInvalidArgument
			}
			continue
		}
		if field != "files" && field != "files[]" {
			return nil, core.ErrInvalidArgument.WithMessage("unknown skill upload field")
		}
		files++
		if files > 10000 {
			return nil, core.ErrInvalidArgument.WithMessage("too many skill files")
		}
		_, params, e := mime.ParseMediaType(part.Header.Get("Content-Disposition"))
		name, hasName := params["filename"]
		if e != nil || !hasName || name == "" || len(name) > 8192 || !utf8.ValidString(name) || strings.ContainsAny(name, "\r\n\x00") {
			return nil, core.ErrInvalidArgument
		}
		count, e := measureSkillPart(part, name, skillPackageLimit-s.expanded)
		if e != nil {
			return nil, e
		}
		s.expanded += count
	}
	if files == 0 {
		return nil, core.ErrInvalidArgument.WithMessage("at least one skill file is required")
	}
	if _, err = s.file.Seek(0, 0); err != nil {
		return nil, err
	}
	return s, nil
}
func measureSkillPart(part *multipart.Part, name string, remaining int64) (int64, error) {
	reader := bufio.NewReader(part)
	magic, _ := reader.Peek(4)
	zipped := strings.HasSuffix(strings.ToLower(name), ".zip") || part.Header.Get("Content-Type") == "application/zip" || bytes.Equal(magic, []byte{'P', 'K', 3, 4}) || bytes.Equal(magic, []byte{'P', 'K', 5, 6})
	if !zipped {
		n, e := io.Copy(io.Discard, io.LimitReader(reader, remaining+1))
		if e != nil {
			return 0, e
		}
		if n > remaining {
			return 0, core.NewError(413, "request_too_large", "skill expanded files exceed 30 MiB")
		}
		return n, nil
	}
	f, e := os.CreateTemp("", "ccgateway-skill-zip-*")
	if e != nil {
		return 0, e
	}
	defer func() { _ = f.Close(); _ = os.Remove(f.Name()) }()
	if e = f.Chmod(0600); e != nil {
		return 0, e
	}
	n, e := io.Copy(f, io.LimitReader(reader, skillMultipartLimit+1))
	if e != nil {
		return 0, e
	}
	if n > skillMultipartLimit {
		return 0, core.ErrInvalidArgument
	}
	zr, e := zip.NewReader(f, n)
	if e != nil {
		return 0, core.ErrInvalidArgument.WithMessage("invalid skill zip archive")
	}
	if len(zr.File) > 10000 {
		return 0, core.ErrInvalidArgument
	}
	total := int64(0)
	for _, entry := range zr.File {
		if entry.FileInfo().IsDir() {
			continue
		}
		if entry.UncompressedSize64 > uint64(remaining-total) {
			return 0, core.NewError(413, "request_too_large", "skill expanded archive exceeds 30 MiB")
		}
		rc, e := entry.Open()
		if e != nil {
			return 0, core.ErrInvalidArgument
		}
		size, e := io.Copy(io.Discard, io.LimitReader(rc, remaining-total+1))
		_ = rc.Close()
		if e != nil {
			return 0, core.ErrInvalidArgument.WithMessage("invalid skill archive data")
		}
		total += size
		if total > remaining {
			return 0, core.NewError(413, "request_too_large", "skill expanded archive exceeds 30 MiB")
		}
	}
	return total, nil
}

func (x *resourceCall) skillUpload(parentID string) {
	var parent *core.ProviderResource
	if parentID != "" {
		p, e := x.ownedSkill(parentID)
		if e != nil {
			x.fail(e)
			return
		}
		parent = &p
	}
	select {
	case x.g.resourceSpools <- struct{}{}:
		defer func() { <-x.g.resourceSpools }()
	default:
		x.fail(core.ErrRateLimited)
		return
	}
	clear, e := resourceReadDeadline(x.c.Writer, x.c.Request, resourceUploadIdleTimeout)
	if e != nil {
		x.fail(e)
		return
	}
	spool, e := spoolSkillUpload(x.c.Request, parent != nil)
	clear()
	if e != nil {
		var timeout net.Error
		if errors.As(e, &timeout) && timeout.Timeout() {
			e = core.NewError(http.StatusRequestTimeout, "request_timeout", "skill upload read timed out")
		}
		x.fail(e)
		return
	}
	defer spool.close()
	ctx, done, binding, e := x.skillLease(parent)
	if e != nil {
		x.fail(e)
		return
	}
	defer done()
	intentMetadata, _ := json.Marshal(map[string]any{"sha256": spool.digest, "expanded_bytes": spool.expanded})
	intent := core.SkillUploadIntent{ResourceIntent: core.ResourceIntent{RequestID: x.rid, PluginKey: "ccgateway", Kind: "skill", Owner: x.owner, Binding: binding, Bytes: spool.expanded, Metadata: intentMetadata}, ParentID: parentID}
	reservation, e := x.g.d.Skills.ReserveSkillUpload(ctx, intent)
	if e != nil {
		x.fail(e)
		return
	}
	if !reservation.Dispatch {
		x.fail(core.ErrConflict.WithMessage("skill upload already has a recorded outcome"))
		return
	}
	var evidence *core.SkillUploadEvidence
	mark := func(outcome, code string) {
		cleanup, cancel := resourceCleanupContext()
		defer cancel()
		if err := x.g.d.Skills.MarkSkillUpload(cleanup, core.SkillUploadFailure{Owner: x.owner, ParentID: reservation.Parent.PublicID, PublicVersionID: reservation.Version.PublicVersionID, OperationID: reservation.Version.OperationID, Outcome: outcome, EvidenceCode: code, Evidence: evidence}); err != nil {
			slog.WarnContext(cleanup, "gateway: skill upload evidence could not be persisted", "request_id", x.rid, "parent_id", reservation.Parent.PublicID, "version_id", reservation.Version.PublicVersionID, "outcome", outcome)
		}
	}
	path := "/v1/skills"
	if parent != nil {
		path += "/" + parent.RemoteID + "/versions"
	}
	req, e := x.skillRequest(ctx, http.MethodPost, path, spool.file)
	if e != nil {
		mark("uncertain", "")
		x.fail(e)
		return
	}
	req.Header.Set("Content-Type", x.c.GetHeader("Content-Type"))
	req.ContentLength = spool.size
	resp, e := x.g.d.ResourceTransport.RoundTrip(binding.AccountID, binding, req)
	if e != nil || resp == nil {
		mark("uncertain", "")
		x.fail(core.ErrUnavailable.WithMessage("skill upload outcome requires reconciliation"))
		return
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		f := x.skillFailure(resp, reservation.Parent, nil)
		outcome := "uncertain"
		if f.Status < 500 && (f.Kind == "invalid_request_error" || f.Kind == "authentication_error" || f.Kind == "permission_error") {
			outcome = "rejected"
		}
		mark(outcome, f.Kind)
		x.writeProviderFailure(f)
		return
	}
	body, e := readResourceJSON(resp)
	if e != nil {
		mark("uncertain", "")
		x.fail(core.ErrUnavailable)
		return
	}

	evidence = observedSkillUploadEvidence(binding, x.rid, parent, body, legacySkills(x.c.Request.Header))
	completion, e := x.skillUploadCompletion(ctx, binding, reservation, parent, body)
	if e != nil {
		mark("uncertain", "")
		x.fail(core.ErrUnavailable.WithMessage("skill upload metadata requires reconciliation"))
		return
	}
	// Both the POST and version lookup were validated before these facts are
	// retained for a possible database completion failure.
	evidence = &core.SkillUploadEvidence{Binding: binding, RemoteSkillID: completion.RemoteSkillID, RemoteVersionID: completion.RemoteVersionID, LegacyEpoch: completion.LegacyEpoch, SourceRequestID: x.rid}
	cleanup, cancel := resourceCleanupContext()
	defer cancel()
	saved, e := x.g.d.Skills.CompleteSkillUpload(cleanup, completion)
	if e != nil {
		mark("uncertain", "")
		x.fail(core.ErrUnavailable.WithMessage("skill upload persistence requires reconciliation"))
		return
	}
	var result map[string]any
	if parent == nil {
		result, e = x.publicSkill(saved.Parent)
	} else {
		result, e = publicSkillVersion(saved.Version, legacySkills(x.c.Request.Header))
	}
	if e != nil {
		x.fail(e)
		return
	}
	skillApplyFacts(x, resp)
	x.c.JSON(resp.StatusCode, result)
}

func observedSkillUploadEvidence(binding core.ResourceBinding, rid string, parent *core.ProviderResource, body map[string]any, legacy bool) *core.SkillUploadEvidence {
	e := &core.SkillUploadEvidence{Binding: binding, SourceRequestID: rid}
	id, _ := body["id"].(string)
	if !resourceID(id) {
		return nil
	}
	if parent != nil {
		if body["type"] != "skill_version" || body["skill_id"] != parent.RemoteID {
			return nil
		}
		e.RemoteSkillID = parent.RemoteID
		e.RemoteVersionID = id
		if epoch, ok := body["version"].(string); ok && resourceID(epoch) {
			e.LegacyEpoch = epoch
		}
		return e
	}
	if body["type"] != "skill" {
		return nil
	}
	e.RemoteSkillID = id
	field := "latest_version_id"
	if legacy {
		field = "latest_version"
	}
	if value, ok := body[field].(string); ok && resourceID(value) {
		if legacy {
			e.LegacyEpoch = value
		} else {
			e.RemoteVersionID = value
		}
	}
	return e
}

func (x *resourceCall) skillUploadCompletion(ctx context.Context, binding core.ResourceBinding, reservation core.SkillUploadReservation, parent *core.ProviderResource, body map[string]any) (core.SkillUploadCompletion, error) {
	out := core.SkillUploadCompletion{Owner: x.owner, Binding: binding, ParentID: reservation.Parent.PublicID, PublicVersionID: reservation.Version.PublicVersionID, OperationID: reservation.Version.OperationID}
	expected := ""
	if parent == nil {
		var e error
		out.ParentMetadata, _, e = skillMetadata(body, "", false)
		if e != nil {
			return out, e
		}
		out.RemoteSkillID, _ = body["id"].(string)
		expected, _ = body["latest_version_id"].(string)
		if legacySkills(x.c.Request.Header) {
			expected, _ = body["latest_version"].(string)
		}
		if !resourceID(expected) {
			return out, core.ErrUnavailable
		}
		req, _ := x.skillRequest(ctx, http.MethodGet, "/v1/skills/"+out.RemoteSkillID+"/versions/"+expected, nil)
		response, e := x.g.d.ResourceTransport.RoundTrip(binding.AccountID, binding, req)
		if e != nil || response == nil {
			return out, core.ErrUnavailable
		}
		if response.StatusCode < 200 || response.StatusCode >= 300 {
			_ = response.Body.Close()
			return out, core.ErrUnavailable
		}
		body, e = readResourceJSON(response)
		if e != nil {
			return out, e
		}
	} else {
		out.RemoteSkillID = parent.RemoteID
	}
	var e error
	out.VersionMetadata, out.CreatedAt, e = skillMetadata(body, "", true)
	out.RemoteVersionID, _ = body["id"].(string)
	out.LegacyEpoch, _ = body["version"].(string)
	actual := out.RemoteVersionID
	if legacySkills(x.c.Request.Header) {
		actual = out.LegacyEpoch
	}
	if e != nil || body["skill_id"] != out.RemoteSkillID || expected != "" && actual != expected {
		return out, core.ErrUnavailable
	}
	return out, nil
}
