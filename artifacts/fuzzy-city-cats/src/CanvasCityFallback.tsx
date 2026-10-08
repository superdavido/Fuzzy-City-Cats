import { useEffect, useRef } from 'react';

type Props = {
  playing: boolean;
  found: number[];
  rotation: number;
  onCatFound: (id: number) => void;
};

const paths: [number, number][][] = [
  [[-6.2, -4.5], [-2.2, -5.3], [3.8, -4.5], [6.1, -1.1]],
  [[5.8, 4.9], [2.5, 5.2], [-2.8, 4.4], [-5.7, 1.8]],
  [[-5.7, -1.4], [-2.5, 1.1], [1.9, 1.1], [5.2, -1.5]],
  [[1.2, -6], [4.3, -3.5], [3.1, 1.4], [0.3, 5.9]],
  [[-1.4, 5.7], [-4.2, 3.1], [-2.3, -1.9], [1.5, -5.5]],
];

const buildings = [
  [-7.5, -5.1, 2.6, 2.5, 2.4], [-4.35, -5.4, 2.5, 2.5, 3.0],
  [-7.2, -1.4, 2.8, 1.8, 2.1], [-7.45, 5.1, 2.4, 2.4, 2.7],
  [-4.2, 5.4, 2.4, 2.5, 2.15], [-7.1, 1.5, 2.8, 1.7, 2.45],
  [7.3, -5.15, 2.6, 2.5, 2.8], [4.25, -5.35, 2.4, 2.4, 2.2],
  [7.2, -1.45, 2.6, 1.7, 2.35], [7.1, 5.0, 2.7, 2.4, 2.7],
  [4.2, 5.3, 2.5, 2.4, 2.25], [7.25, 1.5, 2.5, 1.65, 2.4],
  [-1.45, -6.2, 1.6, 2.0, 1.9], [1.6, 6.2, 1.6, 2.0, 2.1],
];
const wallColors = ['#d78968', '#b96f5c', '#e2ad78', '#c3a17e', '#d6bd91', '#a97061', '#e1c18d', '#b77d68'];
const catColors = ['#e28c55', '#f0cf8a', '#7f6259', '#c77466', '#959c73'];
const trees: [number, number, number][] = [
  [-3, -3.05, .75], [3, 3.05, .75], [-3, 3.05, .75], [3, -3.05, .75],
  [-2.46, -2.87, .48], [3.54, 3.23, .48], [-2.46, 3.23, .48], [3.54, -2.87, .48],
  [-5.6, -3, .72], [5.5, -3, .72], [-5.5, 3, .72], [5.4, 3, .72], [-1.1, -3, .72], [1.15, 3, .72],
];

type Project = (x: number, z: number, y?: number) => [number, number];

