-- Create enum for order status
CREATE TYPE order_status AS ENUM ('pending', 'delivered', 'cancelled');

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    description TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    attributes JSONB DEFAULT '{}',
    category TEXT,
    tags TEXT[]
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    net_total DECIMAL(10,2) NOT NULL,
    status order_status DEFAULT 'pending',
    name TEXT NOT NULL,
    description TEXT
);

-- Create order_lines table
CREATE TABLE IF NOT EXISTS order_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    net_total DECIMAL(10,2) NOT NULL
);

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_lines_updated_at
    BEFORE UPDATE ON order_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for order_lines net_total calculation
CREATE OR REPLACE FUNCTION calculate_order_line_net_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.net_total = NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_order_line_net_total_trigger
    BEFORE INSERT OR UPDATE ON order_lines
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_line_net_total();

-- Enable realtime for catalog tables
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_lines;


