"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { geometryParams, type DesignSpec } from "@/lib/design/shapes";

/**
 * THE 3D VIEWPORT
 * ===============
 * An ILLUSTRATIVE preview of the finished object: its silhouette, proportions
 * and colour. It is explicitly NOT a stitch-level or yarn-strand simulation,
 * and the surrounding UI says so.
 *
 * PERFORMANCE DECISIONS (3D is where a web app falls over on phones)
 * -----------------------------------------------------------------
 * 1. `frameloop="demand"` — Three.js renders only when something changes. Idle
 *    costs ~0% CPU instead of pinning a core. This is the single biggest win,
 *    and it makes a battery difference on a phone left on the desk.
 * 2. DPR clamped to [1, 1.75] — a retina phone would otherwise render ~3x the
 *    pixels for no visible gain on a soft yarn surface.
 * 3. Modest segment counts, defined in the shape registry rather than here.
 * 4. One material instance, rebuilt only when the colour changes.
 * 5. Texture is drawn on a canvas in code — no image download, no CDN.
 *
 * Because of (1), ANY change to the scene must explicitly invalidate a frame.
 * That is what `invalidate()` calls do below; without them the model would
 * appear frozen after the first render.
 */

export type ViewAngle = "perspective" | "front" | "side" | "top";

/** Direction vectors only — the distance is computed from the object's size. */
const CAMERA_DIRECTIONS: Record<ViewAngle, [number, number, number]> = {
  perspective: [0.62, 0.42, 0.66],
  front: [0, 0, 1],
  side: [1, 0, 0],
  top: [0, 1, 0.02],
};

export const VIEW_ANGLE_LABELS: Record<ViewAngle, string> = {
  perspective: "3D",
  front: "Front",
  side: "Side",
  top: "Top",
};

export function ModelViewport({
  spec,
  angle = "perspective",
  className,
  showGround = true,
}: {
  spec: DesignSpec;
  angle?: ViewAngle;
  className?: string;
  showGround?: boolean;
}) {
  const params = useMemo(() => geometryParams(spec), [spec]);
  const material = useYarnMaterial(spec.colorHex);
  const geometry = useMemo(() => buildGeometry(params), [params]);

  // Frame the object regardless of how big the user made it.
  const frame = useMemo(
    () => Math.max(24, Math.max(spec.widthCm, spec.heightCm, spec.depthCm) * 1.9 + 12),
    [spec.widthCm, spec.heightCm, spec.depthCm],
  );

  const floorY = params.kind === "SPHERE" ? -(params.radius ?? 10) : -((params.height ?? 20) / 2);

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.1, far: 800 }}
      className={className}
      gl={{ antialias: true, powerPreference: "low-power" }}
    >
      <color attach="background" args={["#808080"]} />
      <Suspense fallback={null}>
        <CameraRig angle={angle} frame={frame} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[40, 70, 40]} intensity={1.15} />
        <directionalLight position={[-40, 20, -30]} intensity={0.35} />

        <mesh geometry={geometry} material={material} position={[0, -floorY, 0]} />
        <mesh
          geometry={geometry}
          material={material}
          position={[0, -floorY, 0]}
          scale={[-1, 1, 1]}
        />

        {showGround ? (
          <>
            <gridHelper
              args={[frame * 2, 24, "#4a4a4a", "#3a3a3a"]}
              position={[0, floorY, 0]}
            />
            <ContactShadows
              position={[0, floorY + 0.02, 0]}
              opacity={0.4}
              scale={frame * 1.6}
              blur={2.6}
              far={frame}
            />
          </>
        ) : null}

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={frame * 0.25}
          maxDistance={frame * 3}
          maxPolarAngle={Math.PI / 1.9}
        />
      </Suspense>
    </Canvas>
  );
}

/**
 * Moves the camera to the requested angle.
 *
 * This exists as its own component because it needs the `camera` and
 * `invalidate` handles from R3F's context, which are only available inside the
 * Canvas. It also calls `invalidate()` after moving, which is mandatory under
 * `frameloop="demand"` — otherwise the new frame would never be drawn.
 */
function CameraRig({ angle, frame }: { angle: ViewAngle; frame: number }) {
  const { camera, invalidate } = useThree();
  const firstRun = useRef(true);

  useEffect(() => {
    const [x, y, z] = CAMERA_DIRECTIONS[angle];
    const direction = new THREE.Vector3(x, y, z).normalize().multiplyScalar(frame);
    camera.position.copy(direction);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
    firstRun.current = false;
  }, [angle, frame, camera, invalidate]);

  return null;
}

/** Yarn-ish material: matte, slightly fuzzy, with a procedural stitch grain. */
function useYarnMaterial(colorHex: string) {
  return useMemo(() => {
    const grain = createYarnTexture();
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.95,
      metalness: 0,
      bumpMap: grain,
      bumpScale: 0.7,
      side: THREE.DoubleSide,
    });
  }, [colorHex]);
}

/**
 * Draws a soft V-stitch grain on a canvas and returns it as a texture.
 *
 * Doing this in code instead of shipping a PNG keeps the bundle small and lets
 * the pattern scale with the object. `needsUpdate` is required, otherwise the
 * GPU never uploads the freshly drawn canvas.
 */
function createYarnTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const rows = 8;
    const cell = size / rows;
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = Math.max(1.5, cell * 0.14);
    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 === 0 ? 0 : cell / 2;
      for (let col = -1; col <= rows; col += 1) {
        const x = col * cell + offset + cell / 2;
        const y = row * cell + cell * 0.78;
        ctx.beginPath();
        ctx.moveTo(x - cell * 0.42, y);
        ctx.quadraticCurveTo(x, y - cell * 0.66, x + cell * 0.42, y);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.needsUpdate = true;
  return texture;
}

function buildGeometry(params: ReturnType<typeof geometryParams>): THREE.BufferGeometry {
  const radial = params.radialSegments ?? 48;
  const vertical = params.heightSegments ?? 24;

  switch (params.kind) {
    case "SPHERE":
      return new THREE.SphereGeometry(params.radius ?? 10, radial, vertical);
    case "CONE":
      return new THREE.CylinderGeometry(
        params.radiusTop ?? 1,
        params.radiusBottom ?? 10,
        params.height ?? 20,
        radial,
        vertical,
        true,
      );
    case "TORUS":
      return new THREE.TorusGeometry(
        params.radius ?? 10,
        params.tube ?? 2,
        params.radialSegments ?? 32,
        params.heightSegments ?? 20,
      );
    case "BOX":
      return new THREE.BoxGeometry(
        params.width ?? 10,
        params.height ?? 10,
        params.depth ?? 10,
        2,
        2,
        2,
      );
    case "PLANE":
      return new THREE.PlaneGeometry(params.width ?? 10, params.height ?? 10, 24, 24);
    case "CYLINDER":
    default:
      return new THREE.CylinderGeometry(
        params.radius ?? 10,
        params.radius ?? 10,
        params.height ?? 20,
        radial,
        vertical,
        true,
      );
  }
}
