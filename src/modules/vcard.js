// vCard (.vcf) export and import helpers — vCard 3.0.

function escapeVCard(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r?\n/g, '\\n');
}

function unescapeVCard(value) {
  return String(value ?? '')
    .replace(/\\n/gi, '\n')
    .replaceAll('\\,', ',')
    .replaceAll('\\;', ';')
    .replaceAll('\\\\', '\\');
}

function slugify(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'contact'
  );
}

export function buildVCard(contact) {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(contact.name)}`,
    contact.title ? `TITLE:${escapeVCard(contact.title)}` : null,
    contact.email ? `EMAIL;TYPE=INTERNET:${escapeVCard(contact.email)}` : null,
    contact.phone ? `TEL;TYPE=CELL:${escapeVCard(contact.phone)}` : null,
    contact.notes ? `NOTE:${escapeVCard(contact.notes)}` : null,
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function downloadVCard(contact) {
  const blob = new Blob([buildVCard(contact)], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${slugify(contact.name)}.vcf`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Parses one or more VCARD blocks from raw .vcf text into plain contact
 * fields. Unknown/unsupported vCard properties are ignored.
 */
export function parseVCards(text) {
  const cards = [];
  const blocks = String(text).split(/BEGIN:VCARD/i).slice(1);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const card = { name: '', title: '', email: '', phone: '', notes: '' };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line || /^END:VCARD/i.test(line)) {
        continue;
      }

      const separatorIndex = line.indexOf(':');

      if (separatorIndex === -1) {
        continue;
      }

      const property = line.slice(0, separatorIndex).split(';')[0].toUpperCase();
      const value = unescapeVCard(line.slice(separatorIndex + 1));

      if (property === 'FN' && !card.name) {
        card.name = value;
      } else if (property === 'N' && !card.name) {
        card.name = value.split(';').filter(Boolean).reverse().join(' ');
      } else if (property === 'TITLE') {
        card.title = value;
      } else if (property === 'EMAIL' && !card.email) {
        card.email = value;
      } else if (property === 'TEL' && !card.phone) {
        card.phone = value;
      } else if (property === 'NOTE') {
        card.notes = value;
      }
    }

    if (card.name) {
      cards.push(card);
    }
  }

  return cards;
}
