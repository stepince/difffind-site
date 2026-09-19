// Change this URL when the app moves to a custom domain.
const APP_URL = 'https://mydiffchecker.fly.dev';
document.querySelectorAll('[data-app-link]').forEach(link => { link.href = `${APP_URL}/`; });
document.querySelectorAll('[data-api-link]').forEach(link => { link.href = `${APP_URL}/openapi.json`; });
document.querySelector('#year').textContent = new Date().getFullYear();
const examples = {
  text: {
    before: ['Service agreement', '', 'Payment is due within <del>30 days</del>.', 'Your plan includes <del>5 projects</del>.', 'Support is available by email.'],
    after: ['Service agreement', '', 'Payment is due within <ins>15 days</ins>.', 'Your plan includes <ins>20 projects</ins>.', 'Support is available by email.'],
    insight: 'The payment window is shorter, while the project allowance increases. Two small edits that change the terms.',
    extension: 'txt'
  },
  json: {
    before: ['{', '  "plan": "team",', '  "projectLimit": <del>5</del>,', '  "retentionDays": <del>30</del>', '}'],
    after: ['{', '  "plan": "team",', '  "projectLimit": <ins>20</ins>,', '  "retentionDays": <ins>90</ins>', '}'],
    insight: 'The team plan allows more projects and retains data for longer. The plan name stays the same.',
    extension: 'json'
  }
};
function selectExample(name) {
  const example = examples[name];
  for (const side of ['before', 'after']) {
    document.querySelector(`#${side}`).innerHTML = example[side].map((line, i) => `<span class="code-line"><span class="line-number" aria-hidden="true">${i + 1}</span><span>${line || ' '}</span></span>`).join('');
  }
  document.querySelector('.pane-label > span:last-child').textContent = `before.${example.extension}`;
  document.querySelector('#after-filename').textContent = `after.${example.extension}`;
  document.querySelector('#insight-copy').textContent = example.insight;
  document.querySelector('#change-count').textContent = '2 changes';
  document.querySelector('#example-panel').setAttribute('aria-labelledby', `${name}-tab`);
  document.querySelectorAll('[data-example]').forEach(tab => {
    tab.setAttribute('aria-selected', String(tab.dataset.example === name));
    tab.tabIndex = tab.dataset.example === name ? 0 : -1;
  });
}
const tabs = [...document.querySelectorAll('[data-example]')];
tabs.forEach(tab => {
  tab.addEventListener('click', () => selectExample(tab.dataset.example));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs.find(item => item !== tab);
    selectExample(next.dataset.example);
    next.focus();
  });
});
selectExample('text');
