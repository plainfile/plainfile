import RedactScenario from "../RedactScenario";
import { getScenarioById } from "../scenarios";

const scenario = getScenarioById("emails")!;

export default function RedactEmails() {
  return <RedactScenario scenario={scenario} />;
}
