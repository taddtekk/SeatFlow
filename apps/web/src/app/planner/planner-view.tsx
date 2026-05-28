import { InfoCard } from "@seatflow/ui";
import type { DrawingObject, Plan } from "@seatflow/types";

interface PlannerViewProps {
  plan: Plan;
}

export function PlannerView({ plan }: PlannerViewProps) {
  const warnings = plan.validationResult?.messages.filter((message) => message.severity === "warning").length ?? 0;
  const errors = plan.validationResult?.messages.filter((message) => message.severity === "error").length ?? 0;
  const messages = plan.validationResult?.messages ?? [];

  return (
    <main className="planner-shell">
      <header className="planner-header">
        <div>
          <p className="eyebrow">Planungsseite</p>
          <h1>SeatFlow</h1>
          <p>Bestuhlungspläne für Veranstaltungen</p>
        </div>
      </header>

      <section className="planner-workspace" aria-label="Planungsbereich">
        <div className="canvas-panel">
          <PlanCanvas plan={plan} />
        </div>

        <aside className="info-panel" aria-label="Eigenschaften und Pruefung">
          <h2>Informationen</h2>
          <div className="stats-grid">
            <InfoCard label="Platzierte Stühle" value={plan.chairs.length} />
            <InfoCard label="Warnungen" value={warnings} />
            <InfoCard label="Fehler" value={errors} />
          </div>

          <section className="rule-panel">
            <h3>Aktuelles Regelprofil</h3>
            <dl>
              <div>
                <dt>Name</dt>
                <dd>{plan.ruleProfile.name}</dd>
              </div>
              <div>
                <dt>Fluchtwegbreite</dt>
                <dd>{plan.ruleProfile.minAisleWidthMm} mm</dd>
              </div>
              <div>
                <dt>Stuhlbreite</dt>
                <dd>{plan.ruleProfile.minSeatWidthMm} mm</dd>
              </div>
              <div>
                <dt>Reihenabstand</dt>
                <dd>{plan.ruleProfile.minRowClearanceMm} mm</dd>
              </div>
              <div>
                <dt>Max. Reihen</dt>
                <dd>{plan.ruleProfile.maxRowsPerBlock}</dd>
              </div>
            </dl>
          </section>

          <section className="messages-panel">
            <h3>Validierungsmeldungen</h3>
            {messages.length === 0 ? (
              <p className="empty-state">Keine Warnungen oder Fehler.</p>
            ) : (
              <ul>
                {messages.map((message) => (
                  <li key={message.id} className={message.severity}>
                    <strong>{message.severity === "error" ? "Fehler" : "Warnung"}</strong>
                    <span>{message.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

function PlanCanvas({ plan }: PlannerViewProps) {
  const objectCandidates: Array<DrawingObject | undefined> = [
    plan.stage,
    plan.foh,
    ...plan.noSeatZones,
    ...plan.escapeRoutes,
    ...plan.exits
  ];
  const objects = objectCandidates.filter((object): object is DrawingObject => Boolean(object));

  return (
    <svg
      className="plan-canvas"
      role="img"
      aria-label="Beispielraum mit Bühne, FOH, Fluchtwegen und automatisch platzierten Stühlen"
      viewBox={`0 0 ${plan.room.widthMm} ${plan.room.heightMm}`}
    >
      <rect className="room-shape" x="0" y="0" width={plan.room.widthMm} height={plan.room.heightMm} rx="0" />

      {objects.map((object) => (
        <g key={object.id}>
          <rect
            className={`object-shape object-${object.type}`}
            x={object.rect.x}
            y={object.rect.y}
            width={object.rect.width}
            height={object.rect.height}
          />
          <text className="object-label" x={object.rect.x + object.rect.width / 2} y={object.rect.y + object.rect.height / 2}>
            {object.name}
          </text>
        </g>
      ))}

      <g>
        {plan.chairs.map((chair) => (
          <rect
            key={chair.id}
            className="chair-shape"
            x={chair.position.x}
            y={chair.position.y}
            width={chair.widthMm}
            height={chair.depthMm}
          />
        ))}
      </g>
    </svg>
  );
}
