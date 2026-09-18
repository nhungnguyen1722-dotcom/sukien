const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function seedEvents() {
  try {
    // Láº¥y 1 manager há»£p lá»‡ (náº¿u cÃ³)
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    const managerId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

    const eventsData = [
      {
        name: 'Há»™i nghá»‹ khÃ¡ch hÃ ng Ä‘áº§u nÄƒm 2025',
        event_date: '2025-01-15',
        expected_guests: 50,
        location: 'KhÃ¡ch sáº¡n Daewoo, HÃ  Ná»™i',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      },
      {
        name: 'Workshop Ká»¹ nÄƒng bÃ¡n hÃ ng BÄS 2025',
        event_date: '2025-03-10',
        expected_guests: 30,
        location: 'VÄƒn phÃ²ng Nghiêng Complex',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      },
      {
        name: 'Tiá»‡c trÃ  káº¿t ná»‘i nhÃ  Ä‘áº§u tÆ° Q1',
        event_date: '2025-04-20',
        expected_guests: 40,
        location: 'NhÃ  hÃ ng Sen TÃ¢y Há»“',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      },
      {
        name: 'Há»™i tháº£o: CÆ¡ há»™i Ä‘áº§u tÆ° vÃ¹ng ven',
        event_date: '2025-05-25',
        expected_guests: 100,
        location: 'Trung tÃ¢m Há»™i nghá»‹ Quá»‘c gia',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      },
      {
        name: 'Gáº·p gá»¡ Ä‘á»‘i tÃ¡c chiáº¿n lÆ°á»£c',
        event_date: '2025-06-12',
        expected_guests: 20,
        location: 'JW Marriott Hanoi',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      },
      {
        name: 'Lá»… ra quÃ¢n dá»± Ã¡n Eco Park',
        event_date: '2025-08-08',
        expected_guests: 150,
        location: 'KÄT Ecopark',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      },
      {
        name: 'ÄÃ o táº¡o Sales K2',
        event_date: '2025-09-05',
        expected_guests: 35,
        location: 'PhÃ²ng Ä‘Ã o táº¡o Nghiêng Complex',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      },
      {
        name: 'Sá»± kiá»‡n tri Ã¢n khÃ¡ch hÃ ng',
        event_date: '2025-10-20',
        expected_guests: 80,
        location: 'Trá»‘ng Äá»“ng Palace',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      },
      {
        name: 'Networking Doanh nhÃ¢n tráº»',
        event_date: '2025-11-15',
        expected_guests: 60,
        location: 'CafÃ© The Vista',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      },
      {
        name: 'Gala Dinner Tá»•ng káº¿t 2025',
        event_date: '2025-12-25',
        expected_guests: 200,
        location: 'KhÃ¡ch sáº¡n InterContinental',
        status: 'ÄÃ£ hoÃ n thÃ nh',
      }
    ];

    for (const event of eventsData) {
      // Random fees
      const mc_fee = Math.floor(Math.random() * 5 + 1) * 1000000;
      const speaker_fee = Math.floor(Math.random() * 5 + 2) * 1000000;
      const support_fee = Math.floor(Math.random() * 2 + 1) * 500000;
      const closer_fee = Math.floor(Math.random() * 5 + 3) * 1000000;
      const tea_break_fee = event.expected_guests * 50000;

      await pool.query(
        `INSERT INTO events (
          name, event_date, expected_guests, location, manager_id, status, approval_status,
          mc_fee, speaker_fee, support_fee, closer_fee, tea_break_fee, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, 'ÄÃ£ duyá»‡t', $7, $8, $9, $10, $11, 'Sá»± kiá»‡n Ä‘Ã£ hoÃ n thÃ nh tá»‘t Ä‘áº¹p')`,
        [
          event.name,
          event.event_date,
          event.expected_guests,
          event.location,
          managerId,
          event.status,
          mc_fee,
          speaker_fee,
          support_fee,
          closer_fee,
          tea_break_fee,
        ]
      );
    }

    console.log('ÄÃ£ táº¡o thÃ nh cÃ´ng 10 sá»± kiá»‡n cÅ© trong nÄƒm 2025.');
  } catch (error) {
    console.error('Lá»—i khi táº¡o dá»¯ liá»‡u:', error);
  } finally {
    pool.end();
  }
}

seedEvents();

