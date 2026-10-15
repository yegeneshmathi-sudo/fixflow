USE fixflow;
INSERT INTO faults (equipment_name, location, description, priority, status, reported_by, created_at) VALUES
('Projector', 'Seminar Hall 2', 'No display output from the HDMI port. Lamp indicator keeps blinking red.', 'High', 'Open', 'Dept. of CSE', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('Ceiling Fan', 'Room B-204', 'Fan makes a loud grinding noise and wobbles at high speed.', 'Medium', 'In Progress', 'Class Rep', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('Lab PC #14', 'Computer Lab 3', 'System restarts randomly during compilation. Possible PSU problem.', 'High', 'Open', 'Lab Assistant', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
('Water Purifier', 'Ground Floor Corridor', 'Water flow is very slow and the filter light is on.', 'Low', 'Open', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
('Oscilloscope', 'Electronics Lab', 'Channel 2 shows a flat line even with a known good signal.', 'Medium', 'Resolved', 'Lab Technician', DATE_SUB(NOW(), INTERVAL 4 DAY)),
('Lathe Machine', 'Workshop Block', 'Spindle belt slipping under load. Unsafe to operate.', 'High', 'In Progress', 'Workshop In-charge', DATE_SUB(NOW(), INTERVAL 2 HOUR));
