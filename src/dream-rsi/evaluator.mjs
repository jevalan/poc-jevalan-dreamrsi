export const EVALUATOR_ID = "systemone-fit-choice-accuracy-v1";

const FITS = {
  routing: "Elegir o asignar herramientas/especialistas según sus capacidades.",
  review: "Inspeccionar código y localizar defectos con evidencia.",
  context: "Recuperar y resumir contexto previo relevante.",
  gates: "Evaluar seguridad, permisos y restricciones de ejecución.",
  supervision: "Decidir si el agente debe continuar, escalar o detenerse.",
};

export const CANDIDATES = {
  kev: { model: "kev-latest", url: "http://127.0.0.1:8009/v1/systemone" },
  laya: { model: "laya-rl-agent", url: "http://127.0.0.1:8021/v1/systemone" },
};

export function makeSystemOneRequest(task, profile) {
  const candidate = CANDIDATES[profile];
  if (!candidate) throw new Error("unknown candidate profile");
  if (!task || typeof task.request !== "string" || !FITS[task.expected_fit]) {
    throw new TypeError("task needs a request and a known expected_fit");
  }
  return {
    model: candidate.model,
    state: task.request,
    questions: {
      fit: {
        type: "choice",
        instructions: "Elige la capacidad principal necesaria para resolver la petición.",
        criteria: FITS,
      },
    },
  };
}

export function evaluateSystemOneResponse(task, response) {
  const choice = response?.answers?.fit?.choice;
  if (typeof choice !== "string" || !(choice in FITS)) {
    return { evaluator: EVALUATOR_ID, evaluated: true, reward: 0, predictedFit: null, error: "invalid or missing fit choice" };
  }
  return {
    evaluator: EVALUATOR_ID,
    evaluated: true,
    reward: choice === task.expected_fit ? 1 : 0,
    predictedFit: choice,
    confidence: Number.isFinite(response.answers.fit.confidence) ? response.answers.fit.confidence : null,
    error: null,
  };
}

export function evaluateSystemOneFailure(error) {
  return {
    evaluator: EVALUATOR_ID,
    evaluated: true,
    reward: 0,
    predictedFit: null,
    confidence: null,
    error: String(error || "backend request failed"),
  };
}
