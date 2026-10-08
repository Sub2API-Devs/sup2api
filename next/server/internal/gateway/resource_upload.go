package gateway

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"net/textproto"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type resourceUpload struct {
	file                *os.File
	name, media, digest string
	size, expires       int64
	filenamePresent     bool
}

func (u *resourceUpload) close() {
	if u.file != nil {
		name := u.file.Name()
		_ = u.file.Close()
		_ = os.Remove(name)
	}
}

// Read the entire bounded file before creating an intent or sending a provider
// operation. Multipart parser never buffers the file into process memory.
func spoolResourceUpload(r *http.Request, limit int64) (_ *resourceUpload, err error) {
	u := &resourceUpload{}
	defer func() {
		if err != nil {
			u.close()
		}
	}()
	original := r.Body
	defer original.Close()
	stop := context.AfterFunc(r.Context(), func() { _ = original.Close() })
	defer stop()
	r = r.Clone(r.Context())
	r.Body = struct {
		io.Reader
		io.Closer
	}{io.LimitReader(original, limit+(1<<20)+1), original}
	mr, e := r.MultipartReader()
	if e != nil {
		return nil, core.ErrInvalidArgument.WithMessage("expected multipart file upload")
	}
	fileSeen, expirySeen := false, false
	for {
		part, e := mr.NextPart()
		if e == io.EOF {
			break
		}
		if e != nil {
			return nil, core.ErrInvalidArgument.WithMessage("invalid multipart upload").WithCause(e)
		}
		switch part.FormName() {
		case "file":
			if fileSeen {
				return nil, core.ErrInvalidArgument.WithMessage("exactly one file is required")
			}
			fileSeen = true
			_, disposition, parseErr := mime.ParseMediaType(part.Header.Get("Content-Disposition"))
			u.name, u.filenamePresent = disposition["filename"]
			invalid := parseErr != nil || !utf8.ValidString(u.name) || len(u.name) > 8192
			if resourceLegacyFiles(r.Header) {
				invalid = invalid || utf8.RuneCountInString(u.name) > 255 || u.name == "" || strings.ContainsAny(u.name, `<>:"|?*\/`)
			}
			for _, char := range u.name {
				invalid = invalid || char < 32 || char == 127
			}
			if invalid {
				return nil, core.ErrInvalidArgument.WithMessage("invalid file name")
			}
			u.media = part.Header.Get("Content-Type")
			if u.media == "" && resourceLegacyFiles(r.Header) {
				return nil, core.ErrInvalidArgument.WithMessage("legacy Files beta requires the file part Content-Type")
			}
			if u.media != "" {
				_, _, e = mime.ParseMediaType(u.media)
			}
			if e != nil || len(u.media) > 255 {
				return nil, core.ErrInvalidArgument.WithMessage("invalid file content type")
			}
			u.file, e = os.CreateTemp("", "ccgateway-upload-*")
			if e != nil {
				return nil, core.ErrUnavailable
			}
			if e = u.file.Chmod(0600); e != nil {
				return nil, e
			}
			hash := sha256.New()
			u.size, e = io.Copy(io.MultiWriter(u.file, hash), io.LimitReader(part, limit+1))
			if e != nil {
				return nil, e
			}
			if u.size > limit {
				return nil, core.NewError(413, "request_too_large", "file exceeds the 512 MiB spool limit")
			}
			u.digest = hex.EncodeToString(hash.Sum(nil))
		case "expires_in_seconds":
			if expirySeen {
				return nil, core.ErrInvalidArgument
			}
			expirySeen = true
			value, e := io.ReadAll(io.LimitReader(part, 33))
			if e != nil || len(value) > 32 {
				return nil, core.ErrInvalidArgument
			}
			u.expires, e = strconv.ParseInt(string(value), 10, 64)
			if e != nil || u.expires < 3600 || u.expires > 7776000 {
				return nil, core.ErrInvalidArgument.WithMessage("expires_in_seconds must be between 3600 and 7776000")
			}
		default:
			return nil, core.ErrInvalidArgument.WithMessage("unsupported file upload field")
		}
		_ = part.Close()
	}
	if !fileSeen {
		return nil, core.ErrInvalidArgument.WithMessage("file is required")
	}
	if u.expires > 0 && resourceLegacyFiles(r.Header) {
		return nil, core.ErrInvalidArgument.WithMessage("expires_in_seconds requires the standard Files API so provider expiry can be verified")
	}
	if err = r.Context().Err(); err != nil {
		return nil, err
	}
	if _, err = u.file.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}
	return u, nil
}

