/* apps.js */
const { createApp, ref, reactive, computed } = Vue;

createApp({
  setup() {
    const tab = ref("stok");
    const doDetail = reactive({ visible: false, index: null });

    // Main Data
    const stockData = ref([]);
    const doList = ref([]);
    const upbjjList = ref([]);
    const ekspedisiOptions = ref([]);

    // Load JSON
    fetch("./dataBahanAjar.json")
      .then((r) => r.json())
      .then((j) => {
        stockData.value = j.stocks || [];
        doList.value = j.do || [];
        upbjjList.value = [...new Set(stockData.value.map((s) => s.upbjj))];
        ekspedisiOptions.value = j.pengirimanList?.map((a) => a.nama) || [];
      })
      .catch((err) => console.error("Gagal load JSON:", err));

    // FILTERING
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
      doDetail.visible = true;
      doDetail.index = i;
    }

    function resetStockFilters() {
      filters.upbjj = "";
      filters.kategori = "";
      filters.special = "";
      sortBy.value = "";
    }

    // TOOLTIP
    const tooltip = reactive({ visible: false, index: null, x: 0, y: 0 });
    function showNote(idx, e) {
      tooltip.visible = true;
      tooltip.index = idx;
      tooltip.x = e.clientX + 10;
      tooltip.y = e.clientY + 10;
    }
    function hideNote() {
      tooltip.visible = false;
    }

    function statusColor(r) {
      if (r.qty === 0) return "red";
      if (r.qty < r.safety) return "orange";
      return "green";
    }
    function statusText(r) {
      if (r.qty === 0) return "Kosong";
      if (r.qty < r.safety) return "Menipis";
      return "Aman";
    }

    function formatCurrency(v) {
      return "Rp " + Number(v).toLocaleString("id-ID");
    }

    // ========= FORM STOKNYA =========
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
      const globalIdx = stockData.value.findIndex((s) => s.kode === item.kode);
      stockForm.editIndex = globalIdx;
      stockForm.data = { ...stockData.value[globalIdx] };
      stockForm.visible = true;
    }

    function closeStockForm() {
      stockForm.visible = false;
    }

    function saveStock() {
      const d = stockForm.data;
      if (!d.kode || !d.judul || !d.upbjj) {
        alert("Isi Kode, Judul, dan UT-Daerah");
        return;
      }
      if (stockForm.editIndex === null) {
        stockData.value.push({ ...d });
      } else {
        stockData.value[stockForm.editIndex] = { ...d };
      }
      stockForm.visible = false;
    }

    function confirmDeleteStock(idx) {
      deleteConfirm.visible = true;
      deleteConfirm.index = idx;
    }

    function deleteStockConfirmed() {
      const item = displayedStocks.value[deleteConfirm.index];
      const globalIdx = stockData.value.findIndex((s) => s.kode === item.kode);
      stockData.value.splice(globalIdx, 1);
      deleteConfirm.visible = false;
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
      doList.value.push({ ...d });
      doForm.visible = false;
    }

    const filteredDOs = computed(() => {
      const q = doSearch.value.toLowerCase();
      if (!q) return doList.value;
      return doList.value.filter(
        (d) =>
          d.nomor.toLowerCase().includes(q) || d.nim.toLowerCase().includes(q)
      );
    });

    function openDO(i) {
      doList.value[i].open = !doList.value[i].open;
    }

    function addProgress(i) {
      const d = doList.value[i];
      if (!d.newProgress) return;
      d.progress.push({ time: new Date(), keterangan: d.newProgress });
      d.newProgress = "";
    }

    function confirmDeleteDO(i) {
      deleteDOConfirm.visible = true; // tampilkan modal
      deleteDOConfirm.index = i; // simpan index baris yang dipilih
    }

    function deleteDOConfirmed() {
      doList.value.splice(deleteDOConfirm.index, 1);
      deleteDOConfirm.visible = false;
    }



    function resetDOFilters() {
      filters.upbjj = "";
      filters.kategori = "";
      filters.special = "";
      sortBy.value = "";
    }

    function formatDate(d) {
      return new Date(d).toLocaleDateString("id-ID");
    }
    function formatDateTime(d) {
      return new Date(d).toLocaleString("id-ID");
    }

    // RETURN TO VUE
    return {
      tab,
      stockData,
      upbjjList,
      ekspedisiOptions,
      filters,
      kategoriOptions,
      displayedStocks,
      tooltip,
      sortBy,
      stockForm,
      deleteConfirm,
      doDetail,
      openDODetail,
      openCreateStock,
      openEditStock,
      closeStockForm,
      saveStock,
      confirmDeleteStock,
      deleteStockConfirmed,
      statusColor,
      statusText,
      formatCurrency,
      resetStockFilters,
      showNote,
      hideNote,
      doList,
      doForm,
      doSearch,
      filteredDOs,
      openCreateDO,
      closeDOForm,
      saveDO,
      openDO,
      addProgress,
      deleteDOConfirm,
      confirmDeleteDO,
      deleteDOConfirmed,
      formatDate,
      formatDateTime,
    };
  },
}).mount("#app");
