import 'dotenv/config';

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'http://localhost:2000/ingest';
const OTHERS_INTERVAL_MS = Number(process.env.SEND_INTERVAL_MS || 15000); 
const PULSE_INTERVAL_MS = Number(process.env.PULSE_INTERVAL_MS || 5000);   
const SOURCE_ID = process.env.SOURCE_ID || 'mock-watch-1';
const DEVICE_TYPE = process.env.DEVICE_TYPE || 'watch';

let stepCounter = 0;
let lastStepTick = Date.now();
let currentWeight = Number(process.env.INIT_WEIGHT_KG || 70.5);

// Compteur global pour cycler entre les scénarios
let scenarioCounter = 0;

// Types de scénarios pour démonstration de la pipeline
const SCENARIOS = {
  NORMAL: 'normal',           // 70% - Données valides normales
  NORMALIZE: 'normalize',     // 15% - Données nécessitant normalisation
  OUTLIER_VALID: 'outlier_valid',  // 8% - Outliers limites mais valides
  OUTLIER_REJECT: 'outlier_reject', // 3% - Outliers rejetés
  MALFORMED: 'malformed',     // 2% - Données malformées
  ERROR: 'error'              // 2% - Erreurs simulées
};

// Distribution des scénarios (total = 100)
const SCENARIO_DISTRIBUTION = [
  ...Array(70).fill(SCENARIOS.NORMAL),
  ...Array(15).fill(SCENARIOS.NORMALIZE),
  ...Array(8).fill(SCENARIOS.OUTLIER_VALID),
  ...Array(3).fill(SCENARIOS.OUTLIER_REJECT),
  ...Array(2).fill(SCENARIOS.MALFORMED),
  ...Array(2).fill(SCENARIOS.ERROR),
];

function getNextScenario() {
  const scenario = SCENARIO_DISTRIBUTION[scenarioCounter % SCENARIO_DISTRIBUTION.length];
  scenarioCounter++;
  return scenario;
}

function rnd(min, max) {
  return Math.random() * (max - min) + min;
}

function maybeSimulatedError() {
  const scenario = getNextScenario();
  if (scenario === SCENARIOS.ERROR) {
    const errorMessages = [
      "Bluetooth connection lost",
      "Device timeout",
      "Low signal strength",
      "Authentication failed",
      "Service discovery failed",
    ];
    return {
      type: "error",
      error: errorMessages[Math.floor(Math.random() * errorMessages.length)],
      timestamp: new Date().toISOString(),
    };
  }
  return null;
}

function generateScenarioBasedMeasurement(targetType) {
  const scenario = getNextScenario();

  // Gestion des erreurs et malformations
  if (scenario === SCENARIOS.ERROR) {
    return maybeSimulatedError();
  }

  if (scenario === SCENARIOS.MALFORMED) {
    return generateMalformedMeasurement(targetType);
  }

  // Génération de mesures valides selon le scénario
  switch (scenario) {
    case SCENARIOS.NORMAL:
      return generateNormalMeasurement(targetType);

    case SCENARIOS.NORMALIZE:
      return generateNormalizableMeasurement(targetType);

    case SCENARIOS.OUTLIER_VALID:
      return generateOutlierValidMeasurement(targetType);

    case SCENARIOS.OUTLIER_REJECT:
      return generateOutlierRejectMeasurement(targetType);

    default:
      return generateNormalMeasurement(targetType);
  }
}

// Données normales réalistes
function generateNormalMeasurement(type) {
  const configs = {
    temperature: { value: rnd(36, 38), unit: '°C' },
    weight: { value: rnd(68, 72), unit: 'kg' },
    pulse: { value: rnd(60, 90), unit: 'bpm' },
  };

  const config = configs[type];
  if (!config) return null;

  return {
    type,
    value: Math.round(config.value * 100) / 100,
    unit: config.unit,
    timestamp: new Date().toISOString(),
  };
}

// Données nécessitant normalisation (lbs→kg, °F→°C, bps→bpm)
function generateNormalizableMeasurement(type) {
  const configs = {
    temperature: { value: rnd(96, 100), unit: '°F' }, // → 35.5-37.7°C
    weight: { value: rnd(150, 160), unit: 'lbs' },    // → 68-72 kg
    pulse: { value: rnd(1, 1.5), unit: 'bps' },       // → 60-90 bpm
  };

  const config = configs[type];
  if (!config) return generateNormalMeasurement(type);

  return {
    type,
    value: Math.round(config.value * 100) / 100,
    unit: config.unit,
    timestamp: new Date().toISOString(),
  };
}

// Outliers limites mais valides (à la frontière des seuils)
function generateOutlierValidMeasurement(type) {
  const configs = {
    temperature: [
      { value: 32.5, unit: '°C' },  // Limite basse
      { value: 41.5, unit: '°C' },  // Limite haute
    ],
    weight: [
      { value: 20, unit: 'kg' },    // Limite basse
      { value: 120, unit: 'kg' },   // Valeur haute mais valide
    ],
    pulse: [
      { value: 45, unit: 'bpm' },   // Bradycardie
      { value: 245, unit: 'bpm' },  // Tachycardie extrême mais valide
    ],
  };

  const options = configs[type];
  if (!options) return generateNormalMeasurement(type);

  const selected = options[Math.floor(Math.random() * options.length)];
  return {
    type,
    value: selected.value,
    unit: selected.unit,
    timestamp: new Date().toISOString(),
  };
}

