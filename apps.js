/* =========================================================
   APLIKASI MANAJEMEN STOK & TRACKING DO
========================================================= */

const {
  createApp,
  ref,
  reactive,
  computed,
  watch,
  onMounted,
} = Vue;

createApp({
  setup() {

    // ===========================
    // LOGIN STATE
    // ===========================
    const loggedIn = ref(localStorage.getItem("loggedIn") === "true");
    const loginError = ref(false);

    const loginForm = reactive({
      username: "",
      password: ""
    });

    function submitLogin() {
      if (loginForm.username === "admin" && loginForm.password === "admin") {
        loggedIn.value = true;
        localStorage.setItem("loggedIn", "true");
        loginError.value = false;
      } else {
        loginError.value = true;
      }
    }

    function clearLogin() {
      loginForm.username = "";
      loginForm.password = "";
    }

    function logout() {
      loggedIn.value = false;
      localStorage.removeItem("loggedIn");
      clearLogin();
    }

    // Keyboard ESC pada login
    window.addEventListener("keyup", (e) => {
      if (!loggedIn.value && e.key === "Escape") {
        clearLogin();
      }
    });

    // Watcher (indikator capaian wajib)
    watch(() => loginForm.username, (val) => {
      console.log("Watcher aktif — Username berubah menjadi:", val);
    });


    // ===========================
    // TAB SIDE
    // ===========================
    const tab = ref("stok");


    // ===========================
    // DATA STOK
    // ===========================
    const stockData = ref([]);
    const upbjjList = ref(["Jakarta", "Bogor", "Bandung", "Semarang", "Surabaya"]);
    const kategoriOptions = ref(["MK Wajib", "MK Pilihan", "Umum"]);

    const filters = reactive({
      upbjj: "",
      kategori: "",
      special: ""
    });

    function resetStockFilters() {
      filters.upbjj = "";
      filters.kategori = "";
      filters.special = "";
    }

    const displayedStocks = computed(() => {
      return stockData.value.filter(s => {
        const matchUpbjj = !filters.upbjj || s.upbjj === filters.upbjj;
        const matchKategori = !filters.kategori || s.kategori === filters.kategori;
        const matchSpecial =
          !filters.special ||
          (filters.special === "belowSafety" && s.qty < s.safety) ||
          (filters.special === "zero" && s.qty <= 0);

        return matchUpbjj && matchKategori && matchSpecial;
      });
    });

    function statusText(s) {
      if (s.qty <= 0) return "Habis";
      if (s.qty < s.safety) return "Hampir Habis";
      return "Aman";
    }


    // ===========================
    // FORM STOK
    // ===========================
    const stockForm = reactive({
      visible: false,
      index: null,
      data: {}
    });

    function openCreateStock() {
      stockForm.visible = true;
      stockForm.index = null;
      stockForm.data = {
        kode: "",
        judul: "",
        upbjj: "",
        kategori: "",
        qty: 0,
        safety: 0,
        catatanHTML: ""
      };
    }

    function openEditStock(i) {
      stockForm.visible = true;
      stockForm.index = i;
      stockForm.data = { ...stockData.value[i] };
    }

    function closeStockForm() {
      stockForm.visible = false;
    }

    function saveStock() {
      if (stockForm.index === null) {
        stockData.value.push(stockForm.data);
      } else {
        stockData.value[stockForm.index] = stockForm.data;
      }
      stockForm.visible = false;
    }

    const deleteStockConfirm = reactive({
      visible: false,
      index: null
    });

    function confirmDeleteStock(i) {
      deleteStockConfirm.visible = true;
      deleteStockConfirm.index = i;
    }

    function deleteStockConfirmed() {
      if (deleteStockConfirm.index == null) return;
      stockData.value.splice(deleteStockConfirm.index, 1);
      deleteStockConfirm.visible = false;
      deleteStockConfirm.index = null;
    }


    // ===========================
    // TOOLTIP CATATAN
    // ===========================
    const tooltip = reactive({ visible: false, index: null, x: 0, y: 0 });

    function showNote(i, e) {
      tooltip.visible = true;
      tooltip.index = i;
      tooltip.x = e.pageX + 15;
      tooltip.y = e.pageY + 15;
    }

    function hideNote() {
      tooltip.visible = false;
    }


    // ===========================
    // DATA DO
    // ===========================
    const doList = ref([]);
    const doSearch = ref("");
    const ekspedisiOptions = ref(["JNE", "JNT", "SiCepat", "Pos Indonesia", "AnterAja"]);

    const filteredDOs = computed(() => {
      const key = doSearch.value.toLowerCase();
      return doList.value.filter(d =>
        d.nim.toLowerCase().includes(key) ||
        d.nama.toLowerCase().includes(key) ||
        d.nomor.toLowerCase().includes(key)
      );
    });


    // ===========================
    // DO FORM
    // ===========================
    const doForm = reactive({
      visible: false,
      data: {}
    });

    function createDONumber() {
      return "DO-" + Date.now();
    }

    function openCreateDO() {
      doForm.visible = true;
      doForm.data = {
        nomor: createDONumber(),
        nim: "",
        nama: "",
        ekspedisi: "",
        tanggalKirimRaw: "",
        progress: []
      };
    }

    function closeDOForm() {
      doForm.visible = false;
    }

    function saveDO() {
      const formatted = {
        ...doForm.data,
        tanggalKirim: new Date(doForm.data.tanggalKirimRaw).toISOString()
      };
      doList.value.push(formatted);
      doForm.visible = false;
    }


    // ===========================
    // DO DETAIL
    // ===========================
    const doDetail = reactive({
      visible: false,
      index: null
    });

    function openDODetail(i) {
      doDetail.visible = true;
      doDetail.index = i;
    }

    function addProgressForm() {
      if (!doDetail.index && doDetail.index !== 0) return;
      const item = doList.value[doDetail.index];
      if (!item.newProgress || item.newProgress.trim() === "") return;

      item.progress.push({
        time: new Date().toISOString(),
        keterangan: item.newProgress
      });

      item.newProgress = "";
    }

    function formatDate(d) {
      return new Date(d).toLocaleDateString("id-ID");
    }

    function formatDateTime(d) {
      return new Date(d).toLocaleString("id-ID");
    }

    function deleteDO(i) {
      doList.value.splice(i, 1);
    }


    // ===========================
    // RETURN STATE VUE
    // ===========================
    return {
      // LOGIN
      loggedIn, loginError, loginForm, submitLogin, clearLogin, logout,

      // TAB
      tab,

      // STOK
      stockData, displayedStocks, filters, kategoriOptions, upbjjList,
      resetStockFilters, openCreateStock, openEditStock, closeStockForm,
      saveStock, statusText, confirmDeleteStock, deleteStockConfirm, deleteStockConfirmed,

      // TOOLTIP
      tooltip, showNote, hideNote,

      // DO
      doList, doForm, openCreateDO, closeDOForm, saveDO,
      doSearch, filteredDOs, ekspedisiOptions,
      deleteDO, doDetail, openDODetail, addProgressForm,
      formatDate, formatDateTime,
    };
  }
}).mount("#app");
