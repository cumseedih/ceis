import XCTest
@testable import Minis

/// The pure parts of the ceis iPhone layer, pinned so they cannot drift from Android:
/// the fences the model writes, the words that change the avatar, the goal and feed blocks,
/// the scheduler's arithmetic, the region rule, the model menu and the first-run gating.
/// Android: AvatarFlowTest, GoalFlowTest, FencesTest, FirstRunSetupTest, SharedConnectorsTest.
@MainActor
final class CeisLogicTests: XCTestCase {

    // MARK: - Fences

    func testFencesFindTheLastBlockAndStripIt() {
        let text = """
        Here you go.
        ```ceis-goal
        {"title": "Run twice a week", "check_every_hours": 72}
        ```
        And an update later:
        ```ceis-goal
        {"title": "Run three times a week"}
        ```
        Done.
        """
        XCTAssertTrue(CeisFences.contains(text))
        XCTAssertTrue(CeisFences.contains(text, kind: "goal"))
        XCTAssertFalse(CeisFences.contains(text, kind: "feed"))
        XCTAssertEqual(CeisFences.blocks("goal", in: text).count, 2)
        XCTAssertEqual(CeisFences.lastObject("goal", in: text)?["title"] as? String, "Run three times a week")
        let stripped = CeisFences.strip(text)
        XCTAssertFalse(stripped.contains("ceis-goal"))
        XCTAssertTrue(stripped.contains("Here you go."))
        XCTAssertTrue(stripped.contains("Done."))
    }

    func testFencesSplitIntoPieces() {
        let text = "Before\n```ceis-feed\n{\"title\":\"A\",\"body\":\"B\"}\n```\nAfter"
        let pieces = CeisFences.pieces(text)
        XCTAssertEqual(pieces.count, 3)
        XCTAssertEqual(pieces.first, .prose("Before"))
        if case .block(let kind, let json) = pieces[1] {
            XCTAssertEqual(kind, "feed")
            XCTAssertTrue(json.contains("\"title\""))
        } else {
            XCTFail("second piece should be the block")
        }
        XCTAssertEqual(pieces.last, .prose("After"))
    }

    func testFenceRoundTrip() {
        let fence = CeisFences.fence("goal-update", ["goal_id": "g1", "progress": 40])
        XCTAssertTrue(fence.hasPrefix("```ceis-goal-update\n"))
        XCTAssertEqual(CeisFences.lastObject("goal-update", in: fence)?["goal_id"] as? String, "g1")
    }

    // MARK: - Day

    func testParseClock() {
        XCTAssertEqual(CeisDay.parseClock("09:30")?.hour, 9)
        XCTAssertEqual(CeisDay.parseClock("09:30")?.minute, 30)
        XCTAssertEqual(CeisDay.parseClock("7:05")?.hour, 7)
        XCTAssertNil(CeisDay.parseClock("25:00"))
        XCTAssertNil(CeisDay.parseClock("noon"))
        XCTAssertNil(CeisDay.parseClock(nil))
    }

    // MARK: - Avatar words

    func testAvatarRequestsEnglish() {
        XCTAssertEqual(CeisAvatarIntent.parseRequest("Change your avatar to a red panda"), "red panda")
        XCTAssertEqual(CeisAvatarIntent.parseRequest("please switch your look into a small robot."), "small robot")
        XCTAssertEqual(CeisAvatarIntent.parseRequest("new avatar: cyberpunk fox"), "cyberpunk fox")
        XCTAssertEqual(CeisAvatarIntent.parseRequest("become a dragon"), "dragon")
        // "become better" is not a face.
        XCTAssertNil(CeisAvatarIntent.parseRequest("become better at math"))
        XCTAssertNil(CeisAvatarIntent.parseRequest("be quiet"))
        XCTAssertNil(CeisAvatarIntent.parseRequest("What is the weather like?"))
    }

    func testAvatarRequestsChinese() {
        XCTAssertEqual(CeisAvatarIntent.parseRequest("把你的形象换成一只橘猫"), "一只橘猫")
        XCTAssertEqual(CeisAvatarIntent.parseRequest("换个头像：赛博朋克狐狸"), "赛博朋克狐狸")
        XCTAssertEqual(CeisAvatarIntent.parseRequest("变成一条小龙吧"), "一条小龙")
        XCTAssertNil(CeisAvatarIntent.parseRequest("今天天气怎么样"))
    }

    func testAvatarChoices() {
        XCTAssertEqual(CeisAvatarIntent.parseChoice("2"), .index(1))
        XCTAssertEqual(CeisAvatarIntent.parseChoice("the third one"), .index(2))
        XCTAssertEqual(CeisAvatarIntent.parseChoice("I'll take the first"), .index(0))
        XCTAssertEqual(CeisAvatarIntent.parseChoice("第二个"), .index(1))
        XCTAssertEqual(CeisAvatarIntent.parseChoice("就第四个吧"), .index(3))
        XCTAssertEqual(CeisAvatarIntent.parseChoice("右下"), .index(3))
        XCTAssertEqual(CeisAvatarIntent.parseChoice("regenerate"), .regenerate)
        XCTAssertEqual(CeisAvatarIntent.parseChoice("都不喜欢"), .regenerate)
        XCTAssertNil(CeisAvatarIntent.parseChoice("tell me more about option two"))
    }

    // MARK: - Goals

    func testGoalFromBlock() throws {
        let block: [String: Any] = [
            "title": " Learn 20 Spanish words a week ",
            "why": "trip in June",
            "category": "interests",
            "check_every_hours": 48,
            "check_time": "at 18:30",
            "steps": ["Pick a list", "", "Review on Sunday"],
            "first_check": "How did the first list go?",
        ]
        let parsed = try XCTUnwrap(CeisGoal.from(block: block))
        XCTAssertEqual(parsed.goal.title, "Learn 20 Spanish words a week")
        XCTAssertEqual(parsed.goal.category, .interests)
        XCTAssertEqual(parsed.goal.checkEveryHours, 48)
        XCTAssertEqual(parsed.goal.checkHour, 18)
        XCTAssertEqual(parsed.goal.checkMinute, 30)
        XCTAssertEqual(parsed.goal.steps.map(\.text), ["Pick a list", "Review on Sunday"])
        XCTAssertEqual(parsed.firstCheck, "How did the first list go?")
        XCTAssertNil(CeisGoal.from(block: ["title": "  "]))
    }

