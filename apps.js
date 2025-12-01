// apps.js (compatible with <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>)
// Ensure this runs after the Vue global bundle is loaded.

const { ref, reactive, computed, watch, onMounted, onBeforeUnmount } = Vue;

const App = {
  setup() {
    // UI
    const tab = ref("stok");

    // DATA
    const stockData = ref([]); // array of book objects
    const doList = ref([]); // array of DO objects
    const upbjjList = ref([]); // derived from stockData
    const ekspedisiOptions = ref(["JNE", "J&T", "Pos Indonesia", "SiCepat"]);

    // Filters / UI state
    const filters = reactive({ upbjj: "", kategori: "", special: "" });
    const sortBy = ref("");
    const tooltip = reactive({ visible: false, index: null, x: 0, y: 0 });

    // Stock form modal
    const stockForm = reactive({
      visible: false,
      editIndex: null, // index in stockData
      data: {}
    });

    // DO form modal
    const doForm = reactive({ visible: false, data: {} });
    const doDetail = reactive({ visible: false, index: null });
    const doSearch = ref("");

    // --- Utilities ---
    function saveToLocalStorage() {
      try {
        const payload = {
          stocks: stockData.value,
          do: doList.value.map(d => ({
            ...d,
            // ensure dates are stored as ISO (or null)
            tanggalKirim: d.tanggalKirim ? new Date(d.tanggalKirim).toISOString() : null,
            progress: (d.progress || []).map(p => ({ ...p, time: p.time ? new Date(p.time).toISOString() : null })),
            newProgress: d.newProgress ?? ""
          })),
          pengirimanList: ekspedisiOptions.value.map(n => ({ nama: n }))
        };
        localStorage.setItem("myAppData_v1", JSON.stringify(payload));
      } catch (err) {
        console.error("Gagal menyimpan ke localStorage:", err);
      }
    }

    function loadInitialData() {
      const saved = localStorage.getItem("myAppData_v1");
      if (saved) {
        try {
          const j = JSON.parse(saved);
          stockData.value = j.stocks || [];
          doList.value = (j.do || []).map(d => ({
            ...d,
            progress: (d.progress || []).map(p => ({ ...p, time: p.time ? new Date(p.time) : null })),
            newProgress: d.newProgress ?? "",
            tanggalKirim: d.tanggalKirim ? new Date(d.tanggalKirim) : null
          }));
          upbjjList.value = [...new Set(stockData.value.map(s => s.upbjj).filter(Boolean))];
          ekspedisiOptions.value = j.pengirimanList?.map(a => a.nama) || ekspedisiOptions.value;
          return;
        } catch (err) {
          console.warn("Saved data parse error, fallback to JSON:", err);
        }
      }

      // fallback load JSON file (ensure path is correct)
      fetch("./dataBahanAjar.json")
        .then(r => {
          if (!r.ok) throw new Error("fetch failed: " + r.status);
          return r.json();
        })
        .then(j => {
          stockData.value = j.stocks || [];
          doList.value = (j.do || []).map(d => ({
            ...d,
            progress: (d.progress || []).map(p => ({ ...p, time: p.time ? new Date(p.time) : null })),
            newProgress: ""
          }));
          upbjjList.value = [...new Set(stockData.value.map(s => s.upbjj).filter(Boolean))];
          ekspedisiOptions.value = j.pengirimanList?.map(a => a.nama) || ekspedisiOptions.value;
          // persist initial loaded data
          saveToLocalStorage();
        })
        .catch(err => {
          console.warn("Could not load dataBahanAjar.json, starting empty. Error:", err);
          // start with sample minimal data to avoid runtime errors
          stockData.value = stockData.value || [];
          doList.value = doList.value || [];
        });
    }

    // --- Computed / Derived ---
    const kategoriOptions = computed(() => {
      return [...new Set(stockData.value.map(s => s.kategori || "").filter(Boolean))];
    });

    const displayedStocks = computed(() => {
      let arr = stockData.value.slice();
      if (filters.upbjj) arr = arr.filter(r => r.upbjj === filters.upbjj);
      if (filters.kategori) arr = arr.filter(r => r.kategori === filters.kategori);
      if (filters.special === "belowSafety") arr = arr.filter(r => Number(r.qty) < Number(r.safety));
      if (filters.special === "zero") arr = arr.filter(r => Number(r.qty) === 0);

      if (sortBy.value === "judul") arr.sort((a, b) => (a.judul || "").localeCompare(b.judul || ""));
      if (sortBy.value === "qty_desc") arr.sort((a, b) => (b.qty || 0) - (a.qty || 0));
      if (sortBy.value === "harga_asc") arr.sort((a, b) => (a.harga || 0) - (b.harga || 0));

      return arr;
    });

    const filteredDOs = computed(() => {
      const q = (doSearch.value || "").toLowerCase().trim();
      if (!q) return doList.value;
      return doList.value.filter(d =>
        (d.nomor || "").toLowerCase().includes(q) ||
        (d.nim || "").toLowerCase().includes(q) ||
        (d.nama || "").toLowerCase().includes(q)
      );
    });

    // --- Helpers / formatters ---
    function formatCurrency(v) {
      if (v == null || v === "") return "-";
      return "Rp " + Number(v).toLocaleString("id-ID");
    }
    function formatDate(d) {
      if (!d) return "-";
      return new Date(d).toLocaleDateString("id-ID");
    }
    function formatDateTime(d) {
      if (!d) return "-";
      return new Date(d).toLocaleString("id-ID");
    }

    function statusText(row) {
      if (!row) return "-";
      if (Number(row.qty) === 0) return "Kosong";
      if (Number(row.qty) < Number(row.safety)) return "Hampir Habis";
      return "Aman";
    }

    // --- Stock functions ---
    function openCreateStock() {
      stockForm.editIndex = null;
      stockForm.data = { kode: "", judul: "", kategori: "", upbjj: "", lokasiRak: "", harga: 0, qty: 0, safety: 0, catatanHTML: "" };
      stockForm.visible = true;
    }

    function openEditStock(displayedIdx) {
      // displayedIdx refers to index inside displayedStocks (filtered), not global stockData
      const item = displayedStocks.value[displayedIdx];
      if (!item) return alert("Item tidak ditemukan (index invalid).");
      const globalIdx = stockData.value.findIndex(s => s.kode === item.kode);
      if (globalIdx === -1) return alert("Data asli tidak ditemukan.");
      stockForm.editIndex = globalIdx;
      stockForm.data = { ...stockData.value[globalIdx] }; // shallow copy
      stockForm.visible = true;
    }

    function closeStockForm() {
      stockForm.visible = false;
    }

    function saveStock() {
      const d = stockForm.data;
      if (!d.kode || !d.judul || !d.upbjj) return alert("Isi Kode, Judul, dan UT-Daerah");
      if (stockForm.editIndex === null) {
        // ensure kode unique
        if (stockData.value.some(s => s.kode === d.kode)) return alert("Kode sudah ada. Gunakan kode unik.");
        stockData.value.push({ ...d });
      } else {
        stockData.value[stockForm.editIndex] = { ...d };
      }
      // recalc UPBJJ list
      upbjjList.value = [...new Set(stockData.value.map(s => s.upbjj).filter(Boolean))];
      stockForm.visible = false;
      saveToLocalStorage();
    }

    function confirmDeleteStock(displayedIdx) {
      const item = displayedStocks.value[displayedIdx];
      if (!item) return;
      if (!confirm(`Hapus bahan ajar "${item.judul}" (kode ${item.kode}) ?`)) return;
      const globalIdx = stockData.value.findIndex(s => s.kode === item.kode);
      if (globalIdx !== -1) stockData.value.splice(globalIdx, 1);
      upbjjList.value = [...new Set(stockData.value.map(s => s.upbjj).filter(Boolean))];
      saveToLocalStorage();
    }

    function resetStockFilters() {
      filters.upbjj = "";
      filters.kategori = "";
      filters.special = "";
      sortBy.value = "";
    }

    // --- Tooltip ---
    function showNote(idx, event) {
      tooltip.index = idx;
      tooltip.visible = true;
      tooltip.x = (event?.clientX ?? 0) + 12;
      tooltip.y = (event?.clientY ?? 0) + 12;
    }
    function hideNote() {
      tooltip.visible = false;
      tooltip.index = null;
    }

    // --- DO functions ---
    function genNextDONumber() {
      const year = new Date().getFullYear();
      // count DO of current year to compute seq
      const seq = doList.value.filter(d => String(d.nomor || "").includes("DO" + year)).length + 1;
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
        tanggalKirim: null,
        totalHarga: 0,
        progress: [],
        newProgress: ""
      };
    }
    function closeDOForm() {
      doForm.visible = false;
    }
    function saveDO() {
      const d = doForm.data;
      if (!d.nim || !d.nama || !d.ekspedisi) return alert("Lengkapi semua field");
      d.tanggalKirim = d.tanggalKirimRaw ? new Date(d.tanggalKirimRaw) : new Date();
      d.progress = d.progress || [];
      d.newProgress = d.newProgress ?? "";
      doList.value.push({ ...d });
      doForm.visible = false;
      saveToLocalStorage();
    }

    function openDODetail(i) {
      if (typeof i !== "number" || i < 0 || i >= doList.value.length) {
        // if using filteredDOs index, we need to map to global index
        const item = filteredDOs.value[i];
        if (item) {
          const g = doList.value.findIndex(x => x.nomor === item.nomor);
          if (g !== -1) { doDetail.index = g; doDetail.visible = true; return; }
        }
        return;
      }
      doDetail.index = i;
      doDetail.visible = true;
    }

    function addProgressForm(i) {
      // i expected to be global index of DO (doDetail.index or passed)
      let idx = i;
      if (typeof idx !== "number") idx = doDetail.index;
      const d = doList.value[idx];
      if (!d) return alert("DO tidak ditemukan.");
      if (!d.newProgress || !d.newProgress.trim()) return alert("Isi update progress dulu.");
      d.progress = d.progress || [];
      d.progress.push({ time: new Date(), keterangan: d.newProgress.trim() });
      d.newProgress = "";
      saveToLocalStorage();
    }

    // Template calls deleteDO(i) in your HTML; implement it accordingly:
    function deleteDO(displayedOrFilteredIndex) {
      // Determine the corresponding global index
      // If argument corresponds to filteredDOs index, map it.
      let globalIdx = null;
      const maybeItem = filteredDOs.value[displayedOrFilteredIndex];
      if (maybeItem) {
        globalIdx = doList.value.findIndex(d => d.nomor === maybeItem.nomor);
      }
      // Fallback: if argument is already a global index
      if (globalIdx === -1 || globalIdx === null) {
        if (typeof displayedOrFilteredIndex === "number" && doList.value[displayedOrFilteredIndex]) {
          globalIdx = displayedOrFilteredIndex;
        }
      }
      if (globalIdx == null || globalIdx === -1) {
        // If user provided 'i' but our mapping failed, try to find by nim/nomor in case
        const guess = doList.value.findIndex(d => d.nomor === displayedOrFilteredIndex || d.nim === displayedOrFilteredIndex);
        if (guess !== -1) globalIdx = guess;
      }
      if (globalIdx == null || globalIdx === -1) return alert("Tidak dapat menemukan DO untuk dihapus.");

      const item = doList.value[globalIdx];
      if (!confirm(`Hapus DO ${item.nomor} - ${item.nama}?`)) return;
      doList.value.splice(globalIdx, 1);
      // close detail modal if it was the same one
      if (doDetail.visible && doDetail.index === globalIdx) {
        doDetail.visible = false;
        doDetail.index = null;
      }
      saveToLocalStorage();
    }

    // --- Keyboard handlers (optional) ---
    function handleKey(e) {
      if (e.key === "Escape") {
        if (stockForm.visible) stockForm.visible = false;
        if (doForm.visible) doForm.visible = false;
        if (doDetail.visible) { doDetail.visible = false; doDetail.index = null; }
      }
      if (e.key === "Enter") {
        // if DO form visible, try save
        // don't auto-save when inside textarea to avoid loss
      }
    }

    // --- Watchers to persist changes ---
    watch(stockData, () => {
      // recalc upbjj list
      upbjjList.value = [...new Set(stockData.value.map(s => s.upbjj).filter(Boolean))];
      saveToLocalStorage();
    }, { deep: true });

    watch(doList, () => {
      saveToLocalStorage();
    }, { deep: true });

    watch(filters, () => {
      sortBy.value = "";
    }, { deep: true });

    onMounted(() => {
      loadInitialData();
      window.addEventListener("keydown", handleKey);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("keydown", handleKey);
    });

    // Expose to template
    return {
      // state
      tab,
      stockData,
      doList,
      upbjjList,
      ekspedisiOptions,
      filters,
      kategoriOptions,
      displayedStocks,
      stockForm,
      // stock actions
      openCreateStock,
      openEditStock,
      closeStockForm,
      saveStock,
      confirmDeleteStock,
      resetStockFilters,
      // tooltip
      tooltip,
      showNote,
      hideNote,
      formatCurrency,
      formatDate,
      formatDateTime,
      statusText,
      sortBy,
      // DO
      openCreateDO,
      doForm,
      saveDO,
      closeDOForm,
      filteredDOs,
      doSearch,
      openDODetail,
      doDetail,
      addProgressForm,
      deleteDO,
      // misc
      saveToLocalStorage
    };
  }
};

// Mount the app using global Vue
Vue.createApp(App).mount("#app");
