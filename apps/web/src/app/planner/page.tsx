import { createRepositories } from "@seatflow/repositories";
import { PlannerClient } from "./planner-client";

export default async function PlannerPage() {
  const repositories = createRepositories({ storageDriver: "memory" });
  const plan = await repositories.plans.getDemoPlan();

  return <PlannerClient initialPlan={plan} />;
}
