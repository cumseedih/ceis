package io.github.ceis.ui.cloud

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.ClickableText
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.openminis.app.R
import io.github.ceis.cloud.CeisCloud
import io.github.ceis.ui.theme.CeisButton
import io.github.ceis.ui.theme.CeisColors
import io.github.ceis.ui.theme.CeisRadii
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

const val ROUTE_CLOUD_SIGN_IN = "ceis/cloud/sign-in"
const val ROUTE_CLOUD_ACCOUNT = "ceis/cloud/account"

private const val CLOUD_DOC_URL = "https://github.com/nano-muse/nanoMuse/blob/main/docs/cloud.md"

// ceis: the door follows design.md and the owner's reference screens: circular
// white icon buttons with the border token, the bare mark, headline-sm headings,
// the pale pill field (blue ring while focused, a clear button once it has
// text), the SMS notice with its link in the link colour, and the shared 48dp
// primary button, pale while it is disabled or busy.
private val GatePlaceholder = Color(0xFF9CA3AF)

/**
 * Sign in to ceis: a phone number or an e-mail address, then the six-digit code
 * it receives, or a password for accounts that set one. The code boxes are
 * marked as a one-time code so the system's autofill or the keyboard can offer
 * the SMS it just saw. On success the relay is a provider with a default model,
 * and the caller decides where to go (the first run continues to onboarding;
 * from Settings it returns to the account page). The gear opens the door's own
 * settings page (Help and support, Legal info), drawn in this file.
 */
