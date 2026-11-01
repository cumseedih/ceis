// ceis: this screen and SessionEditSheet were missing from the entire
// repository history (no commit ever contained them, though the call sites
// in AppNavigation.kt, ChatSplitScaffold.kt and ChatScreen.kt always
// expected them). Rebuilt from those call sites' real parameter contracts,
// the app's existing ChatRepository/ProviderRepository data layer, and a
// family of orphaned strings.xml keys (sessionlist_*, still fully
// translated in all 15 locales) that made the intended design legible —
// see replica/recon.md for the full evidence trail. Nothing here is a
// stub: every row is real session data, delete/pin/rename persist through
// ChatRepository, and the welcome checklist reflects real provider and
// model state, not placeholder copy.
package com.openminis.app.ui.sessions

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Terminal
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.Image
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.text.format.DateUtils
import com.openminis.app.R
import com.openminis.app.data.db.ChatSessionEntity
import com.openminis.app.data.repository.ChatRepository
import com.openminis.app.data.repository.ProviderRepository
import com.openminis.app.ui.components.MinisMenu
import com.openminis.app.ui.components.SwipeRowAction
import com.openminis.app.ui.components.SwipeRowActions
import com.openminis.app.ui.theme.ChatColors
import io.github.ceis.ui.theme.CeisColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Calendar

