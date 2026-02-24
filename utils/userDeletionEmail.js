
import nodemailer from "nodemailer";

const sendDeletionEmail = async (to, name, reason) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to,
    subject: "Your Account Has Been Deleted",
    html: `
      <p>Hello ${name || "User"},</p>
      <p>Your account has been permanently deleted by the administrator.</p>
      <p><b>Reason:</b> ${reason}</p>
      <p>This action is irreversible.</p>
      <p>Regards,<br/>Admin Team</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export default sendDeletionEmail;
