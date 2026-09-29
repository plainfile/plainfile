import HeicScenario from "@/pages/HeicScenario";
import { getHeicScenarioById } from "@/lib/heic-scenarios";

const scenario = getHeicScenarioById("convert-on-iphone")!;

export default function HeicConvertOnIphone() {
  return <HeicScenario scenario={scenario} />;
}
