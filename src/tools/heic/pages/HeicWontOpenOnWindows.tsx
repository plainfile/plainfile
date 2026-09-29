import HeicScenario from "../HeicScenario";
import { getHeicScenarioById } from "../scenarios";

const scenario = getHeicScenarioById("wont-open-on-windows")!;

export default function HeicWontOpenOnWindows() {
  return <HeicScenario scenario={scenario} />;
}
