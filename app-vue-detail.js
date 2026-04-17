(function() {
  const vue = window.Vue;
  const state = window.__szAppState;
  const api = window.__szAppApi;
  if (!vue || !state || !api) return;
  window.SZVueModules = window.SZVueModules || {};
  function ensurePageHeaderComponent() {
    if (window.SZVueModules.PageHeader) return window.SZVueModules.PageHeader;
    const PageHeader = {
      name: "PageHeader",
      props: {
        title: { type: String, default: "" },
        subtitle: { type: String, default: "" },
        showBack: { type: Boolean, default: false }
      },
      emits: ["back"],
      template: `
        <header class="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
          <div class="flex min-w-0 items-center gap-3">
            <button v-if="showBack" aria-label="Retour" class="rounded-full p-1 text-slate-700 transition-colors duration-150 hover:bg-slate-100" type="button" @click="$emit('back')">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div class="min-w-0">
              <h1 class="truncate text-lg font-extrabold uppercase tracking-tight text-slate-900">{{ title }}</h1>
              <p v-if="subtitle" class="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{{ subtitle }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <slot name="actions"></slot>
          </div>
        </header>
      `
    };
    window.SZVueModules.PageHeader = PageHeader;
    return PageHeader;
  }
  const PageHeader = ensurePageHeaderComponent();

  const DetailScreen = {
    name: "DetailScreen",
    components: { PageHeader: PageHeader },
    setup() {
      const detailVm = vue.computed(function() {
        return api.getDetailViewModel(state.detailReference);
      });
      const item = vue.computed(function() {
        return detailVm.value.item;
      });
      const history = vue.computed(function() {
        return detailVm.value.history || [];
      });
      const stockMarkup = vue.computed(function() {
        return item.value ? api.renderDetailStockStateMarkup(item.value) : "";
      });

      function goBack() {
        api.navigateTo(state.detailOrigin || state.previousView || "inventory");
      }

      function openQuickEdit() {
        if (item.value) api.openQuickEdit(item.value);
      }

      function editRemark() {
        if (!item.value) return;
        const nextRemark = window.prompt("Remarque produit", String(item.value.remark || ""));
        if (nextRemark === null) return;
        api.saveProductRemark(item.value, nextRemark);
      }

      return {
        state: state,
        api: api,
        detailVm: detailVm,
        item: item,
        history: history,
        stockMarkup: stockMarkup,
        goBack: goBack,
        openQuickEdit: openQuickEdit,
        editRemark: editRemark
      };
    },
    template: `
      <main class="flex h-full min-h-0 flex-col overflow-hidden">
        <div class="sticky top-0 z-40 shrink-0 bg-background">
          <PageHeader :title="item ? (item.reference || 'Fiche produit') : 'Fiche produit'" :subtitle="item ? 'Fiche produit' : ''" :showBack="true" @back="goBack">
            <template #actions>
              <button v-if="item" class="bg-surface-tint px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary transition-colors duration-150 hover:bg-primary-dim" type="button" @click="openQuickEdit">Modifier</button>
            </template>
          </PageHeader>
        </div>

        <section class="inventory-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface px-4 py-4">
          <div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <div v-if="!item" class="border border-error/20 bg-error-container/15 px-4 py-3 text-[12px] font-medium text-on-error-container">
              Référence introuvable dans le stock courant.
            </div>

            <template v-else>
              <section class="border border-outline-variant/20 bg-surface-container-lowest p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Référence</div>
                    <div class="mt-1 truncate text-2xl font-black tracking-tight text-on-surface">{{ item.reference || '-' }}</div>
                  </div>
                  <div class="shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{{ item.stockState === 'positive' ? 'En stock' : 'En rupture' }}</div>
                </div>
                <div class="mt-3 grid gap-2 sm:grid-cols-2">
                  <div class="border border-outline-variant/20 bg-surface-container-low px-3 py-2">
                    <div class="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">到货单</div>
                    <div class="mt-1 text-[12px] font-medium text-on-surface">{{ api.getArrivalNote(item) }}</div>
                  </div>
                  <div class="border border-outline-variant/20 bg-surface-container-low px-3 py-2">
                    <div class="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Entrepot</div>
                    <div class="mt-1 text-[12px] font-medium text-on-surface">{{ item.warehouse || '-' }}</div>
                  </div>
                  <div class="border border-outline-variant/20 bg-surface-container-low px-3 py-2">
                    <div class="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Création</div>
                    <div class="mt-1 text-[12px] font-medium text-on-surface">{{ item.createdAt || '-' }}</div>
                  </div>
                  <div class="border border-outline-variant/20 bg-surface-container-low px-3 py-2">
                    <div class="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Dernier mouvement</div>
                    <div class="mt-1 text-[12px] font-medium text-on-surface">{{ history.length ? (history[0].timestampLabel || api.formatDateTimeLabel(history[0].timestampRaw)) : '-' }}</div>
                  </div>
                </div>
              </section>

              <section class="border border-outline-variant/20 bg-surface-container-lowest">
                <div class="border-b border-outline-variant/20 px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">État du stock</div>
                </div>
                <div v-html="stockMarkup"></div>
              </section>

              <section class="border border-outline-variant/20 bg-surface-container-lowest p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Remarque</div>
                  <button class="border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant transition-colors duration-150 hover:bg-surface-container" type="button" @click="editRemark">Modifier</button>
                </div>
                <div class="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-on-surface">{{ item.remark || '-' }}</div>
              </section>

              <section class="border border-outline-variant/20 bg-surface-container-lowest">
                <div class="border-b border-outline-variant/20 px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Historique récent</div>
                </div>
                <div v-if="history.length" class="flex flex-col gap-px bg-outline-variant/20">
                  <article v-for="entry in history" :key="entry.id || entry.timestampRaw" class="bg-surface-container-lowest px-3 py-2 shadow-ledger">
                    <div class="flex items-start justify-between gap-3">
                      <div class="truncate text-[12px] font-bold tracking-tight text-primary">{{ entry.reference || '-' }}</div>
                      <span :class="['shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em]', api.getActionBadgeClass(entry.actionType)]">{{ api.getActionLabel(entry.actionType) }}</span>
                    </div>
                    <div class="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                      <div class="min-w-0 font-mono text-[11px] leading-4 text-on-surface">
                        <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-2 text-on-surface-variant">
                          <time class="whitespace-nowrap text-[10px] font-semibold text-on-surface-variant">{{ api.getHistoryBeforeDateTime(entry) || '—' }}</time>
                          <div class="min-w-0 truncate font-medium">{{ entry.beforeDisplay || '-' }}</div>
                        </div>
                        <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-2 text-on-surface">
                          <div class="text-right font-black text-on-surface-variant">→</div>
                          <div class="min-w-0 truncate font-semibold">{{ api.formatHistoryMovement(entry) || '-' }}</div>
                        </div>
                        <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-2">
                          <time class="whitespace-nowrap text-[10px] font-semibold text-on-surface-variant">{{ api.formatHistoryJournalDateTime(entry.timestampRaw, entry.timestampLabel) }}</time>
                          <div class="min-w-0 truncate font-semibold text-primary">{{ entry.afterDisplay || '-' }}</div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
                <div v-else class="px-4 py-5 text-center">
                  <p class="text-[12px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Aucun historique</p>
                </div>
              </section>
            </template>
          </div>
        </section>
      </main>
    `
  };

  window.SZVueModules.DetailScreen = DetailScreen;
})();
