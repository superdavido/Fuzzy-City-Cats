import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import CanvasCityFallback from './CanvasCityFallback';

type CitySceneProps = {
  playing: boolean;
  found: number[];
  rotation: number;
  onCatFound: (id: number) => void;
};

const CAT_PATHS = [
  [[-6.2, -4.5], [-2.2, -5.3], [3.8, -4.5], [6.1, -1.1]],
  [[5.8, 4.9], [2.5, 5.2], [-2.8, 4.4], [-5.7, 1.8]],
  [[-5.7, -1.4], [-2.5, 1.1], [1.9, 1.1], [5.2, -1.5]],
  [[1.2, -6], [4.3, -3.5], [3.1, 1.4], [0.3, 5.9]],
  [[-1.4, 5.7], [-4.2, 3.1], [-2.3, -1.9], [1.5, -5.5]],
];

const COLORS = [0xe28c55, 0xf0cf8a, 0x7f6259, 0xc77466, 0x959c73];

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function makeBox(
  parent: THREE.Group,
  material: THREE.Material,
  x: number, y: number, z: number,
  w: number, h: number, d: number,
  rotation = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.y = rotation;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBuilding(parent: THREE.Group, x: number, z: number, width: number, depth: number, height: number, hue: number, index: number) {
  const building = new THREE.Group();
  building.position.set(x, 0.06, z);
  parent.add(building);
  const wall = new THREE.MeshStandardMaterial({ color: hue, roughness: 0.84 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xf4e8cc, roughness: 0.8 });
  const roof = new THREE.MeshStandardMaterial({ color: index % 3 === 0 ? 0xb95e48 : 0xc97955, roughness: 0.8 });
  makeBox(building, wall, 0, 0, 0, width, height, depth);
  const roofShape = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.79, height * 0.26, 4), roof);
  roofShape.position.set(0, height + height * 0.13, 0);
  roofShape.rotation.y = Math.PI / 4;
  roofShape.scale.set(width / Math.max(width, depth), 1, depth / Math.max(width, depth));
  roofShape.castShadow = true;
  building.add(roofShape);
  makeBox(building, trim, 0, height * 0.45, depth / 2 + 0.012, width * 0.94, 0.08, 0.08);
  const windowMat = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x9dbdc0 : 0xa9c7c3, roughness: 0.3, metalness: 0.08 });
  const windowFrame = new THREE.MeshStandardMaterial({ color: 0xf2dfbc, roughness: 0.8 });
  const cols = Math.max(2, Math.floor(width / 0.48));
  const rows = Math.max(2, Math.floor(height / 0.65));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wx = -width / 2 + (col + 0.5) * width / cols;
      const wy = 0.36 + row * (height - 0.5) / rows;
      makeBox(building, windowFrame, wx, wy, depth / 2 + 0.025, 0.22, 0.32, 0.045);
      makeBox(building, windowMat, wx, wy + 0.035, depth / 2 + 0.052, 0.15, 0.22, 0.02);
    }
  }
  return building;
}

function addTree(parent: THREE.Group, x: number, z: number, size = 1) {
  const trunk = new THREE.MeshStandardMaterial({ color: 0x80654d, roughness: 1 });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x567b60, roughness: 1 });
  const blossom = new THREE.MeshStandardMaterial({ color: 0xe69a9d, roughness: 1 });
  makeBox(parent, trunk, x, 0.1, z, 0.12 * size, 0.65 * size, 0.12 * size);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58 * size, 1), leaves);
  crown.position.set(x, 0.76 * size, z);
  crown.castShadow = true;
  parent.add(crown);
  if ((Math.round(x * 10 + z * 10) % 3) === 0) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.31 * size, 1), blossom);
    puff.position.set(x + 0.19 * size, 0.88 * size, z - 0.12 * size);
    parent.add(puff);
  }
}

