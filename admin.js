// 管理画面専用の処理です。デモ版では入力画面で登録したサロンアカウントを使います。
const SALON_ACCOUNT_KEY = "artmakeSalonAccount";
const SALON_SESSION_KEY = "artmakeSalonLoggedIn";

const storageService = {
  key: "artmakeConsentRecords",
  getAll() {
    return JSON.parse(localStorage.getItem(this.key) || "[]");
  },
  remove(id) {
    const records = this.getAll().filter((record) => record.id !== id);
    localStorage.setItem(this.key, JSON.stringify(records));
  },
};

const dataService = {
  async getAll() {
    if (window.firebaseConsentService?.isEnabled()) {
      return window.firebaseConsentService.getConsents();
    }
    return storageService.getAll();
  },
  async remove(id) {
    if (window.firebaseConsentService?.isEnabled()) {
      return window.firebaseConsentService.deleteConsent(id);
    }
    storageService.remove(id);
  },
};

let selectedRecordId = "";
let cachedRecords = [];

registerServiceWorker();
initAdminPage();

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  navigator.serviceWorker.register("service-worker.js").catch(() => {
    // ローカル確認時など、登録できない環境では何もしません。
  });
}

function initAdminPage() {
  const loginView = document.querySelector("#loginView");
  const adminApp = document.querySelector("#adminApp");
  const loginForm = document.querySelector("#adminLoginForm");
  const emailInput = document.querySelector("#adminEmail");
  const passwordInput = document.querySelector("#adminPassword");
  const loginMessage = document.querySelector("#loginMessage");

  function unlockAdmin() {
    loginView.style.display = "none";
    adminApp.classList.add("active-view");
    renderTable();
  }

  if (localStorage.getItem(SALON_SESSION_KEY) === "true" && getSalonAccount()) {
    unlockAdmin();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginMessage.textContent = "";

    const account = getSalonAccount();
    if (!account) {
      loginMessage.textContent = "先にお客様入力画面でサロン登録を行ってください。";
      return;
    }

    if (emailInput.value.trim().toLowerCase() === account.email && passwordInput.value === account.password) {
      localStorage.setItem(SALON_SESSION_KEY, "true");
      loginForm.reset();
      unlockAdmin();
      return;
    }
    loginMessage.textContent = "メールアドレスまたはパスワードが違います。";
    passwordInput.value = "";
    passwordInput.focus();
  });

  ["searchName", "searchPhone", "filterTreatmentDate", "filterTreatmentPart"].forEach((id) => {
    document.querySelector(`#${id}`).addEventListener("input", renderTable);
    document.querySelector(`#${id}`).addEventListener("change", renderTable);
  });

  document.querySelector("#clearFiltersButton").addEventListener("click", () => {
    document.querySelector("#searchName").value = "";
    document.querySelector("#searchPhone").value = "";
    document.querySelector("#filterTreatmentDate").value = "";
    document.querySelector("#filterTreatmentPart").value = "";
    renderTable();
  });

  document.querySelector("#consentTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    showDetail(button.dataset.id);
    if (button.dataset.action === "download") {
      setTimeout(downloadPdf, 150);
    }
    if (button.dataset.action === "print") {
      setTimeout(printCurrentDetail, 150);
    }
  });

  document.querySelector("#closeDialogButton").addEventListener("click", () => {
    document.querySelector("#detailDialog").close();
  });
  document.querySelector("#downloadPdfButton").addEventListener("click", downloadPdf);
  document.querySelector("#printButton").addEventListener("click", printCurrentDetail);
  document.querySelector("#deleteButton").addEventListener("click", deleteSelectedRecord);
}

function getSalonAccount() {
  try {
    return JSON.parse(localStorage.getItem(SALON_ACCOUNT_KEY) || "null");
  } catch (error) {
    return null;
  }
}

