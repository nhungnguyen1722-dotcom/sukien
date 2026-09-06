import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ success: false, error: 'Không tìm thấy file tải lên' }, { status: 400 });
    }

    const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validMimeTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|svg|webp)$/i)) {
      return Response.json(
        { success: false, error: 'Định dạng file không hợp lệ. Vui lòng chọn ảnh PNG, JPG, SVG hoặc WebP.' },
        { status: 400 }
      );
    }

    // Determine extension
    let ext = path.extname(file.name) || '.png';
    if (!ext.startsWith('.')) ext = '.' + ext;
    const filename = `logo-${Date.now()}${ext.toLowerCase()}`;

    // Target directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    const logoUrl = `/uploads/${filename}`;

    // Update system_settings table in database
    await pool.query(
      `
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES ('system_logo', $1, 'Logo tải lên từ Admin', CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP;
      `,
      [logoUrl]
    );

    return Response.json({
      success: true,
      logo_url: logoUrl,
      message: 'Cập nhật logo thành công',
    });
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    return Response.json({ success: false, error: error.message || 'Lỗi xử lý file tải lên' }, { status: 500 });
  }
}
