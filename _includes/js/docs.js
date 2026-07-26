// docs/_includes/js/docs.js

let app = {};
app.name     = 'Cosmonaut';
app.url      = 'https://pulgasari.github.io/cosmonaut/';
app.url_repo = 'https://github.com/pulgasari/cosmonaut/';

const headerItems = signal([
  { label: '@GitHub'  , href: app.url_repo },
]);
function Header () {
  return html`
    <div id='app-header'>
      <div class="brand">${app.name}</div>
      <div class="menu">
        ${headerItems.value.map(item => 
          html`<a href="${item.href}">${item.label}</a>`
        )}
      </div>
    </div>
  `;
}

const menuItems = signal([
  { label: 'Start'       , href: app.url               },
  { label: 'Lexer'       , href: app.url + 'lexer'     },
  { label: 'Blocks'      , href: app.url + 'blocks'    },
  { label: 'Parser'      , href: app.url + 'parser'    },
  { label: 'Generator'   , href: app.url + 'generator' },
  { label: 'Layouter'    , href: app.url + 'layouter'  },
  { label: 'LSD'         , href: app.url + 'lsd'       },
  { label: 'Terminology' , href: app.url + 'terminology' },
]);
function Menu () {
  const currentUrl = window.location.href.replace(/\/$/, '');
  const    rootUrl = app.url.replace(/\/$/, '');

  return html`
    <div id='app-footer'>
      ${menuItems.value.map(item => {
        const itemUrl    = item.href.replace(/\/$/, '');
        const isCurrent  = currentUrl === itemUrl;
        const isParent   = !isCurrent && itemUrl !== rootUrl && currentUrl.startsWith(itemUrl + '/');
        const classNames = [ isCurrent ? 'is-current' : '', isParent  ? 'is-parent'  : '' ].filter(Boolean).join(' ');
        return html`<a href="${item.href}" class="${classNames}">${item.label}</a>`;
      })}
    </div>
  `;
}


// Ausführung erst, wenn die Seite komplett geladen ist:
window.addEventListener('DOMContentLoaded', () => {
  
  hljs.highlightAll(); // apply syntax highlighting
  patch_md(); // fix the markdown rendering

  const $body     = document.body;
  const tmpHeader = document.createElement('div');
  $body.prepend(tmpHeader);
  render(html`<${Header} />`, tmpHeader);
  tmpHeader.replaceWith(tmpHeader.firstElementChild);
  
  const tmpFooter = document.createElement('div');
  $body.append(tmpFooter);
  render(html`<${Menu} />`, tmpFooter);
  tmpFooter.replaceWith(tmpFooter.firstElementChild);

});
