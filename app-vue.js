(function() {
  const vue = window.Vue;
  function bootLog_(stage, payload) {
    console.info("[boot] " + stage, payload || {});
  }

  function ensureVueStateBridge_() {
    const api = window.__szAppApi;
    const rawState = window.__szAppState;
    if (!vue || !api || !rawState) return rawState || null;
    if (rawState && rawState.__v_isReactive === true) return rawState;
    if (typeof api.adoptReactiveState !== "function") return rawState;
    return api.adoptReactiveState(vue.reactive(rawState));
  }

  if (!vue) {
    console.error("[boot] Vue missing before app-vue bootstrap");
    return;
  }

  const state = ensureVueStateBridge_();
  const api = window.__szAppApi;
  if (!state || !api) {
    console.error("[boot] Vue bootstrap prerequisites missing", {
      vueLoaded: Boolean(vue),
      statePresent: Boolean(state),
      apiPresent: Boolean(api)
    });
    return;
  }

  window.SZVueModules = window.SZVueModules || {};

  const InventoryCard = {
    name: "InventoryCard",
    props: {
      item: { type: Object, required: true }
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
        return api.getInventoryArrivalMeta(this.item);
      },
      arrivalLines() {
        return api.splitInventoryArrivalNoteLines(this.arrivalMeta.note || "");
      }
    },
    methods: {
      openQuickEdit() {
        api.openQuickEdit(api.getItemById(this.itemId));
      },
      openDetail() {
        state.nextDetailOrigin = "inventory";
        api.navigateTo("detail", { ref: this.reference });
      }
    },
    template: `
      <article
        :class="['inventory-card bg-surface-container-lowest relative border-l-4 flex min-h-[5.1rem] items-stretch transition-colors duration-150 hover:bg-surface-container select-none', accentClass]"
      >
        <button class="inventory-card-main flex min-w-0 flex-1 flex-col justify-between px-2.5 py-2 text-left" type="button" @click="openQuickEdit">
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
        <button class="reference-detail-trigger flex w-10 shrink-0 touch-manipulation select-none items-center justify-center border-l border-outline-variant/20 text-outline-variant transition-colors duration-150 hover:bg-surface-container-highest hover:text-on-surface-variant active:bg-surface-container-high" type="button" @click="openDetail">
          <span class="material-symbols-outlined !text-[16px]">chevron_right</span>
        </button>
      </article>
    `
  };

  const InventoryScreen = {
    name: "InventoryScreen",
    components: { InventoryCard: InventoryCard },
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
      const columns = vue.computed(function() {
        return api.buildColumnLayout(filteredItems.value, state.columnCount || 1);
      });

      function handleOnline() {
        online.value = navigator.onLine;
      }

      vue.onMounted(function() {
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOnline);
      });

      vue.onBeforeUnmount(function() {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOnline);
      });

      function buildEntries(columnItems) {
        if (state.inventorySort !== "arrival") {
          return (columnItems || []).map(function(item) {
            return { type: "item", key: "item::" + (item.id || item.reference || ""), item: item };
          });
        }
        let lastGroupKey = "";
        return (columnItems || []).reduce(function(entries, item) {
          const group = api.getArrivalGroupMeta(item);
          const groupKey = group.rank + "::" + group.note + "::" + group.sort;
          if (groupKey !== lastGroupKey) {
            entries.push({ type: "separator", key: "separator::" + groupKey, item: item, group: group });
            lastGroupKey = groupKey;
          }
          entries.push({ type: "item", key: "item::" + (item.id || item.reference || ""), item: item });
          return entries;
        }, []);
      }

      return {
        state: state,
        api: api,
        filteredItems: filteredItems,
        inventorySummary: inventorySummary,
        syncStatusLabel: syncStatusLabel,
        networkLabel: vue.computed(function() {
          return online.value ? "En ligne" : "Hors ligne";
        }),
        columns: columns,
        buildEntries: buildEntries
      };
    },
    template: `
      <main class="flex h-full min-h-0 flex-col overflow-hidden">
        <div class="sticky top-0 z-40 shrink-0 bg-background">
          <header class="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
            <div class="flex items-center gap-3">
              <div>
                <h1 class="text-lg font-extrabold uppercase tracking-tight text-slate-900">SZFASHION</h1>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="border border-outline-variant/30 bg-surface-container-lowest px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant transition-colors duration-150 hover:bg-surface-container" type="button" @click="api.navigateTo('imports')">Import refs</button>
              <button aria-label="Rafraîchir" class="rounded-full p-1 text-slate-700 transition-colors duration-150 hover:bg-slate-100" type="button" @click="api.refreshRemoteSnapshot({ force: false })">
                <span class="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </header>
          <section class="border-b border-outline-variant/20 bg-surface-container-low px-3 py-1.5 shadow-ledger">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-on-surface-variant !text-[16px]">search</span>
              <input v-model="state.query" autocomplete="off" class="w-full border-none bg-transparent p-0 text-[10px] font-medium tracking-tight text-on-surface placeholder:text-outline focus:ring-0" placeholder="RECHERCHE RÉFÉRENCE / STOCK..." type="search" />
            </div>
            <div class="mt-1.5 grid grid-cols-2 gap-2">
              <select v-model="state.inventoryStockFilter" class="border-outline-variant/30 bg-surface-container-lowest py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface">
                <option value="">Tous stocks</option>
                <option value="positive">En stock</option>
                <option value="zero">Rupture</option>
              </select>
              <select v-model="state.inventoryArrivalFilter" class="border-outline-variant/30 bg-surface-container-lowest py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface">
                <option value="">Tous 到货单</option>
                <option value="with">Avec 到货单</option>
                <option value="without">Sans 到货单</option>
              </select>
              <select v-model="state.inventoryTailFilter" class="border-outline-variant/30 bg-surface-container-lowest py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface">
                <option value="">Tous 尾箱</option>
                <option value="with">Avec 尾箱</option>
                <option value="without">Sans 尾箱</option>
              </select>
              <select v-model="state.inventorySort" class="border-outline-variant/30 bg-surface-container-lowest py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface">
                <option value="arrival">到货单 récent</option>
                <option value="reference">货号 A-Z</option>
                <option value="warehouse">仓库</option>
                <option value="stock">Stock décroissant</option>
              </select>
            </div>
          </section>
          <section class="border-b border-outline-variant/30 bg-surface-container-high px-3 py-1.5">
            <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <div class="flex min-w-0 flex-wrap items-center gap-1 text-[8px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                <span>{{ inventorySummary.visibleCount }} {{ inventorySummary.visibleCount === 1 ? 'ref' : 'refs' }}</span>
                <span class="text-outline-variant/40">//</span>
                <span>{{ inventorySummary.positiveCount }} en stock</span>
                <span class="text-outline-variant/40">//</span>
                <span>{{ inventorySummary.zeroCount }} en rupture</span>
                <span class="text-outline-variant/40">//</span>
                <span>{{ api.formatMetricNumber(inventorySummary.totalBoxes) }}箱 {{ inventorySummary.hasPackData ? api.formatMetricNumber(inventorySummary.totalPacks) + '包 ' : '' }}{{ api.formatMetricNumber(inventorySummary.totalPieces) }}件</span>
              </div>
              <div class="flex items-center gap-2 text-right text-[8px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                <span>{{ networkLabel }}</span>
                <span class="text-outline-variant/40">//</span>
                <span>{{ syncStatusLabel }}</span>
              </div>
            </div>
          </section>
        </div>

        <section class="inventory-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-outline-variant/20">
          <div v-if="filteredItems.length" class="flex items-start gap-px bg-outline-variant/20">
            <div v-for="(columnItems, columnIndex) in columns" :key="'column::' + columnIndex" class="inventory-column flex min-w-0 flex-1 flex-col gap-px bg-outline-variant/20">
              <template v-for="entry in buildEntries(columnItems)" :key="entry.key">
                <button v-if="entry.type === 'separator'" class="sticky top-0 z-10 w-full border-y border-outline-variant/20 bg-surface-container-high px-3 py-1 text-left text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant" type="button" @click="state.inventoryArrivalMetaExpanded = !state.inventoryArrivalMetaExpanded">
                  {{ api.formatArrivalGroupLabel(entry.group, entry.item) }}
                </button>
                <InventoryCard v-else :item="entry.item" />
              </template>
            </div>
          </div>
          <div v-else class="border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-5 text-center">
            <p class="text-[12px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Aucun resultat</p>
            <p class="mt-1 text-[12px] text-on-surface-variant">Ajuste la recherche pour afficher des references.</p>
          </div>
        </section>
      </main>
    `
  };

  window.SZVueModules.InventoryScreen = InventoryScreen;

  function mountRoot(attempt) {
    const modules = window.SZVueModules || {};
    const root = document.getElementById("app");
    if (!window.Vue || !window.__szAppState || !window.__szAppApi || !modules.AppRoot || !root) {
      if ((attempt || 0) < 20) {
        window.setTimeout(function() {
          mountRoot((attempt || 0) + 1);
        }, 50);
      } else {
        console.error("[boot] Vue root mount aborted", {
          vueLoaded: Boolean(window.Vue),
          statePresent: Boolean(window.__szAppState),
          apiPresent: Boolean(window.__szAppApi),
          modulesPresent: Boolean(window.SZVueModules),
          appRootPresent: Boolean(modules.AppRoot),
          rootPresent: Boolean(root)
        });
      }
      return;
    }
    if (window.__szRootVueMounted === true) return;
    bootLog_("before root mount", window.__szAppApi.getBootDiagnostics ? window.__szAppApi.getBootDiagnostics() : {});
    window.__szRootVueMounted = true;
    vue.createApp(modules.AppRoot).mount(root);
    bootLog_("after root mount", window.__szAppApi.getBootDiagnostics ? window.__szAppApi.getBootDiagnostics() : {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      mountRoot(0);
    });
  } else {
    mountRoot(0);
  }
})();
