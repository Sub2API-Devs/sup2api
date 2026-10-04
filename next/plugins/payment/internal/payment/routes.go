package payment

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/shopspring/decimal"
)

// HTTPHandler handles HTTP routes
type HTTPHandler struct {
	orders *OrderService
	redeem *RedeemService
	promo  *PromoService
}

// NewHTTPHandler creates a new HTTPHandler
func NewHTTPHandler(orders *OrderService, redeem *RedeemService, promo *PromoService) *HTTPHandler {
	return &HTTPHandler{
		orders: orders,
		redeem: redeem,
		promo:  promo,
	}
}

// register binds the handlers to the manifest routes. The host enforces the
// route scope and permission before the call reaches the plugin (user/admin
// routes carry Caller.user_id; webhook routes are unauthenticated).
func (h *HTTPHandler) register(r *pluginsdk.Router) {
	// User routes (permission recharge:use)
	r.Handle("POST", "/orders", h.handleCreateOrder)
	r.Handle("GET", "/orders", h.handleListOrders)
	r.Handle("POST", "/redeem", h.handleRedeemCode)
	r.Handle("GET", "/redeem/history", h.handleRedeemHistory)

	// Webhook (unauthenticated; see handleWebhook)
	r.Handle("POST", "/webhook/:provider", h.handleWebhook)

	// Admin routes (permission config:manage)
	r.Handle("GET", "/config", h.handleGetConfig)
	r.Handle("PUT", "/config", h.handleUpdateConfig)
	r.Handle("GET", "/providers", h.handleListProviders)
	r.Handle("POST", "/providers", h.handleCreateProvider)
	r.Handle("GET", "/redeem-codes", h.handleListRedeemCodes)
	r.Handle("POST", "/redeem-codes", h.handleGenerateRedeemCodes)
	r.Handle("DELETE", "/redeem-codes/:id", h.handleDeleteRedeemCode)
	r.Handle("GET", "/promo-codes", h.handleListPromoCodes)
	r.Handle("POST", "/promo-codes", h.handleCreatePromoCode)
	r.Handle("PATCH", "/promo-codes/:id", h.handleUpdatePromoCode)
	r.Handle("DELETE", "/promo-codes/:id", h.handleDeletePromoCode)
}

// handleCreateOrder handles POST /orders
func (h *HTTPHandler) handleCreateOrder(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	userID := callerID(req)
	if userID == 0 {
		return jsonResponse(http.StatusUnauthorized, map[string]any{
			"error": map[string]any{"code": "unauthenticated", "message": "Authentication required"},
		})
	}

	var body struct {
		Amount      string `json:"amount"`
		PaymentType string `json:"payment_type"`
		OrderType   string `json:"order_type"`
		PlanID      *int64 `json:"plan_id"`
	}
	if err := json.Unmarshal(req.GetBody(), &body); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Invalid request body"},
		})
	}

	amount, err := decimal.NewFromString(body.Amount)
	if err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Invalid amount"},
		})
	}

	orderReq := CreateOrderRequest{
		UserID:      userID,
		Amount:      amount,
		PaymentType: body.PaymentType,
		OrderType:   body.OrderType,
		PlanID:      body.PlanID,
		ClientIP:    req.GetCaller().GetClientIp(),
	}

	resp, err := h.orders.CreateOrder(ctx, orderReq)
	if err != nil {
		slog.Error("create order failed", "error", err)
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": err.Error()},
		})
	}

	return jsonResponse(http.StatusOK, map[string]any{
		"data": map[string]any{
			"order_id":     resp.OrderID,
			"out_trade_no": resp.OutTradeNo,
			"pay_url":      resp.PayURL,
			"qr_code":      resp.QRCode,
			"expires_at":   resp.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		},
	})
}

