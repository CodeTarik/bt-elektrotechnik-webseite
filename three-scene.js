// ─── BT Elektrotechnik · 3D-Smart-Network-Visualisierung ───
// Zeigt eine zentrale Steuereinheit mit verbundenen Knotenpunkten -
// symbolisiert moderne Elektroinstallation und KNX-Gebäudeautomation.

import * as THREE from 'three';

const container = document.getElementById('three-canvas-container');

if (container) {
    const GOLD = 0xF5A623;

    // ─── 1) Grundsetup: Szene, Kamera, Renderer ───
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        55,
        container.clientWidth / container.clientHeight,
        0.1, 100
    );
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Alle 3D-Elemente kommen in EINE Gruppe -
    // dann können wir die ganze Anlage gemeinsam drehen/neigen.
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // ─── 2) ZENTRALE STEUEREINHEIT (Hub) ───
    // Außenhülle: Drahtgitter-Polyeder
    const hubOuter = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.95, 0)),
        new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.95 })
    );
    networkGroup.add(hubOuter);

    // Innerer Kern: dichteres, gegenläufiges Drahtgitter
    const hubCore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 1),
        new THREE.MeshBasicMaterial({
            color: GOLD, wireframe: true,
            transparent: true, opacity: 0.55
        })
    );
    networkGroup.add(hubCore);

    // ─── 3) KNOTENPUNKTE im 3D-Raum verteilt ───
    // (jeder Knoten = ein angeschlossenes Gerät / ein Raum)
    const nodePositions = [
        new THREE.Vector3( 2.6,  1.4,  0.8),
        new THREE.Vector3(-2.6,  1.5, -0.6),
        new THREE.Vector3( 2.1, -1.7,  1.2),
        new THREE.Vector3(-2.2, -1.5,  0.7),
        new THREE.Vector3( 0.2,  2.4, -1.5),
        new THREE.Vector3( 0.5, -2.3, -1.2),
        new THREE.Vector3( 2.9,  0.0, -1.7),
        new THREE.Vector3(-2.9,  0.0,  1.5),
    ];

    const nodes = [];
    nodePositions.forEach(pos => {
        // Knoten: kleines Oktaeder
        const node = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.18, 0),
            new THREE.MeshBasicMaterial({ color: GOLD })
        );
        node.position.copy(pos);
        networkGroup.add(node);
        nodes.push(node);

        // Verbindungslinie Hub → Knoten
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                pos
            ]),
            new THREE.LineBasicMaterial({
                color: GOLD, transparent: true, opacity: 0.22
            })
        );
        networkGroup.add(line);
    });

    // ─── 4) PARTIKEL-WOLKE im Hintergrund ───
    const particleCount = 90;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i*3]     = (Math.random() - 0.5) * 12;
        positions[i*3 + 1] = (Math.random() - 0.5) * 9;
        positions[i*3 + 2] = (Math.random() - 0.5) * 9;
    }
    const particles = new THREE.Points(
        new THREE.BufferGeometry().setAttribute(
            'position', new THREE.BufferAttribute(positions, 3)
        ),
        new THREE.PointsMaterial({
            color: GOLD, size: 0.04,
            transparent: true, opacity: 0.55
        })
    );
    scene.add(particles);

    // ─── 5) MAUS-PARALLAX (sanftes Neigen) ───
    const mouse = { x: 0, y: 0 };
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.y = ((e.clientY - rect.top)  / rect.height) * 2 - 1;
    });
    container.addEventListener('mouseleave', () => {
        mouse.x = 0; mouse.y = 0;
    });

    // ─── 6) ANIMATIONS-LOOP ───
    function animate() {
        requestAnimationFrame(animate);

        // Gesamte Anlage dreht sich langsam um die Y-Achse
        networkGroup.rotation.y += 0.003;

        // Innerer Kern dreht gegenläufig - mechanisches Gefühl
        hubCore.rotation.x += 0.008;
        hubCore.rotation.y -= 0.006;

        // Knotenpunkte „atmen" - leichtes Pulsieren in der Größe
        const t = Date.now() * 0.001;
        nodes.forEach((node, i) => {
            const scale = 1 + Math.sin(t * 2 + i * 0.8) * 0.25;
            node.scale.setScalar(scale);
        });

        // Maus-Parallax: sanftes Neigen statt harter Folgebewegung (Lerp)
        networkGroup.rotation.x += (mouse.y * 0.25 - networkGroup.rotation.x) * 0.04;
        networkGroup.rotation.z += (mouse.x * 0.15 - networkGroup.rotation.z) * 0.04;

        // Partikel ganz langsam in andere Richtung mitdrehen
        particles.rotation.y += 0.0005;
        particles.rotation.x += 0.0002;

        renderer.render(scene, camera);
    }
    animate();

    // ─── 7) RESPONSIVE ───
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}