/* Shared view of a subject: each PART lesson is followed by its end-of-chapter quiz. */
(() => {
  'use strict';
  const items = subject => subject.steps.flatMap(step => step.quiz ? [step, step.quiz] : [step]);
  const parentOf = (subject, id) => subject.steps.find(step => step.quiz && step.quiz.id === id) || null;
  window.Catalog = {items, parentOf};
})();
