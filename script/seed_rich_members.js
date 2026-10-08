const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function seedFullMembers() {
  console.log('Seeding rich member data...');

  const membersData = [
    {
      full_name: 'Nhung Nguyá»…n',
      phone: '0000000001',
      email: 'nhungnguyen1722@gmail.com',
      role: 'Admin',
      classification: 'NhÃ¢n sá»±',
      title: 'GiÃ¡m Ä‘á»‘c',
      referral_group: 'ThÃ nh viÃªn há»‡ thá»‘ng',
      ref_code: 'REF001',
      source: 'Ná»™i bá»™',
      join_date: '2025-01-01',
      status: 'Äang hoáº¡t Ä‘á»™ng',
      guest_count: 12,
      bank_account: 'MB Bank - 0900000001',
      identity_card: '001200000001',
      is_team_leader_eligible: true,
      notes: 'Quáº£n trá»‹ viÃªn tá»‘i cao há»‡ thá»‘ng Nghiêng Complex'
    },
    {
      full_name: 'Nguyá»…n Tuáº¥n',
      phone: '0000000002',
      email: 'tuan161022@gmail.com',
      role: 'NhÃ¢n viÃªn',
      classification: 'NhÃ¢n sá»±',
      title: 'TrÆ°á»Ÿng phÃ²ng',
      referral_group: 'ThÃ nh viÃªn há»‡ thá»‘ng',
      ref_code: 'REF002',
      source: 'Ná»™i bá»™',
      join_date: '2025-02-15',
      status: 'Äang hoáº¡t Ä‘á»™ng',
      guest_count: 8,
      bank_account: 'Techcombank - 1903000002',
      identity_card: '001200000002',
      is_team_leader_eligible: true,
      notes: 'Quáº£n lÃ½ sá»± kiá»‡n vÃ  Ä‘á»‘i tÃ¡c'
    },
    {
      full_name: 'Nguyá»…n VÄƒn An',
      phone: '0901234567',
      email: 'an.nguyen@nghiengcomplex.vn',
      role: 'MC',
      classification: 'NhÃ¢n sá»±',
      title: 'ThÃ nh viÃªn',
      referral_group: 'KhÃ¡ch vÃ£ng lai',
      ref_code: 'REF_AN01',
      source: 'Facebook',
      join_date: '2025-03-10',
      status: 'Äang hoáº¡t Ä‘á»™ng',
      guest_count: 5,
      bank_account: 'Vietcombank - 0011001234567',
      identity_card: '001200000003',
      is_team_leader_eligible: false,
      notes: 'MC chuyÃªn nghiá»‡p sá»± kiá»‡n lá»›n'
    },
    {
      full_name: 'Tráº§n Thá»‹ BÃ¬nh',
      phone: '0902345678',
      email: 'binh.tran@nghiengcomplex.vn',
      role: 'Thuyáº¿t trÃ¬nh',
      classification: 'NhÃ¢n sá»±',
      title: 'TrÆ°á»Ÿng phÃ²ng',
      referral_group: 'Chá»n ngÆ°á»i má»i trong há»‡ thá»‘ng',
      ref_code: 'REF_BINH02',
      referrer_id: 1,
      source: 'Báº¡n bÃ¨ giá»›i thiá»‡u',
      join_date: '2025-03-15',
      status: 'Äang hoáº¡t Ä‘á»™ng',
      guest_count: 7,
      bank_account: 'BIDV - 12010002345678',
      identity_card: '001200000004',
      is_team_leader_eligible: true,
      notes: 'Diá»…n giáº£ chÃ­nh chuyÃªn Ä‘á» Marketing'
    },
    {
      full_name: 'LÃª HoÃ ng CÆ°á»ng',
      phone: '0903456789',
      email: 'cuong.le@nghiengcomplex.vn',
      role: 'Chá»‘t sá»± kiá»‡n',
      classification: 'Pro Sale',
      title: 'PhÃ³ GiÃ¡m Ä‘á»‘c',
      referral_group: 'MÃ£ má»i tá»« thÃ nh viÃªn (Referral Code)',
      ref_code: 'REF_CUONG03',
      referrer_id: 1,
      source: 'Há»™i tháº£o',
      join_date: '2025-04-01',
      status: 'Äang hoáº¡t Ä‘á»™ng',
      guest_count: 15,
      bank_account: 'VPBank - 903456789',
      identity_card: '001200000005',
      is_team_leader_eligible: true,
      notes: 'Chá»‘t há»£p Ä‘á»“ng xuáº¥t sáº¯c quÃ½ 1'
    },
    {
      full_name: 'Pháº¡m Thá»‹ Dung',
      phone: '0904567890',
      email: 'dung.pham@nghiengcomplex.vn',
      role: 'Phá»¥ng sá»±',
      classification: 'NhÃ¢n sá»±',
      title: 'ThÃ nh viÃªn',
      referral_group: 'KhÃ¡ch vÃ£ng lai',
      ref_code: 'REF_DUNG04',
      source: 'Zalo',
      join_date: '2025-04-10',
      status: 'Äang hoáº¡t Ä‘á»™ng',
      guest_count: 3,
      bank_account: 'ACB - 200456789',
      identity_card: '001200000006',
      is_team_leader_eligible: false,
      notes: 'Háº­u cáº§n & Ä‘iá»u phá»‘i bÃ n tiá»‡c trÃ '
    },
    {
      full_name: 'HoÃ ng VÄƒn Em',
      phone: '0905678901',
      email: 'em.hoang@nghiengcomplex.vn',
      role: 'Kinh doanh',
      classification: 'Sale',
      title: 'ThÃ nh viÃªn',
      referral_group: 'Chá»n ngÆ°á»i má»i trong há»‡ thá»‘ng',
      ref_code: 'REF_EM05',
      referrer_id: 5,
      source: 'Tik Tok',
      join_date: '2025-05-01',
      status: 'Äang hoáº¡t Ä‘á»™ng',
      guest_count: 9,
      bank_account: 'TPBank - 0905678901',
      identity_card: '001200000007',
      is_team_leader_eligible: false,
      notes: 'Äáº¡t chá»‰ tiÃªu doanh sá»‘ thÃ¡ng 5'
    },
    {
      full_name: 'Äá»— Thá»‹ PhÆ°Æ¡ng',
      phone: '0906789012',
      email: 'phuong.do@nghiengcomplex.vn',
      role: 'Team Leader',
      classification: 'Pro Sale',
      title: 'TrÆ°á»Ÿng phÃ²ng',
      referral_group: 'MÃ£ má»i tá»« thÃ nh viÃªn (Referral Code)',
      ref_code: 'REF_PHUONG06',
      referrer_id: 1,
      source: 'Sá»± kiá»‡n networking',
      join_date: '2025-05-15',
      status: 'Äang hoáº¡t Ä‘á»™ng',
      guest_count: 20,
      bank_account: 'MB Bank - 0906789012',
      identity_card: '001200000008',
      is_team_leader_eligible: true,
      notes: 'Leader Team HÃ  ÄÃ´ng'
    },
    {
      full_name: 'VÅ© Káº¿ ToÃ¡n',
      phone: '0907890123',
      email: 'ketoan.vu@nghiengcomplex.vn',
      role: 'Káº¿ toÃ¡n',
      classification: 'NhÃ¢n sá»±',
      title: 'TrÆ°á»Ÿng phÃ²ng',
      referral_group: 'ThÃ nh viÃªn há»‡ thá»‘ng',
      ref_code: 'REF_KETOAN07',
      source: 'Ná»™i bá»™',
      join_date: '2025-06-01',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 2,
      bank_account: 'VietinBank - 101890789012',
      identity_card: '001200000009',
      is_team_leader_eligible: false,
      notes: 'Kiá»ƒm soÃ¡t thu chi sá»± kiá»‡n'
    },
    {
      full_name: 'BÃ¹i CÃ´ng Nghá»‡',
      phone: '0908901234',
      email: 'congnghe.bui@nghiengcomplex.vn',
      role: 'CÃ´ng nghá»‡',
      classification: 'NhÃ¢n sá»±',
      title: 'TrÆ°á»Ÿng phÃ²ng',
      referral_group: 'ThÃ nh viÃªn há»‡ thá»‘ng',
      ref_code: 'REF_TECH08',
      source: 'Ná»™i bá»™',
      join_date: '2025-06-05',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 1,
      bank_account: 'Techcombank - 1908901234',
      identity_card: '001200000010',
      is_team_leader_eligible: false,
      notes: 'Quáº£n trá»‹ ná»n táº£ng vÃ  ká»¹ thuáº­t check-in'
    },
    {
      full_name: 'NgÃ´ Quá»‘c Báº£o',
      phone: '0911223344',
      email: 'bao.ngo@nghiengcomplex.vn',
      role: 'Kinh doanh',
      classification: 'Sale',
      title: 'ThÃ nh viÃªn',
      referral_group: 'Chá»n ngÆ°á»i má»i trong há»‡ thá»‘ng',
      ref_code: 'REF_BAO09',
      referrer_id: 8,
      source: 'Facebook Ads',
      join_date: '2025-06-12',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 4,
      bank_account: 'VPBank - 0911223344',
      identity_card: '001200000011',
      is_team_leader_eligible: false,
      notes: 'ThÃ nh viÃªn team HÃ  ÄÃ´ng'
    },
    {
      full_name: 'Trá»‹nh Thá»‹ HÃ ',
      phone: '0912334455',
      email: 'ha.trinh@nghiengcomplex.vn',
      role: 'Lá»… tÃ¢n',
      classification: 'NhÃ¢n sá»±',
      title: 'ThÃ nh viÃªn',
      referral_group: 'KhÃ¡ch vÃ£ng lai',
      ref_code: 'REF_HA10',
      source: 'Tuyá»ƒn dá»¥ng',
      join_date: '2025-06-20',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 6,
      bank_account: 'ACB - 0912334455',
      identity_card: '001200000012',
      is_team_leader_eligible: false,
      notes: 'Lá»… tÃ¢n Ä‘Ã³n tiáº¿p khÃ¡ch vÃ  in tháº» check-in'
    },
    {
      full_name: 'Äáº·ng Minh Khang',
      phone: '0913445566',
      email: 'khang.dang@nghiengcomplex.vn',
      role: 'Kinh doanh',
      classification: 'Pro Sale',
      title: 'PhÃ³ GiÃ¡m Ä‘á»‘c',
      referral_group: 'MÃ£ má»i tá»« thÃ nh viÃªn (Referral Code)',
      ref_code: 'REF_KHANG11',
      referrer_id: 5,
      source: 'Há»™i nghá»‹ BNI',
      join_date: '2025-07-01',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 18,
      bank_account: 'Vietcombank - 0021009134455',
      identity_card: '001200000013',
      is_team_leader_eligible: true,
      notes: 'ChuyÃªn gia Ä‘Ã o táº¡o bÃ¡n hÃ ng'
    },
    {
      full_name: 'VÅ© Thá»‹ CÃºc',
      phone: '0914556677',
      email: 'cuc.vu@nghiengcomplex.vn',
      role: 'Admin',
      classification: 'NhÃ¢n sá»±',
      title: 'Chá»§ tá»‹ch',
      referral_group: 'ThÃ nh viÃªn há»‡ thá»‘ng',
      ref_code: 'REF_CUC12',
      source: 'SÃ¡ng láº­p viÃªn',
      join_date: '2024-12-01',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 30,
      bank_account: 'MB Bank - 0914556677',
      identity_card: '001200000014',
      is_team_leader_eligible: true,
      notes: 'NgÆ°á»i duyá»‡t Ä‘iá»u kiá»‡n Team Leader & duyá»‡t chi phÃ­ sá»± kiá»‡n'
    },
    {
      full_name: 'LÃ½ Quá»‘c TrÃ­',
      phone: '0915667788',
      email: 'tri.ly@gmail.com',
      role: 'KhÃ¡c',
      classification: 'KhÃ¡ch má»i',
      title: 'ThÃ nh viÃªn',
      referral_group: 'KhÃ¡ch vÃ£ng lai',
      ref_code: 'REF_TRI13',
      source: 'Website',
      join_date: '2025-07-15',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 1,
      bank_account: 'Techcombank - 0915667788',
      identity_card: '001200000015',
      is_team_leader_eligible: false,
      notes: 'Äá»‘i tÃ¡c tiá»m nÄƒng máº£ng F&B'
    },
    {
      full_name: 'Phan Má»¹ Linh',
      phone: '0916778899',
      email: 'linh.phan@nghiengcomplex.vn',
      role: 'Thuyáº¿t trÃ¬nh',
      classification: 'CTV',
      title: 'ThÃ nh viÃªn',
      referral_group: 'Chá»n ngÆ°á»i má»i trong há»‡ thá»‘ng',
      ref_code: 'REF_LINH14',
      referrer_id: 4,
      source: 'Báº¡n bÃ¨',
      join_date: '2025-07-20',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 3,
      bank_account: 'VPBank - 0916778899',
      identity_card: '001200000016',
      is_team_leader_eligible: false,
      notes: 'Cá»™ng tÃ¡c viÃªn máº£ng truyá»n thÃ´ng sá»‘'
    },
    {
      full_name: 'DÆ°Æ¡ng VÄƒn KiÃªn',
      phone: '0917889900',
      email: 'kien.duong@nghiengcomplex.vn',
      role: 'Chá»‘t sá»± kiá»‡n',
      classification: 'Pro Sale',
      title: 'TrÆ°á»Ÿng phÃ²ng',
      referral_group: 'MÃ£ má»i tá»« thÃ nh viÃªn (Referral Code)',
      ref_code: 'REF_KIEN15',
      referrer_id: 13,
      source: 'Há»™i doanh nghiá»‡p tráº»',
      join_date: '2025-08-01',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 11,
      bank_account: 'BIDV - 0917889900',
      identity_card: '001200000017',
      is_team_leader_eligible: true,
      notes: 'Team Leader VÄ©nh PhÃºc'
    },
    {
      full_name: 'Mai Thanh TÃ¢m',
      phone: '0918990011',
      email: 'tam.mai@nghiengcomplex.vn',
      role: 'Phá»¥ng sá»±',
      classification: 'NhÃ¢n sá»±',
      title: 'ThÃ nh viÃªn',
      referral_group: 'KhÃ¡ch vÃ£ng lai',
      ref_code: 'REF_TAM16',
      source: 'Zalo Group',
      join_date: '2025-08-10',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 4,
      bank_account: 'ACB - 0918990011',
      identity_card: '001200000018',
      is_team_leader_eligible: false,
      notes: 'Phá»¥ trÃ¡ch Ã¢m thanh Ã¡nh sÃ¡ng'
    },
    {
      full_name: 'Táº¡ Minh Nháº­t',
      phone: '0919001122',
      email: 'nhat.ta@nghiengcomplex.vn',
      role: 'Kinh doanh',
      classification: 'Sale',
      title: 'ThÃ nh viÃªn',
      referral_group: 'Chá»n ngÆ°á»i má»i trong há»‡ thá»‘ng',
      ref_code: 'REF_NHAT17',
      referrer_id: 17,
      source: 'Facebook',
      join_date: '2025-08-15',
      status: 'KhÃ´ng hoáº¡t Ä‘á»™ng',
      guest_count: 0,
      bank_account: 'Vietcombank - 0919001122',
      identity_card: '001200000019',
      is_team_leader_eligible: false,
      notes: 'Táº¡m nghá»‰ phÃ©p cÃ¡ nhÃ¢n'
    },
    {
      full_name: 'Cao HoÃ ng Yáº¿n',
      phone: '0920112233',
      email: 'yen.cao@nghiengcomplex.vn',
      role: 'MC',
      classification: 'CTV',
      title: 'ThÃ nh viÃªn',
      referral_group: 'Chá»n ngÆ°á»i má»i trong há»‡ thá»‘ng',
      ref_code: 'REF_YEN18',
      referrer_id: 3,
      source: 'CLB MC HÃ  Ná»™i',
      join_date: '2025-08-25',
      status: 'Hoáº¡t Ä‘á»™ng',
      guest_count: 2,
      bank_account: 'MB Bank - 0920112233',
      identity_card: '001200000020',
      is_team_leader_eligible: false,
      notes: 'MC dá»± bá»‹ cÃ¡c sá»± kiá»‡n song ngá»¯'
    }
  ];

  for (const m of membersData) {
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [m.phone]);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (
          full_name, phone, email, role, classification, title,
          referral_group, ref_code, referrer_id, source, join_date,
          status, guest_count, bank_account, identity_card,
          is_team_leader_eligible, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          m.full_name, m.phone, m.email, m.role, m.classification, m.title,
          m.referral_group, m.ref_code, m.referrer_id || null, m.source, m.join_date,
          m.status, m.guest_count, m.bank_account, m.identity_card,
          m.is_team_leader_eligible, m.notes
        ]
      );
    } else {
      await pool.query(
        `UPDATE users SET
          full_name = $1, email = $2, role = $3, classification = $4, title = $5,
          referral_group = $6, ref_code = $7, referrer_id = $8, source = $9, join_date = $10,
          status = $11, guest_count = $12, bank_account = $13, identity_card = $14,
          is_team_leader_eligible = $15, notes = $16
        WHERE phone = $17`,
        [
          m.full_name, m.email, m.role, m.classification, m.title,
          m.referral_group, m.ref_code, m.referrer_id || null, m.source, m.join_date,
          m.status, m.guest_count, m.bank_account, m.identity_card,
          m.is_team_leader_eligible, m.notes, m.phone
        ]
      );
    }
  }

  const all = await pool.query('SELECT id, full_name, phone, role, classification, title, guest_count, referral_group, status FROM users ORDER BY id ASC');
  console.log(`Successfully seeded ${all.rows.length} members.`);
  console.table(all.rows);

  await pool.end();
}

seedFullMembers().catch((err) => {
  console.error(err);
  process.exit(1);
});

