CREATE DATABASE IF NOT EXISTS hospital_management;
USE hospital_management;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('patient','doctor','receptionist','admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  name VARCHAR(100) NOT NULL,
  age INT,
  gender ENUM('male','female','other'),
  contact VARCHAR(20),
  address TEXT,
  blood_group VARCHAR(5),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  name VARCHAR(100) NOT NULL,
  specialization VARCHAR(100),
  timing_start TIME,
  timing_end TIME,
  contact VARCHAR(20),
  status ENUM('active','on_leave') DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  designation VARCHAR(100) NOT NULL,
  joining_date DATE,
  shift_start TIME,
  shift_end TIME,
  status ENUM('active','inactive') DEFAULT 'active',
  added_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (added_by) REFERENCES users(id)
);

CREATE TABLE employee_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  can_register_patient TINYINT(1) DEFAULT 1,
  can_schedule_appointment TINYINT(1) DEFAULT 1,
  can_checkin_patient TINYINT(1) DEFAULT 1,
  can_collect_billing TINYINT(1) DEFAULT 1,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appt_date DATE NOT NULL,
  appt_time TIME NOT NULL,
  reason VARCHAR(255),
  status ENUM('requested','confirmed','checked_in','in_progress','completed','cancelled') DEFAULT 'requested',
  checked_in_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  diagnosis TEXT,
  medicine VARCHAR(150),
  dosage VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

CREATE TABLE billing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  appointment_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','paid') DEFAULT 'pending',
  payment_method ENUM('cash','card','upi') NULL,
  collected_by INT NULL,
  receipt_no VARCHAR(30),
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (collected_by) REFERENCES employees(id)
);

CREATE TABLE hospital_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hospital_name VARCHAR(150),
  address TEXT,
  phone VARCHAR(20),
  gstin VARCHAR(20)
);

CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  description TEXT,
  UNIQUE KEY unique_role_permission (role, permission)
);

CREATE TABLE feature_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feature_name VARCHAR(100) UNIQUE NOT NULL,
  is_enabled TINYINT(1) DEFAULT 0,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address TEXT,
  contact_email VARCHAR(150),
  contact_phone VARCHAR(20),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);


CREATE TABLE departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE patient_vitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  recorded_by INT NOT NULL,
  appointment_id INT NULL,
  temperature DECIMAL(5,2),
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  pulse INT,
  respiratory_rate INT,
  oxygen_saturation DECIMAL(5,2),
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  notes TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

CREATE TABLE nursing_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  nurse_id INT NOT NULL,
  appointment_id INT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (nurse_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

CREATE TABLE nursing_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  assigned_nurse_id INT NULL,
  task_type VARCHAR(100),
  description TEXT,
  priority ENUM('low', 'medium', 'high', 'emergency') DEFAULT 'medium',
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  due_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (assigned_nurse_id) REFERENCES users(id)
);

-- Pharmacy Tables
CREATE TABLE medicine_category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medicine (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  generic_name VARCHAR(150),
  category_id INT NOT NULL,
  unit VARCHAR(50),
  description TEXT,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES medicine_category(id)
);

CREATE TABLE purchase (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  purchase_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'received', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES supplier(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE purchase_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  medicine_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INT NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchase(id),
  FOREIGN KEY (medicine_id) REFERENCES medicine(id)
);

CREATE TABLE medicine_batch (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medicine_id INT NOT NULL,
  supplier_id INT,
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  available_quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_medicine_batch_number (medicine_id, batch_number),
  FOREIGN KEY (medicine_id) REFERENCES medicine(id),
  FOREIGN KEY (supplier_id) REFERENCES supplier(id),
  CHECK (quantity >= 0),
  CHECK (available_quantity >= 0 AND available_quantity <= quantity)
);

CREATE TABLE stock_transaction (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medicine_id INT NOT NULL,
  batch_id INT NOT NULL,
  transaction_type ENUM('purchase', 'dispense', 'adjustment', 'return') NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(255),
  reference_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  FOREIGN KEY (medicine_id) REFERENCES medicine(id),
  FOREIGN KEY (batch_id) REFERENCES medicine_batch(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE dispensing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT NOT NULL,
  patient_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('completed', 'voided') NOT NULL DEFAULT 'completed',
  dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dispensed_by INT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dispensing_prescription (prescription_id),
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (dispensed_by) REFERENCES users(id)
);

CREATE TABLE dispensing_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dispensing_id INT NOT NULL,
  medicine_id INT NOT NULL,
  batch_id INT NOT NULL,
  quantity INT NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (dispensing_id) REFERENCES dispensing(id),
  FOREIGN KEY (medicine_id) REFERENCES medicine(id),
  FOREIGN KEY (batch_id) REFERENCES medicine_batch(id)
);

CREATE TABLE pharmacy_prescription_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT NOT NULL,
  status ENUM('verified', 'rejected', 'ready_for_dispensing', 'dispensed') NOT NULL,
  rejection_reason TEXT,
  verified_by INT,
  verified_at TIMESTAMP NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pharmacy_review_prescription (prescription_id),
  INDEX ix_pharmacy_review_status_updated (status, updated_at),
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
  FOREIGN KEY (verified_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Laboratory Tables
CREATE TABLE lab_test_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE lab_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  FOREIGN KEY (category_id) REFERENCES lab_test_categories(id)
);

CREATE TABLE lab_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_id INT NULL,
  assigned_technician_id INT NULL,
  instructions TEXT,
  priority ENUM('routine', 'urgent', 'stat') NOT NULL DEFAULT 'routine',
  accepted_at TIMESTAMP NULL,
  ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('ordered', 'sample_collected', 'processing', 'completed', 'cancelled') DEFAULT 'ordered',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX ix_lab_orders_assignee_status (assigned_technician_id, status),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (assigned_technician_id) REFERENCES users(id)
);

