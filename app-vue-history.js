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

  const HistoryScreen = {
    name: "HistoryScreen",
    components: { PageHeader: PageHeader },
    setup() {
      const items = vue.computed(function() {
        return api.filterHistoryItems(state.historyQuery, state.historyActionType, state.historyPeriod);
      });
      const hasFilters = vue.computed(function() {
        return !!(state.historyQuery || state.historyActionType || (state.historyPeriod && state.historyPeriod !== "all"));
      });
      const groupedItems = vue.computed(function() {
        let lastGroup = "";
        return items.value.reduce(function(list, entry) {
          const group = api.getHistoryDateGroupLabel(entry.timestampRaw);
          if (group !== lastGroup) {
            list.push({ type: "group", key: "group::" + group, label: group });
            lastGroup = group;
          }
          list.push({ type: "item", key: "history::" + (entry.id || entry.timestampRaw || Math.random()), entry: entry });
          return list;
        }, []);
      });

      function openDetail(reference) {
        state.nextDetailOrigin = "history";
        api.navigateTo("detail", { ref: reference });
      }

      return {
        state: state,
        api: api,
        items: items,
        hasFilters: hasFilters,
        groupedItems: groupedItems,
        openDetail: openDetail
      };
    },
    template: `
      <main class="flex h-full min-h-0 flex-col overflow-hidden">
        <div class="sticky top-0 z-40 shrink-0 bg-background">
          <PageHeader title="Historique">
            <template #actions>
              <button aria-label="Rafraîchir" class="rounded-full p-1 text-slate-700 transition-colors duration-150 hover:bg-slate-100" type="button" @click="api.refreshRemoteSnapshot({ force: false })">
                <span class="material-symbols-outlined">refresh</span>
              </button>
            </template>
          </PageHeader>
          <section class="border-b border-outline-variant/20 bg-surface-container-low px-3 py-2 shadow-ledger">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-on-surface-variant !text-[16px]">search</span>
              <input v-model="state.historyQuery" autocomplete="off" class="w-full border-none bg-transparent p-0 text-[10px] font-medium tracking-tight text-on-surface placeholder:text-outline focus:ring-0" placeholder="RECHERCHE RÉFÉRENCE / TYPE / REMARQUE..." type="search" />
            </div>
            <div class="mt-2 grid grid-cols-[1fr_1fr_auto] items-center gap-2">
              <label class="min-w-0">
                <select v-model="state.historyPeriod" class="w-full border-outline-variant/30 bg-surface-container-lowest text-[12px] font-medium text-on-surface">
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                  <option value="all">Tout</option>
                </select>
              </label>
              <label class="min-w-0 flex-1">
                <select v-model="state.historyActionType" class="w-full border-outline-variant/30 bg-surface-container-lowest text-[12px] font-medium text-on-surface">
                  <option value="">Tous types</option>
                  <option value="entry">entrée</option>
                  <option value="exit">sortie</option>
                  <option value="adjustment">ajustement</option>
                  <option value="pickup_ticket">pickup ticket</option>
                </select>
              </label>
              <div class="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{{ api.getSyncStatusLabel(hasFilters ? 'Filtré' : 'Pret') }}</div>
            </div>
          </section>
        </div>

        <section class="inventory-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-outline-variant/20">
          <div v-if="items.length" class="flex flex-col gap-px bg-outline-variant/20">
            <template v-for="entry in groupedItems" :key="entry.key">
              <div v-if="entry.type === 'group'" class="sticky top-0 z-10 border-y border-outline-variant/20 bg-surface-container-high px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                {{ entry.label }}
              </div>
              <article v-else class="bg-surface-container-lowest px-3 py-2 shadow-ledger">
                <div class="flex items-start justify-between gap-3">
                  <button class="truncate text-[12px] font-bold tracking-tight text-primary" type="button" @click="openDetail(entry.entry.reference)">{{ entry.entry.reference || '-' }}</button>
                  <span :class="['shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em]', api.getActionBadgeClass(entry.entry.actionType)]">{{ api.getActionLabel(entry.entry.actionType) }}</span>
                </div>
                <div class="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <div class="min-w-0 font-mono text-[11px] leading-4 text-on-surface">
                    <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-2 text-on-surface-variant">
                      <time class="whitespace-nowrap text-[10px] font-semibold text-on-surface-variant">{{ api.getHistoryBeforeDateTime(entry.entry) || '—' }}</time>
                      <div class="min-w-0 truncate font-medium">{{ entry.entry.beforeDisplay || '-' }}</div>
                    </div>
                    <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-2 text-on-surface">
                      <div class="text-right font-black text-on-surface-variant">→</div>
                      <div class="min-w-0 truncate font-semibold">{{ api.formatHistoryMovement(entry.entry) || '-' }}</div>
                    </div>
                    <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-2">
                      <time class="whitespace-nowrap text-[10px] font-semibold text-on-surface-variant">{{ api.formatHistoryJournalDateTime(entry.entry.timestampRaw, entry.entry.timestampLabel) }}</time>
                      <div class="min-w-0 truncate font-semibold text-primary">{{ entry.entry.afterDisplay || '-' }}</div>
                    </div>
                  </div>
                  <div v-if="entry.entry.remark" class="max-w-[6.5rem] shrink-0 border-l border-outline-variant/20 pl-2 text-[10px] leading-4 text-on-surface-variant">
                    <div class="truncate">{{ entry.entry.remark }}</div>
                  </div>
                </div>
              </article>
            </template>
          </div>
          <div v-else class="border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-5 text-center">
            <p class="text-[12px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">{{ hasFilters ? 'Aucun resultat' : 'Aucun historique' }}</p>
            <p class="mt-1 text-[12px] text-on-surface-variant">{{ hasFilters ? "Aucun mouvement ne correspond à la recherche." : "Aucun mouvement à afficher." }}</p>
          </div>
        </section>
      </main>
    `
  };

  window.SZVueModules.HistoryScreen = HistoryScreen;
})();
