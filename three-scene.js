// ─── BT Elektrotechnik · POV-Raum (Schritt 6) ───
// Virtueller Showroom mit prozeduralem Hager-Zählerschrank, OBO-PAS und Jean Müller HAK.
// Inklusive Drag-to-look, Smooth-Zoom und Klick-Interaktion.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

        const W = 0.16;        // Tiefe
        const H = 0.95;        // Höhe
        const D = 0.55;        // Breite
        const FRAME_W = 0.015; // Rahmenstärke

        const hagerWeissMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.42, metalness: 0.15 });
        const hagerAnthrazit = new THREE.MeshStandardMaterial({ color: 0x2b2c2c, roughness: 0.5, metalness: 0.2 });

        const korpus = new THREE.Mesh(new THREE.BoxGeometry(W - 0.01, H - 0.01, D - 0.01), hagerWeissMat);
        korpus.position.x = -(0.01 / 2);
        korpus.castShadow = true;
        korpus.receiveShadow = true;
        uv.add(korpus);

        // Das prozedurale 3D-Innenleben
        const innenlebenGruppe = new THREE.Group();
        innenlebenGruppe.position.x = W / 2 - 0.015; 
        uv.add(innenlebenGruppe);

        const panelGrau = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.5 });
        const apzBlau   = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });
        const kupfer    = new THREE.MeshStandardMaterial({ color: 0xd17a34, metalness: 0.8, roughness: 0.2 });
        const automat   = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 });
        const rcdHebel  = new THREE.MeshStandardMaterial({ color: 0xd9534f });

        const backplate = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.02, H - 0.04), panelGrau);
        backplate.rotation.y = Math.PI / 2;
        backplate.receiveShadow = true;
        innenlebenGruppe.add(backplate);

        const schienenGruppe = new THREE.Group();
        schienenGruppe.position.set(0.002, -H/2 + 0.18, D/4);
        innenlebenGruppe.add(schienenGruppe);

        for (let i = 0; i < 5; i++) {
            const schiene = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.012, D/2 - 0.04), kupfer);
            schiene.position.y = i * 0.025;
            schiene.castShadow = true;
            schienenGruppe.add(schiene);
        }

        const zaehlerPlatz = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.22), automat);
        zaehlerPlatz.position.set(0.01, 0.05, D/4);
        zaehlerPlatz.castShadow = true;
        innenlebenGruppe.add(zaehlerPlatz);

        const apzBlock = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.22), apzBlau);
        apzBlock.position.set(0.008, H/2 - 0.08, -D/4);
        apzBlock.castShadow = true;
        innenlebenGruppe.add(apzBlock);

        const reihenY = [0.1, -0.06, -0.22]; 
        reihenY.forEach((yPos) => {
            const reihenGruppe = new THREE.Group();
            reihenGruppe.position.set(0.008, yPos, -D/4);
            innenlebenGruppe.add(reihenGruppe);

            const automatenBreite = 0.20;
            const block = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, automatenBreite), automat);
            block.castShadow = true;
            reihenGruppe.add(block);

            const rcd = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.058, 0.04), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.4}));
            rcd.position.z = automatenBreite/2 - 0.02;
            rcd.castShadow = true;
            reihenGruppe.add(rcd);

            const testButton = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.01, 0.01), rcdHebel);
            testButton.position.set(0.002, 0.015, automatenBreite/2 - 0.02);
            reihenGruppe.add(testButton);
        });

        // Frontrahmen
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

        // TÜR-GRUPPE
        const doorGroup = new THREE.Group();
        doorGroup.position.set(rahmenX + rahmenDicke / 2, 0, D / 2 - FRAME_W);
        uv.add(doorGroup);

        const doorW = D - 2 * FRAME_W - 0.002;
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.006, H - 2 * FRAME_W - 0.002, doorW), hagerWeissMat);
        door.position.z = -doorW / 2;
        door.castShadow = true;
        doorGroup.add(door);

        const griffGruppe = new THREE.Group();
        griffGruppe.position.set(0.004, 0, -doorW + 0.05);
        doorGroup.add(griffGruppe);
        const verschlussBasis = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.12, 0.025), hagerAnthrazit);
        griffGruppe.add(verschlussBasis);
        const hebel = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.012), hagerAnthrazit);
        hebel.position.x = 0.002;
        griffGruppe.add(hebel);

        const cvs = document.createElement('canvas');
        cvs.width = 128; cvs.height = 32;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, 128, 32);
        ctx.fillStyle = '#2b2c2c'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('hager', 12, 22);
        const hagerTex = new THREE.CanvasTexture(cvs);
        
        const brandLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.015), new THREE.MeshBasicMaterial({ map: hagerTex }));
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

    // ─── 2c) Potentialausgleichsschiene (Dehn / OBO Style) ───
    function buildPAS() {
        const pasGroup = new THREE.Group();
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 });
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xcca652, metalness: 0.85, roughness: 0.25 });
        const screwMat = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, metalness: 0.9, roughness: 0.2 });
        const peColor = new THREE.MeshStandardMaterial({ color: 0x8CBF26, roughness: 0.6 });

        const base = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.025), baseMat);
        base.castShadow = true; base.receiveShadow = true; pasGroup.add(base);

        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.008), brassMat);
        bar.position.set(0, 0, 0.015); bar.castShadow = true; pasGroup.add(bar);

        const positions = [-0.05, -0.02, 0.01, 0.05];
        positions.forEach((posX, index) => {
            const screw = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.012), screwMat);
            screw.position.set(posX, 0, 0.018); screw.castShadow = true; pasGroup.add(screw);

            if (index === 0) {
                const wireUp = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.85), peColor);
                wireUp.position.set(posX, 0.425, 0.015); wireUp.castShadow = true; pasGroup.add(wireUp);
            }
            if (index === 3) {
                const wireDown = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.4), peColor);
                wireDown.position.set(posX, -0.2, 0.015); wireDown.castShadow = true; pasGroup.add(wireDown);
            }
        });
        return pasGroup;
    }

    const potentialausgleich = buildPAS();
    potentialausgleich.position.set(-ROOM_W/2 + 0.015, 0.3, -0.4);
    potentialausgleich.rotation.y = Math.PI / 2;
    scene.add(potentialausgleich);

    // ─── 2d) Hausanschlusskasten (HAK · Jean-Müller-Style) ───
    function buildHAKAndCables() {
        const hakGroup = new THREE.Group();

        // Materialien — etwas dunkleres Gehäuse, sichtbarer Deckel
        const hakBaseMat  = new THREE.MeshStandardMaterial({
            color: 0x9a958c, roughness: 0.65, metalness: 0.05
        });
        const hakCoverMat = new THREE.MeshStandardMaterial({
            color: 0xdcdcdc, roughness: 0.15, metalness: 0.1,
            transparent: true, opacity: 0.55      // sichtbar, aber durchscheinend
        });
        const nhBaseMat   = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
        const nhFuseMat   = new THREE.MeshStandardMaterial({ color: 0xf2ede0, roughness: 0.75 });
        const nhMetalMat  = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
        const nhRedMat    = new THREE.MeshStandardMaterial({ color: 0xd92b2b });

        const nymGrau     = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.6 });
        const nyySchwarz  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
        const peGruenGelb = new THREE.MeshStandardMaterial({ color: 0x8CBF26, roughness: 0.6 });

        // Maße: Jean-Müller-typisch
        const hakW = 0.12;  // Tiefe (X, in den Raum)
        const hakH = 0.36;  // Höhe (Y)
        const hakD = 0.22;  // Breite an Wand (Z)

        // Korpus (Body)
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(hakW - 0.04, hakH, hakD), hakBaseMat
        );
        base.position.x = -0.02;
        base.castShadow = true; base.receiveShadow = true;
        hakGroup.add(base);

        // 3× NH-Sicherungen (L1, L2, L3) verteilt entlang Z
        const abstandZ = 0.06;
        const startZ = -abstandZ;
        for (let i = 0; i < 3; i++) {
            const phaseGroup = new THREE.Group();
            phaseGroup.position.set(hakW / 2 - 0.035, 0, startZ + i * abstandZ);
            hakGroup.add(phaseGroup);

            const sockel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.045), nhBaseMat);
            phaseGroup.add(sockel);
            const kontaktOben = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.03), nhMetalMat);
            kontaktOben.position.set(0.01, 0.08, 0); phaseGroup.add(kontaktOben);
            const kontaktUnten = kontaktOben.clone();
            kontaktUnten.position.set(0.01, -0.08, 0); phaseGroup.add(kontaktUnten);
            const fuse = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.035), nhFuseMat);
            fuse.position.set(0.015, 0, 0); phaseGroup.add(fuse);
            const lasche = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.02, 0.01), nhMetalMat);
            lasche.position.set(0.016, 0.05, 0); phaseGroup.add(lasche);
            const lasche2 = lasche.clone();
            lasche2.position.set(0.016, -0.05, 0); phaseGroup.add(lasche2);
            const redDot = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 16), nhRedMat);
            redDot.rotation.z = Math.PI / 2;
            redDot.position.set(0.028, 0, 0); phaseGroup.add(redDot);
        }

        // Halbtransparenter Frontdeckel
        const deckel = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, hakH + 0.01, hakD + 0.01), hakCoverMat
        );
        deckel.position.x = hakW / 2 - 0.012;
        deckel.castShadow = true;
        hakGroup.add(deckel);

        // Beschriftungsschild "HAK" oben auf dem Deckel
        const lblCvs = document.createElement('canvas');
        lblCvs.width = 256; lblCvs.height = 80;
        const lc = lblCvs.getContext('2d');
        lc.fillStyle = '#1c1612'; lc.fillRect(0, 0, 256, 80);
        lc.fillStyle = '#F5A623';
        lc.font = 'bold 28px sans-serif';
        lc.textAlign = 'center'; lc.textBaseline = 'middle';
        lc.fillText('HAK', 128, 26);
        lc.font = 'bold 14px sans-serif';
        lc.fillStyle = '#bbb';
        lc.fillText('NH00 · 3-polig · 63 A', 128, 56);
        const lblTex = new THREE.CanvasTexture(lblCvs);
        lblTex.colorSpace = THREE.SRGBColorSpace;
        const lblMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.16, 0.05),
            new THREE.MeshBasicMaterial({ map: lblTex })
        );
        lblMesh.position.set(hakW / 2 + 0.003, hakH / 2 - 0.04, 0);
        lblMesh.rotation.y = Math.PI / 2;
        hakGroup.add(lblMesh);

        // ─── Kabel (jetzt in LOKALEN Koordinaten relativ zur hakGroup) ───
        const createCable = (points, material, radius) => {
            const curve = new THREE.CatmullRomCurve3(points);
            const geometry = new THREE.TubeGeometry(curve, 32, radius, 12, false);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            return mesh;
        };

        // Lokales X für Kabel: dicht an der Wand. Bei späterer Positionierung
        // hakGroup.position.x = -ROOM_W/2 + 0.07 sitzt der Wandanstrich bei
        // lokal X = -0.05 (also -ROOM_W/2 - hakGroup.position.x ≈ -0.05).
        const wandLX = -0.045;

        // 1) Versorgungskabel: aus dem Boden hoch in den HAK von unten (NYY 4x35² schwarz)
        const zuleitungPoints = [
            new THREE.Vector3(wandLX, -0.75, 0),     // Boden (lokal weit unten)
            new THREE.Vector3(wandLX, -0.40, 0),
            new THREE.Vector3(wandLX, -hakH/2 + 0.01, 0)  // Eintritt am HAK-Boden
        ];
        hakGroup.add(createCable(zuleitungPoints, nyySchwarz, 0.015));

        // 2) Abgang zum Zählerschrank/UV: aus dem HAK nach oben (NYM-J 5x10² grau)
        // UV-Boden liegt im Welt bei Y ≈ 1.11; HAK-Group sitzt bei Y ≈ 0.75 →
        // also lokales Ziel-Y ≈ 0.36. Wir hängen das Kabel dort an.
        const abgangPoints = [
            new THREE.Vector3(wandLX, hakH/2 - 0.01, 0),  // Austritt am HAK-Deckel
            new THREE.Vector3(wandLX, hakH/2 + 0.10, 0),
            new THREE.Vector3(wandLX, 0.38, 0)            // Eingang am UV-Boden (lokal)
        ];
        hakGroup.add(createCable(abgangPoints, nymGrau, 0.012));

        // 3) PE-Verbindung zur PAS (Schiene sitzt unter dem HAK bei Welt Y ≈ 0.3)
        // → lokales Ziel-Y ≈ -0.45
        const pePoints = [
            new THREE.Vector3(wandLX, -hakH/2 + 0.02, 0.06),
            new THREE.Vector3(wandLX, -hakH/2 - 0.10, 0.04),
            new THREE.Vector3(wandLX, -0.45, 0)
        ];
        hakGroup.add(createCable(pePoints, peGruenGelb, 0.005));

        return hakGroup;
    }

    const hausanschluss = buildHAKAndCables();
    // NEU: HAK sitzt an der LINKEN Wand zwischen UV (oben) und PAS (unten)
    hausanschluss.position.set(-ROOM_W/2 + 0.07, 0.75, -0.4);
    scene.add(hausanschluss);

    // ─── 2e) Tür zur Garage (an der Ostwand · rechts) ───
    function buildGarageDoor() {
        const g = new THREE.Group();
        const W = 0.95;  // Türbreite (Z im Welt)
        const H = 2.10;  // Türhöhe (Y)
        const FT = 0.06; // Rahmen-Dicke (Y/Z-Richtung)
        const FD = 0.05; // Rahmen-Tiefe (X-Richtung, in Raum)

        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x2a2620, roughness: 0.5, metalness: 0.3
        });
        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x3a3530, roughness: 0.55, metalness: 0.15
        });
        const openingMat = new THREE.MeshBasicMaterial({ color: 0x080706 });
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0xc0a06a, roughness: 0.4, metalness: 0.75
        });

        // "Öffnung" hinter der Tür — dunkles Rechteck, das den Eindruck eines
        // tieferen Durchgangs erzeugt, sobald die Tür leicht versetzt davor sitzt.
        const opening = new THREE.Mesh(new THREE.PlaneGeometry(W, H), openingMat);
        opening.position.x = -0.001;
        opening.rotation.y = -Math.PI / 2;  // Normale in -X (in den Raum)
        g.add(opening);

        // Rahmen (drei Seiten: oben, links, rechts — unten nicht, da Türschwelle)
        const topF = new THREE.Mesh(
            new THREE.BoxGeometry(FD, FT, W + 2*FT), frameMat
        );
        topF.position.set(-FD/2, H/2 + FT/2, 0);
        g.add(topF);

        const leftF = new THREE.Mesh(
            new THREE.BoxGeometry(FD, H + FT, FT), frameMat
        );
        leftF.position.set(-FD/2, FT/2, -W/2 - FT/2);
        g.add(leftF);

        const rightF = leftF.clone();
        rightF.position.set(-FD/2, FT/2, W/2 + FT/2);
        g.add(rightF);

        // Türblatt — leicht zurückversetzt in der Rahmenöffnung
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, H - 0.04, W - 0.04), doorMat
        );
        panel.position.set(-FD + 0.025, -0.02, 0);
        panel.castShadow = true;
        g.add(panel);

        // Griff (gold-bronze) auf der linken Türseite (vom Raum aus gesehen)
        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.025, 0.12), handleMat
        );
        handle.position.set(-FD - 0.025, 0, -W/2 + 0.15);
        g.add(handle);

        // Beschilderung "→ GARAGE" über der Tür
        const cvs = document.createElement('canvas');
        cvs.width = 512; cvs.height = 96;
        const c = cvs.getContext('2d');
        c.fillStyle = '#1c1612';
        c.fillRect(0, 0, 512, 96);
        c.fillStyle = '#F5A623';
        c.font = 'bold 44px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('→  GARAGE', 256, 48);
        const tex = new THREE.CanvasTexture(cvs);
        tex.colorSpace = THREE.SRGBColorSpace;

        const lbl = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 0.13),
            new THREE.MeshBasicMaterial({ map: tex })
        );
        lbl.position.set(-FD - 0.005, H/2 + FT + 0.13, 0);
        lbl.rotation.y = -Math.PI / 2;
        g.add(lbl);

        return g;
    }

    const garageDoor = buildGarageDoor();
    // Auf die Ostwand setzen (X = +ROOM_W/2 = rechte Wand), leicht südlich von Mitte
    garageDoor.position.set(ROOM_W/2, 1.05, 0.5);
    scene.add(garageDoor);

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

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;

    const lampMesh = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshBasicMaterial({ color: 0xffeec8 }));
    lampMesh.position.set(0, ROOM_H - 0.005, 0); lampMesh.rotation.x = Math.PI / 2; scene.add(lampMesh);

    function buildWallbox() {
        const wb = new THREE.Group();

        // Maße inspiriert vom Schneider Charge (~480×235×110mm)
        const W = 0.11;     // Tiefe in den Raum (X)
        const H = 0.48;     // Höhe (Y)
        const D = 0.235;    // Breite an der Wand (Z)

        // Materialien
        const housingMat = new THREE.MeshStandardMaterial({
            color: 0xf6f6f3, roughness: 0.32, metalness: 0.04
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0xcecbc4, roughness: 0.45, metalness: 0.05
        });
        const cableMat = new THREE.MeshStandardMaterial({
            color: 0x161616, roughness: 0.85, metalness: 0
        });
        const connectorMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, roughness: 0.55, metalness: 0.2
        });
        const contactsMat = new THREE.MeshStandardMaterial({
            color: 0xa8a8a8, roughness: 0.3, metalness: 0.85
        });

        // ── Hauptkörper ──
        const housing = new THREE.Mesh(
            new THREE.BoxGeometry(W, H, D), housingMat
        );
        housing.castShadow = true;
        housing.receiveShadow = true;
        wb.add(housing);

        // ── Dünne Trim-Bänder oben/unten für Profil ──
        const TT = 0.004;
        const topT = new THREE.Mesh(
            new THREE.BoxGeometry(W + 0.002, TT, D + 0.002), trimMat
        );
        topT.position.y = H/2 - TT/2;
        wb.add(topT);
        const botT = topT.clone();
        botT.position.y = -H/2 + TT/2;
        wb.add(botT);

        // ── Grünes Display (Pille mit BT-Branding) ──
        // Komplette Pille + Text auf Canvas, dann als Plane vorne aufkleben
        const cvs = document.createElement('canvas');
        cvs.width = 256; cvs.height = 340;
        const c = cvs.getContext('2d');
        c.clearRect(0, 0, 256, 340);

        // Pille-Form (gerundetes Rechteck mit Halbkreis-Caps)
        const pX = 22, pY = 26, pW = 212, pH = 288;
        const pR = pW / 2;
        c.fillStyle = '#52a23d';
        c.beginPath();
        c.moveTo(pX + pR, pY);
        c.lineTo(pX + pW - pR, pY);
        c.arcTo(pX + pW, pY, pX + pW, pY + pR, pR);
        c.lineTo(pX + pW, pY + pH - pR);
        c.arcTo(pX + pW, pY + pH, pX + pW - pR, pY + pH, pR);
        c.lineTo(pX + pR, pY + pH);
        c.arcTo(pX, pY + pH, pX, pY + pH - pR, pR);
        c.lineTo(pX, pY + pR);
        c.arcTo(pX, pY, pX + pR, pY, pR);
        c.closePath();
        c.fill();

        // Subtiler Glanz-Verlauf für plastischen Look
        const grad = c.createLinearGradient(pX, pY, pX + pW, pY + pH);
        grad.addColorStop(0,   'rgba(255,255,255,0.20)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
        c.fillStyle = grad;
        c.fill();

        // Text auf der Pille
        c.fillStyle = '#ffffff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 28px sans-serif';
        c.fillText('BT', 128, 135);
        c.font = '600 16px sans-serif';
        c.fillText('Elektrotechnik', 128, 162);
        c.font = 'italic 24px sans-serif';
        c.fillText('Charge', 128, 215);

        const panelTex = new THREE.CanvasTexture(cvs);
        panelTex.colorSpace = THREE.SRGBColorSpace;
        panelTex.anisotropy = 4;

        const panel = new THREE.Mesh(
            new THREE.PlaneGeometry(D * 0.82, H * 0.62),
            new THREE.MeshBasicMaterial({ map: panelTex, transparent: true })
        );
        panel.position.set(W/2 + 0.001, H * 0.08, 0);
        panel.rotation.y = Math.PI / 2;
        wb.add(panel);

        // ── Status-LED unten links ──
        const led = new THREE.Mesh(
            new THREE.CircleGeometry(0.005, 16),
            new THREE.MeshBasicMaterial({ color: 0x5cff7a })
        );
        led.position.set(W/2 + 0.001, -H * 0.30, -D/2 + 0.025);
        led.rotation.y = Math.PI / 2;
        wb.add(led);
        const ledGlow = new THREE.Mesh(
            new THREE.SphereGeometry(0.010, 12, 12),
            new THREE.MeshBasicMaterial({
                color: 0x5cff7a, transparent: true, opacity: 0.35
            })
        );
        ledGlow.position.copy(led.position);
        wb.add(ledGlow);

        // ── Typ-2-Steckdose (vorne, zum Einstecken des Steckers) ──
        const socketBg = new THREE.Mesh(
            new THREE.CircleGeometry(0.030, 24),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
        );
        socketBg.position.set(W/2 + 0.001, -H * 0.32, 0);
        socketBg.rotation.y = Math.PI / 2;
        wb.add(socketBg);
        const socketInner = new THREE.Mesh(
            new THREE.CircleGeometry(0.022, 18),
            new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.75 })
        );
        socketInner.position.set(W/2 + 0.002, -H * 0.32, 0);
        socketInner.rotation.y = Math.PI / 2;
        wb.add(socketInner);

        // ── Ladekabel: hängt aus +Z-Seite oben raus, U-Bogen nach unten ──
        const cablePoints = [
            new THREE.Vector3(0,          H * 0.38, D/2 + 0.008),
            new THREE.Vector3(W/2 + 0.06, H * 0.22, D/2 + 0.06),
            new THREE.Vector3(W/2 + 0.12, H * 0.0,  D/2 + 0.08),
            new THREE.Vector3(W/2 + 0.14, -H * 0.20, D/2 + 0.06),
            new THREE.Vector3(W/2 + 0.12, -H * 0.42, D/2 + 0.02),
            new THREE.Vector3(W/2 + 0.08, -H * 0.62, D/2 - 0.04),
            new THREE.Vector3(W/2 + 0.04, -H * 0.82, D/2 - 0.09),
            new THREE.Vector3(W/2 + 0.02, -H * 0.96, D/2 - 0.13)
        ];
        const cableCurve = new THREE.CatmullRomCurve3(cablePoints);
        const cableGeo = new THREE.TubeGeometry(cableCurve, 60, 0.0095, 12, false);
        const cable = new THREE.Mesh(cableGeo, cableMat);
        cable.castShadow = true;
        wb.add(cable);

        // Zugentlastung am Kabel-Austritt
        const strainRelief = new THREE.Mesh(
            new THREE.CylinderGeometry(0.013, 0.011, 0.025, 12),
            connectorMat
        );
        strainRelief.position.set(0, H * 0.38, D/2 + 0.005);
        wb.add(strainRelief);

        // ── Typ-2-Stecker am Kabelende ──
        const connector = new THREE.Group();

        // Strain-Relief am oberen Ende (Übergang zum Kabel)
        const sr = new THREE.Mesh(
            new THREE.CylinderGeometry(0.011, 0.020, 0.025, 12), connectorMat
        );
        sr.position.y = 0.030;
        connector.add(sr);

        // Griff (Hand-Bereich)
        const grip = new THREE.Mesh(
            new THREE.CylinderGeometry(0.024, 0.022, 0.075, 16), connectorMat
        );
        grip.position.y = -0.020;
        connector.add(grip);

        // Steckerkopf (7-eckig = Typ-2-Look)
        const head = new THREE.Mesh(
            new THREE.CylinderGeometry(0.024, 0.020, 0.040, 7), connectorMat
        );
        head.position.y = -0.078;
        connector.add(head);

        // Kontaktfläche im Kopf
        const face = new THREE.Mesh(
            new THREE.CylinderGeometry(0.016, 0.016, 0.002, 7),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 })
        );
        face.position.y = -0.099;
        connector.add(face);

        // 3 angedeutete Kontaktstifte
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2;
            const pin = new THREE.Mesh(
                new THREE.CylinderGeometry(0.0025, 0.0025, 0.005, 8), contactsMat
            );
            pin.position.set(Math.cos(a) * 0.010, -0.099, Math.sin(a) * 0.010);
            connector.add(pin);
        }

        // Stecker ans Kabelende, leicht geneigt (wirkt wie hängend)
        connector.position.copy(cablePoints[cablePoints.length - 1]);
        connector.rotation.x = -Math.PI / 8;
        connector.rotation.z = Math.PI / 12;
        wb.add(connector);

        return wb;
    }

    // ─── 3b) GARAGE-SZENE als separate THREE.Scene ───
    function buildBackDoor(label) {
        // Wie die Garage-Tür, aber mit "← TECHNIKRAUM"
        const g = new THREE.Group();
        const W = 0.95, H = 2.10, FT = 0.06, FD = 0.05;
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.5, metalness: 0.3 });
        const doorMat  = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.55, metalness: 0.15 });
        const openingMat = new THREE.MeshBasicMaterial({ color: 0x080706 });
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xc0a06a, roughness: 0.4, metalness: 0.75 });

        const opening = new THREE.Mesh(new THREE.PlaneGeometry(W, H), openingMat);
        opening.position.x = -0.001; opening.rotation.y = -Math.PI / 2; g.add(opening);

        const topF = new THREE.Mesh(new THREE.BoxGeometry(FD, FT, W + 2*FT), frameMat);
        topF.position.set(-FD/2, H/2 + FT/2, 0); g.add(topF);
        const leftF = new THREE.Mesh(new THREE.BoxGeometry(FD, H + FT, FT), frameMat);
        leftF.position.set(-FD/2, FT/2, -W/2 - FT/2); g.add(leftF);
        const rightF = leftF.clone();
        rightF.position.set(-FD/2, FT/2, W/2 + FT/2); g.add(rightF);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.04, H - 0.04, W - 0.04), doorMat);
        panel.position.set(-FD + 0.025, -0.02, 0); panel.castShadow = true; g.add(panel);

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.12), handleMat);
        handle.position.set(-FD - 0.025, 0, -W/2 + 0.15); g.add(handle);

        const cvs = document.createElement('canvas');
        cvs.width = 512; cvs.height = 96;
        const c = cvs.getContext('2d');
        c.fillStyle = '#1c1612'; c.fillRect(0, 0, 512, 96);
        c.fillStyle = '#F5A623';
        c.font = 'bold 38px sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(label, 256, 48);
        const tex = new THREE.CanvasTexture(cvs);
        tex.colorSpace = THREE.SRGBColorSpace;
        const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.13), new THREE.MeshBasicMaterial({ map: tex }));
        lbl.position.set(-FD - 0.005, H/2 + FT + 0.13, 0); lbl.rotation.y = -Math.PI / 2; g.add(lbl);

        return g;
    }

    function buildGarageScene() {
        const gScene = new THREE.Scene();
        gScene.background = new THREE.Color(0x141210);
        gScene.fog = new THREE.Fog(0x141210, 8, 28);
        gScene.environment = scene.environment;   // PMREM-Map vom Technikraum übernehmen

        const GW = 7, GH = 3.0, GD = 7;

        // Beton-Boden
        const gFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(GW, GD),
            new THREE.MeshStandardMaterial({ color: 0x3a3835, roughness: 0.92, metalness: 0.05 })
        );
        gFloor.rotation.x = -Math.PI / 2;
        gFloor.receiveShadow = true;
        gScene.add(gFloor);

        // Decke
        const gCeil = new THREE.Mesh(
            new THREE.PlaneGeometry(GW, GD),
            new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 })
        );
        gCeil.rotation.x = Math.PI / 2; gCeil.position.y = GH; gScene.add(gCeil);

        // Wände — kühleres Betongrau für Industrie-Look
        const gWallMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.95 });
        const mw = (w, h, x, y, z, ry) => {
            const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), gWallMat);
            wall.position.set(x, y, z); wall.rotation.y = ry; wall.receiveShadow = true;
            gScene.add(wall);
        };
        mw(GW, GH, 0,        GH/2, -GD/2, 0);          // Nord (vor uns, das große Garagentor kommt hier hin)
        mw(GW, GH, 0,        GH/2,  GD/2, Math.PI);    // Süd
        mw(GD, GH, -GW/2,    GH/2,  0,    Math.PI/2);  // West (links — hier kommt die Wallbox dran)
        mw(GD, GH,  GW/2,    GH/2,  0,   -Math.PI/2);  // Ost (rechts — Rück-Tür zum Technikraum)

        // Sockelleisten
        const skMat = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.6 });
        const mkSkirt = (w, x, y, z, ry) => {
            const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.015), skMat);
            s.position.set(x, y, z); s.rotation.y = ry; gScene.add(s);
        };
        mkSkirt(GW, 0, 0.04, -GD/2 + 0.008, 0);
        mkSkirt(GW, 0, 0.04,  GD/2 - 0.008, 0);
        mkSkirt(GD, -GW/2 + 0.008, 0.04, 0, Math.PI/2);
        mkSkirt(GD,  GW/2 - 0.008, 0.04, 0, Math.PI/2);

        // Beleuchtung — etwas kühler/weißer als der Technikraum
        gScene.add(new THREE.AmbientLight(0xf0eedd, 0.7));
        const gHemi = new THREE.HemisphereLight(0xf0eedd, 0x383834, 0.45);
        gScene.add(gHemi);

        const gCeilLight = new THREE.PointLight(0xfff2d8, 55, 18, 1.6);
        gCeilLight.position.set(0, GH - 0.2, 0);
        gCeilLight.castShadow = true;
        gCeilLight.shadow.mapSize.set(1024, 1024);
        gCeilLight.shadow.bias = -0.0005;
        gScene.add(gCeilLight);

        const gLamp = new THREE.Mesh(
            new THREE.CircleGeometry(0.28, 32),
            new THREE.MeshBasicMaterial({ color: 0xfff2d8 })
        );
        gLamp.position.set(0, GH - 0.01, 0); gLamp.rotation.x = Math.PI / 2;
        gScene.add(gLamp);

        // Rück-Tür auf der OSTWAND (rechts in der Garage) zurück zum Technikraum
        const backDoor = buildBackDoor('←  TECHNIKRAUM');
        backDoor.position.set(GW/2, 1.05, -1.0);
        gScene.add(backDoor);

       // ── Wallbox (Blender-Modell statt prozeduraler Variante) ──
        // Procedural fallback buildWallbox() bleibt im Code erhalten, wird hier nur nicht mehr aufgerufen.
        const wallboxLoader = new GLTFLoader();
        wallboxLoader.load('./assets/wallbox.glb', (gltf) => {
            gltf.scene.rotation.y = -Math.PI / 2;
            gltf.scene.position.set(-GW/2 + 0.055, 1.01, -0.5);
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // ── BT-Charge-Branding auf grüne Pille ──
            const logoCvs = document.createElement('canvas');
            logoCvs.width = 512; logoCvs.height = 880;   // doppelte Auflösung → mehr Schärfe
            const lc = logoCvs.getContext('2d');
            lc.textAlign = 'center';
            lc.textBaseline = 'middle';

            // Dezenter heller Glow → hebt den anthrazitfarbenen Text
            // vom grünen Hintergrund leicht ab (wirkt wie eingraviert/erhaben)
            lc.shadowColor   = 'rgba(255, 255, 255, 0.35)';
            lc.shadowBlur    = 8;
            lc.shadowOffsetY = 0;

            // Anthrazit (identisch zum Hager-Frame in deiner UV)
            const anthrazit = '#2b2c2c';

            // "BT" — groß und fett
            lc.fillStyle = anthrazit;
            lc.font = 'bold 140px sans-serif';
            lc.fillText('BT', 256, 280);


            // "Elektrotechnik" — schmaler, drunter
            lc.font = '600 56px sans-serif';
            lc.fillText('Elektrotechnik', 256, 380);

            // Trenn-Linie in Anthrazit (ohne Glow für saubere Kante)
            lc.shadowBlur = 0;
            lc.fillStyle  = anthrazit;
            lc.fillRect(140, 460, 232, 4);

            // "Charge" — italic, prominent
            lc.shadowColor   = 'rgba(255, 255, 255, 0.35)';
            lc.shadowBlur    = 8;
            lc.fillStyle     = anthrazit;
            lc.font = 'italic bold 110px sans-serif';
            lc.fillText('Charge', 256, 600);

            const logoTex = new THREE.CanvasTexture(logoCvs);
            logoTex.colorSpace = THREE.SRGBColorSpace;
            logoTex.anisotropy = 16;

            const logoPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(0.14, 0.24),
                new THREE.MeshBasicMaterial({
                    map: logoTex, transparent: true
                })
            );
            logoPlane.position.set(0, 0.30, -0.067);
            logoPlane.rotation.y = Math.PI;
            gltf.scene.add(logoPlane);

            // Position im LOKALEN Koordinatensystem des Blender-Modells
            // (vor der Rotation um Y). Pille liegt bei (0, 0.3, -0.06),
            // wir setzen den Logo-Plane minimal davor (Z noch weiter negativ).
            logoPlane.position.set(0, 0.30, -0.067);
            logoPlane.rotation.y = Math.PI;   // Plane-Normale auf -Z drehen
            gltf.scene.add(logoPlane);

            gScene.add(gltf.scene);
        }, undefined, (err) => {
            console.error('Wallbox GLB konnte nicht geladen werden:', err);
        });

        return { scene: gScene, backDoor };
    }

    const garage = buildGarageScene();

    // ─── 3c) Aktive Szene + Start-Positionen + Fade-Übergang ───
    let activeScene = scene;                     // Start: Technikraum
    const techStartPos = camera.position.clone(); // wird unten überschrieben
    const techStartYaw = { value: 0 };            // wird unten überschrieben
    const garageStartPos = new THREE.Vector3(1.5, EYE_HEIGHT, -0.5);
    const garageStartYaw = Math.PI / 2;          // Blick nach -X = direkt auf die Wallbox-Wand

    // Schwarzer Fade-Overlay über dem Canvas
    const fadeOverlay = document.createElement('div');
    fadeOverlay.style.cssText = `
        position: absolute; inset: 0; background: #000;
        opacity: 0; pointer-events: none;
        transition: opacity 0.55s ease;
        z-index: 5;
    `;
    container.appendChild(fadeOverlay);

    // Zustand-Tracker: laufen wir gerade durch eine Tür?
    let transitioning = false;

    function transitionTo(target) {
        if (transitioning) return;
        transitioning = true;
        fadeOverlay.style.opacity = '1';
        setTimeout(() => {
            if (target === 'garage') {
                // Aktuelle Tech-Pos speichern, dann in die Garage springen
                techStartPos.copy(camera.position);
                techStartYaw.value = yaw;
                activeScene = garage.scene;
                camera.position.copy(garageStartPos);
                yaw = garageStartYaw;
                pitch = 0;
            } else {
                activeScene = scene;
                camera.position.copy(techStartPos);
                yaw = techStartYaw.value;
                pitch = 0;
            }
            fadeOverlay.style.opacity = '0';
            setTimeout(() => { transitioning = false; }, 550);
        }, 550);
    }

    // ─── 4) POV-Steuerung: Drag-to-look ───
    const uvPos = unterverteilung.position;
    let yaw = Math.atan2(-(uvPos.x - camera.position.x), -(uvPos.z - camera.position.z));
    let pitch = 0; let isDragging = false; let lastX = 0, lastY = 0; const SENS = 0.0042;

    const startDrag = (x, y) => { isDragging = true; lastX = x; lastY = y; container.style.cursor = 'grabbing'; };
    const moveDrag = (x, y) => {
        if (!isDragging) return;
        const dx = x - lastX; const dy = y - lastY; lastX = x; lastY = y;
        yaw += dx * SENS; pitch += dy * SENS;
        const MAX = Math.PI / 2 - 0.15; pitch = Math.max(-MAX, Math.min(MAX, pitch));
    };
    const endDrag = () => { isDragging = false; container.style.cursor = 'grab'; };

    container.style.cursor = 'grab'; container.style.position = 'relative';
    container.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
    window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);
    container.addEventListener('touchstart', (e) => { if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    container.addEventListener('touchmove', (e) => { if (e.touches.length === 1 && isDragging) { moveDrag(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
    window.addEventListener('touchend', endDrag);

    // ─── 4b) Smooth Zoom-Funktion (Mausrad & Touch-Pinch) ───
    let targetFOV = 72; const MIN_FOV = 20; const MAX_FOV = 72;
    container.addEventListener('wheel', (e) => { e.preventDefault(); targetFOV += e.deltaY * 0.05; targetFOV = Math.max(MIN_FOV, Math.min(MAX_FOV, targetFOV)); }, { passive: false });

    let initialPinchDistance = null; let initialFOV = targetFOV;
    container.addEventListener('touchstart', (e) => { if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; initialPinchDistance = Math.hypot(dx, dy); initialFOV = targetFOV; } }, { passive: false });
    container.addEventListener('touchmove', (e) => { if (e.touches.length === 2 && initialPinchDistance !== null) { e.preventDefault(); const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; const currentDistance = Math.hypot(dx, dy); const pinchScale = initialPinchDistance / currentDistance; targetFOV = initialFOV * pinchScale; targetFOV = Math.max(MIN_FOV, Math.min(MAX_FOV, targetFOV)); } }, { passive: false });
    container.addEventListener('touchend', (e) => { if (e.touches.length < 2) { initialPinchDistance = null; } });

    // ─── 5) Bedienhinweis ───
    const hint = document.createElement('div');
    hint.textContent = '✋ Ziehen zum Umsehen | 🔍 Scrollen zum Zoomen';
    hint.style.cssText = `position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: #F5A623; padding: 8px 18px; border: 1px solid rgba(245,166,35,0.5); border-radius: 999px; font: 700 0.7rem/1 system-ui, sans-serif; letter-spacing: 0.15em; text-transform: uppercase; pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,0.5); transition: opacity 0.6s ease; z-index: 10;`;
    container.appendChild(hint);
    let hasInteracted = false;
    const fadeHint = () => { if (hasInteracted) return; hasInteracted = true; hint.style.opacity = '0'; };
    container.addEventListener('mousedown', fadeHint); container.addEventListener('touchstart', fadeHint);

    // ─── 5b) Klick-Interaktion: UV-Tür öffnen + Garage-Übergang ───
    const raycaster = new THREE.Raycaster(); const mouseClick = new THREE.Vector2();
    container.addEventListener('click', (e) => {
        if (isDragging || transitioning) return;
        const rect = container.getBoundingClientRect();
        mouseClick.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseClick.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseClick, camera);

        if (activeScene === scene) {
            // Im Technikraum: erst Garage-Tür prüfen (hat Vorrang vor UV-Klick),
            // dann UV-Tür-Klick
            const doorHits = raycaster.intersectObject(garageDoor, true);
            if (doorHits.length > 0) {
                fadeHint();
                transitionTo('garage');
                return;
            }
            
            const uvHits = raycaster.intersectObjects(unterverteilung.children, true);
            if (uvHits.length > 0) {
                fadeHint();
                const doorG = unterverteilung.userData.doorGroup;
                const isOpen = unterverteilung.userData.isOpened;

                // Toggle State + neues Ziel in userData ablegen, damit
                // eine bereits laufende Animation das neue Ziel mitbekommt
                unterverteilung.userData.isOpened       = !isOpen;
                unterverteilung.userData.targetRotation = isOpen ? 0 : Math.PI * 0.65;

                // Nur EINE Animation pro UV gleichzeitig
                if (!unterverteilung.userData.isAnimating) {
                    unterverteilung.userData.isAnimating = true;
                    const animateDoor = () => {
                        // Ziel wird jeden Frame frisch gelesen — Klick während
                        // Animation kann die Richtung mitten drin umlenken
                        const target = unterverteilung.userData.targetRotation;
                        const diff   = target - doorG.rotation.y;
                        if (Math.abs(diff) > 0.003) {
                            doorG.rotation.y += diff * 0.15;
                            requestAnimationFrame(animateDoor);
                        } else {
                            doorG.rotation.y = target;
                            unterverteilung.userData.isAnimating = false;
                        }
                    };
                    animateDoor();
                }
            }

        } else if (activeScene === garage.scene) {
            // In der Garage: Rück-Tür prüfen
            const backHits = raycaster.intersectObject(garage.backDoor, true);
            if (backHits.length > 0) {
                fadeHint();
                transitionTo('technikraum');
            }
        }
    });

    // ─── 6) Sichtbarkeit + Render-Loop ───
    let isVisible = false; let animationId = null;
    const visibilityObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { isVisible = entry.isIntersecting; if (isVisible && animationId === null) animate(); }); }, { threshold: 0.1 });
    visibilityObserver.observe(container);

    function animate() {
        if (!isVisible) { animationId = null; return; }
        animationId = requestAnimationFrame(animate);
        camera.rotation.y = yaw; camera.rotation.x = pitch;
        if (Math.abs(camera.fov - targetFOV) > 0.05) { camera.fov += (targetFOV - camera.fov) * 0.08; camera.updateProjectionMatrix(); }
        renderer.render(activeScene, camera);
    }
    
    // ─── 7) Responsive ───
    window.addEventListener('resize', () => { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); });
}