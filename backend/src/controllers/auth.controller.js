import * as authService from "../services/auth.service.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password wajib diisi"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter"
      });
    }

    const result = await authService.register({ name, email, password });
    return res.status(201).json({
      success: true,
      message: "Registrasi akun berhasil",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi"
      });
    }

    const result = await authService.login({ email, password });
    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi"
      });
    }

    const result = await authService.forgotPassword({ email });
    return res.status(200).json({
      success: true,
      message: "Kode pemulihan akun berhasil digenerate",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, recoveryToken, newPassword } = req.body;
    if (!email || !recoveryToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, kode pemulihan, dan password baru wajib diisi"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter"
      });
    }

    const result = await authService.resetPassword({ email, recoveryToken, newPassword });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};