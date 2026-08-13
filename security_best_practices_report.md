# Security Best Practices Report

## Executive Summary

The refactored Contact Card PWA is a small static Vite application with no backend, no authentication, no third-party runtime scripts, and no known npm production vulnerabilities from `npm audit --omit=dev`. No critical or high-severity issues were found.

The main security work left is defense-in-depth: add production security headers, avoid DOM HTML string sinks for locally stored contact data, and make the privacy implications of browser-local contact storage explicit.

Scope reviewed:

- Frontend: `index.html`, `src/main.js`, `src/styles.css`
- PWA: `public/sw.js`, `public/manifest.webmanifest`
- Deployment: `vercel.json`
- Dependencies: `package.json`, `package-lock.json`

Security guidance used: `javascript-general-web-frontend-security.md` from the `security-best-practices` skill.

## Critical Findings

None.

## High Findings

None.

## Medium Findings

### SBP-001: No Content Security Policy is configured

- Rule ID: JS-CSP-001
- Severity: Medium
- Location: `vercel.json:5-15`, `index.html:3-15`
- Evidence:

```json
"headers": [
  {
    "source": "/sw.js",
    "headers": [
      {
        "key": "Cache-Control",
        "value": "public, max-age=0, must-revalidate"
      }
    ]
  }
]
```

The only configured Vercel header is cache control for `/sw.js`. There is no visible `Content-Security-Policy` header in `vercel.json`, and `index.html` has no CSP meta tag before the module script at `index.html:115`.

- Impact: If an XSS bug is introduced later, the browser has no CSP defense-in-depth to restrict script execution, object embedding, or framing.
- Fix: Prefer Vercel response headers for CSP. A practical static-app baseline would include `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.
- Mitigation: The current app avoids third-party scripts, inline event handlers, and `eval`, so it should be able to support a strict `script-src 'self'` policy with minimal friction.
- False positive notes: Vercel or another edge layer could add headers outside this repo. Verify runtime headers after deployment.

### SBP-002: Contact cards are rendered through `innerHTML`

- Rule ID: JS-XSS-001
- Severity: Medium
- Location: `src/main.js:245`, `src/main.js:265-304`, `src/main.js:407-421`
- Evidence:

```js
elements.contactList.innerHTML = contacts.map(renderContactCard).join('');
```

Contacts are loaded from browser storage:

```js
const storedContacts = localStorage.getItem(STORAGE_KEY);
const parsedContacts = JSON.parse(storedContacts);
return parsedContacts.map(normalizeContact).filter(Boolean);
```

The renderer currently escapes user-facing fields with `escapeHtml`, which is good. However, `localStorage` is attacker-influencable after any XSS and should be treated as untrusted. Keeping contact rendering on an HTML parsing sink makes future changes easier to get wrong.

- Impact: A future field added to the card template without escaping could turn stored contact data into a persistent DOM XSS vector.
- Fix: Replace card string templates and `innerHTML` assignment with DOM creation APIs (`document.createElement`, `textContent`, `append`) or a tiny renderer that sets text/attributes explicitly.
- Mitigation: Add CSP as described in SBP-001. Keep all user-controlled fields escaped until the renderer is refactored.
- False positive notes: No direct exploit was confirmed because current contact text fields are escaped and avatar URLs come from an allowlist.

## Low Findings

### SBP-003: Contact PII is stored indefinitely in `localStorage`

- Rule ID: JS-STORAGE-001
- Severity: Low
- Location: `src/main.js:399-409`, `index.html:78-97`
- Evidence:

```js
localStorage.setItem(STORAGE_KEY, JSON.stringify(state.contacts));
const storedContacts = localStorage.getItem(STORAGE_KEY);
```

The app stores names, email addresses, phone numbers, and notes in browser-local storage.

- Impact: This is acceptable for a local-first demo, but contacts remain on the device indefinitely and any future XSS on the same origin could read them.
- Fix: Document that contact data is stored locally, add a clear-all/export/delete-all control, and avoid storing secrets or sensitive private notes.
- Mitigation: Host this app on its own origin and keep it free of third-party scripts.
- False positive notes: The app does not store auth tokens, passwords, sessions, or backend secrets, so this is a privacy/data-handling concern rather than a credential exposure issue.

## Positive Controls Observed

- No backend server or database is exposed.
- No auth tokens, API keys, passwords, cookies, or secrets were found in source.
- `crypto.randomUUID()` is used for new contact IDs at `src/main.js:470-475`.
- User-visible contact fields are escaped before HTML rendering at `src/main.js:277-288` and `src/main.js:482-489`.
- No `eval`, `new Function`, string timers, `document.write`, `postMessage`, dynamic third-party script injection, or remote CDN runtime scripts were found.
- `npm audit --omit=dev` reported `0 vulnerabilities`.

## Recommended Fix Order

1. Add Vercel security headers, especially CSP.
2. Refactor contact card rendering away from `innerHTML`.
3. Add local-data privacy controls: clear all contacts and explicit README/UI wording.