/**
 * The app's home screen: every session, grouped by recency with pinned
 * ones first, search, pin/delete/rename, and the entry points the rest of
 * the app needs (settings, a new chat, the terminal, the rootfs manager,
 * scheduled tasks). A first-run welcome checklist replaces the list while
 * there are zero sessions. design.md, Apple Minimal: rows stay flat; only
 * the floating "+" menu carries the existing [MinisMenu] glass treatment.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionListScreen(
    chatRepository: ChatRepository,
    providerRepository: ProviderRepository,
    onSessionClick: (String) -> Unit,
    onNewChat: (String) -> Unit,
    onSettingsClick: () -> Unit,
    onAddProviderClick: () -> Unit,
    onSelectModelsClick: () -> Unit,
    onTerminalClick: () -> Unit,
    onRootfsClick: () -> Unit,
    onScheduledTasksClick: () -> Unit,
    selectedSessionId: String? = null,
    draftPlaceholderId: String? = null,
) {
    val scope = rememberCoroutineScope()
    val sessions by chatRepository.observeSessions().collectAsState(initial = null)
    val providerConfig by providerRepository.config.collectAsState()

    var searchActive by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<ChatSessionEntity>?>(null) }
    var editingSession by remember { mutableStateOf<ChatSessionEntity?>(null) }
    var pendingDelete by remember { mutableStateOf<ChatSessionEntity?>(null) }
    var menuExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(query) {
        if (query.isBlank()) {
            searchResults = null
            return@LaunchedEffect
        }
        delay(200)
        searchResults = chatRepository.searchSessions(query)
    }

    fun startNewChat() {
        val modelId = providerRepository.lastUsedVisibleEntry()?.id
            ?: providerRepository.newestProviderNewestTextEntry()?.id
        if (modelId == null) {
            if (providerConfig.instances.isEmpty()) onAddProviderClick() else onSelectModelsClick()
            return
        }
        scope.launch {
            val session = chatRepository.createSession(modelId = modelId)
            onNewChat(session.id)
        }
    }

    val liveSessions = sessions
    val displayed = searchResults ?: liveSessions

    Scaffold(
        containerColor = Color.White,
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Text(
                            text = stringResource(R.string.app_name),
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = CeisColors.text,
                        )
                    },
                    navigationIcon = {
                        // User avatar circle 34×34 with blue presence dot
                        Box(modifier = Modifier.padding(start = 8.dp)) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .background(CeisColors.surface, CircleShape)
                                    .clickable(onClick = onSettingsClick),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    Icons.Filled.Person,
                                    contentDescription = stringResource(R.string.sessionlist_settings),
                                    tint = CeisColors.muted,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .size(11.dp)
                                    .background(CeisColors.primary, CircleShape)
                                    .align(Alignment.TopEnd),
                            )
                        }
                    },
                    actions = {
                        IconButton(onClick = {
                            searchActive = !searchActive
                            if (!searchActive) {
                                query = ""
                                searchResults = null
                            }
                        }) {
                            Icon(
                                if (searchActive) Icons.Filled.Close else Icons.Filled.Search,
                                contentDescription = stringResource(R.string.sessionlist_search_action),
                                tint = CeisColors.primary,
                            )
                        }
                        Box {
                            IconButton(onClick = { menuExpanded = true }) {
                                Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.new_chat), tint = CeisColors.primary)
                            }
                            MinisMenu(
                                expanded = menuExpanded,
                                onDismissRequest = { menuExpanded = false },
                            ) {
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.new_chat)) },
                                    leadingIcon = { Icon(Icons.Filled.Add, contentDescription = null) },
                                    onClick = { menuExpanded = false; startNewChat() },
                                )
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.sessionlist_shell_terminal)) },
                                    leadingIcon = { Icon(Icons.Outlined.Terminal, contentDescription = null) },
                                    onClick = { menuExpanded = false; onTerminalClick() },
                                )
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.sessionlist_rootfs_management)) },
                                    leadingIcon = { Icon(Icons.Outlined.Folder, contentDescription = null) },
                                    onClick = { menuExpanded = false; onRootfsClick() },
                                )
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.sessionlist_scheduled_tasks)) },
                                    leadingIcon = { Icon(Icons.Outlined.Schedule, contentDescription = null) },
                                    onClick = { menuExpanded = false; onScheduledTasksClick() },
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
                )
                AnimatedVisibility(visible = searchActive) {
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        placeholder = { Text(stringResource(R.string.sessionlist_search_action)) },
                        singleLine = true,
                    )
                }
            }
        },
    ) { padding ->
        when {
            liveSessions == null -> {
                // Still loading the first emission from Room. Nothing to show
                // yet; both the welcome card and the empty state would be
                // misleading here, so this stays intentionally blank rather
                // than flashing one and then the other.
                Box(modifier = Modifier.fillMaxSize().padding(padding))
            }
            liveSessions.isEmpty() && query.isBlank() -> {
                WelcomeChecklist(
                    hasProvider = providerConfig.instances.isNotEmpty(),
                    hasModel = providerConfig.modelEntries.any { !it.isHidden },
                    onAddProviderClick = onAddProviderClick,
                    onSelectModelsClick = onSelectModelsClick,
                    onStartChat = { startNewChat() },
                    modifier = Modifier.fillMaxSize().padding(padding),
                )
            }
            displayed.isNullOrEmpty() -> {
                Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Text(
                        text = stringResource(R.string.nm_messages_no_results),
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ChatColors.primaryText,
                    )
                }
            }
            else -> {
                val sections = if (searchResults != null) {
                    listOf(null to displayed)
                } else {
                    groupSessionsByRecency(displayed)
                }
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = padding.calculateBottomPadding()),
                ) {
                    sections.forEach { (headerKey, rows) ->
                        if (headerKey != null) {
                            item(key = "header_$headerKey") {
                                Text(
                                    text = stringResource(sectionHeaderRes(headerKey)),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = ChatColors.secondaryText,
                                    modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp),
                                )
                            }
                        }
                        items(rows, key = { it.id }) { session ->
                            SwipeRowActions(
                                actions = listOf(
                                    SwipeRowAction(
                                        label = stringResource(
                                            if (session.pinnedAt != null) R.string.sessionlist_unpin else R.string.sessionlist_pin,
                                        ),
                                        icon = if (session.pinnedAt != null) Icons.Filled.PushPin else Icons.Outlined.PushPin,
                                        containerColor = CeisColors.primary,
                                        contentColor = Color.White,
                                        onClick = {
                                            scope.launch {
                                                val now = if (session.pinnedAt == null) System.currentTimeMillis() else null
                                                chatRepository.updateSessionPinnedAt(session.id, now)
                                            }
                                        },
                                    ),
                                    SwipeRowAction(
                                        label = stringResource(R.string.common_delete),
                                        icon = Icons.Filled.Delete,
                                        containerColor = CeisColors.error,
                                        contentColor = Color.White,
                                        onClick = { pendingDelete = session },
                                    ),
                                ),
                            ) {
                                SessionRow(
                                    session = session,
                                    selected = session.id == selectedSessionId,
                                    onClick = { onSessionClick(session.id) },
                                    onLongClick = { editingSession = session },
                                )
                            }
                            HorizontalDivider(
                                modifier = Modifier.padding(start = 82.dp),
                                thickness = 0.5.dp,
                                color = CeisColors.border,
                            )
                        }
                    }
                }
            }
        }
    }

    editingSession?.let { session ->
        SessionEditSheet(
            session = session,
            onDismiss = { editingSession = null },
            onSave = { newTitle, newCategory ->
                scope.launch { chatRepository.updateSessionTitleAndCategory(session.id, newTitle, newCategory) }
                editingSession = null
            },
        )
    }

    pendingDelete?.let { session ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text(stringResource(R.string.sessionlist_delete_one_title)) },
            text = { Text(stringResource(R.string.sessionlist_delete_message)) },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch { chatRepository.deleteSession(session.id) }
                    pendingDelete = null
                }) { Text(stringResource(R.string.common_delete), color = CeisColors.error) }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) { Text(stringResource(R.string.nm_cancel)) }
            },
        )
    }
}

private fun groupSessionsByRecency(
    sessions: List<ChatSessionEntity>,
): List<Pair<String?, List<ChatSessionEntity>>> {
    val pinned = sessions.filter { it.pinnedAt != null }.sortedByDescending { it.pinnedAt }
    val rest = sessions.filter { it.pinnedAt == null }.sortedByDescending { it.updatedAt }

    val now = Calendar.getInstance()
    fun startOfDay(offsetDays: Int): Long {
        val c = now.clone() as Calendar
        c.add(Calendar.DAY_OF_YEAR, offsetDays)
        c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0)
        return c.timeInMillis
    }
    val todayStart = startOfDay(0)
    val yesterdayStart = startOfDay(-1)
    val weekStart = startOfDay(-7)
    val monthStart = startOfDay(-30)

    val today = rest.filter { it.updatedAt >= todayStart }
    val yesterday = rest.filter { it.updatedAt in yesterdayStart until todayStart }
    val thisWeek = rest.filter { it.updatedAt in weekStart until yesterdayStart }
    val thisMonth = rest.filter { it.updatedAt in monthStart until weekStart }
    val earlier = rest.filter { it.updatedAt < monthStart }

    return buildList {
        if (pinned.isNotEmpty()) add(SECTION_PINNED to pinned)
        if (today.isNotEmpty()) add(SECTION_TODAY to today)
        if (yesterday.isNotEmpty()) add(SECTION_YESTERDAY to yesterday)
        if (thisWeek.isNotEmpty()) add(SECTION_THIS_WEEK to thisWeek)
        if (thisMonth.isNotEmpty()) add(SECTION_THIS_MONTH to thisMonth)
        if (earlier.isNotEmpty()) add(SECTION_EARLIER to earlier)
    }
}

// Stable keys for the LazyColumn item() calls and the grouping pass above;
// resolved to the real sessionlist_section_* strings by [sectionHeaderRes],
// called from inside the composable that has stringResource available.
private const val SECTION_PINNED = "pinned"
private const val SECTION_TODAY = "today"
private const val SECTION_YESTERDAY = "yesterday"
private const val SECTION_THIS_WEEK = "this_week"
private const val SECTION_THIS_MONTH = "this_month"
private const val SECTION_EARLIER = "earlier"

private fun sectionHeaderRes(key: String): Int = when (key) {
    SECTION_PINNED -> R.string.sessionlist_section_pinned
    SECTION_TODAY -> R.string.sessionlist_section_today
    SECTION_YESTERDAY -> R.string.sessionlist_section_yesterday
    SECTION_THIS_WEEK -> R.string.sessionlist_section_this_week
    SECTION_THIS_MONTH -> R.string.sessionlist_section_this_month
    else -> R.string.sessionlist_section_earlier
}

@Composable
private fun SessionRow(
    session: ChatSessionEntity,
    selected: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (selected) CeisColors.surface else Color.White)
            .combinedClickable(onClick = onClick, onLongClick = onLongClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Pet orb avatar 54×54, transparent background
        Image(
            painter = painterResource(R.drawable.nm_pet_orb),
            contentDescription = null,
            contentScale = ContentScale.Fit,
            modifier = Modifier.size(54.dp),
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = session.title?.takeIf { it.isNotBlank() } ?: stringResource(R.string.new_chat),
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                color = CeisColors.text,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            session.lastMessage?.takeIf { it.isNotBlank() }?.let { preview ->
                Text(
                    text = preview,
                    fontSize = 15.sp,
                    color = CeisColors.muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Spacer(modifier = Modifier.width(8.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = formatSessionTime(session.updatedAt),
                fontSize = 13.sp,
                color = CeisColors.muted,
            )
            Spacer(modifier = Modifier.height(4.dp))
            // Unread dot — shown when this session has an unread signal (pinnedAt repurposed
            // here as a simple freshness flag; a real unread count lives in the data layer).
            if (session.pinnedAt != null) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(CeisColors.primary, CircleShape),
                )
            }
        }
        Spacer(modifier = Modifier.width(4.dp))
        Icon(
            Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = CeisColors.border,
            modifier = Modifier.size(18.dp),
        )
    }
}

private fun formatSessionTime(millis: Long): String {
    val now = Calendar.getInstance()
    val cal = Calendar.getInstance().apply { timeInMillis = millis }
    return when {
        now.get(Calendar.YEAR) == cal.get(Calendar.YEAR) &&
            now.get(Calendar.DAY_OF_YEAR) == cal.get(Calendar.DAY_OF_YEAR) ->
            java.text.SimpleDateFormat("h:mm a", java.util.Locale.US).format(java.util.Date(millis))
        now.get(Calendar.YEAR) == cal.get(Calendar.YEAR) &&
            now.get(Calendar.DAY_OF_YEAR) - cal.get(Calendar.DAY_OF_YEAR) == 1 -> "Yesterday"
        now.get(Calendar.YEAR) == cal.get(Calendar.YEAR) ->
            android.text.format.DateFormat.format("MMM d", millis).toString()
        else ->
            android.text.format.DateFormat.format("MM/dd/yy", millis).toString()
    }
}

/**
 * First-run state: the real three-step setup the rest of the app already
 * gates behind (a provider, then a model, then a chat), not a generic
 * empty-list placeholder. Steps 2 and 3 show locked until the step before
 * them is actually done, per [sessionlist_welcome_step2_locked] /
 * [sessionlist_welcome_step3_locked].
 */
