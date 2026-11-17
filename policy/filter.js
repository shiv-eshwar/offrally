// Loaded only in the isolated remote browser, with JSON configuration supplied by native code.
(function install(config, flags) {
  if (!config.hosts.includes(location.hostname) || window.__offrallyFilter) return;
  window.__offrallyFilter = true;
  const rules = Object.entries(config.rules).filter(([id]) => flags[id]).map(([, rule]) => rule);
  const selectors = rules.flatMap(rule => rule.css);
  function redirect(url) {
    if (!config.hosts.includes(url.hostname)) return null;
    const rule = rules.find(rule => rule.paths.some(p => url.pathname === p || (p !== '/' && url.pathname.startsWith(p + '/'))));
    return rule ? (rule.fallback || (flags.home && config.rules.home?.fallback) || config.home) : null;
  }
  function check() {
    const next = redirect(new URL(location.href));
    if (next) location.replace(next);
  }
  function style() {
    if (!document.documentElement || document.getElementById('offrally-filter')) return;
    const sheet = document.createElement('style');
    sheet.id = 'offrally-filter';
    // Separate rules allow older WebViews to skip unsupported selectors individually.
    sheet.textContent = selectors.map(s => s + '{display:none!important}').join('\n');
    (document.head || document.documentElement).appendChild(sheet);
  }
  style();
  document.addEventListener('DOMContentLoaded', style, {once:true});
  document.addEventListener('click', event => {
    const link = event.composedPath().find(node => node instanceof HTMLAnchorElement && node.href);
    if (link && redirect(new URL(link.href))) {event.preventDefault();event.stopImmediatePropagation();}
  }, true);
  window.addEventListener('popstate', check);
  document.addEventListener('yt-navigate-finish', check);
  // A location-only poll also covers frameworks that retain private references to pushState.
  let previous = '';
  setInterval(() => {if (location.href !== previous) {previous = location.href;check();} style();}, 250);
  check();
})
