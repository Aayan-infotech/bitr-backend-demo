import validator from "validator";
import xss from "xss";

function validateAdminSignupInput(req, res, next) {
    const errors = {};
    const { role } = req.params;
    const {
        name = "",
        number = "",
        email = "",
        password = "",
        confirmPassword = "",
        dateofbirth = "",
        expertise = "",
        prisonerid = "",
        location = "",
    } = req.body;

    const safeRole = xss(role || "").trim();
    const safeName = xss(name || "").trim();
    const safeNumber = xss(number || "").trim();
    const safeEmail = xss(email || "").trim().toLowerCase();
    const safePassword = xss(password || "");
    const safeConfirmPassword = xss(confirmPassword || "");
    const safeDOB = xss(dateofbirth || "").trim();
    const safeLocation = xss(location || "").trim();
    const safeExpertise = xss(expertise || "").trim();
    const safePrisonerId = xss(prisonerid || "").trim();


    if (!safeRole || !["user", "instructor", "mentor", "prisoner"].includes(safeRole)) {
        return res.status(400).json({
            status: "error",
            message: "Unknown Role value detected.",
        });
    }


    if (["user", "mentor", "instructor", "prisoner"].includes(safeRole)) {
  if (
    !safeName ||
    safeName.length > 50 ||
    !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(safeName.trim())
  ) {
    return res.status(400).json({
      status: "error",
      message: "Name must contain only alphabets and spaces, up to 50 characters.",
    });
  }
}


    if (["mentor"].includes(safeRole)) {
        if (
            !safeExpertise ||
            safeExpertise.length > 50
        ) {
            return res.status(400).json({
                status: "error",
                message: "Expertise must contain only alphabets and max 50 characters.",
            });
        }
    }
    if (["prisoner"].includes(safeRole)) {
        if (
            !safePrisonerId ||
            safePrisonerId.length > 50
        ) {
            return res.status(400).json({
                status: "error",
                message: "Prisoner ID must contain only alphabets and max 50 characters.",
            });
        }
    }

    if (["user"].includes(safeRole)) {
        if (!safeNumber || !/^\d{1,25}$/.test(safeNumber)) {
            return res.status(400).json({
                status: "error",
                message: "Number must contain only digits and be up to 25 characters.",
            });
        }
    }
    if (["user", "mentor", "instructor"].includes(safeRole)) {
        if (!safeEmail || !validator.isEmail(safeEmail) || safeEmail.length > 50) {
            return res.status(400).json({
                status: "error",
                message: "Invalid email format or exceeds 50 characters.",
            });
        }
    }

    if (["user", "mentor", "instructor"].includes(safeRole)) {
        if (
            !safePassword ||
            safePassword.length < 6 
        ) {
            return res.status(400).json({
                status: "error",
                message:
                    "Password must be at least 6 characters long ",
            });
        }
    }
    if (["user", "mentor", "instructor"].includes(safeRole)) {
        if (safePassword !== safeConfirmPassword) {
            return res.status(400).json({
                status: "error",
                message:
                    "Passwords do not match",
            });
        }
    }

    if (["user", "mentor", "instructor", "prisoner"].includes(safeRole)) {

        if (!safeLocation || safeLocation.length > 50) {
            return res.status(400).json({
                status: "error",
                message: "Location must not exceed 50 characters.",
            });
        }
    }
    const ins_ip = req.ip || req.connection.remoteAddress;
    const sanitizedBody = {};
    if (safeName) sanitizedBody.name = safeName;
    if (safeNumber) sanitizedBody.number = safeNumber;
    if (safeEmail) sanitizedBody.email = safeEmail;
    if (safePassword) sanitizedBody.password = safePassword;
    if (safeDOB) sanitizedBody.dateofbirth = safeDOB;
    if (safeLocation) sanitizedBody.location = safeLocation;
    if (safeExpertise) sanitizedBody.expertise = safeExpertise;
    if (safePrisonerId) sanitizedBody.prisonerid = safePrisonerId;
    sanitizedBody.ip = ins_ip;

    req.body = sanitizedBody;
    req.params.role = safeRole; 

    next(); 
}

export { validateAdminSignupInput };