@Composable
fun CloudSignInScreen(
    onBack: () -> Unit,
    onSignedIn: () -> Unit,
    onOpenSettings: () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var identifier by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var codeSent by remember { mutableStateOf(false) }
    var passwordMode by remember { mutableStateOf(false) }
    var password by remember { mutableStateOf("") }
    var showSettings by remember { mutableStateOf(false) }
    // A friend's invite code: counts for a new account only, so it sits behind a small link.
    var invite by remember { mutableStateOf("") }
    var inviteOpen by remember { mutableStateOf(false) }
    var sending by remember { mutableStateOf(false) }
    var verifying by remember { mutableStateOf(false) }
    var countdown by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(countdown) {
        if (countdown > 0) {
            delay(1000)
            countdown -= 1
        }
    }

    fun sendCode() {
        if (sending || identifier.isBlank()) return
        error = null
        sending = true
        scope.launch {
            try {
                CeisCloud.requestCode(context, identifier)
                codeSent = true
                passwordMode = false
                countdown = 60
            } catch (e: CancellationException) {
                throw e // the page was left: the request is cancelled, not failed (#336)
            } catch (e: Exception) {
                error = CeisCloud.describe(context, e)
            }
            sending = false
        }
    }

    fun verify() {
        if (verifying || code.length < 4) return
        error = null
        verifying = true
        scope.launch {
            try {
                CeisCloud.verify(context, identifier, code, invite)
                onSignedIn()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = CeisCloud.describe(context, e)
                verifying = false
            }
        }
    }

    fun signInWithPassword() {
        if (verifying || password.isEmpty()) return
        error = null
        verifying = true
        scope.launch {
            try {
                CeisCloud.login(context, identifier, password)
                onSignedIn()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = CeisCloud.describe(context, e)
                verifying = false
            }
        }
    }

    fun goBack() {
        when {
            showSettings -> showSettings = false
            passwordMode && !verifying -> {
                passwordMode = false
                password = ""
            }
            codeSent && !verifying -> {
                codeSent = false
                code = ""
            }
            else -> onBack()
        }
    }

    BackHandler(enabled = showSettings || passwordMode || codeSent) { goBack() }

    if (showSettings) {
        GateSettingsScreen(onClose = { showSettings = false })
        return
    }

    Scaffold(containerColor = CeisColors.page) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                GateCircleButton(
                    icon = R.drawable.nm_signin_back,
                    contentDescription = stringResource(R.string.settings_back),
                    onClick = ::goBack,
                )
                if (!codeSent && !passwordMode) {
                    GateCircleButton(
                        icon = R.drawable.nm_signin_gear,
                        contentDescription = stringResource(R.string.settings),
                        onClick = { showSettings = true },
                    )
                } else {
                    Spacer(Modifier.size(44.dp))
                }
            }
            Spacer(Modifier.height(24.dp))
            // the bare mark at the size the reference draws it
            Image(
                painter = painterResource(R.drawable.nm_w_logo),
                contentDescription = stringResource(R.string.nm_cloud_welcome_title),
                modifier = Modifier.size(width = 44.dp, height = 28.75.dp),
            )
            Spacer(Modifier.height(24.dp))

            if (passwordMode) {
                Text(
                    text = stringResource(R.string.nm_cloud_password_title),
                    fontSize = 25.sp,
                    lineHeight = 30.sp,
                    fontWeight = FontWeight.Medium,
                    color = CeisColors.text,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(24.dp))
                GateField(
                    value = password,
                    onValueChange = { password = it },
                    placeholder = stringResource(R.string.nm_cloud_password),
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                    onImeAction = ::signInWithPassword,
                    visualTransformation = PasswordVisualTransformation(),
                    enabled = !verifying,
                )
                Spacer(Modifier.height(20.dp))
                CeisButton(
                    label = stringResource(R.string.nm_cloud_continue),
                    enabled = password.isNotEmpty(),
                    busy = verifying,
                    onClick = ::signInWithPassword,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(20.dp))
                Text(
                    text = stringResource(R.string.nm_cloud_forgot_password),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = CeisColors.link,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.clickable(enabled = !verifying) {
                        passwordMode = false
                        password = ""
                    },
                )
            } else if (!codeSent) {
                Text(
                    text = stringResource(R.string.nm_cloud_welcome_title),
                    fontSize = 25.sp,
                    lineHeight = 30.sp,
                    fontWeight = FontWeight.Medium,
                    color = CeisColors.text,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(24.dp))
                GateField(
                    value = identifier,
                    onValueChange = { identifier = it },
                    placeholder = stringResource(R.string.nm_cloud_identifier_pill),
                    keyboardType = if (identifier.trimStart().firstOrNull()?.let { it.isDigit() || it == '+' } == true) KeyboardType.Phone else KeyboardType.Email,
                    imeAction = ImeAction.Send,
                    onImeAction = ::sendCode,
                    enabled = !sending,
                    onClear = { identifier = "" },
                    modifier = Modifier.semantics {
                        contentType = ContentType.Username + ContentType.PhoneNumber + ContentType.EmailAddress
                    },
                )
                Spacer(Modifier.height(10.dp))
                val note = stringResource(R.string.nm_cloud_sms_note)
                val learnMore = stringResource(R.string.nm_setup_learn_more)
                val smsText = buildAnnotatedString {
                    append(note)
                    append(" ")
                    pushStringAnnotation("learn_more", "learn_more")
                    withStyle(SpanStyle(color = CeisColors.link, fontWeight = FontWeight.Medium)) { append(learnMore) }
                    pop()
                }
                ClickableText(
                    text = smsText,
                    style = TextStyle(
                        fontSize = 12.sp,
                        lineHeight = 18.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 6.dp),
                    onClick = { offset ->
                        smsText.getStringAnnotations("learn_more", offset, offset).firstOrNull()?.let {
                            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(CLOUD_DOC_URL))) }
                        }
                    },
                )
                Spacer(Modifier.height(16.dp))
                CeisButton(
                    label = stringResource(R.string.nm_cloud_continue),
                    enabled = identifier.isNotBlank(),
                    busy = sending,
                    onClick = ::sendCode,
                    modifier = Modifier.fillMaxWidth(),
                )
            } else {
                Text(
                    text = stringResource(R.string.nm_cloud_code_title),
                    fontSize = 25.sp,
                    lineHeight = 30.sp,
                    fontWeight = FontWeight.Medium,
                    color = CeisColors.text,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(14.dp))
                CodeDescription(
                    identifier = identifier,
                    countdown = countdown,
                    canResend = !sending && !verifying && countdown == 0,
                    onResend = ::sendCode,
                )
                Spacer(Modifier.height(24.dp))
                OtpBoxes(
                    code = code,
                    onCodeChange = { code = it },
                    enabled = !verifying,
                    onDone = { if (code.length == 6) verify() },
                )
                Spacer(Modifier.height(24.dp))
                CeisButton(
                    label = stringResource(R.string.nm_cloud_continue),
                    enabled = code.length == 6,
                    busy = verifying,
                    onClick = ::verify,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(20.dp))
                Text(
                    text = stringResource(R.string.nm_cloud_use_password),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (verifying) CeisColors.link.copy(alpha = 0.35f) else CeisColors.link,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.clickable(enabled = !verifying) { passwordMode = true },
                )
                if (!inviteOpen) {
                    Spacer(Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.nm_cloud_invite_have),
                        fontSize = 13.sp,
                        color = CeisColors.link,
                        modifier = Modifier.clickable { inviteOpen = true },
                    )
                } else {
                    Spacer(Modifier.height(16.dp))
                    GateField(
                        value = invite,
                        onValueChange = { v -> invite = v.uppercase().filter { it.isLetterOrDigit() }.take(8) },
                        placeholder = stringResource(R.string.nm_cloud_invite_field),
                        keyboardType = KeyboardType.Ascii,
                        imeAction = ImeAction.Done,
                        onImeAction = {},
                        enabled = !verifying,
                    )
                }
            }

            error?.let {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    textAlign = TextAlign.Center,
                )
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

