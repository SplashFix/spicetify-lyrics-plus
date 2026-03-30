/*
  spicetify-lyrics-overlay.js  –  v5 "Apple Music 1:1"
  Exakte Nachbildung des Apple Music Lyrics-Screens.
*/

(function SpicetifyLyricsOverlay() {
    if (!window.Spicetify || !Spicetify.Player || !Spicetify.Platform) {
        setTimeout(SpicetifyLyricsOverlay, 200);
        return;
    }
    if (window.SpicetifyLyricsOverlayLoaded) return;
    window.SpicetifyLyricsOverlayLoaded = true;

    let lines         = [];
    let hasTimestamps = false;
    let currentIdx    = -1;
    let tickFrame     = null;
    let lastUri       = null;
    let lastTickAt    = 0;
    let lastScrollTarget = null;
    let lyricLineEls  = [];
    let currentCoverPalette = null;
    let lineStyleFrame = null;
    let pendingLineStyleIdx = 0;
    let scrollTargetTop = null;
    let scrollLastFrameTime = 0;
    let scrollAnimFromTop = 0;
    let scrollAnimToTop = 0;
    let scrollAnimStartTime = 0;
    let scrollAnimDuration = 0;
    let activePaletteState = null;
    let currentTrackLiked = false;
    let blobMotionFrame = null;
    let blobMotionStates = [];
    let lastBlobMotionAt = 0;
    const colorBlobCount = 8;
    let lastPlaybackActive = null;
    let lastShuffleVisualState = null;
    let lastRepeatVisualState = null;
    let lastProgressPct = '';
    let lastProgressScale = -1;
    let lastProgressSecond = -1;
    let lastRemainingSecond = -1;
    let progressEstimate = 0;
    let progressEstimateAt = 0;
    let lastRawProgressSample = 0;
    let displayedProgressEstimate = 0;
    let displayedProgressAt = 0;
    let lastVolumePct = '';
    let isDraggingVolume = false;
    let volumeControlEnabled = false;
    let autoHideLyricsWhenEmpty = false;
    let karaokeModeEnabled = false;
    let vinylModeEnabled = false;
    let upNextEnabled = true;
    let settingsMenuOpen = false;
    let providerOrder = ['lrclib', 'spotify'];
    const settingsStorageKey = 'spicetify-lyrics-overlay-settings';
    const lyricsCacheStorageKey = 'spicetify-lyrics-overlay-cache-v1';
    const lyricsCacheTtlMs = 1000 * 60 * 60 * 6;
    const emptyLyricsCacheTtlMs = 1000 * 60 * 5;
    const lyricsCacheMaxEntries = 40;
    let cursorHideTimer = null;
    let lastKaraokeLineIdx = -1;
    let lastKaraokeProgressPct = '';
    let autoLyricsHiddenBecauseEmpty = false;
    let lyricsCache = loadLyricsCache();
    let lyricsRequestSerial = 0;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPowerMode = prefersReducedMotion || ((navigator.hardwareConcurrency || 8) <= 4);
    const tickInterval = prefersReducedMotion ? 120 : (lowPowerMode ? 64 : 34);
    const controlIconMasks = Object.freeze({
        backward: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAWCAYAAABZuWWzAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAK6ADAAQAAAABAAAAFgAAAAA3bTvPAAACaklEQVRIDa2Xz0uUQRjH9122PGh06V7+AwpdpTQPJeRBBam8CFGGQpcMrOgfSP0P/PEHCKUn8VRbXcKDiNGhQ7CeClovoh3SePt8ZWeZd/fd952dceDLzDzzPJ95mHl2Z7dQCGhxHPegNfS9psUAXAHGDbRl8Z7avMieuI6BXcH3GRpDNqMaRVGfK8f4wbvK+CW6ZWy1fgfeA2MrmYFLD1T+k2gGdaXEXEyxtTTB62RRLDEvpDh22DbnZAH3E/gKXbMBPmNYuo0R9BzplpxabrKAdUVKcsCJmOMErweX16g3x7VpuWWyQPOuqAmWZYCnE9RJ6kTtOs8KS6w1JQtUoFE0i5yvKEG1JvBUi6bOdQDeLZEsYF2NrkhXFdzgDQBRCamUgttZskCDr8jOBF43cyV507aHjkuAB4HMo0uhMMXDm6BTomlfRXLxbhHwbaIvexOSgf+YquaLSbP37BuPgh6esyboj9r4PLq/QH6dByiNoWSfoHcoTnNo03aCv8rgc5txTu5FjvkQ6V2+j746RWU4wfqJHuEyjfYzXNteqtcWG+wSPY704ai2TWoIgPce012kX2J/Gpa9pvVkFc0GMXrL8A5aRafIu8E6QUsAbqMNFFRqiWRNVmxwhN4w18l8MnbfHtZvNEd8UKmlJmuSYoMKesxcH8Lg+oMVVGqZyVpJlxnrlBfQMfJuJGxKTaWxgvQN4tSckhWJTVR/ywy1yToKqj9Yx0gv5zD6iHKbc7KGxAb66/KC+T20Z+y1/qBhnjuFpVKbwlGqNAQEfyvVeTzVeq5H0Sb6gobqix4D4vVb5SH6gMrouo35D+n6yaY/yz6nAAAAAElFTkSuQmCC')",
        forward: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAWCAYAAABZuWWzAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAK6ADAAQAAAABAAAAFgAAAAA3bTvPAAACTUlEQVRIDbWXPUhWURzG3zdMSXTJj8Eh0cElgsQpcHJozKHcGoxQRyEjanPwVdAQBM0GNT8GBcWkKNKlMByF0iEaIpqtrVwUX38P3APnffHee+49tz/8ON/PebjnwY9cLqhisXgF9uA7fIMRuGrWk7acbYIDkN4hPILqpDr2/kvWoI1+fTDWfA/scEEvVATzSZoONlcFByppB2AbrTuQD+YTNbZZI2wL1DJ4Bm+5oNNecOjLYHk1MjEBq+hdL1+MG9tmo/a2sjjPBbNwLWqj41o7+zbQKkCd45mcq1mj10XnPRcMgVf+0NHd90DReACxUUtqFu3cZegH5bkbUuVPQkEpak8hNmppzJpLGuiMwxqGb5hJj7aVsyZqzRfp+Jg1ejfprGN4FMxPE7OWpu3i0Du0HkNJ1LIwK0OKwl1Q/h5CbP50KKIUtT4oiVpWZs29NXSewGtoMpMerYnaKz5Are8XCPOhXzAtYYsp5m9x5n7WX9b28cseZND/8T/M/sNYARYyMCiJ3zCYz+d3sjRbRFRZvY3wMq1vnSAwB9L7ILGsMvsVrRFEDySaQX1CYxS9kij5mtUTPYcthPVlfesnAjK5e5FQWrN6oiV4gbAy6lt/EZiBZfROw8TSmP2I2BiiJU8UdkHMvF5jEybR0ytFVhKzeqICop8jFd0Xv7BVOT90PeJiVk80DSsIhz6R64XsOwL9Af4GPX1Z57LNSsSuMwbmif7YC4798jPK+SIo58eOGuHb+P07DPuwAIn/7bCVOV8BL0F6U9Bsr6fpnwN/wu54JDOwgwAAAABJRU5ErkJggg==')",
        pause: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAYCAYAAAD3Va0xAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEqADAAQAAAABAAAAGAAAAADQGar0AAAAmUlEQVQ4EWP8//9/OwMDQxAQo4N7QAF/RkbGXyAJoDohILUJiEVBfDQwjQko4IUmCOMqARmqMA6QNgVibIaAlLiDDOIAsXAAZDlkNrpyDpBBVAGjBhEOxtEwGg0jwiFAWMVoOhqqYfQRj8M/IMkhs5GEwcwPoOjvAeJ3QPwXCX8FslcAq6K7QBoGjgIZe4D4OxAjq30B5E8GAGNWHXdpcW7cAAAAAElFTkSuQmCC')",
        play: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAGaADAAQAAAABAAAAGQAAAABY85deAAABjklEQVRIDbWWvUvDQBiHExVBBREHB5GC4Obk4KA4CQ4Ork7i4KB/gIODYwVRHBQEQS2OFhEHUbGI/4BScPRj9mPUSR0kPm/wyrXeheSSHPx6b967ex7S0hDf00YQBMNcTpIncuL7/re2nL5E0EXuyMNfrpkn0pM9r0mDDFC3add91NuIDoisOQ9d0mKhjNI/RbRMOi17Itu6JGpjM4uzpIJomsQ9FzITbeZENymSY0RDISHGR1KJQg5SlBFtkB7VtM2uEsWbopCvcJ60qmbjnFYivHaySM4RjUujcWQhUcwCxQ6iEulXTZmzlCjuGMUZoiXSkZdEuPKfmyMiK+RxJyJRo5diJm9JgKSap+QFwQJP8orteaVu12X+4tAe2UcgdfgDyZzVuAS0BlzuojayupNHiEXgNzWyVqSVfMDaImUEPxq3rnSVCPCIbAJ/ryMaLlwkt3BWgN8beMZWEskrhHXgF0ZSRDOORN5YSmQXwWcEy7qkS94Mu67orQJ/Nqy5tXiYyctClRySETfK/1O/WaKHzTZqdxMAAAAASUVORK5CYII=')",
        repeatOne: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAbCAYAAAAdx42aAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAGwAAAAB6d+tkAAACrklEQVRIDa2WTYhOURjH730N00QjkqxGkhRhwWqMFImUIl8bsZKysiOymFn7aIp8xAqRMiNSbLxrei0kCxQSRcRC8jXj+v3fOUen855773m996n/+zznOf/n455z33NuknQgWZYtBxtiU8DtBgfAXXAcdMXGBnkkuAOegWOgO0gyTub7wE0gvsWqWlFQxNxkw9mEvkTiWaEY/Ivwj4CFoO5wpnbagJMrWcbgBsUWu05jT0O/BXvBZeNrquAekGQSszNAj0sO2H78HDhXiD+Ypuk9y8d+iL1ZY+YGrF/6XwImZG8xWIq2y4vZlqjpYfINUvhqWWSzAcizIZ4FoeUryxGaT3HOC034vi6K60kvAL0gktdgFLwCv0CRDDGp5n05j+Ok7wyNtQI7gC1+G/sQSzcWIvs+mv/u+dTwEeJveX536OYeVwMbzexHtIJdghtYZn+CsJ/4xyXEJ8w/AFNAQw0sAJI6wT8nzOjfzDCfolX8fVkknG9wdlueGphuBh+ssw19EW4fOE1ifzui0qgBK3+sEaspej2Wm8fTSahDQvv+KI9UpZ8XtwdcAyOgVydTCspOvMp6oNYSYC+j/hrLmMXuH4FrwLoOu9Exb6XmvgPW2aIpqqDDYBf4AXTx/K/MdAK/ljZA8V4ChkG/CSyNcQqEzNXGqb/wm8JkFNd5fg7MNUEdKfKtJME2k6TB1n/JbQDyAESd51oBV/TSzncdJba2T9f0WrAdaDwOToBEt1aLUGA9ThUXuWr5TcKjPP2oEuetgD5Gqi6uk7IOzlD8ObopwRXQDKuwFTUI/A8TLd8+ECt64s/gJYVbLrrcBpSdJlagTgGtiJUxElX14ZIUfpRSqEFVrcQLW71qXdiAitHEO9ROcF9jpO1LayIs/Fu4BW4I26Fm9wAd37qGK5G/nsr0EoI/VSIAAAAASUVORK5CYII=')",
        repeat: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAaCAYAAADWm14/AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAGgAAAABHF8LUAAACTklEQVRIDb2VzUsWURTG39dMMz8WkUi6cJGrdGO2SOgfcCki9IFKQhsxWkUhIkT9BWoQSeTCVYvEhbYraVnL8AUxknaJCykXiihvv2e8A9fhvjN3xtEDz5wz9z7n4547d26hkJOUy+WX4AcYTBOyKg05gdvKfA14RRET4EICP5jOswA73wgvbymi0R502WdVgHLdAR8oot2VOBwrhoY05CZUH+gGzeAy8JUOiPKPyl8GxovF4rfohN6DAkgsPQoegzqQt5QooN8VtNoMPkM/tAib2MKBNZZk3oJw1UHaZmzKMX48xOp7wLrBF7QCpRb83pkYYSzpj6AlLpg68MAQjtCPaNXPOIcUc5/gPifefpyPCugxhNWckpeJN0Os13GJwzkdQ33tko1jlfn5C89d8MQ3eZDJ2rexzKmNI7FOHGufeOrAjiGG2sfPyWHlan+iUOhdMBwQMW6AARAeycQApyGQpwOEJ6W7mqpLBBQSBcdaSFX47CWSKxPqral677uA5Dotn8GKFSCLeclyOvBqO8kHcHoBLoJDK0AWs8ty2ootgMS6058C+zdt+acziafLash4/WErf1fcAsgNEN+AvJLfJNYCuAYk7/VwnluStzE3B66LFBEdNa+P1vhpkboPrph3qVUwRgeOKm3BfQiu5AwHRXfKyCA6PfNgVsnlX6kD2qtp0CtSRNSB5chY3KuudP3k1LWvJP5nk50FiGA+wElMdcOWQ4Jk7YAdx8+mkHugBMK/15qfZ44skt8G300R51+A1kLydrAEFnNcW+E/Tlf6ykrSOy4AAAAASUVORK5CYII=')",
        shuffle: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAbCAYAAAAZMl2nAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIqADAAQAAAABAAAAGwAAAACuS3ujAAADDElEQVRIDcWWX2jNYRjHzzHWNmyTP4WlFBdC5GI6cuHKltKICxeU8qfUaruwouWCyzHcmVBLLSVLmTSl3Pi7ECuy3IhculAof4/P9/Q+v97fe36/7ZwTx1PfPX/e532e7+89v+f9LZOpkuTz+XawvUrt0ttA4iGYAGdAXZg5LQz8Q7/G1d6CHoLMAr9XNYn4fVfhDENGuiAFIgQaQbNDE9rYW17Zmhr1YJ6BAtmgiE5EJ6MTymQxBtE5OZ7ksT+A2+BSNpv96K2lmtRax+JesBHMBKVKr05kaUK22LeAfWCEBmsTcmIhcg4SGAJtoBwSqtOgE1mIoSex90Uk5oBNYAOQfAF7OJmXBS/4Q439hHpc+Dv6FngOPruY1AnQ4Pkyf4Lj1L0axOMuDbaBV0Bjdw+IdEyItYHXQDl3wfJYgnOIjwHlGB5htyblJsZI7vA238COjh17DXjh1h+glyQWIciaT+Qmvn768oRNncCe5AJ2DVgM1FzxcTDpe8S6XWgD2NHDGJNwpCxepNl8iuBWt3ANrcbLgCasm995FJ0q7N/Bot6RIXJ/pyZOtUChWqC5t5MxrWmprkBCl94Tj8y5v8XARrbUejtJnO0l5yC10vMrNksmQsPNdDnsOr1H/wD14DxrRWPt8iJFTp0QBSoxKLAa+GPagq87xt6T2Fgn9SBXI6u7Y33S+pQxNi4C94GaxsYUv8vFtVYY67SCrNs9ogtyV1peYpwN+nqOAjXS7dnuJ+LrE9EP7GT6sBN/buJGxHKPEYu+8mmbZpGkO+M6sI/i6fCuwNcdchQ8A5IOcJm9raC2EEn/s5slnWKjUvREfWh9MSN22DOALxdpetIP+LYrNkgsnCC90CZhTYu/xTggIo8xmi0aaP0f0g+J4SBe5FJHE3QEaMSnFyVMHrgiIivIyQH7mXTcn8A78BQSv9AlizsdTcZ84H/2O/FFNpRxAodK/taEu8v1ITjGnqZg3wh+Lw/7rdwjDOpU7OrUz0JgwCr8DyJfad4DiTtGQrqaRN7Qby7ogsSEmvvyBzF4LqjlE8vHAAAAAElFTkSuQmCC')"
    });

    function getEffectiveTickInterval() {
        if (root && root.classList.contains('slo-hidden')) return 220;
        if (isDraggingProgress) return 16;
        if (!Spicetify.Player.isPlaying()) return lowPowerMode ? 88 : 56;
        return lowPowerMode ? 42 : 24;
    }

    // ─── Styles ───────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
    #slo-root {
        position: fixed; inset: 0; z-index: 9999999;
        background: #000; display: flex; overflow: hidden;
        border-radius: 0;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
                     "Helvetica Neue", Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        isolation: isolate;
    }
    #slo-root.slo-hidden { display: none !important; }
    #slo-root.slo-cursor-hidden,
    #slo-root.slo-cursor-hidden * {
        cursor: none !important;
    }
    #slo-root.slo-low-power #slo-color-canvas {
        opacity: 0.88;
    }
    #slo-root.slo-reduced-motion #slo-color-canvas {
        opacity: 0.92;
    }

    /* ── Hintergrund ── */
    #slo-bg {
        position: absolute; inset: 0;
        background:
            radial-gradient(circle at 50% 50%, rgba(16, 18, 26, 0.96) 0%, rgba(8, 10, 16, 1) 72%),
            linear-gradient(132deg, rgba(14, 17, 24, 0.96) 0%, rgba(7, 9, 15, 1) 100%);
        z-index: 0;
        transition: background 1.8s ease;
        pointer-events: none;
        will-change: background;
    }
    #slo-color-field {
        position: absolute; inset: 0;
        z-index: 1;
        pointer-events: none;
        overflow: hidden;
        contain: layout paint style;
        transform: translate3d(0, 0, 0);
        will-change: transform;
    }
    #slo-color-canvas {
        position: absolute;
        inset: -18%;
        width: 136%;
        height: 136%;
        display: block;
        transform: translate3d(0, 0, 0);
        will-change: transform, opacity;
    }

    /* ── Layout ── */
    #slo-content {
        position: relative; z-index: 3;
        display: flex; height: 100%; width: 100%;
        align-items: center;
        justify-content: center;
        padding: 56px 56px 56px 96px;
        gap: 132px;
        transform: translateX(54px);
        box-sizing: border-box;
        transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), gap 0.42s cubic-bezier(0.22, 1, 0.36, 1), padding 0.42s cubic-bezier(0.22, 1, 0.36, 1);
    }
    #slo-root.slo-lyrics-hidden #slo-content {
        gap: 0;
        padding: 56px 92px;
    }

    /* ── Linke Spalte ── */
    #slo-left {
        position: relative;
        width: 448px; max-width: 448px; min-width: 448px; flex-shrink: 0;
        display: flex; flex-direction: column;
        justify-content: center;
        align-self: center;
        transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), width 0.42s cubic-bezier(0.22, 1, 0.36, 1), max-width 0.42s cubic-bezier(0.22, 1, 0.36, 1);
    }
    #slo-root.slo-lyrics-hidden #slo-left {
        width: 500px; max-width: 500px; min-width: 500px;
    }
    #slo-art-container {
        position: relative;
        width: 100%; aspect-ratio: 1/1;
        margin-bottom: 22px;
        transition: transform 0.55s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.4s ease;
        transform-origin: center center;
    }
    #slo-root.slo-paused #slo-art-container {
        transform: scale(0.85);
    }
    #slo-root.slo-track-transition #slo-art-container {
        opacity: 0;
        transform: scale(0.92);
        filter: blur(12px);
    }

    #slo-vinyl-rotator {
        position: relative;
        width: 100%; height: 100%;
        transform-origin: center center;
        border-radius: 14px;
        transition: border-radius 0.4s ease;
        will-change: transform;
    }
    #slo-root.slo-vinyl-enabled #slo-vinyl-rotator {
        border-radius: 50%;
        cursor: grab;
    }
    #slo-root.slo-vinyl-enabled #slo-vinyl-rotator:active,
    #slo-root.slo-is-scratching #slo-vinyl-rotator {
        cursor: grabbing;
    }

    #slo-art {
        position: absolute; inset: 0; z-index: 3;
        width: 100%; height: 100%; border-radius: 14px; object-fit: cover;
        box-shadow: 0 24px 72px rgba(0,0,0,0.42);
        transition: all 0.4s ease;
    }
    #slo-root.slo-vinyl-enabled #slo-art {
        width: 36%; height: 36%;
        top: 32%; left: 32%;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    
    .slo-vinyl-layer {
        position: absolute; inset: 0; width: 100%; height: 100%;
        border-radius: 50%; pointer-events: none;
        opacity: 0; transition: opacity 0.4s ease;
    }
    #slo-root.slo-vinyl-enabled .slo-vinyl-layer { opacity: 1; }
    
    #slo-vinyl-grooves {
        z-index: 1;
        background-color: #111;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><circle cx="250" cy="250" r="250" fill="%23111"/><circle cx="250" cy="250" r="245" fill="none" stroke="%23222" stroke-width="2"/><circle cx="250" cy="250" r="230" fill="none" stroke="%23222" stroke-width="2"/><circle cx="250" cy="250" r="215" fill="none" stroke="%23222" stroke-width="2"/><circle cx="250" cy="250" r="200" fill="none" stroke="%23222" stroke-width="2"/><circle cx="250" cy="250" r="185" fill="none" stroke="%23222" stroke-width="2"/><circle cx="250" cy="250" r="170" fill="none" stroke="%231a1a1a" stroke-width="3"/><circle cx="250" cy="250" r="155" fill="none" stroke="%23222" stroke-width="2"/><circle cx="250" cy="250" r="140" fill="none" stroke="%23222" stroke-width="2"/><circle cx="250" cy="250" r="125" fill="none" stroke="%23222" stroke-width="2"/><circle cx="250" cy="250" r="85" fill="%23333"/><circle cx="250" cy="250" r="85" fill="currentColor" opacity="0.3"/><path d="M250,5 A245,245 0 0,1 495,250 L465,250 A215,215 0 0,0 250,35 Z" fill="%23ffffff" opacity="0.04"/><path d="M250,495 A245,245 0 0,1 5,250 L35,250 A215,215 0 0,0 250,465 Z" fill="%23ffffff" opacity="0.04"/></svg>');
        background-size: cover;
        box-shadow: inset 0 0 0 1px #222, 0 8px 32px rgba(0,0,0,0.6);
        color: var(--slo-album-color, #777); 
    }
    #slo-vinyl-hole {
        z-index: 4;
        width: 3.5%; height: 3.5%;
        top: 48.25%; left: 48.25%;
        background: #080808;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 1px rgba(255,255,255,0.1);
    }

    #slo-vinyl-arm {
        position: absolute;
        left: -120px;
        bottom: 65px;
        width: 250px;
        height: 500px;
        z-index: 20; /* In front of info row and timeline */
        pointer-events: none;
        opacity: 0;
        transform-origin: 20% 87.5%;
        transform: rotate(-35deg);
        filter: drop-shadow(4px 10px 12px rgba(0,0,0,0.7));
        transition: opacity 0.5s ease, bottom 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        will-change: transform, opacity, bottom;
    }
    #slo-root.slo-vinyl-enabled #slo-vinyl-arm {
        opacity: 1;
    }
    #slo-root.slo-volume-enabled #slo-vinyl-arm {
        bottom: 115px;
    }

    /* Info-Zeile: Titel/Artist links, Star + ··· rechts */
    #slo-info-row {
        position: relative; z-index: 10;
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 16px;
    }
    #slo-meta { flex: 1; min-width: 0; }
    #slo-meta,
    #slo-info-actions,
    #slo-timeline,
    #slo-controls,
    #slo-volume-wrap {
        transition: opacity 0.4s ease, transform 0.55s cubic-bezier(0.2, 0.9, 0.2, 1), filter 0.4s ease, margin-top 0.4s cubic-bezier(0.2, 0.9, 0.2, 1), max-height 0.4s cubic-bezier(0.2, 0.9, 0.2, 1);
    }
    #slo-title {
        font-size: 20px; font-weight: 700; color: #fff;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 4px; letter-spacing: -0.28px;
    }
    #slo-artist {
        font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.68);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #slo-info-actions {
        display: flex; gap: 10px; align-items: center; margin-left: 14px; flex-shrink: 0;
        position: relative;
    }
    .slo-circle-btn {
        width: 28px; height: 28px; border-radius: 50%;
        background: rgba(255,255,255,0.08); border: none;
        display: flex; align-items: center; justify-content: center;
        color: rgba(255,255,255,0.4); cursor: pointer;
        transition: background 0.24s ease, color 0.24s ease, transform 0.24s ease;
    }
    .slo-circle-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
    .slo-circle-btn.active {
        background: rgba(29,185,84,0.18);
        color: #1db954;
    }
    .slo-circle-btn.active:hover {
        background: rgba(29,185,84,0.24);
        color: #1ed760;
    }
    @keyframes slo-like-pop {
        0% { transform: scale(1); }
        40% { transform: scale(1.6) rotate(-15deg); }
        60% { transform: scale(0.8) rotate(10deg); }
        80% { transform: scale(1.2) rotate(-5deg); }
        100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes slo-like-bg-pop {
        0% { transform: scale(1); }
        40% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    .slo-circle-btn.anim-pop {
        animation: slo-like-bg-pop 0.4s ease-out;
    }
    .slo-circle-btn.anim-pop svg {
        animation: slo-like-pop 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    #slo-more.active,
    #slo-more.active:hover {
        background: rgba(255,255,255,0.16);
        color: rgba(255,255,255,0.96);
    }
    #slo-settings-anchor {
        display: flex;
        align-items: center;
    }
    #slo-settings-popover {
        position: fixed;
        top: 50%;
        left: 50%;
        width: 520px;
        max-width: 90vw;
        max-height: 85vh;
        overflow-y: auto;
        padding: 24px 32px;
        border-radius: 20px;
        background: rgba(20, 20, 20, 0.65);
        border: 1px solid rgba(255,255,255,0.06);
        box-shadow: 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);
        backdrop-filter: blur(40px) saturate(200%);
        -webkit-backdrop-filter: blur(40px) saturate(200%);
        opacity: 0;
        transform: translate(-50%, -46%) scale(0.96);
        pointer-events: none;
        transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        z-index: 1000;
    }
    #slo-settings-popover::-webkit-scrollbar { display: none; }
    
    #slo-root::after {
        content: "";
        position: fixed; inset: 0; z-index: 999;
        background: rgba(0,0,0,0.4);
        opacity: 0; pointer-events: none;
        transition: opacity 0.4s ease;
    }
    #slo-root.slo-show-settings::after {
        opacity: 1; pointer-events: auto;
    }
    
    #slo-root.slo-show-settings #slo-settings-popover {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        pointer-events: auto;
    }
    #slo-settings-header {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    #slo-settings-header h2 {
        font-size: 20px; font-weight: 800; margin: 0; padding: 0;
        color: #fff; letter-spacing: -0.3px;
    }
    .slo-settings-section-title {
        font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
        color: #1db954; text-transform: uppercase;
        margin-bottom: 12px; margin-top: 24px;
    }
    .slo-setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 10px 0;
        color: rgba(255,255,255,0.9);
    }
    .slo-setting-copy {
        min-width: 0;
        display: flex; flex-direction: column; gap: 6px;
    }
    .slo-setting-title {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.2;
    }
    .slo-setting-desc {
        font-size: 13px;
        line-height: 1.4;
        color: rgba(255,255,255,0.5);
    }
    .slo-switch {
        position: relative;
        width: 38px;
        height: 22px;
        border: none;
        border-radius: 999px;
        background: rgba(255,255,255,0.14);
        cursor: pointer;
        flex-shrink: 0;
        transition: background 0.24s ease;
    }
    .slo-switch::after {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.28);
        transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .slo-switch[aria-checked="true"] {
        background: rgba(29,185,84,0.42);
    }
    .slo-switch[aria-checked="true"]::after {
        transform: translateX(16px);
    }
    
    .slo-sortable-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        margin-top: 12px;
    }
    .slo-provider-row {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 10px 12px;
        cursor: grab;
        transition: background 0.2s ease, transform 0.1s ease;
    }
    .slo-provider-row:active {
        cursor: grabbing;
    }
    .slo-provider-row.slo-dragging {
        opacity: 0.5;
        background: rgba(255, 255, 255, 0.15);
    }
    .slo-provider-handle {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        color: rgba(255, 255, 255, 0.5);
        cursor: grab;
    }
    .slo-provider-row span {
        font-size: 14px;
        font-weight: 500;
        color: #fff;
    }

    #slo-more svg circle {
        fill: rgba(255,255,255,0.42);
        transition: fill 0.22s ease, opacity 0.22s ease;
    }
    #slo-root[data-active-toggles="1"] #slo-more svg circle:nth-child(1),
    #slo-root[data-active-toggles="2"] #slo-more svg circle:nth-child(1),
    #slo-root[data-active-toggles="2"] #slo-more svg circle:nth-child(2) {
        fill: #1db954;
        opacity: 1;
    }

    /* ── Progress Bar ── */
    #slo-timeline { position: relative; z-index: 10; width: 100%; margin-bottom: 28px; }
    #slo-progress-bar {
        width: 100%; height: 5px;
        background: rgba(255,255,255,0.2);
        border-radius: 999px; position: relative;
        overflow: hidden;
        cursor: pointer; margin-bottom: 8px;
    }
    #slo-progress-fill {
        height: 100%; background: rgba(255,255,255,0.85);
        border-radius: 999px; width: 100%;
        transform: scaleX(0);
        transform-origin: left center;
        will-change: transform;
    }
    #slo-progress-thumb {
        position: absolute;
        top: 50%; left: 0;
        width: 0; height: 0;
        border-radius: 50%;
        background: transparent;
        box-shadow: none;
        transform: translate(-50%, -50%);
        will-change: left, transform;
        transition: none;
        pointer-events: none;
        opacity: 0;
    }
    #slo-root.slo-dragging-progress #slo-progress-fill,
    #slo-root.slo-dragging-progress #slo-progress-thumb {
        transition: none !important;
    }
    #slo-progress-bar:hover #slo-progress-thumb {
        transform: translate(-50%, -50%);
    }
    #slo-times {
        display: flex; justify-content: space-between;
        font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5);
        font-variant-numeric: tabular-nums;
    }

    /* ── Player Controls ── */
    #slo-controls {
        position: relative; z-index: 10;
        display: flex; justify-content: space-between; align-items: center;
        width: 100%; padding: 0 2px;
    }
    #slo-volume-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        margin-top: 0;
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        transform: translate3d(0, -6px, 0);
        transform-origin: top center;
        pointer-events: none;
        transition: max-height 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), margin-top 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    }
    #slo-root.slo-volume-enabled #slo-volume-wrap {
        max-height: 36px;
        opacity: 1;
        margin-top: 14px;
        transform: translate3d(0, 0, 0);
        pointer-events: auto;
    }
    .slo-volume-icon {
        width: 16px;
        height: 16px;
        color: rgba(255,255,255,0.52);
        flex-shrink: 0;
        transition: color 0.24s ease, opacity 0.24s ease;
    }
    #slo-root.slo-volume-muted .slo-volume-icon {
        color: rgba(255,255,255,0.32);
    }
    #slo-volume-bar {
        position: relative;
        flex: 1;
        height: 5px;
        border-radius: 999px;
        background: rgba(255,255,255,0.16);
        overflow: hidden;
        cursor: pointer;
    }
    #slo-volume-fill {
        position: absolute;
        inset: 0;
        width: 100%;
        border-radius: 999px;
        background: rgba(255,255,255,0.82);
        transform: scaleX(0);
        transform-origin: left center;
        will-change: transform;
    }
    .slo-ctrl {
        background: transparent; border: none; color: rgba(255,255,255,0.66);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; padding: 8px;
        transition: color 0.24s ease, transform 0.24s ease;
    }
    .slo-ctrl.active { color: #1db954; }
    .slo-ctrl:hover { color: #fff; transform: scale(1.08); }
    .slo-ctrl.active:hover { color: #1ed760; }
    #slo-ctrl-play {
        color: #fff;
        background: transparent;
        box-shadow: none;
    }
    #slo-ctrl-play:hover { transform: scale(1.12); }
    .slo-ctrl-glyph {
        display: block;
        width: 18px;
        height: 18px;
        background-color: currentColor;
        mask-image: var(--slo-icon-mask);
        mask-repeat: no-repeat;
        mask-position: center;
        mask-size: contain;
        -webkit-mask-image: var(--slo-icon-mask);
        -webkit-mask-repeat: no-repeat;
        -webkit-mask-position: center;
        -webkit-mask-size: contain;
    }
    #slo-prev .slo-ctrl-glyph,
    #slo-next .slo-ctrl-glyph {
        width: 24px;
        height: 24px;
    }
    #slo-ctrl-play .slo-ctrl-glyph {
        width: 28px;
        height: 28px;
    }
    #slo-shuffle .slo-ctrl-glyph,
    #slo-repeat .slo-ctrl-glyph {
        width: 16px;
        height: 16px;
    }

    /* ── Rechte Spalte: Lyrics ── */
    #slo-right {
        flex: 0 1 760px; height: 100%; min-width: 0; max-width: 760px; position: relative; overflow: hidden;
        padding-left: 28px;
        transition: opacity 0.4s ease, transform 0.55s cubic-bezier(0.2, 0.9, 0.2, 1), max-width 0.42s cubic-bezier(0.22, 1, 0.36, 1), flex-basis 0.42s cubic-bezier(0.22, 1, 0.36, 1), margin 0.42s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s ease;
    }
    #slo-root.slo-lyrics-hidden #slo-right {
        opacity: 0;
        transform: translateX(28px);
        flex-basis: 0;
        max-width: 0;
        margin-left: 0;
        pointer-events: none;
    }
    #slo-root.slo-track-transition #slo-art {
        opacity: 0;
        transform: scale(0.92);
        filter: blur(12px);
    }
    #slo-root.slo-track-transition #slo-meta,
    #slo-root.slo-track-transition #slo-info-actions,
    #slo-root.slo-track-transition #slo-timeline,
    #slo-root.slo-track-transition #slo-controls,
    #slo-root.slo-track-transition #slo-volume-wrap {
        opacity: 0;
        transform: translate3d(0, 16px, 0);
        filter: blur(8px);
    }
    #slo-root.slo-track-transition #slo-right {
        opacity: 0;
        transform: translate3d(30px, 0, 0);
        filter: blur(12px);
    }
    #slo-scroll {
        height: 100%; overflow-y: scroll;
        padding: 6vh 1vw 38vh 0;
        scrollbar-width: none; box-sizing: border-box;
        overscroll-behavior: contain;
        transform: translate3d(0, 0, 0);
        will-change: transform;
    }
    #slo-scroll::-webkit-scrollbar { display: none; }

    #slo-empty {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: rgba(255,255,255,0.72);
        transform: translateY(-10px);
        width: 100%;
    }
    #slo-empty > div {
        width: min(100%, 420px);
        margin: 0 auto;
    }
    #slo-empty-title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 8px;
    }
    #slo-empty-copy {
        font-size: 14px;
        font-weight: 500;
        color: rgba(255,255,255,0.58);
    }
    #slo-empty-actions {
        display: flex;
        justify-content: center;
        margin-top: 18px;
    }
    .slo-empty-action {
        appearance: none;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.92);
        border-radius: 999px;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.01em;
        cursor: pointer;
        transition: background 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
    }
    .slo-empty-action:hover {
        background: rgba(255,255,255,0.14);
        border-color: rgba(255,255,255,0.22);
        transform: translate3d(0, -1px, 0);
    }

    .slo-line {
        font-weight: 800; font-style: normal;
        line-height: 1.3; padding: 18px 0;
        cursor: default; user-select: none;
        font-size: 37px; letter-spacing: -0.42px;
        transition: color 0.52s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.52s cubic-bezier(0.22, 1, 0.36, 1), text-shadow 0.52s cubic-bezier(0.22, 1, 0.36, 1), transform 0.52s cubic-bezier(0.22, 1, 0.36, 1);
        transform: translate3d(0, 0, 0);
        will-change: transform, opacity;
        backface-visibility: hidden;
    }
    .slo-line.slo-clickable { cursor: pointer; }
    .slo-line-copy {
        display: inline;
    }
    #slo-root.slo-karaoke-enabled .slo-line.slo-karaoke-active {
        color: #fff !important;
        text-shadow: none !important;
    }
    #slo-root.slo-karaoke-enabled .slo-line.slo-karaoke-active .slo-char {
        opacity: clamp(0.26, 0.26 + 0.74 * ((var(--slo-karaoke-progress, 0) - var(--char-pct, 0)) / 10), 1);
        transition: opacity 0.05s linear;
    }

    .slo-pause {
        font-weight: 400; color: rgba(255,255,255,0.35) !important;
        font-size: 28px !important; font-style: normal;
        display: none; gap: 8px; align-items: center;
        padding: 20px 0;
    }
    .slo-pause.slo-pause-active {
        display: flex;
    }
    #slo-root.slo-karaoke-enabled .slo-pause.slo-pause-active {
        color: rgba(255,255,255,0.9) !important;
        transform: translate3d(0, 0, 0) scale(1.04) !important;
        filter: drop-shadow(0 10px 24px rgba(0,0,0,0.24));
    }
    .slo-pause .slo-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: rgba(255,255,255,0.5);
        animation: slo-bounce 1.4s ease-in-out infinite;
        animation-play-state: paused;
    }
    .slo-pause.slo-pause-active .slo-dot { animation-play-state: running; }
    #slo-root.slo-karaoke-enabled .slo-pause .slo-dot {
        width: 10px;
        height: 10px;
        background: rgba(255,255,255,0.88);
        box-shadow: 0 0 18px rgba(255,255,255,0.18);
    }
    #slo-root.slo-karaoke-enabled .slo-pause.slo-pause-active .slo-dot {
        animation-duration: 0.9s;
        box-shadow: 0 0 24px rgba(255,255,255,0.28);
    }
    .slo-pause .slo-dot:nth-child(2) { animation-delay: 0.2s; }
    .slo-pause .slo-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes slo-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
        40% { transform: translateY(-10px); opacity: 1; }
    }
    @keyframes slo-top-btn-blop {
        0% { transform: translate3d(18px, 0, 0) scale(0.56); }
        62% { transform: translate3d(-2px, 0, 0) scale(1.08); }
        100% { transform: translate3d(0, 0, 0) scale(1); }
    }

    .slo-skel {
        height: 32px; border-radius: 6px;
        background: rgba(255,255,255,0.06);
        animation: slo-pulse 1.6s ease-in-out infinite; margin: 14px 0;
    }
    @keyframes slo-pulse { 0%,100%{opacity:.3} 50%{opacity:.7} }

    /* ── Top Actions ── */
    #slo-top-actions {
        position: absolute;
        top: 14px;
        right: 14px;
        z-index: 99;
        display: flex;
        gap: 8px;
    }
    .slo-top-btn {
        background: rgba(255,255,255,0.08);
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: rgba(255,255,255,0.4);
        transition: background 0.2s, color 0.2s, opacity 0.2s ease, transform 0.34s cubic-bezier(0.2, 0.9, 0.24, 1.22);
        opacity: 0;
        pointer-events: none;
        transform: translate3d(0, 0, 0) scale(1);
    }
    #slo-root:hover .slo-top-btn { opacity: 1; pointer-events: auto; }
    #slo-root.slo-cursor-hidden .slo-top-btn { opacity: 0 !important; pointer-events: none !important; }
    #slo-toggle-karaoke,
    #slo-toggle-vinyl,
    #slo-toggle-lyrics {
        transform: translate3d(16px, 0, 0) scale(0.72);
    }
    #slo-root:hover #slo-toggle-karaoke,
    #slo-root:hover #slo-toggle-vinyl,
    #slo-root:hover #slo-toggle-lyrics {
        transform: translate3d(0, 0, 0) scale(1);
    }
    #slo-root:hover #slo-toggle-vinyl {
        transition-delay: 0.02s;
        animation: slo-top-btn-blop 0.38s cubic-bezier(0.2, 0.9, 0.24, 1.22);
    }
    #slo-root:hover #slo-toggle-karaoke {
        transition-delay: 0.05s;
        animation: slo-top-btn-blop 0.38s cubic-bezier(0.2, 0.9, 0.24, 1.22);
    }
    #slo-root:hover #slo-toggle-lyrics {
        transition-delay: 0.09s;
        animation: slo-top-btn-blop 0.42s cubic-bezier(0.2, 0.9, 0.24, 1.22);
    }
    .slo-top-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
    .slo-top-btn.active,
    #slo-root.slo-karaoke-enabled #slo-toggle-karaoke,
    #slo-root.slo-vinyl-enabled #slo-toggle-vinyl {
        color: rgba(255,255,255,0.96);
        background: rgba(255,255,255,0.16);
    }
    .slo-top-btn:disabled {
        opacity: 0.24 !important;
        pointer-events: none !important;
        color: rgba(255,255,255,0.28) !important;
    }
    #slo-root.slo-lyrics-hidden #slo-toggle-lyrics {
        color: rgba(255,255,255,0.95);
        background: rgba(255,255,255,0.16);
    }

    /* ── FAB Button ── */
    #slo-fab {
        position: fixed; right: 10px; bottom: 70px; z-index: 999999;
        width: 40px; height: 40px; border-radius: 50%;
        background: #1db954; border: none;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; color: #fff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        transition: transform 0.15s, background 0.15s;
    }
    #slo-fab:hover { background: #1ed760; transform: scale(1.1); }

    /* ── Up Next Pop-up ── */
    #slo-up-next {
        position: absolute; right: 40px; bottom: 40px; z-index: 1000;
        width: 300px; padding: 16px; border-radius: 12px;
        background: rgba(20, 20, 20, 0.5);
        backdrop-filter: blur(28px) saturate(180%);
        -webkit-backdrop-filter: blur(28px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 16px 36px rgba(0,0,0,0.5);
        display: flex; flex-direction: column; gap: 10px;
        pointer-events: none;
        opacity: 0; transform: translateY(40px) scale(0.95);
        transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    }
    #slo-root.slo-show-up-next #slo-up-next {
        opacity: 1; transform: translateY(0) scale(1);
    }
    #slo-up-next-label {
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.6px; color: rgba(255,255,255,0.5);
    }
    #slo-up-next-content {
        display: flex; gap: 14px; align-items: center;
    }
    #slo-up-next-art {
        width: 48px; height: 48px; border-radius: 6px;
        object-fit: cover; background: #222;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    }
    #slo-up-next-info {
        display: flex; flex-direction: column; overflow: hidden; justify-content: center; gap: 2px;
    }
    #slo-up-next-title {
        font-size: 15px; font-weight: 700; color: #fff;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #slo-up-next-artist {
        font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.7);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    `;
    document.head.appendChild(style);

    // ─── FAB Button ───────────────────────────────────────────────────────────
    const fab = document.createElement('button');
    fab.id = 'slo-fab';
    fab.title = 'Lyrics';
    fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/></svg>';
    document.body.appendChild(fab);

    // ─── DOM ──────────────────────────────────────────────────────────────────
    const root = document.createElement('div');
    root.id = 'slo-root';
    root.classList.add('slo-hidden');
    if (lowPowerMode) root.classList.add('slo-low-power');
    if (prefersReducedMotion) root.classList.add('slo-reduced-motion');
    root.innerHTML = `
        <div id="slo-bg"></div>
        <div id="slo-color-field">
            <canvas id="slo-color-canvas"></canvas>
        </div>
        <div id="slo-top-actions">
            <button id="slo-toggle-vinyl" class="slo-top-btn" title="Toggle Vinyl Mode" aria-pressed="false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </button>
            <button id="slo-toggle-karaoke" class="slo-top-btn" title="Toggle Karaoke Mode" aria-pressed="false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 16v5"/>
                    <path d="M8 21h8"/>
                    <path d="M8 12a4 4 0 1 0 8 0V7a4 4 0 1 0-8 0v5Z"/>
                </svg>
            </button>
            <button id="slo-toggle-lyrics" class="slo-top-btn" title="Hide lyrics">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="7" x2="20" y2="7"/>
                    <line x1="4" y1="12" x2="20" y2="12"/>
                    <line x1="4" y1="17" x2="14" y2="17"/>
                </svg>
            </button>
            <button id="slo-close" class="slo-top-btn" title="Close (Esc)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>

        <div id="slo-content">
            <div id="slo-left">
                <div id="slo-art-container">
                    <div id="slo-vinyl-rotator">
                        <div class="slo-vinyl-layer" id="slo-vinyl-grooves"></div>
                        <img id="slo-art" src="" alt="Cover"/>
                        <div class="slo-vinyl-layer" id="slo-vinyl-hole"></div>
                    </div>
                </div>

                <svg id="slo-vinyl-arm" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
                    <g>
                        <!-- Outer Base ring -->
                        <circle cx="40" cy="350" r="38" fill="#181818" stroke="#333" stroke-width="2"/>
                        <circle cx="40" cy="350" r="28" fill="#111" stroke="#222" stroke-width="1"/>
                        
                        <!-- Rear extension (Counterweight area) -->
                        <rect x="25" y="360" width="30" height="35" rx="5" fill="#222" stroke="#111" stroke-width="2" transform="rotate(-15 40 350)"/>
                        
                        <!-- Arm Pipe -->
                        <path d="M 40 350 L 70 200 L 150 100" fill="none" stroke="#e0e0e0" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
                        
                        <!-- Base Pivot Core -->
                        <circle cx="40" cy="350" r="14" fill="#0a0a0a" stroke="#444" stroke-width="2"/>
                        <circle cx="40" cy="350" r="6" fill="#111"/>

                        <!-- Headshell -->
                        <g transform="translate(150, 100) rotate(-45)">
                            <rect x="-12" y="-4" width="20" height="8" rx="2" fill="#555"/>
                            <rect x="8" y="-12" width="30" height="24" rx="4" fill="#1a1a1a" stroke="#444" stroke-width="1"/>
                            <polygon points="12,-10 35,-6 35,6 12,10" fill="#111"/>
                            <!-- Needle tip marker -->
                            <circle cx="32" cy="-6" r="1.5" fill="#f33"/>
                        </g>
                    </g>
                </svg>

                <div id="slo-info-row">
                    <div id="slo-meta">
                        <div id="slo-title">—</div>
                        <div id="slo-artist"></div>
                    </div>
                    <div id="slo-info-actions">
                        <button class="slo-circle-btn" id="slo-like" title="Save to Liked Songs">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        </button>
                        <div id="slo-settings-anchor">
                            <button class="slo-circle-btn" id="slo-more" title="More">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div id="slo-timeline">
                    <div id="slo-progress-bar">
                        <div id="slo-progress-fill"></div>
                        <div id="slo-progress-thumb"></div>
                    </div>
                    <div id="slo-times">
                        <span id="slo-current-time">0:00</span>
                        <span id="slo-duration">-0:00</span>
                    </div>
                </div>

                <div id="slo-controls">
                    <button class="slo-ctrl" id="slo-shuffle" title="Shuffle">
                        <span class="slo-ctrl-glyph" style="--slo-icon-mask: var(--slo-mask-shuffle);"></span>
                    </button>
                    <button class="slo-ctrl" id="slo-prev" title="Previous">
                        <span class="slo-ctrl-glyph" style="--slo-icon-mask: var(--slo-mask-backward);"></span>
                    </button>
                    <button class="slo-ctrl" id="slo-ctrl-play" title="Play/Pause">
                        <span class="slo-ctrl-glyph" id="slo-play-icon" style="--slo-icon-mask: var(--slo-mask-play);"></span>
                    </button>
                    <button class="slo-ctrl" id="slo-next" title="Next">
                        <span class="slo-ctrl-glyph" style="--slo-icon-mask: var(--slo-mask-forward);"></span>
                    </button>
                    <button class="slo-ctrl" id="slo-repeat" title="Repeat">
                        <span class="slo-ctrl-glyph" id="slo-repeat-icon" style="--slo-icon-mask: var(--slo-mask-repeat);"></span>
                    </button>
                </div>
                <div id="slo-volume-wrap">
                    <svg class="slo-volume-icon" id="slo-volume-icon-min" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/></svg>
                    <div id="slo-volume-bar">
                        <div id="slo-volume-fill"></div>
                    </div>
                    <svg class="slo-volume-icon" id="slo-volume-icon-max" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18.9 6.2a8 8 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </div>
            </div>

            <div id="slo-right">
                <div id="slo-scroll">
                    <div class="slo-skel" style="width:80%"></div>
                    <div class="slo-skel" style="width:55%"></div>
                    <div class="slo-skel" style="width:70%"></div>
                    <div class="slo-skel" style="width:40%"></div>
                </div>
            </div>
        </div>

        <div id="slo-settings-popover" aria-hidden="true">
            <div id="slo-settings-header">
                <h2>Lyrics Settings</h2>
                <button id="slo-settings-close-btn" class="slo-circle-btn" title="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            
            <div class="slo-settings-section-title">Overlay</div>
            <div class="slo-setting-row">
                <div class="slo-setting-copy">
                    <div class="slo-setting-title">Volume Bar</div>
                    <div class="slo-setting-desc">Shows a volume slider below the controls.</div>
                </div>
                <button class="slo-switch" id="slo-volume-toggle" type="button" role="switch" aria-checked="false" title="Toggle volume bar"></button>
            </div>

            <div class="slo-setting-row">
                <div class="slo-setting-copy">
                    <div class="slo-setting-title">Up Next</div>
                    <div class="slo-setting-desc">Shows the upcoming track shortly before the song ends.</div>
                </div>
                <button class="slo-switch" id="slo-up-next-toggle" type="button" role="switch" aria-checked="true" title="Toggle Up Next preview"></button>
            </div>
            
            <div style="height: 16px;"></div>
            
            <div class="slo-settings-section-title">Lyrics</div>
            <div class="slo-setting-row">
                <div class="slo-setting-copy">
                    <div class="slo-setting-title">Auto-hide lyrics</div>
                    <div class="slo-setting-desc">Hides the right column if no lyrics are available.</div>
                </div>
                <button class="slo-switch" id="slo-auto-hide-empty-toggle" type="button" role="switch" aria-checked="false" title="Auto-hide lyrics when empty"></button>
            </div>
            
            <div style="height: 16px;"></div>
            
            <div class="slo-setting-row" style="flex-direction: column; align-items: flex-start;">
                <div class="slo-setting-copy" style="margin-bottom: 8px;">
                    <div class="slo-setting-title">Provider Order</div>
                    <div class="slo-setting-desc">Drag to reorder lyrics databases. Top is prioritized.</div>
                </div>
                <div id="slo-provider-order-list" class="slo-sortable-list">
                    <!-- Providers rendered dynamically -->
                </div>
            </div>
        </div>

        <div id="slo-up-next">
            <div id="slo-up-next-label">Up Next</div>
            <div id="slo-up-next-content">
                <img id="slo-up-next-art" src="" alt="Up Next Cover" />
                <div id="slo-up-next-info">
                    <div id="slo-up-next-title"></div>
                    <div id="slo-up-next-artist"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(root);
    root.style.setProperty('--slo-mask-backward', controlIconMasks.backward);
    root.style.setProperty('--slo-mask-forward', controlIconMasks.forward);
    root.style.setProperty('--slo-mask-pause', controlIconMasks.pause);
    root.style.setProperty('--slo-mask-play', controlIconMasks.play);
    root.style.setProperty('--slo-mask-repeat-one', controlIconMasks.repeatOne);
    root.style.setProperty('--slo-mask-repeat', controlIconMasks.repeat);
    root.style.setProperty('--slo-mask-shuffle', controlIconMasks.shuffle);

    const bgEl     = root.querySelector('#slo-bg');
    const colorCanvas = root.querySelector('#slo-color-canvas');
    const colorCtx = colorCanvas?.getContext('2d', { alpha: true, desynchronized: true });
    const artEl    = root.querySelector('#slo-art');
    const vinylRotator = root.querySelector('#slo-vinyl-rotator');
    const vinylArm = root.querySelector('#slo-vinyl-arm');
    const titleEl  = root.querySelector('#slo-title');
    const artistEl = root.querySelector('#slo-artist');
    const scrollEl = root.querySelector('#slo-scroll');
    const fillEl   = root.querySelector('#slo-progress-fill');
    const barEl    = root.querySelector('#slo-progress-bar');
    const thumbEl  = root.querySelector('#slo-progress-thumb');
    const timeEl   = root.querySelector('#slo-current-time');
    const durEl    = root.querySelector('#slo-duration');
    const upNextTitleEl = root.querySelector('#slo-up-next-title');
    const upNextArtistEl = root.querySelector('#slo-up-next-artist');
    const upNextArtEl = root.querySelector('#slo-up-next-art');
    const playIcon = root.querySelector('#slo-play-icon');
    const repeatIcon = root.querySelector('#slo-repeat-icon');
    const karaokeBtn = root.querySelector('#slo-toggle-karaoke');
    const vinylBtn = root.querySelector('#slo-toggle-vinyl');
    const toggleLyricsBtn = root.querySelector('#slo-toggle-lyrics');
    const moreBtn = root.querySelector('#slo-more');
    const settingsAnchor = root.querySelector('#slo-settings-anchor');
    const settingsPopover = root.querySelector('#slo-settings-popover');
    const volumeToggleEl = root.querySelector('#slo-volume-toggle');
    const upNextToggleEl = root.querySelector('#slo-up-next-toggle');
    const autoHideEmptyToggleEl = root.querySelector('#slo-auto-hide-empty-toggle');
    const volumeBarEl = root.querySelector('#slo-volume-bar');
    const volumeFillEl = root.querySelector('#slo-volume-fill');
    let isDraggingProgress = false;
    
    // Up Next State
    let upNextShown = false;
    let upNextHideTimer = null;
    let upNextLastTrackUri = null;

    function hideUpNextPreview(resetShown = false, resetTrackUri = false) {
        if (resetShown) upNextShown = false;
        if (resetTrackUri) upNextLastTrackUri = null;
        root.classList.remove('slo-show-up-next');
        clearTimeout(upNextHideTimer);
        upNextHideTimer = null;
    }

    function checkUpNext(progress, duration) {
        if (!upNextEnabled) {
            hideUpNextPreview(true, true);
            return;
        }
        if (!duration || duration < 30000) return; // Skip for short tracks
        const remaining = duration - progress;
        
        const currentUri = Spicetify.Player.data?.track?.uri;
        
        // Hide if track changed completely
        if (upNextLastTrackUri && upNextLastTrackUri !== currentUri && upNextShown) {
            hideUpNextPreview(true);
        }
        
        // Show Up Next when exactly 19 seconds remaining
        if (remaining <= 19000 && remaining > 500 && !upNextShown) {
            upNextShown = true;
            upNextLastTrackUri = currentUri;
            
            const queue = Spicetify.Queue;
            const nextTrack = queue?.nextTracks?.[0];
            
            if (nextTrack) {
                if (upNextTitleEl) upNextTitleEl.textContent = nextTrack.contextTrack.metadata.title;
                if (upNextArtistEl) upNextArtistEl.textContent = nextTrack.contextTrack.metadata.artist_name || '';
                if (upNextArtEl) {
                    const imgUrl = nextTrack.contextTrack.metadata.image_url;
                    if (imgUrl) upNextArtEl.src = imgUrl;
                }
                
                root.classList.add('slo-show-up-next');
                
                // Auto hide just before song ends or after timeout
                clearTimeout(upNextHideTimer);
                upNextHideTimer = setTimeout(() => {
                    root.classList.remove('slo-show-up-next');
                    upNextHideTimer = null;
                }, 17000);
            }
        } 
        // Hide if user seeks backwards significantly
        else if (remaining > 20000 && upNextShown) {
            hideUpNextPreview(true);
        }
    }

    // Vinyl State
    let vinylRot = 0;
    let isDraggingVinyl = false;
    let lastVinylRotAngle = 0;
    let vinylAnimationRAF = null;
    let lastVinylTick = performance.now();
    let currentArmRot = -35;
    
    function renderVinylFrame() {
        if (!root.classList.contains('slo-hidden')) {
            const now = performance.now();
            if (vinylModeEnabled && !isDraggingVinyl && !root.classList.contains('slo-paused')) {
                const dt = now - lastVinylTick;
                // 1 Rotation (360deg) alle 8 Sekunden = 360 / 8000
                vinylRot += dt * (360 / 8000);
            }
            if (vinylModeEnabled || isDraggingVinyl) {
                if (vinylRotator) vinylRotator.style.transform = `rotate(${vinylRot}deg)`;
            }

            let targetArmRot = -35; // Resting completely off to the left
            if (vinylModeEnabled) {
                const prog = getPlaybackProgress();
                const dur = getDuration();
                if (dur > 0) {
                    targetArmRot = -12 + Math.max(0, Math.min(1, prog / dur)) * 16; // Sweeps from -12 (outer edge) up to +4 (inner edge) 
                } else {
                    targetArmRot = -12;
                }
                if (root.classList.contains('slo-paused')) {
                    targetArmRot -= 2; // Slight lift outwards (left) when paused
                }
            }
            currentArmRot += (targetArmRot - currentArmRot) * 0.08;
            if (vinylArm) {
                vinylArm.style.transform = `rotate(${currentArmRot}deg)`;
            }

            lastVinylTick = now;
        }
        vinylAnimationRAF = requestAnimationFrame(renderVinylFrame);
    }
    vinylAnimationRAF = requestAnimationFrame(renderVinylFrame);

    function getVinylAngle(clientX, clientY) {
        if (!vinylRotator) return 0;
        const rect = vinylRotator.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
    }

    if (vinylRotator) {
        vinylRotator.addEventListener('pointerdown', (e) => {
            if (!vinylModeEnabled || e.button !== 0) return;
            isDraggingVinyl = true;
            root.classList.add('slo-is-scratching');
            lastVinylRotAngle = getVinylAngle(e.clientX, e.clientY);
        });
    }

    let userScrollingLyrics = false;
    let userScrollTimer = null;
    let lastUserScrollIntentAt = 0;
    let autoScrollingLyrics = false;
    let autoScrollReleaseTimer = null;
    let isLikeRequestPending = false;
    let lyricsHidden = false;
    let scrollAnimationFrame = null;

    root.querySelector('#slo-close').addEventListener('click', hide);
    if (toggleLyricsBtn) toggleLyricsBtn.addEventListener('click', toggleLyricsVisibility);
    if (karaokeBtn) karaokeBtn.addEventListener('click', () => applyKaraokeModeSetting(!karaokeModeEnabled));
    if (vinylBtn) vinylBtn.addEventListener('click', () => applyVinylModeSetting(!vinylModeEnabled));
    if (upNextToggleEl) upNextToggleEl.addEventListener('click', () => applyUpNextSetting(!upNextEnabled));
    if (autoHideEmptyToggleEl) autoHideEmptyToggleEl.addEventListener('click', () => applyAutoHideEmptyLyricsSetting(!autoHideLyricsWhenEmpty));

    // Provider List Builder
    const providerListEl = root.querySelector('#slo-provider-order-list');
    
    function renderProviderList() {
        if (!providerListEl) return;
        providerListEl.innerHTML = '';
        
        providerOrder.forEach((provider, index) => {
            const row = document.createElement('div');
            row.className = 'slo-provider-row';
            row.draggable = true;
            row.dataset.index = index;
            row.dataset.provider = provider;
            
            const handle = document.createElement('div');
            handle.className = 'slo-provider-handle';
            handle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>`;
            
            const label = document.createElement('span');
            label.textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
            if (provider === "lrclib") label.textContent = "LRCLIB (Synced)";
            if (provider === "spotify") label.textContent = "Spotify (Built-in)";
            
            row.appendChild(handle);
            row.appendChild(label);
            
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                row.classList.add('slo-dragging');
            });
            
            row.addEventListener('dragend', () => {
                row.classList.remove('slo-dragging');
            });
            
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingRow = providerListEl.querySelector('.slo-dragging');
                if (!draggingRow || draggingRow === row) return;
                
                const box = row.getBoundingClientRect();
                const offset = e.clientY - box.top - box.height / 2;
                
                if (offset < 0) {
                    providerListEl.insertBefore(draggingRow, row);
                } else {
                    providerListEl.insertBefore(draggingRow, row.nextSibling);
                }
            });
            
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                updateProviderOrderFromDOM();
            });
            
            providerListEl.appendChild(row);
        });
    }
    
    function updateProviderOrderFromDOM() {
        const rows = providerListEl.querySelectorAll('.slo-provider-row');
        const newOrder = [];
        rows.forEach(row => newOrder.push(row.dataset.provider));
        providerOrder = normalizeProviderOrder(newOrder);
        renderProviderList();
        persistOverlaySettings();
        forceRefresh();
    }
    
    renderProviderList();

    function readOverlaySettings() {
        try {
            return JSON.parse(localStorage.getItem(settingsStorageKey) || '{}');
        } catch {
            return {};
        }
    }

    function persistOverlaySettings() {
        try {
            localStorage.setItem(settingsStorageKey, JSON.stringify({ volumeControlEnabled, karaokeModeEnabled, autoHideLyricsWhenEmpty, vinylModeEnabled, upNextEnabled, providerOrder }));
        } catch {}
    }

    function normalizeProviderOrder(order) {
        const allowed = ['lrclib', 'spotify'];
        const seen = new Set();
        const normalized = [];
        (Array.isArray(order) ? order : []).forEach((provider) => {
            const normalizedProvider = provider === 'spicy' ? 'lrclib' : provider;
            if (!allowed.includes(normalizedProvider) || seen.has(normalizedProvider)) return;
            seen.add(normalizedProvider);
            normalized.push(normalizedProvider);
        });
        allowed.forEach((provider) => {
            if (!seen.has(provider)) normalized.push(provider);
        });
        return normalized;
    }

    function updateMenuDots() {
        let count = 0;
        if (volumeControlEnabled) count++;
        if (autoHideLyricsWhenEmpty) count++;
        root.setAttribute('data-active-toggles', count);
    }

    function scheduleCursorHide() {
        if (cursorHideTimer) clearTimeout(cursorHideTimer);
        root.classList.remove('slo-cursor-hidden');
        cursorHideTimer = setTimeout(() => {
            if (!root.classList.contains('slo-hidden') && !isDraggingProgress && !isDraggingVolume) {
                root.classList.add('slo-cursor-hidden');
            }
        }, 1600);
    }

    function setSettingsMenuOpen(nextOpen) {
        settingsMenuOpen = !!nextOpen;
        root.classList.toggle('slo-show-settings', settingsMenuOpen);
        if (settingsAnchor) settingsAnchor.classList.toggle('slo-open', settingsMenuOpen);
        if (settingsPopover) settingsPopover.setAttribute('aria-hidden', settingsMenuOpen ? 'false' : 'true');
        if (moreBtn) {
            moreBtn.classList.toggle('active', settingsMenuOpen);
            moreBtn.setAttribute('aria-expanded', settingsMenuOpen ? 'true' : 'false');
        }
    }

    function applyVolumeControlSetting(enabled, persist = true) {
        volumeControlEnabled = !!enabled;
        root.classList.toggle('slo-volume-enabled', volumeControlEnabled);
        if (volumeToggleEl) volumeToggleEl.setAttribute('aria-checked', volumeControlEnabled ? 'true' : 'false');
        updateMenuDots();
        if (persist) persistOverlaySettings();
        if (volumeControlEnabled) updateVolumeVisuals();
    }

    function applyUpNextSetting(enabled, persist = true) {
        upNextEnabled = !!enabled;
        if (upNextToggleEl) upNextToggleEl.setAttribute('aria-checked', upNextEnabled ? 'true' : 'false');
        if (!upNextEnabled) {
            hideUpNextPreview(true, true);
        }
        if (persist) persistOverlaySettings();
    }

    function setLyricsVisibility(hidden, source = 'manual') {
        lyricsHidden = !!hidden;
        root.classList.toggle('slo-lyrics-hidden', lyricsHidden);
        if (toggleLyricsBtn) {
            toggleLyricsBtn.title = lyricsHidden ? 'Show lyrics' : 'Hide lyrics';
        }
        autoLyricsHiddenBecauseEmpty = source === 'auto-empty' ? lyricsHidden : false;
    }

    function syncEmptyLyricsVisibility() {
        const hasLyrics = lines.length > 0;
        if (autoHideLyricsWhenEmpty && !hasLyrics) {
            if (!lyricsHidden) setLyricsVisibility(true, 'auto-empty');
            return;
        }
        if (autoLyricsHiddenBecauseEmpty) {
            setLyricsVisibility(false, 'auto-reset');
        }
    }

    function applyAutoHideEmptyLyricsSetting(enabled, persist = true) {
        autoHideLyricsWhenEmpty = !!enabled;
        if (autoHideEmptyToggleEl) autoHideEmptyToggleEl.setAttribute('aria-checked', autoHideLyricsWhenEmpty ? 'true' : 'false');
        if (!autoHideLyricsWhenEmpty && autoLyricsHiddenBecauseEmpty) {
            setLyricsVisibility(false, 'auto-reset');
        } else {
            syncEmptyLyricsVisibility();
        }
        updateMenuDots();
        if (persist) persistOverlaySettings();
    }

    function clearKaraokeVisual(el) {
        if (!el) return;
        el.classList.remove('slo-karaoke-active');
        el.style.removeProperty('--slo-karaoke-progress');
    }

    function updateKaraokeButtonState() {
        if (!karaokeBtn) return;
        const karaokeAvailable = hasTimestamps && lines.some((line) => line && line.text && line.time !== null);
        root.classList.toggle('slo-karaoke-enabled', karaokeModeEnabled && karaokeAvailable);
        karaokeBtn.disabled = !karaokeAvailable;
        karaokeBtn.classList.toggle('active', karaokeModeEnabled && karaokeAvailable);
        karaokeBtn.setAttribute('aria-pressed', karaokeModeEnabled && karaokeAvailable ? 'true' : 'false');
        karaokeBtn.title = karaokeAvailable
            ? (karaokeModeEnabled ? 'Disable Karaoke Mode' : 'Enable Karaoke Mode')
            : 'Karaoke nur mit synchronisierten Lyrics verfugbar';
    }

    function applyKaraokeModeSetting(enabled, persist = true) {
        const karaokeAvailable = hasTimestamps && lines.some((line) => line && line.text && line.time !== null);
        karaokeModeEnabled = !!enabled;
        root.classList.toggle('slo-karaoke-enabled', karaokeModeEnabled && karaokeAvailable);
        if (!(karaokeModeEnabled && karaokeAvailable)) {
            clearKaraokeVisual(lyricLineEls[lastKaraokeLineIdx]);
            lastKaraokeLineIdx = -1;
            lastKaraokeProgressPct = '';
        } else {
            updateKaraokeProgress(getPlaybackProgress());
        }
        updateKaraokeButtonState();
        if (persist) persistOverlaySettings();
    }

    function applyVinylModeSetting(enabled, persist = true) {
        vinylModeEnabled = !!enabled;
        root.classList.toggle('slo-vinyl-enabled', vinylModeEnabled);
        if (vinylBtn) {
            vinylBtn.setAttribute('aria-pressed', vinylModeEnabled ? 'true' : 'false');
            vinylBtn.title = vinylModeEnabled ? 'Disable Vinyl Mode' : 'Enable Vinyl Mode';
        }
        if (!vinylModeEnabled && vinylRotator) {
            vinylRotator.style.transition = 'transform 0.4s ease';
            vinylRotator.style.transform = 'rotate(0deg)';
            vinylRot = 0;
            setTimeout(() => {
                if (!vinylModeEnabled) vinylRotator.style.transition = '';
            }, 400);
        }
        if (persist) persistOverlaySettings();
    }

    function updateKaraokeProgress(progress = getPlaybackProgress()) {
        if (!karaokeModeEnabled || !hasTimestamps || currentIdx < 0) {
            if (lastKaraokeLineIdx !== -1) {
                clearKaraokeVisual(lyricLineEls[lastKaraokeLineIdx]);
                lastKaraokeLineIdx = -1;
                lastKaraokeProgressPct = '';
            }
            return;
        }

        const activeLine = lines[currentIdx];
        const activeEl = lyricLineEls[currentIdx];
        if (!activeLine || !activeEl || !activeLine.text || activeLine.time === null) {
            if (lastKaraokeLineIdx !== -1) {
                clearKaraokeVisual(lyricLineEls[lastKaraokeLineIdx]);
                lastKaraokeLineIdx = -1;
                lastKaraokeProgressPct = '';
            }
            return;
        }

        let nextTime = getDuration();
        for (let i = currentIdx + 1; i < lines.length; i++) {
            if (lines[i] && lines[i].time !== null) {
                nextTime = lines[i].time;
                break;
            }
        }

        const windowDuration = Math.max(240, nextTime - activeLine.time);
        const karaokeProgress = Math.min(1, Math.max(0, (progress - activeLine.time) / windowDuration));
        const karaokePct = (karaokeProgress * 100).toFixed(3);

        if (lastKaraokeLineIdx !== currentIdx) {
            clearKaraokeVisual(lyricLineEls[lastKaraokeLineIdx]);
            lastKaraokeLineIdx = currentIdx;
            lastKaraokeProgressPct = '';
        }

        if (karaokePct !== lastKaraokeProgressPct) {
            lastKaraokeProgressPct = karaokePct;
            activeEl.classList.add('slo-karaoke-active');
            activeEl.style.setProperty('--slo-karaoke-progress', karaokePct);
        }
    }

    function updateVolumeVisuals() {
        if (!volumeFillEl) return;
        let volume = 0;
        let isMuted = false;
        try {
            volume = Math.min(1, Math.max(0, Number(Spicetify.Player.getVolume?.() ?? 0) || 0));
            isMuted = !!Spicetify.Player.getMute?.();
        } catch {}
        const effectiveVolume = isMuted ? 0 : volume;
        const pctText = (effectiveVolume * 100).toFixed(3) + '%';
        if (pctText !== lastVolumePct || isDraggingVolume) {
            lastVolumePct = pctText;
            volumeFillEl.style.transform = `scaleX(${effectiveVolume})`;
        }
        root.classList.toggle('slo-volume-muted', effectiveVolume <= 0.001);
    }

    function updateVolumeFromPointer(clientX) {
        if (!volumeBarEl) return;
        const rect = volumeBarEl.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        lastVolumePct = (pct * 100).toFixed(3) + '%';
        if (volumeFillEl) volumeFillEl.style.transform = `scaleX(${pct})`;
        root.classList.toggle('slo-volume-muted', pct <= 0.001);
        try {
            if (typeof Spicetify.Player.setMute === 'function') Spicetify.Player.setMute(false);
            if (typeof Spicetify.Player.setVolume === 'function') Spicetify.Player.setVolume(pct);
        } catch {}
        return pct;
    }

    const initialSettings = readOverlaySettings();
    applyVolumeControlSetting(!!initialSettings.volumeControlEnabled, false);
    applyUpNextSetting(initialSettings.upNextEnabled !== false, false);
    applyAutoHideEmptyLyricsSetting(!!initialSettings.autoHideLyricsWhenEmpty, false);
    applyKaraokeModeSetting(!!initialSettings.karaokeModeEnabled, false);
    applyVinylModeSetting(!!initialSettings.vinylModeEnabled, false);
    if (initialSettings.providerOrder && Array.isArray(initialSettings.providerOrder) && initialSettings.providerOrder.length > 0) {
        providerOrder = normalizeProviderOrder(initialSettings.providerOrder);
        renderProviderList();
    }

    // ─── Overlay Toggle ───────────────────────────────────────────────────────
    function show()   { root.classList.remove('slo-hidden'); root.classList.remove('slo-cursor-hidden'); document.addEventListener('keydown', onKey); startTick(); syncBlobMotion(); forceRefresh(); updateVolumeVisuals(); scheduleCursorHide(); }
    function hide()   { root.classList.add('slo-hidden'); root.classList.remove('slo-cursor-hidden'); if (cursorHideTimer) clearTimeout(cursorHideTimer); document.removeEventListener('keydown', onKey); stopTick(); syncBlobMotion(); setSettingsMenuOpen(false); }
    function toggle() { root.classList.contains('slo-hidden') ? show() : hide(); }
    function onKey(e) {
        if (e.key === 'Escape' && settingsMenuOpen) {
            setSettingsMenuOpen(false);
            return;
        }
        if (e.key === 'Escape') {
            hide();
            return;
        }
        if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (Spicetify.Player.isPlaying()) Spicetify.Player.pause();
            else Spicetify.Player.play();
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            try { Spicetify.Player.next(); } catch(e1) { try { Spicetify.Platform?.PlayerAPI?.skipToNext(); } catch(e2) {} }
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            try { Spicetify.Player.back(); } catch(e1) { try { Spicetify.Player.prev(); } catch(e2) { try { Spicetify.Platform?.PlayerAPI?.skipToPrevious(); } catch(e3) {} } }
        }
    }

    async function toggleTrackLike(targetState = !currentTrackLiked) {
        if (isLikeRequestPending) return false;
        isLikeRequestPending = true;
        
        const likeBtnEl = root.querySelector('#slo-like');
        if (likeBtnEl && targetState) {
            likeBtnEl.classList.remove('anim-pop');
            void likeBtnEl.offsetWidth;
            likeBtnEl.classList.add('anim-pop');
        } else if (likeBtnEl) {
            likeBtnEl.classList.remove('anim-pop');
        }

        setLikeButtonVisualState(targetState);
        const success = await setCurrentTrackLiked(targetState);
        if (!success) setLikeButtonVisualState(!targetState);
        setTimeout(updateLikeButtonState, 240);
        setTimeout(() => { isLikeRequestPending = false; }, 260);
        return success;
    }

    function forceRefresh() { lastUri = null; onSongChange(); }
    function toggleLyricsVisibility() {
        setLyricsVisibility(!lyricsHidden, 'manual');
    }

    async function refreshLyricsForUri(uri, options = {}) {
        if (!uri) return;
        const requestId = ++lyricsRequestSerial;
        showSkeleton();
        lines = [];
        hasTimestamps = false;
        currentIdx = -1;
        lastScrollTarget = null;
        clearKaraokeVisual(lyricLineEls[lastKaraokeLineIdx]);
        lastKaraokeLineIdx = -1;
        lastKaraokeProgressPct = '';

        try {
            const result = await fetchSyncedLyrics(uri, options);
            if (requestId !== lyricsRequestSerial || lastUri !== uri) return;

            lines = result.lines;
            hasTimestamps = result.synced;
            renderLines();
        } finally {}
    }

    function retryLyricsFetch() {
        const uri = Spicetify.Player.data?.item?.uri || '';
        if (!uri) return;
        refreshLyricsForUri(uri, { bypassCache: true, invalidateCache: true });
    }

    function updatePlaybackVisualState() {
        const isPlaying = Spicetify.Player.isPlaying();
        root.classList.toggle('slo-paused', !isPlaying);
        if (volumeControlEnabled && !isDraggingVolume) updateVolumeVisuals();
        if (lastPlaybackActive !== isPlaying) {
            lastPlaybackActive = isPlaying;
            syncBlobMotion();
        }
        
        // Sync shuffle / repeat button state from Spicetify / native DOM
        if (shuffleBtn) {
            let isShuffle = Spicetify.Player.getShuffle ? Spicetify.Player.getShuffle() : false;
            if (isShuffle === undefined) {
                const native = document.querySelector('button[data-testid="control-button-shuffle"]');
                if (native) isShuffle = native.getAttribute('aria-checked') === 'true';
            }
            const nextShuffleState = !!isShuffle;
            if (lastShuffleVisualState !== nextShuffleState) {
                lastShuffleVisualState = nextShuffleState;
                shuffleBtn.classList.toggle('active', nextShuffleState);
                shuffleBtn.style.color = nextShuffleState ? '#1db954' : 'rgba(255,255,255,0.6)';
            }
        }
        if (repeatBtn) {
            let repeatMode = Spicetify.Player.getRepeat ? Spicetify.Player.getRepeat() : 0;
            if (repeatMode === undefined) {
                const native = document.querySelector('button[data-testid="control-button-repeat"]');
                if (native) repeatMode = native.getAttribute('aria-checked') === 'mixed' ? 2 : (native.getAttribute('aria-checked') === 'true' ? 1 : 0);
            }
            const normalizedRepeatMode = repeatMode === 'track' ? 2 : (repeatMode | 0);
            
            if (lastRepeatVisualState !== normalizedRepeatMode) {
                lastRepeatVisualState = normalizedRepeatMode;
                repeatBtn.classList.toggle('active', normalizedRepeatMode > 0);
                repeatBtn.style.color = normalizedRepeatMode > 0 ? '#1db954' : 'rgba(255,255,255,0.6)';
                if (repeatIcon) {
                    repeatIcon.style.setProperty('--slo-icon-mask', normalizedRepeatMode === 2 ? 'var(--slo-mask-repeat-one)' : 'var(--slo-mask-repeat)');
                }
            }
        }
    }

    function releaseAutoScroll() {
        if (autoScrollReleaseTimer) clearTimeout(autoScrollReleaseTimer);
        autoScrollReleaseTimer = setTimeout(() => {
            autoScrollingLyrics = false;
        }, 80);
    }

    function stopLyricsScrollAnimation() {
        if (scrollAnimationFrame) cancelAnimationFrame(scrollAnimationFrame);
        scrollAnimationFrame = null;
        scrollTargetTop = null;
        scrollLastFrameTime = 0;
        scrollAnimFromTop = 0;
        scrollAnimToTop = 0;
        scrollAnimStartTime = 0;
        scrollAnimDuration = 0;
    }

    function animateLyricsScroll(targetTop) {
        if (autoScrollReleaseTimer) {
            clearTimeout(autoScrollReleaseTimer);
            autoScrollReleaseTimer = null;
        }

        const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        const endTop = Math.max(0, Math.min(targetTop, maxScroll));

        if (lastScrollTarget !== null && Math.abs(endTop - lastScrollTarget) < 2) {
            return;
        }

        lastScrollTarget = endTop;
        scrollTargetTop = endTop;

        if (Math.abs(endTop - scrollEl.scrollTop) < 1) {
            scrollEl.scrollTop = endTop;
            releaseAutoScroll();
            return;
        }

        scrollAnimFromTop = scrollEl.scrollTop;
        scrollAnimToTop = endTop;
        scrollAnimStartTime = 0;
        scrollAnimDuration = Math.max(
            lowPowerMode ? 320 : 260,
            Math.min(lowPowerMode ? 620 : 480, Math.abs(scrollAnimToTop - scrollAnimFromTop) * (lowPowerMode ? 1.02 : 0.88))
        );

        autoScrollingLyrics = true;

        const step = (now) => {
            if (scrollTargetTop === null || scrollAnimDuration <= 0) {
                scrollAnimationFrame = null;
                scrollLastFrameTime = 0;
                releaseAutoScroll();
                return;
            }

            if (scrollAnimStartTime === 0) scrollAnimStartTime = now;
            const dt = scrollLastFrameTime ? Math.min(32, now - scrollLastFrameTime) : 16;
            scrollLastFrameTime = now;

            const progress = Math.min(1, (now - scrollAnimStartTime) / scrollAnimDuration);
            const eased = (-(Math.cos(Math.PI * progress) - 1)) / 2;
            const nextTop = scrollAnimFromTop + ((scrollAnimToTop - scrollAnimFromTop) * eased);
            const distance = scrollAnimToTop - nextTop;

            if (progress >= 1 || Math.abs(distance) <= 0.35) {
                scrollEl.scrollTop = scrollAnimToTop;
                scrollAnimationFrame = null;
                scrollLastFrameTime = 0;
                releaseAutoScroll();
                return;
            }

            scrollEl.scrollTop = nextTop;
            scrollAnimationFrame = requestAnimationFrame(step);
        };

        if (!scrollAnimationFrame) {
            scrollLastFrameTime = 0;
            scrollAnimationFrame = requestAnimationFrame(step);
        }
    }

    function queueLineStyles(idx) {
        pendingLineStyleIdx = idx;
        if (lineStyleFrame) return;
        lineStyleFrame = requestAnimationFrame(() => {
            lineStyleFrame = null;
            applyLineStyles(pendingLineStyleIdx);
        });
    }

    function markUserScrolling() {
        stopLyricsScrollAnimation();
        lastScrollTarget = null;
        autoScrollingLyrics = false;
        userScrollingLyrics = true;
        if (userScrollTimer) clearTimeout(userScrollTimer);
        userScrollTimer = setTimeout(() => {
            userScrollingLyrics = false;
            queueLineStyles(currentIdx);
        }, 1800);
        queueLineStyles(currentIdx);
    }

    function markUserScrollIntent() {
        lastUserScrollIntentAt = performance.now();
    }

    scrollEl.addEventListener('scroll', () => {
        if (autoScrollingLyrics) return;
        if ((performance.now() - lastUserScrollIntentAt) > 160) return;
        markUserScrolling();
    }, { passive: true });
    scrollEl.addEventListener('wheel', markUserScrollIntent, { passive: true });
    scrollEl.addEventListener('touchstart', markUserScrollIntent, { passive: true });
    scrollEl.addEventListener('touchmove', markUserScrollIntent, { passive: true });

    if (moreBtn) {
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setSettingsMenuOpen(!settingsMenuOpen);
        });
    }
    
    const settingsCloseBtn = root.querySelector('#slo-settings-close-btn');
    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setSettingsMenuOpen(false);
        });
    }

    if (volumeToggleEl) {
        volumeToggleEl.addEventListener('click', (e) => {
            e.stopPropagation();
            applyVolumeControlSetting(!volumeControlEnabled);
        });
    }

    root.addEventListener('pointerdown', (e) => {
        if (!settingsMenuOpen || !settingsAnchor) return;
        if (settingsAnchor.contains(e.target) || (settingsPopover && settingsPopover.contains(e.target))) return;
        setSettingsMenuOpen(false);
    });

    if (volumeBarEl) {
        volumeBarEl.addEventListener('pointerdown', (e) => {
            scheduleCursorHide();
            isDraggingVolume = true;
            if (volumeBarEl.setPointerCapture) {
                try { volumeBarEl.setPointerCapture(e.pointerId); } catch {}
            }
            updateVolumeFromPointer(e.clientX);
        });
        window.addEventListener('pointermove', (e) => {
            if (isDraggingVinyl) {
                e.preventDefault();
                const angle = getVinylAngle(e.clientX, e.clientY);
                let delta = angle - lastVinylRotAngle;
                // Wrap-around fix (-180 to 180)
                if (delta > 180) delta -= 360;
                if (delta < -180) delta += 360;
                
                vinylRot += delta;
                if (vinylRotator) vinylRotator.style.transform = `rotate(${vinylRot}deg)`;
                
                lastVinylRotAngle = angle;
                
                // Scrubbing logic: 360 degrees = 30 seconds
                let seekDeltaMs = (delta / 360) * 30000;
                let currentProg = getPlaybackProgress();
                let targetProg = currentProg + seekDeltaMs;
                
                const dur = getDuration();
                if (targetProg < 0) targetProg = 0;
                if (targetProg > dur) targetProg = dur - 1000;
                
                try {
                    if (typeof Spicetify.Player.seek === 'function') {
                        Spicetify.Player.seek(targetProg);
                        updateKaraokeProgress(targetProg); // Instant visual feedback
                    }
                } catch (err) {}
            }
            if (!isDraggingVolume) return;
            scheduleCursorHide();
            updateVolumeFromPointer(e.clientX);
        });
        window.addEventListener('pointerup', (e) => {
            if (isDraggingVinyl) {
                isDraggingVinyl = false;
                root.classList.remove('slo-is-scratching');
            }
            if (!isDraggingVolume) return;
            isDraggingVolume = false;
            scheduleCursorHide();
            if (volumeBarEl.releasePointerCapture) {
                try { volumeBarEl.releasePointerCapture(e.pointerId); } catch {}
            }
            updateVolumeFromPointer(e.clientX);
        });
        window.addEventListener('pointercancel', () => {
            if (!isDraggingVolume) return;
            isDraggingVolume = false;
        });
    }

    root.addEventListener('pointermove', scheduleCursorHide, { passive: true });
    root.addEventListener('pointerdown', scheduleCursorHide, { passive: true });
    root.addEventListener('wheel', scheduleCursorHide, { passive: true });

    fab.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });

    // ─── Lyrics API ───────────────────────────────────────────────────────────
    function cloneLyricsResult(result) {
        return {
            lines: Array.isArray(result?.lines)
                ? result.lines.map((line) => ({
                    time: Number.isFinite(line?.time) ? line.time : null,
                    text: typeof line?.text === 'string' ? line.text : null,
                }))
                : [],
            synced: !!result?.synced,
            palette: result?.palette && typeof result.palette === 'object'
                ? {
                    accents: Array.isArray(result.palette.accents) ? result.palette.accents.slice(0, 5) : null,
                    deepest: typeof result.palette.deepest === 'string' ? result.palette.deepest : null,
                }
                : null,
            provider: typeof result?.provider === 'string' ? result.provider : null,
        };
    }

    function getLyricsCacheKey(trackUri) {
        return `${trackUri}::${providerOrder.join('|')}`;
    }

    function getLyricsCacheEntryTtl(result) {
        return Array.isArray(result?.lines) && result.lines.length > 0
            ? lyricsCacheTtlMs
            : emptyLyricsCacheTtlMs;
    }

    function loadLyricsCache() {
        try {
            const raw = JSON.parse(localStorage.getItem(lyricsCacheStorageKey) || '[]');
            const now = Date.now();
            const nextCache = new Map();
            if (!Array.isArray(raw)) return nextCache;
            raw.forEach((entry) => {
                if (!Array.isArray(entry) || entry.length !== 2) return;
                const [key, payload] = entry;
                if (typeof key !== 'string' || !payload || typeof payload !== 'object') return;
                if (!Number.isFinite(payload.cachedAt)) return;
                if ((now - payload.cachedAt) > getLyricsCacheEntryTtl(payload.result)) return;
                nextCache.set(key, {
                    cachedAt: payload.cachedAt,
                    result: cloneLyricsResult(payload.result),
                });
            });
            return nextCache;
        } catch {
            return new Map();
        }
    }

    function persistLyricsCache() {
        try {
            const entries = Array.from(lyricsCache.entries())
                .sort((a, b) => b[1].cachedAt - a[1].cachedAt)
                .slice(0, lyricsCacheMaxEntries);
            lyricsCache = new Map(entries);
            localStorage.setItem(lyricsCacheStorageKey, JSON.stringify(entries));
        } catch {}
    }

    function getCachedLyrics(trackUri, bypassCache = false) {
        if (bypassCache) return null;
        const cacheKey = getLyricsCacheKey(trackUri);
        const cached = lyricsCache.get(cacheKey);
        if (!cached) return null;
        if ((Date.now() - cached.cachedAt) > getLyricsCacheEntryTtl(cached.result)) {
            lyricsCache.delete(cacheKey);
            persistLyricsCache();
            return null;
        }
        lyricsCache.delete(cacheKey);
        lyricsCache.set(cacheKey, cached);
        return cloneLyricsResult(cached.result);
    }

    function setCachedLyrics(trackUri, result) {
        const cacheKey = getLyricsCacheKey(trackUri);
        lyricsCache.delete(cacheKey);
        lyricsCache.set(cacheKey, {
            cachedAt: Date.now(),
            result: cloneLyricsResult(result),
        });
        persistLyricsCache();
    }

    function invalidateLyricsCache(trackUri) {
        if (!trackUri) return;
        let changed = false;
        Array.from(lyricsCache.keys()).forEach((cacheKey) => {
            if (!cacheKey.startsWith(`${trackUri}::`)) return;
            lyricsCache.delete(cacheKey);
            changed = true;
        });
        if (changed) persistLyricsCache();
    }

    function parsePotentialColor(value) {
        if (typeof value === 'string') {
            if (/^#([0-9a-f]{6})$/i.test(value)) {
                const n = parseInt(value.slice(1), 16);
                return [((n >> 16) & 255), ((n >> 8) & 255), (n & 255)];
            }
            const rgb = parseRgb(value);
            if (rgb) return rgb;
            return null;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            const n = value >>> 0;
            return [((n >> 16) & 255), ((n >> 8) & 255), (n & 255)];
        }

        if (value && typeof value === 'object') {
            const r = value.r ?? value.red;
            const g = value.g ?? value.green;
            const b = value.b ?? value.blue;
            if ([r, g, b].every(v => Number.isFinite(v))) {
                return [Math.max(0, Math.min(255, r | 0)), Math.max(0, Math.min(255, g | 0)), Math.max(0, Math.min(255, b | 0))];
            }
        }

        return null;
    }

    function parsePaletteFromLyricsData(data) {
        const colorBag = data?.colors || data?.lyrics?.colors || null;
        if (!colorBag) return null;

        const raw = [
            colorBag.background,
            colorBag.text,
            colorBag.highlightText,
            colorBag.accent,
            colorBag.accentColor,
            colorBag.playerColor,
        ];

        const picked = raw
            .map(parsePotentialColor)
            .filter(Boolean)
            .reduce((arr, rgb) => {
                if (arr.every(existing => colorDistance(existing, rgb) > 36)) arr.push(rgb);
                return arr;
            }, [])
            .slice(0, 5)
            .map(toRgbString);

        if (!picked.length) return null;
        return { accents: picked, deepest: picked[picked.length - 1] };
    }

    function ensureFiveAccents(colors) {
        const unique = [];
        (colors || []).forEach((color) => {
            const rgb = parseRgb(color);
            if (!rgb) return;
            if (unique.every((entry) => colorDistance(parseRgb(entry), rgb) > 18)) {
                unique.push(color);
            }
        });

        if (!unique.length) return [];
        while (unique.length < 5) unique.push(unique[unique.length % Math.max(1, unique.length)]);
        return unique.slice(0, 5);
    }

    async function fetchSpotifyLyrics(endpoint) {
        try {
            if (Spicetify.CosmosAsync) {
                const d = await Spicetify.CosmosAsync.get(endpoint);
                if (d?.lyrics?.lines?.length) {
                    const parsed = parseLd(d.lyrics);
                    parsed.palette = parsePaletteFromLyricsData(d);
                    return { ok: true, result: parsed };
                }
                if (d?.lyrics) return { ok: false, reason: 'no-lines' };
            }
        } catch (e) {}

        try {
            const token = Spicetify.Platform?.Session?.accessToken;
            if (!token) return { ok: false, reason: 'missing-token' };

            const res = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}`, 'App-Platform': 'WebPlayer' }
            });
            if (!res.ok) return { ok: false, reason: `http-${res.status}` };

            const data = await res.json();
            if (data?.lyrics?.lines?.length) {
                const parsed = parseLd(data.lyrics);
                parsed.palette = parsePaletteFromLyricsData(data);
                return { ok: true, result: parsed };
            }
            return { ok: false, reason: 'no-lines' };
        } catch (e) {}
        
        return { ok: false, reason: 'request-failed' };
    }

    function parseLrclibSyncedLyrics(syncedLyrics) {
        if (typeof syncedLyrics !== 'string' || !syncedLyrics.trim()) return [];

        const lines = [];
        syncedLyrics.split(/\r?\n/).forEach((rawLine) => {
            const timestampMatches = Array.from(rawLine.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g));
            if (!timestampMatches.length) return;

            const text = rawLine.replace(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g, '').trim();
            timestampMatches.forEach((match) => {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const fractionRaw = match[3] || '0';
                const fractionMs = fractionRaw.length === 3
                    ? parseInt(fractionRaw, 10)
                    : parseInt(fractionRaw.padEnd(2, '0'), 10) * 10;
                lines.push({
                    time: (minutes * 60000) + (seconds * 1000) + fractionMs,
                    text: text || null,
                });
            });
        });

        return lines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
    }

    function parseLrclibLyricsData(data) {
        if (!data || typeof data !== 'object') return null;

        const syncedLines = parseLrclibSyncedLyrics(data.syncedLyrics);
        if (syncedLines.length) {
            return { lines: syncedLines, synced: true, palette: null };
        }

        return null;
    }

    async function fetchLrclibLyrics(trackId, trackUri) {
        try {
            const item = Spicetify.Player.data?.item;
            const title = item?.name || item?.metadata?.title || '';
            const artist = item?.artists?.map((entry) => entry.name).join(', ') || item?.metadata?.artist_name || '';
            const album = item?.album?.name || item?.metadata?.album_title || item?.metadata?.album_name || '';
            const durationSeconds = Math.max(1, Math.round(getDuration(item) / 1000));

            if (!title || !artist || !album || !durationSeconds) {
                return { ok: false, reason: 'missing-track-signature' };
            }

            const query = new URLSearchParams({
                track_name: title,
                artist_name: artist,
                album_name: album,
                duration: String(durationSeconds),
            });

            const res = await fetch(`https://lrclib.net/api/get?${query.toString()}`, {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (res.status === 404) return { ok: false, reason: 'no-lines' };
            if (!res.ok) return { ok: false, reason: `http-${res.status}` };

            const payload = await res.json();
            const parsed = parseLrclibLyricsData(payload);
            if (parsed && parsed.lines && parsed.lines.length > 0) {
                return { ok: true, result: parsed };
            }

            return { ok: false, reason: 'no-lines' };
        } catch (e) {}

        return { ok: false, reason: 'request-failed' };
    }

    async function fetchLyricsFromProvider(provider, endpoint, trackId, trackUri) {
        if (provider === 'spotify') return fetchSpotifyLyrics(endpoint);
        if (provider === 'lrclib') return fetchLrclibLyrics(trackId, trackUri);
        return { ok: false, reason: 'unknown-provider' };
    }

    async function fetchSyncedLyrics(trackUri, options = {}) {
        const bypassCache = !!options.bypassCache;
        if (options.invalidateCache) invalidateLyricsCache(trackUri);

        const trackId = trackUri.split(':').pop();
        const endpoint = `https://spclient.wg.spotify.com/color-lyrics/v2/track/${trackId}?format=json&market=from_token`;

        const cached = getCachedLyrics(trackUri, bypassCache);
        if (cached) {
            const cachedProviderIndex = cached.provider ? providerOrder.indexOf(cached.provider) : -1;

            if (cachedProviderIndex === 0) {
                return { ...cached, cacheHit: true };
            }

            if (cachedProviderIndex > 0) {
                for (let index = 0; index < cachedProviderIndex; index++) {
                    const preferredProvider = providerOrder[index];
                    const preferredResult = await fetchLyricsFromProvider(preferredProvider, endpoint, trackId, trackUri);
                    if (preferredResult?.ok && preferredResult.result?.lines && preferredResult.result.lines.length > 0) {
                        const providerResult = { ...preferredResult.result, provider: preferredProvider, cacheHit: false, failureReason: null };
                        setCachedLyrics(trackUri, providerResult);
                        return providerResult;
                    }
                }

                return { ...cached, cacheHit: true, failureReason: null };
            }

            if (!cached.lines || !cached.lines.length) {
                return { ...cached, cacheHit: true, failureReason: null };
            }
        }

        for (const provider of providerOrder) {
            const res = await fetchLyricsFromProvider(provider, endpoint, trackId, trackUri);
            if (res?.ok && res.result?.lines && res.result.lines.length > 0) {
                const providerResult = { ...res.result, provider, cacheHit: false, failureReason: null };
                setCachedLyrics(trackUri, providerResult);
                return providerResult;
            }
        }

        const emptyResult = { lines: [], synced: false, palette: null, provider: null, cacheHit: false, failureReason: null };
        setCachedLyrics(trackUri, emptyResult);
        return emptyResult;
    }

    function parseLd(ld) {
        const synced = ld.syncType === 'LINE_SYNCED';
        return {
            lines: ld.lines.map(l => ({
                time: synced ? parseInt(l.startTimeMs, 10) : null,
                text: (l.words === '♪' || l.words === '') ? null : (l.words || ''),
            })),
            synced,
        };
    }

    // ─── Color Extraction ─────────────────────────────────────────────────────
    function parseRgb(color) {
        const match = color && color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
        if (!match) return null;
        return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
    }

    function toRgbString(rgb) {
        return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    }

    function colorDistance(a, b) {
        return Math.sqrt(
            Math.pow(a[0] - b[0], 2) +
            Math.pow(a[1] - b[1], 2) +
            Math.pow(a[2] - b[2], 2)
        );
    }

    function colorLuma(rgb) {
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    function darkenRgb(rgb, factor) {
        return [
            Math.max(0, Math.min(255, Math.round(rgb[0] * factor))),
            Math.max(0, Math.min(255, Math.round(rgb[1] * factor))),
            Math.max(0, Math.min(255, Math.round(rgb[2] * factor))),
        ];
    }

    function colorHue(rgb) {
        const r = rgb[0] / 255;
        const g = rgb[1] / 255;
        const b = rgb[2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        if (d === 0) return 0;

        let hue;
        if (max === r) hue = ((g - b) / d) % 6;
        else if (max === g) hue = ((b - r) / d) + 2;
        else hue = ((r - g) / d) + 4;

        const deg = hue * 60;
        return deg < 0 ? deg + 360 : deg;
    }

    function hueDistance(a, b) {
        const d = Math.abs(a - b);
        return Math.min(d, 360 - d);
    }

    function extractColorsFromImage(url) {
        if (!url) return Promise.resolve(null);
        return new Promise(resolve => {
            try {
                let fetchUrl = url;
                if (fetchUrl.startsWith('spotify:image:')) {
                    fetchUrl = 'https://i.scdn.co/image/' + fetchUrl.split(':')[2];
                }
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = fetchUrl;
                img.onload = () => {
                    try {
                        const w = 60, h = 60;
                        const c = document.createElement('canvas');
                        c.width = w; c.height = h;
                        const ctx = c.getContext('2d');
                        ctx.filter = 'saturate(2.2) brightness(1.1)';
                        ctx.drawImage(img, 0, 0, w, h);
                        const d = ctx.getImageData(0,0,w,h).data;
                        const map = {};
                        for (let i = 0; i < d.length; i += 12) {
                            if (d[i + 3] < 180) continue;
                            const r = Math.round(d[i] / 16) * 16;
                            const g = Math.round(d[i + 1] / 16) * 16;
                            const b = Math.round(d[i + 2] / 16) * 16;
                            const key = `${r},${g},${b}`;
                            map[key] = (map[key] || 0) + 1;
                        }

                        const swatches = Object.entries(map).map(([key, count]) => {
                            const rgb = key.split(',').map(value => parseInt(value, 10));
                            const max = Math.max(rgb[0], rgb[1], rgb[2]);
                            const min = Math.min(rgb[0], rgb[1], rgb[2]);
                            const saturation = max === 0 ? 0 : (max - min) / max;
                            const luma = colorLuma(rgb);
                            const hue = colorHue(rgb);
                            const balancedLuma = 1 - Math.min(1, Math.abs(luma - 138) / 138);
                            const score = Math.sqrt(count) * (1 + saturation * 4.2 + balancedLuma * 0.2);
                            return { rgb, count, saturation, luma, hue, score };
                        });

                        const vibrant = swatches
                            .filter((swatch) => swatch.saturation > 0.08 && swatch.luma > 16 && swatch.luma < 240)
                            .sort((a, b) => b.score - a.score);

                        const accents = [];
                        for (const swatch of vibrant) {
                            if (accents.every((entry) => hueDistance(entry.hue, swatch.hue) > 20 && colorDistance(entry.rgb, swatch.rgb) > 34)) {
                                accents.push(swatch);
                            }
                            if (accents.length >= 10) break;
                        }

                        for (const swatch of vibrant) {
                            if (accents.length >= 10) break;
                            if (accents.every((entry) => colorDistance(entry.rgb, swatch.rgb) > 24)) {
                                accents.push(swatch);
                            }
                        }

                        const fallbackAccents = swatches
                            .filter((swatch) => swatch.luma > 12 && swatch.luma < 248)
                            .sort((a, b) => b.count - a.count)
                            .reduce((picked, swatch) => {
                                if (picked.every((entry) => colorDistance(entry.rgb, swatch.rgb) > 38)) {
                                    picked.push(swatch);
                                }
                                return picked;
                            }, [])
                            .slice(0, 10);

                        const selected = (accents.length ? accents : fallbackAccents)
                            .map((swatch) => toRgbString(swatch.rgb));

                        const darkest = swatches
                            .filter((swatch) => swatch.count >= 2)
                            .sort((a, b) => a.luma - b.luma)[0];

                        resolve(selected.length ? {
                            accents: selected,
                            deepest: darkest ? toRgbString(darkest.rgb) : selected[selected.length - 1],
                        } : null);
                    } catch (e) { resolve(null); }
                };
                img.onerror = () => resolve(null);
            } catch (e) { resolve(null); }
        });
    }

    function rgbToRgba(color, alpha) {
        const match = color && color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
        if (!match) return `rgba(168,168,168,${alpha})`;
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
    }

    function randomBetween(min, max) {
        return min + (Math.random() * (max - min));
    }

    function buildRandomBlobSlots(count) {
        return Array.from({ length: count }, (_, i) => ({
            left: randomBetween(0.02, 0.98),
            top: randomBetween(0.04, 0.96),
            size: Math.round(randomBetween(920, 1380)),
            opacity: randomBetween(i < 3 ? 0.28 : 0.18, i < 3 ? 0.42 : 0.32),
        }));
    }

    function ensureColorCanvasSize() {
        if (!colorCanvas || !colorCtx) return null;
        const rect = root.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, lowPowerMode ? 1 : 1.5);
        const width = Math.max(1, Math.round(rect.width * 1.36 * dpr));
        const height = Math.max(1, Math.round(rect.height * 1.36 * dpr));

        if (colorCanvas.width !== width || colorCanvas.height !== height) {
            colorCanvas.width = width;
            colorCanvas.height = height;
        }

        return { width, height, dpr };
    }

    function drawColorCanvas() {
        if (!colorCtx || !blobMotionStates.length) {
            if (colorCtx && colorCanvas) colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);
            return;
        }

        const dims = ensureColorCanvasSize();
        if (!dims) return;

        const { width, height, dpr } = dims;
        colorCtx.clearRect(0, 0, width, height);
        colorCtx.globalCompositeOperation = 'source-over';

        for (const state of blobMotionStates) {
            const centerX = (width * state.anchorX) + (state.currentX * dpr);
            const centerY = (height * state.anchorY) + (state.currentY * dpr);
            const radius = state.size * 0.5 * dpr;
            const gradient = colorCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, state.core);
            gradient.addColorStop(0.18, state.core);
            gradient.addColorStop(0.42, state.mid);
            gradient.addColorStop(0.72, state.fade);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            colorCtx.globalAlpha = state.opacity;
            colorCtx.fillStyle = gradient;
            colorCtx.beginPath();
            colorCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            colorCtx.fill();
        }

        colorCtx.globalAlpha = 1;
    }

    function getBlobTravelRange() {
        return {
            x: Math.round(Math.max(lowPowerMode ? 240 : 420, window.innerWidth * (lowPowerMode ? 0.24 : 0.42))),
            y: Math.round(Math.max(lowPowerMode ? 180 : 300, window.innerHeight * (lowPowerMode ? 0.20 : 0.34))),
        };
    }

    function createBlobMotionState(rangeX, rangeY) {
        const startX = randomBetween(-rangeX * 0.45, rangeX * 0.45);
        const startY = randomBetween(-rangeY * 0.45, rangeY * 0.45);
        return {
            fromX: startX,
            fromY: startY,
            toX: randomBetween(-rangeX, rangeX),
            toY: randomBetween(-rangeY, rangeY),
            currentX: startX,
            currentY: startY,
            elapsed: 0,
            duration: randomBetween(lowPowerMode ? 12000 : 9000, lowPowerMode ? 22000 : 18000),
        };
    }

    function retargetBlobMotionState(state, rangeX, rangeY) {
        state.fromX = state.currentX;
        state.fromY = state.currentY;
        state.toX = randomBetween(-rangeX, rangeX);
        state.toY = randomBetween(-rangeY, rangeY);
        state.elapsed = 0;
        state.duration = randomBetween(lowPowerMode ? 12000 : 9000, lowPowerMode ? 22000 : 18000);
    }

    function initializeBlobMotion(resetPositions = false) {
        const range = getBlobTravelRange();
        blobMotionStates = blobMotionStates.map((state) => {
            if (!resetPositions) return state;
            return { ...state, ...createBlobMotionState(range.x, range.y) };
        });
        drawColorCanvas();
    }

    function stepBlobMotion(now) {
        if (prefersReducedMotion || root.classList.contains('slo-hidden') || !Spicetify.Player.isPlaying()) {
            blobMotionFrame = null;
            lastBlobMotionAt = 0;
            return;
        }

        if (!blobMotionStates.length) {
            blobMotionFrame = null;
            lastBlobMotionAt = 0;
            return;
        }
        const range = getBlobTravelRange();
        const dt = lastBlobMotionAt ? Math.min(32, now - lastBlobMotionAt) : 16;
        lastBlobMotionAt = now;

        blobMotionStates.forEach((state) => {
            state.elapsed += dt;
            const progress = Math.min(1, state.elapsed / state.duration);
            const eased = progress * progress * (3 - (2 * progress));

            state.currentX = state.fromX + ((state.toX - state.fromX) * eased);
            state.currentY = state.fromY + ((state.toY - state.fromY) * eased);

            if (progress >= 1) {
                retargetBlobMotionState(state, range.x, range.y);
            }
        });

        drawColorCanvas();
        blobMotionFrame = requestAnimationFrame(stepBlobMotion);
    }

    function syncBlobMotion() {
        if (blobMotionFrame) {
            cancelAnimationFrame(blobMotionFrame);
            blobMotionFrame = null;
        }
        lastBlobMotionAt = 0;

        if (prefersReducedMotion || root.classList.contains('slo-hidden') || !Spicetify.Player.isPlaying()) {
            return;
        }

        drawColorCanvas();
        if (blobMotionStates.length) blobMotionFrame = requestAnimationFrame(stepBlobMotion);
    }

    function renderPaletteFrame() {
        if (!activePaletteState || !activePaletteState.accents || !activePaletteState.accents.length) return;

        const accents = ensureFiveAccents(activePaletteState.accents);
        const cDeep = activePaletteState.deepest;
        const cBase2 = activePaletteState.base2;
        const blobSlots = buildRandomBlobSlots(colorBlobCount);

        bgEl.style.background = [
            `radial-gradient(circle at 50% 50%, ${rgbToRgba(cDeep, 0.98)} 0%, ${rgbToRgba(cBase2, 1)} 70%)`,
            `linear-gradient(132deg, ${rgbToRgba(cBase2, 0.97)} 0%, ${rgbToRgba(cDeep, 0.94)} 100%)`
        ].join(',\n');

        blobMotionStates = blobSlots.map((slot, i) => ({
            anchorX: slot.left,
            anchorY: slot.top,
            size: slot.size,
            opacity: slot.opacity,
            core: rgbToRgba(accents[i % accents.length], lowPowerMode ? 0.34 : 0.48),
            mid: rgbToRgba(accents[i % accents.length], lowPowerMode ? 0.18 : 0.26),
            fade: rgbToRgba(accents[i % accents.length], lowPowerMode ? 0.06 : 0.11),
            ...createBlobMotionState(getBlobTravelRange().x, getBlobTravelRange().y),
        }));

        drawColorCanvas();
        syncBlobMotion();
    }

    function applyDynamicPalette(palette) {
        if (!palette || !palette.accents || !palette.accents.length) return false;

        const accents = ensureFiveAccents(palette.accents);
        if (!accents.length) return false;
        const parsedAccents = accents.map(parseRgb).filter(Boolean);
        const sortedByLuma = parsedAccents.slice().sort((a, b) => colorLuma(a) - colorLuma(b));
        const darkestRgb = sortedByLuma[0] || parseRgb(palette.deepest) || [20, 24, 30];
        const secondDarkestRgb = sortedByLuma[1] || darkestRgb;
        const darkBaseRgb = darkenRgb(darkestRgb, 0.42);
        const deepBaseRgb = darkenRgb(secondDarkestRgb, 0.24);

        const cDeep = toRgbString(darkBaseRgb);
        const cBase2 = toRgbString(deepBaseRgb);

        activePaletteState = { accents, deepest: cDeep, base2: cBase2 };
        bgEl.style.transition = 'background 0.7s ease';
        renderPaletteFrame();

        return true;
    }

    async function updateLikeButtonState() {
        const likeBtnEl = root.querySelector('#slo-like');
        if (!likeBtnEl) return;

        try {
            const uri = Spicetify.Player.data?.item?.uri;
            if (!uri || !uri.startsWith('spotify:track:')) {
                setLikeButtonVisualState(false);
                return;
            }

            if (typeof Spicetify.Player.getHeart === 'function') {
                const heartState = Spicetify.Player.getHeart();
                if (typeof heartState === 'boolean') {
                    setLikeButtonVisualState(heartState);
                    return;
                }
            }

            const trackId = uri.split(':').pop();
            const isLiked = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`);
            setLikeButtonVisualState(!!(isLiked && isLiked[0]));
        } catch (e) {
            setLikeButtonVisualState(currentTrackLiked);
        }
    }

    function setLikeButtonVisualState(isLiked) {
        currentTrackLiked = !!isLiked;
        const likeBtnEl = root.querySelector('#slo-like');
        if (!likeBtnEl) return;
        likeBtnEl.classList.toggle('active', currentTrackLiked);
        likeBtnEl.style.color = currentTrackLiked ? '#1db954' : 'rgba(255,255,255,0.4)';
        likeBtnEl.setAttribute('aria-pressed', currentTrackLiked ? 'true' : 'false');
        likeBtnEl.title = currentTrackLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs';
    }

    async function setCurrentTrackLiked(shouldLike) {
        const uri = Spicetify.Player.data?.item?.uri;
        if (!uri || !uri.startsWith('spotify:track:')) return false;

        const trackId = uri.split(':').pop();
        const endpoint = `https://api.spotify.com/v1/me/library?uris=${encodeURIComponent(uri)}`;

        try {
            if (typeof Spicetify.Player.setHeart === 'function') {
                Spicetify.Player.setHeart(shouldLike);
                const verifyHeart = typeof Spicetify.Player.getHeart === 'function' ? Spicetify.Player.getHeart() : null;
                if (typeof verifyHeart === 'boolean') {
                    setLikeButtonVisualState(verifyHeart);
                    if (verifyHeart === shouldLike) return true;
                } else {
                    setTimeout(updateLikeButtonState, 120);
                }
            } else if (typeof Spicetify.Player.toggleHeart === 'function' && currentTrackLiked !== shouldLike) {
                Spicetify.Player.toggleHeart();
                setTimeout(updateLikeButtonState, 120);
                return true;
            }

            if (shouldLike) await Spicetify.CosmosAsync.put(endpoint);
            else await Spicetify.CosmosAsync.del(endpoint);

            const verification = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`);
            const verifiedLiked = !!(verification && verification[0]);
            setLikeButtonVisualState(verifiedLiked);
            if (verifiedLiked === shouldLike) return true;
        } catch (e) {}

        setTimeout(updateLikeButtonState, 180);
        return false;
    }

    // ─── Song Change ──────────────────────────────────────────────────────────
    async function onSongChange() {
        const item = Spicetify.Player.data?.item;
        if (!item) return;
        const uri = item.uri || '';
        if (uri === lastUri) return;
        await animateTrackSwapOut();
        lastUri = uri;
        currentCoverPalette = null;
        lastProgressPct = '';
        lastProgressScale = -1;
        lastProgressSecond = -1;
        lastRemainingSecond = -1;
        progressEstimate = 0;
        progressEstimateAt = 0;
        lastRawProgressSample = 0;
        lastShuffleVisualState = null;
        lastRepeatVisualState = null;

        const title  = item.name || item.metadata?.title || '';
        const artist = item.artists?.map(a => a.name).join(', ') || item.metadata?.artist_name || '';
        const artUrl = item.metadata?.image_xlarge_url || item.metadata?.image_large_url || item.metadata?.image_url || item.album?.images?.[0]?.url || '';
        const duration = getDuration(item);

        titleEl.textContent  = title;
        artistEl.textContent = artist;
        artEl.src            = artUrl;
        timeEl.textContent   = msToTime(getProgress());
        durEl.textContent    = '-' + msToTime(duration);
        updateLikeButtonState();

        // Prevent old-track colors from sticking while new cover palette is loading.
        activePaletteState = null;
        bgEl.style.background = '';
        blobMotionStates = [];
        drawColorCanvas();

        extractColorsFromImage(artUrl)
            .then((palette) => {
                if (palette) {
                    currentCoverPalette = palette;
                    applyDynamicPalette(currentCoverPalette);
                }
            })
            .catch((err) => {
                console.warn("SpicetifyLyricsOverlay: Failed to extract colors:", err);
            });

        animateTrackSwapIn();

        await refreshLyricsForUri(uri);
    }

    Spicetify.Player.addEventListener('songchange', onSongChange);
    onSongChange();

    // ─── Render ───────────────────────────────────────────────────────────────
    function showSkeleton() {
        scrollEl.innerHTML = [80, 55, 70, 40].map(w =>
            `<div class="slo-skel" style="width:${w}%"></div>`
        ).join('');
    }

    function renderLines() {
        lastScrollTarget = null;
        if (!lines.length) {
            scrollEl.innerHTML = `
                <div id="slo-empty">
                    <div>
                        <div id="slo-empty-title">No lyrics available</div>
                        <div id="slo-empty-copy">There are no lyrics available for this track right now.</div>
                        <div id="slo-empty-actions">
                            <button id="slo-empty-retry" class="slo-empty-action" type="button">Retry lyrics lookup</button>
                        </div>
                    </div>
                </div>`;
            const retryBtn = root.querySelector('#slo-empty-retry');
            if (retryBtn) retryBtn.addEventListener('click', retryLyricsFetch);
            lyricLineEls = [];
            updateKaraokeButtonState();
            syncEmptyLyricsVisibility();
            return;
        }
        scrollEl.innerHTML = '';
        lyricLineEls = [];
        lines.forEach((line, i) => {
            const el = document.createElement('div');
            if (!line.text) {
                el.className = 'slo-line slo-pause';
                el.innerHTML = '<span class="slo-dot"></span><span class="slo-dot"></span><span class="slo-dot"></span>';
            } else {
                el.className = 'slo-line' + (hasTimestamps ? ' slo-clickable' : '');
                
                let html = '';
                const totalLen = line.text.length;
                if (totalLen > 0) {
                    let segments;
                    try {
                        const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
                        segments = Array.from(segmenter.segment(line.text)).map(s => s.segment);
                    } catch (e) {
                        segments = line.text.split(/(\s+)/);
                    }
                    
                    let currentLen = 0;
                    segments.forEach(segment => {
                        const segLen = segment.length;
                        if (segLen > 0) {
                            const pct = ((currentLen / Math.max(1, totalLen - 1)) * 100).toFixed(2);
                            const escaped = segment.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                            html += `<span class="slo-char" style="--char-pct: ${pct}">${escaped}</span>`;
                            currentLen += segLen;
                        }
                    });
                }
                
                el.innerHTML = `<span class="slo-line-copy">${html}</span>`;
            }
            el.dataset.i = i;
            if (hasTimestamps && line.time !== null) {
                el.addEventListener('click', () => seekTo(line.time));
            }
            scrollEl.appendChild(el);
            lyricLineEls.push(el);
        });
        updateKaraokeButtonState();
        syncEmptyLyricsVisibility();
        queueLineStyles(0);
    }

    // ─── Apple Music Fade ─────────────────────────────────────────────────────
    function applyLineStyles(idx) {
        lyricLineEls.forEach((el, i) => {
            const dist = i - idx;
            const isPause = el.classList.contains('slo-pause');

            let nextOpacity = '1';
            let nextTransform = 'translate3d(0, 0, 0)';
            let nextColor = el.style.color;
            let nextTextShadow = 'none';
            let nextPauseActive = false;
            let nextState = 'hidden';

            if (isPause) {
                if (dist === 0) {
                    nextPauseActive = true;
                    nextOpacity = '1';
                    nextState = 'pause-active';
                } else {
                    nextOpacity = '0';
                    nextTransform = 'translate3d(0, -8px, 0)';
                    nextState = 'pause-hidden';
                }
            } else if (userScrollingLyrics && dist !== 0) {
                nextColor = dist > 0 ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.30)';
                nextOpacity = '1';
                nextTransform = 'translate3d(0, 0, 0)';
                nextTextShadow = 'none';
                nextState = dist > 0 ? 'scroll-visible-future' : 'scroll-visible-past';
            } else if (dist === 0) {
                nextColor = 'rgba(255,255,255,1)';
                nextOpacity = '1';
                nextTextShadow = '0 2px 16px rgba(0,0,0,0.35)';
                nextState = 'active';
            } else if (dist > 0) {
                const o = [0.45, 0.30, 0.20, 0.12, 0.06];
                const oi = Math.min(dist - 1, o.length - 1);
                const alpha = o[oi] || 0;
                nextColor = `rgba(255,255,255,${alpha})`;
                nextOpacity = dist > o.length ? '0' : '1';
                nextState = dist > o.length ? 'future-hidden' : `future-${oi}`;
            } else {
                nextColor = userScrollingLyrics ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0)';
                nextOpacity = userScrollingLyrics ? '1' : '0';
                nextTransform = userScrollingLyrics ? 'translate3d(0, 0, 0)' : 'translate3d(0, -8px, 0)';
                nextState = userScrollingLyrics ? 'past-visible' : 'past-hidden';
            }

            if (el.dataset.visualState === nextState) {
                if (isPause) {
                    el.classList.toggle('slo-pause-active', nextPauseActive);
                }
                return;
            }

            el.dataset.visualState = nextState;
            if (isPause) {
                el.classList.toggle('slo-pause-active', nextPauseActive);
                el.style.display = nextPauseActive ? 'flex' : 'none';
                el.style.opacity = nextOpacity;
                el.style.transform = nextTransform;
                return;
            }

            if (!(karaokeModeEnabled && i === currentIdx && !userScrollingLyrics)) {
                clearKaraokeVisual(el);
            }
            el.style.color = nextColor;
            el.style.opacity = nextOpacity;
            el.style.textShadow = nextTextShadow;
            el.style.transform = nextTransform;
        });
    }

    // ─── Highlight Loop ───────────────────────────────────────────────────────
    function updateProgressVisuals(progress = getPlaybackProgress()) {
        const duration = getDuration();
        const safeProgress = Math.min(duration, Math.max(0, progress));
        if (!displayedProgressAt) {
            displayedProgressEstimate = safeProgress;
            displayedProgressAt = performance.now();
        } else {
            const diff = safeProgress - displayedProgressEstimate;
            if (Math.abs(diff) > 220) {
                displayedProgressEstimate = safeProgress;
            } else {
                displayedProgressEstimate += diff * 0.22;
            }
            displayedProgressEstimate = Math.min(duration, Math.max(0, displayedProgressEstimate));
            displayedProgressAt = performance.now();
        }

        const pct = Math.min(1, Math.max(0, displayedProgressEstimate / (duration || 1)));
        if (Math.abs(pct - lastProgressScale) >= 0.00002) {
            lastProgressScale = pct;
            lastProgressPct = (pct * 100).toFixed(4) + '%';
            if (fillEl) fillEl.style.transform = `scaleX(${pct})`;
            if (thumbEl) thumbEl.style.left = lastProgressPct;
        }

        checkUpNext(safeProgress, duration);

        const progressSecond = Math.floor(safeProgress / 1000);
        const remainingSecond = Math.max(0, Math.ceil((duration - safeProgress) / 1000));
        if (timeEl && progressSecond !== lastProgressSecond) {
            lastProgressSecond = progressSecond;
            timeEl.textContent = msToTime(safeProgress);
        }
        if (durEl && remainingSecond !== lastRemainingSecond) {
            lastRemainingSecond = remainingSecond;
            durEl.textContent = '-' + msToTime(duration - safeProgress);
        }

        return safeProgress;
    }

    function syncProgressEstimate(progress, now = performance.now()) {
        const duration = getDuration();
        const safeProgress = Math.min(duration, Math.max(0, Number(progress) || 0));
        progressEstimate = safeProgress;
        progressEstimateAt = now;
        lastRawProgressSample = safeProgress;
        displayedProgressEstimate = safeProgress;
        displayedProgressAt = now;
        return safeProgress;
    }

    function updateHighlight(progress = getPlaybackProgress()) {
        if (!lines.length) return;
        let idx = 0;

        if (hasTimestamps) {
            let lo = 0;
            let hi = lines.length - 1;
            let found = 0;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                const t = lines[mid].time;
                if (t !== null && t <= progress) {
                    found = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            idx = found;
        } else {
            const pct = Math.min(1, Math.max(0, progress / (getDuration() || 1)));
            idx = Math.floor(pct * (lines.length - 1));
        }

        if (idx === currentIdx) return;
        currentIdx = idx;
        queueLineStyles(idx);
        updateKaraokeProgress(progress);

        const activeEl = lyricLineEls[idx];
        if (activeEl && !userScrollingLyrics) {
            const target = activeEl.offsetTop - scrollEl.clientHeight * 0.28;
            animateLyricsScroll(target);
        }
    }

    function msToTime(ms) {
        ms = Math.max(0, ms | 0);
        const min = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        return min + ':' + (sec < 10 ? '0' : '') + sec;
    }

    // ─── Player Controls ──────────────────────────────────────────────────────
    const prevBtn = root.querySelector('#slo-prev');
    const nextBtn = root.querySelector('#slo-next');
    const playBtn = root.querySelector('#slo-ctrl-play');

    if (prevBtn) prevBtn.onclick = () => { try { Spicetify.Player.back(); } catch(e) { try { Spicetify.Player.prev(); } catch(e2) { try { Spicetify.Platform?.PlayerAPI?.skipToPrevious(); } catch(e3){} } } };
    if (nextBtn) nextBtn.onclick = () => { try { Spicetify.Player.next(); } catch(e) { try { Spicetify.Platform?.PlayerAPI?.skipToNext(); } catch(e2){} } };
    if (playBtn) playBtn.onclick = () => {
        Spicetify.Player.isPlaying() ? Spicetify.Player.pause() : Spicetify.Player.play();
    };

    const shuffleBtn = root.querySelector('#slo-shuffle');
    const repeatBtn  = root.querySelector('#slo-repeat');
    
    function clickNativeButton(testId, ariaLabelHints = []) {
        let btn = document.querySelector(`button[data-testid="${testId}"]`);
        if (!btn) {
            for (const hint of ariaLabelHints) {
                btn = document.querySelector(`button[aria-label*="${hint}"]`);
                if (btn) break;
            }
        }
        if (btn) btn.click();
    }

    function wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function animateTrackSwapOut() {
        if (prefersReducedMotion || root.classList.contains('slo-hidden')) return;
        root.classList.add('slo-track-transition');
        await wait(240);
    }

    function animateTrackSwapIn() {
        if (prefersReducedMotion || root.classList.contains('slo-hidden')) {
            root.classList.remove('slo-track-transition');
            return;
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                root.classList.remove('slo-track-transition');
            });
        });
    }

    if (shuffleBtn) shuffleBtn.onclick = () => { 
        try { if (Spicetify.Player.toggleShuffle) Spicetify.Player.toggleShuffle(); else clickNativeButton('control-button-shuffle', ['Enable shuffle', 'Disable shuffle', 'Shuffle']); } catch(e){ clickNativeButton('control-button-shuffle', ['Enable shuffle', 'Disable shuffle', 'Shuffle']); } 
        setTimeout(updatePlaybackVisualState, 150);
    };
    if (repeatBtn)  repeatBtn.onclick  = () => { 
        try { if (Spicetify.Player.toggleRepeat) Spicetify.Player.toggleRepeat(); else clickNativeButton('control-button-repeat', ['Enable repeat', 'Disable repeat', 'Repeat']); } catch(e){ clickNativeButton('control-button-repeat', ['Enable repeat', 'Disable repeat', 'Repeat']); } 
        setTimeout(updatePlaybackVisualState, 150);
    };

    // Like / Unlike
    const likeBtn = root.querySelector('#slo-like');
    if (likeBtn) {
        likeBtn.onclick = () => toggleTrackLike();
    }
    if (artEl) {
        artEl.title = 'Double-click to save to Liked Songs';
        artEl.addEventListener('dblclick', () => {
            if (!currentTrackLiked) toggleTrackLike(true);
        });
    }

    function updateProgressFromPointer(clientX) {
        if (!barEl) return;
        const rect = barEl.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const duration = getDuration();
        const nextProgress = duration * pct;
        const pctText = (pct * 100).toFixed(4) + '%';
        lastProgressScale = pct;
        lastProgressPct = pctText;
        if (fillEl) fillEl.style.transform = `scaleX(${pct})`;
        if (thumbEl) thumbEl.style.left = pctText;
        displayedProgressEstimate = nextProgress;
        displayedProgressAt = performance.now();
        if (timeEl) timeEl.textContent = msToTime(nextProgress);
        if (durEl) durEl.textContent = '-' + msToTime(duration - nextProgress);
        return nextProgress;
    }

    if (barEl) {
        barEl.addEventListener('pointerdown', (e) => {
            scheduleCursorHide();
            isDraggingProgress = true;
            root.classList.add('slo-dragging-progress');
            if (barEl.setPointerCapture) {
                try { barEl.setPointerCapture(e.pointerId); } catch {}
            }
            const seekMs = updateProgressFromPointer(e.clientX);
            if (typeof seekMs === 'number') {
                lastProgressSecond = Math.floor(seekMs / 1000);
                lastRemainingSecond = Math.max(0, Math.ceil((getDuration() - seekMs) / 1000));
            }
        });
        window.addEventListener('pointermove', (e) => {
            if (!isDraggingProgress) return;
            scheduleCursorHide();
            updateProgressFromPointer(e.clientX);
        });
        window.addEventListener('pointerup', (e) => {
            if (!isDraggingProgress) return;
            isDraggingProgress = false;
            root.classList.remove('slo-dragging-progress');
            scheduleCursorHide();
            if (barEl.releasePointerCapture) {
                try { barEl.releasePointerCapture(e.pointerId); } catch {}
            }
            const seekMs = updateProgressFromPointer(e.clientX);
            if (typeof seekMs === 'number') {
                syncProgressEstimate(seekMs);
                seekTo(seekMs);
            }
        });
        window.addEventListener('pointercancel', () => {
            if (!isDraggingProgress) return;
            isDraggingProgress = false;
            root.classList.remove('slo-dragging-progress');
        });
    }

    function updatePlayPauseIcon() {
        if (!playIcon) return;
        if (Spicetify.Player.isPlaying()) {
            playIcon.style.setProperty('--slo-icon-mask', 'var(--slo-mask-pause)');
        } else {
            playIcon.style.setProperty('--slo-icon-mask', 'var(--slo-mask-play)');
        }
            updatePlaybackVisualState();
    }
    if (Spicetify.Player.addEventListener) {
        Spicetify.Player.addEventListener('onplaypause', updatePlayPauseIcon);
    }
    setTimeout(updatePlayPauseIcon, 500);
        setTimeout(updatePlaybackVisualState, 500);

    // ─── Player Helpers ───────────────────────────────────────────────────────
    function getProgress() {
        try {
            if (typeof Spicetify.Player.getProgress === 'function') return Spicetify.Player.getProgress();
            return Spicetify.Player._data?.progress || Spicetify.Player.data?.progress || 0;
        } catch { return 0; }
    }
    function getPlaybackProgress(now = performance.now()) {
        try {
            const duration = getDuration();
            const rawProgress = Math.min(duration, Math.max(0, Number(getProgress()) || 0));
            const isPlaying = Spicetify.Player.isPlaying();

            if (!progressEstimateAt) {
                return syncProgressEstimate(rawProgress, now);
            }

            const elapsed = isPlaying ? Math.max(0, now - progressEstimateAt) : 0;
            let nextProgress = Math.min(duration, progressEstimate + elapsed);
            const drift = rawProgress - nextProgress;
            const rawJumpedBackward = rawProgress + 120 < lastRawProgressSample;
            const rawJumpedForward = rawProgress - lastRawProgressSample > 900;

            if (!isPlaying || rawJumpedBackward || rawJumpedForward || Math.abs(drift) > 140) {
                nextProgress = rawProgress;
            } else if (drift > 0) {
                nextProgress += Math.min(18, drift * 0.08);
            } else if (drift < 0) {
                nextProgress += Math.max(-12, drift * 0.06);
            }

            return syncProgressEstimate(nextProgress, now);
        } catch {
            return getProgress();
        }
    }
    function getDuration(item = Spicetify.Player.data?.item) {
        try {
            return item?.duration_ms
                || item?.metadata?.duration
                || item?.duration
                || Spicetify.Player.getDuration?.()
                || Spicetify.Platform?.PlayerAPI?._state?.item?.duration
                || Spicetify.Platform?.PlayerAPI?._state?.duration
                || 1;
        } catch { return 1; }
    }
    async function seekTo(ms) {
        try {
            if (typeof Spicetify.Player.seek === 'function') Spicetify.Player.seek(ms);
            else if (Spicetify.Platform?.Player) Spicetify.Platform.Player.seek(ms);
        } catch (e) {}
    }

    function startTick() {
        if (tickFrame) cancelAnimationFrame(tickFrame);
        lastTickAt = 0;
        let lastVisualSync = 0;
        const loop = (now) => {
            const smoothProgress = getPlaybackProgress();
            if (!isDraggingProgress) {
                updateProgressVisuals(smoothProgress);
            }
            updateKaraokeProgress(smoothProgress);
            const interval = getEffectiveTickInterval();
            if (!lastTickAt || now - lastTickAt >= interval || isDraggingProgress) {
                lastTickAt = now;
                updateHighlight(smoothProgress);
            }
            const visualSyncInterval = volumeControlEnabled ? 240 : 900;
            if (!lastVisualSync || now - lastVisualSync >= visualSyncInterval) {
                lastVisualSync = now;
                updatePlaybackVisualState();
            }
            tickFrame = requestAnimationFrame(loop);
        };
        tickFrame = requestAnimationFrame(loop);
    }
    function stopTick() {
        if (tickFrame) cancelAnimationFrame(tickFrame);
        tickFrame = null;
        lastTickAt = 0;
        lastScrollTarget = null;
        stopLyricsScrollAnimation();
        if (blobMotionFrame) cancelAnimationFrame(blobMotionFrame);
        blobMotionFrame = null;
        lastBlobMotionAt = 0;
    }

    window.SpicetifyLyricsOverlay = { show, hide, toggle };
})();
