export interface Context {
  user?: UserRecord;
}

interface BaseRecord {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRecord extends BaseRecord {
  first_name: string;
  last_name: string;

  email?: string; // add email validation
  mobile_phone?: string; // add phone validation that includes a + at the beginning

  payment_methods: PaymentMethod[];

  date_of_birth?: Date;

  city?: string;
  state?: string; // 2 letter abbreviation
  zip?: string;
}

interface PaymentMethod extends BaseRecord {
  user_id: string;
  last_four: string; // only 4 chars
  type: "card";
}

export interface Order extends BaseRecord {
  user_id: string;
  lines: OrderLine[];

  net_total: number;

  status: OrderStatus; // default pending

  name: string;
  description: string;
}

type OrderStatus = "pending" | "delivered" | "cancelled";

interface OrderLine extends BaseRecord {
  order_id: string;

  product?: Product;
  product_id: string; // stamp this from the product in the database
  product_name: string; // stamp this from the product in the database

  quantity: number;
  unit_price: number; // stamp this from the product in the database
  net_total: number; // compute this on all database saves
}

interface Product extends BaseRecord {
  name: string;
  description: string;

  unit_price: number; // 2 decimals

  attributes: object; // jsonb
  category: string;
  tags: string[];
}
