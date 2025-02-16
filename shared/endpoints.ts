import { HOSTNAME } from "./env/server.js";

export const baseUrl = `https://${HOSTNAME}`;

export const integrationServerRoute = `/integration-server`;
export const intergrationServerBaseUrl = `${baseUrl}${integrationServerRoute}`;