    func testGoalUpdateBlock() {
        let update = CeisGoal.Update(block: ["goal_id": "g1", "progress": 140, "status": "attention", "note": "slipping"])
        XCTAssertEqual(update?.goalId, "g1")
        XCTAssertEqual(update?.progress, 100)
        XCTAssertEqual(update?.status, .active)
        XCTAssertEqual(update?.note, "slipping")
        XCTAssertEqual(CeisGoal.Update(block: ["status": "done"])?.status, .done)
        XCTAssertNil(CeisGoal.Update(block: ["note": "   "]))
    }

    func testGoalCategoryFallsBackToOther() {
        XCTAssertEqual(CeisGoalCategory.from("HEALTH"), .health)
        XCTAssertEqual(CeisGoalCategory.from("whatever"), .other)
        XCTAssertEqual(CeisGoalCategory.from(nil), .other)
    }

    // MARK: - Feed

    func testFeedDraftFromBlock() {
        let draft = CeisPost.Draft(block: ["title": "Rain later", "body": "Take the umbrella.", "type": "REMINDER", "emoji": "☔️", "source": "weather; calendar"])
        XCTAssertEqual(draft?.type, "reminder")
        XCTAssertEqual(draft?.source, ["weather", "calendar"])
        XCTAssertEqual(CeisPost.Draft(block: ["title": "x", "body": "y", "type": "nonsense"])?.type, "note")
        XCTAssertNil(CeisPost.Draft(block: ["title": "x"]))
    }

    func testFrontMatterSplit() {
        let (meta, body) = CeisPost.splitFrontMatter("---\ntitle: Hello\ntype: brief\n---\nThe body\nmore")
        XCTAssertEqual(meta["title"], "Hello")
        XCTAssertEqual(meta["type"], "brief")
        XCTAssertEqual(body, "The body\nmore")
        let (none, plain) = CeisPost.splitFrontMatter("just text")
        XCTAssertTrue(none.isEmpty)
        XCTAssertEqual(plain, "just text")
    }

    // MARK: - Scheduler arithmetic

    private func date(_ y: Int, _ mo: Int, _ d: Int, _ h: Int, _ mi: Int, _ cal: Calendar) -> Date {
        cal.date(from: DateComponents(year: y, month: mo, day: d, hour: h, minute: mi))!
    }

    func testDailyRoutineNextDue() {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        var routine = CeisRoutine(label: "Brief", prompt: "x", hour: 8, minute: 0)
        routine.createdAt = date(2026, 10, 1, 7, 0, cal)
        // created before 08:00 → due the same day
        XCTAssertEqual(routine.nextDue(after: date(2026, 10, 1, 7, 30, cal), calendar: cal), date(2026, 10, 1, 8, 0, cal))
        // already fired this slot → tomorrow
        routine.lastFiredAt = date(2026, 10, 1, 8, 1, cal)
        XCTAssertEqual(routine.nextDue(after: date(2026, 10, 1, 9, 0, cal), calendar: cal), date(2026, 10, 2, 8, 0, cal))
    }

    func testRoutineCreatedAfterSlotWaitsForTomorrow() {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        var routine = CeisRoutine(label: "Brief", prompt: "x", hour: 8, minute: 0)
        routine.createdAt = date(2026, 10, 1, 9, 0, cal)
        XCTAssertEqual(routine.nextDue(after: date(2026, 10, 1, 9, 5, cal), calendar: cal), date(2026, 10, 2, 8, 0, cal))
    }

    func testWeekdaysRoutineSkipsTheWeekend() {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        var routine = CeisRoutine(label: "Standup", prompt: "x", hour: 9, minute: 0, repeatMode: .weekdays)
        routine.createdAt = date(2026, 10, 1, 0, 0, cal)
        // 2026-10-03 is a Saturday
        XCTAssertEqual(routine.nextDue(after: date(2026, 10, 3, 10, 0, cal), calendar: cal), date(2026, 10, 5, 9, 0, cal))
    }

    func testOnceRoutineCreatedAfterItsTimeRunsTomorrow() {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        var routine = CeisRoutine(label: "Call", prompt: "x", hour: 18, minute: 0, repeatMode: .once)
        routine.createdAt = date(2026, 10, 1, 19, 0, cal)
        // made at 19:00 for 18:00 → tomorrow at 18:00, not never
        XCTAssertEqual(routine.nextDue(after: date(2026, 10, 1, 19, 5, cal), calendar: cal), date(2026, 10, 2, 18, 0, cal))
        // made before its time → today; once run → spent
        routine.createdAt = date(2026, 10, 1, 15, 0, cal)
        XCTAssertEqual(routine.nextDue(after: date(2026, 10, 1, 15, 5, cal), calendar: cal), date(2026, 10, 1, 18, 0, cal))
        routine.lastFiredAt = date(2026, 10, 1, 18, 0, cal)
        XCTAssertNil(routine.nextDue(after: date(2026, 10, 1, 18, 5, cal), calendar: cal))
    }

    func testIntervalRoutineCountsFromTheLastRun() {
        let cal = Calendar(identifier: .gregorian)
        var routine = CeisRoutine(label: "Check-in", prompt: "x", hour: 9, minute: 0)
        routine.intervalHours = 6
        let fired = Date(timeIntervalSince1970: 1_800_000_000)
        routine.lastFiredAt = fired
        XCTAssertEqual(routine.nextDue(after: fired.addingTimeInterval(60), calendar: cal), fired.addingTimeInterval(6 * 3600))
    }

    // MARK: - Region (contract C5)

