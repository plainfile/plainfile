import RedactScenario from "../RedactScenario";
import { getScenarioById } from "../scenarios";

const scenario = getScenarioById("bank-statement")!;

export default function RedactBankStatement() {
  return <RedactScenario scenario={scenario} />;
}
