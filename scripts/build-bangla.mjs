import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = root + 'dist/';
const translations = JSON.parse(await readFile(root + 'translations/bn.json', 'utf8'));
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const files = (await readdir(dist)).filter((file) => file.endsWith('.html'));
await mkdir(dist + 'bn', { recursive: true });

function switcher(document, file, bangla) {
  const group = document.createElement('div');
  group.className = 'lang lang-d';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', bangla ? 'ভাষা' : 'Language');
  for (const [lang, label, name] of [['en', 'EN', 'English'], ['bn', 'বাংলা', 'বাংলা']]) {
    const link = document.createElement('a');
    link.href = lang === 'bn' ? (bangla ? '' : 'bn/') + file : (bangla ? '../' : '') + file;
    link.lang = lang;
    link.setAttribute('hreflang', lang);
    link.dataset.language = lang;
    link.textContent = label;
    link.setAttribute('aria-label', name);
    if ((lang === 'bn') === bangla) {
      link.className = 'on';
      link.setAttribute('aria-current', 'true');
    }
    group.append(link);
  }
  return group;
}

function addSocialLinks(document, bangla) {
  document.querySelectorAll('.footer-facebook, .wa-float').forEach((link) => link.remove());
  const footer = document.querySelector('footer');
  const brand = footer.querySelector('.wrap > div:first-child > div:first-child');
  const footerWhatsApp = footer.querySelector('a[href^="https://wa.me/"]');

  const facebook = document.createElement('a');
  facebook.className = 'footer-facebook';
  facebook.href = 'https://www.facebook.com/p/Wahi-Properties-Ltd-61573775531782/';
  facebook.setAttribute('target', '_blank');
  facebook.setAttribute('rel', 'noopener');
  facebook.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path></svg>';
  const label = document.createElement('span');
  label.textContent = bangla ? 'ফেসবুকে আমাদের অনুসরণ করুন' : 'Follow us on Facebook';
  facebook.append(label);
  brand.append(facebook);

  const whatsApp = document.createElement('a');
  whatsApp.className = 'wa-float';
  whatsApp.href = footerWhatsApp.getAttribute('href');
  whatsApp.setAttribute('target', '_blank');
  whatsApp.setAttribute('rel', 'noopener');
  whatsApp.setAttribute('aria-label', bangla ? 'হোয়াটসঅ্যাপে কথা বলুন' : 'Chat on WhatsApp');
  const icon = footerWhatsApp.previousElementSibling.cloneNode(true);
  icon.removeAttribute('style');
  icon.setAttribute('width', '28');
  icon.setAttribute('height', '28');
  icon.setAttribute('fill', '#FFFFFF');
  whatsApp.append(icon);
  footer.after(whatsApp);
}

function shared(document, file, bangla) {
  [...document.querySelectorAll('main section, footer')].forEach((section, index) => {
    if (!section.id || /^wahi-section-\d+$/.test(section.id)) section.id = 'wahi-section-' + (index + 1);
  });
  // Both languages have authored content, so opt out of browser translation offers.
  document.documentElement.setAttribute('translate', 'no');
  let translationPolicy = document.querySelector('meta[name="google"][content="notranslate"]');
  if (!translationPolicy) {
    translationPolicy = document.createElement('meta');
    translationPolicy.name = 'google';
    translationPolicy.content = 'notranslate';
    document.head.insertBefore(translationPolicy, document.head.querySelector('title'));
  }
  const creditLink = document.querySelector('footer a[href^="https://zenticlab.com"]');
  creditLink.href = 'https://zenticlab.com/';
  creditLink.setAttribute('lang', 'en');
  creditLink.removeAttribute('style');
  const credit = creditLink.parentElement;
  credit.classList.add('footer-credit');
  const legal = document.querySelector('footer a[href="privacy-terms.html"]');
  legal.parentElement.classList.add('footer-legal');
  credit.setAttribute('lang', bangla ? 'bn' : 'en');
  credit.setAttribute('translate', 'no');
  credit.replaceChildren(document.createTextNode(bangla ? 'ডেভেলপমেন্টে ' : 'Developed by '), creditLink);
  addSocialLinks(document, bangla);
  document.querySelectorAll('.lang,.hd-mcall,[data-locale-resource]').forEach((node) => node.remove());
  const mobileCall = document.querySelector('header .call').cloneNode(true);
  mobileCall.className = 'btn btn-primary hd-mcall';
  document.querySelector('.hd-nav').append(mobileCall);
  document.querySelector('.hdr-r').prepend(switcher(document, file, bangla));
  const prefix = bangla ? '../' : '';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = prefix + 'locale.css';
  css.dataset.localeResource = '';
  document.head.append(css);
  const font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap';
  font.dataset.localeResource = '';
  document.head.append(font);
  const js = document.createElement('script');
  js.src = prefix + 'locale.js';
  js.defer = true;
  js.dataset.localeResource = '';
  document.head.insertBefore(js, document.head.querySelector('script'));
  for (const lang of ['en', 'bn']) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = lang;
    link.href = lang === 'bn' ? (bangla ? '' : 'bn/') + file : (bangla ? '../' : '') + file;
    link.dataset.localeResource = '';
    document.head.append(link);
  }
  const prefetch = document.createElement('link');
  prefetch.rel = 'prefetch';
  prefetch.href = (bangla ? '../' : 'bn/') + file;
  prefetch.dataset.localeResource = '';
  document.head.append(prefetch);
}

