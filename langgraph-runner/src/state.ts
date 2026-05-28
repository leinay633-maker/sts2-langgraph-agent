import type {
  CandidateAction,
  GameState,
  LegalAction,
  PlannerState,
  RiskAssessment,
  RunSummary,
  StateType,
  VerifierResult
} from "../../shared/src/types.js";

export interface RunGraphState {
  runId: string;
  maxSteps: number;
  stepNo: number;
  gameState: GameState | null;
  stateType: StateType | "unknown";
  screen: string | null;
  stateFingerprint: string | null;
  legalActions: LegalAction[];
  plannerState: PlannerState | null;
  candidateAction: CandidateAction | null;
  risk: RiskAssessment | null;
  verifierResult: VerifierResult | null;
  memory: RunSummary | null;
  lastError: string | null;
  haltReason: string | null;
}

export function initialState(runId: string, maxSteps: number): RunGraphState {
  return {
    runId,
    maxSteps,
    stepNo: 0,
    gameState: null,
    stateType: "unknown",
    screen: null,
    stateFingerprint: null,
    legalActions: [],
    plannerState: null,
    candidateAction: null,
    risk: null,
    verifierResult: null,
    memory: null,
    lastError: null,
    haltReason: null
  };
}
