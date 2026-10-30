//
//  CeisAgentPage.swift
//  ceis
//
//  What opens when the face is tapped: the agent's own page. The face,
//  large, with a pen badge (Change avatar / Edit name / Your own clip… / Avatar studio…),
//  the name, "online", and four panes — Activity (the last two days as a
//  log), Approvals (what is always allowed), Daily (the routines), Soul &
//  memory (the files). Plus the share cards for a new look.
//  Android: ui/profile/AgentProfileScreen.kt, ui/avatar/AvatarShareSheet.kt, avatar/AvatarShare.kt.
//

import SwiftUI
import UIKit

extension Notification.Name {
    /// The face was tapped: present the agent page.
    static let ceisOpenAgentPage = Notification.Name("ceis.openAgentPage")
    /// Put words into the composer of a chat. object: target id (session or draft); userInfo["text"].
    static let ceisComposerPrefill = Notification.Name("ceis.composerPrefill")
    /// Switch to Goals and scroll to routines.
    static let ceisOpenRoutines = Notification.Name("ceis.openRoutines")
}

// MARK: - Page

struct CeisAgentPage: View {
    /// Open a conversation (the shell switches to it).
    var onOpenSession: (String) -> Void
    /// "Change avatar": the chat gets "Change your avatar to " pre-typed.
    var onPrefillChat: (String) -> Void
    /// "Manage routines" → the Goals room.
    var onOpenRoutines: () -> Void

    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var faces = CeisFaceStore.shared
    @ObservedObject private var flow = CeisAvatarFlow.shared
    @ObservedObject private var own = CeisOwnClip.shared
    @StateObject private var clipPicker = CeisOwnClipPicker()
    @State private var pane = 0
    @State private var showShare = false
    @State private var showEditName = false
    @State private var soulName = SoulStore.cachedMetadata.name
    /// The name under the face follows Dynamic Type, capped as the header's lines are (CeisHeaderMetrics).
    @ScaledMetric(relativeTo: .title2) private var nameSize: CGFloat = 24

    private var name: String {
        let n = soulName.trimmingCharacters(in: .whitespaces)
        return n.isEmpty ? "ceis" : n
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    header
                    paneSwitch
                        .padding(.top, 18)
                        .padding(.horizontal, 16)
                    Group {
                        switch pane {
                        case 0: CeisActivityPane(onOpenSession: { id in dismiss(); onOpenSession(id) })
                        case 1: CeisApprovalsPane()
                        case 2: CeisDailyPane(onOpenSession: { id in dismiss(); onOpenSession(id) }, onManage: { dismiss(); onOpenRoutines() })
                        default: CeisSoulPane(name: name, onEditName: { showEditName = true })
                        }
                    }
                    .padding(.top, 14)
                    .padding(.bottom, 24)
                }
            }
            .background(CeisTones.canvas.ignoresSafeArea())
            // Muse's chrome (Android: AgentProfileScreen): a round close disc and a round share disc, no bar.
            .toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .top, spacing: 0) {
                HStack {
                    CeisRoundButton(symbol: "xmark", label: AppLocalized("Close")) { dismiss() }
                    Spacer()
                    CeisRoundButton(symbol: "square.and.arrow.up", label: AppLocalized("Share avatar")) { showShare = true }
                }
                .padding(.horizontal, 16)
                .padding(.top, 10)
                .padding(.bottom, 2)
            }
            .sheet(isPresented: $showShare) { CeisAvatarShareSheet(agentName: name) }
            .sheet(isPresented: $showEditName) {
                NavigationStack { SoulSettingsView() }
            }
            .ceisOwnClipHost(clipPicker)
            .onReceive(NotificationCenter.default.publisher(for: .soulMdChanged)) { _ in
                soulName = SoulStore.cachedMetadata.name
            }
        }
    }

    // MARK: Header

    private var header: some View {
        VStack(spacing: 10) {
            ZStack(alignment: .bottomTrailing) {
                CeisFaceView(mood: .idle, size: 132)
                Menu {
                    Button {
                        dismiss()
                        onPrefillChat(AppLocalized("Change your avatar to "))
                    } label: { Label(AppLocalized("Change avatar"), systemImage: "paintbrush") }
                    Button { showEditName = true } label: { Label(AppLocalized("Edit name"), systemImage: "pencil") }
                    // A clip of the person's own as the face (#324), and the way back.
                    Button { clipPicker.choose() } label: { Label(AppLocalized("Your own clip…"), systemImage: "film") }
                    if own.clip != nil {
                        Button { own.clear() } label: { Label(AppLocalized("Default face"), systemImage: "arrow.uturn.backward") }
                    }
                    NavigationLink { CeisAvatarStudioView(embedded: true) } label: { Label(AppLocalized("Avatar studio…"), systemImage: "wand.and.stars") }
                } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.primary)
                        .frame(width: 30, height: 30)
                        .background(CeisTones.surface, in: Circle())
                        .overlay(Circle().strokeBorder(CeisTones.hairline, lineWidth: 0.5))
                }
                .offset(x: 2, y: 2)
                .accessibilityLabel(Text(AppLocalized("Edit")))
            }
            .padding(.top, 8)
            Text(name).font(.system(size: CeisHeaderMetrics.capped(nameSize, base: 24), weight: .bold))
            HStack(spacing: 6) {
                Circle().fill(Color.green).frame(width: 8, height: 8)
                Text(flow.statusLine ?? CeisAvatarStudioModel.shared.headerStatus ?? CeisAvatarMotion.shared.statusLine ?? AppLocalized("online"))
                    .font(.subheadline).foregroundStyle(.secondary)
            }
        }
    }

    private var paneSwitch: some View {
        let items: [(String, String)] = [
            ("list.bullet.rectangle", AppLocalized("Activity")),
            ("checkmark.shield", AppLocalized("Approvals")),
            ("clock", AppLocalized("Daily")),
            ("doc.text", AppLocalized("Soul & memory")),
        ]
        return HStack(spacing: 6) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { pane = index }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: item.0).font(.system(size: 16, weight: .medium))
                        Text(item.1).font(.caption2).lineLimit(1).minimumScaleFactor(0.8)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(pane == index ? CeisTones.surface : Color.clear, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .foregroundStyle(pane == index ? Color.primary : Color.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(pane == index ? .isSelected : [])
            }
        }
        .padding(4)
        .background(CeisTones.fill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

// MARK: - Shared bits

private struct CeisSectionLabel: View {
    var text: String
    var body: some View {
        Text(text)
            .font(.footnote.weight(.semibold))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.top, 6)
            .padding(.bottom, 4)
    }
}