function translatedContent(node, target, map) {
  // Retain linked email addresses, brand credits, emphasis, and decorative icons.
  const document = node.ownerDocument;
  const leaves = [];
  const findText = (child) => {
    if (child.nodeType === 3 && normalize(child.textContent)) leaves.push(child);
    else if (child.nodeType === 1 && !child.matches('svg')) child.childNodes.forEach(findText);
  };
  node.childNodes.forEach(findText);
  if (leaves.length === 1) {
    leaves[0].textContent = target;
    return;
  }
  const inline = Array.from(node.querySelectorAll('a,b,strong')).filter((child) => !child.parentElement.closest('a,b,strong'));
  const parts = [];
  let remainder = target;
  for (const child of inline) {
    const original = normalize(child.textContent);
    const href = child.getAttribute('href');
    const linkLabel = href && map[href];
    let label = linkLabel || map[original] || original.replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[digit]);
    if (child.matches('b,strong') && original.endsWith(':') && target.includes(':')) label = target.split(':')[0] + ':';
    const index = remainder.lastIndexOf(label);
    if (index < 0) throw new Error('Missing inline translation for ' + original);
    parts.push(document.createTextNode(remainder.slice(0, index)));
    const copy = child.cloneNode(true);
    copy.textContent = label;
    parts.push(copy);
    remainder = remainder.slice(index + label.length);
  }
  parts.push(document.createTextNode(remainder));
  const decorations = Array.from(node.children).filter((child) => !normalize(child.textContent) && !child.matches('br'));
  node.replaceChildren(...decorations, ...parts);
}

function translate(document, map) {
  function walk(node) {
    if (node.nodeType === 3) {
      const target = map[normalize(node.textContent)];
      if (target) node.textContent = node.textContent.replace(/\S[\s\S]*\S|\S/, target);
      return;
    }
    if (node.nodeType !== 1 || node.matches('script,style,svg,[translate="no"]')) return;
    const text = normalize(node.textContent);
    const target = map[text];
    // Match complete authored phrases before translating individual text nodes.
    if (target && !node.matches('html,head,body,main,header,footer,section,nav,ul,ol,details')
      && !node.querySelector('button,details,img,h1,h2,h3,h4,p')) {
      translatedContent(node, target, map);
      return;
    }
    for (const child of [...node.childNodes]) walk(child);
  }
  walk(document.body);
  for (const node of document.querySelectorAll('[alt],[aria-label],[title],[placeholder]')) {
    for (const attr of ['alt', 'aria-label', 'title', 'placeholder']) {
      const value = node.getAttribute(attr);
      if (value && map[normalize(value)]) node.setAttribute(attr, map[normalize(value)]);
    }
  }
}

for (const file of files) {
  const english = parseHTML(await readFile(dist + file, 'utf8')).document;
  const map = { ...translations.common, ...translations.pages[file], ...translations.interface };
  for (const card of english.querySelectorAll('.pj-grid .pj-card')) {
    const name = normalize(card.querySelector('.pj').textContent);
    const location = normalize(card.querySelector('.loc span').textContent);
    card.dataset.search = (map[name] || '') + ' ' + (map[location] || '');
  }
  shared(english, file, false);
  await writeFile(dist + file, '<!doctype html>\n' + english.documentElement.outerHTML + '\n');

  const document = parseHTML(english.documentElement.outerHTML).document;
  document.documentElement.lang = 'bn';
  document.title = file === 'index.html'
    ? 'ওয়াহী প্রপার্টিজ লিমিটেড | ঢাকায় আবাসিক ফ্ল্যাট'
    : (map[document.title.split(' | ')[0]] || map[normalize(document.querySelector('h1').textContent)]) + ' | ওয়াহী প্রপার্টিজ লিমিটেড';
  // Filtering and URL parameters keep language-independent values.
  for (const option of document.querySelectorAll('.pj-opt')) option.dataset.value = option.querySelector('.t').textContent;
  for (const chip of document.querySelectorAll('.pj-chip')) chip.dataset.value = chip.textContent.trim();
  for (const card of document.querySelectorAll('.pj-card')) {
    card.dataset.name = card.querySelector('.pj').textContent;
    card.dataset.location = card.querySelector('.loc span').textContent;
  }
  translate(document, map);
  // Source files contain an obsolete address. Keep the current office location.
  for (const node of document.querySelectorAll('img[src],script[src],link[href]')) {
    const attr = node.localName === 'link' ? 'href' : 'src';
    const value = node.getAttribute(attr);
    if (value && !/^(?:https?:|\/|\.\.\/|#|data:)/.test(value)) node.setAttribute(attr, '../' + value);
  }
  for (const node of document.querySelectorAll('[srcset]')) {
    node.setAttribute('srcset', node.getAttribute('srcset').split(',').map((candidate) => {
      const [url, ...descriptor] = candidate.trim().split(/\s+/);
      const relative = !/^(?:https?:|\/|\.\.\/|data:)/.test(url);
      return [(relative ? '../' : '') + url, ...descriptor].join(' ');
    }).join(', '));
  }
  shared(document, file, true);
  await writeFile(dist + 'bn/' + file, '<!doctype html>\n' + document.documentElement.outerHTML + '\n');
}
console.log('Built Bangla content and language links for ' + files.length + ' pages.');
