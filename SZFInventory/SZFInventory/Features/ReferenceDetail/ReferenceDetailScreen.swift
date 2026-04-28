import SwiftUI

struct ReferenceDetailScreen: View {
    @State var model: ReferenceDetailScreenModel

    var body: some View {
        List {
            if let item = model.detail?.item {
                Section("Stock") {
                    detailRow("Référence", item.reference)
                    detailRow("État", item.stockState == .inStock ? "En stock" : "Rupture")
                    detailRow("Stock", item.stockDisplay)
                    detailRow("Entrepôt", item.warehouse)
                    detailRow("到货单", item.arrivalNote)
                    detailRow("Création", item.createdAtRaw ?? "-")
                    detailRow("Remarque", item.remark.isEmpty ? "-" : item.remark)
                }
            } else if model.detail?.notFoundInStock == true {
                Section {
                    ContentUnavailableView("Référence absente du stock", systemImage: "shippingbox.badge.exclamationmark")
                }
            }

            Section("Historique récent") {
                if let history = model.detail?.history, !history.isEmpty {
                    ForEach(history) { entry in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(entry.actionType.label)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(entry.timestampLabel ?? entry.timestampRaw)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Text(entry.afterDisplay.isEmpty ? "-" : entry.afterDisplay)
                                .font(.system(.body, design: .monospaced))
                            if !entry.remark.isEmpty {
                                Text(entry.remark)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                } else if model.isLoading {
                    ProgressView("Chargement…")
                } else {
                    Text("Aucun historique")
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                detailRow("Dernière sync", model.isSyncInProgress ? model.syncInProgressLabel : (model.lastSyncAt.map(DateFormatters.syncTimeString(from:)) ?? "Jamais"))
            }
        }
        .navigationTitle(model.reference)
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if model.isLoading && model.detail == nil {
                ProgressView("Chargement fiche…")
            } else if let errorMessage = model.errorMessage, model.detail == nil {
                ContentUnavailableView("Fiche indisponible", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
            }
        }
        .refreshable {
            model.triggerBackgroundRefresh()
        }
        .task {
            await model.load()
        }
    }

    @ViewBuilder
    private func detailRow(_ title: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value.isEmpty ? "-" : value)
                .multilineTextAlignment(.trailing)
        }
    }
}
