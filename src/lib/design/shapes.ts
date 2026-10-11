import type { ShapeType } from "@/lib/validation/domain";

/**
 * THE SHAPE REGISTRY
 * ==================
 * A crochet-friendly object is approximated by a primitive. We map
 * (shape + dimensions) to the parameters of that primitive, and let the Three.js
 * component build the geometry.
 *
 * WHY THIS IS A PURE FUNCTION
 * ---------------------------
 * `geometryParams()` has no Three.js import at all. It returns plain numbers.
 * That means it can be unit tested, computed on the server, and reused by the
 * 2D pattern view without dragging a 600KB rendering library into the bundle.
 * Only `model-viewport.tsx` knows about THREE.
 *
 * WHAT THIS IS NOT
 * ----------------
 * This is a parametric ILLUSTRATION of the finished object — the silhouette,
 * the proportions and the colour. It is not a simulation of yarn strands, and
 * the UI labels it that way. Claiming otherwise would be dishonest.
 */

export interface DesignSpec {
  shape: ShapeType;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  colorHex: string;
  stitchCode?: string | null;
}

export type PrimitiveKind =
  | "SPHERE"
  | "CYLINDER"
  | "CONE"
  | "TORUS"
  | "BOX"
  | "PLANE";

export interface ShapeGeometryParams {
  kind: PrimitiveKind;
  /** Radius in scene units. */
  radius?: number;
  height?: number;
  radiusTop?: number;
  radiusBottom?: number;
  tube?: number;
  radialSegments?: number;
  heightSegments?: number;
  width?: number;
  depth?: number;
  /** Flat panels have no volume — the viewport renders them double-sided. */
  flat?: boolean;
}

/**
 * Scene units are arbitrary; we work in centimetres and let the camera frame
 * the object. Keeping the unit = 1cm makes the numbers in the UI meaningful.
 */
export function geometryParams(spec: DesignSpec): ShapeGeometryParams {
  const { widthCm, heightCm, depthCm } = spec;
  const width = Math.max(0.5, widthCm);
  const height = Math.max(0.5, heightCm);
  const depth = Math.max(0.5, depthCm);

  // Enough segments that a silhouette looks smooth without wasting triangles on
  // a phone. This is the single biggest performance lever we have.
  const radialSegments = 48;
  const heightSegments = 24;

  switch (spec.shape) {
    case "SPHERE":
      return {
        kind: "SPHERE",
        // A sphere is sized by one dimension; use the smaller of width/depth so
        // it stays round rather than becoming an egg when the boxes differ.
        radius: Math.min(width, depth) / 2,
        radialSegments,
        heightSegments,
      };

    case "CONE":
      return {
        kind: "CONE",
        radiusBottom: Math.min(width, depth) / 2,
        radiusTop: Math.min(width, depth) / 20,
        height,
        radialSegments,
        heightSegments,
      };

    case "TORUS":
      return {
        kind: "TORUS",
        // The tube radius is the "thickness" of the band; the ring radius is
        // derived from width so changing the width grows the ring, not the rope.
        tube: height / 2,
        radius: Math.max(0.1, Math.min(width, depth) / 2 - height / 2),
        radialSegments: 32,
        heightSegments: 20,
      };

    case "BOX":
      return { kind: "BOX", width, height, depth };

    case "PANEL":
      return { kind: "PLANE", width, height };

    case "CYLINDER":
    default:
      return {
        kind: "CYLINDER",
        radius: Math.min(width, depth) / 2,
        height,
        radialSegments,
        heightSegments,
      };
  }
}

/** Shapes whose profile is a circle, so "width" means diameter. */
export const CIRCULAR_SHAPES: ShapeType[] = ["SPHERE", "CYLINDER", "CONE", "TORUS"];

export function usesDiameter(shape: ShapeType): boolean {
  return CIRCULAR_SHAPES.includes(shape);
}

export interface ShapeDescriptor {
  shape: ShapeType;
  label: string;
  description: string;
  /** Which of the three sliders actually do something. */
  usesWidth: boolean;
  usesHeight: boolean;
  usesDepth: boolean;
}

export const SHAPE_DESCRIPTORS: ShapeDescriptor[] = [
  {
    shape: "SPHERE",
    label: "Sphere",
    description: "Amigurumi head or body. Sized by its diameter.",
    usesWidth: true,
    usesHeight: true,
    usesDepth: true,
  },
  {
    shape: "CYLINDER",
    label: "Cylinder",
    description: "Cup, tub or hat crown worked in the round.",
    usesWidth: true,
    usesHeight: true,
    usesDepth: false,
  },
  {
    shape: "CONE",
    label: "Cone",
    description: "Tapering from a wide base to a narrow top.",
    usesWidth: true,
    usesHeight: true,
    usesDepth: false,
  },
  {
    shape: "TUBE",
    label: "Tube",
    description: "Hollow cylinder — the open body of a bag.",
    usesWidth: true,
    usesHeight: true,
    usesDepth: false,
  },
  {
    shape: "TORUS",
    label: "Ring",
    description: "A flat ring — a bag base or a headband.",
    usesWidth: true,
    usesHeight: true,
    usesDepth: false,
  },
  {
    shape: "BOX",
    label: "Box",
    description: "A soft-sided rectangular form, like a folded panel.",
    usesWidth: true,
    usesHeight: true,
    usesDepth: true,
  },
  {
    shape: "PANEL",
    label: "Flat panel",
    description: "A scarf, blanket or granny square seen face on.",
    usesWidth: true,
    usesHeight: true,
    usesDepth: false,
  },
];

export function descriptorFor(shape: ShapeType): ShapeDescriptor {
  return SHAPE_DESCRIPTORS.find((entry) => entry.shape === shape) ?? SHAPE_DESCRIPTORS[0];
}

/**
 * Suggest a 3D shape from a pattern category.
 *
 * This is a heuristic, and it is treated as one — the user can always change the
 * shape. Pretending a category maps deterministically to geometry would be a
 * lie: a "BAG" could be a circle-bottomed tote, a boxy shopper or a bucket.
 */
export function suggestShape(category: string): ShapeType {
  switch (category) {
    case "AMIGURUMI":
      return "SPHERE";
    case "BAG":
      return "TUBE";
    case "HAT":
      return "CYLINDER";
    case "BLANKET":
      return "PANEL";
    case "SCARF":
      return "PANEL";
    case "HOME_DECOR":
      return "CYLINDER";
    default:
      return "CYLINDER";
  }
}
