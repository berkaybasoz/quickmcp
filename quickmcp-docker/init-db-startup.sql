USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'OrderTransmissionDB')
BEGIN
    CREATE DATABASE OrderTransmissionDB;
END
GO

USE OrderTransmissionDB;
GO

SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Customers')
BEGIN
    -- Create Customers table
    CREATE TABLE Customers (
        CustomerID INT PRIMARY KEY IDENTITY(1,1),
        CompanyName NVARCHAR(100) NOT NULL,
        ContactName NVARCHAR(50),
        Email NVARCHAR(100),
        Phone NVARCHAR(20),
        Address NVARCHAR(200),
        City NVARCHAR(50),
        Country NVARCHAR(50),
        CreatedDate DATETIME2 DEFAULT GETDATE()
    );

    -- Create Products table
    CREATE TABLE Products (
        ProductID INT PRIMARY KEY IDENTITY(1,1),
        ProductName NVARCHAR(100) NOT NULL,
        ProductCode NVARCHAR(50) UNIQUE NOT NULL,
        Category NVARCHAR(50),
        UnitPrice DECIMAL(10,2) NOT NULL,
        StockQuantity INT DEFAULT 0,
        Description NVARCHAR(500),
        CreatedDate DATETIME2 DEFAULT GETDATE()
    );

    -- Create Order Status lookup table
    CREATE TABLE OrderStatus (
        StatusID INT PRIMARY KEY,
        StatusName NVARCHAR(50) NOT NULL,
        Description NVARCHAR(200)
    );

    -- Create Orders table
    CREATE TABLE Orders (
        OrderID INT PRIMARY KEY IDENTITY(1,1),
        OrderNumber NVARCHAR(50) UNIQUE NOT NULL,
        CustomerID INT FOREIGN KEY REFERENCES Customers(CustomerID),
        OrderDate DATETIME2 DEFAULT GETDATE(),
        RequiredDate DATETIME2,
        ShippedDate DATETIME2,
        StatusID INT FOREIGN KEY REFERENCES OrderStatus(StatusID),
        TotalAmount DECIMAL(12,2),
        ShippingAddress NVARCHAR(200),
        Notes NVARCHAR(500),
        CreatedBy NVARCHAR(50),
        CreatedDate DATETIME2 DEFAULT GETDATE(),
        ModifiedDate DATETIME2 DEFAULT GETDATE()
    );

    -- Create Order Details table
    CREATE TABLE OrderDetails (
        OrderDetailID INT PRIMARY KEY IDENTITY(1,1),
        OrderID INT FOREIGN KEY REFERENCES Orders(OrderID),
        ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
        Quantity INT NOT NULL,
        UnitPrice DECIMAL(10,2) NOT NULL,
        Discount DECIMAL(5,2) DEFAULT 0,
        LineTotal AS (Quantity * UnitPrice * (1 - Discount/100)) PERSISTED
    );

    -- Create Order Transmission Log table
    CREATE TABLE OrderTransmissionLog (
        TransmissionID INT PRIMARY KEY IDENTITY(1,1),
        OrderID INT FOREIGN KEY REFERENCES Orders(OrderID),
        TransmissionDate DATETIME2 DEFAULT GETDATE(),
        TransmissionType NVARCHAR(50),
        Destination NVARCHAR(200),
        Status NVARCHAR(20),
        ErrorMessage NVARCHAR(500),
        RetryCount INT DEFAULT 0,
        TransmittedBy NVARCHAR(50)
    );

    -- Insert Order Status data
    INSERT INTO OrderStatus (StatusID, StatusName, Description) VALUES
    (1, 'Pending', 'Order received and awaiting processing'),
    (2, 'Processing', 'Order is being prepared'),
    (3, 'Shipped', 'Order has been shipped'),
    (4, 'Delivered', 'Order has been delivered'),
    (5, 'Cancelled', 'Order has been cancelled');

    -- Insert sample Customers
    INSERT INTO Customers (CompanyName, ContactName, Email, Phone, Address, City, Country) VALUES
    ('Acme Corporation', 'John Smith', 'john.smith@acme.com', '+1-555-0101', '123 Business Ave', 'New York', 'USA'),
    ('Global Tech Ltd', 'Sarah Johnson', 'sarah@globaltech.com', '+1-555-0102', '456 Tech Street', 'San Francisco', 'USA'),
    ('Euro Trading GmbH', 'Hans Mueller', 'h.mueller@eurotrading.de', '+49-30-12345678', 'Hauptstraße 10', 'Berlin', 'Germany'),
    ('Pacific Imports Inc', 'Yuki Tanaka', 'y.tanaka@pacificimports.jp', '+81-3-1234-5678', '789 Harbor District', 'Tokyo', 'Japan'),
    ('Mediterranean Co', 'Maria Rodriguez', 'm.rodriguez@medco.es', '+34-91-123-4567', 'Calle Principal 25', 'Madrid', 'Spain');

    -- Insert sample Products
    INSERT INTO Products (ProductName, ProductCode, Category, UnitPrice, StockQuantity, Description) VALUES
    ('Wireless Mouse', 'WM-001', 'Electronics', 29.99, 150, 'Ergonomic wireless mouse with USB receiver'),
    ('Mechanical Keyboard', 'KB-002', 'Electronics', 89.99, 75, 'RGB backlit mechanical keyboard with blue switches'),
    ('USB-C Hub', 'HUB-003', 'Electronics', 49.99, 120, '7-in-1 USB-C hub with HDMI and Ethernet ports'),
    ('Webcam HD', 'CAM-004', 'Electronics', 79.99, 90, '1080p HD webcam with auto-focus'),
    ('Laptop Stand', 'STD-005', 'Accessories', 39.99, 200, 'Adjustable aluminum laptop stand'),
    ('Monitor 24"', 'MON-006', 'Electronics', 199.99, 45, '24-inch Full HD LED monitor'),
    ('Cable Set', 'CBL-007', 'Accessories', 19.99, 300, 'Set of 5 USB and HDMI cables'),
    ('Desk Lamp', 'LMP-008', 'Office', 59.99, 80, 'LED desk lamp with adjustable brightness'),
    ('Office Chair', 'CHR-009', 'Furniture', 299.99, 25, 'Ergonomic office chair with lumbar support'),
    ('Bluetooth Speaker', 'SPK-010', 'Electronics', 89.99, 100, 'Portable Bluetooth speaker with 12-hour battery');

    -- Insert sample Orders
    INSERT INTO Orders (OrderNumber, CustomerID, OrderDate, RequiredDate, StatusID, TotalAmount, ShippingAddress, Notes, CreatedBy) VALUES
    ('ORD-2024-001', 1, '2024-01-15 10:30:00', '2024-01-20 00:00:00', 3, 159.98, '123 Business Ave, New York, USA', 'Rush order for new office setup', 'system'),
    ('ORD-2024-002', 2, '2024-01-16 14:45:00', '2024-01-25 00:00:00', 2, 329.97, '456 Tech Street, San Francisco, USA', 'Bulk order for development team', 'admin'),
    ('ORD-2024-003', 3, '2024-01-17 09:15:00', '2024-01-30 00:00:00', 1, 219.98, 'Hauptstraße 10, Berlin, Germany', 'International shipment', 'system'),
    ('ORD-2024-004', 4, '2024-01-18 16:20:00', '2024-02-01 00:00:00', 4, 149.98, '789 Harbor District, Tokyo, Japan', 'Express delivery requested', 'manager'),
    ('ORD-2024-005', 5, '2024-01-19 11:00:00', '2024-01-28 00:00:00', 2, 389.96, 'Calle Principal 25, Madrid, Spain', 'Office upgrade project', 'system');

    -- Insert sample Order Details
    INSERT INTO OrderDetails (OrderID, ProductID, Quantity, UnitPrice, Discount) VALUES
    (1, 1, 2, 29.99, 0),
    (1, 3, 2, 49.99, 0),
    (2, 2, 1, 89.99, 10),
    (2, 4, 1, 79.99, 0),
    (2, 5, 3, 39.99, 5),
    (3, 6, 1, 199.99, 0),
    (3, 7, 1, 19.99, 0),
    (4, 1, 5, 29.99, 0),
    (5, 8, 2, 59.99, 0),
    (5, 9, 1, 299.99, 15);

    -- Insert sample Transmission Log entries
    INSERT INTO OrderTransmissionLog (OrderID, TransmissionDate, TransmissionType, Destination, Status, ErrorMessage, RetryCount, TransmittedBy) VALUES
    (1, '2024-01-15 10:35:00', 'Email', 'john.smith@acme.com', 'Success', NULL, 0, 'system'),
    (1, '2024-01-15 10:36:00', 'API', 'https://acme.com/orders/webhook', 'Success', NULL, 0, 'system'),
    (2, '2024-01-16 14:50:00', 'Email', 'sarah@globaltech.com', 'Success', NULL, 0, 'system'),
    (2, '2024-01-16 14:52:00', 'FTP', 'ftp://globaltech.com/orders/', 'Failed', 'Connection timeout', 2, 'system'),
    (3, '2024-01-17 09:20:00', 'Email', 'h.mueller@eurotrading.de', 'Success', NULL, 0, 'system'),
    (4, '2024-01-18 16:25:00', 'API', 'https://pacificimports.jp/api/orders', 'Success', NULL, 0, 'system'),
    (5, '2024-01-19 11:05:00', 'Email', 'm.rodriguez@medco.es', 'Pending', NULL, 0, 'system');

    -- Create indexes for better performance
    CREATE INDEX IX_Orders_CustomerID ON Orders(CustomerID);
    CREATE INDEX IX_Orders_OrderDate ON Orders(OrderDate);
    CREATE INDEX IX_Orders_StatusID ON Orders(StatusID);
    CREATE INDEX IX_OrderDetails_OrderID ON OrderDetails(OrderID);
    CREATE INDEX IX_OrderDetails_ProductID ON OrderDetails(ProductID);
    CREATE INDEX IX_OrderTransmissionLog_OrderID ON OrderTransmissionLog(OrderID);
    CREATE INDEX IX_OrderTransmissionLog_Status ON OrderTransmissionLog(Status);

    PRINT 'OrderTransmissionDB database and tables created successfully!';
END
GO