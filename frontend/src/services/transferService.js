import api from "./api";

export const executeTransfer = async (data) => {
  const res = await api.post("/transfers", data);
  return res.data;
};

export const getTransfer = async (groupId) => {
  const res = await api.get(`/transfers/${groupId}`);
  return res.data;
};

export const deleteTransfer = async (groupId) => {
  const res = await api.delete(`/transfers/${groupId}`);
  return res.data;
};
