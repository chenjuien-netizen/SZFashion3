(function() {
  const vue = window.Vue;
  const state = window.__szAppState;
  const api = window.__szAppApi;
  if (!vue || !state || !api) return;
  window.SZVueModules = window.SZVueModules || {};

  const TicketsScreen = {
    name: "TicketsScreen",
    setup() {
      const filteredTickets = vue.computed(function() {
        return api.filterPickupTickets(state.ticketsQuery, state.ticketsPeriod, state.ticketsStatusFilter);
      });
      const selectedVm = vue.computed(function() {
        return state.pickupTicket ? api.getPickupTicketViewModel(state.pickupTicket) : null;
      });
      const groupedTickets = vue.computed(function() {
        let lastGroup = "";
        return filteredTickets.value.reduce(function(list, ticket) {
          const group = api.getPickupTicketDateGroupLabel(ticket && ticket.createdAt);
          if (group !== lastGroup) {
            list.push({ type: "group", key: "group::" + group, label: group });
            lastGroup = group;
          }
          list.push({ type: "ticket", key: "ticket::" + (ticket.ticketId || ""), ticket: ticket });
          return list;
        }, []);
      });
      const ticketReferenceSuggestions = vue.computed(function() {
        return api.getReferenceSuggestions(state.ticketCreationDraft && state.ticketCreationDraft.quickReference, { limit: 8 });
      });
      function openTicket(ticketId) {
        api.navigateTo("tickets", { ref: ticketId });
      }

      function togglePreview(ticketId) {
        state.expandedTicketIds[ticketId] = !state.expandedTicketIds[ticketId];
      }

      function removeDraftLine(index) {
        api.removePickupTicketDraftLine(index);
      }

      function addDraftLine() {
        api.addPickupTicketDraftLineFromFields();
      }

      function addDraftTextLines() {
        api.addPickupTicketDraftLinesFromText();
      }

      function createTicket() {
        api.createPickupTicketFromDraft();
      }

      function openCreateQuantityDropdown(event) {
        api.openTicketQuantityDropdown(event.target, event.target.value || "");
      }

      function openLineQuantityDropdown(event) {
        api.openTicketQuantityDropdown(event.target, event.target.value || "");
      }

      function saveLine(ticketId, lineId) {
        api.handleSavePickupTicketLine(ticketId, lineId);
      }

      function markLineNotFound(ticketId, lineId) {
        api.handleMarkPickupTicketLineNotFound(ticketId, lineId);
      }

      function emptyLine(ticketId, lineId) {
        api.handleEmptyPickupTicketLine(ticketId, lineId);
      }

      function editLine(ticketId, lineId) {
        api.handleEditPickupTicketLine(ticketId, lineId);
      }

      function validateTicket(ticketId) {
        api.handleValidateTicket(ticketId);
      }

      function lineDraft(line) {
        return api.getPickupLineDraft(line);
      }

      function linePreview(line) {
        return api.buildPickupLinePreview(line, lineDraft(line));
      }

      function getPreviewLines(ticket) {
        const vm = api.getPickupTicketViewModel(ticket.ticketId);
        const detailLines = vm && vm.lines && vm.lines.length ? vm.lines : [];
        return detailLines.length ? detailLines : [];
      }

      return {
        state: state,
        api: api,
        filteredTickets: filteredTickets,
        groupedTickets: groupedTickets,
        selectedVm: selectedVm,
        openTicket: openTicket,
        togglePreview: togglePreview,
        removeDraftLine: removeDraftLine,
        addDraftLine: addDraftLine,
        addDraftTextLines: addDraftTextLines,
        createTicket: createTicket,
        openCreateQuantityDropdown: openCreateQuantityDropdown,
        openLineQuantityDropdown: openLineQuantityDropdown,
        saveLine: saveLine,
        markLineNotFound: markLineNotFound,
        emptyLine: emptyLine,
        editLine: editLine,
        validateTicket: validateTicket,
        lineDraft: lineDraft,
        linePreview: linePreview,
        getPreviewLines: getPreviewLines,
        ticketReferenceSuggestions: ticketReferenceSuggestions
      };
    },
    template: `
      <main id="pickupTicketsContentWrap" class="relative flex h-full min-h-0 flex-col overflow-hidden">
        <div class="sticky top-0 z-40 shrink-0 bg-background">
          <header class="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
            <div class="flex min-w-0 items-center gap-3">
              <button aria-label="Retour" class="rounded-full p-1 text-slate-700 transition-colors duration-150 hover:bg-slate-100" type="button" @click="api.navigateTo('tickets')">
                <span class="material-symbols-outlined">arrow_back</span>
              </button>
              <div class="min-w-0">
                <h1 class="truncate text-lg font-extrabold uppercase tracking-tight text-slate-900">Tickets sortie</h1>
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{{ state.ticketsSubview === 'new' ? 'Nouveau ticket' : (state.ticketsSubview === 'detail' ? 'Détail ticket' : 'Sorties entrepôt') }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="state.ticketsSubview === 'list'" class="border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant transition-colors duration-150 hover:bg-surface-container" type="button" @click="api.navigateTo('tickets_new')">Nouveau ticket</button>
              <button class="border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant transition-colors duration-150 hover:bg-surface-container" type="button" @click="api.loadPickupTicketData(state.pickupTicket, { includeDetail: Boolean(state.pickupTicket) })">Rafraîchir</button>
            </div>
          </header>
        </div>

        <section class="inventory-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-outline-variant/20">
          <div class="flex flex-col gap-3 px-3 py-3">
            <template v-if="state.ticketsSubview === 'new'">
              <section class="border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-ledger">
                <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Création par lignes</div>
                <div class="mt-2 grid gap-2">
                  <div class="grid grid-cols-2 gap-2">
                    <input v-model="state.ticketCreationDraft.title" autocomplete="off" class="min-w-0 border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[12px] text-on-surface" placeholder="Titre (optionnel)" type="text" />
                    <input v-model="state.ticketCreationDraft.globalNote" autocomplete="off" class="min-w-0 border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[12px] text-on-surface" placeholder="Remarque / note (optionnel)" type="text" />
                  </div>
                  <div class="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] gap-2">
                    <input v-model="state.ticketCreationDraft.quickReference" autocomplete="off" class="min-w-0 border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[12px] text-on-surface" list="ticketReferenceSuggestions" placeholder="Référence" type="text" />
                    <datalist id="ticketReferenceSuggestions">
                      <option v-for="entry in ticketReferenceSuggestions" :key="entry.reference" :value="entry.reference">{{ entry.label }}</option>
                    </datalist>
                    <input id="pickupTicketQuickQuantityInput" v-model="state.ticketCreationDraft.quickQuantity" autocomplete="off" class="border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-center text-[12px] text-on-surface" inputmode="decimal" placeholder="2箱" type="text" @focus="openCreateQuantityDropdown" @input="openCreateQuantityDropdown" />
                    <button class="border border-outline-variant/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant" type="button" @click="addDraftLine">Ajouter</button>
                  </div>
                </div>
                <div class="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Saisie rapide</div>
                <textarea v-model="state.ticketCreationDraft.requestTextRaw" class="mt-2 min-h-[7rem] w-full border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[12px] text-on-surface" placeholder="REF&#10;REF 2箱&#10;REF 5包"></textarea>
                <button class="mt-2 border border-outline-variant/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant" type="button" @click="addDraftTextLines">Ajouter au ticket</button>
                <div class="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Lignes prêtes</div>
                <div v-if="state.ticketCreationDraft.lines.length" class="mt-2 flex flex-col gap-2">
                  <div v-for="(line, index) in state.ticketCreationDraft.lines" :key="line.reference + '::' + index" class="flex items-center justify-between gap-3 border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-[11px]">
                    <div class="min-w-0">
                      <div class="truncate font-semibold text-on-surface">{{ line.reference || '-' }}</div>
                      <div class="text-on-surface-variant">{{ api.buildRequestedDisplayFromDraftLine(line) || 'À confirmer' }}</div>
                    </div>
                    <button class="shrink-0 border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant" type="button" @click="removeDraftLine(index)">Retirer</button>
                  </div>
                </div>
                <div v-else class="mt-2 text-[11px] text-on-surface-variant">Ajoute au moins une ligne avant de créer le ticket.</div>
                <button class="mt-4 bg-surface-tint px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary transition-colors duration-150 hover:bg-primary-dim" type="button" @click="createTicket">Créer ticket</button>
              </section>
            </template>

            <template v-else-if="state.ticketsSubview === 'detail'">
              <template v-if="selectedVm && selectedVm.hasDetail">
                <section class="border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-ledger">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate text-[13px] font-black tracking-tight text-on-surface">{{ api.formatPickupTicketNumberForDisplay(selectedVm.ticket.ticketNumber || '-') }}</div>
                      <div class="mt-1 text-[11px] text-on-surface-variant">{{ api.getPickupTicketUiStatus(selectedVm.ticket.status) + ' · ' + api.formatDateTimeLabel(selectedVm.ticket.createdAt) }}</div>
                    </div>
                    <button v-if="selectedVm.canValidate" class="shrink-0 bg-surface-tint px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-primary" type="button" @click="validateTicket(selectedVm.ticket.ticketId)">Valider</button>
                  </div>
                  <div v-if="api.getPickupTicketTitleNoteLabel(selectedVm.ticket)" class="mt-2 text-[12px] font-semibold text-on-surface">{{ api.getPickupTicketTitleNoteLabel(selectedVm.ticket) }}</div>
                </section>

                <article v-for="line in selectedVm.lines" :key="line.lineId" :class="['border px-3 py-2 shadow-ledger', api.getPickupLineTone(line.status).article]">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span :class="['h-2 w-2 shrink-0 rounded-full', api.getPickupLineTone(line.status).dot]"></span>
                        <div class="truncate text-[12px] font-bold tracking-tight text-primary">{{ line.reference || '-' }}</div>
                      </div>
                      <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-on-surface-variant">
                        <span v-if="line.warehouseHelpDisplay || api.getPickupLineAvailableStockDisplay(line)" class="font-semibold text-on-surface-variant">{{ [String(line.warehouseHelpDisplay || '').trim(), api.getPickupLineAvailableStockDisplay(line)].filter(Boolean).join(' · ') }}</span>
                        <span>{{ linePreview(line).requested }}</span>
                        <span v-if="linePreview(line).pickedLabel" class="font-semibold text-on-surface">{{ linePreview(line).pickedLabel }}</span>
                        <span v-if="linePreview(line).projectedStock" class="basis-full font-semibold text-primary md:basis-auto">{{ linePreview(line).projectedStock }}</span>
                      </div>
                    </div>
                    <div :class="['shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em]', api.getPickupLineTone(line.status).badge]">{{ api.getPickupLineUiStatus(line.status) }}</div>
                  </div>

                  <div v-if="api.isPickupLineLocked(selectedVm.ticket, line)" class="mt-2 flex items-center justify-between gap-2">
                    <div class="min-w-0 text-[11px] text-on-surface-variant">
                      <span v-if="line.lineNote">{{ line.lineNote }}</span>
                      <span v-else class="text-outline">Aucun commentaire</span>
                    </div>
                    <button v-if="api.canEditPickupTicket(selectedVm.ticket)" class="shrink-0 border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant" type="button" @click="editLine(selectedVm.ticket.ticketId, line.lineId)">Modifier</button>
                  </div>

                  <div v-else class="sz-ticket-line-editor mt-2 grid gap-2">
                    <div class="sz-ticket-line-row grid items-center gap-2">
                      <input
                        :data-line-id="line.lineId"
                        data-role="ticket-line-picked-input"
                        v-model="lineDraft(line).pickedInput"
                        autocomplete="off"
                        class="min-w-0 border-outline-variant/30 bg-surface-container-lowest px-2 py-1 text-center text-[12px] text-on-surface"
                        inputmode="decimal"
                        placeholder="2箱"
                        type="text"
                        @focus="openLineQuantityDropdown"
                        @input="openLineQuantityDropdown"
                      />
                      <input :data-line-id="line.lineId" data-role="ticket-line-note-input" v-model="lineDraft(line).lineNote" autocomplete="off" class="min-w-0 w-full border-outline-variant/30 bg-surface-container-lowest px-2 py-1 text-[12px] text-on-surface" :placeholder="line.status === 'not_found' ? 'Précision introuvable...' : 'Commentaire'" type="text" />
                      <button aria-label="Confirmer la ligne" title="Confirmer" class="sz-ticket-line-action-btn border border-outline-variant/30 text-on-surface-variant" type="button" @click="saveLine(selectedVm.ticket.ticketId, line.lineId)">
                        <span class="material-symbols-outlined !text-[16px]">check</span>
                      </button>
                      <button aria-label="Marquer introuvable" title="Introuvable" class="sz-ticket-line-action-btn border border-outline-variant/30 text-on-surface-variant" type="button" @click="markLineNotFound(selectedVm.ticket.ticketId, line.lineId)">
                        <span class="text-[15px] font-black leading-none">?</span>
                      </button>
                      <button aria-label="Vider la ligne" title="Vider" class="sz-ticket-line-action-btn border border-outline-variant/30 text-on-surface-variant" type="button" @click="emptyLine(selectedVm.ticket.ticketId, line.lineId)">
                        <span class="text-[13px] font-black leading-none">空</span>
                      </button>
                    </div>
                    <div v-if="lineDraft(line).error" class="text-[11px] font-medium text-error">{{ lineDraft(line).error }}</div>
                  </div>
                </article>

                <section class="border border-outline-variant/20 bg-surface-container-lowest p-3">
                  <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Historique ticket</div>
                  <div v-if="api.compactPickupTicketEventsForDisplay(selectedVm.events).length" class="mt-2 flex flex-col gap-2">
                    <div v-for="event in api.compactPickupTicketEventsForDisplay(selectedVm.events)" :key="event.eventId || event.createdAt" class="border-t border-outline-variant/10 pt-2 text-[11px] text-on-surface-variant">
                      <div>{{ api.formatDateTimeLabel(event.createdAt) + ' · ' + (api.getPickupTicketEventReference(event, selectedVm.lines) ? (api.getPickupTicketEventReference(event, selectedVm.lines) + ' · ') : '') + api.buildPickupTicketEventDisplayLabel(event, selectedVm.lines) }}</div>
                      <div v-if="event.message && event.message !== api.getPickupTicketEventLabel(event) && event.message !== api.buildPickupTicketEventDisplayLabel(event, selectedVm.lines)" class="mt-0.5 text-[10px]">{{ event.message }}</div>
                    </div>
                  </div>
                  <div v-else class="mt-2 text-[11px] text-on-surface-variant">Aucun événement.</div>
                </section>
              </template>
              <div v-else-if="state.pickupTicketMissingConfirmed" class="border border-outline-variant/20 bg-surface-container-lowest px-4 py-5 text-center text-[12px] text-on-surface-variant">Ticket introuvable.</div>
              <section v-else class="border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-ledger">
                <div class="mt-3 flex flex-col gap-2">
                  <div class="h-14 animate-pulse border border-outline-variant/20 bg-surface-container-low"></div>
                  <div class="h-14 animate-pulse border border-outline-variant/20 bg-surface-container-low"></div>
                  <div class="h-14 animate-pulse border border-outline-variant/20 bg-surface-container-low"></div>
                </div>
              </section>
            </template>

            <template v-else>
              <template v-if="!state.pickupTicketsBootstrapReady">
                <section class="border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-ledger">
                  <div class="mt-1 flex flex-col gap-2">
                    <div class="h-14 animate-pulse border border-outline-variant/20 bg-surface-container-low"></div>
                    <div class="h-14 animate-pulse border border-outline-variant/20 bg-surface-container-low"></div>
                    <div class="h-14 animate-pulse border border-outline-variant/20 bg-surface-container-low"></div>
                  </div>
                </section>
              </template>
              <template v-else>
              <section class="sticky top-0 z-20 border-b border-outline-variant/20 bg-surface-container-low px-3 py-2 shadow-ledger">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-on-surface-variant !text-[16px]">search</span>
                  <input v-model="state.ticketsQuery" autocomplete="off" class="w-full border-none bg-transparent p-0 text-[10px] font-medium tracking-tight text-on-surface placeholder:text-outline focus:ring-0" placeholder="RECHERCHE NUMÉRO / RÉF / TITRE..." type="search" />
                </div>
                <div class="mt-2 grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                  <label class="min-w-0">
                    <select v-model="state.ticketsPeriod" class="w-full border-outline-variant/30 bg-surface-container-lowest text-[12px] font-medium text-on-surface">
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois</option>
                      <option value="all">Tout</option>
                    </select>
                  </label>
                  <label class="min-w-0 flex-1">
                    <select v-model="state.ticketsStatusFilter" class="w-full border-outline-variant/30 bg-surface-container-lowest text-[12px] font-medium text-on-surface">
                      <option value="">Tous statuts</option>
                      <option value="draft">Brouillon</option>
                      <option value="in_progress">En cours</option>
                      <option value="validated">Validé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </label>
                  <div class="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{{ api.getSyncStatusLabel((state.ticketsQuery || (state.ticketsPeriod && state.ticketsPeriod !== 'all') || state.ticketsStatusFilter) ? 'Filtré' : 'Pret') }}</div>
                </div>
              </section>

              <section class="flex flex-col gap-3">
                <template v-if="filteredTickets.length">
                  <template v-for="entry in groupedTickets" :key="entry.key">
                    <div v-if="entry.type === 'group'" class="sticky top-0 z-10 border-y border-outline-variant/20 bg-surface-container-high px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{{ entry.label }}</div>
                    <article v-else :class="['border p-3 shadow-ledger', api.getPickupTicketTone(entry.ticket.status).article]">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <button class="truncate text-left text-[12px] font-bold tracking-tight text-primary" type="button" @click="openTicket(entry.ticket.ticketId)">{{ api.formatPickupTicketNumberForDisplay(entry.ticket.ticketNumber || '-') }}</button>
                          <div :class="['mt-1 inline-flex rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em]', api.getPickupTicketTone(entry.ticket.status).badge]">{{ api.getPickupTicketUiStatus(entry.ticket.status) }}</div>
                        </div>
                        <div class="shrink-0 text-right text-[10px] text-on-surface-variant">{{ api.formatDateLabel(entry.ticket.createdAt) }}</div>
                      </div>
                      <div v-if="[api.getPickupTicketTitleNoteLabel(entry.ticket), api.formatTicketLineCountLabel(entry.ticket.lineCount)].filter(Boolean).length" class="mt-2 text-[11px] text-on-surface-variant">{{ [api.getPickupTicketTitleNoteLabel(entry.ticket), api.formatTicketLineCountLabel(entry.ticket.lineCount)].filter(Boolean).join(' · ') }}</div>
                      <div class="mt-1 text-[11px] font-medium text-on-surface">{{ api.getTicketRefsPreview(entry.ticket) }}</div>
                      <div class="mt-2 flex items-center justify-between gap-2">
                        <div :class="['text-[10px] uppercase tracking-[0.14em]', api.getPickupTicketTone(entry.ticket.status).counter]">{{ api.formatTicketResolvedCountLabel(entry.ticket.resolvedLineCount, entry.ticket.lineCount) }}</div>
                        <button class="border border-outline-variant/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant" type="button" @click="togglePreview(entry.ticket.ticketId)">{{ state.expandedTicketIds[entry.ticket.ticketId] ? 'Masquer refs' : 'Afficher refs' }}</button>
                      </div>
                      <div v-if="state.expandedTicketIds[entry.ticket.ticketId] && getPreviewLines(entry.ticket).length" class="mt-2 flex flex-col gap-1 border-t border-outline-variant/20 pt-2">
                        <div v-for="line in getPreviewLines(entry.ticket)" :key="line.lineId || line.reference" class="flex items-center justify-between gap-3 rounded border border-outline-variant/10 px-2 py-1 text-[11px] text-on-surface-variant">
                          <div class="flex min-w-0 items-center gap-2">
                            <span :class="['h-2 w-2 shrink-0 rounded-full', api.getPickupLineTone(line.status).dot]"></span>
                            <span class="truncate">{{ line.reference || '-' }}<span v-if="api.getPickupLineAvailableStockDisplay(line)">{{ ' · ' + api.getPickupLineAvailableStockDisplay(line) }}</span></span>
                          </div>
                          <span class="shrink-0">{{ line.status === 'not_found' ? 'introuvable' : (line.pickedDisplay ? ((api.buildRequestedDisplayFromDraftLine(line) || line.requestedDisplay || 'À confirmer') + ' -> ' + line.pickedDisplay + (api.buildPickupLinePreview(line, null).projectedStock ? (' · ' + api.buildPickupLinePreview(line, null).projectedStock) : '')) : (api.buildRequestedDisplayFromDraftLine(line) || line.requestedDisplay || 'À confirmer')) }}</span>
                        </div>
                      </div>
                    </article>
                  </template>
                </template>
                <div v-else class="border border-outline-variant/20 bg-surface-container-lowest px-4 py-5 text-center text-[12px] text-on-surface-variant">Aucun ticket sortie pour le moment.</div>
              </section>
              </template>
            </template>
          </div>
        </section>
        <div id="ticketQuantityDropdownLayer" class="pointer-events-none absolute inset-0 z-20 hidden"></div>
      </main>
    `
  };

  window.SZVueModules.TicketsScreen = TicketsScreen;
})();
