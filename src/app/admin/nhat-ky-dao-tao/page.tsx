import pool from '@/lib/db';
import TrainingManagement, { TrainingLog, TrainingCourse } from '@/components/admin/TrainingManagement';

export const revalidate = 0;

async function getTrainingData() {
  try {
    const [logsRes, statsRes, coursesRes] = await Promise.all([
      pool.query(`
        SELECT 
          id, session_code, session_name, member_phone, member_name, 
          role, token_tier, token_count, session_budget, total_tokens, 
          reward_amount, approver, status, TO_CHAR(training_date, 'YYYY-MM-DD') AS training_date
        FROM training_logs
        ORDER BY training_date ASC, id ASC
      `),
      pool.query(`
        SELECT 
          COUNT(DISTINCT session_code)::int AS total_sessions,
          COUNT(DISTINCT member_name)::int AS total_members,
          COALESCE(SUM(token_count), 0)::int AS total_tokens,
          COALESCE(SUM(reward_amount), 0)::numeric AS total_rewards
        FROM training_logs
      `),
      pool.query(`
        SELECT course_code, course_name, training_type, token_value, budget
        FROM training_courses
        ORDER BY course_code ASC
      `).catch(() => ({ rows: [] })),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_sessions: 0,
      total_members: 0,
      total_tokens: 0,
      total_rewards: 0,
    };

    const roleStats: Record<string, number> = {};
    const logs: TrainingLog[] = logsRes.rows.map((row) => {
      const r = row.role || 'Khác';
      roleStats[r] = (roleStats[r] || 0) + 1;
      return {
        ...row,
        token_count: Number(row.token_count || 0),
        session_budget: Number(row.session_budget || 0),
        total_tokens: Number(row.total_tokens || 0),
        reward_amount: Number(row.reward_amount || 0),
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
      stats: {
        totalSessions: statsRow.total_sessions || 0,
        totalMembers: statsRow.total_members || 0,
        totalTokens: statsRow.total_tokens || 0,
        totalRewards: Number(statsRow.total_rewards || 0),
        roleStats,
      },
    };
  } catch (error) {
    console.error('Error loading training logs:', error);
    return {
      logs: [],
      courses: [],
      stats: {
        totalSessions: 0,
        totalMembers: 0,
        totalTokens: 0,
        totalRewards: 0,
        roleStats: {},
      },
    };
  }
}

export default async function NhatKyDaoTaoPage() {
  const data = await getTrainingData();

  return (
    <TrainingManagement
      initialLogs={data.logs}
      initialCourses={data.courses}
      initialStats={data.stats}
    />
  );
}