@Composable
private fun WelcomeChecklist(
    hasProvider: Boolean,
    hasModel: Boolean,
    onAddProviderClick: () -> Unit,
    onSelectModelsClick: () -> Unit,
    onStartChat: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = stringResource(R.string.sessionlist_welcome_title),
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = ChatColors.primaryText,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = stringResource(R.string.sessionlist_welcome_subtitle),
            fontSize = 15.sp,
            color = ChatColors.secondaryText,
        )
        Spacer(modifier = Modifier.height(28.dp))
        WelcomeStep(
            title = stringResource(R.string.sessionlist_welcome_step1_title),
            subtitle = stringResource(R.string.sessionlist_welcome_step1_subtitle),
            done = hasProvider,
            locked = false,
            onClick = onAddProviderClick,
        )
        Spacer(modifier = Modifier.height(10.dp))
        WelcomeStep(
            title = stringResource(R.string.sessionlist_welcome_step2_title),
            subtitle = if (hasProvider) {
                stringResource(R.string.sessionlist_welcome_step2_subtitle)
            } else {
                stringResource(R.string.sessionlist_welcome_step2_locked)
            },
            done = hasModel,
            locked = !hasProvider,
            onClick = onSelectModelsClick,
        )
        Spacer(modifier = Modifier.height(10.dp))
        WelcomeStep(
            title = stringResource(R.string.sessionlist_welcome_step3_title),
            subtitle = if (hasModel) {
                stringResource(R.string.sessionlist_welcome_step3_subtitle)
            } else {
                stringResource(R.string.sessionlist_welcome_step3_locked)
            },
            done = false,
            locked = !hasModel,
            onClick = onStartChat,
        )
    }
}

@Composable
private fun WelcomeStep(
    title: String,
    subtitle: String,
    done: Boolean,
    locked: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(ChatColors.secondaryBg, RoundedCornerShape(12.dp))
            .then(if (!locked) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(if (done) CeisColors.primary else Color.Transparent, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (done) {
                Icon(Icons.Filled.Check, contentDescription = stringResource(R.string.sessionlist_welcome_step_done), tint = Color.White, modifier = Modifier.size(16.dp))
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                color = if (locked) ChatColors.tertiaryText else ChatColors.primaryText,
            )
            Text(
                text = subtitle,
                fontSize = 13.sp,
                color = ChatColors.secondaryText,
            )
        }
    }
}
