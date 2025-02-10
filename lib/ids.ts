const ID_LENGTH = 10;
export function makeId(prefix = "") {
  const code = randStr(ID_LENGTH + 5);

  if (!!prefix?.length) return `${prefix}-${code}`.substring(0, ID_LENGTH);
  return code.substring(0, ID_LENGTH);
}

function randStr(length: number) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}
