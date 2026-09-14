import RedactScenario from "@/pages/RedactScenario";
import { getScenarioById } from "@/lib/scenarios";

const scenario = getScenarioById("foia")!;

export default function RedactForFoia() {
  return <RedactScenario scenario={scenario} />;
}