function createCat(id: number) {
  const group = new THREE.Group();
  group.userData.catId = id;
  const fur = new THREE.MeshStandardMaterial({ color: COLORS[id], roughness: 0.98 });
  const lightFur = new THREE.MeshStandardMaterial({ color: id === 1 ? 0xf8e7c4 : 0xf0d9b9, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x493e38, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), fur);
  body.position.set(0, 0.35, 0);
  body.scale.set(1.32, 0.85, 0.9);
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), fur);
  head.position.set(0.17, 0.63, -0.16);
  head.scale.set(1, 0.92, 0.95);
  head.userData.catId = id;
  group.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.23, 4), fur);
    ear.position.set(0.17 + side * 0.17, 0.87, -0.17);
    ear.rotation.z = side * -0.12;
    ear.rotation.y = Math.PI / 4;
    ear.userData.catId = id;
    group.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.031, 8, 8), dark);
    eye.position.set(0.17 + side * 0.105, 0.66, -0.396);
    group.add(eye);
  }
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), lightFur);
  muzzle.position.set(0.18, 0.56, -0.39);
  muzzle.scale.set(1.15, 0.7, 0.6);
  group.add(muzzle);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.34, 0.35, 0.11),
    new THREE.Vector3(-0.58, 0.3, 0.17),
    new THREE.Vector3(-0.65, 0.62, 0.18),
    new THREE.Vector3(-0.51, 0.72, 0.18),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.075, 7, false), fur);
  group.add(tail);
  // A fine, seeded coat gives each little cat a tactile fuzzy silhouette.
  const random = seeded(id + 43);
  const furGeometry = new THREE.BufferGeometry();
  const points: number[] = [];
  for (let i = 0; i < 165; i++) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const x = Math.sin(phi) * Math.cos(theta) * 0.42;
    const y = Math.cos(phi) * 0.28 + 0.36;
    const z = Math.sin(phi) * Math.sin(theta) * 0.34;
    points.push(x, y, z, x + (random() - 0.5) * 0.055, y + 0.035, z + (random() - 0.5) * 0.055);
  }
  furGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const coat = new THREE.LineSegments(furGeometry, new THREE.LineBasicMaterial({ color: 0xffe5bf, transparent: true, opacity: 0.45 }));
  group.add(coat);
  group.traverse((object) => {
    if ((object as THREE.Mesh).isMesh || (object as THREE.LineSegments).isLineSegments) {
      object.userData.catId = id;
      if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = true;
    }
  });
  group.scale.setScalar(1.05);
  return group;
}

function createCity() {
  const root = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(19.4, 0.48, 16),
    new THREE.MeshStandardMaterial({ color: 0x879f77, roughness: 1 }),
  );
  ground.position.y = -0.28;
  ground.receiveShadow = true;
  root.add(ground);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(19, 15.6), new THREE.MeshStandardMaterial({ color: 0x91aa7c, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = -0.02;
  root.add(lawn);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x75828a, roughness: 0.95 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xe4d8bd, roughness: 1 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(19, 4.3), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.015, 0);
  root.add(road);
  const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 15.5), roadMat);
  crossRoad.rotation.x = -Math.PI / 2;
  crossRoad.position.set(0, 0.018, 0);
  root.add(crossRoad);
  for (const z of [-2.28, 2.28]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(19, 0.12, 0.42), sidewalkMat);
    edge.position.set(0, 0.08, z);
    root.add(edge);
  }
  for (let i = -8; i <= 8; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.035, 0.12), new THREE.MeshStandardMaterial({ color: 0xf7efdb }));
    stripe.position.set(i * 0.34, 0.05, -2.0);
    root.add(stripe);
    const stripe2 = stripe.clone();
    stripe2.position.z = 2;
    root.add(stripe2);
  }
  const buildingColors = [0xd78968, 0xb96f5c, 0xe2ad78, 0xc3a17e, 0xd6bd91, 0xa97061, 0xe1c18d, 0xb77d68];
  const sites = [
    [-7.5, -5.1, 2.6, 2.5, 2.4], [-4.35, -5.4, 2.5, 2.5, 3.0], [-7.2, -1.4, 2.8, 1.8, 2.1],
    [-7.45, 5.1, 2.4, 2.4, 2.7], [-4.2, 5.4, 2.4, 2.5, 2.15], [-7.1, 1.5, 2.8, 1.7, 2.45],
    [7.3, -5.15, 2.6, 2.5, 2.8], [4.25, -5.35, 2.4, 2.4, 2.2], [7.2, -1.45, 2.6, 1.7, 2.35],
    [7.1, 5.0, 2.7, 2.4, 2.7], [4.2, 5.3, 2.5, 2.4, 2.25], [7.25, 1.5, 2.5, 1.65, 2.4],
    [-1.45, -6.2, 1.6, 2.0, 1.9], [1.6, 6.2, 1.6, 2.0, 2.1],
  ];
  sites.forEach(([x, z, w, d, h], index) => addBuilding(root, x, z, w, d, h, buildingColors[index % buildingColors.length], index));
  // Green squares, topiary and flowering street trees break up the block.
  for (const [x, z] of [[-3, -3.05], [3.0, 3.05], [-3, 3.05], [3, -3.05]] as number[][]) {
    const planter = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.16, 1.2), sidewalkMat);
    planter.position.set(x, 0.1, z);
    root.add(planter);
    addTree(root, x, z, 0.75);
    addTree(root, x + 0.54, z + 0.18, 0.48);
  }
  for (const [x, z] of [[-5.6, -3], [5.5, -3], [-5.5, 3], [5.4, 3], [-1.1, -3], [1.15, 3]] as number[][]) addTree(root, x, z, 0.72);
  const carColors = [0xe67855, 0xd9bd67, 0x587d83, 0xb97467, 0xe2e3d0];
  carColors.forEach((color, i) => {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.27, 0.36), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    body.position.y = 0.25;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.2, 0.3), new THREE.MeshStandardMaterial({ color: 0xa9c6c3, roughness: 0.25 }));
    top.position.set(-0.015, 0.47, 0);
    car.add(body, top);
    car.position.set(-7 + i * 2.7, 0.03, i % 2 ? 0.95 : -0.8);
    car.userData.carId = i;
    root.add(car);
  });
  return root;
}

