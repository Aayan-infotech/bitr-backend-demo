import validator from "validator";
import xss from "xss";

function validateForgetPasswordInput(req, res, next) {
    const errors = {};
    const {
        email,
        password,
        confirmPassword,
    } = req.body;
    const safeEmail = xss(email || "").trim().toLowerCase();

    if (!safeEmail || !validator.isEmail(safeEmail) || safeEmail.length > 50) {
        return res.status(400).json({
            status: "error",
            message: "Invalid email format or exceeds 50 characters.",
        });
    }
    

    req.body = {
        email: safeEmail,
    };

    next();
}

export { validateForgetPasswordInput };