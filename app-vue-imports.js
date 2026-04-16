(function() {
  const vue = window.Vue;
  const state = window.__szAppState;
  const api = window.__szAppApi;
  if (!vue || !state || !api) return;
  window.SZVueModules = window.SZVueModules || {};

  const ImportsScreen = {
    name: "ImportsScreen",
    setup() {
      const selectedBatch = vue.computed(function() {
        const batchId = String(state.referenceImportBatch || "");
        if (!batchId) return null;
        return (state.referenceImportBatches || []).find(function(batch) {
          return String(batch.batchId || "") === batchId;
        }) || null;
      });

      function onFileChange(event) {
        const file = event && event.target && event.target.files && event.target.files[0] ? event.target.files[0] : null;
        state.referenceImportDraft.file = file || null;
        state.referenceImportDraft.fileName = file ? file.name : "";
      }

      function goBack() {
        api.navigateTo("inventory");
      }

      function refresh() {
        api.loadReferenceImportData(state.referenceImportBatch);
      }

      function openBatch(batchId) {
        api.navigateTo("imports", { ref: batchId });
      }

      function backToList() {
        api.navigateTo("imports");
      }

      return {
        state: state,
        api: api,
        selectedBatch: selectedBatch,
        onFileChange: onFileChange,
        goBack: goBack,
        refresh: refresh,
        openBatch: openBatch,
        backToList: backToList
      };
    },
    template: `
      <main class="flex h-full min-h-0 flex-col overflow-hidden">
        <div class="sticky top-0 z-40 shrink-0 bg-background">
          <header class="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
            <div class="flex min-w-0 items-center gap-3">
              <button aria-label="Retour" class="rounded-full p-1 text-slate-700 transition-colors duration-150 hover:bg-slate-100" type="button" @click="goBack">
                <span class="material-symbols-outlined">arrow_back</span>
              </button>
              <div class="min-w-0">
                <h1 class="truncate text-lg font-extrabold uppercase tracking-tight text-slate-900">Import références</h1>
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{{ selectedBatch ? ('Batch ' + (selectedBatch.batchId || '')) : 'Import Excel / ODS' }}</p>
              </div>
            </div>
            <button class="border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant transition-colors duration-150 hover:bg-surface-container" type="button" @click="refresh">Rafraîchir</button>
          </header>
          <section class="border-b border-outline-variant/20 bg-surface-container-low px-3 py-2 shadow-ledger">
            <div class="grid gap-2">
              <input class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[12px] text-on-surface" type="file" accept=".xlsx,.xls,.ods" @change="onFileChange" />
              <div v-if="state.referenceImportDraft.fileName" class="text-[11px] text-on-surface-variant">{{ state.referenceImportDraft.fileName }}</div>
              <input v-model="state.referenceImportDraft.sheetName" autocomplete="off" class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[12px] text-on-surface" placeholder="Nom de feuille (optionnel)" type="text" />
              <div class="grid grid-cols-2 gap-2">
                <input v-model="state.referenceImportDraft.mapping.reference" autocomplete="off" class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[11px] text-on-surface" placeholder="Colonne Réf" type="text" />
                <input v-model="state.referenceImportDraft.mapping.warehouse" autocomplete="off" class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[11px] text-on-surface" placeholder="Colonne Entrepôt" type="text" />
                <input v-model="state.referenceImportDraft.mapping.arrivalNote" autocomplete="off" class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[11px] text-on-surface" placeholder="Colonne 到货单" type="text" />
                <input v-model="state.referenceImportDraft.mapping.remark" autocomplete="off" class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[11px] text-on-surface" placeholder="Colonne Remarque" type="text" />
                <input v-model="state.referenceImportDraft.mapping.tail" autocomplete="off" class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[11px] text-on-surface" placeholder="Colonne 尾箱" type="text" />
                <input v-model="state.referenceImportDraft.mapping.unitsPerBox" autocomplete="off" class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[11px] text-on-surface" placeholder="Colonne 件/箱" type="text" />
                <input v-model="state.referenceImportDraft.mapping.boxes" autocomplete="off" class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[11px] text-on-surface" placeholder="Colonne 箱数" type="text" />
              </div>
              <button class="bg-surface-tint px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary transition-colors duration-150 hover:bg-primary-dim" type="button" @click="api.createReferenceImportBatchFromForm()">Créer brouillon import</button>
            </div>
          </section>
        </div>

        <section class="inventory-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-outline-variant/20">
          <div class="flex flex-col gap-3 px-3 py-3">
            <template v-if="selectedBatch && selectedBatch.lines">
              <section class="border border-outline-variant/20 bg-surface-container-lowest p-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Batch</div>
                    <div class="mt-1 truncate text-[13px] font-black tracking-tight text-on-surface">{{ selectedBatch.batchId || '-' }}</div>
                    <div class="mt-1 text-[11px] text-on-surface-variant">{{ (selectedBatch.sourceFileName || '-') + ' · ' + (selectedBatch.status || '-') }}</div>
                  </div>
                  <button class="border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant transition-colors duration-150 hover:bg-surface-container" type="button" @click="backToList">Retour liste</button>
                </div>
              </section>
              <template v-if="selectedBatch.lines.length">
                <article v-for="line in selectedBatch.lines" :key="line.lineId" class="border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-ledger">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate text-[12px] font-bold tracking-tight text-on-surface">{{ (line.mapped && line.mapped.reference) || '-' }}</div>
                      <div class="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{{ line.status || '-' }}</div>
                    </div>
                    <div class="shrink-0 text-right text-[10px] text-on-surface-variant">{{ (line.mapped && line.mapped.arrivalNote) || '' }}</div>
                  </div>
                  <div class="mt-2 text-[11px] text-on-surface-variant">{{ ((line.mapped && line.mapped.warehouse) || '-') + ((line.validationErrors && line.validationErrors.length) ? (' · ' + line.validationErrors.join(' · ')) : '') }}</div>
                  <div v-if="line.status === 'duplicate'" class="mt-2 flex flex-wrap gap-2">
                    <button class="border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant" type="button" @click="api.handleFinalizeImportLine(line.lineId, 'ignore')">Ignorer</button>
                    <button class="border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant" type="button" @click="api.handleFinalizeImportLine(line.lineId, 'link_existing')">Lier</button>
                  </div>
                  <div v-else-if="line.status === 'valid'" class="mt-2">
                    <button class="bg-surface-tint px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-primary" type="button" @click="api.handleFinalizeImportLine(line.lineId, 'create')">Créer</button>
                  </div>
                </article>
              </template>
              <div v-else class="border border-outline-variant/20 bg-surface-container-lowest px-4 py-5 text-center text-[12px] text-on-surface-variant">Aucune ligne importée.</div>
            </template>

            <template v-else-if="state.referenceImportBatches.length">
              <article v-for="batch in state.referenceImportBatches" :key="batch.batchId" class="border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-ledger">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <button class="truncate text-left text-[12px] font-bold tracking-tight text-primary" type="button" @click="openBatch(batch.batchId)">{{ batch.sourceFileName || batch.batchId || '-' }}</button>
                    <div class="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{{ batch.status || '-' }}</div>
                  </div>
                  <div class="shrink-0 text-right text-[10px] text-on-surface-variant">{{ api.formatDateLabel(batch.createdAt) }}</div>
                </div>
                <div class="mt-2 text-[11px] text-on-surface-variant">{{ 'Lignes ' + ((batch.totals && batch.totals.totalRows) || 0) + ' · Valides ' + ((batch.totals && batch.totals.validRows) || 0) + ' · Doublons ' + ((batch.totals && batch.totals.duplicateRows) || 0) }}</div>
              </article>
            </template>

            <div v-else class="border border-outline-variant/20 bg-surface-container-lowest px-4 py-5 text-center text-[12px] text-on-surface-variant">Aucun batch import pour le moment.</div>
          </div>
        </section>
      </main>
    `
  };

  window.SZVueModules.ImportsScreen = ImportsScreen;
})();
