package io.github.wevvy.ui.connectors

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.openminis.app.R
import com.openminis.app.mcp.oauth.MCPOAuthController
import com.openminis.app.ui.theme.ChatColors
import io.github.wevvy.connectors.Connector
import io.github.wevvy.connectors.ConnectorAuth
import io.github.wevvy.connectors.Connectors
import io.github.wevvy.connectors.ConnectorsCatalogue
import io.github.wevvy.connectors.SharedConnectors
import io.github.wevvy.ui.home.MuseTones
import io.github.wevvy.ui.muse.MuseCaption
import io.github.wevvy.ui.muse.MuseCard
import io.github.wevvy.ui.muse.MuseGap
import io.github.wevvy.ui.muse.SecretEye
import io.github.wevvy.ui.muse.secretTransformation
import io.github.wevvy.ui.muse.MuseRowDivider
import io.github.wevvy.ui.muse.MuseSectionLabel
import io.github.wevvy.ui.muse.MuseTopAppBar
import kotlinx.coroutines.launch

const val ROUTE_CONNECTORS = "wevvy/connectors"

/**
 * Settings → Connectors: the services the agent can be let into — the catalogue the desktop
 * has (`connectors-catalogue.ts`, shipped here as an asset), grouped as it groups them. A tap
 * opens the service's sheet: what it is, how it signs in, Connect or Disconnect. Connecting
 * adds an MCP server entry under the same id (Settings → MCP shows and manages it too).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConnectorsScreen(onBack: () -> Unit, onOpenMcp: () -> Unit) {
    val context = LocalContext.current
    val (categories, connectors) = remember { ConnectorsCatalogue.load(context) }
    val repo = remember { Connectors.repo(context) }
    val serversFlow = remember(repo) { repo?.servers ?: kotlinx.coroutines.flow.MutableStateFlow(emptyList()) }
    val servers by serversFlow.collectAsState()
    // what the account's other devices connected (contract C3): names and kinds, no credentials
    val others by SharedConnectors.others(context).collectAsState()
    var open by remember { mutableStateOf<Connector?>(null) }

    // tokens near their end get refreshed on the way in; the entries written by the agent show too
    LaunchedEffect(Unit) {
        repo?.reloadFromDisk()
        Connectors.refreshStaleAsync(context)
    }

    Scaffold(
        containerColor = MuseTones.canvas,
        topBar = {
            MuseTopAppBar(
                title = { Text(stringResource(R.string.nm_connectors_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.settings_back))
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
        ) {
            MuseCaption(stringResource(R.string.nm_connectors_intro), Modifier.padding(top = 4.dp))
            var query by remember { mutableStateOf("") }
            var tab by remember { mutableStateOf(0) }
            // wevvy: search the catalogue by name or description.
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 8.dp),
                placeholder = { Text(stringResource(R.string.nm_connectors_search), color = MaterialTheme.colorScheme.onSurfaceVariant) },
                leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
                shape = RoundedCornerShape(50),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MuseTones.action,
                    unfocusedBorderColor = Color.Transparent,
                    focusedContainerColor = MuseTones.fill,
                    unfocusedContainerColor = MuseTones.fill,
                ),
            )
            // wevvy: the whole catalogue, or only the services actually connected on this phone.
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
                    .clip(RoundedCornerShape(50)).background(MuseTones.fill).padding(4.dp),
            ) {
                listOf(R.string.nm_connectors_tab_available, R.string.nm_connectors_tab_connected).forEachIndexed { index, label ->
                    val selected = tab == index
                    Box(
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(50))
                            .background(if (selected) MuseTones.surface else Color.Transparent)
                            .clickable { tab = index }.padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            stringResource(label),
                            fontSize = 14.sp,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
            val connected = connectors.count { Connectors.state(context, it, servers) == Connectors.State.Connected }
            if (connected > 0) {
                MuseCard {
                    Row(
                        Modifier.fillMaxWidth().clickable(onClick = onOpenMcp).heightIn(min = 54.dp).padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = stringResource(R.string.nm_connectors_connected_n, connected),
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f),
                        )
                        Text(stringResource(R.string.nm_connectors_manage), fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f), modifier = Modifier.size(20.dp))
                    }
                }
            }
            val q = query.trim()
            val matches: (Connector) -> Boolean = { c ->
                q.isEmpty() || c.name.contains(q, ignoreCase = true) || c.about().contains(q, ignoreCase = true)
            }
            if (tab == 0) {
                val order = (categories + connectors.map { it.category }).distinct()
                for (category in order) {
                    val group = connectors.filter { it.category == category && matches(it) }
                    if (group.isEmpty()) continue
                    MuseSectionLabel(categoryName(category))
                    MuseCard {
                        group.forEachIndexed { index, connector ->
                            if (index > 0) MuseRowDivider(inset = 64.dp)
                            ConnectorRow(connector, Connectors.state(context, connector, servers)) { open = connector }
                        }
                    }
                }
            } else {
                // wevvy: Connected shows only services with a real connected state, never a guess.
                val group = connectors.filter { Connectors.state(context, it, servers) == Connectors.State.Connected && matches(it) }
                if (group.isEmpty()) {
                    MuseCard {
                        Text(
                            stringResource(R.string.nm_connectors_connected_empty),
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                        )
                    }
                } else {
                    val order = (categories + group.map { it.category }).distinct()
                    for (category in order) {
                        val section = group.filter { it.category == category }
                        if (section.isEmpty()) continue
                        MuseSectionLabel(categoryName(category))
                        MuseCard {
                            section.forEachIndexed { index, connector ->
                                if (index > 0) MuseRowDivider(inset = 64.dp)
                                ConnectorRow(connector, Connectors.State.Connected) { open = connector }
                            }
                        }
                    }
                }
            }
            // Connected on another device of the account, not here: the catalogue's own sign-in
            // is the action — the credential never travels, the person signs in again on this
            // phone. One row per service, the newest device named.
            val elsewhere = others
                .filter { e -> e.enabled && connectors.firstOrNull { it.serverId == e.id }?.let { Connectors.state(context, it, servers) == Connectors.State.Connected } != true }
                .sortedByDescending { it.at }
                .distinctBy { it.id }
            if (elsewhere.isNotEmpty()) {
                MuseSectionLabel(stringResource(R.string.nm_connectors_elsewhere_title))
                MuseCard {
                    elsewhere.forEachIndexed { index, entry ->
                        if (index > 0) MuseRowDivider(inset = 16.dp)
                        val connector = connectors.firstOrNull { it.serverId == entry.id }
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .then(if (connector != null) Modifier.clickable { open = connector } else Modifier)
                                .heightIn(min = 60.dp)
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(connector?.name ?: entry.label, fontSize = 16.sp, lineHeight = 21.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(
                                    text = if (connector != null) stringResource(R.string.nm_connectors_elsewhere_sign_in, entry.device.ifBlank { stringResource(R.string.nm_connectors_elsewhere_device) })
                                    else stringResource(R.string.nm_connectors_elsewhere_only, entry.device.ifBlank { stringResource(R.string.nm_connectors_elsewhere_device) }),
                                    fontSize = 12.sp,
                                    lineHeight = 18.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            if (connector != null) {
                                Text(stringResource(R.string.nm_connectors_sign_in), fontSize = 13.sp, color = MuseTones.action)
                            }
                        }
                    }
                }
            }
            // Servers of the person's own — by URL, command or imported JSON: the full MCP editor,
            // reached from here only (Settings has one entry for all of this).
            MuseSectionLabel(stringResource(R.string.nm_connectors_own_title))
            MuseCard {
                val own = servers.count { s -> connectors.none { it.serverId == s.id } }
                Row(
                    Modifier.fillMaxWidth().clickable(onClick = onOpenMcp).heightIn(min = 54.dp).padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(stringResource(R.string.nm_connectors_own_row), fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                        Text(
                            text = if (own > 0) stringResource(R.string.nm_connectors_own_n, own) else stringResource(R.string.nm_connectors_own_sub),
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f), modifier = Modifier.size(20.dp))
                }
            }
            MuseGap(24.dp)
        }
    }

    open?.let { connector ->
        ConnectorSheet(
            connector = connector,
            state = Connectors.state(context, connector, servers),
            elsewhere = others.filter { it.id == connector.serverId && it.enabled }.maxByOrNull { it.at }?.device,
            onDismiss = { open = null },
            onOpenMcp = { open = null; onOpenMcp() },
        )
    }
}

@Composable
private fun ConnectorRow(connector: Connector, state: Connectors.State, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .heightIn(min = 60.dp)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ConnectorMark(connector, 34.dp)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(connector.name, fontSize = 16.sp, lineHeight = 21.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(connector.about(), fontSize = 12.sp, lineHeight = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        when (state) {
            Connectors.State.Connected -> Icon(Icons.Outlined.Check, contentDescription = stringResource(R.string.nm_connectors_connected), tint = MuseTones.action, modifier = Modifier.size(20.dp))
            Connectors.State.NeedsSignIn -> Text(stringResource(R.string.nm_connectors_needs_sign_in), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Connectors.State.Off -> Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f), modifier = Modifier.size(20.dp))
        }
    }
}

/** The service's mark: the vendored brand logo when the catalogue carries a simple-icons
 * slug, a letter mark in the brand colour otherwise. The logo sits on a fixed light tile so
 * dark marks stay visible in the dark theme; the artwork itself is unmodified. */