// Build multipart headers/tail in memory while streaming the already measured
// file exactly once. No goroutine/pipe can outlive a cancelled upload.
func (u *resourceUpload) body() (io.Reader, string, int64, error) {
	var header bytes.Buffer
	writer := multipart.NewWriter(&header)
	if u.expires > 0 {
		if err := writer.WriteField("expires_in_seconds", strconv.FormatInt(u.expires, 10)); err != nil {
			return nil, "", 0, err
		}
	}
	mh := textproto.MIMEHeader{}
	disposition := map[string]string{"name": "file"}
	if u.filenamePresent {
		disposition["filename"] = u.name
	}
	mh.Set("Content-Disposition", mime.FormatMediaType("form-data", disposition))
	if u.media != "" {
		mh.Set("Content-Type", u.media)
	}
	if _, err := writer.CreatePart(mh); err != nil {
		return nil, "", 0, err
	}
	prefix := append([]byte(nil), header.Bytes()...)
	header.Reset()
	if err := writer.Close(); err != nil {
		return nil, "", 0, err
	}
	suffix := append([]byte(nil), header.Bytes()...)
	return io.MultiReader(bytes.NewReader(prefix), u.file, bytes.NewReader(suffix)), writer.FormDataContentType(), int64(len(prefix)) + u.size + int64(len(suffix)), nil
}

