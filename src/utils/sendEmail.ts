import nodemailer from "nodemailer";

const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    const transporter = getTransporter();
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
    console.log(`[EMAIL_SUCCESS] Welcome email successfully sent to ${email}`);
  } catch (error) {
    console.error("EMAIL ERROR:", error);
  }
};

export const sendTicketPurchaseEmail = async (email: string, name: string, drawId: string, tickets: string) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Lottery App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Ticket Purchase Successful 🎉",
      html: `
        <div style="font-family:Arial;padding:20px">
          <h2>Hello ${name},</h2>
          <p>Your ticket purchase was successful!</p>
          <p><strong>Draw ID:</strong> ${drawId}</p>
          <p><strong>Your Tickets:</strong> ${tickets}</p>
          <br/>
          <p>Good luck!</p>
          <p>Lottery Team</p>
        </div>
      `,
    });
    console.log(`[EMAIL_SUCCESS] Ticket purchase email successfully sent to ${email}`);
  } catch (error) {
    console.error("EMAIL ERROR:", error);
  }
};

export const sendPaymentFailureEmail = async (email: string, name: string) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Lottery App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Payment Failed ⚠️",
      html: `
        <div style="font-family:Arial;padding:20px">
          <h2>Hello ${name},</h2>
          <p>We noticed that your recent payment or ticket purchase attempt failed.</p>
          <p>Please try again or contact support if the issue persists.</p>
          <br/>
          <p>Lottery Team</p>
        </div>
      `,
    });
    console.log(`[EMAIL_SUCCESS] Payment failure fallback email successfully sent to ${email}`);
  } catch (error) {
    console.error("EMAIL ERROR:", error);
  }
};