import { useState, ReactNode } from "react";
import { resolveIcon, IconSource } from "@/lib/minecraftAssets";

interface ItemIconProps {
  id: string;
  size?: number;
  // Shown when no texture exists for this identifier (e.g. beds and shields are not plain textures)
  fallback?: ReactNode;
}

const Placeholder = ({ size, children }: { size: number; children: ReactNode }) => (
  <span className="shrink-0 inline-flex items-center justify-center" style={{ width: size, height: size }}>
    {children}
  </span>
);

// A retry adds a query string so the browser does not reuse the failed response
const withRetry = (url: string, retries: number) => (retries === 0 ? url : `${url}?retry=${retries}`);

// Faces of a cube seen from a corner (viewBox 32x32). Each 16x16 texture is mapped onto its parallelogram with a
// matrix(a b c d e f): the texture x axis follows the first vector, the y axis the second, from the origin (e, f).
const CUBE_FACES = [
  { key: "top", matrix: "1 -0.5 1 0.5 0 8", shade: 0 },
  { key: "left", matrix: "1 0.5 0 1 0 8", shade: 0.25 },
  { key: "right", matrix: "1 -0.5 0 1 16 16", shade: 0.45 },
] as const;

const Cube = ({ source, size, retries, onError }: { source: Extract<IconSource, { type: "cube" }>; size: number; retries: number; onError: () => void }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} className="shrink-0" style={{ imageRendering: "pixelated" }}>
    {CUBE_FACES.map(({ key, matrix, shade }) => (
      <g key={key} transform={`matrix(${matrix})`}>
        <image
          href={withRetry(source[key], retries)}
          width="16"
          height="16"
          preserveAspectRatio="none"
          style={{ imageRendering: "pixelated" }}
          onError={onError}
        />
        {/* Darken the side faces so the cube reads as lit from above */}
        {shade > 0 && <rect width="16" height="16" fill="black" fillOpacity={shade} />}
      </g>
    ))}
  </svg>
);

const ItemIconImage = ({ id, size, fallback }: Required<Pick<ItemIconProps, "id" | "size">> & Pick<ItemIconProps, "fallback">) => {
  const source = resolveIcon(id);
  // A failed load is retried once: a request lost while many icons load at once must not blank the icon for good
  const [retries, setRetries] = useState(0);
  const onError = () => setTimeout(() => setRetries((current) => current + 1), 800);

  if (!source || retries > 1) return <Placeholder size={size}>{fallback}</Placeholder>;

  if (source.type === "cube") {
    return <Cube key={retries} source={source} size={size} retries={retries} onError={onError} />;
  }

  return (
    <img
      key={retries}
      src={withRetry(source.url, retries)}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ imageRendering: "pixelated", width: size, height: size }}
      onError={onError}
    />
  );
};

export const ItemIcon = ({ id, size = 20, fallback = null }: ItemIconProps) => (
  // key resets the retry state when the identifier changes
  <ItemIconImage key={id} id={id} size={size} fallback={fallback} />
);
