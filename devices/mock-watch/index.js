import 'dotenv/config';

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'http://localhost:3000/ingest';
const OTHERS_INTERVAL_MS = Number(process.env.SEND_INTERVAL_MS || 30000); 
const PULSE_INTERVAL_MS = Number(process.env.PULSE_INTERVAL_MS || 5000);   
const SOURCE_ID = process.env.SOURCE_ID || 'mock-watch-1';
const DEVICE_TYPE = process.env.DEVICE_TYPE || 'watch';

let stepCounter = 0;
let lastStepTick = Date.now();
let currentWeight = Number(process.env.INIT_WEIGHT_KG || 70.5);

const measurementTypes = [
  {
    type: "temperature",
    units: ["°C", "°F"],
    valueRange: { min: -10, max: 50 },
    nonsenseRange: { min: -273, max: 1000 },
  },
  {
    type: "weight",
    units: ["lbs", "kg"],
    valueRange: { min: 0, max: 200 },
    nonsenseRange: { min: -50, max: 5000 },
  },
  {
    type: "pulse",
    units: ["bps", "bpm"],
    valueRange: { min: 60, max: 120 },
    nonsenseRange: { min: 0, max: 1000 },
  },
];

function maybeSimulatedError() {
  if (Math.random() < 0.2) {
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

function rnd(min, max) {
  return Math.random() * (max - min) + min;
}

function randomMeasurementFor(targetType) {
  const conf = measurementTypes.find(m => m.type === targetType);
  if (!conf) throw new Error(`Unknown measurement type: ${targetType}`);

  const unit = conf.units[Math.floor(Math.random() * conf.units.length)];
  const isNonsenseValue = Math.random() < 0.15;
  const range = isNonsenseValue ? conf.nonsenseRange : conf.valueRange;
  const value = Math.round(rnd(range.min, range.max) * 100) / 100;

  return {
    type: targetType,
    value,
    unit,
    timestamp: new Date().toISOString(),
  };
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

// poids: on garde une légère dérive réaliste (au-delà de la logique “random” brute)
function genWeightDrifted() {
  const drift = (Math.random() - 0.5) * 0.04; // ±40g
  currentWeight = +(currentWeight + drift).toFixed(2);
  return { type: 'weight', value: currentWeight, unit: 'kg', timestamp: new Date().toISOString() };
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
  // erreur Bluetooth simulée (on logge, on n’envoie pas car le serveur refuserait)
  const errEvt = maybeSimulatedError();
  if (errEvt) {
    console.warn(`[SIM ERR] ${errEvt.error} @ ${errEvt.timestamp} (non envoyé)`);
  }

  // temperature selon la logique randomMeasurementFor
  const temp = randomMeasurementFor('temperature');

  // weight : on mélange réalisme (drift) et cas “nonsense” occasionnels
  const useDrift = Math.random() < 0.7;
  const weight = useDrift ? genWeightDrifted() : randomMeasurementFor('weight');

  // steps cumulatif
  const steps = genSteps();

  // envois sérialisés (peut être parallélisé si tu veux)
  for (const m of [temp, weight, steps]) await postMeasurement(m);
}

// boucle 5s : pulse
async function sendPulse() {
  // erreur Bluetooth simulée (non envoyée)
  const errEvt = maybeSimulatedError();
  if (errEvt) {
    console.warn(`[SIM ERR] ${errEvt.error} @ ${errEvt.timestamp} (non envoyé)`);
  }

  const pulse = randomMeasurementFor('pulse');
  await postMeasurement(pulse);
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
