package api

import (
	"errors"
	"net/http"
	"strconv"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/pyjson"
)

// handleManagement is handle_management + management_request: uploads and
// /runtime/*. An UploadError is answered with its own status and body and
// closes the connection (it is not logged); anything else is answered by
// MANAGEMENT_ERRORS, a dropped client (timeouts included) only logged.
func (ex *exchange) handleManagement(target string, endpoint func() error) {
	ex.path = &target
	err := endpoint()
	if err == nil {
		return
	}
	var ue *contract.UploadError
	if errors.As(err, &ue) {
		ex.close = true
		if !ex.w.started {
			ex.reply(ue.Status, ue.Body())
		}
		return
	}
	ex.answerError(err, managementErrors, true)
}

// runtimeEndpoint is runtime_endpoint.
func (ex *exchange) runtimeEndpoint(kind string) error {
	ctx, method := ex.r.Context(), ex.r.Method
	switch {
	case kind == "cleanup" && method == http.MethodGet:
		if _, err := ex.readBody(MaxSmallBody); err != nil {
			return err
		}
		res, err := ex.s.cleanup.Inventory(ctx)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	case kind == "cleanup" && method == http.MethodPost:
		desired, err := ex.readJSON(MaxCleanupBody)
		if err != nil {
			return err
		}
		res, err := ex.s.cleanup.Cleanup(ctx, desired)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	case kind == "images" && method == http.MethodGet:
		if _, err := ex.readBody(MaxSmallBody); err != nil {
			return err
		}
		ex.reply(http.StatusOK, ex.s.admin.RuntimeImages(ctx))
	case kind == "images" && method == http.MethodPut:
		desired, err := ex.readJSON(MaxSmallBody)
		if err != nil {
			return err
		}
		res, err := ex.s.admin.SetRuntimeImages(ctx, desired)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	case kind == "controller" && method == http.MethodPost:
		desired, err := ex.readJSON(MaxSmallBody)
		if err != nil {
			return err
		}
		if err := ex.s.admin.UpgradeController(ctx, desired); err != nil {
			return err
		}
		ex.reply(http.StatusAccepted, pyjson.Ordered{{Key: "accepted", Value: true}})
	case kind == "egress/recreate" && method == http.MethodPost:
		desired, err := ex.readJSON(MaxSmallBody)
		if err != nil {
			return err
		}
		res, err := ex.s.admin.RecreateEgress(ctx, desired)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	default:
		ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", true)
	}
	return nil
}

// uploadEndpoint is upload_endpoint.
func (ex *exchange) uploadEndpoint(id string, load bool) error {
	ctx, method := ex.r.Context(), ex.r.Method
	if id == "" {
		if method != http.MethodPost {
			ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", true)
			return nil
		}
		body, err := ex.readJSON(MaxSmallBody)
		if err != nil {
			return err
		}
		obj, ok := body.(pyjson.Ordered)
		if !ok {
			return errs.New(errs.BadRequest, "invalid upload")
		}
		for _, k := range obj.Keys() {
			if k != "size" && k != "sha256" {
				return errs.New(errs.BadRequest, "invalid upload")
			}
		}
		size, _ := obj.Get("size")
		sha, _ := obj.Get("sha256")
		res, err := ex.s.uploads.Create(ctx, size, sha)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
		return nil
	}
	if load {
		if method != http.MethodPost {
			ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", true)
			return nil
		}
		if _, err := ex.readBody(MaxSmallBody); err != nil {
			return err
		}
		res, err := ex.s.uploads.Load(ctx, id)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
		return nil
	}
	switch method {
	case http.MethodPut:
		raw, offset := ex.rawContentLength(""), ex.r.Header.Get("X-CCG-Offset")
		n, _ := strconv.ParseInt(raw, 10, 64)
		if len(ex.r.TransferEncoding) > 0 || !decimal.MatchString(raw) || n < 1 || n > MaxChunk || !decimal.MatchString(offset) {
			return errs.New(errs.BadRequest, "invalid chunk")
		}
		off, _ := strconv.ParseInt(offset, 10, 64)
		// Exactly Content-Length bytes: the connection stays usable.
		body := ex.body()
		res, err := ex.s.uploads.Write(ctx, id, off, n, body)
		ex.endBody()
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	case http.MethodGet, http.MethodDelete:
		if _, err := ex.readBody(MaxSmallBody); err != nil {
			return err
		}
		var res pyjson.Ordered
		var err error
		if method == http.MethodGet {
			res, err = ex.s.uploads.Status(ctx, id)
		} else {
			res, err = ex.s.uploads.Delete(ctx, id)
		}
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	default:
		ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", true)
	}
	return nil
}
