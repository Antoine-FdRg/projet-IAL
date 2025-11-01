import 'dotenv/config';

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'http://localhost:3000/ingest';
const SEND_INTERVAL_MS = Number(process.env.SEND_INTERVAL_MS || 30000);
const SOURCE_ID = process.env.SOURCE_ID || 'mock-watch-1';
const DEVICE_TYPE = process.env.DEVICE_TYPE || 'watch';

let stepCounter = 0;
let lastStepTick = Date.now();
let currentWeight = Number(process.env.INIT_WEIGHT_KG || 70.5);

async function postMeasurement(measurement) {
  const body = {
    payload: measurement,        // 👈 enveloppe attendue par ton IngestSchema
    source: SOURCE_ID,           // optionnel mais utile pour filtrer
    type: DEVICE_TYPE            // optionnel (type global du message)
  };

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

// Générateurs (identiques à avant, timestamp ISO OK pour zod .datetime())
function genPulse() {
  const base = 65 + Math.sin(Date.now() / 60000) * 15;
  const noise = (Math.random() - 0.5) * 20;
  const value = Math.max(45, Math.min(150, Math.round(base + noise)));
  return { type: 'pulse', value, unit: 'bpm', timestamp: new Date().toISOString() };
}

function genTemperature() {
  const base = 34.5 + Math.sin(Date.now() / 3600000) * 0.6;
  const noise = (Math.random() - 0.5) * 0.4;
  const value = +(base + noise).toFixed(1);
  return { type: 'temperature', value, unit: '°C', timestamp: new Date().toISOString() };
}

function genSteps() {
  const now = Date.now();
  const elapsed = now - lastStepTick;
  lastStepTick = now;
  const activePhase = (Math.sin(now / 300000) + 1) / 2;
  const stepsPerMinute = activePhase > 0.6 ? 120 : activePhase > 0.3 ? 40 : 0;
  const stepsThisTick = Math.round((stepsPerMinute / 60000) * elapsed * (0.7 + Math.random() * 0.6));
  stepCounter += Math.max(0, stepsThisTick);
  return { type: 'steps', value: stepCounter, unit: 'steps', timestamp: new Date().toISOString() };
}

function genWeight() {
  const drift = (Math.random() - 0.5) * 0.04;
  currentWeight = +(currentWeight + drift).toFixed(2);
  return { type: 'weight', value: currentWeight, unit: 'kg', timestamp: new Date().toISOString() };
}

async function sendBatch() {
  const batch = [genPulse(), genTemperature(), genSteps(), genWeight()];
  for (const m of batch) await postMeasurement(m);
}

console.log(`▶ Mock Watch — ${SOURCE_ID} — envoi chaque ${SEND_INTERVAL_MS/1000}s vers ${ENDPOINT_URL}`);
sendBatch();
const timer = setInterval(sendBatch, SEND_INTERVAL_MS);
process.on('SIGINT', () => { clearInterval(timer); console.log('\n🛑 Stop.'); process.exit(0); });