    func testMainlandRule() {
        XCTAssertTrue(CeisRegion.isMainland(languageCode: "zh", scriptCode: "Hans", regionCode: nil, signedInWithPhone: false, relayRegion: nil))
        XCTAssertTrue(CeisRegion.isMainland(languageCode: "zh", scriptCode: nil, regionCode: "CN", signedInWithPhone: false, relayRegion: nil))
        XCTAssertTrue(CeisRegion.isMainland(languageCode: "zh", scriptCode: nil, regionCode: nil, signedInWithPhone: false, relayRegion: nil))
        XCTAssertFalse(CeisRegion.isMainland(languageCode: "zh", scriptCode: "Hant", regionCode: "TW", signedInWithPhone: false, relayRegion: nil))
        XCTAssertFalse(CeisRegion.isMainland(languageCode: "en", scriptCode: nil, regionCode: "US", signedInWithPhone: false, relayRegion: nil))
        XCTAssertTrue(CeisRegion.isMainland(languageCode: "en", scriptCode: nil, regionCode: "US", signedInWithPhone: true, relayRegion: nil))
        XCTAssertTrue(CeisRegion.isMainland(languageCode: "en", scriptCode: nil, regionCode: "US", signedInWithPhone: false, relayRegion: "CN"))
    }

    // MARK: - Models (contract C4)

    func testRecommendedChatPrefersTheMarkedModelThenTheDefault() {
        let marked: [[String: Any]] = [
            ["id": "qwen3.8-flash", "for": ["chat"]],
            ["id": "qwen3.8-27b", "for": ["chat", "gui"], "ceis": ["recommended": true]],
        ]
        XCTAssertEqual(CeisModelMenu.recommendedChat(marked)?["id"] as? String, "qwen3.8-27b")
        let plain: [[String: Any]] = [
            ["id": "qwen3.8-27b", "for": ["gui"]],
            ["id": "deepseek-v4.1-flash", "for": ["chat"]],
        ]
        XCTAssertEqual(CeisModelMenu.recommendedChat(plain)?["id"] as? String, CeisModelMenu.defaultChatModel)
        let drawsOnly: [[String: Any]] = [["id": "qwen3.8-27b", "for": ["gui"]]]
        XCTAssertNil(CeisModelMenu.recommendedChat(drawsOnly))
        XCTAssertEqual(CeisModelMenu.guiModel(plain), "qwen3.8-27b")
        // the relay 0.17 shape: the lanes live under `ceis`, next to its other flags
        let relay: [[String: Any]] = [
            ["id": "qwen3.8-27b", "ceis": ["for": ["gui", "chat"], "recommended": true, "recommended_for": ["gui"]]],
            ["id": "deepseek-v4.1-flash", "ceis": ["for": ["chat"], "recommended": true, "recommended_for": ["chat"]]],
            ["id": "qwen3.8-flash", "ceis": ["for": ["chat"], "recommended": false]],
        ]
        XCTAssertEqual(CeisModelMenu.recommendedChat(relay)?["id"] as? String, "deepseek-v4.1-flash")
        XCTAssertEqual(CeisModelMenu.guiModel(relay), "qwen3.8-27b")
        XCTAssertEqual(CeisModelMenu.lanes(relay[0]), ["gui", "chat"])
    }

    func testDeepSeekVisionRule() {
        XCTAssertEqual(CeisVision.deepSeekSees("deepseek-v4.1-flash"), true)
        XCTAssertEqual(CeisVision.deepSeekSees("deepseek/deepseek-v4.1-flash"), true)
        XCTAssertEqual(CeisVision.deepSeekSees("deepseek-v4-pro"), false)
        XCTAssertEqual(CeisVision.deepSeekSees("deepseek-chat"), false)
        XCTAssertEqual(CeisVision.deepSeekSees("deepseek-r1"), false)
        XCTAssertEqual(CeisVision.deepSeekSees("deepseek-ocr"), true)
        XCTAssertEqual(CeisVision.deepSeekSees("deepseek-vl2"), false)
        XCTAssertNil(CeisVision.deepSeekSees("qwen3.8-27b"))
        XCTAssertEqual(CeisVision.guess(id: "deepseek-chat"), .textOnly)
        XCTAssertEqual(CeisVision.guess(id: "deepseek-v4.1-flash"), .vision)
        XCTAssertEqual(CeisVision.guess(id: "qwen3.8-27b"), .vision)
        XCTAssertNil(CeisVision.guess(id: "some-unknown-model"))
    }

    func testOwnKeyPresets() {
        XCTAssertEqual(CeisOwnKeyPreset.bailian.chatModel, "deepseek-v4.1-flash")
        XCTAssertEqual(CeisOwnKeyPreset.bailian.guiModel, "qwen3.8-27b")
        XCTAssertEqual(CeisOwnKeyPreset.openrouter.chatModel, "deepseek/deepseek-v4.1-flash")
        XCTAssertEqual(CeisOwnKeyPreset.openrouter.guiModel, "qwen/qwen3.8-27b")
    }

    // MARK: - First run

    func testFirstRunNeeded() {
        // Neither a sign-in nor a key of one's own: nothing could answer, the setup comes back.
        XCTAssertTrue(CeisFirstRun.needed(signedIn: false, hasProviders: false, hasSessions: true, done: true))
        // Signed out with a key of one's own, the chat stays; so does a signed-in phone whose Cloud models are off.
        XCTAssertFalse(CeisFirstRun.needed(signedIn: false, hasProviders: true, hasSessions: true, done: true))
        XCTAssertFalse(CeisFirstRun.needed(signedIn: true, hasProviders: false, hasSessions: true, done: true))
        XCTAssertTrue(CeisFirstRun.needed(signedIn: true, hasProviders: true, hasSessions: false, done: false))
        XCTAssertFalse(CeisFirstRun.needed(signedIn: true, hasProviders: true, hasSessions: false, done: true))
        XCTAssertFalse(CeisFirstRun.needed(signedIn: true, hasProviders: true, hasSessions: true, done: false))
    }

