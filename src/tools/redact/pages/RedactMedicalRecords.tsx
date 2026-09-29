import RedactScenario from "../RedactScenario";
import { getScenarioById } from "../scenarios";

const scenario = getScenarioById("medical-records")!;

export default function RedactMedicalRecords() {
  return <RedactScenario scenario={scenario} />;
}
