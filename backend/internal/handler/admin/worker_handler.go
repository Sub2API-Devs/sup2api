package admin

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type WorkerHandler struct {
	service *service.WorkerService
}

func NewWorkerHandler(workerService *service.WorkerService) *WorkerHandler {
	return &WorkerHandler{service: workerService}
}

func (h *WorkerHandler) Create(c *gin.Context) {
	var input service.CreateWorkerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		workerHandlerError(c, http.StatusBadRequest, "invalid_request", err)
		return
	}
	worker, err := h.service.Create(c.Request.Context(), input)
	if err != nil {
		workerHandlerError(c, http.StatusUnprocessableEntity, "worker_create_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusCreated, worker)
}

func (h *WorkerHandler) List(c *gin.Context) {
	workers, err := h.service.List(c.Request.Context())
	if err != nil {
		workerHandlerError(c, http.StatusInternalServerError, "worker_list_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, workers)
}

func (h *WorkerHandler) Get(c *gin.Context) {
	id, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	worker, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		workerHandlerError(c, http.StatusInternalServerError, "worker_get_failed", err)
		return
	}
	if worker == nil {
		response.ErrorWithDetails(c, http.StatusNotFound, "worker not found", "worker_not_found", nil)
		return
	}
	workerHandlerOK(c, http.StatusOK, worker)
}

func (h *WorkerHandler) GetConfig(c *gin.Context) {
	id, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	cfg, err := h.service.GetRuntimeConfig(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusBadGateway, "worker_config_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, cfg)
}

func (h *WorkerHandler) Update(c *gin.Context) {
	id, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	var input service.UpdateWorkerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		workerHandlerError(c, http.StatusBadRequest, "invalid_request", err)
		return
	}
	worker, err := h.service.Update(c.Request.Context(), id, input)
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusUnprocessableEntity, "worker_update_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, worker)
}

func (h *WorkerHandler) SetEnabled(c *gin.Context) {
	id, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	var input service.SetWorkerEnabledInput
	if err := c.ShouldBindJSON(&input); err != nil {
		workerHandlerError(c, http.StatusBadRequest, "invalid_request", err)
		return
	}
	worker, err := h.service.SetEnabled(c.Request.Context(), id, input.Enabled)
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusInternalServerError, "worker_enable_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, worker)
}

func (h *WorkerHandler) Delete(c *gin.Context) {
	id, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusInternalServerError, "worker_delete_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, gin.H{"deleted": true})
}

func (h *WorkerHandler) TestConnection(c *gin.Context) {
	id, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	identity, ready, err := h.service.TestConnection(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusBadGateway, "worker_connection_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, gin.H{"identity": identity, "ready": ready})
}

func (h *WorkerHandler) GetNATSSecurity(c *gin.Context) {
	result, err := h.service.GetNATSSecurityConfig(c.Request.Context())
	if err != nil {
		workerHandlerError(c, http.StatusInternalServerError, "worker_nats_security_read_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, result)
}

func (h *WorkerHandler) UpdateNATSSecurity(c *gin.Context) {
	var input service.UpdateWorkerNATSSecurityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		workerHandlerError(c, http.StatusBadRequest, "invalid_request", err)
		return
	}
	result, err := h.service.UpdateNATSSecurityConfig(c.Request.Context(), input)
	if err != nil {
		workerHandlerError(c, http.StatusUnprocessableEntity, "worker_nats_security_update_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, result)
}

func (h *WorkerHandler) ListAccounts(c *gin.Context) {
	workerID, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	accounts, err := h.service.ListAccounts(c.Request.Context(), workerID)
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusBadGateway, "worker_accounts_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, accounts)
}

func (h *WorkerHandler) CreateAPIKeyAccount(c *gin.Context) {
	workerID, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	var input service.WorkerAccountCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		workerHandlerError(c, http.StatusBadRequest, "invalid_request", err)
		return
	}
	account, err := h.service.CreateAPIKeyAccount(c.Request.Context(), workerID, input)
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusBadGateway, "worker_account_create_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusCreated, account)
}

func (h *WorkerHandler) StartOAuth(c *gin.Context) {
	workerID, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	var input service.WorkerAccountCreateInput
	if c.Request.ContentLength != 0 {
		if err := c.ShouldBindJSON(&input); err != nil {
			workerHandlerError(c, http.StatusBadRequest, "invalid_request", err)
			return
		}
	}
	result, err := h.service.StartOAuth(c.Request.Context(), workerID, input)
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusBadGateway, "worker_oauth_start_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, result)
}

func (h *WorkerHandler) CompleteOAuth(c *gin.Context) {
	workerID, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	var input service.WorkerOAuthCompleteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		workerHandlerError(c, http.StatusBadRequest, "invalid_request", err)
		return
	}
	account, err := h.service.CompleteOAuth(c.Request.Context(), workerID, input)
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusBadGateway, "worker_oauth_complete_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusCreated, account)
}

func (h *WorkerHandler) RefreshAccount(c *gin.Context) {
	workerID, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	result, err := h.service.RefreshAccount(c.Request.Context(), workerID, c.Param("account_id"))
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusBadGateway, "worker_account_refresh_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, result)
}

func (h *WorkerHandler) TestAccount(c *gin.Context) {
	workerID, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	var input service.WorkerAccountTestInput
	if c.Request.ContentLength != 0 {
		if err := c.ShouldBindJSON(&input); err != nil {
			workerHandlerError(c, http.StatusBadRequest, "invalid_request", err)
			return
		}
	}
	result, err := h.service.TestAccount(c.Request.Context(), workerID, c.Param("account_id"), input)
	if err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusBadGateway, "worker_account_test_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, result)
}

func (h *WorkerHandler) DeleteAccount(c *gin.Context) {
	workerID, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	if err := h.service.DeleteAccount(c.Request.Context(), workerID, c.Param("account_id")); err != nil {
		if errors.Is(err, service.ErrWorkerNotFound) {
			workerHandlerError(c, http.StatusNotFound, "worker_not_found", err)
			return
		}
		workerHandlerError(c, http.StatusBadGateway, "worker_account_delete_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, gin.H{"deleted": true})
}

func (h *WorkerHandler) ListLogs(c *gin.Context) {
	workerID, ok := workerHandlerID(c, "id")
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(c.Query("limit"))
	beforeID, _ := strconv.ParseInt(c.Query("before_id"), 10, 64)
	logs, err := h.service.ListLogs(c.Request.Context(), workerID, limit, beforeID)
	if err != nil {
		workerHandlerError(c, http.StatusInternalServerError, "worker_logs_failed", err)
		return
	}
	workerHandlerOK(c, http.StatusOK, logs)
}

func workerHandlerID(c *gin.Context, name string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil || id <= 0 {
		response.ErrorWithDetails(c, http.StatusBadRequest, "invalid worker id", "invalid_worker_id", nil)
		return 0, false
	}
	return id, true
}

func workerHandlerOK(c *gin.Context, status int, data any) {
	if status == http.StatusCreated {
		response.Created(c, data)
		return
	}
	response.Success(c, data)
}

func workerHandlerError(c *gin.Context, status int, code string, err error) {
	response.ErrorWithDetails(c, status, err.Error(), code, nil)
}