    func testFirstRunStages() {
        XCTAssertEqual(CeisFirstRun.stage(signedIn: false, hasGroups: false, sourceChosen: false, modelsSkipped: false, fresh: false, passwordAnswered: false), .welcome)
        // Signed out with a key of one's own: past the welcome, and the account's pages (password, source) are skipped.
        XCTAssertEqual(CeisFirstRun.stage(signedIn: false, hasProviders: true, hasGroups: false, sourceChosen: false, modelsSkipped: false, fresh: false, passwordAnswered: false), .models)
        XCTAssertEqual(CeisFirstRun.stage(signedIn: false, hasProviders: true, hasGroups: true, sourceChosen: false, modelsSkipped: false, fresh: false, passwordAnswered: false), .meet)
        XCTAssertEqual(CeisFirstRun.stage(signedIn: true, hasGroups: false, sourceChosen: false, modelsSkipped: false, fresh: true, passwordAnswered: false), .password)
        XCTAssertEqual(CeisFirstRun.stage(signedIn: true, hasGroups: false, sourceChosen: false, modelsSkipped: false, fresh: true, passwordAnswered: true), .source)
        XCTAssertEqual(CeisFirstRun.stage(signedIn: true, hasGroups: false, sourceChosen: true, modelsSkipped: false, fresh: false, passwordAnswered: false), .models)
        XCTAssertEqual(CeisFirstRun.stage(signedIn: true, hasGroups: true, sourceChosen: true, modelsSkipped: false, fresh: false, passwordAnswered: false), .meet)
        XCTAssertEqual(CeisFirstRun.stage(signedIn: true, hasGroups: false, sourceChosen: true, modelsSkipped: true, fresh: false, passwordAnswered: false), .meet)
        // The phone page (notifications) sits between the model pages and Meet, as Android's Hands page does.
        XCTAssertEqual(CeisFirstRun.stage(signedIn: true, hasGroups: true, sourceChosen: true, modelsSkipped: false, fresh: false, passwordAnswered: false, notificationsSeen: false), .notifications)
        XCTAssertEqual(CeisFirstRun.stage(signedIn: true, hasGroups: false, sourceChosen: true, modelsSkipped: false, fresh: false, passwordAnswered: false, notificationsSeen: false), .models)
        // Three dots: account · phone · meet.
        XCTAssertEqual(CeisFirstRun.dot(.welcome), 0)
        XCTAssertEqual(CeisFirstRun.dot(.password), 0)
        XCTAssertEqual(CeisFirstRun.dot(.source), 0)
        XCTAssertEqual(CeisFirstRun.dot(.models), 0)
        XCTAssertEqual(CeisFirstRun.dot(.notifications), 1)
        XCTAssertEqual(CeisFirstRun.dot(.meet), 2)
    }

    // MARK: - Header status line (Android §2.2 order)

    func testStatusLinePriority() {
        XCTAssertEqual(CeisStatus.line(waiting: true, needsApproval: true, processing: true, toolName: "shell", toolTitle: "Running ls", request: "hi", studio: "Drawing", motion: "Animating 1/4…"), AppLocalized("Needs approval"))
        XCTAssertEqual(CeisStatus.line(waiting: true, processing: true, toolName: "shell", toolTitle: "Running ls", request: "hi", studio: "Drawing"), AppLocalized("Waiting for you"))
        XCTAssertEqual(CeisStatus.line(waiting: false, processing: true, toolName: "shell", toolTitle: "Running ls", request: "hi", studio: "Drawing"), "Drawing")
        XCTAssertEqual(CeisStatus.line(waiting: false, processing: true, toolName: "shell", toolTitle: "Running ls", request: "hi", studio: nil), "Running ls")
        XCTAssertEqual(CeisStatus.line(waiting: false, processing: true, toolName: "text", toolTitle: "", request: "hi", studio: nil), AppLocalized("Writing the reply"))
        XCTAssertEqual(CeisStatus.line(waiting: false, processing: true, toolName: "", toolTitle: "", request: "Plan my week", studio: nil), String(format: AppLocalized("On it: %@"), "Plan my week"))
        XCTAssertEqual(CeisStatus.line(waiting: false, processing: true, toolName: "", toolTitle: "", request: nil, studio: nil), AppLocalized("On it"))
        XCTAssertEqual(CeisStatus.line(waiting: false, processing: false, toolName: "", toolTitle: "", request: "hi", studio: nil, motion: "Animating 2/4…"), "Animating 2/4…")
        XCTAssertNil(CeisStatus.line(waiting: false, processing: false, toolName: "", toolTitle: "", request: "hi", studio: nil))
    }

    // MARK: - Appearance

    func testAvatarSizes() {
        XCTAssertEqual(CeisAvatarSize.small.points, 44)
        XCTAssertEqual(CeisAvatarSize.medium.points, 56)
        XCTAssertEqual(CeisAvatarSize.large.points, 66)
        XCTAssertEqual(CeisAvatarSize.extraLarge.points, 76)
        XCTAssertNil(CeisAvatarSize.hidden.points)
        XCTAssertEqual(CeisAvatarSize.stored(nil), .extraLarge)
        XCTAssertEqual(CeisAvatarSize.stored("junk"), .extraLarge)
        XCTAssertEqual(CeisAvatarSize.stored("small"), .small)
    }

    // MARK: - Transcript

    func testAssistantBubbleStaysBareForCodeAndTables() {
        XCTAssertFalse(CeisAssistantBubble.isBare("Here is the plan."))
        XCTAssertTrue(CeisAssistantBubble.isBare("```swift\nlet a = 1\n```"))
        XCTAssertTrue(CeisAssistantBubble.isBare("| a | b |\n|---|---|\n| 1 | 2 |"))
        XCTAssertTrue(CeisAssistantBubble.isBare("<table><tr><td>1</td></tr></table>"))
    }

    // MARK: - First conversation (naming)

