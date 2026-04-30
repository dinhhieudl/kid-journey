/**
 * Montessori tracking service
 * Progress tracking, weekly plan generation, statistics
 * @module services/MontessoriService
 */
const MontessoriRepository = require('../repositories/MontessoriRepository');
const montessori = require('../../montessori');

/**
 * Get progress overview for a kid
 * Merges all age-appropriate activities with their progress records
 * @param {number} kidId
 * @param {string} birthday - YYYY-MM-DD
 * @returns {{ activities: object[], stats: object, percentage: number }}
 */
function getProgress(kidId, birthday) {
  const allActivities = montessori.getAllActivities(birthday);
  const progressRecords = MontessoriRepository.getProgressByKidId(kidId);

  const progressMap = {};
  progressRecords.forEach((p) => { progressMap[p.activity_key] = p; });

  const activities = allActivities.map((act) => ({
    key: act.key,
    ageMin: act.ageMin,
    ageMax: act.ageMax,
    category: act.category,
    title: act.title,
    desc: act.desc,
    materials: act.materials,
    duration: act.duration,
    icon: act.icon,
    progress: progressMap[act.key] || {
      status: 'not_started',
      completed_at: null,
      notes: null,
      evidence_photo: null,
    },
  }));

  const total = activities.length;
  const completed = activities.filter((a) => a.progress.status === 'completed').length;
  const inProgress = activities.filter((a) => a.progress.status === 'in_progress').length;

  return {
    activities,
    stats: { total, completed, inProgress, notStarted: total - completed - inProgress },
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Update progress for a specific activity
 * @param {object} params
 * @param {number} params.kid_id
 * @param {string} params.activity_key
 * @param {string} params.status - 'not_started' | 'in_progress' | 'completed'
 * @param {string} [params.notes]
 * @param {string} [params.evidence_photo]
 */
function updateProgress({ kid_id, activity_key, status, notes, evidence_photo }) {
  const completed_at = status === 'completed' ? new Date().toISOString() : null;
  MontessoriRepository.upsertProgress({
    kid_id,
    activity_key,
    status,
    completed_at,
    notes,
    evidence_photo,
  });
}

/**
 * Get the current week's Monday as YYYY-MM-DD
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Get weekly plan for a kid
 * @param {number} kidId
 * @param {string} [weekStart] - Defaults to current week
 * @returns {{ weekStart: string, plans: object[] }}
 */
function getWeeklyPlan(kidId, weekStart) {
  const ws = weekStart || getWeekStart();
  const plans = MontessoriRepository.getWeeklyPlan(kidId, ws);
  return { weekStart: ws, plans };
}

/**
 * Auto-generate a weekly plan from uncompleted activities
 * Selects activities balanced across categories
 * @param {number} kidId
 * @param {string} birthday
 * @param {number} [count=6] - Number of activities to plan
 * @returns {{ weekStart: string, count: number }}
 */
function generateWeeklyPlan(kidId, birthday, count = 6) {
  const weekStart = getWeekStart();
  const allActivities = montessori.getAllActivities(birthday);
  const completedKeys = MontessoriRepository.getCompletedKeys(kidId);

  const available = allActivities.filter((a) => !completedKeys.includes(a.key));
  const selected = selectBalancedActivities(available, count);

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const entries = selected.map((act, i) => ({
    activity_key: act.key,
    planned_day: days[i % 7],
  }));

  // Delete old plan for this week
  MontessoriRepository.deleteWeeklyPlan(kidId, weekStart);

  // Insert new plan
  if (entries.length > 0) {
    MontessoriRepository.insertWeeklyPlan(kidId, weekStart, entries);
  }

  return { weekStart, count: entries.length };
}

/**
 * Select activities balanced across categories
 * @param {object[]} activities
 * @param {number} count
 * @returns {object[]}
 */
function selectBalancedActivities(activities, count) {
  if (activities.length <= count) return [...activities];

  // Group by category
  const byCategory = {};
  for (const act of activities) {
    if (!byCategory[act.category]) byCategory[act.category] = [];
    byCategory[act.category].push(act);
  }

  const categories = Object.keys(byCategory);
  const selected = [];
  let catIndex = 0;

  while (selected.length < count) {
    const cat = categories[catIndex % categories.length];
    const pool = byCategory[cat];
    if (pool && pool.length > 0) {
      // Pick random from this category
      const randIdx = Math.floor(Math.random() * pool.length);
      selected.push(pool.splice(randIdx, 1)[0]);
    }
    catIndex++;
    // Safety: break if all categories exhausted
    if (catIndex > categories.length * count) break;
  }

  return selected;
}

/**
 * Get stage-level progress statistics
 * @param {number} kidId
 * @param {string} birthday
 * @returns {object[]}
 */
function getStageProgress(kidId, birthday) {
  const allActivities = montessori.getAllActivities(birthday);
  const progressRecords = MontessoriRepository.getProgressByKidId(kidId);
  const progressMap = {};
  progressRecords.forEach((p) => { progressMap[p.activity_key] = p; });

  // Group by age range (stage)
  const stages = {};
  for (const act of allActivities) {
    const stageKey = `${act.ageMin}-${act.ageMax}`;
    if (!stages[stageKey]) stages[stageKey] = { ageMin: act.ageMin, ageMax: act.ageMax, total: 0, completed: 0 };
    stages[stageKey].total++;
    if (progressMap[act.key] && progressMap[act.key].status === 'completed') {
      stages[stageKey].completed++;
    }
  }

  return Object.values(stages).map((s) => ({
    ...s,
    percentage: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
  }));
}

module.exports = {
  getProgress, updateProgress, getWeekStart,
  getWeeklyPlan, generateWeeklyPlan, getStageProgress,
};
