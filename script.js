const COOKIE_STORAGE_KEY = 'btPrivacyChoice';
const INTRO_STORAGE_KEY = 'btPanelIntroSeen';

const lightOverlay = document.getElementById('light-overlay');
const lightSwitch = document.getElementById('light-switch');
const pullStartButton = document.getElementById('pull-start-button');

const cookieBanner = document.getElementById('cookie-banner');
const cookieNecessaryButton = document.getElementById('cookie-necessary');
const cookieComfortButton = document.getElementById('cookie-comfort');

const privacyChoice = localStorage.getItem(COOKIE_STORAGE_KEY);
const comfortAllowed = privacyChoice === 'comfort';

const panelCurrentTime = document.getElementById('panel-current-time');

const lockPageScroll = () => {
    document.documentElement.classList.add('overlay-open');
    document.body.classList.add('overlay-open');
};

const unlockPageScroll = () => {
    document.documentElement.classList.remove('overlay-open');
    document.body.classList.remove('overlay-open');
};

const updatePanelTime = () => {
    if (!panelCurrentTime) return;

    const now = new Date();

    panelCurrentTime.textContent = now.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

updatePanelTime();
setInterval(updatePanelTime, 1000);

if (lightOverlay) {
    lockPageScroll();
}

/* Cookie-Banner anzeigen, solange keine Auswahl getroffen wurde */
if (!privacyChoice && cookieBanner) {
    cookieBanner.classList.add('is-visible');
}

if (cookieNecessaryButton) {
    cookieNecessaryButton.addEventListener('click', () => {
        localStorage.setItem(COOKIE_STORAGE_KEY, 'necessary');
        sessionStorage.removeItem(INTRO_STORAGE_KEY);

        if (cookieBanner) {
            cookieBanner.classList.remove('is-visible');
        }
    });
}

if (cookieComfortButton) {
    cookieComfortButton.addEventListener('click', () => {
        localStorage.setItem(COOKIE_STORAGE_KEY, 'comfort');

        if (cookieBanner) {
            cookieBanner.classList.remove('is-visible');
        }
    });
}

/* Intro nur automatisch überspringen, wenn Komfort erlaubt wurde */
if (comfortAllowed && sessionStorage.getItem(INTRO_STORAGE_KEY) === 'true') {
    if (lightOverlay) {
        lightOverlay.style.display = 'none';
        unlockPageScroll();
    }
}

/* KNX / Visualisierungspanel Intro */
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

    if (lightSwitch) {
        lightSwitch.addEventListener('click', triggerPanelIntro);

        lightSwitch.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                triggerPanelIntro();
            }
        });
    }

    if (pullStartButton) {
        pullStartButton.addEventListener('click', triggerPanelIntro);

        pullStartButton.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                triggerPanelIntro();
            }
        });
    }
}

/* Reveal Animation */
const reveals = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, {
    threshold: 0.15
});

reveals.forEach(el => observer.observe(el));