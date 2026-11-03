import * as THREE from "three";

type Point = [number, number, number];

function ventricularSurface(height: number, angle: number) {
  const envelope = Math.pow(Math.sin(Math.PI * height), 0.72);
  const width = envelope * (0.64 + 0.8 * height);
  const groove = 1 - 0.09 * Math.exp(-((angle - 1.28) ** 2) / 0.027);
  return new THREE.Vector3(
    0.63 - height * 0.93 + Math.cos(angle) * width,
    -1.56 + height * 2.6 + 0.09 * envelope * Math.cos(angle),
    0.06 + Math.sin(angle) * width * 0.75 * groove,
  );
}

function ventricleGeometry() {
  const rings = 56;
  const sides = 80;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const base = new THREE.Color("#932844");
  const highlight = new THREE.Color("#d86b77");
  for (let row = 0; row <= rings; row++) {
    const height = THREE.MathUtils.clamp(row / rings, 0.00001, 0.99999);
    for (let side = 0; side < sides; side++) {
      const angle = (side / sides) * Math.PI * 2;
      const position = ventricularSurface(height, angle);
      positions.push(position.x, position.y, position.z);
      const striation =
        Math.sin(angle * 23 + height * 39) * Math.sin(height * 43);
      const color = base
        .clone()
        .lerp(highlight, 0.12 + height * 0.36 + striation * 0.046);
      colors.push(color.r, color.g, color.b);
      if (row === rings) continue;
      const a = row * sides + side;
      const b = row * sides + ((side + 1) % sides);
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeHeart() {
  const heart = new THREE.Group();
  const tissue = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.52,
    clearcoat: 0.28,
    clearcoatRoughness: 0.53,
  });
  heart.add(new THREE.Mesh(ventricleGeometry(), tissue));

  const artery = new THREE.MeshStandardMaterial({
    color: "#b34d65",
    roughness: 0.48,
  });
  const vein = new THREE.MeshStandardMaterial({
    color: "#87719d",
    roughness: 0.56,
  });
  const coronary = new THREE.MeshStandardMaterial({
    color: "#e3958f",
    roughness: 0.55,
  });
  const lumen = new THREE.MeshStandardMaterial({
    color: "#38172d",
    roughness: 0.86,
  });

  function vessel(
    points: THREE.Vector3[],
    startRadius: number,
    endRadius: number,
    material: THREE.Material,
    openEnd = false,
  ) {
    const curve = new THREE.CatmullRomCurve3(points);
    const segments = 30;
    const sides = 12;
    const geometry = new THREE.TubeGeometry(
      curve,
      segments,
      startRadius,
      sides,
      false,
    );
    const vertices = geometry.attributes.position;
    const point = new THREE.Vector3();
    for (let ring = 0; ring <= segments; ring++) {
      const progress = ring / segments;
      const center = curve.getPointAt(progress);
      const scale = THREE.MathUtils.lerp(1, endRadius / startRadius, progress);
      for (let side = 0; side <= sides; side++) {
        const index = ring * (sides + 1) + side;
        point
          .fromBufferAttribute(vertices, index)
          .sub(center)
          .multiplyScalar(scale)
          .add(center);
        vertices.setXYZ(index, point.x, point.y, point.z);
      }
    }
    geometry.computeVertexNormals();
    heart.add(new THREE.Mesh(geometry, material));
    if (openEnd) {
      const direction = curve.getTangent(1).normalize();
      const end = points[points.length - 1];
      const cap = new THREE.Mesh(
        new THREE.CircleGeometry(endRadius, sides),
        lumen,
      );
      cap.position.copy(end).addScaledVector(direction, 0.001);
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      heart.add(cap);
    }
  }

  const tubes: [Point[], number, number, THREE.Material][] = [
    [
      [
        [0.04, 0.48, -0.24],
        [0.05, 1.17, -0.16],
        [0.37, 1.56, -0.29],
        [0.74, 1.41, -0.43],
        [0.83, 1.06, -0.5],
      ],
      0.24,
      0.2,
      artery,
    ],
    [
      [
        [0.18, 1.39, -0.22],
        [0.13, 1.68, -0.19],
        [0.07, 1.87, -0.14],
      ],
      0.093,
      0.073,
      artery,
    ],
    [
      [
        [0.38, 1.52, -0.29],
        [0.42, 1.74, -0.25],
        [0.43, 1.94, -0.2],
      ],
      0.082,
      0.063,
      artery,
    ],
    [
      [
        [0.56, 1.48, -0.34],
        [0.66, 1.68, -0.32],
        [0.74, 1.82, -0.27],
      ],
      0.074,
      0.054,
      artery,
    ],
    [
      [
        [-0.12, 0.44, 0.29],
        [-0.12, 0.87, 0.42],
        [-0.43, 1.15, 0.4],
        [-0.88, 1.12, 0.18],
      ],
      0.25,
      0.175,
      vein,
    ],
    [
      [
        [-0.56, 0.53, -0.15],
        [-0.68, 1.05, -0.25],
        [-0.72, 1.5, -0.26],
      ],
      0.19,
      0.16,
      vein,
    ],
  ];
  for (const [points, start, end, material] of tubes) {
    vessel(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      start,
      end,
      material,
      true,
    );
  }

  // The finer branches follow the front of the ventricle instead of floating above it.
  const branches: [number, number][][] = [
    [
      [0.85, 1.67],
      [0.71, 1.51],
      [0.57, 1.36],
      [0.4, 1.27],
      [0.26, 1.36],
      [0.14, 1.53],
    ],
    [
      [0.69, 1.49],
      [0.66, 1.92],
      [0.56, 2.18],
      [0.45, 2.42],
    ],
    [
      [0.56, 1.35],
      [0.48, 0.99],
      [0.37, 0.76],
      [0.28, 0.67],
    ],
    [
      [0.44, 1.29],
      [0.37, 1.67],
      [0.28, 1.91],
    ],
  ];
  branches.forEach((branch, index) => {
    const points = branch.map(([height, angle]) => {
      const position = ventricularSurface(height, angle);
      position.z += 0.022;
      return position;
    });
    vessel(points, index === 0 ? 0.029 : 0.015, 0.004, coronary);
  });
  return heart;
}

export function mountHeart(
  host: HTMLDivElement,
  onAvailable: (available: boolean) => void,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!context) return null;
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 30);
  camera.position.set(0, 0.37, 7);
  camera.lookAt(0, 0.18, 0);
  scene.add(new THREE.HemisphereLight("#ffe9ed", "#4c274c", 1.75));
  const key = new THREE.DirectionalLight("#ffdecf", 2.55);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#eca3c8", 2.6);
  rim.position.set(2, 1, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight("#aeb8ff", 0.65);
  fill.position.set(4, -1, 3);
  scene.add(fill);
  const heart = makeHeart();
  scene.add(heart);

  let playing = false;
  let inView = true;
  let lost = false;
  let frame = 0;
  let elapsed = 0;
  let yaw = -0.23;
  let previousTime: number | null = null;

  function render() {
    if (lost) return;
    const phase = (elapsed % 0.84) / 0.84;
    const squeeze = Math.exp(-(((phase - 0.21) / 0.12) ** 2));
    const recoil = Math.exp(-(((phase - 0.48) / 0.14) ** 2));
    const beat = squeeze - 0.31 * recoil;
    heart.scale.set(1 - beat * 0.086, 1 - beat * 0.059, 1 - beat * 0.108);
    heart.rotation.set(0.06, yaw, -0.12 + beat * 0.043);
    renderer.render(scene, camera);
  }

  function tick(time: number) {
    if (previousTime !== null)
      elapsed += Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    render();
    frame = requestAnimationFrame(tick);
  }

  function updateLoop() {
    if (playing && inView && !document.hidden && !lost) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
    }
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    const aspect = width / height;
    const halfHeight = Math.max(1.95, 1.35 / aspect);
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  }

  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    updateLoop();
    onAvailable(false);
  }

  function contextRestored() {
    lost = false;
    resize();
    onAvailable(true);
    updateLoop();
  }

  const sizeObserver = new ResizeObserver(resize);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updateLoop();
  });
  sizeObserver.observe(host);
  visibilityObserver.observe(host);
  document.addEventListener("visibilitychange", updateLoop);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  resize();
  onAvailable(true);

  return {
    rotate(angle: number) {
      yaw = (yaw + angle) % (2 * Math.PI);
      render();
    },
    setPlaying(value: boolean) {
      playing = value;
      updateLoop();
    },
    dispose() {
      playing = false;
      updateLoop();
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", updateLoop);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      const materials = new Set<THREE.Material>();
      heart.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          materials.add(object.material);
        }
      });
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
