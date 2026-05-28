import { CanvasToolbar } from "./CanvasToolbar";
import { Ruler } from "./Ruler";

type Chair = { id: string; x: number; y: number };
type Table = { id: string; x: number; y: number; round?: boolean };

const chairs = createChairBlocks();
const tables: Table[] = [
  { id: "t-1", x: 6700, y: 11800, round: true },
  { id: "t-2", x: 8200, y: 11800, round: true },
  { id: "t-3", x: 9700, y: 11800, round: true },
  { id: "t-4", x: 25000, y: 11800, round: true },
  { id: "t-5", x: 26500, y: 11800, round: true },
  { id: "t-6", x: 28000, y: 11800, round: true },
  { id: "t-7", x: 18800, y: 29700 },
  { id: "t-8", x: 19800, y: 29700 },
  { id: "t-9", x: 20800, y: 29700 },
  { id: "t-10", x: 21800, y: 29700 },
  { id: "t-11", x: 22800, y: 29700 },
  { id: "t-12", x: 23800, y: 29700 }
];

export function PlannerCanvas() {
  return (
    <section className="canvas-area" aria-label="Planfläche">
      <CanvasToolbar />
      <div className="canvas-frame">
        <Ruler orientation="horizontal" />
        <Ruler orientation="vertical" />
        <svg className="seatflow-canvas" viewBox="0 0 42000 34000" role="img" aria-label="SeatFlow Demo-Plan">
          <defs>
            <pattern id="sf-grid" width="1000" height="1000" patternUnits="userSpaceOnUse">
              <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="var(--sf-canvas-grid)" strokeWidth="34" />
            </pattern>
            <pattern id="sf-grid-strong" width="5000" height="5000" patternUnits="userSpaceOnUse">
              <path d="M 5000 0 L 0 0 0 5000" fill="none" stroke="var(--sf-canvas-grid-strong)" strokeWidth="48" />
            </pattern>
            <pattern id="sf-hatch" width="360" height="360" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" x2="0" y1="0" y2="360" stroke="var(--sf-no-seat-zone-stroke)" strokeWidth="48" opacity="0.34" />
            </pattern>
            <marker id="sf-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--sf-escape-route-stroke)" />
            </marker>
          </defs>

          <rect className="canvas-bg" height="34000" width="42000" />
          <rect fill="url(#sf-grid)" height="34000" width="42000" />
          <rect fill="url(#sf-grid-strong)" height="34000" width="42000" />

          <rect className="room-outline" height="30000" width="36000" x="3000" y="1600" />
          <WallBreaks />
          <Exits />

          <NoSeatZone label="BÜHNENAUFGANG" x={7200} y={3200} width={3800} height={5200} />
          <NoSeatZone label="BÜHNENAUFGANG" x={31000} y={3200} width={3800} height={5200} />
          <NoSeatZone label="SPERRFLÄCHE&#10;5,00 m x 4,00 m" x={4200} y={26300} width={6400} height={5200} />
          <NoSeatZone label="SPERRFLÄCHE&#10;4,00 m x 4,00 m" x={31000} y={26600} width={6400} height={4900} />

          <EscapeRoute label="FLUCHTWEG NORD 2,00 m" x={4000} y={10300} width={34000} height={1350} />
          <EscapeRoute label="FLUCHTWEG SÜD 1,80 m" warning x={4000} y={22500} width={34000} height={1250} />
          <EscapeRoute label="FLUCHTWEG MITTE 2,50 m" vertical x={19300} y={10200} width={1500} height={16500} />

          <g className="stage selected-object">
            <rect height="6000" width="16000" x="12000" y="1000" />
            <text x="20000" y="3850">BÜHNE</text>
            <text className="subtext" x="20000" y="4950">16,00 m x 6,00 m</text>
            <SelectionHandles x={12000} y={1000} width={16000} height={6000} />
          </g>

          <g className="foh">
            <rect height="3000" width="6000" x="17600" y="27800" />
            <text x="20600" y="29600">FOH</text>
            <text className="subtext" x="20600" y="30650">6,00 m x 3,00 m</text>
          </g>

          <g className="chairs">
            {chairs.map((chair) => (
              <rect height="360" key={chair.id} rx="70" width="420" x={chair.x} y={chair.y} />
            ))}
          </g>

          <g className="tables">
            {tables.map((table) => (
              <g key={table.id}>
                {table.round ? (
                  <circle cx={table.x + 420} cy={table.y + 420} r="420" />
                ) : (
                  <rect height="640" rx="70" width="840" x={table.x} y={table.y} />
                )}
                <TableSeats table={table} />
              </g>
            ))}
          </g>

          <g className="validation-markers">
            <circle cx="38500" cy="23100" r="420" />
            <text x="38500" y="23270">!</text>
            <circle cx="10100" cy="23200" r="360" />
            <text x="10100" y="23340">!</text>
          </g>
        </svg>
      </div>
    </section>
  );
}

