import { NextRequest } from 'next/server';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Lấy phân quyền của user
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return Response.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id, module, can_view, can_create, can_edit, can_delete
       FROM permissions
       WHERE user_id = $1
       ORDER BY id ASC`,
      [userId]
    );

    return Response.json({ permissions: result.rows });
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    return Response.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

// PUT: Cập nhật phân quyền của user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return Response.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { permissions } = body as {
      permissions: Array<{
        module: string;
        can_view: boolean;
        can_create: boolean;
        can_edit: boolean;
        can_delete: boolean;
      }>;
    };

    if (!permissions || !Array.isArray(permissions)) {
      return Response.json({ error: 'Invalid permissions data' }, { status: 400 });
    }

    await client.query('BEGIN');

    for (const perm of permissions) {
      const exist = await client.query(
        'SELECT id FROM permissions WHERE user_id = $1 AND module = $2',
        [userId, perm.module]
      );

      if (exist.rows.length === 0) {
        await client.query(
          `INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, perm.module, !!perm.can_view, !!perm.can_create, !!perm.can_edit, !!perm.can_delete]
        );
      } else {
        await client.query(
          `UPDATE permissions
           SET can_view = $3, can_create = $4, can_edit = $5, can_delete = $6, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [exist.rows[0].id, perm.module, !!perm.can_view, !!perm.can_create, !!perm.can_edit, !!perm.can_delete]
        );
      }
    }

    await client.query('COMMIT');

    // Trả về permissions mới
    const result = await client.query(
      `SELECT id, module, can_view, can_create, can_edit, can_delete
       FROM permissions
       WHERE user_id = $1
       ORDER BY id ASC`,
      [userId]
    );

    return Response.json({ permissions: result.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update permissions:', error);
    return Response.json({ error: 'Failed to update permissions' }, { status: 500 });
  } finally {
    client.release();
  }
}
