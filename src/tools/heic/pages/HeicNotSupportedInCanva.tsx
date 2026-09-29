import HeicScenario from "../HeicScenario";
import { getHeicScenarioById } from "../scenarios";

const scenario = getHeicScenarioById("not-supported-in-canva")!;

export default function HeicNotSupportedInCanva() {
  return <HeicScenario scenario={scenario} />;
}
