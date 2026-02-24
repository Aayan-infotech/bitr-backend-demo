import validator from "validator";
import xss from "xss";

function validateLoginInput(req, res, next) {
    const errors = {};
    const {
        email,
        password,fcmToken
    } = req.body;
    const safeEmail = xss(email || "").trim().toLowerCase();
    const safePassword = xss(password || "").trim();

    if (!safeEmail || !validator.isEmail(safeEmail) || safeEmail.length > 50) {
        return res.status(400).json({
            status: "error",
            message: "Invalid email format or exceeds 50 characters.",
        });
    }
    // if (
    //     !safePassword ||
    //     safePassword.length < 6 ||
    //     !/[A-Z]/.test(safePassword) ||
    //     !/[a-z]/.test(safePassword) ||
    //     !/[0-9]/.test(safePassword) ||
    //     !/[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]/.test(safePassword)
    // ) {
    //     return res.status(400).json({
    //         status: "error",
    //         message:
    //             "Password must be at least 6 characters long and include capital and small letters, numbers, and special characters.",
    //     });
    // }

    

    req.body = {
        email: safeEmail,
        password: safePassword,fcmToken
    };

    next();
}

export { validateLoginInput };