// ─── BT Elektrotechnik · POV-Raum (Schritt 5) ───
// Erste Stufe des virtuellen Showrooms:
// Ein leerer realistischer Raum mit Umsehen per Maus-/Touch-Drag.
// Schutzorgane, Unterverteilung, Garage und Wallbox folgen in den nächsten Schritten.

import * as THREE from 'three';

const container = document.getElementById('three-canvas-container');

if (container) {
    // ─── 1) Szene, Kamera, Renderer ───
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1612);
    scene.fog = new THREE.Fog(0x1a1612, 6, 18);

    const camera = new THREE.PerspectiveCamera(
        72,
        container.clientWidth / container.clientHeight,
        0.05, 50
    );
    const EYE_HEIGHT = 1.65;            // Augenhöhe (Person ca. 1,80 m groß)
    // Startposition leicht versetzt, damit man nicht in der Raummitte „klebt"
    camera.position.set(0.6, EYE_HEIGHT, 1.4);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type   = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping      = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ─── 2) Raumgeometrie ───
    const ROOM_W = 6;     // Breite (X)
    const ROOM_H = 2.7;   // Höhe (Y) - typische Raumhöhe
    const ROOM_D = 5;     // Tiefe (Z)

    // Boden (heller Beton-Look)
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_W, ROOM_D),
        new THREE.MeshStandardMaterial({
            color: 0x504842, roughness: 0.88, metalness: 0.05
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Decke (cremeweiß)
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_W, ROOM_D),
        new THREE.MeshStandardMaterial({
            color: 0xe8e0d2, roughness: 0.95
        })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_H;
    scene.add(ceiling);

    // Wände (warmer hellbeiger Putz-Ton)
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0xc8bca8, roughness: 0.92
    });
    const makeWall = (w, h, x, y, z, rotY) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
        wall.position.set(x, y, z);
        wall.rotation.y = rotY;
        wall.receiveShadow = true;
        scene.add(wall);
        return wall;
    };
    makeWall(ROOM_W, ROOM_H, 0,         ROOM_H/2, -ROOM_D/2, 0);          // Wand Nord (vor uns)
    makeWall(ROOM_W, ROOM_H, 0,         ROOM_H/2,  ROOM_D/2, Math.PI);    // Wand Süd (hinter uns)
    makeWall(ROOM_D, ROOM_H, -ROOM_W/2, ROOM_H/2,  0,        Math.PI/2);  // Wand West (links)
    makeWall(ROOM_D, ROOM_H,  ROOM_W/2, ROOM_H/2,  0,       -Math.PI/2);  // Wand Ost (rechts)

    // Sockelleisten zur Bodenkante (kleiner aber wichtiger Realismus-Detail)
    const skirtMat = new THREE.MeshStandardMaterial({
        color: 0x3a3530, roughness: 0.7
    });
    const makeSkirt = (w, x, y, z, rotY) => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.015), skirtMat);
        s.position.set(x, y, z);
        s.rotation.y = rotY;
        scene.add(s);
    };
    makeSkirt(ROOM_W, 0,         0.04, -ROOM_D/2 + 0.008, 0);
    makeSkirt(ROOM_W, 0,         0.04,  ROOM_D/2 - 0.008, 0);
    makeSkirt(ROOM_D, -ROOM_W/2 + 0.008, 0.04, 0, Math.PI/2);
    makeSkirt(ROOM_D,  ROOM_W/2 - 0.008, 0.04, 0, Math.PI/2);

    // ─── 3) Beleuchtung ───
    // Three.js seit r155: physikalisch korrekte Intensitäten (Lumen-Skalierung).
    // Daher hohe Werte für Punktlichter (real wären ~800-1500 Lumen für eine Lampe).
    scene.add(new THREE.AmbientLight(0xfff4e0, 0.8));

    // Indirektes Licht: simuliert Reflexionen vom Boden/Wänden
    const hemiLight = new THREE.HemisphereLight(0xfff4e0, 0x40382e, 0.4);
    scene.add(hemiLight);

    // Deckenleuchte: warmes Punktlicht in der Raummitte
    const ceilLight = new THREE.PointLight(0xffe2b8, 60, 14, 1.6);
    ceilLight.position.set(0, ROOM_H - 0.15, 0);
    ceilLight.castShadow = true;
    ceilLight.shadow.mapSize.set(1024, 1024);
    ceilLight.shadow.bias = -0.0005;
    scene.add(ceilLight);

    // Sichtbarer Lampen-Disc an der Decke
    const lampMesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 32),
        new THREE.MeshBasicMaterial({ color: 0xffeec8 })
    );
    lampMesh.position.set(0, ROOM_H - 0.005, 0);
    lampMesh.rotation.x = Math.PI / 2;
    scene.add(lampMesh);

    // ─── 4) POV-Steuerung: Drag-to-look ───
    // Wir tracken yaw (horizontal) und pitch (vertikal) separat,
    // damit man sich nicht den „Kopf überschlägt".
    // Startblick: leicht zur linken Wand gedreht (Vorgriff: dort kommt später
    // die Unterverteilung dran). So sieht der Besucher sofort eine Raumecke
    // und versteht, dass es ein echter 3D-Raum ist.
    let yaw = -Math.PI / 6;
    let pitch = 0;
    let isDragging = false;
    let lastX = 0, lastY = 0;
    const SENS = 0.0042;

    const startDrag = (x, y) => {
        isDragging = true;
        lastX = x; lastY = y;
        container.style.cursor = 'grabbing';
    };
    const moveDrag = (x, y) => {
        if (!isDragging) return;
        const dx = x - lastX;
        const dy = y - lastY;
        lastX = x; lastY = y;
        // „Drag-the-world"-Mapping: Ziehen nach rechts dreht den Blick nach links
        yaw   += dx * SENS;
        pitch += dy * SENS;
        // Pitch begrenzen
        const MAX = Math.PI / 2 - 0.15;
        pitch = Math.max(-MAX, Math.min(MAX, pitch));
    };
    const endDrag = () => {
        isDragging = false;
        container.style.cursor = 'grab';
    };

    container.style.cursor = 'grab';
    container.style.position = 'relative';

    container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isDragging) {
            moveDrag(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
        }
    }, { passive: false });
    window.addEventListener('touchend', endDrag);

    // ─── 5) Bedienhinweis (verschwindet nach erster Interaktion) ───
    const hint = document.createElement('div');
    hint.textContent = '✋  Klicken & ziehen zum Umsehen';
    hint.style.cssText = `
        position: absolute; left: 50%; bottom: 16px;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: #F5A623;
        padding: 8px 18px;
        border: 1px solid rgba(245,166,35,0.5);
        border-radius: 999px;
        font: 700 0.7rem/1 system-ui, sans-serif;
        letter-spacing: 0.15em; text-transform: uppercase;
        pointer-events: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        transition: opacity 0.6s ease;
        z-index: 10;
    `;
    container.appendChild(hint);
    let hasInteracted = false;
    const fadeHint = () => {
        if (hasInteracted) return;
        hasInteracted = true;
        hint.style.opacity = '0';
    };
    container.addEventListener('mousedown', fadeHint);
    container.addEventListener('touchstart', fadeHint);

    // ─── 6) Sichtbarkeit + Render-Loop ───
    let isVisible   = false;
    let animationId = null;

    const visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isVisible = entry.isIntersecting;
            if (isVisible && animationId === null) animate();
        });
    }, { threshold: 0.1 });
    visibilityObserver.observe(container);

    function animate() {
        if (!isVisible) { animationId = null; return; }
        animationId = requestAnimationFrame(animate);

        camera.rotation.y = yaw;
        camera.rotation.x = pitch;

        renderer.render(scene, camera);
    }

    // ─── 7) Responsive ───
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}