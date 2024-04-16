export const write_int = `
call write_int(42)

from_temporary_too: i32 = 42
call write_int(from_temporary_too)
`.trim();
