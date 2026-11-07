/* Multi-student parent dashboard: shows comparative stats between multiple learners (e.g., พอใจ and นาโน) */
(() => {
'use strict';

function compute({students, trackers, config, today, subjectsInOrder}) {
  if (!Array.isArray(students) || !Array.isArray(trackers)) return null;

  // compute() is from parent-dashboard.js - reuse it for each student
  const results = students.map((studentEmail, i) => {
    const tracker = trackers[i];
    if (!tracker) return null;
    try {
      return {
        email: studentEmail,
        ...window.ParentDashboard?.compute?.({config, tracker, today, subjectsInOrder})
      };
    } catch (_) { return null; }
  }).filter(x => x);

  if (!results.length) return null;

  // Comparative metrics
  return {
    students: results,
    comparison: {
      overall: results.map(r => ({email: r.email, ...r.overall})),
      exams: results.map(r => ({email: r.email, count: r.exams?.count || 0, average: r.exams?.average || null}))
    }
  };
}

function render(root, data) {
  if (!root || !data) return;
  root.textContent = '';

  const container = document.createElement('div');
  container.className = 'parent-multi-dashboard';

  // Title
  const title = document.createElement('h2');
  title.textContent = 'ความคืบหน้าของผู้เรียน';
  container.append(title);

  // Student comparison cards
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'student-cards';

  data.students.forEach(student => {
    const card = document.createElement('article');
    card.className = 'student-card';

    const name = student.email.split('@')[0];
    const progress = student.overall;

    const cardTitle = document.createElement('h3');
    cardTitle.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    card.append(cardTitle);

    const stats = document.createElement('div');
    stats.className = 'student-stats';

    const percent = document.createElement('div');
    percent.className = 'stat-percent';
    percent.textContent = progress.percent + '%';

    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = progress.done + '/' + progress.total + ' ภารกิจ';

    stats.append(percent, label);
    card.append(stats);

    cardsContainer.append(card);
  });

  container.append(cardsContainer);
  root.append(container);
}

window.ParentMultiDashboard = {compute, render};
})();
