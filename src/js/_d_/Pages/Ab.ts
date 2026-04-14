// About page (route shortcode "ab") — desktop variant.

export default class Ab implements AppPageComponent {
    rqd = false;

    init(): void {
        this.rqd = !!__.is.ab;
        if (!this.rqd) return;
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
