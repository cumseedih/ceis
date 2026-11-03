// ceis: Create a new cloud environment — name, network access, env vars.
// Pixel-faithful replica of the Claude Code mobile "Create a new environment" screen.
package io.github.ceis.ui.newsession

import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.util.UUID

private val BgColor = Color(0xFFF2F2F2)
private val CardBg = Color(0xFFF7F7F7)
private val TextPrimary = Color(0xFF1C1C1E)
private val TextSecondary = Color(0xFF6E6E73)
private val BorderColor = Color(0xFFD1D1D6)
private val CheckOrange = Color(0xFFE05A28)
private val BadgeBlue = Color(0xFF007AFF)
private val ButtonBlack = Color(0xFF000000)

@Composable
fun CreateEnvironmentScreen(
    onBack: () -> Unit,
    onCreated: (CeisEnvironment) -> Unit,
) {
    val context = LocalContext.current
    var name by rememberSaveable { mutableStateOf("Default") }
    var networkAccess by rememberSaveable { mutableStateOf(NetworkAccess.TRUSTED) }
    var envVars by rememberSaveable { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgColor)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding(),
    ) {
        // back arrow
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "Back",
                    tint = TextPrimary,
                )
            }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            Spacer(Modifier.height(12.dp))

            // heading
            Text(
                text = "Create a new environment",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Serif,
                color = TextPrimary,
                lineHeight = 34.sp,
            )

            Spacer(Modifier.height(8.dp))

            Text(
                text = "Cloud environments power CEIS's code execution. You can always create or edit environments later.",
                fontSize = 15.sp,
                color = TextSecondary,
                lineHeight = 20.sp,
            )

            Spacer(Modifier.height(28.dp))

            // Name
            Text(
                text = "Name",
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
            )

            Spacer(Modifier.height(8.dp))

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Default", color = TextSecondary) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BorderColor,
                    unfocusedBorderColor = BorderColor,
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                ),
            )

            Spacer(Modifier.height(28.dp))

            // Network access
            Text(
                text = "Network access",
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
            )

            Spacer(Modifier.height(8.dp))

            NetworkAccessCard(
                selected = networkAccess,
                onSelect = { networkAccess = it },
            )

            Spacer(Modifier.height(28.dp))

            // Environment variables
            Text(
                text = "Environment variables",
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
            )

            Spacer(Modifier.height(8.dp))

            OutlinedTextField(
                value = envVars,
                onValueChange = { envVars = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                placeholder = { Text("API_KEY=hunter2", color = TextSecondary, fontFamily = FontFamily.Monospace, fontSize = 14.sp) },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BorderColor,
                    unfocusedBorderColor = BorderColor,
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                ),
            )

            Spacer(Modifier.height(6.dp))

            Text(
                text = "Enter one KEY=VALUE per line.",
                fontSize = 13.sp,
                color = TextSecondary,
            )

            Spacer(Modifier.height(24.dp))
        }

        // Create button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            Button(
                onClick = {
                    val env = CeisEnvironment(
                        id = if (name.lowercase() == "default") "default" else UUID.randomUUID().toString(),
                        name = name.ifBlank { "Default" },
                        networkAccess = networkAccess,
                        envVars = envVars,
                        provider = "Anthropic cloud",
                    )
                    EnvironmentStore.save(context, env)
                    EnvironmentStore.select(context, env.id)
                    onCreated(env)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = ButtonBlack,
                    contentColor = Color.White,
                ),
            ) {
                Text("Create", fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun NetworkAccessCard(
    selected: NetworkAccess,
    onSelect: (NetworkAccess) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, BorderColor, RoundedCornerShape(12.dp))
            .background(Color.White),
    ) {
        NetworkOption(
            title = "Trusted",
            desc = "Downloads packages from verified sources, balancing security and performance.",
            value = NetworkAccess.TRUSTED,
            selected = selected,
            showRecommended = true,
            showDivider = true,
            onSelect = onSelect,
        )
        NetworkOption(
            title = "None",
            desc = "Blocks internet access for maximum security with reduced functionality.",
            value = NetworkAccess.NONE,
            selected = selected,
            showDivider = true,
            onSelect = onSelect,
        )
        NetworkOption(
            title = "Full",
            desc = "Unrestricted internet access for maximum flexibility. Use caution with untrusted sources.",
            value = NetworkAccess.FULL,
            selected = selected,
            showDivider = true,
            onSelect = onSelect,
        )
        NetworkOption(
            title = "Custom",
            desc = "Create a list of allowed domains for full control over CEIS's network access.",
            value = NetworkAccess.CUSTOM,
            selected = selected,
            showDivider = false,
            onSelect = onSelect,
        )
    }
}

@Composable
private fun NetworkOption(
    title: String,
    desc: String,
    value: NetworkAccess,
    selected: NetworkAccess,
    showRecommended: Boolean = false,
    showDivider: Boolean,
    onSelect: (NetworkAccess) -> Unit,
) {
    val isSelected = selected == value
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSelect(value) }
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                modifier = Modifier.weight(1f),
            )
            if (showRecommended) {
                Box(
                    modifier = Modifier
                        .border(1.dp, BadgeBlue, RoundedCornerShape(50.dp))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                ) {
                    Text(
                        text = "Recommended",
                        fontSize = 11.sp,
                        color = BadgeBlue,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
            if (isSelected) {
                Box(
                    modifier = Modifier
                        .size(22.dp)
                        .background(CheckOrange, RoundedCornerShape(50.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(14.dp),
                    )
                }
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            text = desc,
            fontSize = 13.sp,
            color = TextSecondary,
            lineHeight = 18.sp,
        )
    }
    if (showDivider) {
        Divider(color = BorderColor, thickness = 0.5.dp)
    }
}
