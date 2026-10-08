const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function run() {
  const client = await pool.connect();
  try {
    const ver = await client.query('SELECT version()');
    console.log('Postgres version:', ver.rows[0].version);

    // 1. Create table permissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module VARCHAR(100) NOT NULL,
        can_view BOOLEAN DEFAULT FALSE,
        can_create BOOLEAN DEFAULT FALSE,
        can_edit BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if constraint exists
    const checkConstraint = await client.query(`
      SELECT conname FROM pg_constraint WHERE conname = 'uq_permissions_user_module'
    `);
    if (checkConstraint.rows.length === 0) {
      await client.query(`
        ALTER TABLE permissions ADD CONSTRAINT uq_permissions_user_module UNIQUE (user_id, module);
      `);
      console.log('✅ Added constraint uq_permissions_user_module');
    }

    // 2. Insert or update Vu Thi Cuc
    let userRes = await client.query(`SELECT id FROM users WHERE email = 'vuthicuc@gmail.com'`);
    let cucId;
    if (userRes.rows.length === 0) {
      const insRes = await client.query(`
        INSERT INTO users (full_name, phone, email, role, status)
        VALUES ('Vũ Thị Cúc', '0909999888', 'vuthicuc@gmail.com', 'Admin', 'Đang hoạt động')
        RETURNING id
      `);
      cucId = insRes.rows[0].id;
      console.log('✅ Created user Vũ Thị Cúc with ID:', cucId);
    } else {
      cucId = userRes.rows[0].id;
      await client.query(`
        UPDATE users SET full_name = 'Vũ Thị Cúc', role = 'Admin', status = 'Đang hoạt động' WHERE id = $1
      `, [cucId]);
      console.log('✅ Found existing user Vũ Thị Cúc with ID:', cucId);
    }

    // Insert permissions for Vu Thi Cuc
    const modules = ['Tổng quan', 'Sự kiện', 'Thành viên', 'Người mới', 'Lễ tân', 'Mời bạn bè', 'Tài khoản'];
    for (const mod of modules) {
      // Check existing permission
      const exist = await client.query(`SELECT id FROM permissions WHERE user_id = $1 AND module = $2`, [cucId, mod]);
      if (exist.rows.length === 0) {
        await client.query(`
          INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete)
          VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE)
        `, [cucId, mod]);
      } else {
        await client.query(`
          UPDATE permissions SET can_view = TRUE, can_create = TRUE, can_edit = TRUE, can_delete = TRUE, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [exist.rows[0].id]);
      }
    }
    console.log('✅ Full permissions granted to Vũ Thị Cúc');

    // Also grant permissions to Nhung Nguyen (if exists)
    const nhungRes = await client.query(`SELECT id FROM users WHERE email = 'nhungnguyen1722@gmail.com'`);
    if (nhungRes.rows.length > 0) {
      const nhungId = nhungRes.rows[0].id;
      for (const mod of modules) {
        const exist = await client.query(`SELECT id FROM permissions WHERE user_id = $1 AND module = $2`, [nhungId, mod]);
        if (exist.rows.length === 0) {
          await client.query(`
            INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete)
            VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE)
          `, [nhungId, mod]);
        } else {
          await client.query(`
            UPDATE permissions SET can_view = TRUE, can_create = TRUE, can_edit = TRUE, can_delete = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [exist.rows[0].id]);
        }
      }
      console.log('✅ Full permissions granted to Nhung Nguyễn');
    }

    // Print all admin users
    const users = await client.query(
      "SELECT id, full_name, email, role, status FROM users WHERE email IS NOT NULL AND email != '' ORDER BY id"
    );
    console.log('\n📋 Admin/Active Users:');
    users.rows.forEach((u, i) => console.log(`  ${i+1}. [ID: ${u.id}] ${u.full_name} (${u.email}) - ${u.role} - ${u.status}`));

    // Print permissions
    const perms = await client.query(`
      SELECT u.full_name, p.module, p.can_view, p.can_create, p.can_edit, p.can_delete 
      FROM permissions p 
      JOIN users u ON u.id = p.user_id 
      ORDER BY u.id, p.id
    `);
    console.log('\n🔐 Permissions total count:', perms.rows.length);
    perms.rows.forEach(p => console.log(`  - ${p.full_name}: ${p.module} (View:${p.can_view}, Create:${p.can_create}, Edit:${p.can_edit}, Del:${p.can_delete})`));

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