    func testNamingBlockParsing() {
        let text = "What should I call you?\n```ceis-naming\n{\"user_address\": \"“Li”\", \"suggest\": [\"Pip\", \"Pip\", \"'Wren'\", \"Sol\", \"Fig\"]}\n```"
        let block = CeisFirstConversation.parseBlock(text)
        XCTAssertEqual(block?.userAddress, "Li")
        XCTAssertTrue(block?.addressGiven ?? false)
        XCTAssertEqual(block?.suggestions, ["Pip", "Wren", "Sol"])
        XCTAssertNil(block?.agentName)
        XCTAssertNil(CeisFirstConversation.parseBlock("no block here"))
        XCTAssertNil(CeisFirstConversation.parseBlock(nil))
    }

    func testCleanName() {
        XCTAssertEqual(CeisFirstConversation.cleanName("「小满」。"), "小满")
        XCTAssertEqual(CeisFirstConversation.cleanName("  Juno!  "), "Juno")
        XCTAssertNil(CeisFirstConversation.cleanName("a name that is far too long to use"))
        XCTAssertNil(CeisFirstConversation.cleanName("two\nlines"))
        XCTAssertNil(CeisFirstConversation.cleanName(""))
        XCTAssertNil(CeisFirstConversation.cleanName(nil))
    }

    func testWithAddressWritesAndReplacesTheLine() {
        let fresh = CeisFirstConversation.withAddress("Li", in: "")
        XCTAssertEqual(fresh, "## About the user\n- Call them: Li\n")
        let appended = CeisFirstConversation.withAddress("Li", in: "# GLOBAL\nSome notes.\n\n")
        XCTAssertTrue(appended.hasSuffix("## About the user\n- Call them: Li\n"))
        XCTAssertTrue(appended.hasPrefix("# GLOBAL\nSome notes."))
        let replaced = CeisFirstConversation.withAddress("Wei", in: appended)
        XCTAssertTrue(replaced.contains("- Call them: Wei"))
        XCTAssertFalse(replaced.contains("- Call them: Li"))
        XCTAssertEqual(replaced.components(separatedBy: "- Call them:").count, 2)
    }

    func testPoolPickIsStableAndDistinct() {
        let a = CeisFirstConversation.poolPick(seed: "session-1", chinese: false)
        let b = CeisFirstConversation.poolPick(seed: "session-1", chinese: false)
        XCTAssertEqual(a, b)
        XCTAssertEqual(a.count, 2)
        XCTAssertNotEqual(a[0], a[1])
        let zh = CeisFirstConversation.poolPick(seed: "x", chinese: true)
        XCTAssertTrue(CeisFirstConversation.namePoolZH.contains(zh[0]))
    }

    func testRealSessionKeys() {
        XCTAssertTrue(CeisFirstConversation.isRealSession("3F2504E0-4F89-11D3-9A0C-0305E82C3301"))
        XCTAssertFalse(CeisFirstConversation.isRealSession("__new__3F2504E0-4F89-11D3-9A0C-0305E82C3301"))
        XCTAssertFalse(CeisFirstConversation.isRealSession("draft"))
    }

    // MARK: - Coding bridge

    func testCodingRunFoldsEvents() {
        var run = CeisCodingBridge.LiveRun(text: "fix the test")
        run = CeisCodingBridge.step(run, event: ["kind": "started", "run": "r1", "session_id": "s1"])
        XCTAssertEqual(run.id, "r1")
        XCTAssertEqual(run.sessionId, "s1")
        run = CeisCodingBridge.step(run, event: ["kind": "text", "text": "Looking", "partial": true])
        run = CeisCodingBridge.step(run, event: ["kind": "text", "text": " at it", "partial": true])
        XCTAssertEqual(run.current, "Looking at it")
        run = CeisCodingBridge.step(run, event: ["kind": "text", "text": "Looking at it."])
        XCTAssertEqual(run.output, "Looking at it.")
        XCTAssertEqual(run.current, "")
        run = CeisCodingBridge.step(run, event: ["kind": "tool", "text": "read_file"])
        XCTAssertEqual(run.tools, 1)
        XCTAssertEqual(run.lastTool, "read_file")
        let done = CeisCodingBridge.finish(run, reply: ["id": "r1", "status": "done", "output": "", "tools": 3])
        XCTAssertEqual(done.output, "Looking at it.")
        XCTAssertEqual(done.status, "done")
        XCTAssertEqual(done.tools, 3)
        let withOutput = CeisCodingBridge.finish(run, reply: ["output": "Final answer", "error": "boom"])
        XCTAssertEqual(withOutput.output, "Final answer")
        XCTAssertEqual(withOutput.error, "boom")
    }

    // MARK: - Shared connectors (contract C3)

    func testSharedConnectorEntriesCarryNoSecrets() {
        let now = Date().timeIntervalSince1970
        let servers = [
            MCPServerConfig(id: "github", note: nil, enabled: true, createdAt: now, updatedAt: now,
                            url: "https://api.githubcopilot.com/mcp/", headers: ["Authorization": "Bearer SECRET"], oauth: nil,
                            command: nil, args: nil, env: nil, startupTimeoutSeconds: nil),
            MCPServerConfig(id: "maps", note: "Maps", enabled: false, createdAt: now - 10, updatedAt: now,
                            url: "https://example.invalid/mcp?key=SECRET", headers: nil, oauth: nil,
                            command: nil, args: nil, env: nil, startupTimeoutSeconds: nil),
            MCPServerConfig(id: "local", note: nil, enabled: true, createdAt: now - 20, updatedAt: now,
                            url: nil, headers: nil, oauth: nil,
                            command: "npx", args: ["thing"], env: nil, startupTimeoutSeconds: nil),
        ]
        let mine = CeisSharedConnectors.mine(servers: servers, catalogue: [], device: "Li's iPhone", deviceId: "phone-abc")
        XCTAssertEqual(mine.count, 2, "a stdio command is not a service anyone else can sign in to")
        XCTAssertEqual(mine[0]["id"] as? String, "github")
        XCTAssertEqual(mine[0]["auth"] as? String, "key")
        XCTAssertEqual(mine[1]["url"] as? String, "https://example.invalid/mcp")
        XCTAssertEqual(mine[1]["auth"] as? String, "key")
        XCTAssertEqual(mine[1]["label"] as? String, "Maps")
        XCTAssertEqual(mine[1]["enabled"] as? Bool, false)
        for entry in mine {
            let keys = Set(entry.keys)
            XCTAssertEqual(keys, ["id", "label", "url", "auth", "device", "device_id", "enabled", "at"])
            for (_, value) in entry {
                XCTAssertFalse("\(value)".contains("SECRET"))
            }
        }
    }

