const questions = [
  {
    id: 1,
    text: "Possui parentes (ex: cônjuge, pai, irmão, primo, cunhado etc.) ou pessoas próximas (ex: namorado, padrinho, ex-cônjuge etc.) trabalhando na Hapvida? Se sim, informe abaixo o nome completo e o tipo (grau) da relação.",
  },
  {
    id: 2,
    text: "É sócio ou administrador de empresa que mantém relacionamento com a Hapvida? Se sim, informe abaixo o nome da empresa.",
  },
  {
    id: 3,
    text: "Possui um segundo emprego? Se sim, informe abaixo o cargo e a empresa.",
  },
  {
    id: 4,
    text: "Possui parentes ou pessoas próximas trabalhando em empresas concorrentes? Se sim, indique abaixo o nome da empresa, o cargo e o tipo (grau) da relação.",
  },
  {
    id: 5,
    text: "Nos últimos 5 (cinco) anos, você, algum parente ou alguma pessoa próxima a você atua ou atuou exercendo cargo, função ou emprego em órgão público, empresa pública, fundação pública, conselho de classe ou empresa permissionária/concessionária de serviço público? Se sim, informar nome da instituição, cargo ocupado por você, seu parente ou pessoa próxima e o grau de parentesco ou proximidade pessoal.",
  },
  {
    id: 6,
    text: "Já trabalhou na Hapvida? Se sim, informe abaixo quando (o período) e a área a qual era vinculado.",
  },
];

const storageKeys = {
  emails: "hapvidaComplianceRecruiterEmails",
  submissions: "hapvidaComplianceSubmissions",
};

// O formulário envia para a função serverless na MESMA origem (/api/submit).
// A função guarda a URL do fluxo e o segredo em variáveis de ambiente do Vercel,
// então nada sensível fica no código do navegador e não há CORS.
const SUBMIT_ENDPOINT = "/api/submit";

async function sendToFlow(data) {
  try {
    const response = await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error("Falha ao enviar:", error);
    return false;
  }
}

const form = document.querySelector("#complianceForm");
const list = document.querySelector("#questionsList");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const validationSummary = document.querySelector("#validationSummary");
const reviewDialog = document.querySelector("#reviewDialog");
const reviewContent = document.querySelector("#reviewContent");
const confirmButton = document.querySelector("#confirmButton");
const exportButton = document.querySelector("#exportButton");
const printButton = document.querySelector("#printButton");
const clearDraftButton = document.querySelector("#clearDraftButton");
const dateInput = document.querySelector("#candidateDate");
const recruiterEmailsInput = document.querySelector("#recruiterEmails");
const saveEmailsButton = document.querySelector("#saveEmailsButton");
const emailConfigStatus = document.querySelector("#emailConfigStatus");
const submissionsTable = document.querySelector("#submissionsTable");
const submissionsHint = document.querySelector("#submissionsHint");
const metricTotal = document.querySelector("#metricTotal");
const metricWithYes = document.querySelector("#metricWithYes");
const metricNoConflict = document.querySelector("#metricNoConflict");
const seedExampleButton = document.querySelector("#seedExampleButton");
const clearSubmissionsButton = document.querySelector("#clearSubmissionsButton");
const submissionDialog = document.querySelector("#submissionDialog");
const submissionDialogTitle = document.querySelector("#submissionDialogTitle");
const submissionDetail = document.querySelector("#submissionDetail");
const emailSelectedButton = document.querySelector("#emailSelectedButton");

let selectedSubmissionId = null;
if (dateInput) dateInput.valueAsDate = new Date();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readSubmissions() {
  const serverData = requestServer("GET", "/api/submissions");
  if (Array.isArray(serverData)) return serverData;
  try {
    return JSON.parse(localStorage.getItem(storageKeys.submissions) || "[]");
  } catch {
    return [];
  }
}

function writeSubmissions(submissions) {
  if (requestServer("POST", "/api/submissions", submissions)) return;
  localStorage.setItem(storageKeys.submissions, JSON.stringify(submissions));
}

function getRecruiterEmails() {
  const serverData = requestServer("GET", "/api/emails");
  if (serverData && typeof serverData.emails === "string") return serverData.emails;
  return localStorage.getItem(storageKeys.emails) || "";
}

function saveRecruiterEmails(value) {
  if (requestServer("POST", "/api/emails", { emails: value })) return;
  localStorage.setItem(storageKeys.emails, value);
}

