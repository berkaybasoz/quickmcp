-- Banking Scenario for PostgreSQL
-- Represents customers, their accounts, and transactions with detailed logging.

-- Customer information
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer bank accounts
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- e.g., 'checking', 'savings'
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- e.g., 'active', 'frozen', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions between accounts
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_account_id UUID REFERENCES accounts(account_id),
    to_account_id UUID REFERENCES accounts(account_id),
    amount NUMERIC(15, 2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'transfer', 'deposit', 'withdrawal'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'reversed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Immutable log for every transaction status change, crucial for auditing and anomaly detection
CREATE TABLE transaction_logs (
    log_id BIGSERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(transaction_id),
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    change_reason VARCHAR(255), -- e.g., 'Insufficient funds', 'System error', 'Completed successfully'
    log_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sample Data
INSERT INTO customers (full_name, email) VALUES ('Alice Johnson', 'alice.j@example.com'), ('Bob Williams', 'bob.w@example.com');

-- Get customer IDs for linking
DO $$
DECLARE
    alice_id UUID;
    bob_id UUID;
BEGIN
    SELECT customer_id INTO alice_id FROM customers WHERE email = 'alice.j@example.com';
    SELECT customer_id INTO bob_id FROM customers WHERE email = 'bob.w@example.com';

    -- Create accounts for customers
    INSERT INTO accounts (customer_id, account_number, account_type, balance, currency) VALUES
    (alice_id, 'ALICE-CHK-001', 'checking', 1500.00, 'USD'),
    (alice_id, 'ALICE-SAV-001', 'savings', 10000.00, 'USD'),
    (bob_id, 'BOB-CHK-001', 'checking', 500.00, 'USD');
END $$;

-- Create sample transactions to demonstrate logging
DO $$
DECLARE
    alice_checking UUID;
    bob_checking UUID;
    tx1_id UUID;
    tx2_id UUID;
BEGIN
    SELECT account_id INTO alice_checking FROM accounts WHERE account_number = 'ALICE-CHK-001';
    SELECT account_id INTO bob_checking FROM accounts WHERE account_number = 'BOB-CHK-001';

    -- 1. A successful transaction
    INSERT INTO transactions (from_account_id, to_account_id, amount, transaction_type, status)
    VALUES (alice_checking, bob_checking, 100.00, 'transfer', 'pending') RETURNING transaction_id INTO tx1_id;

    INSERT INTO transaction_logs (transaction_id, old_status, new_status, change_reason)
    VALUES (tx1_id, NULL, 'pending', 'Transaction initiated');

    UPDATE transactions SET status = 'completed', updated_at = NOW() WHERE transaction_id = tx1_id;
    UPDATE accounts SET balance = balance - 100.00 WHERE account_id = alice_checking;
    UPDATE accounts SET balance = balance + 100.00 WHERE account_id = bob_checking;

    INSERT INTO transaction_logs (transaction_id, old_status, new_status, change_reason)
    VALUES (tx1_id, 'pending', 'completed', 'Funds transferred successfully');

    -- 2. A failed transaction (anomaly example)
    INSERT INTO transactions (from_account_id, to_account_id, amount, transaction_type, status)
    VALUES (bob_checking, alice_checking, 1000.00, 'transfer', 'pending') RETURNING transaction_id INTO tx2_id;

    INSERT INTO transaction_logs (transaction_id, old_status, new_status, change_reason)
    VALUES (tx2_id, NULL, 'pending', 'Transaction initiated');

    UPDATE transactions SET status = 'failed', updated_at = NOW() WHERE transaction_id = tx2_id;

    INSERT INTO transaction_logs (transaction_id, old_status, new_status, change_reason)
    VALUES (tx2_id, 'pending', 'failed', 'Insufficient funds');
END $$;