// handleListOrders handles GET /orders
func (h *HTTPHandler) handleListOrders(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	userID := callerID(req)
	if userID == 0 {
		return jsonResponse(http.StatusUnauthorized, map[string]any{
			"error": map[string]any{"code": "unauthenticated", "message": "Authentication required"},
		})
	}

	page, pageSize := pagination(req)

	offset := (page - 1) * pageSize
	orders, total, err := h.orders.ListOrders(ctx, userID, pageSize, offset)
	if err != nil {
		slog.Error("list orders failed", "error", err)
		return jsonResponse(http.StatusInternalServerError, map[string]any{
			"error": map[string]any{"code": "internal", "message": "Internal error"},
		})
	}

	items := make([]map[string]any, len(orders))
	for i, o := range orders {
		items[i] = map[string]any{
			"id":               o.ID,
			"out_trade_no":     o.OutTradeNo,
			"payment_type":     o.PaymentType,
			"payment_trade_no": o.PaymentTradeNo,
			"amount":           o.Amount.String(),
			"pay_amount":       o.PayAmount.String(),
			"currency":         o.Currency,
			"order_type":       o.OrderType,
			"status":           o.Status,
			"expires_at":       o.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
			"paid_at":          formatTimePtr(o.PaidAt),
			"created_at":       o.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	return jsonResponse(http.StatusOK, map[string]any{
		"data": items,
		"page": map[string]any{
			"page":      page,
			"page_size": pageSize,
			"total":     total,
		},
	})
}

// handleRedeemCode handles POST /redeem
func (h *HTTPHandler) handleRedeemCode(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	userID := callerID(req)
	if userID == 0 {
		return jsonResponse(http.StatusUnauthorized, map[string]any{
			"error": map[string]any{"code": "unauthenticated", "message": "Authentication required"},
		})
	}

	var body struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(req.GetBody(), &body); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Invalid request body"},
		})
	}

	code, err := h.redeem.RedeemCode(ctx, userID, body.Code)
	if err != nil {
		slog.Warn("redeem code failed", "user_id", userID, "error", err)
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": err.Error()},
		})
	}

	return jsonResponse(http.StatusOK, map[string]any{
		"data": map[string]any{
			"type":  code.Type,
			"value": code.Value.String(),
		},
	})
}

// handleRedeemHistory handles GET /redeem/history
func (h *HTTPHandler) handleRedeemHistory(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	userID := callerID(req)
	if userID == 0 {
		return jsonResponse(http.StatusUnauthorized, map[string]any{
			"error": map[string]any{"code": "unauthenticated", "message": "Authentication required"},
		})
	}

	page, pageSize := pagination(req)
	offset := (page - 1) * pageSize

	codes, total, err := h.redeem.GetUserRedeemHistory(ctx, userID, pageSize, offset)
	if err != nil {
		slog.Error("get redeem history failed", "error", err)
		return jsonResponse(http.StatusInternalServerError, map[string]any{
			"error": map[string]any{"code": "internal", "message": "Internal error"},
		})
	}

	items := make([]map[string]any, len(codes))
	for i, c := range codes {
		items[i] = map[string]any{
			"id":      c.ID,
			"type":    c.Type,
			"value":   c.Value.String(),
			"used_at": formatTimePtr(c.UsedAt),
			"notes":   c.Notes,
		}
	}

	return jsonResponse(http.StatusOK, map[string]any{
		"data": items,
		"page": map[string]any{"page": page, "page_size": pageSize, "total": total},
	})
}

// handleWebhook handles POST /webhook/:provider
func (h *HTTPHandler) handleWebhook(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	providerKey := pluginsdk.Param(req, "provider")
	if providerKey == "" {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Provider not specified"},
		})
	}

	body := string(req.GetBody())

	if err := h.orders.HandlePaymentNotification(ctx, providerKey, body); err != nil {
		slog.Error("webhook notification failed", "provider", providerKey, "error", err)
		// Return 200 to prevent provider retry for order_not_found
		if strings.Contains(err.Error(), "order not found") {
			return &pluginv1.HTTPResponse{
				Status: http.StatusOK,
				Body:   []byte("OK"),
			}, nil
		}
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": err.Error()},
		})
	}

	return &pluginv1.HTTPResponse{
		Status: http.StatusOK,
		Body:   []byte("OK"),
	}, nil
}

// Admin handlers (stub implementations)
func (h *HTTPHandler) handleGetConfig(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	return jsonResponse(http.StatusOK, map[string]any{
		"data": map[string]any{
			"enabled":     true,
			"min_amount":  "1",
			"max_amount":  "10000",
			"daily_limit": "0",
		},
	})
}

func (h *HTTPHandler) handleUpdateConfig(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	return jsonResponse(http.StatusOK, map[string]any{"data": map[string]any{"updated": true}})
}

func (h *HTTPHandler) handleListProviders(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	return jsonResponse(http.StatusOK, map[string]any{"data": []any{}})
}

func (h *HTTPHandler) handleCreateProvider(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	return jsonResponse(http.StatusNotImplemented, map[string]any{
		"error": map[string]any{"code": "unimplemented", "message": "Not implemented yet"},
	})
}

