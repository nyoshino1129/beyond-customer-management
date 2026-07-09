(function () {
  const localStorageService = {
    key: "artmakeConsentRecords",
    getAll() {
      return JSON.parse(localStorage.getItem(this.key) || "[]");
    },
    save(record) {
      const records = this.getAll();
      records.unshift(record);
      localStorage.setItem(this.key, JSON.stringify(records));
    },
    remove(id) {
      const records = this.getAll().filter((record) => record.id !== id);
      localStorage.setItem(this.key, JSON.stringify(records));
    },
  };

  const state = {
    enabled: false,
    app: null,
    auth: null,
    db: null,
    salonId: "default-salon",
  };

  function init() {
    const config = window.firebaseConsentConfig;
    const canUseFirebase =
      config &&
      config.enabled &&
      window.firebase &&
      config.firebase &&
      config.firebase.apiKey &&
      !config.firebase.apiKey.startsWith("YOUR_");

    if (!canUseFirebase) {
      state.enabled = false;
      return false;
    }

    if (!state.app) {
      state.app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(config.firebase);
      state.auth = window.firebase.auth();
      state.db = window.firebase.firestore();
      state.salonId = config.salonId || "default-salon";
      state.enabled = true;
    }

    return true;
  }

  function isEnabled() {
    return init();
  }

  function currentUser() {
    return state.auth ? state.auth.currentUser : null;
  }

  function onAuthStateChanged(callback) {
    if (!isEnabled()) {
      callback(null);
      return function () {};
    }
    return state.auth.onAuthStateChanged(callback);
  }

  async function signIn(email, password) {
    if (!isEnabled()) return null;
    const result = await state.auth.signInWithEmailAndPassword(email, password);
    return result.user;
  }

  async function signOut() {
    if (!isEnabled()) return;
    await state.auth.signOut();
  }

  function consentCollection() {
    return state.db.collection("salons").doc(state.salonId).collection("consents");
  }

  async function saveConsent(record) {
    if (!isEnabled()) {
      localStorageService.save(record);
      return record.id;
    }

    if (!currentUser()) {
      throw new Error("Firebaseログインが必要です。");
    }

    const payload = {
      ...record,
      salonId: state.salonId,
      savedBy: currentUser().uid,
      updatedAt: new Date().toISOString(),
    };

    await consentCollection().doc(record.id).set(payload);
    return record.id;
  }

  async function getConsents() {
    if (!isEnabled()) return localStorageService.getAll();
    if (!currentUser()) return [];

    const snapshot = await consentCollection().orderBy("createdAt", "desc").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async function deleteConsent(id) {
    if (!isEnabled()) {
      localStorageService.remove(id);
      return;
    }

    if (!currentUser()) {
      throw new Error("Firebaseログインが必要です。");
    }

    await consentCollection().doc(id).delete();
  }

  window.firebaseConsentService = {
    init,
    isEnabled,
    currentUser,
    onAuthStateChanged,
    signIn,
    signOut,
    saveConsent,
    getConsents,
    deleteConsent,
    salonId() {
      init();
      return state.salonId;
    },
  };
})();
