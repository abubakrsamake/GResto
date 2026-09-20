-- Active l'extension pour la génération de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. UTILISATEURS, RÔLES & POS
-- ============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL, -- ex: 'SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'COOK'
    label VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    pin_code VARCHAR(255), -- Code PIN haché pour connexion rapide POS
    hashed_password VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE points_of_sale (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison N:N (Utilisateurs affectés à des points de vente spécifiques)
CREATE TABLE user_pos_access (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pos_id UUID NOT NULL REFERENCES points_of_sale(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, pos_id)
);

-- Caisses physiques rattachées à un point de vente
CREATE TABLE registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pos_id UUID NOT NULL REFERENCES points_of_sale(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- ex: 'Caisse Principale', 'Caisse Terrasse'
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. SESSIONS DE CAISSE (Rapports Z/X)
-- ============================================================================

CREATE TABLE register_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    register_id UUID NOT NULL REFERENCES registers(id) ON DELETE RESTRICT,
    opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    closed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    opening_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closing_time TIMESTAMP WITH TIME ZONE,
    opening_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Fond de caisse initial
    expected_amount NUMERIC(12, 2), -- Calculé par le système lors du Z
    actual_amount NUMERIC(12, 2),   -- Saisi par le caissier
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. CATALOGUE & PRIX PAR POS
-- ============================================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    color_code VARCHAR(7), -- Pour l'UI POS (ex: '#FF5733')
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    description TEXT,
    image_url TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- ex: 18.00 pour TVA 18%
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tarifs personnalisés selon le point de vente (Optionnel)
CREATE TABLE pos_product_prices (
    pos_id UUID NOT NULL REFERENCES points_of_sale(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (pos_id, product_id)
);

-- Groupes d'options / Modificateurs (ex: "Cuisson", "Choix Sauce", "Suppléments")
CREATE TABLE modifier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    min_selection INT DEFAULT 0,
    max_selection INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Choix de modificateurs (ex: "Saignant", "Sauce Blanche", "Extra Fromage (+500 FCFA)")
CREATE TABLE modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    price_override NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Association Produits <-> Groupes de modificateurs
CREATE TABLE product_modifier_groups (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, group_id)
);

-- ============================================================================
-- 4. TABLES & SALLE (Restauration sur place)
-- ============================================================================

CREATE TABLE dining_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pos_id UUID NOT NULL REFERENCES points_of_sale(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    capacity INT DEFAULT 4,
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED', 'RESERVED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pos_id, table_number)
);

-- ============================================================================
-- 5. COMMANDES, DÉTAILS & PAIEMENTS
-- ============================================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(30) UNIQUE NOT NULL, -- ex: "CMD-20260908-001"
    pos_id UUID NOT NULL REFERENCES points_of_sale(id) ON DELETE RESTRICT,
    register_session_id UUID NOT NULL REFERENCES register_sessions(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Serveur ou Caissier
    table_id UUID REFERENCES dining_tables(id) ON DELETE SET NULL,
    order_type VARCHAR(20) NOT NULL DEFAULT 'DINE_IN', -- 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_PREPARATION', 'READY', 'SERVED', 'CANCELLED'
    total_ht NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_ttc NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(100) NOT NULL, -- Sauvegarde du nom au moment de la vente
    unit_price NUMERIC(10, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal_ttc NUMERIC(10, 2) NOT NULL,
    notes TEXT, -- ex: "Sans sel"
    item_status VARCHAR(20) DEFAULT 'PENDING' -- Suivi ligne par ligne pour la cuisine
);

-- Modificateurs choisis pour chaque article de commande
CREATE TABLE order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE RESTRICT,
    modifier_name VARCHAR(50) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL, -- 'CASH', 'CREDIT_CARD', 'MOBILE_MONEY'
    amount NUMERIC(12, 2) NOT NULL,
    reference_code VARCHAR(100), -- ID Transaction si Carte ou Mobile Money
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED', 'REFUNDED', 'FAILED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. INDEX DE PERFORMANCE
-- ============================================================================

-- Recherche d'utilisateurs et accès
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_user_pos_access_user ON user_pos_access(user_id);

-- Sessions et Filtres POS
CREATE INDEX idx_register_sessions_register ON register_sessions(register_id);
CREATE INDEX idx_register_sessions_status ON register_sessions(status);
CREATE INDEX idx_registers_pos ON registers(pos_id);

-- Catalogue
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);

-- Commandes & Filtres de vente
CREATE INDEX idx_orders_pos ON orders(pos_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_session ON orders(register_session_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_payments_order ON payments(order_id);