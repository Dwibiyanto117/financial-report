import * as transferService from "../services/transfer.service.js";

export const executeTransfer = async (req, res, next) => {
  try {
    const result = await transferService.executeTransfer(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: "Transfer antar rekening berhasil diproses",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getTransferByGroupId = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const result = await transferService.getTransferByGroupId(req.user.id, groupId);
    return res.status(200).json({
      success: true,
      message: "Detail transfer berhasil diambil",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTransfer = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const result = await transferService.deleteTransfer(req.user.id, groupId);
    return res.status(200).json({
      success: true,
      message: "Transfer berhasil dibatalkan dan dihapus",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