CREATE TABLE lab_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  test_id INT NOT NULL,
  status ENUM('ordered', 'sample_collected', 'processing', 'completed', 'cancelled') DEFAULT 'ordered',
  UNIQUE KEY uq_lab_order_test (order_id, test_id),
  FOREIGN KEY (order_id) REFERENCES lab_orders(id),
  FOREIGN KEY (test_id) REFERENCES lab_tests(id)
);

CREATE TABLE lab_samples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT NOT NULL,
  sample_type VARCHAR(100),
  barcode VARCHAR(100) UNIQUE,
  collected_by INT NOT NULL,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('collected', 'processing', 'rejected', 'completed') DEFAULT 'collected',
  FOREIGN KEY (order_item_id) REFERENCES lab_order_items(id),
  FOREIGN KEY (collected_by) REFERENCES users(id)
);

CREATE TABLE lab_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT NOT NULL,
  technician_id INT NOT NULL,
  result_value TEXT,
  numeric_value DECIMAL(18,6),
  unit VARCHAR(50),
  reference_range VARCHAR(100),
  remarks TEXT,
  status ENUM('draft', 'finalized') DEFAULT 'draft',
  finalized_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lab_result_order_item (order_item_id),
  FOREIGN KEY (order_item_id) REFERENCES lab_order_items(id),
  FOREIGN KEY (technician_id) REFERENCES users(id)
);

CREATE TABLE lab_result_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  result_id INT NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (result_id) REFERENCES lab_results(id)
);

-- Radiology Tables
CREATE TABLE radiology_modalities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active'
);

CREATE TABLE radiology_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_id INT NULL,
  modality_id INT NOT NULL,
  body_part VARCHAR(150),
  clinical_notes TEXT,
  priority ENUM('routine', 'urgent', 'stat') DEFAULT 'routine',
  status ENUM('ordered', 'scheduled', 'performed', 'reporting', 'verified', 'cancelled') DEFAULT 'ordered',
  ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (modality_id) REFERENCES radiology_modalities(id)
);

CREATE TABLE radiology_studies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  study_identifier VARCHAR(150) UNIQUE NOT NULL,
  storage_reference VARCHAR(255),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  technician_id INT NULL,
  FOREIGN KEY (order_id) REFERENCES radiology_orders(id),
  FOREIGN KEY (technician_id) REFERENCES users(id)
);

CREATE TABLE radiology_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  study_id INT NOT NULL,
  radiologist_id INT NOT NULL,
  findings TEXT,
  impression TEXT,
  recommendations TEXT,
  status ENUM('draft', 'verified') DEFAULT 'draft',
  version INT DEFAULT 1,
  parent_report_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  FOREIGN KEY (study_id) REFERENCES radiology_studies(id),
  FOREIGN KEY (radiologist_id) REFERENCES users(id),
  FOREIGN KEY (parent_report_id) REFERENCES radiology_reports(id)
);

-- Financial / Accountant Tables
CREATE TABLE expense_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  incurred_date DATE NOT NULL,
  recorded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE TABLE financial_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_type ENUM('payment', 'refund', 'expense') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference_id INT, -- Can link to billing.id or expenses.id
  payment_method VARCHAR(50),
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recorded_by INT NOT NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE TABLE refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  processed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES financial_transactions(id),
  FOREIGN KEY (processed_by) REFERENCES users(id)
);

CREATE TABLE daily_closings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  closing_date DATE UNIQUE NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_refunds DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  closed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (closed_by) REFERENCES users(id)
);

-- Insurance Tables
CREATE TABLE insurance_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_info TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active'
);

CREATE TABLE insurance_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  provider_id INT NOT NULL,
  policy_number VARCHAR(100) NOT NULL,
  coverage_start DATE NOT NULL,
  coverage_end DATE NOT NULL,
  coverage_limit DECIMAL(10,2),
  status ENUM('active', 'expired', 'suspended') DEFAULT 'active',
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (provider_id) REFERENCES insurance_providers(id)
);

