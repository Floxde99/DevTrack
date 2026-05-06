const crypto = require('node:crypto');

function asStringList(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string' && x.length > 0);
}

function normalizePrivacyConfig(raw) {
  const mode = raw?.mode === 'mask' || raw?.mode === 'hash' ? raw.mode : 'off';
  const allow = raw?.allow ?? {};
  const deny = raw?.deny ?? {};
  return {
    mode,
    allow: {
      app_name: asStringList(allow.app_name),
      exe_path: asStringList(allow.exe_path),
    },
    deny: {
      app_name: asStringList(deny.app_name),
      exe_path: asStringList(deny.exe_path),
    },
  };
}

function matchesAny(needle, patterns) {
  if (typeof needle !== 'string' || needle.length === 0) return false;
  const low = needle.toLowerCase();
  for (const p of patterns) {
    if (typeof p !== 'string' || p.length === 0) continue;
    if (low.includes(p.toLowerCase())) return true;
  }
  return false;
}

function shouldProtect(ctx, cfg) {
  const app = ctx?.app_name ?? '';
  const exe = ctx?.exe_path ?? '';

  const denyHit = matchesAny(app, cfg.deny.app_name) || matchesAny(exe, cfg.deny.exe_path);
  if (denyHit) return true;

  const allowHas = cfg.allow.app_name.length > 0 || cfg.allow.exe_path.length > 0;
  if (!allowHas) return false;

  const allowHit = matchesAny(app, cfg.allow.app_name) || matchesAny(exe, cfg.allow.exe_path);
  return !allowHit;
}

function maskValue(v) {
  if (typeof v !== 'string' || v.length === 0) return '';
  return '[redacted]';
}

function hashValue(v) {
  if (typeof v !== 'string' || v.length === 0) return '';
  return crypto.createHash('sha256').update(v, 'utf8').digest('hex');
}

function protectString(value, privacyMode) {
  if (privacyMode === 'mask') return maskValue(value);
  if (privacyMode === 'hash') return hashValue(value);
  return typeof value === 'string' ? value : '';
}

function applyPrivacyToFields(ctx, fields, rawPrivacyCfg) {
  const cfg = normalizePrivacyConfig(rawPrivacyCfg);
  if (cfg.mode === 'off') return { ...fields };

  if (!shouldProtect(ctx, cfg)) return { ...fields };

  const out = { ...fields };
  for (const k of Object.keys(out)) {
    out[k] = protectString(out[k], cfg.mode);
  }
  return out;
}

module.exports = { normalizePrivacyConfig, applyPrivacyToFields, protectString };

