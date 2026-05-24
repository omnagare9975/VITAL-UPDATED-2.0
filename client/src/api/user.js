import { API_BASE } from "./config";

const defaultHeaders = {
  headers: { "Content-Type": "application/json; charset=UTF-8" },
};

export const getUserAPIMethod = (id) =>
  fetch(`${API_BASE}/api/users/getUser/${id}`, {
    ...defaultHeaders, method: "GET",
  });

export const updateProfileAPIMethod = (id, data) =>
  fetch(`${API_BASE}/api/users/updateProfile/${id}`, {
    ...defaultHeaders,
    method: "PUT",
    body: JSON.stringify(data),
  });

export const changePasswordAPIMethod = (id, data) =>
  fetch(`${API_BASE}/api/users/changePassword/${id}`, {
    ...defaultHeaders,
    method: "PUT",
    body: JSON.stringify(data),
  });

export const getAdminStatsAPIMethod = () =>
  fetch(`${API_BASE}/api/users/admin/stats`, {
    ...defaultHeaders, method: "GET",
  });
