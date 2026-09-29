import RedactScenario from "../RedactScenario";
import { getScenarioById } from "../scenarios";

const scenario = getScenarioById("legal-documents")!;

export default function RedactLegalDocuments() {
  return <RedactScenario scenario={scenario} />;
}
