// お客様入力画面専用の処理です。保存先を変える時はstorageServiceだけ差し替えます。
const storageService = {
  key: "artmakeConsentRecords",
  getAll() {
    return JSON.parse(localStorage.getItem(this.key) || "[]");
  },
  save(record) {
    const records = this.getAll();
    records.unshift(record);
    localStorage.setItem(this.key, JSON.stringify(records));
  },
};

const dataService = {
  async save(record) {
    if (window.firebaseConsentService?.isEnabled()) {
      return window.firebaseConsentService.saveConsent(record);
    }
    storageService.save(record);
    return record.id;
  },
};

const karteStorageService = {
  key: "artmakeKarteRecords",
  getAll() {
    return JSON.parse(localStorage.getItem(this.key) || "[]");
  },
  save(record) {
    const records = this.getAll();
    records.unshift(record);
    localStorage.setItem(this.key, JSON.stringify(records));
  },
  update(id, record) {
    const records = this.getAll().map((item) => (item.id === id ? record : item));
    localStorage.setItem(this.key, JSON.stringify(records));
  },
  remove(id) {
    const records = this.getAll().filter((record) => record.id !== id);
    localStorage.setItem(this.key, JSON.stringify(records));
  },
};

// デモ用サロンアカウントです。本番ではFirebase Authenticationなどに差し替えます。
const SALON_ACCOUNT_KEY = "artmakeSalonAccount";
const SALON_SESSION_KEY = "artmakeSalonLoggedIn";
const DEFAULT_SALON_NAME = "BEYOND";
const LEGACY_SALON_NAMES = ["MB " + "ARTMAKE", "MB" + "アートメイク"];

const treatmentParts = ["眉", "リップ", "アイライン", "ヘアライン", "SMP", "除去", "カモフラージュ", "その他"];
const artmakeHistoryOptions = ["過去にアートメイク経験が有り", "アートメイク経験なし"];
const signatureRequiredCheckNames = new Set(["finalConsents"]);

const historyItems = [
  "妊娠中または授乳中ではありません",
  "重度のアレルギーはありません",
  "ケロイド体質ではありません",
  "抗凝固薬を服用していません",
  "感染症や皮膚疾患はありません",
  "施術部位に炎症や傷はありません",
  "過去にアートメイク経験が有り",
  "アートメイク経験なし",
  "その他、医師の確認が必要な状態はありません",
  "その他、事前事項確認いたしました",
];

const riskItems = [
  "赤み、腫れ、かゆみ、痛みが出る場合があります",
  "色ムラや左右差が出る場合があります",
  "色素が定着しにくい場合があります",
  "時間経過により変色、退色する場合があります",
  "体質によりアレルギー反応が起こる場合があります",
  "施術後の仕上がりには個人差があります",
];

const aftercareItems = [
  "施術当日は飲酒、激しい運動、長時間の入浴を控えます",
  "施術部位を強くこすりません",
  "かさぶたを無理にはがしません",
  "指定された保湿やケアを守ります",
  "異常がある場合はすぐに施術者へ連絡します",
];

const finalConsentItems = [
  "施術内容の説明を受け、理解しました",
  "リスクについて理解しました",
  "仕上がりに個人差があることを理解しました",
  "アフターケアの説明を理解しました",
  "上記内容に同意し、施術を希望します",
];

registerServiceWorker();
initCustomerPage();

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  navigator.serviceWorker.register("service-worker.js").catch(() => {
    // ローカル確認時など、登録できない環境では何もしません。
  });
}

