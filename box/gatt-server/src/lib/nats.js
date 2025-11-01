import { connect, JSONCodec } from "nats";

let _nc = null;
let _js = null;
const codec = JSONCodec();

async function connectNats(servers) {
  if (_nc) return _nc;
  _nc = await connect({ servers });
  _js = _nc.jetstream();
  console.log(`[nats] connected to ${servers}`);
  _nc.closed().then((err) => {
    console.log('[nats] connection closed', err ? err.message : '');
    _nc = null; _js = null;
  });
  return _nc;
}

function ensureJS() {
  if (!_js) throw new Error('JetStream not initialized');
  return _js;
}

async function publish(subject, data) {
  const js = ensureJS();
  await js.publish(subject, codec.encode(data));
}

module.exports = { connectNats, publish };
