// =====================================================================
// TypeScript entry point — compiled by `tsc` to src/js/main.js,
// then minified by the Zig JS minifier to build/app.min.js.
// =====================================================================

/* ----------------------- Types & Interfaces ----------------------- */

type Flags = {
    debug: boolean;
    verbose: boolean;
    parallel: boolean;
};

interface Config {
    name: string;
    version: string;
    description: string;
    features: readonly string[];
    flags: Flags;
}

interface Speaker {
    name: string;
    speak(): void;
}

type BinaryOp = (a: number, b: number) => number;

/* ----------------------- Constants ----------------------- */

const GREETING: string = "Hello, world!";
const FAREWELL: string = "Goodbye, world!";
const PI = 3.14159265358979;
const E = 2.71828182845904;

const CONFIG: Config = {
    name: "zigplate",
    version: "0.1.0",
    description: "A tiny bundler written in Zig.",
    features: [
        "css-minification",
        "js-minification",
        "typescript",
        "static-server",
    ],
    flags: {
        debug: false,
        verbose: true,
        parallel: true,
    },
};

/* ----------------------- Utility Functions ----------------------- */

const add: BinaryOp = (a, b) => a + b;
const subtract: BinaryOp = (a, b) => a - b;
const multiply: BinaryOp = (a, b) => a * b;

function divide(a: number, b: number): number {
    if (b === 0) throw new Error("Cannot divide by zero!");
    return a / b;
}

const square = (x: number): number => x * x;
const identity = <T>(x: T): T => x;
const compose = <A, B, C>(f: (b: B) => C, g: (a: A) => B) => (x: A): C => f(g(x));

/* ----------------------- Classes ----------------------- */

abstract class Animal implements Speaker {
    constructor(public readonly name: string, protected readonly sound: string) {}

    speak(): void {
        console.log(`${this.name} says ${this.sound}!`);
    }

    describe(): string {
        return `This is ${this.name}, which says "${this.sound}".`;
    }
}

class Dog extends Animal {
    constructor(name: string) {
        super(name, "Woof");
    }
    fetch(): void {
        console.log(`${this.name} is fetching the ball.`);
    }
}

class Cat extends Animal {
    constructor(name: string) {
        super(name, "Meow");
    }
    purr(): void {
        console.log(`${this.name} is purring contentedly.`);
    }
}

/* ----------------------- Generics ----------------------- */

class Stack<T> {
    private items: T[] = [];
    push(item: T): void { this.items.push(item); }
    pop(): T | undefined { return this.items.pop(); }
    peek(): T | undefined { return this.items[this.items.length - 1]; }
    get size(): number { return this.items.length; }
}

function memoize<Args extends unknown[], R>(
    fn: (...args: Args) => R,
): (...args: Args) => R {
    const cache = new Map<string, R>();
    return (...args: Args): R => {
        const key = JSON.stringify(args);
        const hit = cache.get(key);
        if (hit !== undefined) return hit;
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}

const fastFib = memoize(function fib(n: number): number {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
});

/* ----------------------- Async ----------------------- */

interface User {
    id: number;
    name: string;
    email: string;
}

async function fetchUser(url: string): Promise<User | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as User;
    } catch (error) {
        console.error("Fetch failed:", (error as Error).message);
        return null;
    }
}

async function fetchUsers(urls: string[]): Promise<User[]> {
    const results: User[] = [];
    for (const url of urls) {
        const user = await fetchUser(url);
        if (user) results.push(user);
    }
    return results;
}

/* ----------------------- Higher-Order ----------------------- */

const numbers: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const doubled = numbers.map((n) => n * 2);
const evens = numbers.filter((n) => n % 2 === 0);
const sum = numbers.reduce((acc, n) => acc + n, 0);

/* ----------------------- Discriminated Union ----------------------- */

type Result<T> =
    | { ok: true; value: T }
    | { ok: false; error: string };

function safeDiv(a: number, b: number): Result<number> {
    return b === 0
        ? { ok: false, error: "division by zero" }
        : { ok: true, value: a / b };
}

function formatResult<T>(r: Result<T>): string {
    return r.ok ? `value = ${String(r.value)}` : `error: ${r.error}`;
}

/* ----------------------- Main ----------------------- */

function main(): void {
    const dog = new Dog("Rex");
    const cat = new Cat("Whiskers");

    dog.speak();
    dog.fetch();
    cat.speak();
    cat.purr();

    const stack = new Stack<string>();
    stack.push("first");
    stack.push("second");
    console.log("stack top:", stack.peek(), "size:", stack.size);

    console.log("Sum:", sum);
    console.log("Doubled:", doubled);
    console.log("Evens:", evens);
    console.log("Fib(20):", fastFib(20));
    console.log("square(7):", square(7));
    console.log("add(2, 3):", add(2, 3));

    console.log(formatResult(safeDiv(10, 2)));
    console.log(formatResult(safeDiv(10, 0)));

    console.log("Greeting:", GREETING);
    console.log("Farewell:", FAREWELL);
    console.log("Config:", CONFIG);
}

main();
