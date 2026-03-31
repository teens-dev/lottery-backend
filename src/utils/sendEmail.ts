import nodemailer from "nodemailer";

export const sendWelcomeEmail = async (
  email: string,
  name: string
) => {

  try {

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Lottery App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to Lottery Platform 🎉",
      html: `
        <div style="font-family:Arial;padding:20px">
          <h2>Welcome ${name} 👋</h2>
          <p>Your account has been successfully created.</p>
          <p>We're excited to have you onboard.</p>
          <br/>
          <p>Lottery Team</p>
        </div>
      `,
    });

  } catch (error) {
    console.error("EMAIL ERROR:", error);
  }

};