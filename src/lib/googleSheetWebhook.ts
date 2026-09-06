export interface GoogleSheetSyncData {
  guest_code?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  event_id?: number | string | null;
  event_name?: string | null;
  event_date?: string | null;
  location?: string | null;
  expected_guests?: number | null;
  manager_name?: string | null;
  sale_name?: string | null;
  referrer_name?: string | null;
  source?: string | null;
  attendance_status?: string | null;
  status?: string | null;
  approval_status?: string | null;
  total_cost?: number | string | null;
  notes?: string | null;
  type?: 'event' | 'registration' | string;
  [key: string]: any;
}

const DEFAULT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbyXWBaCWRQKQRBrMpP2Yfe-8kTMRQTISqVLXkbI7d7n2Xi3--HMpeH5zxECl08lp2g-/exec';

export async function sendToGoogleSheet(data: GoogleSheetSyncData): Promise<boolean> {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('Google Sheet Webhook URL is not configured.');
    return false;
  }

  try {
    // Note: Google Apps Script Webhooks follow redirects (302)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data),
      redirect: 'follow',
    });

    if (response.ok) {
      console.log('Successfully synced data to Google Sheet:', data.event_name || data.guest_name);
      return true;
    } else {
      console.error('Failed to sync to Google Sheet. Status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error sending data to Google Sheet Webhook:', error);
    return false;
  }
}

