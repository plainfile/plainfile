import RedactScenario from "@/pages/RedactScenario";
import { getScenarioById } from "@/lib/scenarios";

const scenario = getScenarioById("legal-documents")!;

export default function RedactLegalDocuments() {
  return <RedactScenario scenario={scenario} />;
}
