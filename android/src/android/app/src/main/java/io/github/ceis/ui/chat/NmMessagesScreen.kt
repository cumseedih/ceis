package io.github.ceis.ui.chat

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.openminis.app.R
import com.openminis.app.data.db.ChatSessionEntity
import com.openminis.app.data.repository.ChatRepository
import com.openminis.app.ui.theme.ChatColors
import io.github.ceis.ui.avatar.AgentAvatar
import io.github.ceis.ui.avatar.AgentMood
import android.text.format.DateFormat
import java.util.Calendar
import java.util.Date

// ceis: Messages — the template conversation list (Figma Chat List), fed
// by the app's real session store. Tapping a row opens that session; the
// compose button starts a new one. Never fake rows: with no sessions the
// screen shows the same layout with an empty state. The template's blue
// unread dot is omitted — the session store has no unread field. Header
// (reference style): profile circle left with a blue dot, Messages title
// centered, search + plus circles right; the plus circle opens a menu.
// The profile circle is visual-only — no profile entry is wired from this
// screen. The bottom search pill was removed at user direction; tapping
// the search circle expands a header search input with the same
// live-filter behavior instead.
@Composable
fun NmMessagesScreen(
    chatRepository: ChatRepository,
    onSessionClick: (String) -> Unit,
    onNewChat: () -> Unit,
) {
    val sessions by chatRepository.observeSessions().collectAsState(initial = emptyList())
    var searching by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var plusMenuOpen by remember { mutableStateOf(false) }
    val newChatTitle = stringResource(R.string.chat_menu_new_chat)
    val visible = remember(sessions, query, newChatTitle) {
        val sorted = sessions.sortedByDescending { it.updatedAt }
        if (query.isBlank()) {
            sorted
        } else {
            val q = query.trim()
            sorted.filter { session ->
                val title = session.title?.trim()?.takeIf { it.isNotEmpty() } ?: newChatTitle
                title.contains(q, ignoreCase = true) ||
                    (session.lastMessage?.contains(q, ignoreCase = true) == true)
            }
        }
    }
    val dark = ChatColors.isDark
    val noFontPad = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
    val iconTint = if (dark) Color.White else Color(0xFF404040)
    val circleBackground = if (dark) Color(0xFF2C2C2E) else Color.White
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ChatColors.background),
    ) {
        Column(Modifier.fillMaxSize()) {
            // ceis: header 54dp below the system status bar: profile
            // circle left, Messages centered, search + plus circles right.
            // In search mode the row becomes a search input + close circle.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .height(54.dp),
            ) {
                Text(
                    stringResource(R.string.nm_messages_title),
                    fontSize = 17.sp,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (dark) Color.White else Color(0xFF333333),
                    style = noFontPad,
                    modifier = Modifier.align(Alignment.Center),
                )
                if (searching) {
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .shadow(
                                    elevation = 4.dp,
                                    shape = RoundedCornerShape(22.dp),
                                    clip = false,
                                    ambientColor = Color.Black.copy(alpha = 0.06f),
                                    spotColor = Color.Black.copy(alpha = 0.12f),
                                )
                                .clip(RoundedCornerShape(22.dp))
                                .background(circleBackground),
                        ) {
                            BasicTextField(
                                value = query,
                                onValueChange = { query = it },
                                singleLine = true,
                                textStyle = TextStyle(
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = ChatColors.primaryText,
                                    platformStyle = PlatformTextStyle(includeFontPadding = false),
                                ),
                                cursorBrush = SolidColor(ChatColors.primaryText),
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 16.dp),
                                decorationBox = { innerTextField ->
                                    Row(
                                        modifier = Modifier.fillMaxSize(),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(
                                            Icons.Filled.Search,
                                            contentDescription = null,
                                            tint = Color(0xFF8C8C8C),
                                            modifier = Modifier.size(20.dp),
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        Box(Modifier.weight(1f)) {
                                            if (query.isEmpty()) {
                                                Text(
                                                    stringResource(R.string.nm_drawer_search),
                                                    fontSize = 16.sp,
                                                    fontWeight = FontWeight.Medium,
                                                    color = Color(0xFF8C8C8C),
                                                    style = noFontPad,
                                                )
                                            }
                                            innerTextField()
                                        }
                                        if (query.isNotEmpty()) {
                                            Spacer(Modifier.width(8.dp))
                                            Icon(
                                                Icons.Filled.Close,
                                                contentDescription = null,
                                                tint = Color(0xFF8C8C8C),
                                                modifier = Modifier
                                                    .size(20.dp)
                                                    .clickable { query = "" },
                                            )
                                        }
                                    }
                                },
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .shadow(
                                    elevation = 4.dp,
                                    shape = CircleShape,
                                    clip = false,
                                    ambientColor = Color.Black.copy(alpha = 0.06f),
                                    spotColor = Color.Black.copy(alpha = 0.12f),
                                )
                                .clip(CircleShape)
                                .background(circleBackground)
                                .clickable {
                                    searching = false
                                    query = ""
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Filled.Close,
                                contentDescription = null,
                                tint = iconTint,
                                modifier = Modifier.size(22.dp),
                            )
                        }
                    }
                } else {
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // ceis: profile circle, visual-only; blue dot at
                        // the top-right rim, as in the reference.
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clickable { /* ceis: visual-only; no profile entry wired from this screen */ },
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .shadow(
                                        elevation = 4.dp,
                                        shape = CircleShape,
                                        clip = false,
                                        ambientColor = Color.Black.copy(alpha = 0.06f),
                                        spotColor = Color.Black.copy(alpha = 0.12f),
                                    )
                                    .clip(CircleShape)
                                    .background(circleBackground),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    painterResource(R.drawable.nm_ic_profile),
                                    contentDescription = null,
                                    tint = iconTint,
                                    modifier = Modifier.size(24.dp),
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .align(Alignment.TopEnd)
                                    .clip(CircleShape)
                                    .background(Color(0xFF0071E3)),
                            )
                        }
                        Spacer(Modifier.weight(1f))
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .shadow(
                                    elevation = 4.dp,
                                    shape = CircleShape,
                                    clip = false,
                                    ambientColor = Color.Black.copy(alpha = 0.06f),
                                    spotColor = Color.Black.copy(alpha = 0.12f),
                                )
                                .clip(CircleShape)
                                .background(circleBackground)
                                .clickable { searching = true },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                painterResource(R.drawable.nm_ic_search),
                                contentDescription = null,
                                tint = iconTint,
                                modifier = Modifier.size(24.dp),
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Box {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .shadow(
                                        elevation = 4.dp,
                                        shape = CircleShape,
                                        clip = false,
                                        ambientColor = Color.Black.copy(alpha = 0.06f),
                                        spotColor = Color.Black.copy(alpha = 0.12f),
                                    )
                                    .clip(CircleShape)
                                    .background(circleBackground)
                                    .clickable { plusMenuOpen = true },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    painterResource(R.drawable.nm_ic_plus),
                                    contentDescription = null,
                                    tint = iconTint,
                                    modifier = Modifier.size(24.dp),
                                )
                            }
                            DropdownMenu(
                                expanded = plusMenuOpen,
                                onDismissRequest = { plusMenuOpen = false },
                                shape = RoundedCornerShape(24.dp),
                                containerColor = circleBackground,
                                shadowElevation = 8.dp,
                            ) {
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            "Agent",
                                            fontSize = 17.sp,
                                            color = ChatColors.primaryText,
                                            style = noFontPad,
                                        )
                                    },
                                    leadingIcon = {
                                        Icon(
                                            painterResource(R.drawable.nm_ic_agent),
                                            contentDescription = null,
                                            tint = iconTint,
                                            modifier = Modifier.size(22.dp),
                                        )
                                    },
                                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp),
                                    onClick = {
                                        plusMenuOpen = false
                                        onNewChat()
                                    },
                                )
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            "Scan & create",
                                            fontSize = 17.sp,
                                            color = ChatColors.primaryText,
                                            style = noFontPad,
                                        )
                                    },
                                    leadingIcon = {
                                        Icon(
                                            painterResource(R.drawable.nm_ic_scan),
                                            contentDescription = null,
                                            tint = iconTint,
                                            modifier = Modifier.size(22.dp),
                                        )
                                    },
                                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp),
                                    // ceis: dismiss only; no scan flow exists yet.
                                    onClick = { plusMenuOpen = false },
                                )
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            "Group Chat",
                                            fontSize = 17.sp,
                                            color = ChatColors.primaryText,
                                            style = noFontPad,
                                        )
                                    },
                                    leadingIcon = {
                                        Icon(
                                            painterResource(R.drawable.nm_ic_hash),
                                            contentDescription = null,
                                            tint = iconTint,
                                            modifier = Modifier.size(22.dp),
                                        )
                                    },
                                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp),
                                    // ceis: dismiss only; no group flow exists yet.
                                    onClick = { plusMenuOpen = false },
                                )
                            }
                        }
                    }
                }
            }
            if (sessions.isEmpty()) {
                // ceis: same layout, empty state in the template's language.
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Spacer(Modifier.weight(1f))
                    Text(
                        stringResource(R.string.nm_messages_empty_title),
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ChatColors.primaryText,
                        style = noFontPad,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        stringResource(R.string.nm_messages_empty_body),
                        fontSize = 15.sp,
                        color = if (dark) ChatColors.secondaryText else Color(0xFF3C3C43).copy(alpha = 0.60f),
                        style = noFontPad,
                    )
                    Spacer(Modifier.weight(1f))
                }
            } else if (searching && query.isNotBlank() && visible.isEmpty()) {
                // ceis: search found nothing — same layout, no-results text.
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Spacer(Modifier.weight(1f))
                    Text(
                        stringResource(R.string.nm_messages_no_results),
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ChatColors.primaryText,
                        style = noFontPad,
                    )
                    Spacer(Modifier.weight(1f))
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentPadding = PaddingValues(bottom = 96.dp),
                ) {
                    items(visible, key = { it.id }) { session ->
                        NmMessagesRow(
                            session = session,
                            onClick = { onSessionClick(session.id) },
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(1.dp)
                                .background(if (dark) Color.White.copy(alpha = 0.12f) else Color(0xFFE5E5EA)),
                        )
                    }
                }
            }
        }
        // ceis: bottom bar — compose button only (search removed at user direction).
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(end = 28.dp, bottom = 12.dp),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .shadow(
                        elevation = 4.dp,
                        shape = CircleShape,
                        clip = false,
                        ambientColor = Color.Black.copy(alpha = 0.06f),
                        spotColor = Color.Black.copy(alpha = 0.12f),
                    )
                    .clip(CircleShape)
                    .background(if (dark) Color(0xFF2C2C2E) else Color.White)
                    .clickable(onClick = onNewChat),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painterResource(R.drawable.ic_compose),
                    contentDescription = null,
                    tint = if (dark) Color.White else Color(0xFF404040),
                    modifier = Modifier.size(24.dp),
                )
            }
        }
    }
}

