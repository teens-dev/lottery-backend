import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // ✅ ensure env is loaded

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // TLS (587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ VERIFY SMTP CONNECTION ON START
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP CONNECTION ERROR:");
    console.error(error);
  } else {
    console.log("✅ SMTP SERVER IS READY TO SEND EMAILS");
  }
});

// ✅ SEND EMAIL FUNCTION
export const sendEmail = async (
  to: string[],
  subject: string,
  html: string
) => {
  try {
    console.log("📧 Sending email to:", to);

    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.messageId);

    return info;

  } catch (error) {
    console.error("❌ Email sending failed:");
    console.error(error);
    throw error;
  }
};