    func testSharedConnectorParseAndStamp() {
        let raw: [[String: Any]] = [
            ["id": "slack", "label": "", "device": "Mac", "device_id": "mac-1", "enabled": true, "at": "2026-10-01T08:00:00Z"],
            ["id": "  ", "device_id": "mac-1"],
            ["id": "notion", "label": "Notion", "auth": "oauth", "device_id": "mac-2"],
        ]
        let parsed = CeisSharedConnectors.parse(raw)
        XCTAssertEqual(parsed.map(\.id), ["slack", "notion"])
        XCTAssertEqual(parsed[0].label, "slack")
        XCTAssertEqual(parsed[0].auth, "open")
        XCTAssertEqual(parsed[1].auth, "oauth")
        XCTAssertTrue(parsed[1].enabled)
        let again = CeisSharedConnectors.parse(CeisSharedConnectors.serialize(parsed))
        XCTAssertEqual(again, parsed)
        let a = CeisSharedConnectors.stamp([["id": "a", "enabled": true, "at": "1"], ["id": "b", "enabled": true, "at": "2"]])
        let b = CeisSharedConnectors.stamp([["id": "b", "enabled": true, "at": "9"], ["id": "a", "enabled": true, "at": "8"]])
        XCTAssertEqual(a, b, "order and timestamps do not count as a change")
        let c = CeisSharedConnectors.stamp([["id": "a", "enabled": false], ["id": "b", "enabled": true]])
        XCTAssertNotEqual(a, c)
    }

    // MARK: - Video generation (pure parts)

    func testVideoGenModelSiblingsAndParameters() {
        XCTAssertEqual(CeisVideoGen.model(for: "wan2.2-i2v-flash", fromImage: true), "wan2.2-i2v-flash")
        XCTAssertEqual(CeisVideoGen.model(for: "wan2.2-i2v-flash", fromImage: false), "wan2.2-t2v-plus", "Wan 2.2 has no text-to-video Flash")
        XCTAssertEqual(CeisVideoGen.model(for: "wan2.6-t2v", fromImage: true), "wan2.6-i2v")
        XCTAssertEqual(CeisVideoGen.model(for: "wan2.6-i2v", fromImage: false), "wan2.6-t2v")
        XCTAssertEqual(CeisVideoGen.model(for: "MiniMax/MiniMax-H3", fromImage: false), "MiniMax/MiniMax-H3")

        XCTAssertEqual(CeisVideoGen.wanResolution("wan2.2-i2v-flash"), "480P")
        XCTAssertEqual(CeisVideoGen.wanResolution("wan2.6-i2v"), "720P")

        XCTAssertNil(CeisVideoGen.duration(for: "wan2.2-i2v-flash", seconds: 4), "Wan 2.2 has a fixed length")
        XCTAssertEqual(CeisVideoGen.duration(for: "wan2.5-i2v-preview", seconds: 4), 5)
        XCTAssertEqual(CeisVideoGen.duration(for: "wan2.5-i2v-preview", seconds: 8), 10)
        XCTAssertEqual(CeisVideoGen.duration(for: "wan2.6-i2v", seconds: 1), 2)
        XCTAssertEqual(CeisVideoGen.duration(for: "wan2.6-i2v", seconds: 40), 15)
        XCTAssertEqual(CeisVideoGen.duration(for: "MiniMax/MiniMax-H3", seconds: 2), 4)

        XCTAssertEqual(CeisVideoGen.wanSize("16:9"), "1280*720")
        XCTAssertEqual(CeisVideoGen.wanSize("9:16"), "720*1280")
        XCTAssertEqual(CeisVideoGen.wanSize("1:1"), "960*960")
    }

    func testVideoGenHostsAndMessages() {
        XCTAssertEqual(CeisVideoGen.host(of: "https://dashscope.aliyuncs.com/compatible-mode/v1"), "https://dashscope.aliyuncs.com")
        XCTAssertEqual(CeisVideoGen.host(of: "https://dashscope.aliyuncs.com/api/v1/"), "https://dashscope.aliyuncs.com")
        XCTAssertEqual(CeisVideoGen.host(of: "https://relay.example/v1"), "https://relay.example")
        XCTAssertEqual(CeisVideoGen.host(of: "https://relay.example/"), "https://relay.example")
        XCTAssertTrue(CeisVideoGen.speaksDashScope("https://dashscope-intl.aliyuncs.com/compatible-mode/v1"))
        XCTAssertFalse(CeisVideoGen.speaksDashScope("https://api.openai.com/v1"))
        XCTAssertTrue(CeisVideoGen.looksLikeVideoModel("wan2.6-t2v"))
        XCTAssertTrue(CeisVideoGen.looksLikeVideoModel("MiniMax/MiniMax-H3"))
        XCTAssertFalse(CeisVideoGen.looksLikeVideoModel("qwen-image-3.0"))
        XCTAssertEqual(CeisVideoGen.knownDashScopeModels.first, "wan2.2-i2v-flash")

        XCTAssertTrue(CeisVideoGen.failureMessage(["code": "Arrearage", "message": "Model not activated for this account"]).contains("activate"))
        XCTAssertEqual(CeisVideoGen.failureMessage(["code": "InvalidParameter", "message": "bad size"]), "InvalidParameter: bad size")
        XCTAssertTrue(CeisVideoGen.failureMessage(["task_status": "CANCELED"]).contains("CANCELED"))
        XCTAssertTrue(CeisVideoGen.failureMessage([:]).contains("FAILED"))
        XCTAssertEqual(CeisVideoGen.apiMessage(Data("{\"message\":\"nope\"}".utf8)), "nope")
        XCTAssertEqual(CeisVideoGen.apiMessage(Data("{\"error\":{\"message\":\"clips used up\"}}".utf8)), "clips used up")
        XCTAssertEqual(CeisVideoGen.apiMessage(Data("not json".utf8)), "")
        let refused = CeisMediaWords.refused(status: 401, vendorMessage: "Invalid API-key provided.")
        XCTAssertTrue(refused.contains("401") && refused.contains("Invalid API-key provided."))
        XCTAssertFalse(CeisMediaWords.refused(status: 503, vendorMessage: "").contains(":"))

        XCTAssertNil(CeisVideoGen.frameScale(width: 768, height: 768))
        XCTAssertEqual(CeisVideoGen.frameScale(width: 2048, height: 2048), 0.5)
        XCTAssertEqual(CeisVideoGen.frameScale(width: 128, height: 128), 2)
    }

