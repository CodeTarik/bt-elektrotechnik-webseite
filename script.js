const COOKIE_STORAGE_KEY = 'btPrivacyChoice';
const INTRO_STORAGE_KEY = 'lightIsOn';

const lightOverlay = document.getElementById('light-overlay');
const lightSwitch = document.getElementById('light-switch');
const pullStartButton = document.getElementById('pull-start-button');

const cookieBanner = document.getElementById('cookie-banner');
const cookieNecessaryButton = document.getElementById('cookie-necessary');
const cookieComfortButton = document.getElementById('cookie-comfort');

const privacyChoice = localStorage.getItem(COOKIE_STORAGE_KEY);
const comfortAllowed = privacyChoice === 'comfort';

const lampWirePath = document.querySelector('.lamp-wire-path');

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
    }
}

if (lightSwitch && lightOverlay) {
    let isAnimating = false;


    function animateLampWire() {
    if (!lampWirePath) return;

    const frames = [
        'M60 0 C60 90 60 180 60 330',
        'M60 0 C70 95 82 190 74 330',
        'M60 0 C50 95 38 190 46 330',
        'M60 0 C66 92 72 186 68 330',
        'M60 0 C56 92 50 186 54 330',
        'M60 0 C60 90 60 180 60 330'
    ];

    const timings = [0, 170, 340, 520, 700, 900];

    frames.forEach((d, index) => {
        setTimeout(() => {
            lampWirePath.setAttribute('d', d);
        }, timings[index]);
    });
}

    const triggerLightIntro = () => {
        if (isAnimating) return;
        isAnimating = true;

        lightOverlay.classList.add('active-animation');
        animateLampWire();                                              //am 20.05.2026 eingefügt

        if (localStorage.getItem(COOKIE_STORAGE_KEY) === 'comfort') {
            sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
        }

        setTimeout(() => {
            lightOverlay.classList.add('light-on');
        }, 1450);

        setTimeout(() => {
            lightOverlay.style.display = 'none';
        }, 2450);
    };

    lightSwitch.addEventListener('click', triggerLightIntro);

    if (pullStartButton) {
        pullStartButton.addEventListener('click', triggerLightIntro);
    }

    lightSwitch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            triggerLightIntro();
        }
    });
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