CREATE TABLE insurance_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  policy_id INT NOT NULL,
  billing_id INT NULL,
  amount_claimed DECIMAL(10,2) NOT NULL,
  status ENUM('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'settled', 'cancelled') DEFAULT 'draft',
  officer_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (policy_id) REFERENCES insurance_policies(id),
  FOREIGN KEY (billing_id) REFERENCES billing(id),
  FOREIGN KEY (officer_id) REFERENCES users(id)
);

CREATE TABLE insurance_claim_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  claim_id INT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES insurance_claims(id) ON DELETE CASCADE
);

CREATE TABLE insurance_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  claim_id INT NOT NULL,
  document_reference VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (claim_id) REFERENCES insurance_claims(id) ON DELETE CASCADE
);

CREATE TABLE insurance_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  claim_id INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  transaction_reference VARCHAR(150),
  recorded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (claim_id) REFERENCES insurance_claims(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Ambulance Management Tables
CREATE TABLE ambulances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_number VARCHAR(50) NOT NULL UNIQUE,
  vehicle_type VARCHAR(100),
  status ENUM('available', 'dispatched', 'on_route', 'arrived', 'transporting', 'completed', 'maintenance', 'unavailable') DEFAULT 'available',
  capacity INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ambulance_staff_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ambulance_id INT NOT NULL,
  staff_id INT NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ambulance_id) REFERENCES ambulances(id),
  FOREIGN KEY (staff_id) REFERENCES users(id)
);

CREATE TABLE ambulance_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NULL,
  requester_name VARCHAR(150),
  requester_contact VARCHAR(50),
  pickup_location TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'high',
  status ENUM('requested', 'approved', 'dispatched', 'accepted', 'pickup', 'transporting', 'arrived', 'completed', 'cancelled') DEFAULT 'requested',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE ambulance_trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  ambulance_id INT NOT NULL,
  status ENUM('dispatched', 'accepted', 'on_route', 'pickup', 'transporting', 'arrived', 'completed', 'cancelled') DEFAULT 'dispatched',
  start_time TIMESTAMP NULL,
  pickup_time TIMESTAMP NULL,
  arrival_time TIMESTAMP NULL,
  end_time TIMESTAMP NULL,
  FOREIGN KEY (request_id) REFERENCES ambulance_requests(id),
  FOREIGN KEY (ambulance_id) REFERENCES ambulances(id)
);

CREATE TABLE ambulance_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ambulance_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  recorded_by INT NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ambulance_id) REFERENCES ambulances(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Performance Indexes for Foreign Keys
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);

CREATE INDEX idx_prescriptions_appointment_id ON prescriptions(appointment_id);

CREATE INDEX idx_billing_patient_id ON billing(patient_id);
CREATE INDEX idx_billing_appointment_id ON billing(appointment_id);

CREATE INDEX idx_patient_vitals_patient_id ON patient_vitals(patient_id);
CREATE INDEX idx_patient_vitals_appointment_id ON patient_vitals(appointment_id);

CREATE INDEX idx_nursing_notes_patient_id ON nursing_notes(patient_id);
CREATE INDEX idx_nursing_tasks_patient_id ON nursing_tasks(patient_id);

CREATE INDEX idx_lab_orders_patient_id ON lab_orders(patient_id);
CREATE INDEX idx_lab_orders_doctor_id ON lab_orders(doctor_id);
CREATE INDEX idx_lab_orders_appointment_id ON lab_orders(appointment_id);

CREATE INDEX idx_radiology_orders_patient_id ON radiology_orders(patient_id);
CREATE INDEX idx_radiology_orders_doctor_id ON radiology_orders(doctor_id);
CREATE INDEX idx_radiology_orders_appointment_id ON radiology_orders(appointment_id);

CREATE INDEX idx_insurance_policies_patient_id ON insurance_policies(patient_id);
CREATE INDEX idx_insurance_claims_policy_id ON insurance_claims(policy_id);

CREATE INDEX idx_ambulance_requests_patient_id ON ambulance_requests(patient_id);

-- Notification Infrastructure Tables
CREATE TABLE notification_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  channel ENUM('email','sms','whatsapp','in_app') NOT NULL,
  config JSON NOT NULL COMMENT 'Provider-specific settings (no credentials hard-coded)',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  appointment_reminder BOOLEAN DEFAULT TRUE,
  prescription_ready BOOLEAN DEFAULT TRUE,
  lab_result_ready BOOLEAN DEFAULT TRUE,
  radiology_report_ready BOOLEAN DEFAULT TRUE,
  payment_receipt BOOLEAN DEFAULT TRUE,
  insurance_status BOOLEAN DEFAULT TRUE,
  emergency_dispatch BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_prefs (user_id)
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  channel ENUM('email','sms','whatsapp','in_app') NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  status ENUM('pending','sent','failed','read') DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  celery_task_id VARCHAR(255),
  entity_type VARCHAR(100),
  entity_id INT,
  error_message TEXT,
  sent_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_status (user_id, status),
  INDEX idx_notifications_celery (celery_task_id)
);
