(function() {
  const vue = window.Vue;
  const state = window.__szAppState;
  const api = window.__szAppApi;
  if (!vue || !state || !api) return;
  window.SZVueModules = window.SZVueModules || {};

  const QuickEditOverlay = {
    name: "QuickEditOverlay",
    setup() {
      const item = vue.computed(function() {
        return state.quickEditItem || (state.quickEditItemId ? api.getItemById(state.quickEditItemId) : null);
      });
      const segments = vue.computed(function() {
        return item.value ? api.getQuickExitSegments(item.value) : [];
      });
      const preview = vue.computed(function() {
        return api.computeQuickExitPreview();
      });
      const currentEditState = vue.computed(function() {
        return api.buildCurrentEditStateModel() || item.value;
      });
      const packsHint = vue.computed(function() {
        const currentItem = state.quickEditTab === "quick-exit" ? item.value : currentEditState.value;
        if (!currentItem) return "";
        const packsPerBox = currentItem && currentItem.unitsPerBox && currentItem.colisage
          ? Math.floor((Number(currentItem.unitsPerBox) || 0) / Math.max(1, Number(currentItem.colisage) || 1))
          : 0;
        return api.buildQuickExitPacksHintMarkup(currentItem && currentItem.colisage, packsPerBox);
      });

      function isSelected(segmentId) {
        return !state.quickExitClearSelected && !!api.getQuickExitSelectionConfig(segmentId);
      }

      function toggleSegment(segment) {
        if (!segment) return;
        const selected = isSelected(segment.id);
        if (selected) {
          api.setQuickExitSegmentConfig(segment.id, null);
          delete state.quickExitForm.segments[segment.id];
        } else {
          api.setQuickExitSegmentConfig(segment.id, { entry: "", dropdownOpen: false, highlightedIndex: -1 });
        }
      }

      function segmentConfig(segmentId) {
        return api.getQuickExitSelectionConfig(segmentId) || { entry: "" };
      }

      function updateSegmentEntry(segmentId, value) {
        api.updateQuickExitSegmentConfig(segmentId, "entry", value);
      }

      function applySuggestion(segmentId, suggestion) {
        api.applyQuickExitSuggestionSelection(segmentId, suggestion);
      }

      return {
        state: state,
        api: api,
        item: item,
        segments: segments,
        preview: preview,
        packsHint: packsHint,
        isSelected: isSelected,
        toggleSegment: toggleSegment,
        segmentConfig: segmentConfig,
        updateSegmentEntry: updateSegmentEntry,
        applySuggestion: applySuggestion
      };
    },
    template: `
      <div v-if="state.quickEditOpen && item" class="fixed inset-0 z-[60] flex items-center justify-center bg-on-background/35 px-3 py-6" @click.self="api.closeQuickEdit()">
        <div class="relative max-h-[calc(100dvh-2.5rem)] w-full max-w-3xl overflow-hidden border border-outline-variant/20 bg-surface-container-lowest shadow-[0_18px_48px_rgba(11,15,16,0.18)]">
          <div class="border-b border-outline-variant/20 px-4 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-lg font-black tracking-tight text-on-surface">{{ item.reference || '-' }}</div>
                <div class="mt-1 text-[12px] text-on-surface-variant">{{ item.stockDisplay || '-' }}</div>
              </div>
              <button class="rounded-full p-1 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container" type="button" @click="api.closeQuickEdit()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button :class="['border px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]', state.quickEditTab === 'quick-exit' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 text-on-surface-variant']" type="button" @click="state.quickEditTab = 'quick-exit'; state.quickEditError = ''">Sortie rapide</button>
              <button :class="['border px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]', state.quickEditTab === 'edit' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 text-on-surface-variant']" type="button" @click="state.quickEditTab = 'edit'; state.quickEditError = ''">Ajustement</button>
            </div>
          </div>

          <div class="inventory-scroll max-h-[calc(100dvh-12rem)] overflow-y-auto px-4 py-4">
            <template v-if="state.quickEditTab === 'quick-exit'">
              <div class="rounded border border-outline-variant/20 bg-surface-container-low px-3 py-3">
                <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Stock courant</div>
                <div class="mt-2 text-sm font-semibold text-on-surface">{{ item.stockDisplay || '-' }}</div>
                <div v-if="packsHint" class="mt-2 text-[10px] text-on-surface-variant" v-html="packsHint"></div>
              </div>

              <div class="mt-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Segments de sortie</div>
                  <button :class="['rounded border px-2 py-1 text-[10px] font-bold tracking-[0.12em]', state.quickExitClearSelected ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 text-on-surface-variant']" type="button" @click="api.setQuickExitClearSelected(!state.quickExitClearSelected)">Vider</button>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button v-for="segment in segments" :key="segment.id" :class="['inline-flex items-center rounded border px-2 py-1 text-sm font-semibold', isSelected(segment.id) ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 text-primary']" type="button" @click="toggleSegment(segment)">
                    {{ segment.label || segment.id }}
                  </button>
                </div>
              </div>

              <div v-if="!state.quickExitClearSelected" class="mt-4 grid gap-3">
                <div v-for="segment in segments.filter(s => isSelected(s.id))" :key="segment.id" class="rounded border border-outline-variant/20 bg-surface-container-low px-3 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{{ segment.id === 'tail' ? '尾箱' : '箱' }}</div>
                  <div class="mt-1 text-sm font-semibold text-on-surface">{{ segment.label }}</div>
                  <input :value="segmentConfig(segment.id).entry || ''" class="mt-3 w-full border-outline-variant/30 bg-surface-container-lowest px-2 py-2 text-[12px] text-on-surface" :placeholder="segment.id === 'tail' ? '(x)/3包/1/2' : '2箱/5包/1/2'" type="text" @input="updateSegmentEntry(segment.id, $event.target.value)" />
                  <div class="mt-2 flex flex-wrap gap-1">
                    <button v-for="suggestion in api.buildQuickExitSuggestions(item, segment, segmentConfig(segment.id).entry || '')" :key="segment.id + '::' + suggestion" class="rounded border border-outline-variant/30 px-2 py-1 text-[10px] font-semibold text-on-surface-variant" type="button" @click="applySuggestion(segment.id, suggestion)">
                      {{ suggestion }}
                    </button>
                  </div>
                  <div v-if="state.quickExitSegmentErrors && state.quickExitSegmentErrors[segment.id]" class="mt-2 text-[11px] font-medium text-error">{{ state.quickExitSegmentErrors[segment.id] }}</div>
                </div>
              </div>

              <div class="mt-4 rounded border border-outline-variant/20 bg-surface-container-low px-3 py-3">
                <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Preview après sortie</div>
                <div class="mt-1 text-[13px] font-black tracking-tight text-on-surface">{{ preview || '-' }}</div>
              </div>
            </template>

            <template v-else>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">尾箱</span>
                  <input :value="state.quickEditForm && state.quickEditForm.tailInput || ''" class="w-full border-outline-variant/30 bg-surface-container-low px-2 py-2 text-[16px] leading-tight font-medium text-on-surface md:text-sm" placeholder="(85p)" type="text" @input="api.handleQuickEditFieldChange('tailInput', $event.target.value)" @blur="api.normalizeQuickEditFieldOnBlur('tailInput')" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">件/箱</span>
                  <input :value="state.quickEditForm && state.quickEditForm.unitsPerBoxInput || ''" class="w-full border-outline-variant/30 bg-surface-container-low px-2 py-2 text-[16px] leading-tight font-medium text-on-surface md:text-sm" placeholder="144p" type="text" @input="api.handleQuickEditFieldChange('unitsPerBoxInput', $event.target.value)" @blur="api.normalizeQuickEditFieldOnBlur('unitsPerBoxInput')" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">箱数</span>
                  <input :value="state.quickEditForm && state.quickEditForm.itemBoxes || ''" class="w-full border-outline-variant/30 bg-surface-container-low px-2 py-2 text-[16px] leading-tight font-medium text-on-surface md:text-sm" inputmode="numeric" type="number" @input="api.handleQuickEditFieldChange('itemBoxes', $event.target.value)" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">符号</span>
                  <select :value="state.quickEditForm && state.quickEditForm.sign || '+'" class="w-full border-outline-variant/30 bg-surface-container-low px-2 py-2 text-[16px] leading-tight font-medium text-on-surface md:text-sm" @change="api.handleQuickEditFieldChange('sign', $event.target.value)">
                    <option value="+">+</option>
                    <option value="×">×</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Fraction</span>
                  <input :value="state.quickEditForm && state.quickEditForm.fractionText || ''" class="w-full border-outline-variant/30 bg-surface-container-low px-2 py-2 text-[16px] leading-tight font-medium text-on-surface md:text-sm" placeholder="1/2" type="text" @input="api.handleQuickEditFieldChange('fractionText', $event.target.value)" @blur="api.normalizeQuickEditFieldOnBlur('fractionText')" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">包 符号</span>
                  <select :value="state.quickEditForm && state.quickEditForm.packNotationSign || '+'" class="w-full border-outline-variant/30 bg-surface-container-low px-2 py-2 text-[16px] leading-tight font-medium text-on-surface md:text-sm" @change="api.handleQuickEditFieldChange('packNotationSign', $event.target.value)">
                    <option value="+">+</option>
                    <option value="-">-</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">包</span>
                  <input :value="state.quickEditForm && state.quickEditForm.packNotationCount || ''" class="w-full border-outline-variant/30 bg-surface-container-low px-2 py-2 text-[16px] leading-tight font-medium text-on-surface md:text-sm" inputmode="numeric" min="0" step="1" type="number" @input="api.handleQuickEditFieldChange('packNotationCount', $event.target.value)" />
                </label>
              </div>
            </template>

            <label class="mt-4 block">
              <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Commentaire mouvement</span>
              <textarea :value="state.quickEditForm && state.quickEditForm.remark || ''" class="min-h-[7rem] w-full border-outline-variant/30 bg-surface-container-low text-[16px] leading-tight text-on-surface md:text-sm" maxlength="240" placeholder="Commentaire pour l'historique" @input="api.handleQuickEditFieldChange('remark', $event.target.value)"></textarea>
            </label>

            <p v-if="state.quickEditError" class="mt-3 rounded border border-error/20 bg-error-container/20 px-3 py-2 text-[11px] font-medium text-on-error-container">{{ state.quickEditError }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3 border-t border-outline-variant/20 bg-surface-container-low px-4 py-4">
            <button class="border border-outline-variant/30 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors duration-150 hover:bg-surface-container" type="button" @click="api.closeQuickEdit()">ANNULER</button>
            <button class="bg-surface-tint py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-primary transition-colors duration-150 hover:bg-primary-dim" type="button" @click="api.handleQuickEditSave()">{{ state.quickEditTab === 'quick-exit' ? 'APPLIQUER LA SORTIE' : 'ENREGISTRER' }}</button>
          </div>
        </div>
      </div>
    `
  };

  window.SZVueModules.QuickEditOverlay = QuickEditOverlay;
})();
