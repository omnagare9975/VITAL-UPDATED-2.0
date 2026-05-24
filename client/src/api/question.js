import { API_BASE } from "./config";

const defaultHeaders = {
  headers: { "Content-Type": "application/json; charset=UTF-8" },
};

export const getMyQuestionsAPIMethod = (currentUserId) =>
  fetch(`${API_BASE}/api/questions/myQuestions/${currentUserId}`, {
    ...defaultHeaders, method: "GET",
  });

export const createQuestionAPIMethod = (question) =>
  fetch(`${API_BASE}/api/questions/createQuestion`, {
    ...defaultHeaders,
    method: "POST",
    body: JSON.stringify(question),
  });

export const getRecommendationAPIMethod = (age, description, country = "USA") => {
  const encodedDesc = encodeURIComponent(description);
  const endpoint = country === "India"
    ? `${API_BASE}/run-india/${age}/${encodedDesc}`
    : `${API_BASE}/run-python/${age}/${encodedDesc}`;
  return fetch(endpoint, { ...defaultHeaders, method: "GET" });
};

export const updateQuestionAPIMethod = (questionId, body) =>
  fetch(`${API_BASE}/api/questions/updateQuestion/${questionId}`, {
    ...defaultHeaders,
    method: "PUT",
    body: JSON.stringify(body),
  });

export const getQuestionById = (id) =>
  fetch(`${API_BASE}/api/questions/myQuestion/${id}`, {
    ...defaultHeaders, method: "GET",
  });

export const deleteQuestionAPIMethod = (id) =>
  fetch(`${API_BASE}/api/questions/deleteQuestion/${id}`, {
    ...defaultHeaders, method: "DELETE",
  });
