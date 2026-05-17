// Shared logger — timestamp prefix, consistent labels across all agent-server modules.

function ts() {
  const d = new Date();
  return d.toLocaleDateString('en-CA') + ' ' + d.toTimeString().slice(0, 8);
}

export function log(label, msg)   { console.log( `${ts()} ${label.padEnd(12)} ${msg}`); }
export function err(label, msg)   { console.error(`${ts()} ${label.padEnd(12)} ${msg}`); }
export function warn(label, msg)  { console.warn( `${ts()} ${label.padEnd(12)} ${msg}`); }
