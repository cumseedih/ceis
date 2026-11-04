package io.github.ceis.ui.muse

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.openminis.app.R

// ceis: the app's hero image on sign-in, welcome, and onboarding screens.
// Replaced the blue rounded-square with the calligraphic "C" (ic_stat_ceis)
// with the pet orb (nm_pet_orb) — the app's mascot.
@Composable
fun NmBrandMark(size: Dp = 104.dp, modifier: Modifier = Modifier) {
    Image(
        painter = painterResource(R.drawable.nm_pet_orb),
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = modifier.size(size),
    )
}