private struct CeisEmptyNote: View {
    var text: String
    var body: some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
    }
}

private struct CeisManageRow: View {
    var text: String
    var action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack {
                Text(text).font(.body.weight(.medium))
                Spacer()
                Image(systemName: "chevron.right").font(.footnote).foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(CeisTones.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 16)
        .padding(.top, 10)
    }
}

// MARK: - Activity

/// One request and what the agent did about it.
struct CeisActivityEntry: Identifiable, Equatable {
    var id: String { "\(sessionId)-\(time.timeIntervalSince1970)" }
    var time: Date
    var title: String
    var subtitle: String
    var sessionId: String
}

enum CeisActivity {
    /// The first non-fence line, cut to 72 characters.
    static func firstLine(_ text: String) -> String {
        let line = text.split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }
            .first { !$0.isEmpty && !$0.hasPrefix("```") } ?? ""
        return line.count > 72 ? String(line.prefix(72)).trimmingCharacters(in: .whitespaces) + "…" : line
    }

    static func userText(_ parts: [ContentPart]) -> String {
        var s = ""
        for case .text(let t) in parts { s += t }
        for tag in ["system-reminder", "user-attached-files"] {
            while let open = s.range(of: "<\(tag)>"), let close = s.range(of: "</\(tag)>", range: open.upperBound..<s.endIndex) {
                s.removeSubrange(open.lowerBound..<close.upperBound)
            }
        }
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// The tool titles of a reply (the step's own words), else its first text.
    static func assistantSummary(_ parts: [ContentPart]) -> (tools: [String], text: String) {
        var text = ""
        var tools: [String] = []
        for part in parts {
            switch part {
            case .text(let t): if text.isEmpty { text = t }
            case .toolUse(let tu):
                var title = ""
                if let data = tu.input.data(using: .utf8), let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                    title = (o["tool_title"] as? String) ?? ""
                }
                if title.isEmpty { title = tu.description ?? tu.name }
                tools.append(title)
            default: break
            }
        }
        return (tools, text)
    }

    /// Pure: the entries of one session's messages since `since`.
    static func entries(sessionId: String, messages: [(role: MessageRole, parts: [ContentPart], createdAt: Date)], since: Date) -> [CeisActivityEntry] {
        var out: [CeisActivityEntry] = []
        var i = 0
        while i < messages.count {
            let m = messages[i]
            if m.role == .user, m.createdAt >= since {
                let title = firstLine(userText(m.parts))
                if !title.isEmpty {
                    var tools: [String] = []
                    var texts: [String] = []
                    var j = i + 1
                    while j < messages.count, messages[j].role != .user {
                        let s = assistantSummary(messages[j].parts)
                        tools.append(contentsOf: s.tools)
                        if !s.text.trimmingCharacters(in: .whitespaces).isEmpty { texts.append(s.text) }
                        j += 1
                    }
                    let distinctTools = NSOrderedSet(array: tools).array as? [String] ?? tools
                    let subtitle = !distinctTools.isEmpty ? distinctTools.prefix(3).joined(separator: " · ") : (texts.last.map(firstLine) ?? "")
                    out.append(CeisActivityEntry(time: m.createdAt, title: title, subtitle: subtitle, sessionId: sessionId))
                }
            }
            i += 1
        }
        return out
    }

    /// The last two days across the most recent sessions.
    static func load() async -> [CeisActivityEntry] {
        let startOfToday = Calendar.current.startOfDay(for: Date())
        let since = startOfToday.addingTimeInterval(-24 * 3600)
        let sessions = await CeisSync.shared.visible(await ChatStore.shared.listSessions()) // C12: this account's chats only
            .filter { $0.updatedAt >= since && $0.remoteDeviceId == nil }
            .sorted { $0.updatedAt > $1.updatedAt }
            .prefix(12)
        var out: [CeisActivityEntry] = []
        for s in sessions {
            let raw = await ChatStore.shared.loadMessages(sessionId: s.id)
                .filter { !$0.isToolResultOnly }
                .map { (role: $0.role, parts: $0.parts, createdAt: $0.createdAt) }
            out.append(contentsOf: entries(sessionId: s.id, messages: raw, since: since))
        }
        return Array(out.sorted { $0.time > $1.time }.prefix(60))
    }
}

