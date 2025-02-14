export interface Context {
  user?: UserRecord;
}

interface BaseRecord {
  id: string;
  created_at: Date;
}

export interface UserRecord extends BaseRecord {
  firstName: string;
  lastName: string;

  email?: string;
  mobilePhone?: string;

  paymentMethods: PaymentMethod[];

  city?: string;
  state?: string;
  zip?: string;
}

interface PaymentMethod extends BaseRecord {
  lastFour: string;
  type: "card";
}

export interface Order extends BaseRecord {
  userId: string;
  id: string;
  lines: OrderLine[];
}

interface OrderLine extends BaseRecord {
  id: string;
}
