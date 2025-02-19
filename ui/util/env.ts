export const isDev = process.env.NODE_ENV === "development";
export const isServer = typeof window === "undefined";
