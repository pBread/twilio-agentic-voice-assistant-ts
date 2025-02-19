import { HOSTNAME } from "./env/server.js";

export const baseUrl = `https://${HOSTNAME}`;

export const integServerRoute = `/integration-server`;
export const integServerUrl = `${baseUrl}${integServerRoute}`;