// Outliers rejetés (hors des seuils du filtre)
function generateOutlierRejectMeasurement(type) {
  const configs = {
    temperature: [
      { value: 25, unit: '°C' },    // < 32°C → rejeté
      { value: 50, unit: '°C' },    // > 42°C → rejeté
    ],
    weight: [
      { value: 5, unit: 'kg' },     // < 15 kg → rejeté
      { value: 600, unit: 'kg' },   // > 500 kg → rejeté
    ],
    pulse: [
      { value: 300, unit: 'bpm' },  // > 250 bpm → rejeté
      { value: 400, unit: 'bpm' },  // > 250 bpm → rejeté
    ],
  };

  const options = configs[type];
  if (!options) return generateNormalMeasurement(type);

  const selected = options[Math.floor(Math.random() * options.length)];
  return {
    type,
    value: selected.value,
    unit: selected.unit,
    timestamp: new Date().toISOString(),
  };
}

// Données malformées (pour tester le cleaner)
function generateMalformedMeasurement(type) {
  const malformations = [
    // value manquant ou invalide
    () => ({ type, unit: 'kg', timestamp: new Date().toISOString() }),
    () => ({ type, value: null, unit: 'kg', timestamp: new Date().toISOString() }),
    () => ({ type, value: 'invalid', unit: 'kg', timestamp: new Date().toISOString() }),

    // type manquant ou invalide
    () => ({ value: 70, unit: 'kg', timestamp: new Date().toISOString() }),
    () => ({ type: '', value: 70, unit: 'kg', timestamp: new Date().toISOString() }),
    () => ({ type: 123, value: 70, unit: 'kg', timestamp: new Date().toISOString() }),

    // timestamp invalide
    () => ({ type, value: 70, unit: 'kg', timestamp: 'invalid-date' }),
    () => ({ type, value: 70, unit: 'kg', timestamp: '' }),

    // unit manquant
    () => ({ type, value: 70, timestamp: new Date().toISOString() }),
  ];

  const malformation = malformations[Math.floor(Math.random() * malformations.length)];
  return malformation();
}

// steps reste cumulatif (logique “montre”), mais on peut toujours injecter un peu d’aléa
function genSteps() {
  const now = Date.now();
  const elapsed = now - lastStepTick;
  lastStepTick = now;
  const activePhase = (Math.sin(now / 300000) + 1) / 2; // 0..1 ~5 min cycles
  const stepsPerMinute = activePhase > 0.6 ? 120 : activePhase > 0.3 ? 40 : 0;
  const stepsThisTick = Math.round((stepsPerMinute / 60000) * elapsed * (0.7 + Math.random() * 0.6));
  stepCounter += Math.max(0, stepsThisTick);
  return { type: 'steps', value: stepCounter, unit: 'steps', timestamp: new Date().toISOString() };
}

// Poids: version scénarisée avec légère dérive pour les mesures normales
function genWeightScenarioBased() {
  const measurement = generateScenarioBasedMeasurement('weight');

  // Si c'est une mesure normale, on peut appliquer la dérive
  if (measurement && measurement.unit === 'kg' && measurement.value >= 60 && measurement.value <= 80) {
    const drift = (Math.random() - 0.5) * 0.04; // ±40g
    currentWeight = +(currentWeight + drift).toFixed(2);
    return { type: 'weight', value: currentWeight, unit: 'kg', timestamp: new Date().toISOString() };
  }

  // Sinon, on utilise la mesure scénarisée directement
  return measurement;
}

// envoi HTTP
async function postMeasurement(measurement) {
  const body = { payload: measurement, source: SOURCE_ID, type: DEVICE_TYPE };
  try {
    const res = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    console.log(`[OK] ${measurement.type} -> ${measurement.value} ${measurement.unit} | ${text}`);
  } catch (err) {
    console.error(`[ERR] ${measurement.type}: ${err.message}`);
  }
}

// boucle 30s : temperature, weight, steps
async function sendOthersBatch() {
  // erreur Bluetooth simulée
  const errEvt = maybeSimulatedError();
  if (errEvt) {
    await postMeasurement(errEvt);
    console.warn(`[SIM ERR] ${errEvt.error} @ ${errEvt.timestamp}`);
    return;
  }

  // température selon le système de scénarios
  const temp = generateScenarioBasedMeasurement('temperature');

  // poids avec dérive pour les mesures normales
  const weight = genWeightScenarioBased();

  // steps cumulatif (conservé tel quel)
  const steps = genSteps();

  // envois sérialisés
  for (const m of [temp, weight, steps]) {
    if (m) {
      await postMeasurement(m);
    } else {
      console.warn(`[SKIP] Measurement skipped (null or malformed)`);
    }
  }
}

// boucle 5s : pulse
async function sendPulse() {
  // erreur Bluetooth simulée
  const errEvt = maybeSimulatedError();
  if (errEvt) {
    await postMeasurement(errEvt);
    console.warn(`[SIM ERR] ${errEvt.error} @ ${errEvt.timestamp}`);
    return;
  }

  const pulse = generateScenarioBasedMeasurement('pulse');
  if (pulse) {
    await postMeasurement(pulse);
  } else {
    console.warn(`[SKIP] Pulse measurement skipped (null or malformed)`);
  }
}

console.log(`▶ Mock Watch — ${SOURCE_ID}`);
console.log(`   • Pulse toutes ${PULSE_INTERVAL_MS/1000}s`);
console.log(`   • Temp/Weight/Steps toutes ${OTHERS_INTERVAL_MS/1000}s`);
console.log(`   → ${ENDPOINT_URL}`);

sendOthersBatch(); // kickstart
sendPulse();       // kickstart

const tOthers = setInterval(sendOthersBatch, OTHERS_INTERVAL_MS);
const tPulse  = setInterval(sendPulse, PULSE_INTERVAL_MS);

process.on('SIGINT', () => {
  clearInterval(tOthers);
  clearInterval(tPulse);
  console.log('\n🛑 Stop.');
  process.exit(0);
});
