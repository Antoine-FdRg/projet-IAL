-- =======================================
-- Schéma de données : UserDB (snake_case)
-- Compatible PostgreSQL 16–18
-- =======================================

-- 1️⃣ Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2️⃣ ENUMS
CREATE TYPE enum_type_mesure AS ENUM ('weight', 'pulse', 'temperature', 'nb_steps');
CREATE TYPE enum_type AS ENUM ('docteur', 'infirmier', 'proche');

-- 3️⃣ TABLES PRINCIPALES
CREATE TABLE patient (
    nss VARCHAR PRIMARY KEY,                     -- Numéro de sécurité sociale
    nom VARCHAR NOT NULL,
    prenom VARCHAR NOT NULL,
    date_naissance DATE NOT NULL,
    adresse VARCHAR,
    station_token VARCHAR,
    description JSON
);

CREATE TABLE externe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR NOT NULL,
    prenom VARCHAR NOT NULL,
    tel VARCHAR,
    email VARCHAR,
    push_token VARCHAR
);

CREATE TABLE device (
    type VARCHAR PRIMARY KEY,
    type_mesure enum_type_mesure[]               -- Tableau d’enums pour les types de mesures
);

-- 4️⃣ TABLES DE RELATION
CREATE TABLE doctor_notif (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_patient VARCHAR NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR,
    CONSTRAINT fk_doctor_notif_patient FOREIGN KEY (id_patient)
        REFERENCES patient(nss)
        ON DELETE CASCADE
);

CREATE TABLE rel_patient_externe (
    id_patient VARCHAR NOT NULL,
    id_externe UUID NOT NULL,
    type enum_type NOT NULL,
    PRIMARY KEY (id_patient, id_externe),
    CONSTRAINT fk_rel_patient FOREIGN KEY (id_patient)
        REFERENCES patient(nss)
        ON DELETE CASCADE,
    CONSTRAINT fk_rel_externe FOREIGN KEY (id_externe)
        REFERENCES externe(id)
        ON DELETE CASCADE
);

CREATE TABLE rel_patient_device (
    id_patient VARCHAR NOT NULL,
    type_device VARCHAR NOT NULL,
    PRIMARY KEY (id_patient, type_device),
    CONSTRAINT fk_rel_device_patient FOREIGN KEY (id_patient)
        REFERENCES patient(nss)
        ON DELETE CASCADE,
    CONSTRAINT fk_rel_device_device FOREIGN KEY (type_device)
        REFERENCES device(type)
        ON DELETE CASCADE
);
