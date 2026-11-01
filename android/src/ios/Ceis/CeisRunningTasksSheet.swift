import SwiftUI

// MARK: - Running tasks link (above the composer)

/// A small tappable link showing how many agent sessions are running on other
/// chats. Matches the Android placement above the composer. Hidden at zero.
/// Tapping opens CeisRunningTasksSheet.
/// (recon: "N running tasks" link, tasks area, should priority)
struct CeisRunningTasksLink: View {
    /// The current chat's session ID — excluded from the running count so the
    /// link counts only the other chats.
    var currentSessionId: String?
    @State private var showSheet = false
    @ObservedObject private var tracker = SessionActivityTracker.shared

    private var runningCount: Int {
        var active = tracker.activeSessions
        if let sid = currentSessionId { active.remove(sid) }
        return active.count
    }

    var body: some View {
        if runningCount > 0 {
            Button {
                showSheet = true
            } label: {
                Text(runningTasksLabel(runningCount))
                    .font(.footnote)
                    .foregroundStyle(CeisTones.action)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16)
            .padding(.bottom, 6)
            .sheet(isPresented: $showSheet) {
                CeisRunningTasksSheet(currentSessionId: currentSessionId)
            }
        }
    }

    private func runningTasksLabel(_ n: Int) -> String {
        n == 1
            ? AppLocalized("1 task running in another chat")
            : String(format: AppLocalized("%d tasks running in other chats"), n)
    }
}

// MARK: - Running tasks sheet

/// Bottom sheet listing every session that is currently running on another
/// chat. Peek and full height via SwiftUI presentationDetents (iOS 16+).
/// (recon: TaskSheet, S03 / S04)
struct CeisRunningTasksSheet: View {
    var currentSessionId: String?
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var tracker = SessionActivityTracker.shared

    private var runningIds: [String] {
        var active = Array(tracker.activeSessions).sorted()
        if let sid = currentSessionId { active.removeAll { $0 == sid } }
        return active
    }

    var body: some View {
        NavigationView {
            List {
                if runningIds.isEmpty {
                    Text(AppLocalized("No other tasks are running."))
                        .foregroundStyle(.secondary)
                        .listRowBackground(Color.clear)
                } else {
                    Section(header: Text(AppLocalized("Running"))) {
                        ForEach(runningIds, id: \.self) { sessionId in
                            CeisRunningTaskRow(sessionId: sessionId)
                        }
                    }
                }
            }
            .navigationTitle(AppLocalized("Running Tasks"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(AppLocalized("Done")) { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Single task row

private struct CeisRunningTaskRow: View {
    let sessionId: String
    @ObservedObject private var tracker = SessionActivityTracker.shared

    private var info: SessionActivityTracker.SessionToolInfo? {
        tracker.sessionToolInfo[sessionId]
    }

    var body: some View {
        HStack(spacing: 12) {
            // Activity indicator
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(0.8)

            VStack(alignment: .leading, spacing: 2) {
                let title = info?.title.isEmpty == false ? info!.title : AppLocalized("Chat")
                Text(title)
                    .font(.body)
                    .lineLimit(1)
                if let toolName = info?.toolName, !toolName.isEmpty {
                    Text(toolName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 2)
    }
}
