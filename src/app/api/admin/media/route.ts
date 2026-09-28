import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const images: { url: string; name: string; type: string }[] = [];

    // Default event images in public/events
    const eventsDir = path.join(process.cwd(), 'public', 'events');
    if (fs.existsSync(eventsDir)) {
      const files = fs.readdirSync(eventsDir);
      for (const f of files) {
        if (/\.(jpg|jpeg|png|webp|svg)$/i.test(f)) {
          images.push({
            url: `/events/${f}`,
            name: f,
            type: 'Thư viện sự kiện',
          });
        }
      }
    }

    // Uploaded images in public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const f of files) {
        if (/\.(jpg|jpeg|png|webp|svg)$/i.test(f)) {
          images.push({
            url: `/uploads/${f}`,
            name: f,
            type: 'Đã tải lên',
          });
        }
      }
    }

    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error('Error listing media:', error);
    return NextResponse.json({ success: false, images: [] }, { status: 500 });
  }
}
