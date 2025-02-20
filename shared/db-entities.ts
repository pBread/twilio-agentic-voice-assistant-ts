export interface BaseDBRecord {
  id: string;
  created_at: string;
  updated_at: string;
}

/****************************************************
 Users
****************************************************/
export interface UserRecord extends BaseDBRecord {
  first_name: string;
  last_name: string;

  email?: string;
  mobile_phone?: string;

  payment_methods: PaymentMethod[];

  date_of_birth?: string;

  city?: string;
  state?: string;
  zip?: string;
}

interface PaymentMethod extends BaseDBRecord {
  user_id: string;
  last_four: string;
  type: "card";
}

/****************************************************
 Orders
****************************************************/
export interface OrderRecord extends BaseDBRecord {
  user_id: string;
  lines: OrderLineRecord[];

  net_total: number;

  status: OrderStatus;

  description: string;
}

type OrderStatus = "pending" | "delivered" | "cancelled";

export interface OrderLineRecord extends BaseDBRecord {
  order_id: string;

  product?: ProductRecord;
  product_id: string;
  product_name: string;

  quantity: number;
  unit_price: number;
  net_total: number;
}

/****************************************************
 Products
****************************************************/
export interface ProductRecord extends BaseDBRecord {
  name: string;
  description: string;

  unit_price: number;

  attributes: object;
  category: string;
  tags: string[];
}
