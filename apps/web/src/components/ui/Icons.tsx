import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function BaseIcon({ children, size = 18, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function AlertTriangle(props: IconProps) {
  return <BaseIcon {...props}><path d="M12 3 22 20H2L12 3Z" /><path d="M12 9v5" /><path d="M12 18h.01" /></BaseIcon>;
}

export function Armchair(props: IconProps) {
  return <BaseIcon {...props}><path d="M7 10V7a5 5 0 0 1 10 0v3" /><path d="M5 13h14v6H5z" /><path d="M7 19v2" /><path d="M17 19v2" /></BaseIcon>;
}

export function Ban(props: IconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="12" r="9" /><path d="m5.7 5.7 12.6 12.6" /></BaseIcon>;
}

export function BoxSelect(props: IconProps) {
  return <BaseIcon {...props}><path d="M4 7V4h3" /><path d="M17 4h3v3" /><path d="M20 17v3h-3" /><path d="M7 20H4v-3" /><rect height="8" width="8" x="8" y="8" /></BaseIcon>;
}

export function Building2(props: IconProps) {
  return <BaseIcon {...props}><path d="M6 22V3h12v19" /><path d="M9 7h1" /><path d="M14 7h1" /><path d="M9 11h1" /><path d="M14 11h1" /><path d="M9 15h1" /><path d="M14 15h1" /><path d="M3 22h18" /></BaseIcon>;
}

export function CheckSquare2(props: IconProps) {
  return <BaseIcon {...props}><rect height="16" rx="2" width="16" x="4" y="4" /><path d="m8 12 3 3 5-6" /></BaseIcon>;
}

export function ChevronDown(props: IconProps) {
  return <BaseIcon {...props}><path d="m6 9 6 6 6-6" /></BaseIcon>;
}

export function ChevronRight(props: IconProps) {
  return <BaseIcon {...props}><path d="m9 18 6-6-6-6" /></BaseIcon>;
}

export function Cloud(props: IconProps) {
  return <BaseIcon {...props}><path d="M17.5 19H7a4 4 0 1 1 .8-7.9A6 6 0 0 1 19 13a3 3 0 0 1-1.5 6Z" /></BaseIcon>;
}

export function DoorOpen(props: IconProps) {
  return <BaseIcon {...props}><path d="M13 4h5v16h-5" /><path d="M13 4 6 6v16l7-2V4Z" /><path d="M10 12h.01" /></BaseIcon>;
}

export function Eye(props: IconProps) {
  return <BaseIcon {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></BaseIcon>;
}

export function EyeOff(props: IconProps) {
  return <BaseIcon {...props}><path d="m3 3 18 18" /><path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" /><path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c6 0 10 8 10 8a16 16 0 0 1-3 4.2" /><path d="M6.1 6.1C3.6 7.9 2 12 2 12s4 8 10 8a10.8 10.8 0 0 0 5.9-1.8" /></BaseIcon>;
}

export function FileDown(props: IconProps) {
  return <BaseIcon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M12 12v6" /><path d="m9 15 3 3 3-3" /></BaseIcon>;
}

export function Grid3X3(props: IconProps) {
  return <BaseIcon {...props}><rect height="18" rx="2" width="18" x="3" y="3" /><path d="M9 3v18" /><path d="M15 3v18" /><path d="M3 9h18" /><path d="M3 15h18" /></BaseIcon>;
}

export function Info(props: IconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></BaseIcon>;
}

export function Layers(props: IconProps) {
  return <BaseIcon {...props}><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></BaseIcon>;
}

export function Lock(props: IconProps) {
  return <BaseIcon {...props}><rect height="11" rx="2" width="16" x="4" y="11" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></BaseIcon>;
}

export function Maximize2(props: IconProps) {
  return <BaseIcon {...props}><path d="M15 3h6v6" /><path d="m21 3-7 7" /><path d="M9 21H3v-6" /><path d="m3 21 7-7" /></BaseIcon>;
}

export function Minus(props: IconProps) {
  return <BaseIcon {...props}><path d="M5 12h14" /></BaseIcon>;
}

export function Moon(props: IconProps) {
  return <BaseIcon {...props}><path d="M21 13a8 8 0 1 1-10-10 7 7 0 0 0 10 10Z" /></BaseIcon>;
}

export function Move(props: IconProps) {
  return <BaseIcon {...props}><path d="M12 2v20" /><path d="M2 12h20" /><path d="m15 5-3-3-3 3" /><path d="m15 19-3 3-3-3" /><path d="m5 9-3 3 3 3" /><path d="m19 9 3 3-3 3" /></BaseIcon>;
}

export function OctagonAlert(props: IconProps) {
  return <BaseIcon {...props}><path d="M8 2h8l6 6v8l-6 6H8l-6-6V8l6-6Z" /><path d="M12 8v5" /><path d="M12 17h.01" /></BaseIcon>;
}

export function Plus(props: IconProps) {
  return <BaseIcon {...props}><path d="M12 5v14" /><path d="M5 12h14" /></BaseIcon>;
}

export function Redo2(props: IconProps) {
  return <BaseIcon {...props}><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h1" /></BaseIcon>;
}

export function RefreshCw(props: IconProps) {
  return <BaseIcon {...props}><path d="M21 12a9 9 0 0 1-15.5 6.2" /><path d="M3 12A9 9 0 0 1 18.5 5.8" /><path d="M3 19v-6h6" /><path d="M21 5v6h-6" /></BaseIcon>;
}

export function Route(props: IconProps) {
  return <BaseIcon {...props}><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h4a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h7" /></BaseIcon>;
}

export function Rows3(props: IconProps) {
  return <BaseIcon {...props}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></BaseIcon>;
}

export function Ruler(props: IconProps) {
  return <BaseIcon {...props}><path d="M4 18 18 4l2 2L6 20l-2-2Z" /><path d="m7 15 2 2" /><path d="m10 12 2 2" /><path d="m13 9 2 2" /></BaseIcon>;
}

export function Save(props: IconProps) {
  return <BaseIcon {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></BaseIcon>;
}

export function Search(props: IconProps) {
  return <BaseIcon {...props}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></BaseIcon>;
}

export function Square(props: IconProps) {
  return <BaseIcon {...props}><rect height="16" rx="2" width="16" x="4" y="4" /></BaseIcon>;
}

export function SquareStack(props: IconProps) {
  return <BaseIcon {...props}><rect height="8" rx="1" width="8" x="4" y="4" /><rect height="8" rx="1" width="8" x="10" y="10" /><path d="M14 6h4v4" /></BaseIcon>;
}

export function Table2(props: IconProps) {
  return <BaseIcon {...props}><path d="M3 10h18" /><path d="M5 10V6h14v4" /><path d="M6 10v8" /><path d="M18 10v8" /><path d="M9 14h6" /></BaseIcon>;
}

export function Trash2(props: IconProps) {
  return <BaseIcon {...props}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 15H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></BaseIcon>;
}

export function Undo2(props: IconProps) {
  return <BaseIcon {...props}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" /></BaseIcon>;
}

export function Unlock(props: IconProps) {
  return <BaseIcon {...props}><rect height="11" rx="2" width="16" x="4" y="11" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></BaseIcon>;
}

export function X(props: IconProps) {
  return <BaseIcon {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></BaseIcon>;
}