/** A circular white icon button with the border token, as the reference draws them. */
@Composable
private fun GateCircleButton(icon: Int, contentDescription: String?, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = CeisColors.surface,
        border = BorderStroke(1.dp, CeisColors.border),
        modifier = Modifier.size(44.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Image(
                painter = painterResource(icon),
                contentDescription = contentDescription,
                modifier = Modifier.size(22.dp),
            )
        }
    }
}

/** The settings page for the door: grey ground, one white card, two rows. */
@Composable
private fun GateSettingsScreen(onClose: () -> Unit) {
    val context = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CeisColors.inputFill)
            .statusBarsPadding(),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, top = 8.dp),
        ) {
            GateCircleButton(
                icon = R.drawable.nm_signin_close,
                contentDescription = stringResource(R.string.settings_back),
                onClick = onClose,
            )
            Text(
                text = stringResource(R.string.settings),
                fontSize = 14.sp,
                lineHeight = 20.sp,
                fontWeight = FontWeight.Medium,
                color = CeisColors.text,
                modifier = Modifier.align(Alignment.Center),
            )
        }
        Spacer(Modifier.height(24.dp))
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .fillMaxWidth()
                .clip(CeisRadii.r24)
                .background(CeisColors.surface),
        ) {
            GateSettingsRow(
                icon = R.drawable.nm_signin_help,
                label = stringResource(R.string.nm_settings_help),
                onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(CLOUD_DOC_URL))) } },
            )
            HorizontalDivider(
                modifier = Modifier.padding(start = 52.dp, end = 16.dp),
                thickness = 1.dp,
                color = CeisColors.border,
            )
            GateSettingsRow(
                icon = R.drawable.nm_signin_legal,
                label = stringResource(R.string.nm_settings_legal),
                onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(CeisCloud.PRIVACY_URL))) } },
            )
        }
    }
}

@Composable
private fun GateSettingsRow(icon: Int, label: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp)
            .height(56.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            painter = painterResource(icon),
            contentDescription = null,
            modifier = Modifier.size(24.dp),
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = label,
            fontSize = 16.sp,
            lineHeight = 24.sp,
            color = CeisColors.text,
            modifier = Modifier.weight(1f),
        )
        Image(
            painter = painterResource(R.drawable.nm_signin_chevron),
            contentDescription = null,
            modifier = Modifier.size(18.dp),
        )
    }
}

/**
 * The pill field: pale fill, no outline at rest, a blue ring while focused, and
 * the reference's clear button once it holds text.
 */
@Composable
private fun GateField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    keyboardType: KeyboardType,
    imeAction: ImeAction,
    onImeAction: () -> Unit,
    enabled: Boolean = true,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    onClear: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    var focused by remember { mutableStateOf(false) }
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        enabled = enabled,
        textStyle = TextStyle(fontSize = 16.sp, color = CeisColors.text),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = KeyboardActions(
            onSend = { onImeAction() },
            onDone = { onImeAction() },
            onGo = { onImeAction() },
        ),
        visualTransformation = visualTransformation,
        cursorBrush = SolidColor(CeisColors.primary),
        modifier = modifier
            .fillMaxWidth()
            .onFocusChanged { focused = it.isFocused },
        decorationBox = { innerTextField ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .clip(CircleShape)
                    .background(CeisColors.inputFill)
                    .then(
                        if (focused) Modifier.border(1.5.dp, CeisColors.primary, CircleShape) else Modifier
                    )
                    .padding(start = 20.dp, end = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    if (value.isEmpty()) {
                        Text(
                            text = placeholder,
                            fontSize = 16.sp,
                            color = GatePlaceholder,
                            maxLines = 1,
                        )
                    }
                    innerTextField()
                }
                if (onClear != null && value.isNotEmpty()) {
                    Image(
                        painter = painterResource(R.drawable.nm_signin_clear),
                        contentDescription = null,
                        modifier = Modifier
                            .size(20.dp)
                            .clickable { onClear() },
                    )
                }
            }
        },
    )
}

