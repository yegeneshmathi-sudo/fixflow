-- FixFlow schema (the server also creates this automatically on start)
CREATE DATABASE IF NOT EXISTS fixflow;
USE fixflow;

CREATE TABLE IF NOT EXISTS faults (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
  reported_by VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_priority (priority)
);
