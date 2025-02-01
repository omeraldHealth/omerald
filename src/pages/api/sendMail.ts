import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userMail, subject, message, userName, userPhone, receiptantMail } = req.body;

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.zoho.in',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'developer.support@omerald.com',
        pass: process.env.SMTP_PASS || '',
      },
    });

    const mailData = {
      from: process.env.SMTP_USER || 'developer.support@omerald.com',
      to: receiptantMail,
      cc: userMail,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #f97316; margin-top: 0;">New Contact Form Submission</h2>
            <div style="background-color: #fff7ed; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #333; line-height: 1.6;">${message}</p>
            </div>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              <h3 style="color: #374151; margin-top: 0; font-size: 16px;">Contact Information:</h3>
              <p style="margin: 5px 0; color: #6b7280;"><strong>Name:</strong> ${userName}</p>
              <p style="margin: 5px 0; color: #6b7280;"><strong>Email:</strong> ${userMail}</p>
              ${userPhone ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Phone:</strong> ${userPhone}</p>` : ''}
            </div>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            This email was sent from the Omerald contact form.
          </p>
        </div>`,
    };

    const info = await transport.sendMail(mailData);
    return res.status(201).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error.toString() });
  }
};

