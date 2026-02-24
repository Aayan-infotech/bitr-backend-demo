import validator from "validator";
import xss from "xss";
function validateOTPInput(req, res, next) {
    const errors = {};
    const { otp, email } = req.body;

    const safeOtp = xss(otp || "").trim();
    const safeEmail = xss(email || "").trim().toLowerCase();

    if (!safeEmail || !validator.isEmail(safeEmail) || safeEmail.length > 50) {
        return res.status(400).json({
            status: "error",
            message: "Invalid email format or exceeds 50 characters.",
        });
    }
    if (!safeOtp || !/^\d{4}$/.test(safeOtp)) {
        return res.status(400).json({
            status: "error",
            message: "OTP must be a 4-digit number.",
        });
    }
    req.body.otp = safeOtp;
    req.body.email = safeEmail;
    next();
}

export {validateOTPInput};
