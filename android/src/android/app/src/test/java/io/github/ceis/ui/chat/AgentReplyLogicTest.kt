package io.github.ceis.ui.chat

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ScrollPillPolicyTest {
    @Test
    fun shownOnlyWhenScrolledAwayAndOverflowingWithMessages() {
        assertTrue(ScrollPillPolicy.visible(userScrolledAway = true, contentOverflows = true, hasMessages = true))
    }

    @Test
    fun hiddenWhenAnyConditionIsMissing() {
        assertFalse(ScrollPillPolicy.visible(userScrolledAway = false, contentOverflows = true, hasMessages = true))
        assertFalse(ScrollPillPolicy.visible(userScrolledAway = true, contentOverflows = false, hasMessages = true))
        assertFalse(ScrollPillPolicy.visible(userScrolledAway = true, contentOverflows = true, hasMessages = false))
        assertFalse(ScrollPillPolicy.visible(userScrolledAway = false, contentOverflows = false, hasMessages = false))
    }
}

class BackgroundTasksTest {
    private fun run(taskId: String, label: String, at: Long, session: String?, ok: Boolean) =
        RunSnapshot(taskId, label, at, session, ok)

    private fun finished(n: Int): List<TaskRowModel> =
        BackgroundTasks.finishedRows((1..n).map { run("t", "Task $it", it * 1000L, "s$it", true) })

    @Test
    fun finishedRowsAreNewestFirstWithStateAndStableIds() {
        val rows = BackgroundTasks.finishedRows(
            listOf(
                run("t1", "A", 1000, "s1", true),
                run("t1", "A", 3000, null, false),
                run("t2", "B", 2000, "s2", true),
            ),
        )
        assertEquals(listOf("t1:3000", "t2:2000", "t1:1000"), rows.map { it.id })
        assertEquals(TaskState.Failed, rows[0].state)
        assertNull(rows[0].sessionId)
        assertEquals(TaskState.Done, rows[1].state)
        assertEquals("s2", rows[1].sessionId)
        assertTrue(rows.all { it.kind == TaskKind.Scheduled })
    }

    @Test
    fun runningRowsKeepOnlyRunningOldestFirst() {
        fun row(id: String, state: TaskState, at: Long) =
            TaskRowModel(id, id, TaskKind.Chat, state, at, id)
        val rows = BackgroundTasks.runningRows(
            listOf(row("late", TaskState.Running, 500), row("done", TaskState.Done, 100), row("early", TaskState.Running, 200)),
        )
        assertEquals(listOf("early", "late"), rows.map { it.id })
    }

    @Test
    fun runningCountIgnoresRowsThatAreNotRunning() {
        fun row(state: TaskState) = TaskRowModel("x", "x", TaskKind.Chat, state, 0, null)
        assertEquals(0, BackgroundTasks.runningCount(emptyList()))
        assertEquals(2, BackgroundTasks.runningCount(listOf(row(TaskState.Running), row(TaskState.Done), row(TaskState.Running))))
    }

    @Test
    fun loadMorePagesTenAtATimeAndStopsAtTheEnd() {
        val all = finished(25)
        val first = BackgroundTasks.sections(emptyList(), all, BackgroundTasks.PAGE)
        assertEquals(10, first.finished.size)
        assertEquals(25, first.finishedTotal)
        assertTrue(first.hasMore)

        val next = BackgroundTasks.nextShown(10, 25)
        assertEquals(20, next)
        assertEquals(25, BackgroundTasks.nextShown(20, 25))
        assertEquals(25, BackgroundTasks.nextShown(25, 25))

        val last = BackgroundTasks.sections(emptyList(), all, 25)
        assertEquals(25, last.finished.size)
        assertFalse(last.hasMore)
    }

    @Test
    fun sectionsHandleOddPageSizes() {
        val all = finished(3)
        assertEquals(0, BackgroundTasks.sections(emptyList(), all, -5).finished.size)
        assertEquals(3, BackgroundTasks.sections(emptyList(), all, 100).finished.size)
        assertFalse(BackgroundTasks.sections(emptyList(), emptyList(), 10).hasMore)
    }
}

class DiffStatTest {
    @Test
    fun nothingToCountIsNull() {
        assertNull(DiffStat.of("", ""))
    }

    @Test
    fun countsLinesOfNewAndOldText() {
        assertEquals(DiffStat(added = 2, removed = 0), DiffStat.of("", "a\nb\n"))
        assertEquals(DiffStat(added = 1, removed = 2), DiffStat.of("a\nb", "c"))
        assertEquals(DiffStat(added = 0, removed = 1), DiffStat.of("x\n", ""))
        assertEquals(DiffStat(added = 1, removed = 1), DiffStat.of("old", "new"))
    }
}

class ReplyTextTest {
    @Test
    fun speechDropsMarkdownAndCode() {
        val md = "# Title\n\nSome **bold** text with `code` and a [link](https://x.y).\n\n" +
            "- first item\n- second item\n\n```kotlin\nval x = 1\n```\n1. numbered"
        assertEquals(
            "Title Some bold text with code and a link. first item second item numbered",
            ReplyText.forSpeech(md),
        )
    }

    @Test
    fun speechKeepsSingleUnderscoresInNames() {
        assertEquals("edit file_edit now", ReplyText.forSpeech("edit file_edit now"))
    }

    @Test
    fun elapsedUsesTheLargestTwoUnits() {
        assertEquals("0s", ReplyText.elapsed(0))
        assertEquals("0s", ReplyText.elapsed(-5000))
        assertEquals("59s", ReplyText.elapsed(59_999))
        assertEquals("1m 0s", ReplyText.elapsed(60_000))
        assertEquals("2m 10s", ReplyText.elapsed(130_000))
        assertEquals("1h 1m", ReplyText.elapsed(3_661_000))
    }
}
