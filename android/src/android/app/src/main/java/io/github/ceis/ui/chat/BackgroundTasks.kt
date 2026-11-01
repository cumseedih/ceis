package io.github.ceis.ui.chat

/**
 * The model behind the running-tasks sheet and the diff badge. Pure, so it is
 * unit-tested. Nothing here invents data: rows are built from what the app
 * records (sessions that are streaming, scheduled-task run history).
 */
internal enum class TaskKind { Chat, Scheduled }

internal enum class TaskState { Running, Done, Failed }

internal data class TaskRowModel(
    val id: String,
    val title: String,
    val kind: TaskKind,
    val state: TaskState,
    /** Start time for a running row, fire time for a finished one (epoch ms). */
    val atMillis: Long,
    /** The chat to open, when there is one. */
    val sessionId: String?,
)

/** One recorded run of a scheduled task, as read from the task store. */
internal data class RunSnapshot(
    val taskId: String,
    val label: String,
    val firedAtMillis: Long,
    val sessionId: String?,
    val ok: Boolean,
)

internal data class TaskSections(
    val running: List<TaskRowModel>,
    val finished: List<TaskRowModel>,
    val finishedTotal: Int,
) {
    val hasMore: Boolean get() = finished.size < finishedTotal
}

internal object BackgroundTasks {
    /** Rows added by one press of Load more, and the first page. */
    const val PAGE = 10

    /** Finished rows from scheduled-task run history, newest first. */
    fun finishedRows(runs: List<RunSnapshot>): List<TaskRowModel> =
        runs.sortedByDescending { it.firedAtMillis }.map {
            TaskRowModel(
                id = "${it.taskId}:${it.firedAtMillis}",
                title = it.label,
                kind = TaskKind.Scheduled,
                state = if (it.ok) TaskState.Done else TaskState.Failed,
                atMillis = it.firedAtMillis,
                sessionId = it.sessionId,
            )
        }

    /** Running rows, oldest start first so the list does not reorder as time passes. */
    fun runningRows(rows: List<TaskRowModel>): List<TaskRowModel> =
        rows.filter { it.state == TaskState.Running }.sortedBy { it.atMillis }

    /** How many finished rows to show after one more press of Load more. */
    fun nextShown(shown: Int, total: Int): Int = minOf(total, shown + PAGE)

    fun sections(running: List<TaskRowModel>, finishedAll: List<TaskRowModel>, shown: Int): TaskSections {
        val count = minOf(finishedAll.size, maxOf(shown, 0))
        return TaskSections(
            running = runningRows(running),
            finished = finishedAll.take(count),
            finishedTotal = finishedAll.size,
        )
    }

    /** What the "N running tasks" link counts. Zero hides the link. */
    fun runningCount(running: List<TaskRowModel>): Int = running.count { it.state == TaskState.Running }
}

/**
 * Lines written and lines replaced by one file edit: the line counts of the new
 * and the old text. It is not a line-by-line diff.
 */
internal data class DiffStat(val added: Int, val removed: Int) {
    companion object {
        fun of(oldText: String, newText: String): DiffStat? {
            if (oldText.isEmpty() && newText.isEmpty()) return null
            return DiffStat(added = lineCount(newText), removed = lineCount(oldText))
        }

        private fun lineCount(text: String): Int {
            val trimmed = text.trimEnd('\n')
            return if (trimmed.isEmpty()) 0 else trimmed.lines().size
        }
    }
}
