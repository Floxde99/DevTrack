function escapeRegexLiteral(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(pattern) {
  // Only "*" wildcard is supported by design.
  const parts = pattern.split('*').map(escapeRegexLiteral);
  return new RegExp(`^${parts.join('.*')}$`, 'i');
}

function globMatch(pattern, str) {
  if (typeof pattern !== 'string' || typeof str !== 'string') return false;
  if (!pattern.includes('*')) return pattern.localeCompare(str, undefined, { sensitivity: 'accent' }) === 0;
  return globToRegex(pattern).test(str);
}

function toLowerSafe(v) {
  return typeof v === 'string' ? v.toLowerCase() : '';
}

function hostFromUrl(url) {
  if (typeof url !== 'string' || !url) return '';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isBrowserApp(appName) {
  const app = toLowerSafe(appName);
  return app === 'chrome.exe' || app === 'msedge.exe' || app === 'firefox.exe' || app === 'brave.exe' || app === 'opera.exe';
}

function isMeetingLike(appName, windowTitle) {
  if (typeof appName !== 'string') return false;
  const app = appName.toLowerCase();
  const isCommsApp = app === 'teams.exe' || app === 'msteams.exe' || app === 'zoom.exe' || app === 'discord.exe';
  if (!isCommsApp) return false;

  const title = typeof windowTitle === 'string' ? windowTitle.toLowerCase() : '';
  if (!title) return false;

  return /(\bcall\b|\bmeeting\b|\bhuddle\b|\bstandup\b|\bwebinar\b|\bjoin\b|\bvoice\b|\bvideo\b)/i.test(title);
}

function browserIntentCategory(ctx) {
  const domain = toLowerSafe(ctx?.browser_domain) || hostFromUrl(ctx?.browser_url);
  const url = toLowerSafe(ctx?.browser_url);
  const title = toLowerSafe(ctx?.window_title);
  const haystack = `${domain} ${url} ${title}`;
  if (!haystack.trim()) return null;

  const meetingHosts = ['meet.google.com', 'zoom.us', 'teams.microsoft.com', 'whereby.com'];
  const communicationHosts = [
    'mail.google.com',
    'outlook.office.com',
    'outlook.live.com',
    'calendar.google.com',
    'slack.com',
    'discord.com',
    'web.whatsapp.com',
  ];
  const codingHosts = [
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    'stackoverflow.com',
    'developer.mozilla.org',
    'npmjs.com',
    'docs.python.org',
    'readthedocs.io',
    'vercel.com',
    'linear.app',
    'jira.atlassian.com',
  ];

  if (meetingHosts.some((h) => domain === h || domain.endsWith(`.${h}`))) return 'meeting';
  if (communicationHosts.some((h) => domain === h || domain.endsWith(`.${h}`))) return 'communication';
  if (codingHosts.some((h) => domain === h || domain.endsWith(`.${h}`))) return 'coding';

  if (/\b(meet|zoom|huddle|standup|webinar|call)\b/.test(haystack)) return 'meeting';
  if (/\b(mail|inbox|outlook|gmail|calendar|slack|discord|teams|chat|message)\b/.test(haystack)) {
    return 'communication';
  }
  if (/\b(github|gitlab|pull request|merge request|stackoverflow|docs|api reference|npm|code review)\b/.test(haystack)) {
    return 'coding';
  }

  return null;
}

function communicationIntentCategory(appName, ctx) {
  const app = toLowerSafe(appName);
  const title = toLowerSafe(ctx?.window_title);
  const appLooksComms =
    app === 'outlook.exe' ||
    app === 'olk.exe' ||
    app === 'hxoutlook.exe' ||
    app === 'teams.exe' ||
    app === 'msteams.exe' ||
    app === 'slack.exe' ||
    app === 'discord.exe' ||
    app === 'thunderbird.exe';

  if (appLooksComms) return 'communication';
  if (/\b(outlook|inbox|mail|gmail|calendar|slack|discord|teams)\b/.test(title)) return 'communication';
  return null;
}

function categorize(appName, rules, ctx) {
  const safeRules = Array.isArray(rules) ? rules : [];
  const sorted = [...safeRules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of sorted) {
    if (!rule || typeof rule.app_pattern !== 'string') continue;
    if (globMatch(rule.app_pattern, appName)) {
      const base = rule.category ?? 'other';
      if (base !== 'idle' && isMeetingLike(appName, ctx?.window_title)) return 'meeting';
      if (base === 'web' && isBrowserApp(appName)) {
        const browserCategory = browserIntentCategory(ctx);
        if (browserCategory) return browserCategory;
      }
      return base;
    }
  }

  if (isBrowserApp(appName)) {
    const browserCategory = browserIntentCategory(ctx);
    if (browserCategory) return browserCategory;
  }

  if (isMeetingLike(appName, ctx?.window_title)) return 'meeting';

  const commCategory = communicationIntentCategory(appName, ctx);
  if (commCategory) return commCategory;

  return 'other';
}

function loadRules(rawRules) {
  const list = Array.isArray(rawRules) ? rawRules : [];
  return list.map((r) => ({
    app_pattern: r?.app_pattern,
    category: r?.category,
    priority: r?.priority ?? 0,
  }));
}

module.exports = { categorize, loadRules, isMeetingLike };

