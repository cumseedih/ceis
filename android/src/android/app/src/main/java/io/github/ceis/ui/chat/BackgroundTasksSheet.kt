package io.github.ceis.ui.chat

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogWindowProvider
import com.openminis.app.R
import com.openminis.app.data.repository.ChatRepository
import com.openminis.app.scheduled.ScheduledTask
import com.openminis.app.scheduled.ScheduledTaskStore
import com.openminis.app.service.SessionActivityTracker
import com.openminis.app.ui.theme.ChatColors
import io.github.ceis.ui.glass.LiquidGlassDefaults
import io.github.ceis.ui.glass.liquidGlassWindowBlur
import io.github.ceis.ui.theme.CeisMotion
import kotlinx.coroutines.delay

/**
 * "Running tasks: N" above the composer, and the sheet it opens. Everything
 * shown is read from what the app records:
 *  - running: chats other than the one on screen whose agent is streaming now
 *    ([SessionActivityTracker.activeSessions], with the start time it records);
 *  - finished: the run history of scheduled tasks (goal checks are scheduled
 *    tasks too), newest first.
 * The link is hidden while nothing else is running. There is no per-run stop
 * control because the app only knows how to stop every run at once.
 */
@Composable
internal fun BackgroundTasksHost(
    chatRepository: ChatRepository,
    currentSessionId: String?,
    onOpenSession: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val active by SessionActivityTracker.activeSessions.collectAsState()
    val otherIds = remember(active, currentSessionId) { active.filter { it != currentSessionId }.sorted() }
    val titles by produceState(initialValue = emptyMap<String, String>(), otherIds) {
        value = otherIds.associateWith { id -> chatRepository.getSession(id)?.title.orEmpty() }
    }
    val running = otherIds.map { id ->
        TaskRowModel(
            id = "run:$id",
            title = titles[id].orEmpty(),
            kind = TaskKind.Chat,
            state = TaskState.Running,
            atMillis = SessionActivityTracker.startedAtMillis(id) ?: 0L,
            sessionId = id,
        )
    }
    val store = remember { ScheduledTaskStore(context) }
    val tasks by remember { store.observe() }.collectAsState(initial = emptyList<ScheduledTask>())
    val finishedAll = remember(tasks) {
        BackgroundTasks.finishedRows(
            tasks.flatMap { task ->
                task.runHistory.map { run ->
                    RunSnapshot(task.id, task.label, run.firedAt, run.sessionId, run.ok)
                }
            },
        )
    }
    var open by rememberSaveable { mutableStateOf(false) }
    val count = BackgroundTasks.runningCount(running)
    if (count > 0) {
        val palette = ceisReplyPalette()
        Row(
            modifier = modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .clickable(role = Role.Button) { open = true }
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BasicText(
                text = stringResource(R.string.nm_tasks_running_link, count),
                style = TextStyle(color = palette.link, fontSize = 13.sp),
            )
        }
    }
    if (open) {
        BackgroundTasksSheet(
            running = running,
            finishedAll = finishedAll,
            onOpenSession = onOpenSession,
            onDismiss = { open = false },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BackgroundTasksSheet(
    running: List<TaskRowModel>,
    finishedAll: List<TaskRowModel>,
    onOpenSession: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val palette = ceisReplyPalette()
    val sheetShape = BottomSheetDefaults.ExpandedShape
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false),
        // The material is drawn by liquidGlassWindowBlur on the content below,
        // the same way the model picker does it: the sheet is its own window.
        containerColor = Color.Transparent,
        scrimColor = Color.Black.copy(alpha = CeisMotion.ScrimAlpha),
        dragHandle = {
            Box(
                modifier = Modifier.fillMaxWidth().padding(top = 6.dp, bottom = 4.dp),
                contentAlignment = Alignment.TopCenter,
            ) {
                Box(
                    modifier = Modifier
                        .width(32.dp)
                        .height(4.dp)
                        .background(ChatColors.secondaryText.copy(alpha = 0.4f), RoundedCornerShape(2.dp)),
                )
            }
        },
    ) {
        val sheetView = LocalView.current
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val sheetWindow = (sheetView.parent as? DialogWindowProvider)?.window
            sheetWindow?.setBackgroundBlurRadius(
                with(LocalDensity.current) { LiquidGlassDefaults.RegularBlurRadius.roundToPx() },
            )
        }
        var shown by rememberSaveable { mutableStateOf(BackgroundTasks.PAGE) }
        var runningOpen by rememberSaveable { mutableStateOf(true) }
        var finishedOpen by rememberSaveable { mutableStateOf(true) }
        val now by produceState(initialValue = System.currentTimeMillis()) {
            while (true) {
                delay(1000)
                value = System.currentTimeMillis()
            }
        }
        val sections = BackgroundTasks.sections(running, finishedAll, shown)
        val openChat: (String) -> Unit = { id ->
            onDismiss()
            onOpenSession(id)
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
                .liquidGlassWindowBlur(
                    shape = sheetShape,
                    tint = ChatColors.background,
                    forceOpaque = Build.VERSION.SDK_INT < Build.VERSION_CODES.S,
                )
                .navigationBarsPadding(),
        ) {
            Box(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp).heightIn(min = 48.dp),
            ) {
                IconButton(onClick = onDismiss, modifier = Modifier.align(Alignment.CenterStart)) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = stringResource(R.string.nm_tasks_close),
                        tint = palette.toolTextPeak,
                    )
                }
                BasicText(
                    text = stringResource(R.string.nm_tasks_title),
                    style = TextStyle(color = palette.toolTextPeak, fontSize = 17.sp, fontWeight = FontWeight.SemiBold),
                    modifier = Modifier.align(Alignment.Center),
                )
            }
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item(key = "head-running") {
                    SectionHeader(
                        label = stringResource(R.string.nm_tasks_section_running),
                        count = sections.running.size,
                        expanded = runningOpen,
                        onToggle = { runningOpen = !runningOpen },
                    )
                }
                if (runningOpen) {
                    items(sections.running, key = { it.id }) { row -> TaskRow(row, now, openChat) }
                }
                item(key = "head-finished") {
                    SectionHeader(
                        label = stringResource(R.string.nm_tasks_section_finished),
                        count = sections.finishedTotal,
                        expanded = finishedOpen,
                        onToggle = { finishedOpen = !finishedOpen },
                    )
                }
                if (finishedOpen) {
                    items(sections.finished, key = { it.id }) { row -> TaskRow(row, now, openChat) }
                    if (sections.hasMore) {
                        item(key = "load-more") {
                            LoadMoreButton(onClick = { shown = BackgroundTasks.nextShown(shown, sections.finishedTotal) })
                        }
                    }
                }
                if (sections.running.isEmpty() && sections.finishedTotal == 0) {
                    item(key = "none") {
                        BasicText(
                            text = stringResource(R.string.nm_tasks_none),
                            style = TextStyle(color = palette.toolText, fontSize = 14.sp),
                            modifier = Modifier.padding(vertical = 12.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(label: String, count: Int, expanded: Boolean, onToggle: () -> Unit) {
    val palette = ceisReplyPalette()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clickable(role = Role.Button, onClick = onToggle),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BasicText(
            text = "$label $count",
            style = TextStyle(color = palette.toolText, fontSize = 13.sp, fontWeight = FontWeight.Medium),
        )
        Spacer(Modifier.width(4.dp))
        Icon(
            Icons.Default.KeyboardArrowDown,
            contentDescription = null,
            tint = palette.toolText,
            modifier = Modifier.size(16.dp).rotate(if (expanded) 0f else -90f),
        )
    }
}

@Composable
private fun TaskRow(row: TaskRowModel, nowMillis: Long, onOpenChat: (String) -> Unit) {
    val palette = ceisReplyPalette()
    val title = row.title.ifBlank { stringResource(R.string.nm_task_untitled) }
    val kind = stringResource(if (row.kind == TaskKind.Chat) R.string.nm_task_kind_chat else R.string.nm_task_kind_scheduled)
    val state = stringResource(
        when (row.state) {
            TaskState.Running -> R.string.nm_task_state_running
            TaskState.Done -> R.string.nm_task_state_done
            TaskState.Failed -> R.string.nm_task_state_failed
        },
    )
    val time = when {
        row.atMillis <= 0L -> ""
        row.state == TaskState.Running -> ReplyText.elapsed(nowMillis - row.atMillis)
        else -> java.text.DateFormat
            .getDateTimeInstance(java.text.DateFormat.SHORT, java.text.DateFormat.SHORT)
            .format(java.util.Date(row.atMillis))
    }
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = palette.rowFill,
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            BasicText(
                text = title,
                style = TextStyle(color = palette.toolTextPeak, fontSize = 14.sp, fontWeight = FontWeight.Medium),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(2.dp))
            BasicText(
                text = listOf(kind, state, time).filter { it.isNotBlank() }.joinToString(", "),
                style = TextStyle(color = palette.toolText, fontSize = 12.sp),
            )
            val sessionId = row.sessionId
            if (sessionId != null) {
                Box(
                    modifier = Modifier
                        .heightIn(min = 48.dp)
                        .clickable(role = Role.Button) { onOpenChat(sessionId) },
                    contentAlignment = Alignment.CenterStart,
                ) {
                    BasicText(
                        text = stringResource(R.string.nm_task_open_chat),
                        style = TextStyle(color = palette.link, fontSize = 13.sp, fontWeight = FontWeight.Medium),
                    )
                }
            }
        }
    }
}

@Composable
private fun LoadMoreButton(onClick: () -> Unit) {
    val palette = ceisReplyPalette()
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(44.dp)
            .clip(CircleShape)
            .border(1.dp, palette.outline, CircleShape)
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            text = stringResource(R.string.nm_tasks_load_more),
            style = TextStyle(color = palette.toolTextPeak, fontSize = 15.sp),
        )
    }
}
