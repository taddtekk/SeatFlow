import { createRepositories } from "@seatflow/repositories";
import { AppShell } from "../../components/app-shell/AppShell";

export default async function PlannerPage() {
  const repositories = createRepositories({ storageDriver: "memory" });
  const plan = await repositories.plans.getDemoPlan();

  return <AppShell initialPlan={plan} />;
}
