import { API_BASE } from "./config";

const defaultHeaders = {
  headers: { "Content-Type": "application/json; charset=UTF-8" },
};

export const loginUserAPIMethod = (user) =>
  fetch(`${API_BASE}/api/auth/login`, {
    ...defaultHeaders,
    method: "POST",
    body: JSON.stringify(user),
  });

export const createUserAPIMethod = (user) =>
  fetch(`${API_BASE}/api/auth/register`, {
    ...defaultHeaders,
    method: "POST",
    body: JSON.stringify(user),
  });
