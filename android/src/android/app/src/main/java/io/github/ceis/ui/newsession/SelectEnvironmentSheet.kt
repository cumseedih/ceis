// ceis: Select environment bottom sheet — shown before a new session starts.
// Pixel-faithful replica of the Claude Code mobile "Select environment" bottom sheet.
package io.github.ceis.ui.newsession

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val SheetBg = Color(0xFFFFFFFF)
private val TextPrimary = Color(0xFF1C1C1E)
private val TextSecondary = Color(0xFF6E6E73)
private val CheckOrange = Color(0xFFE05A28)
private val HandleColor = Color(0xFFD1D1D6)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SelectEnvironmentSheet(
    onDismiss: () -> Unit,
    onCreateEnvironment: () -> Unit,
    onOpenSettings: (String) -> Unit,
) {
    val context = LocalContext.current
    val environments by EnvironmentStore.environments.collectAsState()
    val selectedId by EnvironmentStore.selectedId.collectAsState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SheetBg,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 12.dp, bottom = 4.dp)
                    .size(width = 36.dp, height = 4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(HandleColor),
            )
        },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 20.dp),
        ) {
            // header row: × title ?
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = TextPrimary,
                        modifier = Modifier.size(22.dp),
                    )
                }
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = "Select environment",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                    )
                    Text(
                        text = "Choose an environment for your CEIS session",
                        fontSize = 12.sp,
                        color = TextSecondary,
                    )
                }
                IconButton(onClick = { /* help */ }) {
                    Icon(
                        imageVector = Icons.Outlined.HelpOutline,
                        contentDescription = "Help",
                        tint = TextPrimary,
                        modifier = Modifier.size(22.dp),
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            // environment list
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(environments) { env ->
                    EnvironmentRow(
                        env = env,
                        isSelected = env.id == selectedId,
                        onSelect = {
                            EnvironmentStore.select(context, env.id)
                            onDismiss()
                        },
                        onSettings = { onOpenSettings(env.id) },
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // "+ Create environment" pill
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                OutlinedButton(
                    onClick = onCreateEnvironment,
                    shape = RoundedCornerShape(50.dp),
                ) {
                    Text(
                        text = "+ Create environment",
                        fontSize = 14.sp,
                        color = TextPrimary,
                    )
                }
            }
        }
    }
}

@Composable
private fun EnvironmentRow(
    env: CeisEnvironment,
    isSelected: Boolean,
    onSelect: () -> Unit,
    onSettings: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Outlined.Cloud,
            contentDescription = null,
            tint = TextSecondary,
            modifier = Modifier.size(22.dp),
        )
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = env.name,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                color = TextPrimary,
            )
            Text(
                text = env.provider,
                fontSize = 13.sp,
                color = TextSecondary,
            )
        }
        IconButton(
            onClick = onSettings,
            modifier = Modifier.size(36.dp),
        ) {
            Icon(
                imageVector = Icons.Outlined.Settings,
                contentDescription = "Edit",
                tint = TextSecondary,
                modifier = Modifier.size(18.dp),
            )
        }
        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = CheckOrange,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}
