/* apps.js */
const {
  createApp,
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
} = Vue;

createApp({
  setup() {
    const tab = ref("stok");
    const doDetail = reactive({ visible: false, index: null });

    // Main Data
    const stockData = ref([]);
    const doList = ref([]);
    const upbjjList = ref([]);
    const ekspedisiOptions = ref([]);

    // TOOLTIP state (untuk showNote/hideNote)
    const tooltip = reactive({ visible: false, index: null, x: 0, y: 0 });

    // Load JSON
    fetch("./dataBahanAjar.json")
      .then((r) => r.json())
      .then((j) => {
        stockData.value = j.stocks || [];
        doList.value = (j.do || []).map((d) => ({
          ...d,
          progress: (d.progress || []).map((p) => ({
            ...p,
            time: new Date(p.time),
          })),
          newProgress: "",
        }));
        upbjjList.value = [...new Set(stockData.value.map((s) => s.upbjj))];
        ekspedisiOptions.value = j.pengirimanList?.map((a) => a.nama) || [
          "JNE",
          "J&T",
          "Pos Indonesia",
          "SiCepat",
        ];
      })
      .catch((err) => console.error("Gagal load JSON:", err));

    // Status formatter (dipanggil dari template: statusText(r) )
    function statusText(row) {
      if (!row) return "-";
      if (row.qty === 0) return "Kosong";
      if (row.qty < row.safety) return "Hampir Habis";
      return "Aman";
    }

    // FILTER
    const filters = reactive({ upbjj: "", kategori: "", special: "" });
    const sortBy = ref("");

    const kategoriOptions = computed(() => {
      return [...new Set(stockData.value.map((s) => s.kategori))];
    });

    const displayedStocks = computed(() => {
      let arr = stockData.value.slice();
      if (filters.upbjj) arr = arr.filter((r) => r.upbjj === filters.upbjj);
      if (filters.kategori)
        arr = arr.filter((r) => r.kategori === filters.kategori);
      if (filters.special === "belowSafety")
        arr = arr.filter((r) => r.qty < r.safety);
      if (filters.special === "zero") arr = arr.filter((r) => r.qty === 0);

      if (sortBy.value === "judul")
        arr.sort((a, b) => a.judul.localeCompare(b.judul));
      if (sortBy.value === "qty_desc") arr.sort((a, b) => b.qty - a.qty);
      if (sortBy.value === "harga_asc") arr.sort((a, b) => a.harga - b.harga);

      return arr;
    });

    function openDODetail(i) {
      // pastikan indeks valid
      if (typeof i !== "number" || i < 0 || i >= doList.value.length) return;
      doDetail.visible = true;
      doDetail.index = i;
    }

    // ========= FORM STOK =========
    const stockForm = reactive({ visible: false, editIndex: null, data: {} });
    const deleteConfirm = reactive({ visible: false, index: null });

    function openCreateStock() {
      stockForm.visible = true;
      stockForm.editIndex = null;
      stockForm.data = {
        kode: "",
        judul: "",
        kategori: "",
        upbjj: "",
        lokasiRak: "",
        harga: 0,
        qty: 0,
        safety: 0,
        catatanHTML: "",
      };
    }

    function openEditStock(idx) {
      const item = displayedStocks.value[idx];
      if (!item) return alert("Item tidak ditemukan (index invalid).");
      const globalIdx = stockData.value.findIndex((s) => s.kode === item.kode);
      if (globalIdx === -1) return alert("Data asli tidak ditemukan.");
      stockForm.editIndex = globalIdx;
      stockForm.data = { ...stockData.value[globalIdx] };
      stockForm.visible = true;
    }

    function closeStockForm() {
      stockForm.visible = false;
    }

    function saveStock() {
      const d = stockForm.data;
      if (!d.kode || !d.judul || !d.upbjj)
        return alert("Isi Kode, Judul, dan UT-Daerah");
      if (stockForm.editIndex === null) stockData.value.push({ ...d });
      else stockData.value[stockForm.editIndex] = { ...d };
      stockForm.visible = false;
    }

    function confirmDeleteStock(idx) {
      deleteConfirm.visible = true;
      deleteConfirm.index = idx;
    }

    function deleteStockConfirmed() {
      const item = displayedStocks.value[deleteConfirm.index];
      if (!item) {
        deleteConfirm.visible = false;
        return;
      }
      const globalIdx = stockData.value.findIndex((s) => s.kode === item.kode);
      if (globalIdx !== -1) stockData.value.splice(globalIdx, 1);
      deleteConfirm.visible = false;
    }

    // reset filters (dipanggil dari HTML)
    function resetStockFilters() {
      filters.upbjj = "";
      filters.kategori = "";
      filters.special = "";
      sortBy.value = "";
    }

    // tooltip handlers (dipanggil dari HTML)
    function showNote(idx, event) {
      tooltip.index = idx;
      tooltip.visible = true;
      // offset agar tooltip tidak menutupi mouse
      tooltip.x = (event?.clientX ?? 0) + 12;
      tooltip.y = (event?.clientY ?? 0) + 12;
    }
    function hideNote() {
      tooltip.visible = false;
      tooltip.index = null;
    }

    // ========= TRACKING DO =========
    const doForm = reactive({ visible: false, data: {} });
    const doSearch = ref("");
    const deleteDOConfirm = reactive({ visible: false, index: null });

    function genNextDONumber() {
      const year = new Date().getFullYear();
      const seq =
        doList.value.filter((d) => String(d.nomor).includes("DO" + year))
          .length + 1;
      return `DO${year}-${String(seq).padStart(3, "0")}`;
    }

    function openCreateDO() {
      doForm.visible = true;
      doForm.data = {
        nomor: genNextDONumber(),
        nim: "",
        nama: "",
        ekspedisi: "",
        tanggalKirimRaw: "",
        totalHarga: 0,
        progress: [],
        newProgress: "",
      };
    }

    function closeDOForm() {
      doForm.visible = false;
    }

    function saveDO() {
      const d = doForm.data;
      if (!d.nim || !d.nama || !d.ekspedisi)
        return alert("Lengkapi semua field");
      d.tanggalKirim = d.tanggalKirimRaw
        ? new Date(d.tanggalKirimRaw)
        : new Date();
      // pastikan ada progress array
      d.progress = d.progress || [];
      d.newProgress = d.newProgress ?? "";
      doList.value.push({ ...d });
      doForm.visible = false;
    }

    const filteredDOs = computed(() => {
      const q = doSearch.value.toLowerCase();
      if (!q) return doList.value;
      return doList.value.filter(
        (d) =>
          (d.nomor || "").toLowerCase().includes(q) ||
          (d.nim || "").toLowerCase().includes(q)
      );
    });

    // addProgressForm sekarang fleksibel:
    // - jika dipanggil dengan index (number) -> tambahkan ke doList[index]
    // - jika dipanggil tanpa arg -> tambahkan ke doForm.data (form tambah DO)
    function addProgressForm(i) {
      if (typeof i === "number") {
        const d = doList.value[i];
        if (!d) return alert("DO tidak ditemukan.");
        if (!d.newProgress) return;
        d.progress = d.progress || [];
        d.progress.push({ time: new Date(), keterangan: d.newProgress });
        d.newProgress = "";
        return;
      }

      if (doForm.visible && doForm.data) {
        const d = doForm.data;
        if (!d.newProgress) return;
        d.progress = d.progress || [];
        d.progress.push({ time: new Date(), keterangan: d.newProgress });
        d.newProgress = "";
      }
    }

    function confirmDeleteDO(i) {
      deleteDOConfirm.visible = true;
      deleteDOConfirm.index = i;
    }

    function deleteDOConfirmed() {
      if (deleteDOConfirm.index == null) return;
      doList.value.splice(deleteDOConfirm.index, 1);
      deleteDOConfirm.visible = false;
      deleteDOConfirm.index = null;
    }

    // KEYBOARD HANDLER
    function handleKey(e) {
      if (e.key === "Enter") {
        if (stockForm.visible) saveStock();
        if (doForm.visible) saveDO();
      }
      if (e.key === "Escape") {
        if (stockForm.visible) closeStockForm();
        if (doForm.visible) closeDOForm();
        if (deleteConfirm.visible) deleteConfirm.visible = false;
        if (deleteDOConfirm.visible) deleteDOConfirm.visible = false;
      }
    }

    onMounted(() => {
      window.addEventListener("keydown", handleKey);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("keydown", handleKey);
    });

    return {
      tab,
      stockData,
      upbjjList,
      ekspedisiOptions,
      filters,
      kategoriOptions,
      displayedStocks,
      stockForm,
      deleteConfirm,
      doDetail,
      doList,
      doForm,
      doSearch,
      filteredDOs,
      tooltip,
      formatCurrency: (v) => "Rp " + Number(v).toLocaleString("id-ID"),
      formatDate: (d) => (d ? new Date(d).toLocaleDateString("id-ID") : "-"),
      formatDateTime: (d) => (d ? new Date(d).toLocaleString("id-ID") : "-"),
      openCreateStock,
      openEditStock,
      closeStockForm,
      saveStock,
      confirmDeleteStock,
      deleteStockConfirmed,
      openCreateDO,
      closeDOForm,
      saveDO,
      addProgressForm,
      confirmDeleteDO,
      deleteDOConfirmed,
      statusText,
      resetStockFilters,
      showNote,
      hideNote,
    };
  },
}).mount("#app");

// LOGOUT
function logout() {
  localStorage.removeItem("userLogin");
  window.location.href = "index.html";
}

// Setelah Login
document.addEventListener("DOMContentLoaded", () => {
  const userData = JSON.parse(localStorage.getItem("userLogin"));
  const welcomeText = document.getElementById("welcomeUser");
  if (userData && welcomeText) welcomeText.textContent = `Hi, ${userData.nama}`;
  else window.location.href = "login.html";
});
