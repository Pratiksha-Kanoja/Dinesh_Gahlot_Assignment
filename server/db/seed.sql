INSERT INTO boards (id, name, created_at)
VALUES (1, 'Product Launch', '2026-08-12 09:00:00');

INSERT INTO columns (id, board_id, name, position, created_at)
VALUES
  (1, 1, 'To Do', 1, '2026-08-12 09:01:00'),
  (2, 1, 'In Progress', 2, '2026-08-12 09:02:00'),
  (3, 1, 'Done', 3, '2026-08-12 09:03:00');

INSERT INTO tasks (id, column_id, title, description, priority, created_at, updated_at)
VALUES
  (1, 1, 'Draft launch checklist', 'Outline the must-have launch tasks for the team.', 'High', '2026-08-12 10:00:00', '2026-08-12 10:00:00'),
  (2, 1, 'Collect stakeholder notes', 'Add comments from the sales and support teams.', 'Medium', '2026-08-12 10:15:00', '2026-08-12 10:15:00'),
  (3, 2, 'Review onboarding flow', 'Check copy, links, and empty states before release.', 'High', '2026-08-12 11:00:00', '2026-08-12 11:00:00'),
  (4, 3, 'Create project board', 'Seed the starter board with useful example work.', 'Low', '2026-08-12 11:30:00', '2026-08-12 11:30:00');
