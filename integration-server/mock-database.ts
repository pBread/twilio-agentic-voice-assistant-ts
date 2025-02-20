import { v4 as uuidV4 } from "uuid";
import type { BaseDBRecord, UserRecord } from "../shared/db-entities.js";

const { DEVELOPERS_PHONE_NUMBER, DEVELOPERS_FIRST_NAME, DEVELOPERS_LAST_NAME } =
  process.env;

const demoUser: UserRecord = {
  ...makeBaseRecord(1000, 60),

  email: "jcarter@gmail.com",
  first_name: DEVELOPERS_FIRST_NAME ?? "Jake",
  last_name: DEVELOPERS_LAST_NAME ?? "Carter",
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

/****************************************************
 Utilities
****************************************************/
function makeBaseRecord(createdAgo = 60, updatedAgo = 60): BaseDBRecord {
  return {
    id: uuidV4(),
    created_at: getPastDateISO(createdAgo),
    updated_at: getPastDateISO(updatedAgo),
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
