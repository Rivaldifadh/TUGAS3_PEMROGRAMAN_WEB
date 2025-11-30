// js/app.js
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export function createDOApp() {
  return {
    setup() {
      const tab = ref("stok");
      const doDetail = reactive({ visible: false, index: null });

      // Main Data
      const stockData = ref([]);
      const doList = ref([]);
      const upbjjList = ref([]);
      const ekspedisiOptions = ref([]);

      // TOOLTIP
      const tooltip = reactive({ visible: false, index: null, x: 0, y: 0 });

      // Load JSON (try localStorage first for persistence, fallback to dataBahanAjar.json)
      function loadInitialData() {
        const saved = localStorage.getItem('myAppData_v1');
        if (saved) {
          try {
            const j = JSON.parse(saved);
            stockData.value = j.stocks || [];
            doList.value = (j.do || []).map((d) => ({
              ...d,
              progress: (d.progress || []).map((p) => ({ ...p, time: new Date(p.time) })),
              newProgress: d.newProgress ?? "",
              tanggalKirim: d.tanggalKirim ? new Date(d.tanggalKirim) : null
            }));
            upbjjList.value = [...new Set(stockData.value.map((s) => s.upbjj))];
            ekspedisiOptions.value = j.pengirimanList?.map((a) => a.nama) || ["JNE","J&T","Pos Indonesia","SiCepat"];
            return;
          } catch(err) {
            console.warn("Failed parse saved data:", err);
          }
        }

        // fallback to JSON file
        fetch("./dataBahanAjar.json")
          .then((r) => r.json())
          .then((j) => {
            stockData.value = j.stocks || [];
            doList.value = (j.do || []).map((d) => ( {
              ...d,
              progress: (d.progress || []).map((p) => ({ ...p, time: new Date(p.time) })),
              newProgress: ""
            }));
            upbjjList.value = [...new Set(stockData.value.map((s) => s.upbjj))];
            ekspedisiOptions.value = j.pengirimanList?.map((a) => a.nama) || ["JNE","J&T","Pos Indonesia","SiCepat"];
          })
          .catch((err) => console.error("Gagal load JSON:", err));
      }

      loadInitialData();

      function statusText(row) {
        if (!row) return "-";
        if (row.qty === 0) return "Kosong";
        if (row.qty < row.safety) return "Hampir Habis";
        return "Aman";
      }

      const filters = reactive({ upbjj: "", kategori: "", special: "" });
      const sortBy = ref("");

      const kategoriOptions = computed(() => {
        return [...new Set(stockData.value.map((s) => s.kategori))];
      });

      const displayedStocks = computed(() => {
        let arr = stockData.value.slice();
        if (filters.upbjj) arr = arr.filter((r) => r.upbjj === filters.upbjj);
        if (filters.kategori) arr = arr.filter((r) => r.kategori === filters.kategori);
        if (filters.special === "belowSafety") arr = arr.filter((r) => r.qty < r.safety);
        if (filters.special === "zero") arr = arr.filter((r) => r.qty === 0);

        if (sortBy.value === "judul") arr.sort((a,b) => a.judul.localeCompare(b.judul));
        if (sortBy.value === "qty_desc") arr.sort((a,b) => b.qty - a.qty);
        if (sortBy.value === "harga_asc") arr.sort((a,b) => a.harga - b.harga);

        return arr;
      });

      function openDODetail(i) {
        if (typeof i !== "number" || i < 0 || i >= doList.value.length) return;
        doDetail.visible = true;
        doDetail.index = i;
      }

      // Form stok
      const stockForm = reactive({ visible: false, editIndex: null, data: {} });
      const deleteConfirm = reactive({ visible: false, index: null });

      function openCreateStock() {
        stockForm.visible = true;
        stockForm.editIndex = null;
        stockForm.data = { kode: "", judul: "", kategori: "", upbjj: "", lokasiRak: "", harga: 0, qty: 0, safety: 0, catatanHTML: "" };
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
      function closeStockForm() { stockForm.visible = false; }
      function saveStock() {
        const d = stockForm.data;
        if (!d.kode || !d.judul || !d.upbjj) return alert("Isi Kode, Judul, dan UT-Daerah");
        if (stockForm.editIndex === null) stockData.value.push({ ...d });
        else stockData.value[stockForm.editIndex] = { ...d };
        stockForm.visible = false;
      }
      function confirmDeleteStock(idx) { deleteConfirm.visible = true; deleteConfirm.index = idx; }
      function deleteStockConfirmed() {
        const item = displayedStocks.value[deleteConfirm.index];
        if (!item) { deleteConfirm.visible = false; return; }
        const globalIdx = stockData.value.findIndex((s) => s.kode === item.kode);
        if (globalIdx !== -1) stockData.value.splice(globalIdx, 1);
        deleteConfirm.visible = false;
      }
      function resetStockFilters() {
        filters.upbjj = ""; filters.kategori = ""; filters.special = ""; sortBy.value = "";
      }

      function showNote(idx, event) {
        tooltip.index = idx;
        tooltip.visible = true;
        tooltip.x = (event?.clientX ?? 0) + 12;
        tooltip.y = (event?.clientY ?? 0) + 12;
      }
      function hideNote() { tooltip.visible = false; tooltip.index = null; }

      // DO
      const doForm = reactive({ visible: false, data: {} });
      const doSearch = ref("");
      const deleteDOConfirm = reactive({ visible: false, index: null });

      function genNextDONumber() {
        const year = new Date().getFullYear();
        const seq = doList.value.filter((d) => String(d.nomor).includes("DO" + year)).length + 1;
        return `DO${year}-${String(seq).padStart(3,"0")}`;
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
          newProgress: ""
        };
      }
      function closeDOForm() { doForm.visible = false; }
      function saveDO() {
        const d = doForm.data;
        if (!d.nim || !d.nama || !d.ekspedisi) return alert("Lengkapi semua field");
        d.tanggalKirim = d.tanggalKirimRaw ? new Date(d.tanggalKirimRaw) : new Date();
        d.progress = d.progress || [];
        d.newProgress = d.newProgress ?? "";
        doList.value.push({ ...d });
        doForm.visible = false;
      }

      const filteredDOs = computed(() => {
        const q = (doSearch.value || "").toLowerCase();
        if (!q) return doList.value;
        return doList.value.filter((d) => (d.nomor||"").toLowerCase().includes(q) || (d.nim||"").toLowerCase().includes(q));
      });

      // NOTE: function name standardized to addProgressForm (capital F)
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

      function confirmDeleteDO(i) { deleteDOConfirm.visible = true; deleteDOConfirm.index = i; }
      function deleteDOConfirmed() {
        if (deleteDOConfirm.index == null) return;
        doList.value.splice(deleteDOConfirm.index, 1);
        deleteDOConfirm.visible = false;
        deleteDOConfirm.index = null;
      }

      // Keyboard handler
      function handleKey(e) {
        if (e.key === "Enter") {
          if (stockForm.visible) saveStock();
          if (doForm.visible) saveDO();
          // Jika modal detail DO terbuka, tambahkan progress saat fokus pada input
        }
        if (e.key === "Escape") {
          if (stockForm.visible) closeStockForm();
          if (doForm.visible) closeDOForm();
          if (deleteConfirm.visible) deleteConfirm.visible = false;
          if (deleteDOConfirm.visible) deleteDOConfirm.visible = false;
          if (doDetail.visible) { doDetail.visible = false; doDetail.index = null; }
        }
      }

      onMounted(() => {
        window.addEventListener("keydown", handleKey);
      });

      onBeforeUnmount(() => {
        window.removeEventListener("keydown", handleKey);
      });

      // WATCHERS: contoh watcher wajib yang diminta
      // 1) watch doList (deep) untuk persist ke localStorage
      watch(doList, (newVal, oldVal) => {
        try {
          // simplify date objects to ISO so JSON can serialize
          const serializable = {
            stocks: stockData.value,
            do: newVal.map(d => ({
              ...d,
              progress: (d.progress || []).map(p => ({ ...p, time: p.time ? new Date(p.time).toISOString() : null })),
              tanggalKirim: d.tanggalKirim ? new Date(d.tanggalKirim).toISOString() : null
            }))
          };
          localStorage.setItem('myAppData_v1', JSON.stringify(serializable));
          // console.log("doList changed — saved to localStorage.");
        } catch (err) {
          console.error("Failed to persist doList:", err);
        }
      }, { deep: true });

      // 2) optional: watch filters to auto log or perform action
      watch(filters, (n) => {
        // contoh side effect: reset sort saat ganti filter
        sortBy.value = "";
      }, { deep: true });

      // Expose to template
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
        addProgressForm,  // <-- pastikan ini tersedia (case-sensitive)
        confirmDeleteDO,
        deleteDOConfirmed,
        statusText,
        resetStockFilters,
        showNote,
        hideNote,
      };
    }
  };
}
