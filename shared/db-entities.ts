interface BaseRecord {
  id: string;
  created_at: Date;
  updated_at: Date;
}

/****************************************************
 Users
****************************************************/
export interface UserRecord extends BaseRecord {
  first_name: string;
  last_name: string;

  email?: string;
  mobile_phone?: string;

  payment_methods: PaymentMethod[];

  date_of_birth?: Date;

  city?: string;
  state?: string;
  zip?: string;
}

interface PaymentMethod extends BaseRecord {
  user_id: string;
  last_four: string;
  type: "card";
}

/****************************************************
 Orders
****************************************************/
export interface Order extends BaseRecord {
  user_id: string;
  lines: OrderLine[];

  net_total: number;

  status: OrderStatus;

  name: string;
  description: string;
}

type OrderStatus = "pending" | "delivered" | "cancelled";

interface OrderLine extends BaseRecord {
  order_id: string;

  product?: Product;
  product_id: string;
  product_name: string;

  quantity: number;
  unit_price: number;
  net_total: number;
}

/****************************************************
 Products
****************************************************/
interface Product extends BaseRecord {
  name: string;
  description: string;

  unit_price: number;

  attributes: object;
  category: string;
  tags: string[];
}