func (h *HTTPHandler) handleListRedeemCodes(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	page, pageSize := pagination(req)
	offset := (page - 1) * pageSize

	status := ""
	status = pluginsdk.Query(req, "status")

	codes, total, err := h.redeem.ListCodes(ctx, status, pageSize, offset)
	if err != nil {
		return jsonResponse(http.StatusInternalServerError, map[string]any{
			"error": map[string]any{"code": "internal", "message": err.Error()},
		})
	}

	items := make([]map[string]any, len(codes))
	for i, c := range codes {
		items[i] = map[string]any{
			"id":            c.ID,
			"type":          c.Type,
			"value":         c.Value.String(),
			"status":        c.Status,
			"validity_days": c.ValidityDays,
			"expires_at":    formatTimePtr(c.ExpiresAt),
			"used_by":       c.UsedBy,
			"used_at":       formatTimePtr(c.UsedAt),
			"created_at":    c.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	return jsonResponse(http.StatusOK, map[string]any{
		"data": items,
		"page": map[string]any{"page": page, "page_size": pageSize, "total": total},
	})
}

func (h *HTTPHandler) handleGenerateRedeemCodes(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var body GenerateCodesRequest
	if err := json.Unmarshal(req.GetBody(), &body); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Invalid request body"},
		})
	}

	codes, err := h.redeem.GenerateCodes(ctx, body)
	if err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": err.Error()},
		})
	}

	items := make([]map[string]any, len(codes))
	for i, c := range codes {
		items[i] = map[string]any{
			"id":    c.ID,
			"code":  c.Code,
			"type":  c.Type,
			"value": c.Value.String(),
		}
	}

	return jsonResponse(http.StatusOK, map[string]any{"data": items})
}

func (h *HTTPHandler) handleDeleteRedeemCode(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	idStr := pluginsdk.Param(req, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Invalid code ID"},
		})
	}

	if err := h.redeem.DeleteCode(ctx, id); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": err.Error()},
		})
	}

	return &pluginv1.HTTPResponse{Status: http.StatusNoContent}, nil
}

func (h *HTTPHandler) handleListPromoCodes(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	page, pageSize := pagination(req)
	offset := (page - 1) * pageSize

	status := ""
	status = pluginsdk.Query(req, "status")

	codes, total, err := h.promo.ListPromoCodes(ctx, status, pageSize, offset)
	if err != nil {
		return jsonResponse(http.StatusInternalServerError, map[string]any{
			"error": map[string]any{"code": "internal", "message": err.Error()},
		})
	}

	items := make([]map[string]any, len(codes))
	for i, c := range codes {
		items[i] = map[string]any{
			"id":           c.ID,
			"code":         c.Code,
			"bonus_amount": c.BonusAmount.String(),
			"max_uses":     c.MaxUses,
			"used_count":   c.UsedCount,
			"status":       c.Status,
			"expires_at":   formatTimePtr(c.ExpiresAt),
			"created_at":   c.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	return jsonResponse(http.StatusOK, map[string]any{
		"data": items,
		"page": map[string]any{"page": page, "page_size": pageSize, "total": total},
	})
}

func (h *HTTPHandler) handleCreatePromoCode(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var body CreatePromoCodeRequest
	if err := json.Unmarshal(req.GetBody(), &body); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Invalid request body"},
		})
	}

	code, err := h.promo.CreatePromoCode(ctx, body)
	if err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": err.Error()},
		})
	}

	return jsonResponse(http.StatusOK, map[string]any{
		"data": map[string]any{
			"id":           code.ID,
			"code":         code.Code,
			"bonus_amount": code.BonusAmount.String(),
			"max_uses":     code.MaxUses,
			"status":       code.Status,
		},
	})
}

func (h *HTTPHandler) handleUpdatePromoCode(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	idStr := pluginsdk.Param(req, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Invalid promo code ID"},
		})
	}

	var body struct {
		Status  string `json:"status"`
		MaxUses int    `json:"max_uses"`
	}
	if err := json.Unmarshal(req.GetBody(), &body); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Invalid request body"},
		})
	}

	if err := h.promo.UpdatePromoCode(ctx, id, body.Status, body.MaxUses); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": err.Error()},
		})
	}

	return jsonResponse(http.StatusOK, map[string]any{"data": map[string]any{"updated": true}})
}

func (h *HTTPHandler) handleDeletePromoCode(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	idStr := pluginsdk.Param(req, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": "Invalid promo code ID"},
		})
	}

	if err := h.promo.DeletePromoCode(ctx, id); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]any{
			"error": map[string]any{"code": "invalid_argument", "message": err.Error()},
		})
	}

	return &pluginv1.HTTPResponse{Status: http.StatusNoContent}, nil
}

// Helpers

// callerID is the authenticated console user (0 on public and webhook routes).
func callerID(req *pluginv1.HTTPRequest) int64 {
	return req.GetCaller().GetUserId()
}

func jsonResponse(status int, data any) (*pluginv1.HTTPResponse, error) {
	return pluginsdk.JSONResponse(status, data), nil
}

// pagination reads page/page_size with page_size capped at 100.
func pagination(req *pluginv1.HTTPRequest) (page, pageSize int) {
	page, pageSize = pluginsdk.Pagination(req, 20)
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize
}

func formatTimePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02T15:04:05Z07:00")
}
