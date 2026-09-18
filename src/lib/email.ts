import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'nhungnguyen1722@gmail.com',
    pass: (process.env.SMTP_PASS || 'foxf cinj klkg npux').replace(/\s+/g, ''),
  },
});

export interface SendInvitationEmailParams {
  toEmail: string;
  guestName: string;
  eventName: string;
  eventTime: string;
  eventLocation: string;
  inviterName: string;
  inviteLink: string;
}

export async function sendInvitationEmail({
  toEmail,
  guestName,
  eventName,
  eventTime,
  eventLocation,
  inviterName,
  inviteLink,
}: SendInvitationEmailParams) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #1e3a8a; margin-top: 0; font-size: 20px;">TẬP ĐOÀN NGHIÊNG COMPLEX</h2>
      <h3 style="color: #0f172a; font-size: 16px; margin-bottom: 20px;">Thư mời tham gia sự kiện</h3>
      
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Kính gửi <strong>${guestName || 'Quý khách'}</strong>,
      </p>
      
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Bạn được mời tham gia sự kiện do <strong>Nghiêng Complex</strong> tổ chức.
      </p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h4 style="margin-top: 0; margin-bottom: 12px; color: #0f172a; font-size: 14px; text-transform: uppercase;">Thông tin sự kiện:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.8;">
          <li><strong>Tên sự kiện:</strong> ${eventName}</li>
          <li><strong>Thời gian:</strong> ${eventTime}</li>
          <li><strong>Địa điểm:</strong> ${eventLocation}</li>
          <li><strong>Người mời:</strong> ${inviterName}</li>
        </ul>
      </div>
      
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Vui lòng nhấn vào liên kết bên dưới để xem thông tin và đăng ký tham dự sự kiện.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">
          Tham gia sự kiện
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 0;">
        Trân trọng,<br/>
        <strong>Tập đoàn Nghiêng Complex</strong>
      </p>
    </div>
  `;

  return await transporter.sendMail({
    from: '"Nghiêng Complex" <nhungnguyen1722@gmail.com>',
    to: toEmail,
    subject: `[NGHIENG Complex] Thư mời tham gia sự kiện: ${eventName}`,
    html: htmlContent,
  });
}
