// ceis: New Session screen — environment + repo pills, empty state, composer.
// Pixel-faithful replica of the Claude Code mobile "New Session" screen.
package io.github.ceis.ui.newsession

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val BgColor = Color(0xFFF5F5F5)
private val TextPrimary = Color(0xFF1C1C1E)
private val TextSecondary = Color(0xFF6E6E73)
private val PillBg = Color(0xFFFFFFFF)
private val PillBorder = Color(0xFFE0E0E0)
private val SendBg = Color(0xFFE07060)

const val ROUTE_NEW_SESSION = "new_session"
const val ROUTE_CREATE_ENVIRONMENT = "create_environment"

@Composable
fun NewSessionScreen(
    repoOwner: String = "",
    repoName: String = "",
    branchName: String = "",
    onBack: () -> Unit,
    onSend: (message: String) -> Unit,
    onEnvironmentClick: () -> Unit,
    onRepoClick: () -> Unit,
    onAttachClick: () -> Unit,
) {
    val environments by EnvironmentStore.environments.collectAsState()
    val selectedId by EnvironmentStore.selectedId.collectAsState()
    val selectedEnv = environments.firstOrNull { it.id == selectedId } ?: environments.firstOrNull()

    var message by remember { mutableStateOf("") }

    val repoLabel = when {
        repoOwner.isNotBlank() && repoName.isNotBlank() && branchName.isNotBlank() ->
            "$repoName · $branchName"
        repoOwner.isNotBlank() && repoName.isNotBlank() ->
            "$repoOwner/$repoName"
        else -> ""
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgColor)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding(),
    ) {
        // top nav
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.align(Alignment.CenterStart),
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextPrimary)
            }
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = "New Session",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                )
                if (repoOwner.isNotBlank() || repoName.isNotBlank()) {
                    Text(
                        text = "$repoOwner${if (repoName.isNotBlank()) "/$repoName" else ""}",
                        fontSize = 12.sp,
                        color = TextSecondary,
                    )
                }
            }
        }

        // empty state
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                PixelArtMascot(size = 72.dp)
                Spacer(Modifier.height(16.dp))
                Text(
                    text = "Back at it, ush",
                    fontSize = 22.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Normal,
                    color = TextPrimary,
                )
            }
        }

        // pills + composer
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            // pills row
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // environment pill
                ContextPill(
                    icon = {
                        Icon(
                            Icons.Outlined.Cloud,
                            contentDescription = null,
                            tint = TextSecondary,
                            modifier = Modifier.size(14.dp),
                        )
                    },
                    label = selectedEnv?.name ?: "Default",
                    onClick = onEnvironmentClick,
                )

                // repo/branch pill
                if (repoLabel.isNotBlank()) {
                    ContextPill(
                        icon = {
                            // GitHub octocat simplified icon — just a circle for space
                            Box(
                                modifier = Modifier
                                    .size(14.dp)
                                    .drawBehind {
                                        drawGitHubIcon(this)
                                    },
                            )
                        },
                        label = repoLabel,
                        onClick = onRepoClick,
                    )
                }
            }

            // composer bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .border(1.dp, PillBorder, RoundedCornerShape(24.dp))
                    .background(PillBg)
                    .padding(horizontal = 4.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // + button
                IconButton(
                    onClick = onAttachClick,
                    modifier = Modifier.size(40.dp),
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Attach", tint = TextSecondary)
                }

                // text field
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    if (message.isEmpty()) {
                        Text(
                            text = "Type or hold to talk",
                            fontSize = 15.sp,
                            color = Color(0xFFAAAAAA),
                        )
                    }
                    BasicTextField(
                        value = message,
                        onValueChange = { message = it },
                        textStyle = TextStyle(fontSize = 15.sp, color = TextPrimary),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(onSend = {
                            if (message.isNotBlank()) {
                                onSend(message)
                                message = ""
                            }
                        }),
                    )
                }

                // mic button
                if (message.isBlank()) {
                    IconButton(
                        onClick = { /* voice */ },
                        modifier = Modifier.size(40.dp),
                    ) {
                        Icon(Icons.Default.Mic, contentDescription = "Voice", tint = TextSecondary)
                    }
                }

                // send button
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(SendBg)
                        .clickable {
                            if (message.isNotBlank()) {
                                onSend(message)
                                message = ""
                            }
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.KeyboardArrowUp,
                        contentDescription = "Send",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp),
                    )
                }

                Spacer(Modifier.width(4.dp))
            }
        }
    }
}

// Pill for environment / repo context
@Composable
private fun ContextPill(
    icon: @Composable () -> Unit,
    label: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50.dp))
            .border(1.dp, PillBorder, RoundedCornerShape(50.dp))
            .background(PillBg)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        icon()
        Text(
            text = label,
            fontSize = 13.sp,
            color = TextPrimary,
            fontWeight = FontWeight.Normal,
        )
    }
}

// Simple pixel-art mascot drawn with Canvas — matches Claude Code's "ush" mascot shape.
@Composable
private fun PixelArtMascot(size: Dp) {
    val bodyColor = Color(0xFFC05830)
    val eyeColor = Color(0xFF1C1C1E)

    Box(
        modifier = Modifier
            .size(size)
            .drawBehind {
                val w = this.size.width
                val h = this.size.height
                // pixel grid: 7 columns × 8 rows
                val px = w / 7f
                val py = h / 8f

                fun fill(col: Int, row: Int, color: Color = bodyColor) =
                    drawRect(color, Offset(col * px, row * py), Size(px, py))

                // row 0: top of head (cols 2-4)
                fill(2, 0); fill(3, 0); fill(4, 0)
                // row 1: head wider (cols 1-5)
                fill(1, 1); fill(2, 1); fill(3, 1); fill(4, 1); fill(5, 1)
                // row 2: eyes row (cols 1-5, eyes at 2 and 4)
                fill(1, 2); fill(2, 2); fill(3, 2); fill(4, 2); fill(5, 2)
                fill(2, 2, eyeColor); fill(4, 2, eyeColor)
                // row 3: arms + body (cols 0-6)
                fill(0, 3); fill(1, 3); fill(2, 3); fill(3, 3); fill(4, 3); fill(5, 3); fill(6, 3)
                // row 4: lower body (cols 1-5)
                fill(1, 4); fill(2, 4); fill(3, 4); fill(4, 4); fill(5, 4)
                // row 5: lower body (cols 1-5)
                fill(1, 5); fill(2, 5); fill(3, 5); fill(4, 5); fill(5, 5)
                // row 6: legs (cols 2 and 4)
                fill(2, 6); fill(4, 6)
                // row 7: feet (cols 2 and 4)
                fill(2, 7); fill(4, 7)
            },
    )
}

private fun drawGitHubIcon(scope: DrawScope) {
    val size = scope.size
    scope.drawCircle(
        color = Color(0xFF6E6E73),
        radius = size.minDimension / 2.2f,
        center = Offset(size.width / 2, size.height / 2),
    )
}
