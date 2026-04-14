// =====================================================================
// Ambient types shared by every client file.
// =====================================================================

// Every variant-specific Page class conforms to this shape.
export interface AppPage {
    mount(root: HTMLElement, data: unknown): void;
}

// `new`-able Page constructor, passed into Controller.
export type PageCtor = new () => AppPage;
