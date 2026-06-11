/**
 * API configuration helper.
 * Dynamically resolves the API base URL based on environment.
 * In local development (localhost / 127.0.0.1), it uses empty string so requests go through local proxy server.
 * In production (e.g. GitHub Pages), it directly connects to the deployed Render backend URL.
 */
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
export const API_BASE = isLocal ? "" : "https://qlct-be.onrender.com";
