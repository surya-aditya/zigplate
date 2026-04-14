export default class Ab implements AppPageComponent {
    rqd = false;
    init(): void {
        this.rqd = !!__.is.ab;
    }
    resize(): void {}
    loop(): void {}
}
