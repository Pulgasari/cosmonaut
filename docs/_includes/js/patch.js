// docs/_includes/js/patch.js

const alertTypes = {
  note:      { label: 'Note',      color: '#8be9fd' },
  tip:       { label: 'Tip',       color: '#50fa7b' },
  important: { label: 'Important', color: '#bd93f9' },
  warning:   { label: 'Warning',   color: '#f1fa8c' },
  caution:   { label: 'Caution',   color: '#ff79c6' }
};

function patch_md () {

  // 1. GitHub Alerts ([!NOTE], [!TIP], etc.) automatisch parsen
  document.querySelectorAll('blockquote').forEach(bq => {
    const firstP = bq.querySelector('p');
    if (!firstP) return;
  
    // Prüft, ob der Absatz mit [!NOTE], [!WARNING] etc. beginnt
    const match = firstP.innerHTML.match(/^\[\!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
    if (match) {
      const key = match[1].toLowerCase();
      const alert = alertTypes[key];
  
      bq.classList.add('gh-alert', `gh-alert-${key}`);
      
      // Tag [!NOTE] aus dem Text löschen
      firstP.innerHTML = firstP.innerHTML.replace(/^\[\!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br\s*\/?>)?/i, '').trim();
  
      // Überschrift einfügen
      const titleEl = document.createElement('div');
      titleEl.className = 'gh-alert-title';
      titleEl.textContent = alert.label;
      
      bq.prepend(titleEl);
    }
  });

  // 2. Escapte Pipes (\|) in Inline-Code innerhalb von Tabellen reparieren
  document.querySelectorAll('table code').forEach(code => {
    code.innerHTML = code.innerHTML.replace(/\\\|/g, '|');
  });
  
}
