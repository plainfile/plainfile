import HeicScenario from "../HeicScenario";
import { getHeicScenarioById } from "../scenarios";

const scenario = getHeicScenarioById("convert-on-iphone")!;

export default function HeicConvertOnIphone() {
  return <HeicScenario scenario={scenario} />;
}
