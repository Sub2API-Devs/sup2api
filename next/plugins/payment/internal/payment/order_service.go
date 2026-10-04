package payment

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

// OrderService handles payment order operations
type OrderService struct {
	db     dbFunc
	credit creditFunc
}

// NewOrderService creates a new OrderService
func NewOrderService(db dbFunc, credit creditFunc) *OrderService {
	return &OrderService{db: db, credit: credit}
}

// CreateOrderRequest represents order creation request
type CreateOrderRequest struct {
	UserID      int64
	Amount      decimal.Decimal
	PaymentType string
	OrderType   string
	PlanID      *int64
	ClientIP    string
	SrcHost     string
	SrcURL      string
}

// CreateOrderResponse represents order creation response
type CreateOrderResponse struct {
	OrderID    int64
	OutTradeNo string
	PayURL     string
	QRCode     string
	ExpiresAt  time.Time
}

// CreateOrder creates a new payment order
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*CreateOrderResponse, error) {
	db, err := s.db(ctx)
	if err != nil {
		return nil, err
	}
	// Load payment config
	cfg, err := s.loadConfig(ctx, db)
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	if !cfg.Enabled {
		return nil, fmt.Errorf("payment system is disabled")
	}

	// Validate amount
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("invalid amount")
	}
	if cfg.MinAmount.GreaterThan(decimal.Zero) && req.Amount.LessThan(cfg.MinAmount) {
		return nil, fmt.Errorf("amount below minimum: %s", cfg.MinAmount.String())
	}
	if cfg.MaxAmount.GreaterThan(decimal.Zero) && req.Amount.GreaterThan(cfg.MaxAmount) {
		return nil, fmt.Errorf("amount exceeds maximum: %s", cfg.MaxAmount.String())
	}

	// Check pending orders limit
	if err := s.checkPendingLimit(ctx, db, req.UserID, cfg.MaxPendingOrders); err != nil {
		return nil, err
	}

	// Calculate pay amount (with fee)
	feeRate := cfg.RechargeFeeRate
	payAmount := req.Amount
	if feeRate.GreaterThan(decimal.Zero) {
		fee := req.Amount.Mul(feeRate).Div(decimal.NewFromInt(100)).Round(2)
		payAmount = req.Amount.Add(fee)
	}

	// Generate unique out_trade_no
	outTradeNo := OrderIDPrefix + uuid.New().String()

	// Calculate expiry
	timeout := time.Duration(cfg.OrderTimeoutMinutes) * time.Minute
	if timeout <= 0 {
		timeout = 30 * time.Minute
	}
	expiresAt := time.Now().Add(timeout)

	// TODO: Get user email from host (需要核心提供用户查询接口)
	userEmail := fmt.Sprintf("user_%d@example.com", req.UserID)

	// Create order in database
	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var orderID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO payment_orders (
			user_id, user_email, out_trade_no, payment_type, amount, pay_amount,
			fee_rate, currency, order_type, status, expires_at, client_ip, src_host, src_url, plan_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id
	`, req.UserID, userEmail, outTradeNo, req.PaymentType, req.Amount, payAmount,
		feeRate, CurrencyDefaultCNY, req.OrderType, StatusPending, expiresAt,
		req.ClientIP, req.SrcHost, req.SrcURL, req.PlanID).Scan(&orderID)
	if err != nil {
		return nil, fmt.Errorf("insert order: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	// TODO: Select provider instance and create payment
	// For MVP, return mock payment URL
	payURL := fmt.Sprintf("https://pay.example.com/checkout?order=%s", outTradeNo)

	slog.Info("payment order created",
		"order_id", orderID,
		"user_id", req.UserID,
		"amount", req.Amount.String(),
		"pay_amount", payAmount.String())

	return &CreateOrderResponse{
		OrderID:    orderID,
		OutTradeNo: outTradeNo,
		PayURL:     payURL,
		ExpiresAt:  expiresAt,
	}, nil
}

// HandlePaymentNotification processes payment provider webhook notifications
func (s *OrderService) HandlePaymentNotification(ctx context.Context, providerKey, rawBody string) error {
	slog.Info("payment notification received", "provider", providerKey)
	db, err := s.db(ctx)
	if err != nil {
		return err
	}

	// TODO: Verify signature based on provider
	// For MVP, assume notification is valid

	// Mock: extract order info from notification
	// In real implementation, parse provider-specific format
	notification := &PaymentNotification{
		OutTradeNo: "mock_out_trade_no",
		TradeNo:    "mock_trade_no",
		Amount:     decimal.NewFromInt(100),
		Status:     NotificationStatusSuccess,
	}

	// Find order
	var order Order
	err = db.QueryRow(ctx, `
		SELECT id, user_id, amount, pay_amount, status, currency
		FROM payment_orders
		WHERE out_trade_no = $1
	`, notification.OutTradeNo).Scan(
		&order.ID, &order.UserID, &order.Amount, &order.PayAmount, &order.Status, &order.Currency,
	)
	if err == pgx.ErrNoRows {
		return fmt.Errorf("order not found: %s", notification.OutTradeNo)
	}
	if err != nil {
		return fmt.Errorf("query order: %w", err)
	}

	// Check if already processed
	if order.Status == StatusCompleted || order.Status == StatusRefunded {
		slog.Info("order already processed", "order_id", order.ID, "status", order.Status)
		return nil
	}

	// Verify amount
	tolerance := decimal.NewFromFloat(AmountToleranceCNY)
	diff := notification.Amount.Sub(order.PayAmount).Abs()
	if diff.GreaterThan(tolerance) {
		return fmt.Errorf("amount mismatch: expected %s, got %s", order.PayAmount.String(), notification.Amount.String())
	}

	// Update order to paid
	now := time.Now()
	_, err = db.Exec(ctx, `
		UPDATE payment_orders
		SET status = $1, payment_trade_no = $2, paid_at = $3, updated_at = $4
		WHERE id = $5 AND status IN ($6, $7)
	`, StatusPaid, notification.TradeNo, now, now, order.ID, StatusPending, StatusExpired)
	if err != nil {
		return fmt.Errorf("update order to paid: %w", err)
	}

	// Execute fulfillment (credit balance)
	if err := s.executeFulfillment(ctx, order.ID, order.UserID, order.Amount); err != nil {
		return fmt.Errorf("execute fulfillment: %w", err)
	}

	return nil
}

// executeFulfillment credits user balance via host ledger API
func (s *OrderService) executeFulfillment(ctx context.Context, orderID, userID int64, amount decimal.Decimal) error {
	db, err := s.db(ctx)
	if err != nil {
		return err
	}
	// Update order status to recharging
	_, err = db.Exec(ctx, `
		UPDATE payment_orders
		SET status = $1, updated_at = $2
		WHERE id = $3 AND status = $4
	`, StatusRecharging, time.Now(), orderID, StatusPaid)
	if err != nil {
		return fmt.Errorf("update to recharging: %w", err)
	}

	// Credit balance via host ledger. The host prefixes the key with
	// "plugin:payment:" and applies it at most once.
	resp, err := s.credit(ctx, pluginsdk.LedgerChange{
		UserID:         userID,
		Amount:         amount.String(),
		RefType:        "payment_order",
		RefID:          strconv.FormatInt(orderID, 10),
		IdempotencyKey: fmt.Sprintf("payment_order_%d", orderID),
		Note:           fmt.Sprintf("充值 ¥%s", amount.String()),
	})
	if err != nil {
		// Mark order as failed
		_, _ = db.Exec(ctx, `
			UPDATE payment_orders
			SET status = $1, failed_at = $2, failed_reason = $3, updated_at = $4
			WHERE id = $5
		`, StatusFailed, time.Now(), err.Error(), time.Now(), orderID)
		return fmt.Errorf("credit ledger: %w", err)
	}

	// Mark order as completed
	_, err = db.Exec(ctx, `
		UPDATE payment_orders
		SET status = $1, updated_at = $2
		WHERE id = $3
	`, StatusCompleted, time.Now(), orderID)
	if err != nil {
		return fmt.Errorf("update to completed: %w", err)
	}

	slog.Info("payment fulfilled",
		"order_id", orderID,
		"user_id", userID,
		"amount", amount.String(),
		"ledger_id", resp.LedgerID,
		"duplicate", resp.Duplicate)

	return nil
}

// checkPendingLimit checks if user has too many pending orders
func (s *OrderService) checkPendingLimit(ctx context.Context, db *pgxpool.Pool, userID int64, maxPending int) error {
	if maxPending <= 0 {
		return nil
	}

	var count int
	err := db.QueryRow(ctx, `
		SELECT COUNT(*) FROM payment_orders
		WHERE user_id = $1 AND status = $2
	`, userID, StatusPending).Scan(&count)
	if err != nil {
		return fmt.Errorf("check pending orders: %w", err)
	}

	if count >= maxPending {
		return fmt.Errorf("too many pending orders: %d (max %d)", count, maxPending)
	}

	return nil
}

// loadConfig loads payment configuration
func (s *OrderService) loadConfig(ctx context.Context, db *pgxpool.Pool) (*PaymentConfig, error) {
	var cfg PaymentConfig
	err := db.QueryRow(ctx, `
		SELECT enabled, min_amount, max_amount, daily_limit, order_timeout_minutes,
			max_pending_orders, enabled_payment_types, balance_disabled,
			balance_recharge_multiplier, recharge_fee_rate, load_balance_strategy
		FROM payment_config WHERE id = 1
	`).Scan(
		&cfg.Enabled, &cfg.MinAmount, &cfg.MaxAmount, &cfg.DailyLimit,
		&cfg.OrderTimeoutMinutes, &cfg.MaxPendingOrders, &cfg.EnabledPaymentTypes,
		&cfg.BalanceDisabled, &cfg.BalanceRechargeMultiplier, &cfg.RechargeFeeRate,
		&cfg.LoadBalanceStrategy,
	)
	if err != nil {
		return nil, fmt.Errorf("load payment config: %w", err)
	}
	return &cfg, nil
}

// PaymentNotification represents parsed payment notification
type PaymentNotification struct {
	OutTradeNo string
	TradeNo    string
	Amount     decimal.Decimal
	Status     string
	RawData    string
}

// ListOrders lists user's payment orders
func (s *OrderService) ListOrders(ctx context.Context, userID int64, limit, offset int) ([]Order, int, error) {
	db, err := s.db(ctx)
	if err != nil {
		return nil, 0, err
	}
	// Count total
	var total int
	err = db.QueryRow(ctx, `
		SELECT COUNT(*) FROM payment_orders WHERE user_id = $1
	`, userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count orders: %w", err)
	}

	// Query orders (payment_trade_no is NULL until the order is paid)
	rows, err := db.Query(ctx, `
		SELECT id, user_id, out_trade_no, payment_type, COALESCE(payment_trade_no, ''),
			amount, pay_amount, currency, order_type, status,
			expires_at, paid_at, created_at
		FROM payment_orders
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query orders: %w", err)
	}
	defer rows.Close()

	var orders []Order
	for rows.Next() {
		var o Order
		err := rows.Scan(
			&o.ID, &o.UserID, &o.OutTradeNo, &o.PaymentType, &o.PaymentTradeNo,
			&o.Amount, &o.PayAmount, &o.Currency, &o.OrderType, &o.Status,
			&o.ExpiresAt, &o.PaidAt, &o.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan order: %w", err)
		}
		orders = append(orders, o)
	}

	return orders, total, nil
}
