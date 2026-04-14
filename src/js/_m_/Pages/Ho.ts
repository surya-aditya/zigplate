export default class Ho implements AppPageComponent {
    rqd = false;
    init(): void {
        this.rqd = !!__.is.ho;
    }
    resize(): void {}
    loop(): void {}
}
