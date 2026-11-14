#!/usr/bin/env python3
"""QA visuel systématique : pages x viewports, erreurs JS, HTTP>=400, overflow, contraste, cibles 44px, images OK."""
import sys
from playwright.sync_api import sync_playwright
BASE = 'https://namespace-reef-votes-objective.trycloudflare.com'
TOKEN = 'dev-token-123'
CHROME = '/opt/playwright/chromium-1248/chrome-linux64/chrome'
PAGES = ['index.html', 'evenements.html', 'evenement.html?id=sunwave-festival-3-jours', 'compte.html', 'aide.html', 'mentions-legales.html']
VIEWS = [('mobile', 390, 844), ('desktop', 1280, 800)]
ok, ko = 0, 0
def check(name, cond):
    global ok, ko
    if cond: ok += 1
    else: ko += 1; print(f'  ❌ {name}')
def contrast(fg, bg):
    def lum(c):
        c = [x/255 for x in c]
        c = [x/12.92 if x <= 0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
        return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]
    l1, l2 = lum(fg[:3]), lum(bg[:3])
    if l1 < l2: l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)
def parse_rgb(s):
    s = s.strip()
    if s.startswith('#'):
        h = s[1:]; return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    if 'rgba' in s or 'rgb' in s:
        nums = [float(x) for x in s[s.index('(')+1:s.index(')')].split(',')]
        return tuple(int(x) for x in nums[:3])
    return (255, 255, 255)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    for vtag, w, h in VIEWS:
        ctx = b.new_context(viewport={'width': w, 'height': h})
        ctx.add_cookies([{'name': 'aegis_token', 'value': TOKEN, 'url': BASE}])
        pg = ctx.new_page()
        for page in PAGES:
            errs, bad_resp = [], []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('response', lambda r: bad_resp.append(r.status) if r.status >= 400 and 'favicon' not in r.url else None)
            pg.goto(BASE + '/' + page, wait_until='domcontentloaded', timeout=60000)
            pg.wait_for_timeout(2500)
            label = f'{vtag}/{page}'
            check(f'{label}: 0 erreur JS', not errs)
            check(f'{label}: 0 reponse >=400', not bad_resp)
            check(f'{label}: pas overflow', pg.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'))
            # images toutes chargees (scroll complet d'abord)
            pg.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            pg.wait_for_timeout(2500)
            pg.evaluate('window.scrollTo(0,0)')
            pg.wait_for_timeout(1000)
            imgs_ok = pg.evaluate("Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)")
            check(f'{label}: toutes les images chargees', imgs_ok)
            # contraste main (hors fonds image)
            ratios = pg.evaluate("""(() => {
              const out = [];
              document.querySelectorAll('main h1, main h2, main h3, main p, main a, main button, main label, main summary, main footer').forEach(el => {
                if (el.closest('.hero') || el.closest('.press-party') || el.closest('.event-hero')) return;
                let a = el; let hasBgImg = false;
                while (a) { if (getComputedStyle(a).backgroundImage !== 'none') { hasBgImg = true; break; } a = a.parentElement; }
                if (hasBgImg) return;
                const cs = getComputedStyle(el);
                if (cs.visibility === 'hidden' || cs.display === 'none') return;
                let bg = cs.backgroundColor;
                let p2 = el.parentElement;
                while (p2 && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) { bg = getComputedStyle(p2).backgroundColor; p2 = p2.parentElement; }
                out.push({t: el.textContent.trim().slice(0, 25), fg: cs.color, bg});
              });
              return out;
            })()""")
            low = [r for r in ratios if contrast(parse_rgb(r['fg']), parse_rgb(r['bg'])) < 4.5]
            check(f'{label}: contraste AA (hors fonds image) {len(low)} fails', not low)
            if low: print('    low:', low[:3])
            # cibles 44px (hors brand)
            small = pg.evaluate("""(() => Array.from(document.querySelectorAll('main a, main button, main input, main .chip, .press-card')).filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && !el.classList.contains('brand') && (r.width < 44 || r.height < 44);
            }).length)()""")
            check(f'{label}: cibles >=44px ({small} trop petites)', small == 0)
            pg.screenshot(path=f'/tmp/qa-{vtag}-{page.split("?")[0].replace(".html","")}.png', full_page=True)
            print(f'  ✅ {label}')
        ctx.close()
    b.close()
print(f'\nQA visuel : ✅ {ok} OK, ❌ {ko} problèmes')
sys.exit(1 if ko else 0)
