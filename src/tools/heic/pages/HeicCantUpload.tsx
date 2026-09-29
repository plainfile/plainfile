import HeicScenario from "../HeicScenario";
import { getHeicScenarioById } from "../scenarios";

const scenario = getHeicScenarioById("cant-upload")!;

export default function HeicCantUpload() {
  return <HeicScenario scenario={scenario} />;
}
