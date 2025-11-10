import nodemailer from "nodemailer";

interface SendMailProps {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: SendMailProps) => {
    console.log("user",process.env.MAIL_USER)
     console.log("pass",process.env.MAIL_PASS)
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER, 
        pass: process.env.MAIL_PASS, 
      },
    });

    await transporter.sendMail({
      from: `"My App" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("✅ Email sent successfully");
  } catch (err) {
    console.error("❌ Error sending email:", err);
    throw err;
  }
};
