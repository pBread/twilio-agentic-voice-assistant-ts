import { v4 as uuidV4 } from "uuid";
import type {
  OrderRecord,
  ProductRecord,
  UserRecord,
} from "../shared/db-entities.js";

const {
  DEVELOPERS_EMAIL,
  DEVELOPERS_FIRST_NAME,
  DEVELOPERS_LAST_NAME,
  DEVELOPERS_PHONE_NUMBER,
} = process.env;

const demoUser: UserRecord = {
  ...makeBaseRecord(1000, 60),
  id: "us-0001",

  first_name: DEVELOPERS_FIRST_NAME ?? "Jake",
  last_name: DEVELOPERS_LAST_NAME ?? "Carter",
  email: DEVELOPERS_EMAIL ?? "jcarter@gmail.com",
  mobile_phone: DEVELOPERS_PHONE_NUMBER ?? "+12345550001",

  city: "Chicago",
  state: "IL",
  zip: "60605",

  date_of_birth: getPastDateISO(40 * 365),

  payment_methods: [],
};

demoUser.payment_methods.push({
  ...makeBaseRecord(),
  id: uuidV4(),
  last_four: "0124",
  type: "card",
  user_id: demoUser.id,
});

const users: UserRecord[] = [demoUser];

const products = [
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "Organic Whole Milk",
    description: "Rich and creamy organic whole milk from grass-fed cows.",
    unit_price: 4.99,
    attributes: {},
    category: "Dairy",
    tags: ["milk", "dairy", "organic"],
  },
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "2% Reduced-Fat Milk",
    description: "Low-fat alternative with a smooth, creamy taste.",
    unit_price: 3.99,
    attributes: {},
    category: "Dairy",
    tags: ["milk", "dairy", "low-fat"],
  },
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "Cage-Free Eggs (12 count)",
    description: "Farm-fresh eggs laid by hens with freedom to roam.",
    unit_price: 5.49,
    attributes: {},
    category: "Dairy",
    tags: ["eggs", "dairy", "cage-free"],
  },
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "Whole Wheat Bread",
    description: "Hearty and healthy loaf made from 100% whole wheat flour.",
    unit_price: 2.79,
    attributes: {},
    category: "Bakery",
    tags: ["bread", "wheat", "bakery"],
  },
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "Banana Bunch (6 ct)",
    description: "Ripe and sweet bananas, perfect for snacks or smoothies.",
    unit_price: 1.29,
    attributes: {},
    category: "Produce",
    tags: ["banana", "fruit", "produce"],
  },
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "Orange Juice (1/2 gallon)",
    description: "Refreshing orange juice with no added sugar.",
    unit_price: 3.49,
    attributes: {},
    category: "Beverages",
    tags: ["juice", "orange", "beverage"],
  },
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "Baby Spinach (10 oz)",
    description: "Tender baby spinach leaves, triple-washed and ready to eat.",
    unit_price: 2.99,
    attributes: {},
    category: "Produce",
    tags: ["spinach", "greens", "produce"],
  },
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "Fresh Salmon Fillet (1 lb)",
    description:
      "Rich and flaky salmon fillet sourced from sustainable fisheries.",
    unit_price: 12.99,
    attributes: {},
    category: "Meat & Seafood",
    tags: ["salmon", "seafood", "fresh"],
  },
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "Premium Japanese Wagyu Steak (1 lb)",
    description:
      "Highly marbled, exceptionally tender, and very expensive cut.",
    unit_price: 99.99,
    attributes: {},
    category: "Meat & Seafood",
    tags: ["steak", "wagyu", "luxury"],
  },
  {
    ...makeBaseRecord(),
    id: makeId("pr"),
    name: "Dark Chocolate Bar (70% Cocoa)",
    description:
      "Smooth and rich dark chocolate made with premium cocoa beans.",
    unit_price: 2.49,
    attributes: {},
    category: "Snacks & Candy",
    tags: ["chocolate", "dark", "snack"],
  },
];