// ceis: one template row, 88dp: 45dp face at x16, name at x83 (Semibold
// 17), 2-line gray preview, time + chevron right-aligned.
@Composable
private fun NmMessagesRow(
    session: ChatSessionEntity,
    onClick: () -> Unit,
) {
    val context = LocalContext.current
    val dark = ChatColors.isDark
    val muted = if (dark) ChatColors.secondaryText else Color(0xFF3C3C43).copy(alpha = 0.60f)
    val chevron = if (dark) ChatColors.secondaryText else Color(0xFF3C3C43).copy(alpha = 0.30f)
    val noFontPad = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
    val title = session.title?.trim()?.takeIf { it.isNotEmpty() }
        ?: stringResource(R.string.chat_menu_new_chat)
    val preview = session.lastMessage?.trim().orEmpty()
    val time = remember(session.updatedAt) { nmMessagesTime(context, session.updatedAt) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(88.dp)
            .clickable(onClick = onClick)
            .padding(start = 16.dp, end = 16.dp, top = 12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        AgentAvatar(mood = AgentMood.IDLE, size = 45.dp)
        Spacer(Modifier.width(22.dp))
        Column(Modifier.weight(1f)) {
            Text(
                title,
                fontSize = 17.sp,
                lineHeight = 22.sp,
                fontWeight = FontWeight.SemiBold,
                color = ChatColors.primaryText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = noFontPad,
            )
            if (preview.isNotEmpty()) {
                Text(
                    preview,
                    fontSize = 15.sp,
                    lineHeight = 20.sp,
                    color = muted,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    style = noFontPad,
                )
            }
        }
        Spacer(Modifier.width(8.dp))
        Row(
            modifier = Modifier.padding(top = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                time,
                fontSize = 15.sp,
                lineHeight = 20.sp,
                color = muted,
                maxLines = 1,
                style = noFontPad,
            )
            Spacer(Modifier.width(4.dp))
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = chevron,
                modifier = Modifier.size(16.dp),
            )
        }
    }
}

// ceis: template list times — clock time today, short date otherwise.
private fun nmMessagesTime(context: Context, millis: Long): String {
    val date = Date(millis)
    val cal = Calendar.getInstance().apply { timeInMillis = millis }
    val now = Calendar.getInstance()
    val sameDay = cal.get(Calendar.YEAR) == now.get(Calendar.YEAR) &&
        cal.get(Calendar.DAY_OF_YEAR) == now.get(Calendar.DAY_OF_YEAR)
    return if (sameDay) {
        DateFormat.getTimeFormat(context).format(date)
    } else {
        DateFormat.format("MMM d", date).toString()
    }
}
