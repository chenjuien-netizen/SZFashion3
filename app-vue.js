(function() {
  const vue = window.Vue;
  const state = window.__szAppState;
  const api = window.__szAppApi;
  if (!vue || !state || !api) return;

  const InventoryCard = {
    name: "InventoryCard",
    props: {
      item: { type: Object, required: true },
      api: { type: Object, required: true },
      state: { type: Object, required: true }
    },
    computed: {
      itemId() {
        return this.item.id || this.item.reference || "";
      },
      reference() {
        return this.item.reference || "-";
      },
      stockDisplay() {
        return this.item.stockDisplay || "-";
      },
      stockClass() {
        return this.item.stockState === "positive" ? "text-primary" : "text-on-surface-variant";
      },
      accentClass() {
        return this.item.stockState === "positive" ? "border-emerald-400/50" : "border-rose-400/50";
      },
      arrivalMeta() {
        return this.api.getInventoryArrivalMeta(this.item);
      },
      arrivalLines() {
        return this.api.splitInventoryArrivalNoteLines(this.arrivalMeta.note || "");
      }
    },
    methods: {
      openQuickEdit() {
        this.api.openQuickEdit(this.api.getItemById(this.itemId));
      },
      openDetail() {
        this.state.nextDetailOrigin = "inventory";
        this.api.navigateTo("detail", { ref: this.reference });
      }
    },
    template: `
      <article
        :class="['inventory-card bg-surface-container-lowest relative border-l-4 flex min-h-[5.1rem] items-stretch transition-colors duration-150 hover:bg-surface-container select-none', accentClass]"
        :data-item-id="itemId"
        :data-reference="reference"
        :data-stock-display="stockDisplay"
        :data-stock-state="item.stockState || ''"
      >
        <button
          class="inventory-card-main flex min-w-0 flex-1 flex-col justify-between px-2.5 py-2 text-left"
          type="button"
          @click="openQuickEdit"
        >
          <div class="flex items-start gap-2">
            <span class="min-w-0 flex-[1_1_auto] truncate pr-1 text-[12px] font-bold tracking-tight text-on-surface">{{ reference }}</span>
            <div class="min-w-0 max-w-[4.9rem] shrink text-right">
              <div class="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">{{ item.warehouse || "-" }}</div>
            </div>
          </div>
          <div class="mt-1 min-w-0 pr-1">
            <span :class="['block truncate text-[13px] font-medium', stockClass]">{{ stockDisplay }}</span>
          </div>
          <div class="mt-1 flex justify-end">
            <div class="w-[6.8rem] shrink-0">
              <div v-if="arrivalMeta.note" class="h-6 overflow-hidden text-right text-[9px] leading-3 text-on-surface-variant">
                <span class="block truncate">{{ arrivalLines[0] }}</span>
                <span v-if="arrivalLines[1]" class="block truncate">{{ arrivalLines[1] }}</span>
              </div>
              <div v-else class="h-6"></div>
            </div>
          </div>
        </button>
        <button
          class="reference-detail-trigger flex w-10 shrink-0 touch-manipulation select-none items-center justify-center border-l border-outline-variant/20 text-outline-variant transition-colors duration-150 hover:bg-surface-container-highest hover:text-on-surface-variant active:bg-surface-container-high"
          type="button"
          :aria-label="'Ouvrir la fiche de ' + reference"
          @click="openDetail"
        >
          <span class="material-symbols-outlined !text-[16px]">chevron_right</span>
        </button>
      </article>
    `
  };

  const InventoryList = {
    name: "InventoryList",
    components: {
      InventoryCard: InventoryCard
    },
    props: {
      items: { type: Array, required: true },
      api: { type: Object, required: true },
      state: { type: Object, required: true }
    },
    computed: {
      columns() {
        return this.api.buildColumnLayout(this.items, this.state.columnCount || 1);
      }
    },
    methods: {
      buildEntries(columnItems) {
        if (this.state.inventorySort !== "arrival") {
          return (columnItems || []).map(function(item) {
            return {
              type: "item",
              key: "item::" + (item.id || item.reference || ""),
              item: item
            };
          });
        }
        let lastGroupKey = "";
        return (columnItems || []).reduce((entries, item) => {
          const group = this.api.getArrivalGroupMeta(item);
          const groupKey = group.rank + "::" + group.note + "::" + group.sort;
          if (groupKey !== lastGroupKey) {
            entries.push({
              type: "separator",
              key: "separator::" + groupKey,
              item: item,
              group: group
            });
            lastGroupKey = groupKey;
          }
          entries.push({
            type: "item",
            key: "item::" + (item.id || item.reference || ""),
            item: item
          });
          return entries;
        }, []);
      },
      toggleArrivalMeta() {
        this.state.inventoryArrivalMetaExpanded = !this.state.inventoryArrivalMetaExpanded;
      },
      formatArrivalGroupLabel(group, item) {
        return this.api.formatArrivalGroupLabel(group, item);
      }
    },
    template: `
      <div class="inventory-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-outline-variant/20" id="inventoryScroll">
        <div v-if="items.length" class="flex items-start gap-px bg-outline-variant/20">
          <div
            v-for="(columnItems, columnIndex) in columns"
            :key="'column::' + columnIndex"
            class="inventory-column flex min-w-0 flex-1 flex-col gap-px bg-outline-variant/20"
          >
            <template v-for="entry in buildEntries(columnItems)" :key="entry.key">
              <button
                v-if="entry.type === 'separator'"
                class="sticky top-0 z-10 w-full border-y border-outline-variant/20 bg-surface-container-high px-3 py-1 text-left text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant"
                type="button"
                @click="toggleArrivalMeta"
              >
                {{ formatArrivalGroupLabel(entry.group, entry.item) }}
              </button>
              <InventoryCard
                v-else
                :item="entry.item"
                :api="api"
                :state="state"
              />
            </template>
          </div>
        </div>
        <div v-else class="border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-5 text-center">
          <p class="text-[12px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Aucun resultat</p>
          <p class="mt-1 text-[12px] text-on-surface-variant">Ajuste la recherche pour afficher des references.</p>
        </div>
      </div>
    `
  };

  const InventoryToolbar = {
    name: "InventoryToolbar",
    props: {
      state: { type: Object, required: true },
      api: { type: Object, required: true }
    },
    methods: {
      refreshInventory() {
        this.api.refreshRemoteSnapshot({ force: false });
      },
      openImports() {
        this.api.navigateTo("imports");
      }
    },
    template: `
      <div class="sticky top-0 z-40 shrink-0 bg-background">
        <header class="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
          <div class="flex items-center gap-3">
            <div>
              <h1 class="text-lg font-extrabold uppercase tracking-tight text-slate-900">SZFASHION</h1>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="border border-outline-variant/30 bg-surface-container-lowest px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant transition-colors duration-150 hover:bg-surface-container" type="button" @click="openImports">Import refs</button>
            <button aria-label="Rafraîchir" class="rounded-full p-1 text-slate-700 transition-colors duration-150 hover:bg-slate-100" type="button" @click="refreshInventory">
              <span class="material-symbols-outlined">refresh</span>
            </button>
          </div>
        </header>

        <section class="border-b border-outline-variant/20 bg-surface-container-low px-3 py-1.5 shadow-ledger">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-on-surface-variant !text-[16px]">search</span>
            <input
              id="searchInput"
              v-model="state.query"
              autocomplete="off"
              class="w-full border-none bg-transparent p-0 text-[10px] font-medium tracking-tight text-on-surface placeholder:text-outline focus:ring-0"
              placeholder="RECHERCHE RÉFÉRENCE / STOCK..."
              type="search"
            />
          </div>
          <div class="mt-1.5 grid grid-cols-2 gap-2">
            <select id="inventoryStockFilter" v-model="state.inventoryStockFilter" class="border-outline-variant/30 bg-surface-container-lowest py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface">
              <option value="">Tous stocks</option>
              <option value="positive">En stock</option>
              <option value="zero">Rupture</option>
            </select>
            <select id="inventoryArrivalFilter" v-model="state.inventoryArrivalFilter" class="border-outline-variant/30 bg-surface-container-lowest py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface">
              <option value="">Tous 到货单</option>
              <option value="with">Avec 到货单</option>
              <option value="without">Sans 到货单</option>
            </select>
            <select id="inventoryTailFilter" v-model="state.inventoryTailFilter" class="border-outline-variant/30 bg-surface-container-lowest py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface">
              <option value="">Tous 尾箱</option>
              <option value="with">Avec 尾箱</option>
              <option value="without">Sans 尾箱</option>
            </select>
            <select id="inventorySortSelect" v-model="state.inventorySort" class="border-outline-variant/30 bg-surface-container-lowest py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface">
              <option value="arrival">到货单 récent</option>
              <option value="reference">货号 A-Z</option>
              <option value="warehouse">仓库</option>
              <option value="stock">Stock décroissant</option>
            </select>
          </div>
        </section>
      </div>
    `
  };

  const InventorySummaryBar = {
    name: "InventorySummaryBar",
    props: {
      summary: { type: Object, required: true },
      networkLabel: { type: String, required: true },
      syncStatusLabel: { type: String, required: true },
      api: { type: Object, required: true }
    },
    computed: {
      totalsLabel() {
        return this.api.formatMetricNumber(this.summary.totalBoxes) + "箱 "
          + (this.summary.hasPackData ? this.api.formatMetricNumber(this.summary.totalPacks) + "包 " : "")
          + this.api.formatMetricNumber(this.summary.totalPieces) + "件";
      }
    },
    template: `
      <section class="border-b border-outline-variant/30 bg-surface-container-high px-3 py-1.5">
        <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div class="flex min-w-0 flex-wrap items-center gap-1.5">
            <div class="flex min-w-0 flex-wrap items-center gap-1 text-[8px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
              <span>{{ summary.visibleCount }} {{ summary.visibleCount === 1 ? 'ref' : 'refs' }}</span>
              <span class="text-outline-variant/40">//</span>
              <span>{{ summary.positiveCount }} en stock</span>
              <span class="text-outline-variant/40">//</span>
              <span>{{ summary.zeroCount }} en rupture</span>
              <span class="text-outline-variant/40">//</span>
              <span>{{ totalsLabel }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 text-right text-[8px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            <span>{{ networkLabel }}</span>
            <span class="text-outline-variant/40">//</span>
            <span>{{ syncStatusLabel }}</span>
          </div>
        </div>
      </section>
    `
  };

  const InventoryApp = {
    name: "InventoryApp",
    components: {
      InventoryToolbar: InventoryToolbar,
      InventorySummaryBar: InventorySummaryBar,
      InventoryList: InventoryList
    },
    setup() {
      const online = vue.ref(navigator.onLine);
      const filteredItems = vue.computed(function() {
        return api.filterInventoryItems(state.query);
      });
      const inventorySummary = vue.computed(function() {
        return api.getInventorySummary(filteredItems.value);
      });
      const hasFilters = vue.computed(function() {
        return !!(state.query || state.inventoryStockFilter || state.inventoryArrivalFilter || state.inventoryTailFilter);
      });
      const syncStatusLabel = vue.computed(function() {
        return api.getSyncStatusLabel(hasFilters.value ? "Filtré" : "Pret");
      });

      function handleOnline() {
        online.value = navigator.onLine;
      }

      vue.onMounted(function() {
        window.__szInventoryVueMounted = true;
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOnline);
      });

      vue.onBeforeUnmount(function() {
        window.__szInventoryVueMounted = false;
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOnline);
      });

      return {
        api: api,
        state: state,
        filteredItems: filteredItems,
        inventorySummary: inventorySummary,
        syncStatusLabel: syncStatusLabel,
        networkLabel: vue.computed(function() {
          return online.value ? "En ligne" : "Hors ligne";
        })
      };
    },
    template: `
      <main class="flex h-full min-h-0 flex-col overflow-hidden" v-show="state.currentView === 'inventory'">
        <InventoryToolbar :state="state" :api="api" />
        <InventorySummaryBar
          :summary="inventorySummary"
          :network-label="networkLabel"
          :sync-status-label="syncStatusLabel"
          :api="api"
        />
        <InventoryList :items="filteredItems" :state="state" :api="api" />
      </main>
    `
  };

  function mountInventoryVue() {
    const root = document.getElementById("inventoryVueRoot");
    if (!root) return;
    vue.createApp(InventoryApp).mount(root);
  }

  document.addEventListener("DOMContentLoaded", mountInventoryVue);
})();
