CREATE TABLE IF NOT EXISTS records (
  entity VARCHAR(80) NOT NULL,
  record_id VARCHAR(190) NOT NULL,
  value_json LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (entity, record_id),
  KEY idx_records_entity_updated (entity, updated_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) NOT NULL,
  session_json LONGTEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_expires (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(190) NOT NULL DEFAULT '',
  username VARCHAR(190) NOT NULL DEFAULT '',
  role_name VARCHAR(80) NOT NULL DEFAULT '',
  action_name VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NOT NULL DEFAULT '',
  record_id VARCHAR(190) NOT NULL DEFAULT '',
  details_json LONGTEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_audit_created (created_at),
  KEY idx_audit_entity (entity, record_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_attempts (
  username VARCHAR(190) NOT NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  first_attempt_at DATETIME NOT NULL,
  last_attempt_at DATETIME NOT NULL,
  PRIMARY KEY (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS backups (
  id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(190) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY idx_backups_created (created_at)
) ENGINE=InnoDB;
