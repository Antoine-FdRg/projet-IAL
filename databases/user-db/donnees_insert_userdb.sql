-- =======================================
-- Jeu de données pour UserDB (PostgreSQL)
-- =======================================

-- 🔹 Patients
INSERT INTO patient (nss, nom, prenom, date_naissance, adresse, station_token, description)
VALUES
('2980548754123', 'Dupont', 'Alice', '1998-05-14', '12 rue des Lilas, Nice', '550e8400-e29b-41d4-a716-446655440001', '{"allergies": ["penicilline"], "pathologies": ["asthme léger"]}'),
('1011275432198', 'Martin', 'Arthur', '2001-12-27', '45 avenue Jean Médecin, Nice', '550e8400-e29b-41d4-a716-446655440002', '{"allergies": [], "pathologies": ["hypertension"]}');

-- 🔹 Externes (Docteurs, Infirmiers, Proches)
INSERT INTO externe (id, nom, prenom, tel, email, push_token)
VALUES
(gen_random_uuid(), 'Bernard', 'Paul', '+33601020304', 'paul.bernard@hopital.fr', 'PUSH123'),
(gen_random_uuid(), 'Lefevre', 'Camille', '+33698765432', 'camille.lefevre@cabinet.fr', 'PUSH456'),
(gen_random_uuid(), 'Moreau', 'Tina', '+33611112222', 'roxane.moreau@example.com', 'PUSH789');

-- Récupérer leurs UUIDs (pour info)
-- SELECT * FROM externe;

-- 🔹 Devices
INSERT INTO device (type, type_mesure)
VALUES
('Montre', ARRAY['pulse','nb_steps','temperature']::enum_type_mesure[]),
('Balance', ARRAY['weight']::enum_type_mesure[]),
('Bague', ARRAY['temperature']::enum_type_mesure[]);

-- 🔹 Relations Patient ↔ Externe
-- (Remplace les UUIDs par ceux renvoyés par SELECT * FROM externe)
INSERT INTO rel_patient_externe (id_patient, id_externe, type)
VALUES
('2980548754123', (SELECT id FROM externe WHERE nom='Bernard' AND prenom='Paul'), 'docteur'),
('2980548754123', (SELECT id FROM externe WHERE nom='Moreau' AND prenom='Tina'), 'proche'),
('1011275432198', (SELECT id FROM externe WHERE nom='Lefevre' AND prenom='Camille'), 'infirmier'),
('1011275432198', (SELECT id FROM externe WHERE nom='Bernard' AND prenom='Paul'), 'proche');

-- 🔹 Relations Patient ↔ Device
INSERT INTO rel_patient_device (id_patient, type_device)
VALUES
('2980548754123', 'Montre'),
('2980548754123', 'Balance'),
('1011275432198', 'Bague');

-- 🔹 Notifications docteurs
INSERT INTO doctor_notif (id_patient, reason)
VALUES
('2980548754123', 'Anomalie de fréquence cardiaque détectée'),
('1011275432198', 'Poids instable depuis 2 semaines');
