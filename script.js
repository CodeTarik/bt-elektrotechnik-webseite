const COOKIE_STORAGE_KEY = 'btPrivacyChoice';
const INTRO_STORAGE_KEY  = 'btPanelIntroSeen';

const lightOverlay         = document.getElementById('light-overlay');
const lightSwitch          = document.getElementById('light-switch');
const pullStartButton      = document.getElementById('pull-start-button');
const cookieBanner         = document.getElementById('cookie-banner');
const cookieNecessaryButton = document.getElementById('cookie-necessary');
const cookieComfortButton  = document.getElementById('cookie-comfort');
const panelCurrentTime     = document.getElementById('panel-current-time');
const panelCurrentDate     = document.getElementById('panel-current-date');

const privacyChoice  = localStorage.getItem(COOKIE_STORAGE_KEY);
const comfortAllowed = privacyChoice === 'comfort';

/* ── Scroll-Lock ─────────────────────────────────────── */
const lockPageScroll = () => {
    document.documentElement.classList.add('overlay-open');
    document.body.classList.add('overlay-open');
};

const unlockPageScroll = () => {
    document.documentElement.classList.remove('overlay-open');
    document.body.classList.remove('overlay-open');
};

/* ── Panel-Uhrzeit ───────────────────────────────────── */
const updatePanelTime = () => {
    const now = new Date();
    if (panelCurrentTime) {
        panelCurrentTime.textContent = now.toLocaleTimeString('de-DE', {
            hour: '2-digit', minute: '2-digit'
        });
    }
    if (panelCurrentDate) {
        panelCurrentDate.textContent = now.toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    }
};

updatePanelTime();
setInterval(updatePanelTime, 1000);

/* ── Overlay Scroll-Lock aktiv solange Overlay sichtbar ─ */
if (lightOverlay) {
    lockPageScroll();
}

/* ── Cookie-Banner ───────────────────────────────────── */
if (!privacyChoice && cookieBanner) {
    cookieBanner.classList.add('is-visible');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            cookieBanner.classList.add('is-animated');
        });
    });
}

const hideCookieBanner = () => {
    if (!cookieBanner) return;
    cookieBanner.classList.remove('is-animated');
    cookieBanner.addEventListener('transitionend', () => {
        cookieBanner.classList.remove('is-visible');
    }, { once: true });
};

if (cookieNecessaryButton) {
    cookieNecessaryButton.addEventListener('click', () => {
        localStorage.setItem(COOKIE_STORAGE_KEY, 'necessary');
        sessionStorage.removeItem(INTRO_STORAGE_KEY);
        hideCookieBanner();
    });
}

if (cookieComfortButton) {
    cookieComfortButton.addEventListener('click', () => {
        localStorage.setItem(COOKIE_STORAGE_KEY, 'comfort');
        hideCookieBanner();
    });
}

/* ── Intro automatisch überspringen (Komfort-Modus) ──── */
if (comfortAllowed && sessionStorage.getItem(INTRO_STORAGE_KEY) === 'true') {
    if (lightOverlay) {
        lightOverlay.style.display = 'none';
        unlockPageScroll();
    }
}

/* ── KNX Panel Intro ─────────────────────────────────── */
if (lightOverlay) {
    let isAnimating = false;

    const triggerPanelIntro = () => {
        if (isAnimating) return;
        isAnimating = true;

        lightOverlay.classList.add('active-animation');

        if (localStorage.getItem(COOKIE_STORAGE_KEY) === 'comfort') {
            sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
        }

        setTimeout(() => {
            lightOverlay.classList.add('light-on');
        }, 1300);

        setTimeout(() => {
            lightOverlay.style.display = 'none';
            unlockPageScroll();
        }, 2250);
    };

    /* Desktop: Panel-Device klickbar */
    if (lightSwitch) {
        lightSwitch.addEventListener('click', triggerPanelIntro);
        lightSwitch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerPanelIntro();
            }
        });
    }

    /* Desktop: Text-Button */
    if (pullStartButton) {
        pullStartButton.addEventListener('click', triggerPanelIntro);
        pullStartButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerPanelIntro();
            }
        });
    }

    /* Mobile: CTA-Button */
    const pullStartMobile = document.getElementById('pull-start-mobile');
    if (pullStartMobile) {
        pullStartMobile.addEventListener('click', triggerPanelIntro);
    }
} /* ← schließt if (lightOverlay) */

/* ── Reveal Animation ────────────────────────────────── */
const reveals  = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.15 });

reveals.forEach(el => observer.observe(el));

/* ── Mobile Hamburger Menu ───────────────────────────── */
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

if (navToggle && navLinks) {
    const openLabel  = 'Menü öffnen';
    const closeLabel = 'Menü schließen';

    navToggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('is-open');
        navToggle.classList.toggle('is-open', isOpen);
        navToggle.setAttribute('aria-expanded', String(isOpen));
        navToggle.setAttribute('aria-label', isOpen ? closeLabel : openLabel);
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('is-open');
            navToggle.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.setAttribute('aria-label', openLabel);
        });
    });

    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
            navLinks.classList.remove('is-open');
            navToggle.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.setAttribute('aria-label', openLabel);
        }
    });
}

/* ── AJAX Kontaktformular ────────────────────────────── */
const contactForm   = document.getElementById('contact-form');
const contactSubmit = document.getElementById('contact-submit');
const formSuccess   = document.getElementById('form-success');
const formError     = document.getElementById('form-error');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (contactSubmit) {
            contactSubmit.disabled    = true;
            contactSubmit.textContent = 'Wird gesendet …';
        }

        if (formSuccess) formSuccess.classList.add('hidden');
        if (formError)   formError.classList.add('hidden');

        try {
            const response = await fetch(contactForm.action, {
                method:  'POST',
                body:    new FormData(contactForm),
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                contactForm.reset();
                if (contactSubmit) contactSubmit.style.display = 'none';
                if (formSuccess)   formSuccess.classList.remove('hidden');
            } else {
                throw new Error('Serverfehler');
            }
        } catch {
            if (formError) formError.classList.remove('hidden');
            if (contactSubmit) {
                contactSubmit.disabled    = false;
                contactSubmit.textContent = 'Nachricht senden';
            }
        }
    });
}