export default function CityScene({ playing, found, rotation, onCatFound }: CitySceneProps) {
  const [canvasFallback, setCanvasFallback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.OrthographicCamera;
    scene: THREE.Scene;
    city: THREE.Group;
    cats: THREE.Group[];
    raf: number;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    resize: () => void;
  } | null>(null);
  const callbackRef = useRef(onCatFound);
  const foundRef = useRef(found);
  const playingRef = useRef(playing);
  callbackRef.current = onCatFound;
  foundRef.current = found;
  playingRef.current = playing;

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      const canvas = document.createElement('canvas');
      if (!canvas.getContext('webgl2')) {
        setCanvasFallback(true);
        return;
      }
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    } catch {
      setCanvasFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = 'city-canvas';
    renderer.domElement.setAttribute('aria-label', 'Interactive miniature city. Click a cat to find it.');
    renderer.domElement.setAttribute('data-testid', 'city-game-canvas');
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('role', 'application');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbcd1b3);
    scene.fog = new THREE.Fog(0xbcd1b3, 26, 44);
    const camera = new THREE.OrthographicCamera(-11, 11, 9, -9, 0.1, 100);
    camera.position.set(13, 17, 20);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xfff4df, 0x697c60, 2.2));
    const sunlight = new THREE.DirectionalLight(0xfff3d8, 3.2);
    sunlight.position.set(-8, 17, 10);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.left = -13;
    sunlight.shadow.camera.right = 13;
    sunlight.shadow.camera.top = 13;
    sunlight.shadow.camera.bottom = -13;
    scene.add(sunlight);
    const city = createCity();
    const cityCars = city.children.filter((object) => typeof object.userData.carId === 'number');
    scene.add(city);
    const cats = CAT_PATHS.map((path, id) => {
      const cat = createCat(id);
      const first = path[0];
      cat.position.set(first[0], 0, first[1]);
      cat.userData.path = path;
      cat.userData.progress = (id * 0.17) % 1;
      city.add(cat);
      return cat;
    });
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 0.18 };
    const pointer = new THREE.Vector2();
    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      const aspect = width / height;
      const horizontalSpan = 12.2;
      camera.left = -horizontalSpan;
      camera.right = horizontalSpan;
      camera.top = horizontalSpan / aspect;
      camera.bottom = -horizontalSpan / aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const onClick = (event: MouseEvent) => {
      if (!playingRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(cats, true);
      for (const hit of hits) {
        let node: THREE.Object3D | null = hit.object;
        while (node && typeof node.userData.catId !== 'number') node = node.parent;
        const id = node?.userData.catId as number | undefined;
        if (id !== undefined && !foundRef.current.includes(id)) {
          callbackRef.current(id);
          return;
        }
      }
    };
    renderer.domElement.addEventListener('click', onClick);
    let last = 0;
    const animate = (now: number) => {
      const dt = Math.min(0.06, (now - (last || now)) / 1000);
      last = now;
      cats.forEach((cat, id) => {
        if (foundRef.current.includes(id)) return;
        const path = cat.userData.path as number[][];
        let progress = (cat.userData.progress as number) + dt * (0.042 + id * 0.003);
        if (progress >= 1) progress -= 1;
        cat.userData.progress = progress;
        const at = progress * path.length;
        const index = Math.floor(at);
        const mix = at - index;
        const a = path[index];
        const b = path[(index + 1) % path.length];
        const x = THREE.MathUtils.lerp(a[0], b[0], mix);
        const z = THREE.MathUtils.lerp(a[1], b[1], mix);
        cat.position.x = x;
        cat.position.z = z;
        cat.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
        cat.position.y = Math.abs(Math.sin(now / 190 + id)) * 0.045;
      });
      cityCars.forEach((car) => {
        const id = car.userData.carId as number;
        const speed = 0.58 + id * 0.06;
        if (id < 3) {
          car.position.x = -8.1 + ((now / 1000 * speed + id * 5.4) % 16.2);
          car.position.z = id % 2 ? -0.85 : 0.85;
          car.rotation.y = 0;
        } else {
          car.position.x = id % 2 ? -0.86 : 0.86;
          car.position.z = 7.1 - ((now / 1000 * speed + (id - 3) * 7.3) % 14.2);
          car.rotation.y = Math.PI / 2;
        }
      });
      renderer.render(scene, camera);
      engineRef.current!.raf = requestAnimationFrame(animate);
    };
    engineRef.current = { renderer, camera, scene, city, cats, raf: requestAnimationFrame(animate), raycaster, pointer, resize };
    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener('click', onClick);
      cancelAnimationFrame(engineRef.current?.raf ?? 0);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) engineRef.current.city.rotation.y = rotation;
  }, [rotation]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.cats.forEach((cat, id) => {
      cat.visible = !found.includes(id);
    });
  }, [found]);

  if (canvasFallback) {
    return <CanvasCityFallback playing={playing} found={found} rotation={rotation} onCatFound={onCatFound} />;
  }
  return <div className="city-scene-host" ref={containerRef} data-testid="city-scene" />;
}
