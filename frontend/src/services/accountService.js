import api from "./api";

export const getAccounts = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/accounts?${query}` : "/accounts";
  const res = await api.get(url);
  return res.data;
};

export const getAccountById = async (id) => {
  const res = await api.get(`/accounts/${id}`);
  return res.data;
};

export const createAccount = async (data) => {
  const res = await api.post("/accounts", data);
  return res.data;
};

export const updateAccount = async (id, data) => {
  const res = await api.put(`/accounts/${id}`, data);
  return res.data;
};

export const deleteAccount = async (id) => {
  const res = await api.delete(`/accounts/${id}`);
  return res.data;
};