func (x *resourceCall) upload() {
	if len(x.c.Request.URL.Query()) > 0 {
		x.fail(core.ErrInvalidArgument)
		return
	}
	select {
	case x.g.resourceSpools <- struct{}{}:
		defer func() { <-x.g.resourceSpools }()
	default:
		x.fail(core.ErrRateLimited.WithMessage("upload spool capacity is busy"))
		return
	}
	clearDeadline, err := resourceReadDeadline(x.c.Writer, x.c.Request, resourceUploadIdleTimeout)
	if err != nil {
		x.fail(core.ErrUnavailable.WithMessage("upload read deadline unavailable"))
		return
	}
	u, err := spoolResourceUpload(x.c.Request, resourceFileLimit)
	clearDeadline()
	if err != nil {
		var timeout net.Error
		if errors.As(err, &timeout) && timeout.Timeout() {
			x.fail(core.NewError(http.StatusRequestTimeout, "request_timeout", "file upload read timed out"))
			return
		}
		x.fail(err)
		return
	}
	defer u.close()
	var chosen core.AccountRef
	var binding core.ResourceBinding
	var ctx context.Context
	var release func()
	var admissionErr error
	for _, ref := range x.accounts {
		if ref.PluginKey != "ccgateway" {
			continue
		}
		candidate, e := x.g.d.ResourceTransport.Identity(x.c.Request.Context(), ref.ID)
		if e == nil && candidate.AccountID == ref.ID && candidate.PrincipalID != "" && candidate.Generation != "" {
			leaseCtx, done, leaseErr := x.lease(ref)
			if leaseErr != nil {
				admissionErr = leaseErr
				continue
			}
			chosen = ref
			binding = candidate
			ctx, release = leaseCtx, done
			break
		}
	}
	if chosen.ID == 0 {
		if admissionErr != nil {
			x.fail(admissionErr)
			return
		}
		x.fail(core.ErrNoAvailableAccount)
		return
	}
	defer release()
	metadata, _ := json.Marshal(map[string]any{"filename": u.name, "mime_type": u.media, "sha256": u.digest, "size_bytes": u.size})
	intent := core.ResourceIntent{RequestID: x.rid, PluginKey: "ccgateway", Kind: "file", Owner: x.owner, Binding: binding, Bytes: u.size, Metadata: metadata}
	reservation, err := x.g.d.Resources.Reserve(ctx, intent)
	if err != nil {
		x.fail(err)
		return
	}
	if !reservation.Dispatch {
		if reservation.Resource.State == "ready" {
			x.c.JSON(200, x.publicMetadata(reservation.Resource))
		} else {
			x.fail(core.ErrConflict.WithMessage("upload outcome requires reconciliation"))
		}
		return
	}
	r := reservation.Resource
	uncertain := func() {
		cleanup, cancel := resourceCleanupContext()
		defer cancel()
		_ = x.g.d.Resources.MarkUncertain(cleanup, x.owner, r.PublicID, r.OperationID)
	}
	body, contentType, length, err := u.body()
	if err != nil {
		uncertain()
		x.fail(core.ErrUnavailable)
		return
	}
	req, err := x.request(ctx, http.MethodPost, "/v1/files", body)
	if err != nil {
		uncertain()
		x.fail(core.ErrUnavailable)
		return
	}
	req.ContentLength = length
	req.Header.Set("Content-Type", contentType)
	resp, err := x.g.d.ResourceTransport.RoundTrip(chosen.ID, binding, req)
	if err != nil || resp == nil {
		uncertain()
		x.fail(core.ErrUnavailable.WithMessage("upload outcome requires reconciliation; no automatic retry was made"))
		return
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		failure := readResourceFailure(resp, "", "")
		x.writeProviderFailure(failure)
		kind := failure.Kind
		confirmed := resp.StatusCode == 400 && kind == "invalid_request_error" || resp.StatusCode == 401 && kind == "authentication_error" || resp.StatusCode == 403 && kind == "permission_error"
		if confirmed {
			cleanup, cancel := resourceCleanupContext()
			defer cancel()
			if x.g.d.Resources.FailCreate(cleanup, x.owner, r.PublicID, r.OperationID, kind) != nil {
				uncertain()
			}
		} else {
			uncertain()
		}
		return
	}
	answer, err := readResourceJSON(resp)
	if err != nil {
		uncertain()
		x.fail(core.ErrUnavailable)
		return
	}
	metadata, err = resourceMetadata(answer, "", u.size)
	if err == nil && u.expires > 0 && answer["expires_at"] == nil {
		err = fmt.Errorf("provider did not confirm the requested file expiry")
	}
	if err != nil {
		uncertain()
		x.fail(core.ErrUnavailable.WithMessage("provider file metadata did not match the measured upload"))
		return
	}
	cleanup, cancel := resourceCleanupContext()
	defer cancel()
	var expiresAt *time.Time
	if value, exists := answer["expires_at"]; exists {
		parsed := time.Time{}
		if value != nil {
			parsed, _ = time.Parse(time.RFC3339, value.(string))
		}
		expiresAt = &parsed
	}
	final, err := x.g.d.Resources.Finalize(cleanup, core.ResourceCompletion{Owner: x.owner, PublicID: r.PublicID, OperationID: r.OperationID, RemoteID: fmt.Sprint(answer["id"]), Binding: binding, Bytes: u.size, Metadata: metadata, ExpiresAt: expiresAt})
	if err != nil {
		uncertain()
		x.fail(core.ErrUnavailable.WithMessage("upload metadata requires reconciliation"))
		return
	}
	httpfacts.Apply(x.c.Writer.Header(), resp.Header)
	x.c.JSON(resp.StatusCode, x.publicMetadata(final))
}
