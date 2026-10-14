import pool from '@/lib/db';
import TrainingManagement, { TrainingLog, TrainingCourse } from '@/components/admin/TrainingManagement';

export const revalidate = 0;

async function getTrainingData() {
  try {
    const [logsRes, statsRes, coursesRes, membersRes, contractsRes] = await Promise.all([
      pool.query(`
        SELECT 
          log.id, log.session_code, log.course_code,
          COALESCE(course.course_name, log.session_name) AS session_name,
          log.member_phone, log.member_name,
          log.token_count, log.session_budget, log.total_tokens,
          log.reward_amount, log.status, log.approver,
          TO_CHAR(log.training_date, 'YYYY-MM-DD') AS training_date
        FROM training_logs AS log
        LEFT JOIN training_courses AS course ON course.course_code = log.course_code
        ORDER BY log.training_date ASC, log.id ASC
      `),
      pool.query(`
        SELECT 
          COUNT(DISTINCT (session_code, training_date))::int AS total_sessions,
          COUNT(DISTINCT member_name)::int AS total_members,
          COALESCE(SUM(token_count), 0)::int AS total_tokens,
          COALESCE(SUM(CASE WHEN status = 'Đã duyệt' THEN token_count * 5000 ELSE 0 END), 0)::numeric AS total_rewards
        FROM training_logs
      `),
      pool.query(`
        SELECT course_code, course_name, training_type, token_value, budget
        FROM training_courses
        ORDER BY course_code ASC
      `),
      pool.query(`
        SELECT full_name, phone
        FROM users
        WHERE status IS DISTINCT FROM 'Tạm khóa'
        ORDER BY full_name ASC
      `),
      pool.query(`
        SELECT contract_code, contract_date::text AS contract_date, customer_name,
          CASE
            WHEN LOWER(BTRIM(COALESCE(contract_type, ''))) LIKE '%2 n_m%'
              OR LOWER(BTRIM(COALESCE(contract_type, ''))) LIKE '%2 nam%'
              THEN COALESCE(value, 0) * 0.70
            ELSE COALESCE(value, 0)
          END::float8 AS allocation_base
        FROM contracts
        WHERE status IN ('Đã duyệt', 'Da duyệt', 'Da duy?t')
          AND contract_date IS NOT NULL
        ORDER BY contract_date ASC, id ASC
      `),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_sessions: 0,
      total_members: 0,
      total_tokens: 0,
      total_rewards: 0,
    };

    const logs: TrainingLog[] = logsRes.rows.map((row) => {
      return {
        ...row,
        token_count: Number(row.token_count || 0),
        session_budget: Number(row.session_budget || 0),
        total_tokens: Number(row.total_tokens || 0),
        reward_amount: Number(row.token_count || 0) * 5000,
        training_date: row.training_date || '',
      };
    });

    const courses: TrainingCourse[] = (coursesRes.rows || []).map((c: any) => ({
      course_code: c.course_code,
      course_name: c.course_name,
      training_type: c.training_type,
      token_value: Number(c.token_value || 0),
      budget: Number(c.budget || 0),
    }));

    return {
      logs,
      courses,
      members: membersRes.rows,
      contracts: contractsRes.rows.map((row) => ({ ...row, allocation_base: Number(row.allocation_base || 0) })),
      stats: {
        totalSessions: statsRow.total_sessions || 0,
        totalMembers: statsRow.total_members || 0,
        totalTokens: statsRow.total_tokens || 0,
        totalRewards: Number(statsRow.total_rewards || 0),
      },
    };
  } catch (error) {
    console.error('Error loading training logs:', error);
    throw error;
  }
}

export default async function NhatKyDaoTaoPage() {
  const data = await getTrainingData();

  return (
    <TrainingManagement
      initialLogs={data.logs}
      initialCourses={data.courses}
      initialMembers={data.members}
      initialContracts={data.contracts}
      initialStats={data.stats}
    />
  );
}
