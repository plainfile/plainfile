import RedactScenario from "../RedactScenario";
import { getScenarioById } from "../scenarios";

const scenario = getScenarioById("foia")!;

export default function RedactForFoia() {
  return <RedactScenario scenario={scenario} />;
}
