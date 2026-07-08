// Paste this whole file into the DevTools console on https://racecenter.letour.fr/en/
// during a live stage to record real telemetry as a replay fixture.
//   rcSave() -> copies the fixture JSON to the clipboard (paste into public/fixtures/<name>.json)
//   rcStop() -> stops recording
(() => {
  const events = [];
  let last = Date.now();
  const es = new EventSource('/live-stream');
  es.addEventListener('update', (e) => {
    const now = Date.now();
    events.push({ dt: now - last, data: e.data });
    last = now;
    if (events.length % 60 === 0) console.log(`[rc] ${events.length} updates recorded`);
  });
  window.rcStop = () => {
    es.close();
    console.log(`[rc] stopped at ${events.length} updates`);
  };
  window.rcSave = () => {
    copy(JSON.stringify(events));
    console.log(`[rc] ${events.length} updates copied to clipboard`);
  };
  console.log('[rc] recording /live-stream — rcSave() to copy, rcStop() to stop');
})();