    // MARK: - Nudges policy and the star gate (contract C1)

    func testNudgePolicyParsesAndKeepsDefaults() {
        let d = CeisNudgePolicy.defaults
        XCTAssertTrue(d.enabled)
        XCTAssertEqual(d.tasks, [3, 10, 30])
        XCTAssertEqual(d.daysUsed, [7, 30])
        XCTAssertEqual(d.cooldownDays, 7)
        XCTAssertEqual(d.maxAsks, 4)
        XCTAssertEqual(CeisNudgePolicy.parse([:]), d, "an empty reply is the defaults")
        XCTAssertEqual(CeisNudgePolicy.parse(d.json), d, "round trip")

        let p = CeisNudgePolicy.parse([
            "version": 1,
            "star": [
                "enabled": false,
                "url": "javascript:alert(1)",
                "moments": ["tasks": [10, 3, 3, "x"], "days_used": [], "goal_done": false],
                "cooldown_days": -2,
                "max_asks": "2",
            ] as [String: Any],
        ])
        XCTAssertFalse(p.enabled)
        XCTAssertEqual(p.url, d.url, "only https links are taken")
        XCTAssertEqual(p.tasks, [3, 10])
        XCTAssertEqual(p.daysUsed, [])
        XCTAssertFalse(p.goalDone)
        XCTAssertTrue(p.signedIn, "a missing moment keeps its default")
        XCTAssertEqual(p.cooldownDays, 0)
        XCTAssertEqual(p.maxAsks, 2)
    }

    func testNudgePolicyReadsTheOperatorsSentence() {
        let d = CeisNudgePolicy.defaults
        XCTAssertEqual(d.text, "")
        XCTAssertEqual(d.textZh, "")
        XCTAssertNil(d.sentence(chinese: false), "without a sentence the app's own line stays")
        XCTAssertNil(d.sentence(chinese: true))

        // A cached copy from before the fields: neither key, both empty, the same policy.
        var old: [String: Any] = d.json
        var star: [String: Any] = old["star"] as? [String: Any] ?? [:]
        star.removeValue(forKey: "text")
        star.removeValue(forKey: "text_zh")
        old["star"] = star
        XCTAssertEqual(CeisNudgePolicy.parse(old), d)

        let p = CeisNudgePolicy.parse([
            "star": ["text": "  Stars help.  ", "text_zh": "\n点个 star。\t"] as [String: Any],
        ])
        XCTAssertEqual(p.text, "Stars help.", "trimmed")
        XCTAssertEqual(p.textZh, "点个 star。")
        XCTAssertEqual(CeisNudgePolicy.parse(p.json), p, "round trip through the cache")

        let odd = CeisNudgePolicy.parse(["star": ["text": 42, "text_zh": ["x"]] as [String: Any]])
        XCTAssertEqual(odd.text, "", "not a string: empty, never a crash")
        XCTAssertEqual(odd.textZh, "")
    }

    func testNudgePolicyDropsASentenceOver200Characters() {
        let ok = String(repeating: "a", count: 200)
        let tooLong = String(repeating: "a", count: 201)
        let p = CeisNudgePolicy.parse(["star": ["text": ok, "text_zh": tooLong] as [String: Any]])
        XCTAssertEqual(p.text, ok)
        XCTAssertEqual(p.textZh, "")
        let padded = String(repeating: " ", count: 10) + ok + String(repeating: " ", count: 10)
        XCTAssertEqual(CeisNudgePolicy.parse(["star": ["text": padded] as [String: Any]]).text, ok, "the limit applies after trimming")
    }

    func testNudgePolicySentenceFallsBackInOrder() {
        var both = CeisNudgePolicy.defaults
        both.text = "English line"
        both.textZh = "中文句子"
        XCTAssertEqual(both.sentence(chinese: true), "中文句子")
        XCTAssertEqual(both.sentence(chinese: false), "English line")

        var englishOnly = CeisNudgePolicy.defaults
        englishOnly.text = "English line"
        XCTAssertEqual(englishOnly.sentence(chinese: true), "English line", "Chinese without text_zh takes text")
        XCTAssertEqual(englishOnly.sentence(chinese: false), "English line")

        var chineseOnly = CeisNudgePolicy.defaults
        chineseOnly.textZh = "中文句子"
        XCTAssertEqual(chineseOnly.sentence(chinese: true), "中文句子")
        XCTAssertNil(chineseOnly.sentence(chinese: false), "another language never takes text_zh")
    }

