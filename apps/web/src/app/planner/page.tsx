import { createDemoPlan } from "@seatflow/planner-core";
import { validatePlan } from "@seatflow/rules";
import { PlannerView } from "./planner-view";

export default function PlannerPage() {
  const plan = createDemoPlan();
  const validationResult = validatePlan(plan);

  return <PlannerView plan={{ ...plan, validationResult }} />;
}
