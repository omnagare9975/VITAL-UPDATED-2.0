// Central API base URL — reads from environment in production, defaults to localhost in dev
export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";
export const PDF_PROXY_BASE = process.env.REACT_APP_PDF_PROXY_URL || "http://localhost:3003";
