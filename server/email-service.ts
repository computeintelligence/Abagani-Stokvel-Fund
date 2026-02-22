import { google } from 'googleapis';

// Gmail integration via Replit connection
let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

async function generateEmailContent(prompt: string): Promise<string> {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.warn('TOGETHER_API_KEY not set, using fallback email template');
    return '';
  }

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email marketing copywriter for Abangani NS Group, a South African stokvel platform that helps parents save for school uniforms and stationery. Write warm, encouraging, professional emails in simple English. Always maintain a supportive community tone. Keep emails concise but compelling. Use the Rand (R) currency symbol. Do not use markdown formatting - write plain text that reads naturally. Do not include subject lines in the body. IMPORTANT: Do NOT include any URLs or links in your text - links will be added separately after your content. Never generate any website addresses, domain names, or clickable links.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('Together AI error:', response.status);
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Together AI generation failed:', error);
    return '';
  }
}

function createHtmlEmail(body: string, preheader: string = ''): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; font-family: 'Segoe UI', Arial, sans-serif; background:#f4f7f6; color:#1a1a1a; }
  .container { max-width:600px; margin:0 auto; background:#ffffff; }
  .header { background:#2d7a5a; padding:28px 32px; text-align:center; }
  .header h1 { color:#ffffff; margin:0; font-size:22px; letter-spacing:0.5px; }
  .header p { color:#c8e6d8; margin:6px 0 0; font-size:13px; }
  .body { padding:32px; line-height:1.7; font-size:15px; color:#333; }
  .body p { margin:0 0 16px; }
  .cta { display:inline-block; background:#2d7a5a; color:#ffffff !important; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:600; margin:8px 0 16px; }
  .highlight { background:#e8f5ee; border-left:4px solid #2d7a5a; padding:16px 20px; margin:16px 0; border-radius:0 6px 6px 0; }
  .highlight strong { color:#2d7a5a; }
  .footer { background:#f4f7f6; padding:24px 32px; text-align:center; font-size:12px; color:#888; border-top:1px solid #e0e0e0; }
</style></head><body>
<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
<div class="container">
  <div class="header">
    <h1>Abangani NS Group</h1>
    <p>Investing in Your Child's Future</p>
  </div>
  <div class="body">${body}</div>
  <div class="footer">
    <p>Abangani NS Group &bull; South Africa</p>
    <p>Phone: 067 608 3942 &bull; Email: abanganinsgroup@gmail.com</p>
    <p>&copy; ${new Date().getFullYear()} Abangani NS Group. All rights reserved.</p>
  </div>
</div></body></html>`;
}

async function sendEmail(to: string, subject: string, htmlBody: string) {
  try {
    const gmail = await getUncachableGmailClient();
    const raw = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\nMIME-Version: 1.0\r\n\r\n${htmlBody}`
    ).toString('base64url');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
}

const BASE_URL = 'https://abanganistokvelfund.co.za';

export async function sendWelcomeEmail(name: string, email: string) {
  if (!email) return;

  const aiContent = await generateEmailContent(
    `Write a welcome email for ${name} who just created an account on Abangani NS Group. Explain briefly what a stokvel is (a community savings group), how Abangani helps parents save monthly for school uniforms and stationery, and encourage them to register as a member by choosing a subscription plan. Mention they can start from just R195/month. End with an encouraging note about investing in their children's future.`
  );

  const fallback = `<p>Dear ${name},</p>
<p>Welcome to Abangani NS Group! We're thrilled to have you join our community of parents who are investing in their children's education.</p>
<p>Abangani NS Group is a stokvel - a trusted South African community savings group. Together, we save monthly so that every child starts the school year with brand-new uniforms and a complete stationery pack.</p>
<div class="highlight"><strong>How it works:</strong><br>Choose a plan starting from just R195/month, contribute monthly, and your children receive everything they need at the start of each school year.</div>
<p>Your next step is to register as a member by choosing a subscription plan and adding your children's details.</p>
<p><a href="${BASE_URL}/register" class="cta">Register as a Member</a></p>
<p>Together, we're building a brighter future for our children.</p>
<p>Warm regards,<br>The Abangani NS Group Team</p>`;

  const body = aiContent
    ? `<p>Dear ${name},</p>${aiContent.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('')}<p><a href="${BASE_URL}/register" class="cta">Register as a Member</a></p><p>Warm regards,<br>The Abangani NS Group Team</p>`
    : fallback;

  const html = createHtmlEmail(body, 'Welcome to Abangani NS Group - Start saving for your children\'s school needs');
  await sendEmail(email, 'Welcome to Abangani NS Group!', html);
}

export async function sendRegistrationEmail(name: string, email: string, trackingNumber: string, planName: string, amount: number) {
  if (!email) return;

  const aiContent = await generateEmailContent(
    `Write a registration confirmation email for ${name} who just registered for the ${planName} plan at R${amount}/month on Abangani NS Group. Their unique tracking number is ${trackingNumber}. Congratulate them, mention their tracking number (they should save it), and encourage them to log in to their dashboard to make their first payment. Keep it brief and celebratory.`
  );

  const fallback = `<p>Dear ${name},</p>
<p>Congratulations! You have successfully registered as an Abangani NS Group member.</p>
<div class="highlight"><strong>Your Details:</strong><br>Plan: ${planName} - R${amount}/month<br>Tracking Number: <strong>${trackingNumber}</strong></div>
<p>Please save your tracking number - you'll need it for payment references and tracking your progress.</p>
<p>Your next step is to log in to your dashboard and make your first monthly payment.</p>
<p><a href="${BASE_URL}/dashboard" class="cta">Go to Your Dashboard</a></p>
<p>Welcome to the Abangani family!</p>
<p>Warm regards,<br>The Abangani NS Group Team</p>`;

  const body = aiContent
    ? `<p>Dear ${name},</p>${aiContent.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('')}<div class="highlight"><strong>Tracking Number: ${trackingNumber}</strong><br>Plan: ${planName} - R${amount}/month</div><p><a href="${BASE_URL}/dashboard" class="cta">Go to Your Dashboard</a></p><p>Warm regards,<br>The Abangani NS Group Team</p>`
    : fallback;

  const html = createHtmlEmail(body, `Registration confirmed - ${planName} plan activated`);
  await sendEmail(email, `Registration Confirmed - ${planName} Plan`, html);
}

export async function sendPaymentSuccessEmail(name: string, email: string, amount: number, month: string, year: number) {
  if (!email) return;

  const aiContent = await generateEmailContent(
    `Write a short payment confirmation email for ${name} whose R${amount} payment for ${month} ${year} has been verified on Abangani NS Group. Thank them and encourage continued consistent payments. Keep it brief - 3 sentences max.`
  );

  const fallback = `<p>Dear ${name},</p>
<p>Your payment of <strong>R${amount}</strong> for <strong>${month} ${year}</strong> has been verified successfully.</p>
<p>Thank you for staying consistent with your contributions. Your children's future is being secured with every payment.</p>
<p><a href="${BASE_URL}/dashboard" class="cta">View Your Dashboard</a></p>
<p>Warm regards,<br>The Abangani NS Group Team</p>`;

  const body = aiContent
    ? `<p>Dear ${name},</p>${aiContent.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('')}<p><a href="${BASE_URL}/dashboard" class="cta">View Your Dashboard</a></p><p>Warm regards,<br>The Abangani NS Group Team</p>`
    : fallback;

  const html = createHtmlEmail(body, `Payment of R${amount} verified for ${month} ${year}`);
  await sendEmail(email, `Payment Verified - R${amount} for ${month} ${year}`, html);
}

export async function sendPaymentReminderEmail(name: string, email: string, amount: number, unpaidMonths: string[]) {
  if (!email) return;

  const monthsList = unpaidMonths.join(', ');
  const aiContent = await generateEmailContent(
    `Write a gentle, non-pushy payment reminder for ${name} on Abangani NS Group. They have unpaid months: ${monthsList}. Their monthly amount is R${amount}. Gently remind them to make their payments to stay on track. Be encouraging, not threatening. Keep it brief.`
  );

  const fallback = `<p>Dear ${name},</p>
<p>This is a friendly reminder that you have outstanding payments for: <strong>${monthsList}</strong>.</p>
<p>Your monthly contribution is R${amount}. Staying up to date ensures your children receive their full benefits at the start of the school year.</p>
<p><a href="${BASE_URL}/dashboard" class="cta">Make a Payment</a></p>
<p>If you need any assistance, please don't hesitate to contact us.</p>
<p>Warm regards,<br>The Abangani NS Group Team</p>`;

  const body = aiContent
    ? `<p>Dear ${name},</p>${aiContent.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('')}<p><a href="${BASE_URL}/dashboard" class="cta">Make a Payment</a></p><p>Warm regards,<br>The Abangani NS Group Team</p>`
    : fallback;

  const html = createHtmlEmail(body, `Friendly payment reminder - ${monthsList}`);
  await sendEmail(email, 'Payment Reminder - Abangani NS Group', html);
}

export async function sendSupplierRegistrationEmail(name: string, email: string, businessName: string, trackingNumber: string) {
  if (!email) return;

  const body = `<p>Dear ${name},</p>
<p>Thank you for registering <strong>${businessName}</strong> as a supplier with Abangani Stokvel Fund.</p>
<div class="highlight"><strong>Supplier Tracking Number:</strong> ${trackingNumber}<br><strong>Business:</strong> ${businessName}<br><strong>Status:</strong> Pending Approval</div>
<p>Your application is currently under review by our team. We will notify you once your application has been approved.</p>
<p><a href="${BASE_URL}/supplier/dashboard" class="cta">View Your Supplier Dashboard</a></p>
<p>Thank you for your interest in supporting our families.</p>
<p>Warm regards,<br>The Abangani Stokvel Fund Team</p>`;

  const html = createHtmlEmail(body, 'Supplier registration received - pending approval');
  await sendEmail(email, 'Supplier Registration Received - Abangani Stokvel Fund', html);
}

export async function sendSupplierApprovalEmail(name: string, email: string, businessName: string, approved: boolean) {
  if (!email) return;

  const statusText = approved ? 'Approved' : 'Declined';
  const body = approved
    ? `<p>Dear ${name},</p>
<p>We are pleased to inform you that your supplier registration for <strong>${businessName}</strong> has been <strong>approved</strong>!</p>
<p>You are now an official supplier partner of Abangani Stokvel Fund. You can log in to your dashboard to manage your profile and offerings.</p>
<p><a href="${BASE_URL}/supplier/dashboard" class="cta">Go to Your Dashboard</a></p>
<p>Welcome to the Abangani family!</p>
<p>Warm regards,<br>The Abangani Stokvel Fund Team</p>`
    : `<p>Dear ${name},</p>
<p>We regret to inform you that your supplier registration for <strong>${businessName}</strong> has not been approved at this time.</p>
<p>If you believe this was an error or would like to update your application, please contact us or update your profile and resubmit.</p>
<p>Thank you for your interest in Abangani Stokvel Fund.</p>
<p>Warm regards,<br>The Abangani Stokvel Fund Team</p>`;

  const html = createHtmlEmail(body, `Supplier registration ${statusText.toLowerCase()}`);
  await sendEmail(email, `Supplier Registration ${statusText} - Abangani Stokvel Fund`, html);
}

export async function sendAffiliateRegistrationEmail(name: string, email: string, trackingNumber: string, affiliateCode: string, affiliateLink: string) {
  if (!email) return;

  const body = `<p>Dear ${name},</p>
<p>Thank you for registering as an affiliate with Abangani Stokvel Fund!</p>
<div class="highlight"><strong>Affiliate Tracking Number:</strong> ${trackingNumber}<br><strong>Affiliate Code:</strong> ${affiliateCode}<br><strong>Status:</strong> Pending Approval</div>
<p>Once approved, you can start sharing your unique affiliate link and earn R5 commission for every referred paid member. You can withdraw your earnings after reaching 1,000 paid referrals (R5,000 potential earnings).</p>
<div class="highlight"><strong>Your Affiliate Link:</strong><br><a href="${affiliateLink}">${affiliateLink}</a></div>
<p><a href="${BASE_URL}/affiliate/dashboard" class="cta">View Your Affiliate Dashboard</a></p>
<p>Warm regards,<br>The Abangani Stokvel Fund Team</p>`;

  const html = createHtmlEmail(body, 'Affiliate registration received - your unique link is ready');
  await sendEmail(email, 'Affiliate Registration Received - Abangani Stokvel Fund', html);
}

export async function sendAffiliateApprovalEmail(name: string, email: string, affiliateLink: string, approved: boolean) {
  if (!email) return;

  const statusText = approved ? 'Approved' : 'Declined';
  const body = approved
    ? `<p>Dear ${name},</p>
<p>Great news! Your affiliate application has been <strong>approved</strong>!</p>
<p>You can now start sharing your unique affiliate link and earn commissions:</p>
<div class="highlight"><strong>Your Affiliate Link:</strong><br><a href="${affiliateLink}">${affiliateLink}</a><br><br><strong>Commission:</strong> R5 per referred paid member (withdraw after 1,000 paid referrals = R5,000 potential earnings)</div>
<p>A conversion happens when someone clicks your link, signs up, registers with a plan, and makes their first payment.</p>
<p><a href="${BASE_URL}/affiliate/dashboard" class="cta">Go to Your Dashboard</a></p>
<p>Start sharing and earning today!</p>
<p>Warm regards,<br>The Abangani Stokvel Fund Team</p>`
    : `<p>Dear ${name},</p>
<p>We regret to inform you that your affiliate application has not been approved at this time.</p>
<p>If you have questions, please contact us for more information.</p>
<p>Warm regards,<br>The Abangani Stokvel Fund Team</p>`;

  const html = createHtmlEmail(body, `Affiliate application ${statusText.toLowerCase()}`);
  await sendEmail(email, `Affiliate Application ${statusText} - Abangani Stokvel Fund`, html);
}

export async function sendWithdrawalInvoiceEmail(
  affiliateName: string,
  affiliateEmail: string,
  affiliatePhone: string,
  trackingNumber: string,
  bankName: string | null,
  accountNumber: string | null,
  totalConversions: number,
  commissionEarned: number
) {
  const invoiceNumber = `INV-${trackingNumber}-${Date.now().toString(36).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  const adminBody = `<p><strong>Affiliate Withdrawal Invoice</strong></p>
<div class="highlight">
<strong>Invoice Number:</strong> ${invoiceNumber}<br>
<strong>Date:</strong> ${invoiceDate}<br>
<strong>Affiliate:</strong> ${affiliateName}<br>
<strong>Email:</strong> ${affiliateEmail}<br>
<strong>Phone:</strong> ${affiliatePhone}<br>
<strong>Tracking Number:</strong> ${trackingNumber}
</div>
<div class="highlight">
<strong>Banking Details:</strong><br>
Bank: ${bankName || 'Not provided'}<br>
Account Number: ${accountNumber || 'Not provided'}
</div>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr style="background:#2d7a5a;color:#fff;">
<th style="padding:10px;text-align:left;">Description</th>
<th style="padding:10px;text-align:right;">Qty</th>
<th style="padding:10px;text-align:right;">Rate</th>
<th style="padding:10px;text-align:right;">Amount</th>
</tr>
<tr style="border-bottom:1px solid #e0e0e0;">
<td style="padding:10px;">Affiliate Referral Commission</td>
<td style="padding:10px;text-align:right;">${totalConversions}</td>
<td style="padding:10px;text-align:right;">R5.00</td>
<td style="padding:10px;text-align:right;">R${commissionEarned.toLocaleString()}</td>
</tr>
<tr style="background:#f4f7f6;font-weight:bold;">
<td colspan="3" style="padding:10px;text-align:right;">Total Payable:</td>
<td style="padding:10px;text-align:right;">R${commissionEarned.toLocaleString()}</td>
</tr>
</table>
<p>The affiliate <strong>${affiliateName}</strong> has reached ${totalConversions} paid referrals and is requesting a withdrawal of R${commissionEarned.toLocaleString()}.</p>
<p style="font-size:12px;color:#888;">This invoice was automatically generated by the Abangani Stokvel Fund system.</p>`;

  const adminHtml = createHtmlEmail(adminBody, `Withdrawal Invoice from ${affiliateName}`);
  await sendEmail('abanganinsgroup@gmail.com', `Withdrawal Invoice - ${affiliateName} (${trackingNumber})`, adminHtml);

  const affiliateBody = `<p>Dear ${affiliateName},</p>
<p>Your withdrawal request has been submitted successfully!</p>
<div class="highlight">
<strong>Invoice Number:</strong> ${invoiceNumber}<br>
<strong>Date:</strong> ${invoiceDate}<br>
<strong>Total Referrals:</strong> ${totalConversions}<br>
<strong>Amount:</strong> R${commissionEarned.toLocaleString()}
</div>
<p>Our team will process your withdrawal and transfer the funds to your registered bank account. You will be notified once the payment has been made.</p>
<p>If you have any questions, please contact us at abanganinsgroup@gmail.com or call 067 608 3942.</p>
<p><a href="${BASE_URL}/affiliate/dashboard" class="cta">View Your Dashboard</a></p>
<p>Warm regards,<br>The Abangani Stokvel Fund Team</p>`;

  const affiliateHtml = createHtmlEmail(affiliateBody, 'Your withdrawal invoice has been submitted');
  await sendEmail(affiliateEmail, 'Withdrawal Invoice Submitted - Abangani Stokvel Fund', affiliateHtml);
}

export async function sendContactFormEmail(fromName: string, fromEmail: string, subject: string, message: string) {
  const body = `<p><strong>New Contact Form Submission</strong></p>
<div class="highlight">
<strong>From:</strong> ${fromName} (${fromEmail})<br>
<strong>Subject:</strong> ${subject}
</div>
<p>${message.replace(/\n/g, '<br>')}</p>
<p style="font-size:12px;color:#888;">This message was sent via the Abangani Stokvel Fund website contact form.</p>`;

  const html = createHtmlEmail(body, `Contact form: ${subject}`);
  await sendEmail('abanganinsgroup@gmail.com', `Contact Form: ${subject} - from ${fromName}`, html);
}
