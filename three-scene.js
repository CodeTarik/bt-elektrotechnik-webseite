// ─── BT Elektrotechnik · POV-Raum (Schritt 6) ───
// Virtueller Showroom mit prozeduralem Hager-Zählerschrank nach CAD-Vorbild.
// Umsehen per Maus-/Touch-Drag. Klick öffnet die Schranktür.

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
    // Startposition: nah an der linken Wand, ca. 2 m vor der Unterverteilung
    camera.position.set(-0.4, EYE_HEIGHT, 0.7);
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

    // Sockelleisten zur Bodenkante
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

    // ─── 2b) Unterverteilung an der linken Wand (Hager-Design) ───
    function buildUnterverteilung() {
        const uv = new THREE.Group();

        // Exakte Hager-Maße (univers Z Aufputz-Schrank, ca. 5 Reihen / 2-feldig)
        const W = 0.16;        // Tiefe (X, steht von der Wand ab)
        const H = 0.95;        // Höhe (Y)
        const D = 0.55;        // Breite (Z)
        const FRAME_W = 0.015; // Filigraner Hager-Stahlblechrahmen

        // Typische Hager-Pulverbeschichtung (Verkehrsweiß Matt RAL 9016)
        const hagerWeissMat = new THREE.MeshStandardMaterial({
            color: 0xfafafa, 
            roughness: 0.42, // Seidenmatter Blech-Reflex
            metalness: 0.15
        });

        const hagerAnthrazit = new THREE.MeshStandardMaterial({
            color: 0x2b2c2c,
            roughness: 0.5,
            metalness: 0.2
        });

        // Korpus (Hintere Schale an der Wand)
        const korpus = new THREE.Mesh(new THREE.BoxGeometry(W - 0.01, H - 0.01, D - 0.01), hagerWeissMat);
        korpus.position.x = -(0.01 / 2);
        korpus.castShadow = true;
        korpus.receiveShadow = true;
        uv.add(korpus);

        // 🌟 HIER EINGEFÜGT: Das prozedurale 3D-Innenleben (Wird beim Öffnen sichtbar)
        const innenlebenGruppe = new THREE.Group();
        innenlebenGruppe.position.x = W / 2 - 0.015; // Leicht versenkt im Gehäuse platziert
        uv.add(innenlebenGruppe);

        // Materialien für die Einbaukomponenten
        const panelGrau = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.5 });
        const apzBlau   = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 }); // Hager APZ-Blau
        const kupfer    = new THREE.MeshStandardMaterial({ color: 0xd17a34, metalness: 0.8, roughness: 0.2 });
        const automat   = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 });
        const rcdHebel  = new THREE.MeshStandardMaterial({ color: 0xd9534f }); // Rot für Prüftaste

        // 1. Die Innere Trägerplatte (Rückwand der Felder)
        const backplate = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.02, H - 0.04), panelGrau);
        backplate.rotation.y = Math.PI / 2;
        backplate.receiveShadow = true;
        innenlebenGruppe.add(backplate);

        // 2. Linkes Feld: Sammelschienen unten (NAR / 5-polig)
        const schienenGruppe = new THREE.Group();
        schienenGruppe.position.set(0.002, -H/2 + 0.18, D/4);
        innenlebenGruppe.add(schienenGruppe);

        for (let i = 0; i < 5; i++) {
            const schiene = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.012, D/2 - 0.04), kupfer);
            schiene.position.y = i * 0.025;
            schiene.castShadow = true;
            schienenGruppe.add(schiene);
        }

        // 3. Linkes Feld: Zählerplatz (ZP1 ohne SLS)
        const zaehlerPlatz = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.22), automat);
        zaehlerPlatz.position.set(0.01, 0.05, D/4);
        zaehlerPlatz.castShadow = true;
        innenlebenGruppe.add(zaehlerPlatz);

        // 4. Rechtes Feld: APZ-Raum (Oben rechts mit blauer Abdeckung)
        const apzBlock = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.22), apzBlau);
        apzBlock.position.set(0.008, H/2 - 0.08, -D/4);
        apzBlock.castShadow = true;
        innenlebenGruppe.add(apzBlock);

        // 5. Rechtes Feld: 3 Reihen Hutschienen-Schutzorgane
        const reihenY = [0.1, -0.06, -0.22]; 
        reihenY.forEach((yPos) => {
            const reihenGruppe = new THREE.Group();
            reihenGruppe.position.set(0.008, yPos, -D/4);
            innenlebenGruppe.add(reihenGruppe);

            // Automaten-Block (Grundkörper für LS-Schalter)
            const automatenBreite = 0.20;
            const block = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, automatenBreite), automat);
            block.castShadow = true;
            reihenGruppe.add(block);

            // Typ B RCD farblich separat hervorheben (allstromsensitiv für Wallbox)
            const rcd = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.058, 0.04), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.4}));
            rcd.position.z = automatenBreite/2 - 0.02;
            rcd.castShadow = true;
            reihenGruppe.add(rcd);

            // RCD Test-Button Detail
            const testButton = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.01, 0.01), rcdHebel);
            testButton.position.set(0.002, 0.015, automatenBreite/2 - 0.02);
            reihenGruppe.add(testButton);
        });

        // ─── Frontrahmen & Tür-Mechanik ───
        const rahmenDicke = 0.012;
        const rahmenX = W / 2 + rahmenDicke / 2;
        
        const rfTop = new THREE.Mesh(new THREE.BoxGeometry(rahmenDicke, FRAME_W, D), hagerWeissMat);
        rfTop.position.set(rahmenX, H / 2 - FRAME_W / 2, 0); uv.add(rfTop);
        
        const rfBot = rfTop.clone();
        rfBot.position.y = -H / 2 + FRAME_W / 2; uv.add(rfBot);
        
        const rfLeft = new THREE.Mesh(new THREE.BoxGeometry(rahmenDicke, H - 2 * FRAME_W, FRAME_W), hagerWeissMat);
        rfLeft.position.set(rahmenX, 0, -D / 2 + FRAME_W / 2); uv.add(rfLeft);
        
        const rfRight = rfLeft.clone();
        rfRight.position.z = D / 2 - FRAME_W / 2; uv.add(rfRight);

        // TÜR-GRUPPE (Drehpunkt Kamera-Links am Scharnier)
        const doorGroup = new THREE.Group();
        doorGroup.position.set(rahmenX + rahmenDicke / 2, 0, D / 2 - FRAME_W);
        uv.add(doorGroup);

        const doorW = D - 2 * FRAME_W - 0.002;
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(0.006, H - 2 * FRAME_W - 0.002, doorW),
            hagerWeissMat
        );
        door.position.z = -doorW / 2;
        door.castShadow = true;
        doorGroup.add(door);

        // Hager-Verschluss (Anthrazitfarbener Klapphebel)
        const griffGruppe = new THREE.Group();
        griffGruppe.position.set(0.004, 0, -doorW + 0.05);
        doorGroup.add(griffGruppe);

        const verschlussBasis = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.12, 0.025), hagerAnthrazit);
        griffGruppe.add(verschlussBasis);

        const hebel = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.012), hagerAnthrazit);
        hebel.position.x = 0.002;
        griffGruppe.add(hebel);

        // hager Logo-Label per CanvasTexture
        const cvs = document.createElement('canvas');
        cvs.width = 128; cvs.height = 32;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, 128, 32);
        ctx.fillStyle = '#2b2c2c';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('hager', 12, 22);
        const hagerTex = new THREE.CanvasTexture(cvs);
        
        const brandLabel = new THREE.Mesh(
            new THREE.PlaneGeometry(0.06, 0.015),
            new THREE.MeshBasicMaterial({ map: hagerTex })
        );
        brandLabel.position.set(0.0045, H / 2 - 0.06, -doorW + 0.05);
        brandLabel.rotation.y = Math.PI / 2;
        doorGroup.add(brandLabel);

        uv.userData.doorGroup = doorGroup;
        uv.userData.isOpened = false;

        return uv;
    }

    const unterverteilung = buildUnterverteilung();
    unterverteilung.position.set(-ROOM_W/2 + 0.06, 1.5, -0.4);
    scene.add(unterverteilung);

    // ─── 3) Beleuchtung & PBR-Umgebung ───
    scene.add(new THREE.AmbientLight(0xfff4e0, 0.8));

    const hemiLight = new THREE.HemisphereLight(0xfff4e0, 0x40382e, 0.4);
    scene.add(hemiLight);

    const ceilLight = new THREE.PointLight(0xffe2b8, 60, 14, 1.6);
    ceilLight.position.set(0, ROOM_H - 0.15, 0);
    ceilLight.castShadow = true;
    ceilLight.shadow.mapSize.set(1024, 1024);
    ceilLight.shadow.bias = -0.0005;
    scene.add(ceilLight);

    // PMREM Generator erzeugt plastische Spiegelungen auf den matten Hager-Flächen
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;

    const lampMesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 32),
        new THREE.MeshBasicMaterial({ color: 0xffeec8 })
    );
    lampMesh.position.set(0, ROOM_H - 0.005, 0);
    lampMesh.rotation.x = Math.PI / 2;
    scene.add(lampMesh);

    // ─── 4) POV-Steuerung: Drag-to-look ───
    const uvPos = unterverteilung.position;
    let yaw = Math.atan2(
        -(uvPos.x - camera.position.x),
        -(uvPos.z - camera.position.z)
    );
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
        yaw   += dx * SENS;
        pitch += dy * SENS;
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

    // ─── 4b) Smooth Zoom-Funktion (Mausrad & Touch-Pinch) ───
    let targetFOV = 72; // Start-Blickwinkel
    const MIN_FOV = 20; // Maximaler Zoom (sehr nah dran!)
    const MAX_FOV = 72; // Normaler Raum-Blickwinkel

    // Desktop: Zoom per Mausrad
    container.addEventListener('wheel', (e) => {
        e.preventDefault(); // Verhindert, dass die Webseite beim Zoomen scrollt
        // DeltaY bestimmt die Richtung. Multiplikator bestimmt die Scroll-Geschwindigkeit.
        targetFOV += e.deltaY * 0.05; 
        targetFOV = Math.max(MIN_FOV, Math.min(MAX_FOV, targetFOV));
    }, { passive: false });

    // Mobile: Pinch-to-Zoom (Zwei Finger)
    let initialPinchDistance = null;
    let initialFOV = targetFOV;

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDistance = Math.hypot(dx, dy);
            initialFOV = targetFOV;
        }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialPinchDistance !== null) {
            e.preventDefault(); // Verhindert das Neuladen/Scrollen auf dem Handy
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.hypot(dx, dy);
            
            // Berechnung des Zoom-Faktors anhand der Fingerbewegung
            const pinchScale = initialPinchDistance / currentDistance;
            targetFOV = initialFOV * pinchScale;
            targetFOV = Math.max(MIN_FOV, Math.min(MAX_FOV, targetFOV));
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            initialPinchDistance = null;
        }
    });

    // ─── 5) Bedienhinweis ───
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

    // ─── 5b) Klick-Interaktion zum Öffnen der Tür ───
    const raycaster = new THREE.Raycaster();
    const mouseClick = new THREE.Vector2();

    container.addEventListener('click', (e) => {
        if (isDragging) return; 

        const rect = container.getBoundingClientRect();
        mouseClick.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseClick.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseClick, camera);
        const intersects = raycaster.intersectObjects(unterverteilung.children, true);

        if (intersects.length > 0) {
            const doorG = unterverteilung.userData.doorGroup;
            const isOpen = unterverteilung.userData.isOpened;

            let targetRotation = isOpen ? 0 : Math.PI * 0.65; // 115 Grad Schwenk
            
            const performOpenAnimation = () => {
                let diff = targetRotation - doorG.rotation.y;
                if (Math.abs(diff) > 0.001) {
                    doorG.rotation.y += diff * 0.12;
                    // Hinweis ausblenden, falls noch sichtbar
                    fadeHint();
                } else {
                    doorG.rotation.y = targetRotation;
                }
            };
            
            performOpenAnimation();
            unterverteilung.userData.isOpened = !isOpen;
        }
    });

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

        // Blickrichtung aktualisieren
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;

        // 🌟 NEU: Smooth Zoom Easing (gleitet sanft zum Ziel-Zoom)
        if (Math.abs(camera.fov - targetFOV) > 0.05) {
            camera.fov += (targetFOV - camera.fov) * 0.08; // 0.08 ist die Weichheit
            camera.updateProjectionMatrix(); // Wichtig: Kamera aktualisieren!
        }

        renderer.render(scene, camera);
    }
    

    // ─── 7) Responsive ───
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}