/**
 * The code screen's description, one centered paragraph, with the resend as a
 * link in its last words the way the reference draws it. While the countdown
 * runs, those words count it down instead.
 */
@Composable
private fun CodeDescription(
    identifier: String,
    countdown: Int,
    canResend: Boolean,
    onResend: () -> Unit,
) {
    val body = stringResource(
        if (identifier.contains("@")) R.string.nm_cloud_code_sent_email else R.string.nm_cloud_code_sent_phone,
        identifier,
    )
    val tail = if (countdown > 0) {
        stringResource(R.string.nm_cloud_resend_in_short, countdown)
    } else {
        stringResource(R.string.nm_cloud_resend_code)
    }
    val text = buildAnnotatedString {
        append(body)
        append(" ")
        if (countdown > 0) {
            append(tail)
        } else {
            pushStringAnnotation("resend", "resend")
            withStyle(SpanStyle(color = CeisColors.link, fontWeight = FontWeight.Medium)) { append(tail) }
            pop()
        }
    }
    ClickableText(
        text = text,
        style = TextStyle(
            fontSize = 14.sp,
            lineHeight = 20.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        ),
        modifier = Modifier.fillMaxWidth(),
        onClick = { offset ->
            if (canResend) {
                text.getStringAnnotations("resend", offset, offset).firstOrNull()?.let { onResend() }
            }
        },
    )
}

/** Six one-character boxes: typing advances, backspace goes back, pasting fills the rest. */
@Composable
private fun OtpBoxes(
    code: String,
    onCodeChange: (String) -> Unit,
    enabled: Boolean,
    onDone: () -> Unit,
) {
    val focusers = remember { List(6) { FocusRequester() } }
    var focusedBox by remember { mutableIntStateOf(-1) }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        repeat(6) { i ->
            BasicTextField(
                value = code.getOrNull(i)?.toString() ?: "",
                onValueChange = { v ->
                    val digits = v.filter { it.isDigit() }
                    if (digits.isEmpty()) {
                        val idx = if (i < code.length) i else code.length - 1
                        if (idx >= 0) onCodeChange(code.removeRange(idx, idx + 1))
                        if (i > 0) focusers[i - 1].requestFocus()
                    } else {
                        val merged = (code.take(i) + digits + code.drop(i + 1)).take(6)
                        onCodeChange(merged)
                        focusers[minOf(5, merged.length)].requestFocus()
                        if (merged.length == 6) onDone()
                    }
                },
                singleLine = true,
                enabled = enabled,
                textStyle = TextStyle(
                    fontSize = 24.sp,
                    color = CeisColors.text,
                    textAlign = TextAlign.Center,
                ),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.NumberPassword,
                    imeAction = if (i == 5) ImeAction.Done else ImeAction.Next,
                ),
                keyboardActions = KeyboardActions(
                    onDone = { onDone() },
                    onNext = { if (i < 5) focusers[i + 1].requestFocus() },
                ),
                cursorBrush = SolidColor(CeisColors.primary),
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp)
                    .focusRequester(focusers[i])
                    .onFocusChanged { if (it.isFocused) focusedBox = i }
                    .semantics { if (i == 0) contentType = ContentType.SmsOtpCode },
                decorationBox = { innerTextField ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CeisRadii.r24)
                            .background(CeisColors.inputFill)
                            .then(
                                if (focusedBox == i) Modifier.border(1.5.dp, CeisColors.primary, CeisRadii.r24) else Modifier
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        innerTextField()
                    }
                },
            )
        }
    }
    LaunchedEffect(Unit) { focusers[0].requestFocus() }
}
