import RedactScenario from "@/pages/RedactScenario";
import { getScenarioById } from "@/lib/scenarios";

const scenario = getScenarioById("emails")!;

export default function RedactEmails() {
  return <RedactScenario scenario={scenario} />;
}
