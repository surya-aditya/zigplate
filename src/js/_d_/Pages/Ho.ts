// =====================================================================
// Home page (route shortcode "ho") — desktop variant. Engine wires this
// up; we only do work when `__.is.ho` is truthy.
// =====================================================================

export default class Ho implements AppPageComponent {
    rqd = false;

    init(): void {
        this.rqd = !!__.is.ho;
        if (!this.rqd) return;
        // Per-mount setup goes here (event listeners on this page only,
        // GL canvas allocation, etc.). Currently a no-op stub.
    }

    resize(): void {
        if (!this.rqd) return;
    }

    loop(): void {
        if (!this.rqd) return;
    }

    on(): void {}
    off(): void {}
}