// wevvy: brand logos from simple-icons 16.33.0 (CC0 paths) in res/drawable/nm_conn_<slug>.
@Composable
private fun ConnectorMark(connector: Connector, size: androidx.compose.ui.unit.Dp) {
    val context = LocalContext.current
    val resId = remember(connector.icon) {
        connector.icon
            ?.let { slug -> context.resources.getIdentifier("nm_conn_$slug", "drawable", context.packageName) }
            ?.takeIf { it != 0 }
    }
    if (resId != null) {
        Box(
            modifier = Modifier.size(size).clip(RoundedCornerShape(size / 3.4f)).background(io.github.wevvy.ui.theme.WevvyColors.inputFill),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(resId),
                contentDescription = null,
                modifier = Modifier.size(size * 0.62f),
            )
        }
    } else {
        LetterMark(connector, size)
    }
}

/** The brand colour behind the service's initial — the catalogue carries no artwork. */
@Composable
private fun LetterMark(connector: Connector, size: androidx.compose.ui.unit.Dp) {
    val tint = remember(connector.color) { runCatching { Color(android.graphics.Color.parseColor(connector.color)) }.getOrDefault(Color(0xFF6B6B6B)) }
    Box(
        modifier = Modifier.size(size).clip(RoundedCornerShape(size / 3.4f)).background(tint),
        contentAlignment = Alignment.Center,
    ) {
        Text(connector.name.first().uppercaseChar().toString(), color = Color.White, fontSize = (size.value * 0.46f).sp, fontWeight = FontWeight.SemiBold)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ConnectorSheet(connector: Connector, state: Connectors.State, elsewhere: String?, onDismiss: () -> Unit, onOpenMcp: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var key by remember { mutableStateOf("") }
    var keyHint by remember { mutableStateOf<String?>((connector.auth as? ConnectorAuth.Key)?.where) }
    var wantsKey by remember { mutableStateOf(connector.auth is ConnectorAuth.Key) }
    // services without dynamic client registration: an OAuth app of the person's own
    val oauthAuth = connector.auth as? ConnectorAuth.OAuth
    var wantsClient by remember { mutableStateOf(oauthAuth?.clientIdRequired == true) }
    var developer by remember { mutableStateOf(oauthAuth?.developer) }
    var redirectUri by remember { mutableStateOf(MCPOAuthController.DEFAULT_REDIRECT_URI) }
    var clientId by remember { mutableStateOf("") }
    var clientSecret by remember { mutableStateOf("") }
    var showSecrets by remember { mutableStateOf(false) }
    var done by remember { mutableStateOf(false) }

    fun connect() {
        if (busy) return
        busy = true
        error = null
        scope.launch {
            val outcome = Connectors.connect(
                context, connector, key.takeIf { wantsKey },
                clientId = clientId.takeIf { wantsClient && it.isNotBlank() },
                clientSecret = clientSecret.takeIf { wantsClient && it.isNotBlank() },
            )
            when (outcome) {
                is Connectors.Outcome.Connected -> { done = true; key = "" }
                is Connectors.Outcome.Cancelled -> Unit
                is Connectors.Outcome.NeedsKey -> { wantsKey = true; keyHint = outcome.hint.ifBlank { keyHint } }
                is Connectors.Outcome.NeedsClient -> { wantsClient = true; developer = outcome.developer ?: developer; redirectUri = outcome.redirectUri }
                is Connectors.Outcome.Failed -> error = outcome.message
            }
            busy = false
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = ChatColors.background) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ConnectorMark(connector, 44.dp)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(connector.name, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Text(connector.url, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(connector.about(), fontSize = 15.sp, lineHeight = 22.sp, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(8.dp))
            Text(
                text = when {
                    wantsKey -> stringResource(R.string.nm_connectors_how_key, keyHint.orEmpty())
                    wantsClient -> stringResource(R.string.nm_connectors_how_client, connector.name)
                    connector.auth is ConnectorAuth.None -> stringResource(R.string.nm_connectors_how_none)
                    connector.auth is ConnectorAuth.Auto -> stringResource(R.string.nm_connectors_how_auto)
                    else -> stringResource(R.string.nm_connectors_how_oauth, connector.name)
                },
                fontSize = 13.sp,
                lineHeight = 18.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (elsewhere != null && state != Connectors.State.Connected && !done) {
                Spacer(Modifier.height(6.dp))
                Text(
                    text = stringResource(R.string.nm_connectors_elsewhere_sign_in, elsewhere.ifBlank { stringResource(R.string.nm_connectors_elsewhere_device) }),
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (connector.docs.isNotBlank()) {
                Row(
                    Modifier.clickable { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(connector.docs))) } }.padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(stringResource(R.string.nm_connectors_docs), fontSize = 13.sp, color = MuseTones.action)
                    Spacer(Modifier.width(4.dp))
                    Icon(Icons.AutoMirrored.Outlined.OpenInNew, contentDescription = null, tint = MuseTones.action, modifier = Modifier.size(14.dp))
                }
            }
            if (wantsClient && !wantsKey && state != Connectors.State.Connected && !done) {
                Spacer(Modifier.height(8.dp))
                val dev = developer
                if (dev != null) {
                    Row(
                        Modifier.clickable { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(dev))) } }.padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(stringResource(R.string.nm_connectors_client_developer, connector.name), fontSize = 13.sp, color = MuseTones.action)
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.AutoMirrored.Outlined.OpenInNew, contentDescription = null, tint = MuseTones.action, modifier = Modifier.size(14.dp))
                    }
                }
                Text(stringResource(R.string.nm_connectors_client_redirect), fontSize = 13.sp, lineHeight = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(
                    Modifier
                        .clickable {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                            clipboard?.setPrimaryClip(ClipData.newPlainText("redirect", redirectUri))
                        }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(redirectUri, fontSize = 13.sp, fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                    Icon(Icons.Outlined.ContentCopy, contentDescription = stringResource(R.string.nm_connectors_client_copy), tint = MuseTones.action, modifier = Modifier.size(16.dp))
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = clientId,
                    onValueChange = { clientId = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text(stringResource(R.string.nm_connectors_client_id)) },
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MuseTones.action, unfocusedBorderColor = MuseTones.hairline),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = clientSecret,
                    onValueChange = { clientSecret = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text(stringResource(R.string.nm_connectors_client_secret)) },
                    visualTransformation = secretTransformation(showSecrets),
                    trailingIcon = { SecretEye(showSecrets) { showSecrets = !showSecrets } },
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MuseTones.action, unfocusedBorderColor = MuseTones.hairline),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                )
            }
            if (wantsKey && state != Connectors.State.Connected && !done) {
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = key,
                    onValueChange = { key = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text(stringResource(R.string.nm_connectors_key_placeholder)) },
                    visualTransformation = secretTransformation(showSecrets),
                    trailingIcon = { SecretEye(showSecrets) { showSecrets = !showSecrets } },
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MuseTones.action, unfocusedBorderColor = MuseTones.hairline),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                )
            }
            error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, fontSize = 13.sp, lineHeight = 18.sp, color = MaterialTheme.colorScheme.error)
            }
            Spacer(Modifier.height(16.dp))
            if (done || state == Connectors.State.Connected) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Check, contentDescription = null, tint = MuseTones.action, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(R.string.nm_connectors_connected_sub, connector.serverId), fontSize = 13.sp, lineHeight = 18.sp, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                }
                Spacer(Modifier.height(12.dp))
                Row {
                    OutlinedButton(onClick = onOpenMcp, shape = RoundedCornerShape(50), modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.nm_connectors_manage))
                    }
                    Spacer(Modifier.width(10.dp))
                    OutlinedButton(
                        onClick = { Connectors.disconnect(context, connector); done = false; onDismiss() },
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                    ) { Text(stringResource(R.string.nm_connectors_disconnect)) }
                }
            } else {
                Button(
                    onClick = { connect() },
                    enabled = !busy && (!wantsKey || key.isNotBlank()) && (!wantsClient || wantsKey || clientId.isNotBlank()),
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(containerColor = MuseTones.action),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    if (busy) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                    } else {
                        Text(stringResource(if (state == Connectors.State.NeedsSignIn) R.string.nm_connectors_sign_in else R.string.nm_connectors_connect))
                    }
                }
            }
        }
    }
}

@Composable
private fun categoryName(category: String): String = stringResource(
    when (category) {
        "work" -> R.string.nm_connectors_cat_work
        "talk" -> R.string.nm_connectors_cat_talk
        "files" -> R.string.nm_connectors_cat_files
        "dev" -> R.string.nm_connectors_cat_dev
        "data" -> R.string.nm_connectors_cat_data
        "design" -> R.string.nm_connectors_cat_design
        "money" -> R.string.nm_connectors_cat_money
        "search" -> R.string.nm_connectors_cat_search
        "infra" -> R.string.nm_connectors_cat_infra
        else -> R.string.nm_connectors_cat_misc
    },
)
