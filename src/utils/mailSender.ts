import nodemailer from "nodemailer";

export const sendMail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER || "shazan.softvence@gmail.com",
        pass: process.env.MAIL_PASS || "qssf zonx xhry tpjj",
      },
    });

    const mailOptions = {
      from: process.env.MAIL_USER || "shazan.softvence@gmail.com",
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