async function renderTable() {
  const searchName = document.querySelector("#searchName").value.trim().toLowerCase();
  const searchPhone = normalizePhone(document.querySelector("#searchPhone").value);
  const filterTreatmentDate = document.querySelector("#filterTreatmentDate").value;
  const filterTreatmentPart = document.querySelector("#filterTreatmentPart").value;

  cachedRecords = await dataService.getAll();
  const records = cachedRecords.filter((record) => {
    const nameText = `${record.customer.name} ${record.customer.kana}`.toLowerCase();
    const phoneText = normalizePhone(record.customer.phone);
    const treatmentDate = record.customer.treatmentDate || "";
    const treatmentParts = record.treatmentParts || [];

    return (
      (!searchName || nameText.includes(searchName)) &&
      (!searchPhone || phoneText.includes(searchPhone)) &&
      (!filterTreatmentDate || treatmentDate === filterTreatmentDate) &&
      (!filterTreatmentPart || treatmentParts.includes(filterTreatmentPart))
    );
  });

  const tableBody = document.querySelector("#consentTableBody");
  tableBody.innerHTML = "";
  document.querySelector("#emptyState").style.display = records.length ? "none" : "block";

  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDateTime(record.createdAt)}</td>
      <td>${formatDate(record.customer.treatmentDate)}</td>
      <td>${escapeHtml(record.customer.name)}<br><small>${escapeHtml(record.customer.kana)}</small></td>
      <td>${escapeHtml(record.customer.phone)}</td>
      <td>${escapeHtml(formatTreatmentParts(record))}</td>
      <td>${formatDateTime(record.signedAt)}</td>
      <td>
        <div class="row-actions">
          <button class="secondary-button" type="button" data-action="detail" data-id="${record.id}">PDF表示</button>
          <button class="secondary-button" type="button" data-action="download" data-id="${record.id}">PDFダウンロード</button>
          <button class="secondary-button" type="button" data-action="print" data-id="${record.id}">印刷</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function showDetail(recordId) {
  const record = cachedRecords.find((item) => item.id === recordId);
  const detailContent = document.querySelector("#detailContent");
  const detailDialog = document.querySelector("#detailDialog");
  if (!record) return;

  selectedRecordId = recordId;
  detailContent.innerHTML = buildDetailHtml(record);
  detailDialog.showModal();
}

function buildDetailHtml(record) {
  return `
    <div class="pdf-title">
      <p class="eyebrow">Permanent Makeup Consent</p>
      <h2>アートメイク電子同意書</h2>
    </div>
    <div class="detail-grid">
      <div class="detail-box"><strong>氏名</strong>${escapeHtml(record.customer.name)}</div>
      <div class="detail-box"><strong>フリガナ</strong>${escapeHtml(record.customer.kana)}</div>
      <div class="detail-box"><strong>生年月日</strong>${formatDate(record.customer.birthDate)}</div>
      <div class="detail-box"><strong>施術日</strong>${formatDate(record.customer.treatmentDate)}</div>
      <div class="detail-box"><strong>電話番号</strong>${escapeHtml(record.customer.phone)}</div>
      <div class="detail-box"><strong>施術希望部位</strong>${escapeHtml(formatTreatmentParts(record))}</div>
      <div class="detail-box"><strong>署名日時</strong>${formatDateTime(record.signedAt)}</div>
    </div>
    <div class="detail-section">
      <h3>既往歴・事前確認事項</h3>
      ${listHtml(record.historyChecks)}
    </div>
    <div class="detail-section">
      <h3>施術説明</h3>
      <p>アートメイクは皮膚の浅い層に色素を定着させる施術です。施術直後は色が濃く見える場合がありますが、時間の経過とともに薄くなります。色の定着には個人差があり、肌質・代謝・生活習慣・アフターケアによって仕上がりが異なります。1回で完成するものではなく、必要に応じてリタッチが必要になる場合があります。</p>
    </div>
    <div class="detail-section">
      <h3>リスク説明</h3>
      ${listHtml(record.riskChecks)}
    </div>
    <div class="detail-section">
      <h3>アフターケア確認</h3>
      ${listHtml(record.aftercareChecks)}
    </div>
    <div class="detail-section">
      <h3>同意チェック</h3>
      ${listHtml(record.finalConsents)}
    </div>
    <div class="detail-section">
      <h3>電子署名</h3>
      <img class="signature-image" src="${record.signatureImage}" alt="お客様の電子署名">
    </div>
  `;
}

function downloadPdf() {
  // ブラウザ標準の印刷画面から「PDFとして保存」を選ぶ運用にしています。
  window.print();
}

function printCurrentDetail() {
  window.print();
}

async function deleteSelectedRecord() {
  if (!selectedRecordId) return;
  const confirmed = confirm("この同意書を削除しますか？");
  if (!confirmed) return;

  try {
    await dataService.remove(selectedRecordId);
    selectedRecordId = "";
    document.querySelector("#detailDialog").close();
    renderTable();
  } catch (error) {
    alert(error.message || "削除に失敗しました。");
  }
}

function listHtml(items = []) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function normalizePhone(value = "") {
  return String(value).replaceAll("-", "").replaceAll(" ", "");
}

function formatTreatmentParts(record) {
  const parts = record.treatmentParts || [];
  const other = String(record.treatmentOther || "").trim();
  return parts.map((part) => (part === "その他" && other ? `その他（${other}）` : part)).join("、");
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
