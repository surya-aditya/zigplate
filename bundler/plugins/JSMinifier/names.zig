const std = @import("std");
const reserved = @import("reserved.zig");

// Generates progressively-shorter identifier names: a, b, …, z, A, …, Z,
// aa, ab, … using base-52 for the first char and base-62 after.
// Reserved words are skipped automatically.
pub const NameGen = struct {
    index: usize = 0,

    // Writes the next unused short name into `buf` and returns a slice of it.
    pub fn next(self: *NameGen, buf: *[8]u8) []u8 {
        while (true) {
            var n = self.index;
            self.index += 1;

            // Single-character names: 0–51 → a–z, A–Z
            if (n < 52) {
                buf[0] = toChar(n);
                const name = buf[0..1];
                if (reserved.isReserved(name)) continue;
                return name;
            }

            // Multi-character: first char base-52, remaining base-62.
            n -= 52;
            var len: usize = 0;
            buf[len] = toChar(n % 52);
            n /= 52;
            len += 1;

            while (n > 0 or len < 2) {
                if (len >= 8) break;
                buf[len] = toCharDigit(n % 62);
                n /= 62;
                len += 1;
                if (n == 0) break;
            }

            const name = buf[0..len];
            if (reserved.isReserved(name)) continue;
            return name;
        }
    }

    fn toChar(n: usize) u8 {
        if (n < 26) return @intCast('a' + n);
        return @intCast('A' + n - 26);
    }

    fn toCharDigit(n: usize) u8 {
        if (n < 26) return @intCast('a' + n);
        if (n < 52) return @intCast('A' + n - 26);
        return @intCast('0' + n - 52);
    }
};
