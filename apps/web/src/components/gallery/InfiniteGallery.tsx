import { useRef, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export interface GalleryImage {
  readonly src: string;
  readonly alt: string;
}

interface FadeSettings {
  readonly fadeIn: { readonly start: number; readonly end: number };
  readonly fadeOut: { readonly start: number; readonly end: number };
}

interface BlurSettings {
  readonly blurIn: { readonly start: number; readonly end: number };
  readonly blurOut: { readonly start: number; readonly end: number };
  readonly maxBlur: number;
}

export interface InfiniteGalleryProps {
  readonly images: readonly GalleryImage[];
  /** Autoplay drift speed — there is no scroll/keyboard interaction here (see module doc
   *  comment below), so this is the only thing "speed" still controls. */
  readonly speed?: number;
  readonly visibleCount?: number;
  readonly fadeSettings?: FadeSettings;
  readonly blurSettings?: BlurSettings;
  readonly className?: string;
}

interface PlaneData {
  index: number;
  z: number;
  imageIndex: number;
  x: number;
  y: number;
}

interface GallerySceneProps {
  readonly images: readonly GalleryImage[];
  readonly speed: number;
  readonly visibleCount: number;
  readonly fadeSettings: FadeSettings;
  readonly blurSettings: BlurSettings;
}

const DEFAULT_FADE_SETTINGS: FadeSettings = {
  fadeIn: { start: 0.05, end: 0.25 },
  fadeOut: { start: 0.4, end: 0.43 },
};

const DEFAULT_BLUR_SETTINGS: BlurSettings = {
  blurIn: { start: 0.0, end: 0.1 },
  blurOut: { start: 0.4, end: 0.43 },
  maxBlur: 4.0,
};

const DEFAULT_DEPTH_RANGE = 50;
const MAX_HORIZONTAL_OFFSET = 8;
const MAX_VERTICAL_OFFSET = 8;

/**
 * Adapted from a player-supplied reference component. Two real bugs were fixed rather than
 * carried over:
 *  - the fragment shader's blur tap used `textureSize()`, a GLSL ES 3.00 builtin that does
 *    not exist under the GLSL ES 1.00 (`texture2D`/`gl_FragColor`) shader this material
 *    otherwise writes — it would fail to compile. Replaced with a `resolution` uniform set
 *    from the loaded texture's own pixel size.
 *  - `useTexture` (the loader) suspends while images load; the reference had no `<Suspense>`
 *    boundary inside the `<Canvas>`, which React treats as an error, not a loading state.
 */
const createClothMaterial = () => {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      map: { value: null },
      opacity: { value: 1.0 },
      blurAmount: { value: 0.0 },
      scrollForce: { value: 0.0 },
      resolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: `
      uniform float scrollForce;
      varying vec2 vUv;

      void main() {
        vUv = uv;

        vec3 pos = position;

        // Smooth curving based on scroll/drift force.
        float curveIntensity = scrollForce * 0.3;
        float distanceFromCenter = length(pos.xy);
        float curve = distanceFromCenter * distanceFromCenter * curveIntensity;

        // Gentle cloth-like ripples.
        float ripple1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
        float ripple2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
        float clothEffect = (ripple1 + ripple2) * abs(curveIntensity) * 2.0;

        pos.z -= (curve + clothEffect);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float blurAmount;
      uniform float scrollForce;
      uniform vec2 resolution;
      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(map, vUv);

        if (blurAmount > 0.0) {
          vec2 texelSize = 1.0 / resolution;
          vec4 blurred = vec4(0.0);
          float total = 0.0;

          for (float x = -2.0; x <= 2.0; x += 1.0) {
            for (float y = -2.0; y <= 2.0; y += 1.0) {
              vec2 offset = vec2(x, y) * texelSize * blurAmount;
              float weight = 1.0 / (1.0 + length(vec2(x, y)));
              blurred += texture2D(map, vUv + offset) * weight;
              total += weight;
            }
          }
          color = blurred / total;
        }

        float curveHighlight = abs(scrollForce) * 0.05;
        color.rgb += vec3(curveHighlight * 0.1);

        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
  });
};

function ImagePlane({
  texture,
  position,
  scale,
  material,
}: {
  texture: THREE.Texture;
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  material: THREE.ShaderMaterial;
}) {
  useEffect(() => {
    material.uniforms["map"]!.value = texture;
    const image = texture.image as { width?: number; height?: number } | undefined;
    if (image?.width && image.height) {
      (material.uniforms["resolution"]!.value as THREE.Vector2).set(image.width, image.height);
    }
  }, [material, texture]);

  return (
    <mesh position={position as [number, number, number]} scale={scale as [number, number, number]} material={material}>
      <planeGeometry args={[1, 1, 32, 32]} />
    </mesh>
  );
}

function GalleryScene({ images, speed, visibleCount, fadeSettings, blurSettings }: GallerySceneProps) {
  const textures = useTexture(images.map((img) => img.src));

  const materials = useMemo(() => Array.from({ length: visibleCount }, () => createClothMaterial()), [visibleCount]);

  const spatialPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < visibleCount; i++) {
      const horizontalAngle = (i * 2.618) % (Math.PI * 2);
      const verticalAngle = (i * 1.618 + Math.PI / 3) % (Math.PI * 2);
      const horizontalRadius = (i % 3) * 1.2;
      const verticalRadius = ((i + 1) % 4) * 0.8;
      const x = (Math.sin(horizontalAngle) * horizontalRadius * MAX_HORIZONTAL_OFFSET) / 3;
      const y = (Math.cos(verticalAngle) * verticalRadius * MAX_VERTICAL_OFFSET) / 4;
      positions.push({ x, y });
    }
    return positions;
  }, [visibleCount]);

  const totalImages = images.length;
  const depthRange = DEFAULT_DEPTH_RANGE;

  const planesData = useRef<PlaneData[]>(
    Array.from({ length: visibleCount }, (_, i) => ({
      index: i,
      z: visibleCount > 0 ? ((depthRange / visibleCount) * i) % depthRange : 0,
      imageIndex: totalImages > 0 ? i % totalImages : 0,
      x: spatialPositions[i]?.x ?? 0,
      y: spatialPositions[i]?.y ?? 0,
    })),
  );

  useEffect(() => {
    planesData.current = Array.from({ length: visibleCount }, (_, i) => ({
      index: i,
      z: visibleCount > 0 ? ((depthRange / Math.max(visibleCount, 1)) * i) % depthRange : 0,
      imageIndex: totalImages > 0 ? i % totalImages : 0,
      x: spatialPositions[i]?.x ?? 0,
      y: spatialPositions[i]?.y ?? 0,
    }));
  }, [depthRange, spatialPositions, totalImages, visibleCount]);

  // No scroll-wheel/keyboard handling here (the reference component had both): this gallery
  // sits behind real page content as a decorative backdrop, so it must never intercept the
  // page's own scroll — it only ever auto-drifts.
  useFrame((_state, delta) => {
    const drift = 0.3 * delta * speed;

    materials.forEach((material) => {
      material.uniforms["scrollForce"]!.value = drift;
    });

    const imageAdvance = totalImages > 0 ? visibleCount % totalImages || totalImages : 0;
    const totalRange = depthRange;

    planesData.current.forEach((plane, i) => {
      let newZ = plane.z + drift * 10;
      let wrapsForward = 0;
      let wrapsBackward = 0;

      if (newZ >= totalRange) {
        wrapsForward = Math.floor(newZ / totalRange);
        newZ -= totalRange * wrapsForward;
      } else if (newZ < 0) {
        wrapsBackward = Math.ceil(-newZ / totalRange);
        newZ += totalRange * wrapsBackward;
      }

      if (wrapsForward > 0 && imageAdvance > 0 && totalImages > 0) {
        plane.imageIndex = (plane.imageIndex + wrapsForward * imageAdvance) % totalImages;
      }
      if (wrapsBackward > 0 && imageAdvance > 0 && totalImages > 0) {
        const step = plane.imageIndex - wrapsBackward * imageAdvance;
        plane.imageIndex = ((step % totalImages) + totalImages) % totalImages;
      }

      plane.z = ((newZ % totalRange) + totalRange) % totalRange;
      plane.x = spatialPositions[i]?.x ?? 0;
      plane.y = spatialPositions[i]?.y ?? 0;

      const normalizedPosition = plane.z / totalRange;
      let opacity = 1;
      if (normalizedPosition >= fadeSettings.fadeIn.start && normalizedPosition <= fadeSettings.fadeIn.end) {
        opacity = (normalizedPosition - fadeSettings.fadeIn.start) / (fadeSettings.fadeIn.end - fadeSettings.fadeIn.start);
      } else if (normalizedPosition < fadeSettings.fadeIn.start) {
        opacity = 0;
      } else if (normalizedPosition >= fadeSettings.fadeOut.start && normalizedPosition <= fadeSettings.fadeOut.end) {
        opacity = 1 - (normalizedPosition - fadeSettings.fadeOut.start) / (fadeSettings.fadeOut.end - fadeSettings.fadeOut.start);
      } else if (normalizedPosition > fadeSettings.fadeOut.end) {
        opacity = 0;
      }
      opacity = Math.max(0, Math.min(1, opacity));

      let blur = 0;
      if (normalizedPosition >= blurSettings.blurIn.start && normalizedPosition <= blurSettings.blurIn.end) {
        blur = blurSettings.maxBlur * (1 - (normalizedPosition - blurSettings.blurIn.start) / (blurSettings.blurIn.end - blurSettings.blurIn.start));
      } else if (normalizedPosition < blurSettings.blurIn.start) {
        blur = blurSettings.maxBlur;
      } else if (normalizedPosition >= blurSettings.blurOut.start && normalizedPosition <= blurSettings.blurOut.end) {
        blur = blurSettings.maxBlur * ((normalizedPosition - blurSettings.blurOut.start) / (blurSettings.blurOut.end - blurSettings.blurOut.start));
      } else if (normalizedPosition > blurSettings.blurOut.end) {
        blur = blurSettings.maxBlur;
      }
      blur = Math.max(0, Math.min(blurSettings.maxBlur, blur));

      const material = materials[i];
      if (material) {
        material.uniforms["opacity"]!.value = opacity;
        material.uniforms["blurAmount"]!.value = blur;
      }
    });
  });

  if (images.length === 0) return null;

  return (
    <>
      {planesData.current.map((plane, i) => {
        const texture = textures[plane.imageIndex];
        const material = materials[i];
        if (!texture || !material) return null;

        const worldZ = plane.z - depthRange / 2;
        const image = texture.image as { width?: number; height?: number } | undefined;
        const aspect = image?.width && image.height ? image.width / image.height : 1;
        const scale: [number, number, number] = aspect > 1 ? [2 * aspect, 2, 1] : [2, 2 / aspect, 1];

        return <ImagePlane key={plane.index} texture={texture} position={[plane.x, plane.y, worldZ]} scale={scale} material={material} />;
      })}
    </>
  );
}

/** Decorative-only, so purely visual — never the only way to reach any of these photos (the
 *  same images already appear, with real credit text, inside the station consoles via
 *  `FactCardGallery`). Callers should set `aria-hidden` on whatever wraps this. */
export function InfiniteGallery({
  images,
  speed = 1,
  visibleCount = 6,
  fadeSettings = DEFAULT_FADE_SETTINGS,
  blurSettings = DEFAULT_BLUR_SETTINGS,
  className,
}: InfiniteGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 0], fov: 55 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <GalleryScene images={images} speed={speed} visibleCount={visibleCount} fadeSettings={fadeSettings} blurSettings={blurSettings} />
        </Suspense>
      </Canvas>
    </div>
  );
}
