(function() {
  const vue = window.Vue;
  const state = window.__szAppState;
  const api = window.__szAppApi;
  const modules = window.SZVueModules || {};
  if (!vue || !state || !api) return;

  const AppRoot = {
    name: "AppRoot",
    components: {
      InventoryScreen: modules.InventoryScreen,
      HistoryScreen: modules.HistoryScreen,
      DetailScreen: modules.DetailScreen,
      ImportsScreen: modules.ImportsScreen,
      TicketsScreen: modules.TicketsScreen,
      QuickEditOverlay: modules.QuickEditOverlay
    },
    setup() {
      function goInventory() {
        api.navigateToInventoryContext();
      }

      function goHistory() {
        api.navigateToHistoryContext();
      }

      function goTickets() {
        api.navigateToTicketsContext();
      }

      return {
        state: state,
        api: api,
        goInventory: goInventory,
        goHistory: goHistory,
        goTickets: goTickets
      };
    },
    template: `
      <div class="relative h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
        <div class="fixed inset-x-0 top-0 bottom-16 overflow-hidden bg-background">
          <InventoryScreen v-show="state.currentView === 'inventory'" />
          <HistoryScreen v-show="state.currentView === 'history'" />
          <DetailScreen v-show="state.currentView === 'detail'" />
          <ImportsScreen v-show="state.currentView === 'imports'" />
          <TicketsScreen v-show="state.currentView === 'tickets'" />
        </div>

        <nav class="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch justify-around border-t border-slate-200 bg-slate-50">
          <button :class="'flex flex-1 flex-col items-center justify-center px-2 py-1 ' + ((state.currentView === 'inventory' || (state.currentView === 'detail' && state.detailOrigin !== 'history')) ? 'bg-slate-200 text-slate-900' : 'text-slate-400')" data-nav-doubletap="inventory" type="button" :aria-current="(state.currentView === 'inventory' || (state.currentView === 'detail' && state.detailOrigin !== 'history')) ? 'page' : 'false'" @click="goInventory" @dblclick.prevent="api.forceInventoryListView()">
            <span class="material-symbols-outlined">inventory_2</span>
            <span class="mt-1 text-[10px] font-bold uppercase tracking-widest">Inventaire</span>
          </button>
          <button :class="'flex flex-1 flex-col items-center justify-center px-2 py-1 ' + ((state.currentView === 'history' || (state.currentView === 'detail' && state.detailOrigin === 'history')) ? 'bg-slate-200 text-slate-900' : 'text-slate-400')" data-nav-doubletap="history" type="button" :aria-current="(state.currentView === 'history' || (state.currentView === 'detail' && state.detailOrigin === 'history')) ? 'page' : 'false'" @click="goHistory" @dblclick.prevent="api.forceHistoryListView()">
            <span class="material-symbols-outlined">history</span>
            <span class="mt-1 text-[10px] font-bold uppercase tracking-widest">Historique</span>
          </button>
          <button :class="'flex flex-1 flex-col items-center justify-center px-2 py-1 ' + (state.currentView === 'tickets' ? 'bg-slate-200 text-slate-900' : 'text-slate-400')" data-nav-doubletap="tickets" type="button" :aria-current="state.currentView === 'tickets' ? 'page' : 'false'" @click="goTickets" @dblclick.prevent="api.forceTicketsListView()">
            <span class="material-symbols-outlined">local_shipping</span>
            <span class="mt-1 text-[10px] font-bold uppercase tracking-widest">Tickets</span>
          </button>
        </nav>

        <QuickEditOverlay />
      </div>
    `
  };

  window.SZVueModules.AppRoot = AppRoot;
})();