function initCustomerPage() {
  const appLoginView = document.querySelector("#appLoginView");
  const passwordResetView = document.querySelector("#passwordResetView");
  const salonRegisterView = document.querySelector("#salonRegisterView");
  const salonRegisterForm = document.querySelector("#salonRegisterForm");
  const passwordResetForm = document.querySelector("#passwordResetForm");
  const registerSalonName = document.querySelector("#registerSalonName");
  const registerEmail = document.querySelector("#registerEmail");
  const registerPassword = document.querySelector("#registerPassword");
  const registerPasswordConfirm = document.querySelector("#registerPasswordConfirm");
  const resetEmail = document.querySelector("#resetEmail");
  const resetPassword = document.querySelector("#resetPassword");
  const resetPasswordConfirm = document.querySelector("#resetPasswordConfirm");
  const resetMessage = document.querySelector("#resetMessage");
  const registerMessage = document.querySelector("#registerMessage");
  const showLoginButton = document.querySelector("#showLoginButton");
  const showRegisterButton = document.querySelector("#showRegisterButton");
  const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
  const backToLoginButton = document.querySelector("#backToLoginButton");
  const appLoginForm = document.querySelector("#appLoginForm");
  const appEmail = document.querySelector("#appEmail");
  const appPassword = document.querySelector("#appPassword");
  const appLoginMessage = document.querySelector("#appLoginMessage");
  const headerSalonName = document.querySelector("#headerSalonName");
  const homeFooterSalonName = document.querySelector("#homeFooterSalonName");
  const logoutButton = document.querySelector("#logoutButton");
  const settingsLogoutButton = document.querySelector("#settingsLogoutButton");
  const form = document.querySelector("#consentForm");
  const canvas = document.querySelector("#signatureCanvas");
  const ctx = canvas.getContext("2d");
  const signatureStatus = document.querySelector("#signatureStatus");
  const signedAtText = document.querySelector("#signedAtText");
  const signatureLock = document.querySelector("#signatureLock");
  const submitButton = document.querySelector("#submitButton");
  const nextCustomerButton = document.querySelector("#nextCustomerButton");
  const otherTreatmentField = document.querySelector("#otherTreatmentField");
  const treatmentOtherInput = document.querySelector("#treatmentOther");
  const karteForm = document.querySelector("#karteForm");
  const karteCustomerId = document.querySelector("#karteCustomerId");
  const karteBirthDate = document.querySelector("#karteBirthDate");
  const karteAge = document.querySelector("#karteAge");
  const kartePhotoInput = document.querySelector("#kartePhotoInput");
  const kartePhotoPart = document.querySelector("#kartePhotoPart");
  const kartePhotoRound = document.querySelector("#kartePhotoRound");
  const kartePhotoMonths = document.querySelector("#kartePhotoMonths");
  const kartePhotoTiming = document.querySelector("#kartePhotoTiming");
  const kartePhotoList = document.querySelector("#kartePhotoList");
  const kartePhotoEmptyState = document.querySelector("#kartePhotoEmptyState");
  const kartePhotoCount = document.querySelector("#kartePhotoCount");
  const photoPreviewDialog = document.querySelector("#photoPreviewDialog");
  const photoPreviewImage = document.querySelector("#photoPreviewImage");
  const photoPreviewTitle = document.querySelector("#photoPreviewTitle");
  const photoPreviewMeta = document.querySelector("#photoPreviewMeta");
  const photoPreviewClose = document.querySelector("#photoPreviewClose");
  const karteSearchInput = document.querySelector("#karteSearchInput");
  const karteList = document.querySelector("#karteList");
  const karteEmptyState = document.querySelector("#karteEmptyState");
  const customerDetailPanel = document.querySelector("#customerDetailPanel");
  const customerDetailId = document.querySelector("#customerDetailId");
  const customerDetailName = document.querySelector("#customerDetailName");
  const customerMenuTabs = document.querySelector("#customerMenuTabs");
  const customerDetailContent = document.querySelector("#customerDetailContent");
  const backToCustomerListButton = document.querySelector("#backToCustomerListButton");

  let isDrawing = false;
  let hasSignature = false;
  let signedAt = "";
  let editingKarteId = "";
  let kartePhotos = [];
  let selectedCustomerId = "";
  let activeCustomerTab = "basic";

  initHomeNavigation();
  initAppPasswordGate();
  initKartePage();
  updateSalonBrand();

  createTreatmentChoices();
  createCheckbox("historyChecks", historyItems, "history");
  createCheckbox("riskChecks", riskItems, "risks");
  createCheckbox("aftercareChecks", aftercareItems, "aftercare");
  createCheckbox("finalConsentChecks", finalConsentItems, "finalConsents");

  function updateSignatureLock() {
    const unlocked =
      allRequiredChecksCompleted() &&
      getCheckedValues("treatmentParts").length > 0 &&
      isTreatmentOtherValid();
    canvas.classList.toggle("locked", !unlocked);
    submitButton.disabled = !unlocked || !hasSignature;
    signatureLock.textContent = unlocked
      ? "署名欄が有効です。枠内に署名してください。"
      : "アートメイク履歴、施術希望部位、同意チェックが完了すると署名欄が有効になります。";
  }

  function resetSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    signedAt = "";
    signatureStatus.textContent = "未署名";
    signedAtText.textContent = "署名日時：未記録";
    updateSignatureLock();
  }

  function getPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startDrawing(event) {
    if (!allRequiredChecksCompleted() || getCheckedValues("treatmentParts").length === 0 || !isTreatmentOtherValid()) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    isDrawing = true;
    const position = getPointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
  }

  function draw(event) {
    if (!isDrawing) return;
    event.preventDefault();
    const position = getPointerPosition(event);
    ctx.lineTo(position.x, position.y);
    ctx.strokeStyle = "#2f2927";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function finishDrawing(event) {
    if (!isDrawing) return;
    if (event?.pointerId != null) canvas.releasePointerCapture?.(event.pointerId);
    isDrawing = false;
    hasSignature = true;
    if (!signedAt) signedAt = new Date().toISOString();
    signatureStatus.textContent = "署名済み";
    signedAtText.textContent = `署名日時：${formatDateTime(signedAt)}`;
    updateSignatureLock();
  }

  function buildRecord() {
    const formData = new FormData(form);
    return {
      id: createId(),
      createdAt: new Date().toISOString(),
      customer: {
        name: formData.get("name"),
        kana: formData.get("kana"),
        birthDate: formData.get("birthDate"),
        treatmentDate: formData.get("treatmentDate"),
        phone: formData.get("phone"),
      },
      registrationSource: "store-device",
      salonId: window.firebaseConsentService?.salonId?.() || "local",
      treatmentParts: getCheckedValues("treatmentParts"),
      treatmentOther: formData.get("treatmentOther") || "",
      historyChecks: getCheckedValues("history"),
      riskChecks: getCheckedValues("risks"),
      aftercareChecks: getCheckedValues("aftercare"),
      finalConsents: getCheckedValues("finalConsents"),
      signedAt,
      signatureImage: canvas.toDataURL("image/png"),
    };
  }

  function clearCustomerForm() {
    form.reset();
    updateTreatmentOtherField();
    resetSignature();
    updateSignatureLock();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function isTreatmentOtherChecked() {
    return getCheckedValues("treatmentParts").includes("その他");
  }

  function isTreatmentOtherValid() {
    return !isTreatmentOtherChecked() || treatmentOtherInput.value.trim().length > 0;
  }

  function updateTreatmentOtherField() {
    const shouldShow = isTreatmentOtherChecked();
    otherTreatmentField.hidden = !shouldShow;
    treatmentOtherInput.required = shouldShow;
    if (!shouldShow) {
      treatmentOtherInput.value = "";
    }
    updateSignatureLock();
  }

  document.querySelector("#clearSignatureButton").addEventListener("click", resetSignature);
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", updateSignatureLock);
  });
  document.querySelectorAll("[data-artmake-history-option='true']").forEach((input) => {
    input.addEventListener("change", (event) => {
      if (event.target.checked) {
        document.querySelectorAll("[data-artmake-history-option='true']").forEach((option) => {
          if (option !== event.target) option.checked = false;
        });
      }
      updateSignatureLock();
    });
  });
  document.querySelectorAll('input[name="treatmentParts"]').forEach((input) => {
    input.addEventListener("change", updateTreatmentOtherField);
  });
  treatmentOtherInput.addEventListener("input", updateSignatureLock);

  canvas.addEventListener("pointerdown", startDrawing);
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", finishDrawing);
  canvas.addEventListener("pointerleave", finishDrawing);
  canvas.addEventListener("pointercancel", finishDrawing);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!allRequiredChecksCompleted()) {
      alert("アートメイク履歴と同意チェックを確認してください。");
      return;
    }

    if (getCheckedValues("treatmentParts").length === 0) {
      alert("施術希望部位を1つ以上選択してください。");
      return;
    }

    if (!isTreatmentOtherValid()) {
      alert("その他の施術部位を入力してください。");
      treatmentOtherInput.focus();
      return;
    }

    if (!hasSignature) {
      alert("電子署名を入力してください。");
      return;
    }

    try {
      await dataService.save(buildRecord());
      clearCustomerForm();
      switchView("thanksView");
    } catch (error) {
      alert(error.message || "保存に失敗しました。ログイン状態とFirebase設定を確認してください。");
    }
  });

  form.addEventListener("reset", () => {
    setTimeout(() => {
      updateTreatmentOtherField();
      resetSignature();
    }, 0);
  });

  nextCustomerButton.addEventListener("click", () => {
    clearCustomerForm();
    switchView("formView");
  });

  logoutButton.addEventListener("click", logoutApp);
  settingsLogoutButton.addEventListener("click", logoutApp);

  updateSignatureLock();
  updateTreatmentOtherField();

  function initKartePage() {
    setNextKarteId();
    renderKarteList();

    karteBirthDate.addEventListener("input", () => {
      karteAge.value = calculateAge(karteBirthDate.value);
    });

    kartePhotoInput.addEventListener("change", handleKartePhotoUpload);
    kartePhotoPart.addEventListener("change", renderKartePhotos);
    kartePhotoRound.addEventListener("change", handleKartePhotoRoundChange);
    kartePhotoTiming.addEventListener("change", renderKartePhotos);
    kartePhotoList.addEventListener("change", handleKartePhotoEdit);
    kartePhotoList.addEventListener("input", handleKartePhotoEdit);
    kartePhotoList.addEventListener("click", handleKartePhotoAction);
    photoPreviewClose.addEventListener("click", () => photoPreviewDialog.close());

    document.querySelectorAll('[data-open-view="karteView"]').forEach((button) => {
      button.addEventListener("click", resetKarteFormForCreate);
    });
    document.querySelectorAll('[data-open-view="customersView"]').forEach((button) => {
      button.addEventListener("click", showCustomerList);
    });
    karteSearchInput.addEventListener("input", renderKarteList);
    karteList.addEventListener("click", handleKarteListClick);
    customerDetailContent.addEventListener("click", handleKarteListClick);
    customerMenuTabs.addEventListener("click", handleCustomerTabClick);
    customerDetailContent.addEventListener("change", handleCustomerDetailChange);
    backToCustomerListButton.addEventListener("click", showCustomerList);
    renderKartePhotos();

    karteForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const record = buildKarteRecord();
      if (editingKarteId) {
        karteStorageService.update(editingKarteId, record);
      } else {
        karteStorageService.save(record);
      }
      karteForm.reset();
      karteAge.value = "";
      kartePhotos = [];
      renderKartePhotos();
      editingKarteId = "";
      karteSearchInput.value = "";
      setNextKarteId();
      renderKarteList();
      showCustomerList();
      switchView("customersView");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function buildKarteRecord() {
    const formData = new FormData(karteForm);
    const existingRecord = editingKarteId
      ? karteStorageService.getAll().find((record) => record.id === editingKarteId)
      : null;
    return {
      id: formData.get("customerId"),
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: formData.get("name"),
      kana: formData.get("kana"),
      birthDate: formData.get("birthDate"),
      age: calculateAge(formData.get("birthDate")),
      phone: formData.get("phone"),
      email: formData.get("email"),
      address: formData.get("address"),
      occupation: formData.get("occupation"),
      firstVisitDate: formData.get("firstVisitDate"),
      staff: formData.get("staff"),
      visitSource: formData.get("visitSource"),
      notes: formData.get("notes"),
      photos: kartePhotos,
    };
  }

  function setNextKarteId() {
    karteCustomerId.value = createKarteId();
  }

  function resetKarteFormForCreate() {
    editingKarteId = "";
    karteForm.reset();
    karteAge.value = "";
    kartePhotos = [];
    handleKartePhotoRoundChange();
    renderKartePhotos();
    setNextKarteId();
  }

  function handleKartePhotoUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const part = kartePhotoPart.value || "眉";
    const round = kartePhotoRound.value || "initial";
    const timing = kartePhotoTiming.value || "before";
    const monthsAfter = round === "initial" ? "" : kartePhotoMonths.value.trim();
    const currentCount = kartePhotos.filter(
      (photo) => (photo.part || "") === part && (photo.round || "initial") === round && (photo.timing || "before") === timing
    ).length;
    const availableCount = 5 - currentCount;

    if (availableCount <= 0) {
      alert(`${part}の${photoCategoryLabel({ round, timing })}は最大5枚までです。`);
      event.target.value = "";
      return;
    }

    const uploadFiles = files.slice(0, availableCount);
    if (files.length > availableCount) {
      alert(`${part}の${photoCategoryLabel({ round, timing })}は最大5枚までです。追加できる${availableCount}枚のみ保存します。`);
    }

    Promise.all(uploadFiles.map((file) => readImageFile(file, { part, round, timing, monthsAfter }))).then((photos) => {
      kartePhotos = [...kartePhotos, ...photos];
      renderKartePhotos();
      event.target.value = "";
    });
  }

  function renderKartePhotos() {
    if (!kartePhotoList || !kartePhotoEmptyState || !kartePhotoCount) return;
    kartePhotoList.innerHTML = "";
    kartePhotoEmptyState.style.display = kartePhotos.length ? "none" : "block";
    const selectedPart = kartePhotoPart.value || "眉";
    const selectedRound = kartePhotoRound.value || "initial";
    const selectedTiming = kartePhotoTiming.value || "before";
    const selectedCategoryCount = kartePhotos.filter(
      (photo) =>
        (photo.part || "") === selectedPart &&
        (photo.round || "initial") === selectedRound &&
        (photo.timing || "before") === selectedTiming
    ).length;
    kartePhotoCount.textContent = `保存写真：全${kartePhotos.length}枚 / ${selectedPart} ${photoCategoryLabel({
      round: selectedRound,
      timing: selectedTiming,
    })} ${selectedCategoryCount}/5枚`;

    photoRoundGroups().forEach((group) => {
      const groupPhotos = kartePhotos.filter((photo) => (photo.round || "initial") === group.round);
      const section = document.createElement("section");
      section.className = "karte-photo-round-section";
      section.innerHTML = `<h3>${group.label}</h3>`;

      ["before", "after"].forEach((timing) => {
        const categoryPhotos = groupPhotos.filter((photo) => (photo.timing || "before") === timing);
        const block = document.createElement("div");
        block.className = "karte-photo-category-block";
        block.innerHTML = `
          <div class="karte-photo-category-title">
            <strong>${group.categoryPrefix}${timing === "before" ? "施術前" : "施術後"}</strong>
            <span>${categoryPhotos.length}枚</span>
          </div>
        `;

        if (categoryPhotos.length) {
          const grid = document.createElement("div");
          grid.className = "karte-photo-category-grid";
          categoryPhotos.forEach((photo) => grid.appendChild(createKartePhotoCard(photo)));
          block.appendChild(grid);
        } else {
          const empty = document.createElement("p");
          empty.className = "empty-state visible-empty";
          empty.textContent = "写真はまだ追加されていません。";
          block.appendChild(empty);
        }

        section.appendChild(block);
      });

      kartePhotoList.appendChild(section);
    });
  }

  function createKartePhotoCard(photo) {
    const card = document.createElement("article");
    card.className = "karte-photo-card";
    card.dataset.photoId = photo.id;
    card.innerHTML = `
      <button class="karte-photo-preview-button" type="button" data-photo-action="preview" aria-label="写真を拡大表示">
        <img src="${photo.dataUrl}" alt="施術写真" />
      </button>
      <div class="karte-photo-body">
        <div class="karte-photo-meta">
          <span>${escapeHtml(photo.part || "")}</span>
          <time>${escapeHtml(formatDateTime(photo.createdAt))}</time>
        </div>
        <label>
          メモ
          <textarea data-photo-field="memo" rows="3" placeholder="写真メモを入力">${escapeHtml(photo.memo || "")}</textarea>
        </label>
        <button class="secondary-button danger" type="button" data-photo-action="delete">削除</button>
      </div>
    `;
    return card;
  }

  function handleKartePhotoEdit(event) {
    const field = event.target.dataset.photoField;
    if (!field) return;
    const card = event.target.closest(".karte-photo-card");
    const photoId = card?.dataset.photoId;
    if (!photoId) return;
    kartePhotos = kartePhotos.map((photo) => (photo.id === photoId ? { ...photo, [field]: event.target.value } : photo));
  }

  function handleKartePhotoAction(event) {
    const button = event.target.closest("[data-photo-action]");
    if (!button) return;
    const card = button.closest(".karte-photo-card");
    const photoId = card?.dataset.photoId;
    if (!photoId) return;
    const photo = kartePhotos.find((item) => item.id === photoId);

    if (button.dataset.photoAction === "preview" && photo) {
      openPhotoPreview(photo);
      return;
    }

    if (button.dataset.photoAction !== "delete") return;
    kartePhotos = kartePhotos.filter((photo) => photo.id !== photoId);
    renderKartePhotos();
  }

  function openPhotoPreview(photo) {
    photoPreviewImage.src = photo.dataUrl;
    photoPreviewTitle.textContent = `${photo.part || ""} / ${photoCategoryLabel(photo)}`;
    photoPreviewMeta.textContent = formatDateTime(photo.createdAt);
    photoPreviewDialog.showModal();
  }

  function normalizeKartePhotos(photos) {
    return photos.map((photo) => ({
      id: photo.id || createPhotoId(),
      name: photo.name || "",
      dataUrl: photo.dataUrl || "",
      createdAt: photo.createdAt || new Date().toISOString(),
      category: normalizePhotoCategory(photo.category),
      part: normalizePhotoPart(photo.part),
      round: normalizePhotoRound(photo.round, photo.category),
      timing: normalizePhotoTiming(photo.timing, photo.category),
      monthsAfter: photo.monthsAfter || "",
      memo: photo.memo || "",
    }));
  }

  function normalizePhotoCategory(category = "") {
    if (category === "初回施術前" || category === "初回施術後") return category;
    if (category === "2回目施術前" || category === "2回目施術後") return category;
    if (category === "3回目施術前" || category === "3回目施術後") return category;
    if (category === "施術直後" || category === "リタッチ後") return "初回施術後";
    return category === "施術前" || category === "デザイン後" || category === "リタッチ前" ? "初回施術前" : "初回施術前";
  }

  function normalizePhotoPart(part = "") {
    const parts = ["眉", "リップ", "アイライン", "ヘアライン", "SMP", "カモフラージュ", "除去"];
    return parts.includes(part) ? part : "眉";
  }

  function normalizePhotoRound(round = "", category = "") {
    if (round === "second" || String(category).startsWith("2回目")) return "second";
    if (round === "third" || String(category).startsWith("3回目")) return "third";
    return "initial";
  }

  function normalizePhotoTiming(timing = "", category = "") {
    if (timing === "after" || String(category).endsWith("施術後")) return "after";
    return "before";
  }

  function photoRoundGroups() {
    const secondMonths = getRoundMonths("second");
    const thirdMonths = getRoundMonths("third");
    return [
      { round: "initial", label: "初回", categoryPrefix: "初回" },
      { round: "second", label: `2回目${secondMonths ? `（${secondMonths}ヶ月後）` : ""}`, categoryPrefix: "2回目" },
      { round: "third", label: `3回目${thirdMonths ? `（${thirdMonths}ヶ月後）` : ""}`, categoryPrefix: "3回目" },
    ];
  }

  function getRoundMonths(round) {
    return kartePhotos.find((photo) => photo.round === round && photo.monthsAfter)?.monthsAfter || "";
  }

  function photoCategoryLabel(photo) {
    const round = photo.round || "initial";
    const timing = photo.timing || "before";
    if (round === "second") return `2回目${timing === "before" ? "施術前" : "施術後"}`;
    if (round === "third") return `3回目${timing === "before" ? "施術前" : "施術後"}`;
    return `初回${timing === "before" ? "施術前" : "施術後"}`;
  }

  function handleKartePhotoRoundChange() {
    kartePhotoMonths.disabled = kartePhotoRound.value === "initial";
    if (kartePhotoMonths.disabled) kartePhotoMonths.value = "";
    renderKartePhotos();
  }

  function renderKarteList() {
    const keyword = karteSearchInput.value.trim().toLowerCase();
    const records = karteStorageService.getAll().filter((record) => {
      const searchableText = [record.id, record.name, record.kana, record.phone].join(" ").toLowerCase();
      return !keyword || searchableText.includes(keyword);
    });
    karteList.innerHTML = "";
    karteEmptyState.style.display = records.length ? "none" : "block";

    records.forEach((record) => {
      const item = document.createElement("article");
      item.className = "karte-list-item";
      item.dataset.customerId = record.id;
      item.innerHTML = `
        <div>
          <p class="eyebrow">${escapeHtml(record.id)}</p>
          <h3>${escapeHtml(record.name || "お名前未入力")}</h3>
          <p>${escapeHtml(record.kana || "")}</p>
        </div>
        <dl>
          <div><dt>顧客ID</dt><dd>${escapeHtml(record.id || "")}</dd></div>
          <div><dt>お名前</dt><dd>${escapeHtml(record.name || "")}</dd></div>
          <div><dt>フリガナ</dt><dd>${escapeHtml(record.kana || "")}</dd></div>
          <div><dt>電話番号</dt><dd>${escapeHtml(record.phone || "")}</dd></div>
          <div><dt>初回来店日</dt><dd>${escapeHtml(record.firstVisitDate || "")}</dd></div>
          <div><dt>担当者</dt><dd>${escapeHtml(record.staff || "")}</dd></div>
        </dl>
        <div class="karte-card-actions">
          <button class="secondary-button" type="button" data-karte-action="detail" data-karte-id="${escapeHtml(record.id)}">詳細を見る</button>
          <button class="secondary-button" type="button" data-karte-action="edit" data-karte-id="${escapeHtml(record.id)}">編集</button>
          <button class="secondary-button danger" type="button" data-karte-action="delete" data-karte-id="${escapeHtml(record.id)}">削除</button>
        </div>
        <div class="karte-detail" hidden>
          <dl>
            <div><dt>生年月日</dt><dd>${escapeHtml(record.birthDate || "")}</dd></div>
            <div><dt>年齢</dt><dd>${escapeHtml(record.age || "")}</dd></div>
            <div><dt>メールアドレス</dt><dd>${escapeHtml(record.email || "")}</dd></div>
            <div><dt>住所</dt><dd>${escapeHtml(record.address || "")}</dd></div>
            <div><dt>職業</dt><dd>${escapeHtml(record.occupation || "")}</dd></div>
            <div><dt>来店きっかけ</dt><dd>${escapeHtml(record.visitSource || "")}</dd></div>
            <div><dt>備考</dt><dd>${escapeHtml(record.notes || "")}</dd></div>
          </dl>
        </div>
      `;
      karteList.appendChild(item);
    });
  }

  function handleKarteListClick(event) {
    const button = event.target.closest("[data-karte-action]");
    if (!button) {
      const item = event.target.closest(".karte-list-item");
      if (item?.dataset.customerId) openCustomerDetail(item.dataset.customerId, "basic");
      return;
    }

    const action = button.dataset.karteAction;
    const id = button.dataset.karteId;
    const record = karteStorageService.getAll().find((item) => item.id === id);
    if (!record) return;

    if (action === "detail") {
      openCustomerDetail(id, "basic");
      return;
    }

    if (action === "edit") {
      fillKarteForm(record);
      editingKarteId = id;
      switchView("karteView");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (action === "delete" && confirm("この顧客情報を削除しますか？")) {
      karteStorageService.remove(id);
      renderKarteList();
      setNextKarteId();
    }
  }

  function fillKarteForm(record) {
    karteForm.elements.customerId.value = record.id || "";
    karteForm.elements.name.value = record.name || "";
    karteForm.elements.kana.value = record.kana || "";
    karteForm.elements.birthDate.value = record.birthDate || "";
    karteAge.value = calculateAge(record.birthDate);
    karteForm.elements.phone.value = record.phone || "";
    karteForm.elements.email.value = record.email || "";
    karteForm.elements.address.value = record.address || "";
    karteForm.elements.occupation.value = record.occupation || "";
    karteForm.elements.firstVisitDate.value = record.firstVisitDate || "";
    karteForm.elements.staff.value = record.staff || "";
    karteForm.elements.visitSource.value = record.visitSource || "";
    karteForm.elements.notes.value = record.notes || "";
    kartePhotos = normalizeKartePhotos(record.photos || []);
    renderKartePhotos();
  }

  function openCustomerDetail(id, tab = "basic") {
    selectedCustomerId = id;
    activeCustomerTab = tab;
    const record = getSelectedCustomer();
    if (!record) return;

    customerDetailId.textContent = record.id || "Customer";
    customerDetailName.textContent = record.name || "顧客詳細";
    document.querySelector(".customers-panel").hidden = true;
    customerDetailPanel.hidden = false;
    renderCustomerDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showCustomerList() {
    selectedCustomerId = "";
    customerDetailPanel.hidden = true;
    document.querySelector(".customers-panel").hidden = false;
    renderKarteList();
  }

  function getSelectedCustomer() {
    return karteStorageService.getAll().find((record) => record.id === selectedCustomerId);
  }

  function handleCustomerTabClick(event) {
    const button = event.target.closest("[data-customer-tab]");
    if (!button) return;
    activeCustomerTab = button.dataset.customerTab;
    renderCustomerDetail();
  }

  function renderCustomerDetail() {
    const record = getSelectedCustomer();
    if (!record) return;

    customerMenuTabs.querySelectorAll("[data-customer-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.customerTab === activeCustomerTab);
    });

    if (activeCustomerTab === "basic") customerDetailContent.innerHTML = renderBasicInfo(record);
    if (activeCustomerTab === "consent") customerDetailContent.innerHTML = renderCustomerConsents(record);
    if (activeCustomerTab === "karte") customerDetailContent.innerHTML = renderCustomerKarte(record);
    if (activeCustomerTab === "photos") customerDetailContent.innerHTML = renderCustomerPhotos(record);
  }

  function renderBasicInfo(record) {
    return detailGridHtml([
      ["顧客ID", record.id],
      ["お名前", record.name],
      ["フリガナ", record.kana],
      ["電話番号", record.phone],
      ["メールアドレス", record.email],
      ["住所", record.address],
      ["生年月日", record.birthDate],
      ["年齢", record.age],
      ["職業", record.occupation],
      ["初回来店日", record.firstVisitDate],
      ["担当者", record.staff],
      ["来店きっかけ", record.visitSource],
      ["備考", record.notes],
    ]);
  }

  function renderCustomerKarte(record) {
    return `
      ${detailGridHtml([
        ["顧客ID", record.id],
        ["お名前", record.name],
        ["フリガナ", record.kana],
        ["生年月日", record.birthDate],
        ["年齢", record.age],
        ["電話番号", record.phone],
        ["メールアドレス", record.email],
        ["住所", record.address],
        ["職業", record.occupation],
        ["初回来店日", record.firstVisitDate],
        ["担当者", record.staff],
        ["来店きっかけ", record.visitSource],
        ["備考", record.notes],
      ])}
      <button class="secondary-button" type="button" data-karte-action="edit" data-karte-id="${escapeHtml(record.id)}">電子カルテを編集</button>
    `;
  }

  function renderCustomerConsents(record) {
    const consents = getRelatedConsents(record);
    if (!consents.length) return `<p class="empty-state visible-empty">関連する電子同意書はまだありません。</p>`;
    return `
      <div class="customer-stack">
        ${consents
          .map(
            (consent) => `
              <article class="customer-sub-card">
                <p class="eyebrow">${escapeHtml(formatDateTime(consent.createdAt))}</p>
                <h3>${escapeHtml(consent.customer?.name || "")}</h3>
                <p>${escapeHtml((consent.treatmentParts || []).join("、"))}</p>
                <dl>
                  <div><dt>施術日</dt><dd>${escapeHtml(consent.customer?.treatmentDate || "")}</dd></div>
                  <div><dt>署名日時</dt><dd>${escapeHtml(formatDateTime(consent.signedAt))}</dd></div>
                </dl>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderCustomerPhotos(record) {
    const photos = record.photos || [];
    return `
      <label class="photo-upload-box">
        施術写真を追加
        <input type="file" id="customerPhotoInput" accept="image/*" multiple />
      </label>
      ${
        photos.length
          ? `<div class="photo-grid">${photos
              .map(
                (photo, index) => `
                  <figure class="photo-card">
                    <img src="${photo.dataUrl}" alt="施術写真 ${index + 1}" />
                    <figcaption>${escapeHtml(formatDateTime(photo.createdAt))}</figcaption>
                  </figure>
                `
              )
              .join("")}</div>`
          : `<p class="empty-state visible-empty">保存された施術写真はまだありません。</p>`
      }
    `;
  }

  function detailGridHtml(items) {
    return `
      <dl class="customer-detail-grid">
        ${items
          .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "")}</dd></div>`)
          .join("")}
      </dl>
    `;
  }

  function getRelatedConsents(record) {
    const phone = normalizePhone(record.phone || "");
    const name = String(record.name || "").trim();
    return storageService
      .getAll()
      .filter((consent) => {
        const consentPhone = normalizePhone(consent.customer?.phone || "");
        const consentName = String(consent.customer?.name || "").trim();
        return (phone && consentPhone === phone) || (name && consentName === name);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function handleCustomerDetailChange(event) {
    if (event.target.id !== "customerPhotoInput") return;
    const files = Array.from(event.target.files || []);
    if (!files.length || !selectedCustomerId) return;
    Promise.all(files.map(readImageFile)).then((photos) => {
      const record = getSelectedCustomer();
      if (!record) return;
      const updatedRecord = {
        ...record,
        photos: [...(record.photos || []), ...photos],
        updatedAt: new Date().toISOString(),
      };
      karteStorageService.update(record.id, updatedRecord);
      renderCustomerDetail();
    });
  }

  function readImageFile(file, metadata = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          id: createPhotoId(),
          name: file.name,
          dataUrl: reader.result,
          createdAt: new Date().toISOString(),
          category: photoCategoryLabel(metadata),
          part: metadata.part || "眉",
          round: metadata.round || "initial",
          timing: metadata.timing || "before",
          monthsAfter: metadata.monthsAfter || "",
          memo: metadata.memo || "",
        });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function createPhotoId() {
    return `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function initAppPasswordGate() {
    salonRegisterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      registerMessage.textContent = "";

      if (registerPassword.value !== registerPasswordConfirm.value) {
        registerMessage.textContent = "パスワードが一致しません。";
        registerPasswordConfirm.focus();
        return;
      }

      const account = {
        salonName: registerSalonName.value.trim() || DEFAULT_SALON_NAME,
        email: registerEmail.value.trim().toLowerCase(),
        password: registerPassword.value,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(SALON_ACCOUNT_KEY, JSON.stringify(account));
      localStorage.setItem(SALON_SESSION_KEY, "true");
      clearAuthForms();
      updateSalonBrand();
      showAppAfterLogin();
    });

    appLoginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      appLoginMessage.textContent = "";

      const account = getSalonAccount();
      if (!account) {
        appLoginMessage.textContent = "先にサロン登録を行ってください。";
        showRegisterScreen();
        return;
      }

      if (appEmail.value.trim().toLowerCase() === account.email && appPassword.value === account.password) {
        localStorage.setItem(SALON_SESSION_KEY, "true");
        clearAuthForms();
        showAppAfterLogin();
        return;
      }
      appLoginMessage.textContent = "メールアドレスまたはパスワードが違います。";
      appPassword.value = "";
      appPassword.focus();
    });

    passwordResetForm.addEventListener("submit", (event) => {
      event.preventDefault();
      resetMessage.textContent = "";

      const account = getSalonAccount();
      if (!account || resetEmail.value.trim().toLowerCase() !== account.email) {
        resetMessage.textContent = "登録済みのメールアドレスを入力してください。";
        resetEmail.focus();
        return;
      }

      if (resetPassword.value !== resetPasswordConfirm.value) {
        resetMessage.textContent = "パスワードが一致しません。";
        resetPasswordConfirm.focus();
        return;
      }

      const updatedAccount = {
        ...account,
        password: resetPassword.value,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(SALON_ACCOUNT_KEY, JSON.stringify(updatedAccount));
      passwordResetForm.reset();
      showLoginScreen();
      appLoginMessage.textContent = "パスワードを再設定しました。新しいパスワードでログインしてください。";
    });

    showLoginButton.addEventListener("click", showLoginScreen);
    showRegisterButton.addEventListener("click", showRegisterScreen);
    forgotPasswordButton.addEventListener("click", showPasswordResetScreen);
    backToLoginButton.addEventListener("click", showLoginScreen);

    const unlocked = localStorage.getItem(SALON_SESSION_KEY) === "true" && getSalonAccount();
    if (unlocked) {
      showAppAfterLogin();
      return;
    }

    logoutButton.hidden = true;
    if (getSalonAccount()) {
      showLoginScreen();
    } else {
      showRegisterScreen();
    }
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  }

  function showAppAfterLogin() {
    document.body.classList.remove("auth-screen");
    updateSalonBrand();
    salonRegisterView.hidden = true;
    appLoginView.hidden = true;
    passwordResetView.hidden = true;
    logoutButton.hidden = false;
    switchView("homeView");
  }

  async function logoutApp() {
    localStorage.removeItem(SALON_SESSION_KEY);
    if (window.firebaseConsentService?.isEnabled()) {
      await window.firebaseConsentService.signOut();
    }
    clearCustomerForm();
    document.body.classList.add("auth-screen");
    salonRegisterView.hidden = true;
    passwordResetView.hidden = true;
    appLoginView.hidden = false;
    logoutButton.hidden = true;
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
    appEmail.focus();
  }

  function showRegisterScreen() {
    document.body.classList.add("auth-screen");
    salonRegisterView.hidden = false;
    appLoginView.hidden = true;
    passwordResetView.hidden = true;
    registerMessage.textContent = "";
    registerSalonName.focus();
  }

  function showLoginScreen() {
    document.body.classList.add("auth-screen");
    salonRegisterView.hidden = true;
    appLoginView.hidden = false;
    passwordResetView.hidden = true;
    appLoginMessage.textContent = "";
    appEmail.focus();
  }

  function showPasswordResetScreen() {
    document.body.classList.add("auth-screen");
    salonRegisterView.hidden = true;
    appLoginView.hidden = true;
    passwordResetView.hidden = false;
    resetMessage.textContent = "";
    resetEmail.focus();
  }

  function clearAuthForms() {
    salonRegisterForm.reset();
    appLoginForm.reset();
    passwordResetForm.reset();
  }

  function getSalonAccount() {
    try {
      return JSON.parse(localStorage.getItem(SALON_ACCOUNT_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function updateSalonBrand() {
    const salonName = normalizeSalonName(getSalonAccount()?.salonName);
    headerSalonName.textContent = salonName;
    homeFooterSalonName.textContent = salonName;
  }

  function normalizeSalonName(name) {
    const salonName = (name || "").trim();
    if (!salonName || LEGACY_SALON_NAMES.includes(salonName)) return DEFAULT_SALON_NAME;
    return salonName;
  }
}

function initHomeNavigation() {
  document.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => {
      switchView(button.dataset.openView);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function createCheckbox(containerId, items, name) {
  const container = document.querySelector(`#${containerId}`);
  const template = document.querySelector("#checkboxTemplate");

  items.forEach((text, index) => {
    const item = template.content.cloneNode(true);
    const input = item.querySelector("input");
    const labelText = item.querySelector("span");
    input.name = name;
    input.value = text;
    input.id = `${name}-${index}`;
    if (name === "history" && artmakeHistoryOptions.includes(text)) {
      input.dataset.artmakeHistoryOption = "true";
    } else if (signatureRequiredCheckNames.has(name)) {
      input.dataset.requiredCheck = "true";
    }
    labelText.textContent = text;
    container.appendChild(item);
  });
}

function createTreatmentChoices() {
  const container = document.querySelector("#treatmentChoices");

  treatmentParts.forEach((part) => {
    const label = document.createElement("label");
    label.className = "choice-item";
    label.innerHTML = `
      <input type="checkbox" name="treatmentParts" value="${part}">
      <span>${part}</span>
    `;
    container.appendChild(label);
  });
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

function allRequiredChecksCompleted() {
  const checks = Array.from(document.querySelectorAll("[data-required-check='true']"));
  const artmakeHistoryChecks = Array.from(document.querySelectorAll("[data-artmake-history-option='true']"));
  const artmakeHistoryCompleted = artmakeHistoryChecks.length === 0 || artmakeHistoryChecks.some((input) => input.checked);
  return checks.length > 0 && checks.every((input) => input.checked) && artmakeHistoryCompleted;
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active-view", view.id === viewId);
  });
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

function formatTimelineDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function calculateAge(birthDate) {
  if (!birthDate) return "";
  const today = new Date();
  const birthday = new Date(birthDate);
  if (Number.isNaN(birthday.getTime())) return "";
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
    age -= 1;
  }
  return `${age}歳`;
}

function createKarteId() {
  const records = karteStorageService.getAll();
  const maxNumber = records.reduce((max, record) => {
    const match = String(record.id || "").match(/C-(\d+)/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `C-${String(maxNumber + 1).padStart(6, "0")}`;
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `consent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
