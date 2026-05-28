import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <p className="eyebrow">MVP-Demo</p>
        <h1>SeatFlow</h1>
        <p className="subtitle">Bestuhlungspläne für Veranstaltungen</p>
        <Link className="primary-link" href="/planner">
          Planungsdemo öffnen
        </Link>
      </section>
    </main>
  );
}