function requestServer(method, url, payload) {
  try {
    const request = new XMLHttpRequest();
    request.open(method, url, false);
    request.setRequestHeader("Content-Type", "application/json");
    request.send(payload === undefined ? null : JSON.stringify(payload));
    if (request.status < 200 || request.status >= 300) return null;
    return request.responseText ? JSON.parse(request.responseText) : true;
  } catch {
    return null;
  }
}

function parseEmails(value) {
  return value
    .split(/[;,\n]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function renderQuestions() {
  if (!list) return;
  list.innerHTML = questions
    .map(
      (question) => `
        <article class="question-card" data-question="${question.id}">
          <div class="question-main">
            <div class="question-text">
              <span class="question-number">${question.id}</span>
              <p>${escapeHtml(question.text)}</p>
            </div>
            <div class="answer-toggle" role="radiogroup" aria-label="Resposta da pergunta ${question.id}">
              <label>
                <input type="radio" name="answer-${question.id}" value="Sim" required />
                <span>Sim</span>
              </label>
              <label>
                <input type="radio" name="answer-${question.id}" value="Não" required />
                <span>Não</span>
              </label>
            </div>
          </div>
          <div class="justification-wrap">
            <label>
              Justificativa da pergunta ${question.id}
              <textarea name="justification-${question.id}" rows="4" placeholder="Informe os detalhes solicitados na pergunta."></textarea>
            </label>
            <p class="hint">Obrigatório quando a resposta for "Sim".</p>
            <p class="error-text">Preencha a justificativa para continuar.</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function getFormData() {
  if (!form || !dateInput) return null;
  return {
    id: crypto.randomUUID(),
    enviadoEm: new Date().toISOString(),
    candidato: {
      nome: document.querySelector("#candidateName").value.trim(),
      cpf: document.querySelector("#candidateCpf").value.trim(),
      data: dateInput.value,
      cargo: document.querySelector("#candidateRole").value.trim(),
    },
    respostas: questions.map((question) => {
      const answer = form.querySelector(`input[name="answer-${question.id}"]:checked`)?.value || "";
      return {
        pergunta: question.id,
        texto: question.text,
        resposta: answer,
        justificativa: form.querySelector(`[name="justification-${question.id}"]`).value.trim(),
      };
    }),
    declaracao: document.querySelector("#truthDeclaration").checked,
  };
}

function setQuestionState(card) {
  if (!form) return;
  const id = card.dataset.question;
  const answer = form.querySelector(`input[name="answer-${id}"]:checked`)?.value;
  const justification = form.querySelector(`[name="justification-${id}"]`);

  card.classList.toggle("requires-justification", answer === "Sim");
  if (answer !== "Sim") {
    justification.value = "";
    card.classList.remove("invalid");
  }
}

function updateProgress() {
  if (!form || !progressText || !progressBar) return;
  const answered = questions.filter((question) => form.querySelector(`input[name="answer-${question.id}"]:checked`)).length;
  const percent = Math.round((answered / questions.length) * 100);
  progressText.textContent = `${answered} de ${questions.length} respondidas`;
  progressBar.style.width = `${percent}%`;
}

function validateForm() {
  if (!form) return false;
  let isValid = form.checkValidity();
  let firstInvalid = null;
  let missingJustifications = 0;

  document.querySelectorAll(".question-card").forEach((card) => {
    const id = card.dataset.question;
    const answer = form.querySelector(`input[name="answer-${id}"]:checked`)?.value;
    const justification = form.querySelector(`[name="justification-${id}"]`);
    const invalid = answer === "Sim" && justification.value.trim().length < 3;

    card.classList.toggle("invalid", invalid);
    if (invalid) {
      missingJustifications += 1;
      isValid = false;
      firstInvalid ||= justification;
    }
  });

  if (!validationSummary) return isValid;
  if (!isValid) {
    validationSummary.textContent =
      missingJustifications > 0
        ? `${missingJustifications} justificativa(s) pendente(s)`
        : "Revise os campos obrigatórios";
    validationSummary.classList.add("error");
    (firstInvalid || form.querySelector(":invalid"))?.focus();
  } else {
    validationSummary.textContent = "Formulário pronto para revisão";
    validationSummary.classList.remove("error");
  }

  return isValid;
}

function responseSummary(data) {
  const yesItems = data.respostas.filter((item) => item.resposta === "Sim");
  return {
    yesCount: yesItems.length,
    status: yesItems.length > 0 ? "Requer análise" : "Sem conflito declarado",
  };
}

function buildReview(data = getFormData()) {
  if (!reviewContent || !data) return;
  const responses = data.respostas
    .map(
      (item) => `
        <div class="review-block">
          <h3>Pergunta ${item.pergunta}: ${escapeHtml(item.resposta)}</h3>
          <p>${escapeHtml(item.texto)}</p>
          ${item.justificativa ? `<p><strong>Justificativa:</strong> ${escapeHtml(item.justificativa)}</p>` : ""}
        </div>
      `,
    )
    .join("");

  reviewContent.innerHTML = `
    <div class="review-block">
      <h3>Dados do candidato</h3>
      <p><strong>Nome:</strong> ${escapeHtml(data.candidato.nome)}</p>
      <p><strong>CPF:</strong> ${escapeHtml(data.candidato.cpf)}</p>
      <p><strong>Data:</strong> ${escapeHtml(data.candidato.data)}</p>
      ${data.candidato.cargo ? `<p><strong>Cargo pretendido:</strong> ${escapeHtml(data.candidato.cargo)}</p>` : ""}
    </div>
    ${responses}
    <div class="review-block">
      <h3>Declaração</h3>
      <p>O candidato declarou que as respostas são verdadeiras.</p>
    </div>
  `;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildEmailBody(data) {
  const lines = [
    "Formulário de Compliance - Hapvida",
    "",
    `Nome: ${data.candidato.nome}`,
    `CPF: ${data.candidato.cpf}`,
    `Data informada: ${data.candidato.data}`,
    `Cargo pretendido: ${data.candidato.cargo || "-"}`,
    `Enviado em: ${formatDateTime(data.enviadoEm)}`,
    "",
    "Respostas:",
    ...data.respostas.flatMap((item) => [
      "",
      `Pergunta ${item.pergunta}: ${item.resposta}`,
      item.texto,
      item.justificativa ? `Justificativa: ${item.justificativa}` : "Justificativa: -",
    ]),
    "",
    "Declaração: o candidato declarou que as respostas são verdadeiras.",
  ];

  return lines.join("\n");
}

function openEmailDraft(data) {
  const emails = parseEmails(getRecruiterEmails());
  if (emails.length === 0) {
    if (emailConfigStatus) {
      emailConfigStatus.textContent = "Cadastre ao menos um e-mail para envio.";
      emailConfigStatus.classList.add("error");
      recruiterEmailsInput?.focus();
    } else {
      alert("Nenhum e-mail de recrutador foi configurado. Configure os e-mails no painel do recrutamento antes do envio.");
    }
    return false;
  }

  const subject = `Compliance executivo - ${data.candidato.nome || "candidato"}`;
  const mailto = `mailto:${encodeURIComponent(emails.join(","))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildEmailBody(data))}`;
  window.location.href = mailto;
  return true;
}

function saveSubmission(data) {
  const submissions = readSubmissions();
  submissions.unshift(data);
  writeSubmissions(submissions);
  renderDashboard();
}

function resetCandidateForm() {
  if (!form || !dateInput) return;
  form.reset();
  dateInput.valueAsDate = new Date();
  document.querySelectorAll(".question-card").forEach((card) => {
    card.classList.remove("requires-justification", "invalid");
  });
  if (validationSummary) {
    validationSummary.textContent = "";
    validationSummary.classList.remove("error");
  }
  updateProgress();
}

function downloadJson() {
  if (!validateForm()) return;
  const data = getFormData();
  if (!data) return;
  const filenameName = data.candidato.nome || "candidato";
  const safeName = filenameName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `respostas-compliance-${safeName || "candidato"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderDashboard() {
  if (!metricTotal || !metricWithYes || !metricNoConflict || !submissionsHint || !submissionsTable) return;
  const submissions = readSubmissions();
  const total = submissions.length;
  const withYes = submissions.filter((submission) => responseSummary(submission).yesCount > 0).length;

  metricTotal.textContent = total;
  metricWithYes.textContent = withYes;
  metricNoConflict.textContent = total - withYes;
  submissionsHint.textContent = total === 0 ? "Nenhum formulário recebido ainda" : `${total} formulário(s) recebido(s)`;

  submissionsTable.innerHTML = submissions
    .map((submission) => {
      const summary = responseSummary(submission);
      return `
        <tr>
          <td>
            <strong>${escapeHtml(submission.candidato.nome || "Sem nome")}</strong>
            <span>${escapeHtml(submission.candidato.cargo || "Cargo não informado")}</span>
          </td>
          <td>${escapeHtml(formatDateTime(submission.enviadoEm))}</td>
          <td>${summary.yesCount}</td>
          <td><span class="status-pill ${summary.yesCount > 0 ? "attention" : "clear"}">${escapeHtml(summary.status)}</span></td>
          <td><button type="button" class="table-button" data-submission-id="${escapeHtml(submission.id)}">Ver respostas</button></td>
        </tr>
      `;
    })
    .join("");
}

function renderSubmissionDetail(id) {
  if (!submissionDialog || !submissionDialogTitle || !submissionDetail) return;
  const submission = readSubmissions().find((item) => item.id === id);
  if (!submission) return;

  selectedSubmissionId = id;
  submissionDialogTitle.textContent = submission.candidato.nome || "Respostas do candidato";
  submissionDetail.innerHTML = `
    <div class="review-block">
      <h3>Dados do candidato</h3>
      <p><strong>Nome:</strong> ${escapeHtml(submission.candidato.nome)}</p>
      <p><strong>CPF:</strong> ${escapeHtml(submission.candidato.cpf)}</p>
      <p><strong>Cargo:</strong> ${escapeHtml(submission.candidato.cargo || "-")}</p>
      <p><strong>Enviado em:</strong> ${escapeHtml(formatDateTime(submission.enviadoEm))}</p>
    </div>
    ${submission.respostas
      .map(
        (item) => `
          <div class="review-block">
            <h3>Pergunta ${item.pergunta}: ${escapeHtml(item.resposta)}</h3>
            <p>${escapeHtml(item.texto)}</p>
            ${item.justificativa ? `<p><strong>Justificativa:</strong> ${escapeHtml(item.justificativa)}</p>` : ""}
          </div>
        `,
      )
      .join("")}
  `;
  submissionDialog.showModal();
}

function seedExample() {
  const example = {
    id: crypto.randomUUID(),
    enviadoEm: new Date().toISOString(),
    candidato: {
      nome: "Candidato Executivo Exemplo",
      cpf: "000.000.000-00",
      data: new Date().toISOString().slice(0, 10),
      cargo: "Diretoria",
    },
    respostas: questions.map((question) => ({
      pergunta: question.id,
      texto: question.text,
      resposta: question.id === 1 ? "Sim" : "Não",
      justificativa: question.id === 1 ? "Pessoa próxima trabalha na Hapvida; relação informada para avaliação de compliance." : "",
    })),
    declaracao: true,
  };
  saveSubmission(example);
}

renderQuestions();
if (recruiterEmailsInput) recruiterEmailsInput.value = getRecruiterEmails();
updateProgress();
renderDashboard();

form?.addEventListener("change", (event) => {
  const card = event.target.closest(".question-card");
  if (card) setQuestionState(card);
  updateProgress();
});

form?.addEventListener("input", (event) => {
  const card = event.target.closest(".question-card");
  if (card) card.classList.remove("invalid");
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateForm()) return;
  buildReview();
  reviewDialog?.showModal();
});

confirmButton?.addEventListener("click", async (event) => {
  event.preventDefault();
  const data = getFormData();
  if (!data) return;

  confirmButton.disabled = true;
  const originalLabel = confirmButton.textContent;
  confirmButton.textContent = "Enviando...";

  const ok = await sendToFlow(data);

  confirmButton.disabled = false;
  confirmButton.textContent = originalLabel;

  if (!ok) {
    alert("Não foi possível enviar agora. Verifique sua conexão e tente novamente.");
    return;
  }

  reviewDialog?.close();
  resetCandidateForm();
  alert("Formulário enviado com sucesso. Obrigado!");
});

exportButton?.addEventListener("click", downloadJson);
printButton?.addEventListener("click", () => window.print());
clearDraftButton?.addEventListener("click", () => {
  if (!confirm("Deseja limpar todas as respostas preenchidas?")) return;
  resetCandidateForm();
});

saveEmailsButton?.addEventListener("click", () => {
  const emails = parseEmails(recruiterEmailsInput.value);
  saveRecruiterEmails(emails.join("; "));
  recruiterEmailsInput.value = emails.join("; ");
  emailConfigStatus.textContent = emails.length === 0 ? "Nenhum e-mail cadastrado" : `${emails.length} destinatário(s) salvo(s)`;
  emailConfigStatus.classList.toggle("error", emails.length === 0);
});

submissionsTable?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-submission-id]");
  if (!button) return;
  renderSubmissionDetail(button.dataset.submissionId);
});

emailSelectedButton?.addEventListener("click", () => {
  const submission = readSubmissions().find((item) => item.id === selectedSubmissionId);
  if (submission) openEmailDraft(submission);
});

seedExampleButton?.addEventListener("click", seedExample);

clearSubmissionsButton?.addEventListener("click", () => {
  if (!confirm("Deseja limpar todos os formulários recebidos neste painel?")) return;
  writeSubmissions([]);
  renderDashboard();
});