struct CeisActivityPane: View {
    var onOpenSession: (String) -> Void
    @State private var entries: [CeisActivityEntry]?

    var body: some View {
        VStack(spacing: 0) {
            if let entries {
                if entries.isEmpty {
                    CeisEmptyNote(text: AppLocalized("Nothing yet today. What you ask for and what the agent does about it shows up here."))
                } else {
                    ForEach(groups, id: \.0) { label, items in
                        CeisSectionLabel(text: label)
                        ForEach(items) { e in
                            Button { onOpenSession(e.sessionId) } label: {
                                HStack(alignment: .top, spacing: 14) {
                                    Image(systemName: "sparkles")
                                        .font(.system(size: 15))
                                        .foregroundStyle(CeisTones.action)
                                        .frame(width: 36, height: 36)
                                        .background(CeisTones.fill, in: Circle())
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(e.title).font(.body.weight(.medium)).lineLimit(2).multilineTextAlignment(.leading)
                                        if !e.subtitle.isEmpty {
                                            Text(e.subtitle).font(.subheadline).foregroundStyle(.secondary).lineLimit(2).multilineTextAlignment(.leading)
                                        }
                                        Text(e.time.formatted(date: .omitted, time: .shortened)).font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer(minLength: 0)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            } else {
                ProgressView().padding(24)
            }
        }
        .task { entries = await CeisActivity.load() }
    }

    private var groups: [(String, [CeisActivityEntry])] {
        guard let entries else { return [] }
        var order: [String] = []
        var map: [String: [CeisActivityEntry]] = [:]
        for e in entries {
            let label = dayLabel(e.time)
            if map[label] == nil { order.append(label) }
            map[label, default: []].append(e)
        }
        return order.map { ($0, map[$0] ?? []) }
    }

    private func dayLabel(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) { return AppLocalized("Today") }
        if Calendar.current.isDateInYesterday(date) { return AppLocalized("Yesterday") }
        return date.formatted(date: .abbreviated, time: .omitted)
    }
}

// MARK: - Approvals

struct CeisApprovalsPane: View {
    @ObservedObject private var manager = OffloadPermissionManager.shared
    /// The "always" answers given to other devices' tasks (CeisRemoteApproval.swift).
    @ObservedObject private var remote = CeisRemoteApprovals.shared

    private var always: [OffloadCommandInfo] {
        OffloadPermissionManager.allCommands.filter { $0.showInSettings && manager.permissionLevel(for: $0.name) == .bypass }
    }

    var body: some View {
        VStack(spacing: 0) {
            if always.isEmpty && remote.grants.isEmpty {
                CeisEmptyNote(text: AppLocalized("No standing approvals. When you answer \"always allow\" to a risky step, it is listed here and can be revoked."))
            }
            if !remote.grants.isEmpty {
                CeisSectionLabel(text: AppLocalized("Always allowed on other devices"))
                ForEach(remote.grants) { grant in
                    HStack(spacing: 14) {
                        Image(systemName: "checkmark.shield")
                            .font(.system(size: 15))
                            .foregroundStyle(CeisTones.action)
                            .frame(width: 36, height: 36)
                            .background(CeisTones.fill, in: Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text(grant.deviceName).font(.body.weight(.medium))
                            Text(grant.preview).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                        }
                        Spacer()
                        Button(AppLocalized("Revoke")) { remote.revoke(grant.id) }
                            .font(.footnote.weight(.medium))
                            .tint(CeisTones.action)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                }
            }
            if !always.isEmpty {
                CeisSectionLabel(text: AppLocalized("Always allowed"))
                ForEach(always, id: \.name) { cmd in
                    HStack(spacing: 14) {
                        Image(systemName: "checkmark.shield")
                            .font(.system(size: 15))
                            .foregroundStyle(CeisTones.action)
                            .frame(width: 36, height: 36)
                            .background(CeisTones.fill, in: Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text(cmd.displayLabel).font(.body.weight(.medium))
                            Text(String(format: AppLocalized("Always allowed · %@"), cmd.description)).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                        }
                        Spacer()
                        Button(AppLocalized("Revoke")) { manager.setPermissionLevel(.askOnce, for: cmd.name) }
                            .font(.footnote.weight(.medium))
                            .tint(CeisTones.action)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                }
            }
            NavigationLink { OffloadPermissionSettingsView() } label: {
                HStack {
                    Text(AppLocalized("Manage permissions")).font(.body.weight(.medium))
                    Spacer()
                    Image(systemName: "chevron.right").font(.footnote).foregroundStyle(.tertiary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(CeisTones.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16)
            .padding(.top, 10)
        }
    }
}

// MARK: - Daily

struct CeisDailyPane: View {
    var onOpenSession: (String) -> Void
    var onManage: () -> Void
    @ObservedObject private var scheduler = CeisScheduler.shared
    @ObservedObject private var goals = CeisGoalStore.shared

    var body: some View {
        let routines = scheduler.visible
        let checks = scheduler.routines.filter { $0.hidden && $0.goalId != nil }
        VStack(spacing: 0) {
            if routines.isEmpty && checks.isEmpty {
                CeisEmptyNote(text: AppLocalized("No routines yet. Ask the agent for something \"every morning\" and it will appear here."))
            } else {
                if !routines.isEmpty {
                    CeisSectionLabel(text: AppLocalized("Daily"))
                    ForEach(routines) { r in row(symbol: "clock", title: r.label, detail: r.enabled ? r.cadence : AppLocalized("Off") + " · " + r.cadence, sessionId: r.sessionId) }
                }
                if !checks.isEmpty {
                    CeisSectionLabel(text: AppLocalized("Goal checks"))
                    ForEach(checks) { r in
                        let goal = goals.goal(id: r.goalId ?? "")
                        row(symbol: "target", title: goal?.title ?? r.label, detail: r.enabled ? r.cadence : AppLocalized("Off") + " · " + r.cadence, sessionId: r.sessionId)
                    }
                }
            }
            Text(AppLocalized("Routines run while the app is open; at their time the phone reminds you to open it."))
                .font(.caption).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20).padding(.top, 10)
            CeisManageRow(text: AppLocalized("Manage routines"), action: onManage)
        }
    }

    private func row(symbol: String, title: String, detail: String, sessionId: String?) -> some View {
        Button { if let sessionId { onOpenSession(sessionId) } } label: {
            HStack(spacing: 14) {
                Image(systemName: symbol)
                    .font(.system(size: 15))
                    .foregroundStyle(CeisTones.action)
                    .frame(width: 36, height: 36)
                    .background(CeisTones.fill, in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.body.weight(.medium)).lineLimit(1)
                    Text(detail).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                if sessionId != nil { Image(systemName: "chevron.right").font(.footnote).foregroundStyle(.tertiary) }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Soul & memory

struct CeisSoulPane: View {
    var name: String
    var onEditName: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            CeisSectionLabel(text: name)
            Button(action: onEditName) {
                HStack(spacing: 8) {
                    Image(systemName: "pencil").font(.system(size: 15))
                    Text(AppLocalized("Edit")).font(.body.weight(.medium))
                }
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(CeisTones.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16)
            HStack(spacing: 12) {
                fileCard(title: AppLocalized("SOUL"), file: .soul, colors: [Color(red: 0.49, green: 0.42, blue: 0.78), Color(red: 0.34, green: 0.27, blue: 0.58)])
                fileCard(title: AppLocalized("Memory"), file: .memory, colors: [Color(red: 0.69, green: 0.25, blue: 0.24), Color(red: 0.48, green: 0.12, blue: 0.12)])
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            NavigationLink { CeisSystemFilesView() } label: {
                HStack {
                    Text(AppLocalized("System files")).font(.body.weight(.medium))
                    Spacer()
                    Image(systemName: "chevron.right").font(.footnote).foregroundStyle(.tertiary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(CeisTones.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16)
            .padding(.top, 12)
        }
    }

    private func fileCard(title: String, file: CeisSystemFile, colors: [Color]) -> some View {
        NavigationLink { CeisSystemFileView(file: file) } label: {
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(.system(size: 17, weight: .semibold)).foregroundStyle(.white)
                Text(AppLocalized("Handle with care")).font(.system(size: 11)).foregroundStyle(.white.opacity(0.85))
                Spacer()
                Text(file.modifiedAt.map { $0.formatted(date: .numeric, time: .omitted) } ?? "")
                    .font(.system(size: 12)).foregroundStyle(.white.opacity(0.9))
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 130, alignment: .leading)
            .background(LinearGradient(colors: colors, startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Share

/// One card design: a background, the pose it shows, an accent for the wordmark.
struct CeisSharePalette: Identifiable {
    var id: String
    var background: Color
    var accent: Color
    var mood: CeisMood

    static let all: [CeisSharePalette] = [
        CeisSharePalette(id: "pink", background: Color(red: 0.976, green: 0.851, blue: 0.890), accent: Color(red: 0.710, green: 0.278, blue: 0.416), mood: .idle),
        CeisSharePalette(id: "blue", background: Color(red: 0.839, green: 0.902, blue: 0.980), accent: Color(red: 0.184, green: 0.373, blue: 0.659), mood: .working),
        CeisSharePalette(id: "yellow", background: Color(red: 0.984, green: 0.937, blue: 0.780), accent: Color(red: 0.604, green: 0.420, blue: 0.071), mood: .waiting),
        CeisSharePalette(id: "purple", background: Color(red: 0.894, green: 0.867, blue: 0.969), accent: Color(red: 0.365, green: 0.267, blue: 0.651), mood: .happy),
        CeisSharePalette(id: "green", background: Color(red: 0.851, green: 0.941, blue: 0.875), accent: Color(red: 0.180, green: 0.490, blue: 0.310), mood: .error),
    ]
}

/// The card itself, laid out at 1080 × 1350 points and rendered to a picture.
struct CeisShareCard: View {
    var palette: CeisSharePalette
    var agentName: String
    var face: UIImage?

    static let width: CGFloat = 1080
    static let height: CGFloat = 1350

    var body: some View {
        ZStack {
            palette.background
            VStack(spacing: 0) {
                Text(String(format: AppLocalized("Hi, I'm %@, a personal AI agent. Meet ceis: open source, runs on your phone."), agentName))
                    .font(.system(size: 42))
                    .foregroundStyle(Color(red: 0.106, green: 0.106, blue: 0.122))
                    .multilineTextAlignment(.center)
                    .lineSpacing(8)
                    .padding(.horizontal, 44)
                    .padding(.vertical, 36)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 40, style: .continuous))
                    .overlay(alignment: .bottom) {
                        CeisBubbleTail().fill(Color.white).frame(width: 52, height: 34).offset(y: 32)
                    }
                    .shadow(color: .black.opacity(0.13), radius: 18, y: 6)
                    .padding(.horizontal, 120)
                    .padding(.top, 150)
                Spacer(minLength: 0)
                if let face {
                    Image(uiImage: face)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 760, height: 760)
                        .clipShape(RoundedRectangle(cornerRadius: 44, style: .continuous))
                        .shadow(color: .black.opacity(0.13), radius: 28, y: 14)
                        .padding(.bottom, 160)
                }
            }
            VStack(alignment: .leading, spacing: 8) {
                Spacer()
                Text("ceis").font(.system(size: 40, weight: .bold)).foregroundStyle(palette.accent)
                Text(AppLocalized("Your personal AI agent, open source · github.com/nano-muse/ceis"))
                    .font(.system(size: 28)).foregroundStyle(.black.opacity(0.6))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, 72)
            .padding(.bottom, 52)
        }
        .frame(width: Self.width, height: Self.height)
    }

    @MainActor
    static func render(_ palette: CeisSharePalette, agentName: String, scale: CGFloat = 1) -> UIImage? {
        let face = CeisFaceStore.shared.image(for: palette.mood) ?? CeisFaceStore.shared.image(for: .idle)
        let renderer = ImageRenderer(content: CeisShareCard(palette: palette, agentName: agentName, face: face))
        renderer.scale = scale
        return renderer.uiImage
    }
}

private struct CeisBubbleTail: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        p.closeSubpath()
        return p
    }
}

/// "Share my avatar": pick a card, it goes out through the system share sheet.
struct CeisAvatarShareSheet: View {
    var agentName: String
    @Environment(\.dismiss) private var dismiss
    @State private var previews: [UIImage]?
    @State private var selected = 0
    @State private var sharing: UIImage?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(AppLocalized("Share my avatar")).font(.title3.weight(.bold))
                Spacer()
                Button(AppLocalized("Later")) { dismiss() }
            }
            Text(AppLocalized("Pick a card. It goes out through the system share sheet."))
                .font(.subheadline).foregroundStyle(.secondary)
            if let previews {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(Array(previews.enumerated()), id: \.offset) { index, image in
                            Image(uiImage: image)
                                .resizable()
                                .aspectRatio(CeisShareCard.width / CeisShareCard.height, contentMode: .fit)
                                .frame(width: 220)
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(index == selected ? CeisTones.action : Color.clear, lineWidth: 2.5))
                                .onTapGesture { selected = index }
                        }
                    }
                    .padding(.vertical, 4)
                }
            } else {
                ProgressView().frame(maxWidth: .infinity, minHeight: 280)
            }
            Button {
                sharing = CeisShareCard.render(CeisSharePalette.all[selected], agentName: agentName, scale: 1)
            } label: {
                Label(AppLocalized("Share"), systemImage: "square.and.arrow.up")
                    .font(.body.weight(.medium))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
            .tint(CeisTones.action)
            .disabled(previews == nil)
        }
        .padding(20)
        .presentationDetents([.medium, .large])
        .task {
            previews = CeisSharePalette.all.compactMap { CeisShareCard.render($0, agentName: agentName, scale: 0.3) }
        }
        .sheet(isPresented: Binding(get: { sharing != nil }, set: { if !$0 { sharing = nil } })) {
            if let sharing {
                CeisShareSheet(items: [sharing, String(format: AppLocalized("My new look: %@. Have a look."), agentName)])
            }
        }
    }
}

/// The virtual card in the chat after a new face: share it or not.
struct CeisAvatarDoneCard: View {
    var description: String
    @ObservedObject private var flow = CeisAvatarFlow.shared
    @State private var share = false

    var body: some View {
        HStack(spacing: 12) {
            CeisFaceView(mood: .happy, size: 44, showsRing: false)
            VStack(alignment: .leading, spacing: 2) {
                Text(AppLocalized("New look on")).font(.subheadline.weight(.semibold))
                Text(description).font(.caption).foregroundStyle(.secondary).lineLimit(2)
            }
            Spacer(minLength: 0)
            Button(AppLocalized("Share avatar")) { share = true }
                .font(.footnote.weight(.medium))
                .tint(CeisTones.action)
            Button { flow.dismissShare() } label: { Image(systemName: "xmark").font(.footnote) }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
                .accessibilityLabel(Text(AppLocalized("Later")))
        }
        .padding(12)
        .background(CeisTones.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .sheet(isPresented: $share) {
            CeisAvatarShareSheet(agentName: SoulStore.cachedMetadata.name.isEmpty ? "ceis" : SoulStore.cachedMetadata.name)
        }
    }
}
