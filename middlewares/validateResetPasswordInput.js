import validator from "validator";
import xss from "xss";

function validateResetPasswordInput(req, res, next) {
    const errors = {};
    const {
        hash,
        password,
        confirmPassword,
    } = req.body;
    const safeHash = xss(hash || "").trim();
    const safePassword = xss(password || "").trim();
    const safeConfirmPassword = xss(confirmPassword || "").trim();

    if (!safeHash) {
        return res.status(400).json({
            status: "error",
            message: "Invalid hash format.",
        });
    }
    if (!safePassword || !/^\S{6,}$/.test(safePassword)) {
    return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters long and contain no spaces."
    });
}



    if (safePassword !== safeConfirmPassword) {
        return res.status(400).json({
            status: "error",
            message:
                "Passwords do not match",
        });
    }

    req.body = {
        hash: safeHash,
        password: safePassword,
        confirmPassword: safeConfirmPassword,
    };

    next();
}

export { validateResetPasswordInput };