const productMap: Record<string, ProductRecord> = Object.fromEntries(
  products.map((product) => [product.name, product]),
);

const orderCheap: OrderRecord = {
  // Order from one week ago
  ...makeBaseRecord(7, 6),
  id: "or-11-11-11",
  user_id: demoUser.id,
  get net_total() {
    return this.lines.reduce((acc, line) => line.net_total + acc, 0);
  },

  description: "Grocery order from Jewel Osco",

  status: "delivered",
  lines: [
    {
      ...makeBaseRecord(7, 6),
      id: makeId("ol"),
      order_id: "or-11-11-11",
      product_id: productMap["Banana Bunch (6 ct)"].id,
      product_name: productMap["Banana Bunch (6 ct)"].name,
      quantity: 1,
      unit_price: productMap["Banana Bunch (6 ct)"].unit_price,
      get net_total() {
        return this.quantity * this.unit_price;
      },
    },
    {
      ...makeBaseRecord(7, 6),
      id: makeId("ol"),
      order_id: "or-11-11-11",
      product_id: productMap["Whole Wheat Bread"].id,
      product_name: productMap["Whole Wheat Bread"].name,
      quantity: 2,
      unit_price: productMap["Whole Wheat Bread"].unit_price,
      get net_total() {
        return this.quantity * this.unit_price;
      },
    },
  ],
};

const orderExpensive: OrderRecord = {
  // Order from one week ago
  ...makeBaseRecord(2, 1),
  id: "or-22-22-22",
  user_id: demoUser.id,
  get net_total() {
    return this.lines.reduce((acc, line) => line.net_total + acc, 0);
  },
  description: "Grocery order from Jewel Osco",
  status: "delivered",
  lines: [
    {
      ...makeBaseRecord(7, 6),
      id: makeId("ol"),
      order_id: "or-22-22-22",
      product_id: productMap["Premium Japanese Wagyu Steak (1 lb)"].id,
      product_name: productMap["Premium Japanese Wagyu Steak (1 lb)"].name,
      quantity: 1,
      unit_price: productMap["Premium Japanese Wagyu Steak (1 lb)"].unit_price,
      get net_total() {
        return this.quantity * this.unit_price;
      },
    },
    {
      ...makeBaseRecord(7, 6),
      id: makeId("ol"),
      order_id: "or-22-22-22",
      product_id: productMap["Whole Wheat Bread"].id,
      product_name: productMap["Whole Wheat Bread"].name,
      quantity: 2,
      unit_price: productMap["Whole Wheat Bread"].unit_price,
      get net_total() {
        return this.quantity * this.unit_price;
      },
    },
  ],
};

const orders: OrderRecord[] = [orderCheap, orderExpensive];

export const db = { orders, products, users };

/****************************************************
 Utilities
****************************************************/
function makeBaseRecord(createdAgo?: number, updatedAgo?: number) {
  const updated = updatedAgo ?? Math.floor(Math.random() * 100);
  const created = createdAgo ?? Math.floor(updated + Math.random() * 500);

  return {
    created_at: getPastDateISO(created),
    updated_at: getPastDateISO(updated),
  };
}

export function getPastDateISO(n: number, time?: string): string {
  const date = new Date();
  date.setDate(date.getDate() - n);

  if (time) {
    const [hours, minutes, seconds] = time.split(":").map(Number);

    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      isNaN(seconds) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      throw new Error("Invalid time format. Use 'HH:mm:ss' (24-hour format).");
    }

    date.setHours(hours, minutes, seconds, 0);
  }

  return date.toISOString();
}

function makeId(prefix: string): string {
  const getTwoDigitNumber = (): string => {
    const num = Math.floor(Math.random() * 100); // 0 to 99
    return num.toString().padStart(2, "0");
  };

  return `${prefix}-${getTwoDigitNumber()}-${getTwoDigitNumber()}-${getTwoDigitNumber()}`;
}
