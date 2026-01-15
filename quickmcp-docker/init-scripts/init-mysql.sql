-- Financial Order Routing Scenario for MySQL
-- Represents instruments, customer orders, executions, and a detailed audit trail.

-- Financial instruments (e.g., stocks)
CREATE TABLE instruments (
    symbol VARCHAR(10) PRIMARY KEY,
    instrument_name VARCHAR(255) NOT NULL,
    asset_class VARCHAR(50) NOT NULL -- e.g., 'Stock', 'Forex', 'Crypto'
);

-- Customer orders
CREATE TABLE orders (
    order_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    instrument_symbol VARCHAR(10) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    order_type VARCHAR(20) NOT NULL, -- 'MARKET', 'LIMIT'
    side VARCHAR(4) NOT NULL, -- 'BUY', 'SELL'
    quantity DECIMAL(18, 8) NOT NULL,
    limit_price DECIMAL(18, 8),
    status VARCHAR(20) NOT NULL DEFAULT 'NEW', -- 'NEW', 'PENDING_EXECUTION', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX(instrument_symbol),
    INDEX(customer_id),
    INDEX(status)
);

-- Records of order executions
CREATE TABLE order_executions (
    execution_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    executed_quantity DECIMAL(18, 8) NOT NULL,
    execution_price DECIMAL(18, 8) NOT NULL,
    execution_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Immutable log for every order status change, crucial for auditing and anomaly detection
CREATE TABLE order_audit_log (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    change_reason VARCHAR(255),
    log_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(order_id)
);

-- Sample Data
INSERT INTO instruments (symbol, instrument_name, asset_class) VALUES
('AAPL', 'Apple Inc.', 'Stock'),
('GOOGL', 'Alphabet Inc.', 'Stock'),
('BTCUSD', 'Bitcoin / US Dollar', 'Crypto');

-- 1. A successful market order that gets filled (Hardcoded ID: 1)
INSERT INTO orders (order_id, instrument_symbol, customer_id, order_type, side, quantity)
VALUES (1, 'AAPL', 'CUST-001', 'MARKET', 'BUY', 10);
INSERT INTO order_audit_log (order_id, old_status, new_status, change_reason)
VALUES (1, NULL, 'NEW', 'Order received');
UPDATE orders SET status = 'PENDING_EXECUTION' WHERE order_id = 1;
INSERT INTO order_audit_log (order_id, old_status, new_status, change_reason)
VALUES (1, 'NEW', 'PENDING_EXECUTION', 'Order sent to exchange');
UPDATE orders SET status = 'FILLED' WHERE order_id = 1;
INSERT INTO order_executions (order_id, executed_quantity, execution_price)
VALUES (1, 10, 175.25);
INSERT INTO order_audit_log (order_id, old_status, new_status, change_reason)
VALUES (1, 'PENDING_EXECUTION', 'FILLED', 'Execution received from exchange');


-- 2. A limit order that gets partially filled (Hardcoded ID: 2)
INSERT INTO orders (order_id, instrument_symbol, customer_id, order_type, side, quantity, limit_price)
VALUES (2, 'GOOGL', 'CUST-002', 'LIMIT', 'SELL', 50, 140.00);
INSERT INTO order_audit_log (order_id, old_status, new_status, change_reason)
VALUES (2, NULL, 'NEW', 'Order received');
UPDATE orders SET status = 'PARTIALLY_FILLED' WHERE order_id = 2;
INSERT INTO order_executions (order_id, executed_quantity, execution_price)
VALUES (2, 20, 140.10);
INSERT INTO order_audit_log (order_id, old_status, new_status, change_reason)
VALUES (2, 'NEW', 'PARTIALLY_FILLED', 'Partial execution received');


-- 3. A rejected order (anomaly example) (Hardcoded ID: 3)
INSERT INTO orders (order_id, instrument_symbol, customer_id, order_type, side, quantity)
VALUES (3, 'BTCUSD', 'CUST-001', 'MARKET', 'BUY', 5);
INSERT INTO order_audit_log (order_id, old_status, new_status, change_reason)
VALUES (3, NULL, 'NEW', 'Order received');
UPDATE orders SET status = 'REJECTED' WHERE order_id = 3;
INSERT INTO order_audit_log (order_id, old_status, new_status, change_reason)
VALUES (3, 'NEW', 'REJECTED', 'Account not permissioned for crypto trading');