function EscapeRoute({
  label,
  vertical = false,
  warning = false,
  width,
  height,
  x,
  y
}: {
  height: number;
  label: string;
  vertical?: boolean;
  warning?: boolean;
  width: number;
  x: number;
  y: number;
}) {
  return (
    <g className={`escape-route ${warning ? "is-warning" : ""}`}>
      <rect height={height} width={width} x={x} y={y} />
      {vertical ? (
        <>
          <line markerEnd="url(#sf-arrow)" x1={x + width / 2} x2={x + width / 2} y1={y + 1200} y2={y + height - 1200} />
          <text transform={`translate(${x + width / 2 + 220} ${y + height / 2}) rotate(-90)`}>{label}</text>
        </>
      ) : (
        <>
          <line markerEnd="url(#sf-arrow)" x1={x + 1800} x2={x + width - 1800} y1={y + height / 2} y2={y + height / 2} />
          <text x={x + width / 2} y={y + height / 2 - 160}>{label}</text>
        </>
      )}
    </g>
  );
}

function NoSeatZone({ label, height, width, x, y }: { height: number; label: string; width: number; x: number; y: number }) {
  return (
    <g className="no-seat-zone">
      <rect height={height} width={width} x={x} y={y} />
      <rect fill="url(#sf-hatch)" height={height} width={width} x={x} y={y} />
      <text x={x + width / 2} y={y + height / 2}>{label}</text>
    </g>
  );
}

function Exits() {
  const exits: Array<[number, number]> = [
    [2400, 10600],
    [38800, 10600],
    [2400, 22400],
    [38800, 22400],
    [11200, 31600],
    [28800, 31600]
  ];
  return (
    <g className="exits">
      {exits.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect height="1100" rx="120" width="850" x={x} y={y} />
          <text x={x + 425} y={y + 720}>↗</text>
        </g>
      ))}
    </g>
  );
}

function WallBreaks() {
  return (
    <g className="wall-breaks">
      <path d="M 10800 1600 h 1700 M 29500 1600 h 1700 M 10900 31600 q 1100 -1700 2200 0 M 28600 31600 q 1100 -1700 2200 0" />
    </g>
  );
}

function SelectionHandles({ height, width, x, y }: { height: number; width: number; x: number; y: number }) {
  const points: Array<[number, number]> = [
    [x, y],
    [x + width / 2, y],
    [x + width, y],
    [x, y + height / 2],
    [x + width, y + height / 2],
    [x, y + height],
    [x + width / 2, y + height],
    [x + width, y + height]
  ];
  return (
    <g className="selection-handles">
      <rect fill="none" height={height} width={width} x={x} y={y} />
      {points.map(([pointX, pointY]) => (
        <rect height="300" key={`${pointX}-${pointY}`} width="300" x={pointX - 150} y={pointY - 150} />
      ))}
    </g>
  );
}

function TableSeats({ table }: { table: Table }) {
  const cx = table.round ? table.x + 420 : table.x + 420;
  const cy = table.round ? table.y + 420 : table.y + 320;
  const offsets: Array<[number, number]> = [
    [-720, -120],
    [720, -120],
    [-720, 320],
    [720, 320]
  ];
  return (
    <g className="table-seats">
      {offsets.map(([dx, dy]) => (
        <rect height="260" key={`${table.id}-${dx}-${dy}`} rx="45" width="300" x={cx + dx} y={cy + dy} />
      ))}
    </g>
  );
}

function createChairBlocks(): Chair[] {
  const blocks = [
    { id: "tl", x: 6200, y: 12000, columns: 17, rows: 8 },
    { id: "tr", x: 25000, y: 12000, columns: 17, rows: 8 },
    { id: "bl", x: 6200, y: 24000, columns: 14, rows: 7 },
    { id: "br", x: 25000, y: 24000, columns: 16, rows: 7 }
  ];
  const result: Chair[] = [];
  for (const block of blocks) {
    for (let row = 0; row < block.rows; row += 1) {
      for (let column = 0; column < block.columns; column += 1) {
        result.push({
          id: `${block.id}-${row}-${column}`,
          x: block.x + column * 620,
          y: block.y + row * 760
        });
      }
    }
  }
  return result;
}