    func testStarGate() {
        let policy = CeisNudgePolicy.defaults
        var ledger = CeisStarLedger()
        let now = Date(timeIntervalSince1970: 1_800_000_000)

        XCTAssertTrue(CeisStarGate.due(.signedIn, ledger: ledger, policy: policy, now: now))
        XCTAssertFalse(CeisStarGate.due(.tasks(2), ledger: ledger, policy: policy, now: now), "2 is not a threshold")
        XCTAssertTrue(CeisStarGate.due(.tasks(3), ledger: ledger, policy: policy, now: now))

        ledger = CeisStarGate.marked(.tasks(3), in: ledger, now: now)
        XCTAssertEqual(ledger.asks, 1)
        XCTAssertFalse(CeisStarGate.due(.tasks(3), ledger: ledger, policy: policy, now: now), "once per threshold")
        XCTAssertFalse(CeisStarGate.due(.newLook, ledger: ledger, policy: policy, now: now.addingTimeInterval(86_400)), "cooldown")
        XCTAssertTrue(CeisStarGate.due(.newLook, ledger: ledger, policy: policy, now: now.addingTimeInterval(8 * 86_400)))
        XCTAssertTrue(CeisStarGate.due(.tasks(10), ledger: ledger, policy: policy, now: now.addingTimeInterval(8 * 86_400)), "the next threshold is its own moment")

        var capped = ledger
        capped.asks = policy.maxAsks
        XCTAssertFalse(CeisStarGate.due(.goalDone, ledger: capped, policy: policy, now: now.addingTimeInterval(30 * 86_400)), "lifetime cap")

        var starred = ledger
        starred.starred = true
        XCTAssertFalse(CeisStarGate.due(.exhausted, ledger: starred, policy: policy, now: now.addingTimeInterval(30 * 86_400)))

        // "I already starred" on the first card: nothing shown, no cooldown, every ask left, still nothing
        var done = CeisStarLedger()
        done.starred = true
        var generous = policy
        generous.cooldownDays = 0
        generous.maxAsks = 99
        let later = now.addingTimeInterval(365 * 86_400)
        for moment: CeisStarMoment in [.signedIn, .tasks(3), .newLook, .exhausted, .daysUsed(7), .goalDone] {
            XCTAssertFalse(CeisStarGate.due(moment, ledger: done, policy: generous, now: later), "\(moment.key) after I already starred")
        }

        var off = policy
        off.enabled = false
        XCTAssertFalse(CeisStarGate.due(.signedIn, ledger: CeisStarLedger(), policy: off, now: now))

        let day1 = CeisStarGate.dayOpened(CeisStarLedger(), dayKey: "2026-10-05")
        XCTAssertEqual(day1.days, 1)
        XCTAssertEqual(CeisStarGate.dayOpened(day1, dayKey: "2026-10-05").days, 1, "the same day counts once")
        XCTAssertEqual(CeisStarGate.dayOpened(day1, dayKey: "2026-10-06").days, 2)
        XCTAssertEqual(CeisStarMoment.daysUsed(7).key, "days_used.7")
        XCTAssertEqual(CeisStarMoment.tasks(30).key, "tasks.30")
    }

    // MARK: - Update check (contract C2)

    func testVersionCompare() {
        XCTAssertEqual(CeisUpdateCheck.compareVersions("1.4.0", "1.4.0"), 0)
        XCTAssertEqual(CeisUpdateCheck.compareVersions("v1.4.0", "1.4"), 0, "a missing part is 0; a leading v is ignored")
        XCTAssertEqual(CeisUpdateCheck.compareVersions("1.10.0", "1.9.9"), 1, "numbers, not strings")
        XCTAssertEqual(CeisUpdateCheck.compareVersions("1.4.0", "1.4.1"), -1)
        XCTAssertEqual(CeisUpdateCheck.compareVersions("1.4.0", "1.4.0-beta.1"), 1, "a release beats its pre-release")
        XCTAssertEqual(CeisUpdateCheck.compareVersions("1.4.0-beta.1", "1.4.0-beta.2"), -1)
        XCTAssertEqual(CeisUpdateCheck.compareVersions("1.4.0+7", "1.4.0+9"), 0, "build metadata does not count")
        XCTAssertEqual(CeisUpdateCheck.normalize(" v2.0.1\n"), "2.0.1")
    }

    func testUpdateIndexReadsTheReleasesList() {
        // The index as ceis.cn/dl/index.json is written: releases newest first, each with a tag.
        let index: [String: Any] = [
            "repo": "nano-muse/ceis",
            "releases": [["tag": "v1.0.0", "name": "ceis 1.0.0", "assets": [String]()], ["tag": "v0.1.41"]],
        ]
        let found = CeisUpdateCheck.parseIndex(index)
        XCTAssertEqual(found?.version, "v1.0.0", "the newest release's tag, as Android reads it")
        XCTAssertEqual(found?.page, CeisUpdateCheck.downloadPage, "a tap leads to the download page")
        XCTAssertEqual(CeisUpdateCheck.parseIndex(["releases": [["tag": ""], ["tag": "v0.9.0"]]])?.version, "v0.9.0", "an empty tag is skipped")
        XCTAssertNil(CeisUpdateCheck.parseIndex(["repo": "nano-muse/ceis"]), "no releases, no answer")
        XCTAssertNil(CeisUpdateCheck.parseIndex(["releases": [[String: Any]]()]))
        // The older shapes still read.
        XCTAssertEqual(CeisUpdateCheck.parseIndex(["ios": ["version": "1.2.0", "page": "https://example.invalid/r"]]), CeisUpdateCheck.Found(version: "1.2.0", page: "https://example.invalid/r"))
        XCTAssertEqual(CeisUpdateCheck.parseIndex(["latest": "1.1.0"])?.page, CeisUpdateCheck.downloadPage)
        // GitHub's release object.
        XCTAssertEqual(CeisUpdateCheck.parseGitHubLatest(["tag_name": "v1.0.0", "html_url": "https://example.invalid/tag"]), CeisUpdateCheck.Found(version: "v1.0.0", page: "https://example.invalid/tag"))
        XCTAssertNil(CeisUpdateCheck.parseGitHubLatest(["message": "Not Found"]))
    }
}
