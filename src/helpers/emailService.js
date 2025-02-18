import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 */
 const sendEmail = async (to, subject, text, html = null) => {
  try {
    await transporter.sendMail({
      from: `"EventMaker" <${process.env.EMAIL_USER}>`, // Sender name
      to,
      subject,
      text,
      html, // Optional HTML version of the email
    });
    console.log("Email sent to", to);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
export default sendEmail;