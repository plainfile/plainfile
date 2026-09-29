import RedactScenario from "../RedactScenario";
import { getScenarioById } from "../scenarios";

const scenario = getScenarioById("ssn")!;

export default function RedactSsn() {
  return <RedactScenario scenario={scenario} />;
}