function polygon(ctx: CanvasRenderingContext2D, project: Project, points: [number, number, number][], fill: string, stroke?: string) {
  const projected = points.map(([x, z, y]) => project(x, z, y));
  ctx.beginPath();
  ctx.moveTo(projected[0][0], projected[0][1]);
  projected.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export default function CanvasCityFallback({ playing, found, rotation, onCatFound }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(rotation);
  const foundRef = useRef(found);
  const playingRef = useRef(playing);
  const onCatFoundRef = useRef(onCatFound);
  rotationRef.current = rotation;
  foundRef.current = found;
  playingRef.current = playing;
  onCatFoundRef.current = onCatFound;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = host?.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!host || !canvas || !ctx) return;
    const catLocations: { x: number; y: number; id: number }[] = [];
    let frame = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    const startedAt = performance.now();

    canvas.className = 'city-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Interactive miniature city. Click a cat to find it.');
    canvas.setAttribute('data-testid', 'city-game-canvas');

    const onPointerDown = (event: PointerEvent) => {
      if (!playingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const foundNow = foundRef.current;
      const hit = catLocations
        .filter((cat) => !foundNow.includes(cat.id))
        .map((cat) => ({ ...cat, distance: Math.hypot(cat.x - px, cat.y - py) }))
        .filter((cat) => cat.distance < Math.max(20, rect.width / 42))
        .sort((a, b) => a.distance - b.distance)[0];
      if (hit) onCatFoundRef.current(hit.id);
    };
    canvas.addEventListener('pointerdown', onPointerDown);

    const draw = (now: number) => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (width !== lastWidth || height !== lastHeight || canvas.width !== Math.round(width * dpr)) {
        lastWidth = width;
        lastHeight = height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const angle = rotationRef.current;
      const scale = Math.min(width / 26, height / 17.2);
      const project: Project = (x, z, y = 0) => {
        const rx = x * Math.cos(angle) - z * Math.sin(angle);
        const rz = x * Math.sin(angle) + z * Math.cos(angle);
        return [
          width / 2 + (rx - rz) * scale * .72,
          height * .52 + (rx + rz) * scale * .37 - y * scale * .98,
        ];
      };

      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#d5e1c6');
      sky.addColorStop(.64, '#c4d5b7');
      sky.addColorStop(1, '#adbf9f');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);
      const base = [[-9.5, -8, -.34], [9.5, -8, -.34], [9.5, 8, -.34], [-9.5, 8, -.34]] as [number, number, number][];
      polygon(ctx, project, base, '#73866a');
      polygon(ctx, project, [[-9.4, -7.9, -.08], [9.4, -7.9, -.08], [9.4, 7.9, -.08], [-9.4, 7.9, -.08]], '#91aa7c');

      // Four paved avenues and the crosswalks that join them.
      polygon(ctx, project, [[-9.3, -2.26, .012], [9.3, -2.26, .012], [9.3, 2.26, .012], [-9.3, 2.26, .012]], '#77868a');
      polygon(ctx, project, [[-2.1, -7.8, .018], [2.1, -7.8, .018], [2.1, 7.8, .018], [-2.1, 7.8, .018]], '#77868a');
      for (const z of [-2.43, 2.43]) {
        polygon(ctx, project, [[-9.3, z - .12, .025], [9.3, z - .12, .025], [9.3, z + .12, .025], [-9.3, z + .12, .025]], '#eadfc9');
      }
      for (let i = -5; i <= 5; i++) {
        const x = i * .34;
        polygon(ctx, project, [[x - .09, -2.04, .05], [x + .09, -2.04, .05], [x + .09, -1.72, .05], [x - .09, -1.72, .05]], '#f8f0dd');
        polygon(ctx, project, [[x - .09, 1.72, .05], [x + .09, 1.72, .05], [x + .09, 2.04, .05], [x - .09, 2.04, .05]], '#f8f0dd');
      }

      const elapsed = (now - startedAt) / 1000;
      const movingObjects: { depth: number; draw: () => void }[] = [];
      buildings.forEach(([x, z, w, d, h], index) => {
        movingObjects.push({
          depth: x + z,
          draw: () => {
            const left = x - w / 2, right = x + w / 2;
            const back = z - d / 2, front = z + d / 2;
            const color = wallColors[index % wallColors.length];
            const shade = index % 2 ? '#9f6153' : '#ad6e58';
            polygon(ctx, project, [[right, back, .03], [right, front, .03], [right, front, h], [right, back, h]], shade, '#755749');
            polygon(ctx, project, [[left, front, .03], [right, front, .03], [right, front, h], [left, front, h]], color, '#8d6250');
            polygon(ctx, project, [[left, back, h], [right, back, h], [right, front, h], [left, front, h]], '#bd7354', '#875b48');
            // Gabled terracotta roofs give the block a miniature-European skyline.
            const peak = project((left + right) / 2, (back + front) / 2, h + .72);
            const roofPoints = [[left - .13, back - .13, h], [right + .13, back - .13, h], [right + .13, front + .13, h], [left - .13, front + .13, h]] as [number, number, number][];
            polygon(ctx, project, [roofPoints[0], roofPoints[1], [x, z, h + .72], roofPoints[3]], '#bb654c', '#98513f');
            polygon(ctx, project, [roofPoints[1], roofPoints[2], [x, z, h + .72]], '#d07c57', '#98513f');
            const cornice = project(x, front + .03, h * .52);
            const frontL = project(left + .22, front + .04, h * .52);
            const frontR = project(right - .22, front + .04, h * .52);
            ctx.strokeStyle = '#f4dfbd';
            ctx.lineWidth = Math.max(1, scale * .075);
            ctx.beginPath();
            ctx.moveTo(frontL[0], frontL[1]);
            ctx.lineTo(frontR[0], frontR[1]);
            ctx.stroke();
            const cols = Math.max(2, Math.floor(w / .55));
            const rows = Math.max(2, Math.floor(h / .68));
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                const wx = left + (col + .5) * w / cols;
                const wy = .38 + row * (h - .46) / rows;
                const p = project(wx, front + .055, wy);
                const ww = scale * .16;
                const wh = scale * .2;
                ctx.fillStyle = '#f4e4c9';
                ctx.fillRect(p[0] - ww / 2 - 1, p[1] - wh / 2 - 1, ww + 2, wh + 2);
                ctx.fillStyle = index % 2 ? '#9dbdc0' : '#8fb2b2';
                ctx.fillRect(p[0] - ww / 2, p[1] - wh / 2, ww, wh);
              }
            }
            const _ = peak;
            void _;
          },
        });
      });

      trees.forEach(([x, z, size]) => {
        movingObjects.push({
          depth: x + z + .3,
          draw: () => {
            const trunk = project(x, z, .4 * size);
            const crown = project(x, z, .9 * size);
            const radius = Math.max(5, scale * .43 * size);
            ctx.strokeStyle = '#80654d';
            ctx.lineWidth = Math.max(2, radius * .22);
            ctx.beginPath();
            ctx.moveTo(trunk[0], trunk[1]);
            ctx.lineTo(crown[0], crown[1]);
            ctx.stroke();
            ctx.fillStyle = '#52785e';
            ctx.beginPath();
            ctx.arc(crown[0], crown[1], radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#71916b';
            ctx.beginPath();
            ctx.arc(crown[0] - radius * .35, crown[1] - radius * .3, radius * .56, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d88991';
            ctx.beginPath();
            ctx.arc(crown[0] + radius * .5, crown[1] - radius * .05, radius * .33, 0, Math.PI * 2);
            ctx.fill();
          },
        });
      });

      // Cars circulate continuously so the town still feels alive between finds.
      for (let i = 0; i < 5; i++) {
        const x = -8.1 + ((elapsed * (.48 + i * .035) + i * 3.3) % 16.2);
        const z = i % 2 ? -.82 : .82;
        movingObjects.push({
          depth: x + z + .1,
          draw: () => {
            const p = project(x, z, .22);
            const carW = Math.max(9, scale * .42);
            const carH = Math.max(5, scale * .23);
            ctx.fillStyle = '#52636655';
            ctx.beginPath();
            ctx.ellipse(p[0] + 2, p[1] + carH, carW * .72, carH * .5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = ['#e67855', '#d9bd67', '#587d83', '#b97467', '#e2e3d0'][i];
            ctx.beginPath();
            ctx.roundRect(p[0] - carW / 2, p[1] - carH / 2, carW, carH, carH * .35);
            ctx.fill();
            ctx.fillStyle = '#a9c6c3';
            ctx.fillRect(p[0] - carW * .2, p[1] - carH * .36, carW * .37, carH * .72);
          },
        });
      }

      const nextLocations: { x: number; y: number; id: number }[] = [];
      paths.forEach((path, id) => {
        const progress = ((elapsed * (.045 + id * .003) + id * .17) % 1 + 1) % 1;
        const segment = progress * path.length;
        const segmentIndex = Math.floor(segment);
        const index = segmentIndex % path.length;
        const mix = segment - segmentIndex;
        const from = path[index] ?? path[0];
        const to = path[(index + 1) % path.length];
        const x = from[0] + (to[0] - from[0]) * mix;
        const z = from[1] + (to[1] - from[1]) * mix;
        if (foundRef.current.includes(id)) return;
        const [px, py] = project(x, z, .12 + Math.abs(Math.sin(now / 190 + id)) * .045);
        nextLocations.push({ x: px, y: py, id });
        movingObjects.push({
          depth: x + z + .2,
          draw: () => drawCat(ctx, px, py, scale, catColors[id], id, elapsed),
        });
      });
      catLocations.splice(0, catLocations.length, ...nextLocations);
      movingObjects.sort((a, b) => a.depth - b.depth).forEach((item) => item.draw());
      frame = requestAnimationFrame(draw);
    };

    const drawCat = (context: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string, id: number, time: number) => {
      const size = Math.max(.68, Math.min(1.1, scale / 29));
      const bob = Math.sin(time * 6 + id) * 1.1 * size;
      const rx = 13 * size, ry = 7.4 * size;
      context.save();
      context.translate(x, y + bob);
      context.fillStyle = '#41584b42';
      context.beginPath();
      context.ellipse(0, 7 * size, rx * 1.05, ry * .55, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 3.4 * size;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-9 * size, -1 * size);
      context.bezierCurveTo(-18 * size, -12 * size, -16 * size, -18 * size, -8 * size, -15 * size);
      context.stroke();
      context.fillStyle = color;
      context.beginPath();
      context.ellipse(-1 * size, 0, rx, ry, -.12, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.arc(7 * size, -8 * size, 7.3 * size, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(1 * size, -12 * size);
      context.lineTo(2.5 * size, -22 * size);
      context.lineTo(8 * size, -14 * size);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(8 * size, -14 * size);
      context.lineTo(13 * size, -22 * size);
      context.lineTo(15 * size, -11 * size);
      context.closePath();
      context.fill();
      context.fillStyle = '#473e35';
      context.beginPath();
      context.arc(5.2 * size, -8.4 * size, 1 * size, 0, Math.PI * 2);
      context.arc(10 * size, -8.4 * size, 1 * size, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#f6e8cb99';
      context.lineWidth = .65 * size;
      for (let i = 0; i < 5; i++) {
        context.beginPath();
        context.moveTo((-9 + i * 4) * size, -5 * size);
        context.lineTo((-10 + i * 4) * size, -8 * size);
        context.stroke();
      }
      context.restore();
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return <div className="city-scene-host" ref={hostRef}><canvas /></div>;
}
